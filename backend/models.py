from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def __repr__(self):
        return f"<User {self.email}>"


class ExpectantMother(db.Model):
    """Context information for one mother. Matches tbl_expectantmother in the ERD."""
    __tablename__ = "expectant_mothers"

    email = db.Column(
        db.String(255),
        db.ForeignKey("users.email", ondelete="CASCADE"),
        primary_key=True,
    )
    location = db.Column(db.String(255), nullable=False)
    medical_history = db.Column(db.Text, nullable=True)
    gestational_period = db.Column(db.Text, nullable=False)
    symptoms = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<ExpectantMother {self.email}>"


class VerificationCode(db.Model):
    """A one-time email verification code. Only a hash of the code is stored."""
    __tablename__ = "verification_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    purpose = db.Column(db.String(20), nullable=False)  # "register" or "reset"
    code_hash = db.Column(db.String(64), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)