import os
import re
from functools import wraps

import bcrypt
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session

from models import db, User, ExpectantMother

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
    return db.session.get(User, user_id)


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


# Registration, log in, log out
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
    if User.query.filter_by(email=email).first():
        return jsonify(error="An account with this email already exists."), 409

    user = User(email=email, password_hash=hash_password(password))
    db.session.add(user)
    db.session.commit()

    session.clear()
    session["user_id"] = user.id
    return jsonify(message="Account created.", email=user.email), 201


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