import os

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory

load_dotenv()

FRONTEND_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY is missing. Add it to backend/.env")
app.config["SECRET_KEY"] = secret_key


@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    app.run(debug=True)