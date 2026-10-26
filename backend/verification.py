import hashlib
import hmac
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone

from mailer import send_email
from models import db, VerificationCode

CODE_LIFETIME_MINUTES = 10
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60

MESSAGES = {
    "register": (
        "Your Bloom verification code",
        "Hello,\n\n"
        "Your Bloom Maternal Care verification code is:\n\n"
        "    {code}\n\n"
        "It works for {minutes} minutes. Please do not share it with anyone.\n"
        "If you did not create an account, you can ignore this email.\n",
    ),
    "reset": (
        "Your Bloom password reset code",
        "Hello,\n\n"
        "Your Bloom Maternal Care password reset code is:\n\n"
        "    {code}\n\n"
        "It works for {minutes} minutes. Please do not share it with anyone.\n"
        "If you did not ask to reset your password, you can ignore this email.\n",
    ),
}


def _now():
    return datetime.now(timezone.utc)


def _as_utc(value):
    # Some databases return times without a time zone, so treat those as UTC
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _hash_code(user_id, purpose, code):
    # A keyed hash, so a leaked table of hashes cannot simply be guessed offline
    key = os.environ["SECRET_KEY"].encode("utf-8")
    message = f"{user_id}:{purpose}:{code}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def _send_in_background(to_address, subject, body):
    def work():
        try:
            send_email(to_address, subject, body)
        except Exception as error:
            print("Could not send the verification email:", error)

    threading.Thread(target=work, daemon=True).start()


def issue_code(user, purpose):
    """Creates a new code, replacing older ones, and emails it.
    Returns False when a code was sent too recently (the earlier one still works)."""
    latest = (
        VerificationCode.query.filter_by(user_id=user.id, purpose=purpose)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    if latest is not None:
        age = _now() - _as_utc(latest.created_at)
        if age < timedelta(seconds=RESEND_COOLDOWN_SECONDS):
            return False

    VerificationCode.query.filter_by(user_id=user.id, purpose=purpose).delete()

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.session.add(
        VerificationCode(
            user_id=user.id,
            purpose=purpose,
            code_hash=_hash_code(user.id, purpose, code),
            expires_at=_now() + timedelta(minutes=CODE_LIFETIME_MINUTES),
        )
    )
    db.session.commit()

    subject, body = MESSAGES[purpose]
    _send_in_background(
        user.email, subject, body.format(code=code, minutes=CODE_LIFETIME_MINUTES)
    )
    return True


def check_code(user, purpose, code):
    """Checks a code the user typed. Returns (True, "") or (False, message)."""
    wrong = "That code is incorrect or has expired."
    expired = "That code has expired. Please request a new one."
    too_many = "Too many wrong attempts. Please request a new code."

    if not (len(code) == 6 and code.isascii() and code.isdigit()):
        return False, wrong

    record = (
        VerificationCode.query.filter_by(user_id=user.id, purpose=purpose)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    if record is None:
        return False, wrong

    if _as_utc(record.expires_at) < _now():
        return False, expired

    # A used-up code is kept (not deleted) so the resend wait still applies
    if record.attempts >= MAX_ATTEMPTS:
        return False, too_many

    if not hmac.compare_digest(record.code_hash, _hash_code(user.id, purpose, code)):
        record.attempts += 1
        db.session.commit()
        if record.attempts >= MAX_ATTEMPTS:
            return False, too_many
        return False, wrong

    VerificationCode.query.filter_by(user_id=user.id, purpose=purpose).delete()
    db.session.commit()
    return True, ""