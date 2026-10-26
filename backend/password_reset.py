import bcrypt
from flask import Blueprint, jsonify, request, session

from models import db, User
from verification import issue_code, check_code

reset_bp = Blueprint("password_reset", __name__)

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # bcrypt only reads the first 72 bytes, same rule as registration


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@reset_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()

    user = User.query.filter_by(email=email).first() if email else None

    # Only verified accounts get a code. Unverified ones should finish registering.
    if user is not None and user.is_verified:
        issue_code(user, "reset")  # does nothing if a code was sent a moment ago

    # The same reply for every email, so nobody can find out who is registered
    return jsonify(message="If an account exists for that email, we have sent a 6-digit code.")


@reset_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()
    password = str(data.get("password", ""))

    # Check the new password first, so a typo here does not use up a code attempt
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify(error="Your password must be at least 8 characters."), 400
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return jsonify(error="Your password is too long. Please use 72 characters or fewer."), 400

    user = User.query.filter_by(email=email).first() if email else None
    if user is None or not user.is_verified:
        return jsonify(error="That code is incorrect or has expired."), 400

    ok, message = check_code(user, "reset", code)
    if not ok:
        return jsonify(error=message), 400

    user.password_hash = hash_password(password)
    db.session.commit()

    session.clear()
    return jsonify(message="Your password has been changed. You can now log in.")