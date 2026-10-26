import os
import re
from functools import wraps

import bcrypt
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session

from models import db, User, ExpectantMother
from verification import issue_code, check_code
from password_reset import reset_bp

load_dotenv()

FRONTEND_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY is missing. Add it to backend/.env")

app.config["SECRET_KEY"] = secret_key
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///bloom.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "connect_args": {"connect_timeout": 10},
}
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
# When the app is hosted over https, also set: app.config["SESSION_COOKIE_SECURE"] = True

db.init_app(app)
app.register_blueprint(reset_bp)

with app.app_context():
    db.create_all()

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # bcrypt only reads the first 72 bytes of a password
MAX_LOCATION_LENGTH = 255
MAX_TEXT_LENGTH = 2000


# Password hashing 
def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def password_matches(password, stored_hash):
    return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))


# Who is logged in
def current_user():
    user_id = session.get("user_id")
    if user_id is None:
        return None
    user = db.session.get(User, user_id)
    if user is None or not user.is_verified:
        return None
    return user


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if current_user() is None:
            session.clear()
            return jsonify(error="Please log in first."), 401
        return view(*args, **kwargs)
    return wrapped


# Pages and health check 
@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health")
def health():
    return jsonify(status="ok")


# Registration, email verification, log in, log out
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not EMAIL_PATTERN.match(email):
        return jsonify(error="Please enter a valid email address."), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify(error="Your password must be at least 8 characters."), 400
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return jsonify(error="Your password is too long. Please use 72 characters or fewer."), 400

    user = User.query.filter_by(email=email).first()

    if user is not None and user.is_verified:
        return jsonify(error="An account with this email already exists."), 409

    if user is not None:
        # She registered before but never entered her code, so let her start again
        user.password_hash = hash_password(password)
    else:
        user = User(email=email, password_hash=hash_password(password), is_verified=False)
        db.session.add(user)
    db.session.commit()

    # The account stays unverified, and she is not logged in, until she enters the code
    issue_code(user, "register")

    session.clear()
    return jsonify(
        message="We sent a 6-digit code to your email.",
        email=user.email,
        needsVerification=True,
    ), 201


@app.route("/api/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()

    user = User.query.filter_by(email=email).first() if email else None
    if user is None:
        return jsonify(error="That code is incorrect or has expired."), 400

    ok, message = check_code(user, "register", code)
    if not ok:
        return jsonify(error=message), 400

    user.is_verified = True
    db.session.commit()

    session.clear()
    session["user_id"] = user.id
    return jsonify(message="Email verified.", email=user.email)


@app.route("/api/resend-code", methods=["POST"])
def resend_code():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()

    user = User.query.filter_by(email=email).first() if email else None
    if user is not None and not user.is_verified:
        issue_code(user, "register")  # does nothing if a code was sent a moment ago

    # The same reply for every email, so nobody can find out who is registered
    return jsonify(message="If that email is waiting for verification, we have sent a new code.")


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    wrong = jsonify(error="Incorrect email or password."), 401

    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return wrong

    user = User.query.filter_by(email=email).first()
    if user is None or not password_matches(password, user.password_hash):
        return wrong

    if not user.is_verified:
        return jsonify(
            error="Please verify your email before logging in.",
            needsVerification=True,
        ), 403

    session.clear()
    session["user_id"] = user.id
    return jsonify(message="Logged in.", email=user.email)


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(message="Logged out.")


@app.route("/api/me")
@login_required
def me():
    user = current_user()
    return jsonify(email=user.email)


# Context information (the mother's profile) 
def profile_to_dict(profile):
    return {
        "email": profile.email,
        "gestationalAge": profile.gestational_period,
        "location": profile.location,
        "symptoms": profile.symptoms or "",
        "medicalHistory": profile.medical_history or "",
    }


def read_profile_data(data):
    """Checks the profile fields sent by the page. Returns (values, error_message)."""
    weeks_text = str(data.get("gestationalAge", "")).strip()
    location = str(data.get("location", "")).strip()
    symptoms = str(data.get("symptoms", "")).strip()
    medical_history = str(data.get("medicalHistory", "")).strip()

    if not (weeks_text.isascii() and weeks_text.isdigit()) or not 1 <= int(weeks_text) <= 42:
        return None, "Please choose a gestational age between 1 and 42 weeks."
    if not location or len(location) > MAX_LOCATION_LENGTH:
        return None, "Please choose your location."
    if len(symptoms) > MAX_TEXT_LENGTH or len(medical_history) > MAX_TEXT_LENGTH:
        return None, "Symptoms and medical history must be 2000 characters or fewer."

    values = {
        "gestational_period": str(int(weeks_text)),
        "location": location,
        "symptoms": symptoms,
        "medical_history": medical_history,
    }
    return values, None


@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    user = current_user()
    profile = db.session.get(ExpectantMother, user.email)
    if profile is None:
        return jsonify(error="No profile yet."), 404
    return jsonify(profile_to_dict(profile))


@app.route("/api/profile", methods=["POST"])
@login_required
def create_profile():
    user = current_user()
    if db.session.get(ExpectantMother, user.email) is not None:
        return jsonify(error="A profile already exists. Update it instead."), 409

    values, error = read_profile_data(request.get_json(silent=True) or {})
    if error:
        return jsonify(error=error), 400

    profile = ExpectantMother(email=user.email, **values)
    db.session.add(profile)
    db.session.commit()
    return jsonify(profile_to_dict(profile)), 201


@app.route("/api/profile", methods=["PUT"])
@login_required
def update_profile():
    user = current_user()
    profile = db.session.get(ExpectantMother, user.email)
    if profile is None:
        return jsonify(error="No profile yet."), 404

    values, error = read_profile_data(request.get_json(silent=True) or {})
    if error:
        return jsonify(error=error), 400

    for field, value in values.items():
        setattr(profile, field, value)
    db.session.commit()
    return jsonify(profile_to_dict(profile))


@app.route("/api/profile", methods=["DELETE"])
@login_required
def delete_profile():
    user = current_user()
    profile = db.session.get(ExpectantMother, user.email)
    if profile is None:
        return jsonify(error="No profile yet."), 404

    db.session.delete(profile)
    db.session.commit()
    return jsonify(message="Profile deleted.")


if __name__ == "__main__":
    app.run(debug=True)