"""Moderate-risk sample app.

The CODE here is intentionally clean (parameterized queries, secrets from env,
safe YAML) so the scanner's risk score comes almost entirely from the outdated
dependencies in requirements.txt — demonstrating a mid-range score rather than
a maxed-out 100/100.
"""
import os
import hashlib
import sqlite3

import yaml
from flask import Flask, request, jsonify

app = Flask(__name__)
# Secret pulled from the environment, not hardcoded.
app.config["SECRET_KEY"] = os.environ["APP_SECRET_KEY"]


def get_user(user_id: str):
    conn = sqlite3.connect("app.db")
    cur = conn.cursor()
    # Parameterized query — no SQL injection.
    cur.execute("SELECT id, name FROM users WHERE id = ?", (user_id,))
    return cur.fetchone()


def hash_password(password: str) -> str:
    # Strong, salted hashing.
    salt = os.urandom(16)
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000).hex()


def load_config(path: str):
    with open(path, "r", encoding="utf-8") as fh:
        # safe_load avoids arbitrary object construction.
        return yaml.safe_load(fh)


@app.route("/user/<user_id>")
def user(user_id):
    row = get_user(user_id)
    return jsonify({"id": row[0], "name": row[1]} if row else {})


if __name__ == "__main__":
    # Debug off, bound to localhost.
    app.run(host="127.0.0.1", port=8000, debug=False)
