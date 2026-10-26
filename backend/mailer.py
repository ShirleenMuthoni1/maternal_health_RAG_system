import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr


def send_email(to_address, subject, body):
    """Sends a plain text email. Raises an error if sending fails."""
    if os.environ.get("MAIL_MODE", "").lower() == "console":
        # Fallback for a demo: show the email in the terminal instead of sending it.
        # Never leave this on for a hosted copy, because it prints verification codes.
        print("\n[EMAIL - console mode]")
        print("To:", to_address)
        print("Subject:", subject)
        print(body)
        print("[END EMAIL]\n")
        return

    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    if not host or not user or not password:
        raise RuntimeError(
            "Email settings are missing. Check SMTP_HOST, SMTP_USER and SMTP_PASSWORD in backend/.env"
        )

    port = int(os.environ.get("SMTP_PORT", "587"))
    from_address = os.environ.get("MAIL_FROM") or user
    from_name = os.environ.get("MAIL_FROM_NAME", "Bloom Maternal Care")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((from_name, from_address))
    message["To"] = to_address
    message.set_content(body)

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=15) as server:
            server.login(user, password)
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)