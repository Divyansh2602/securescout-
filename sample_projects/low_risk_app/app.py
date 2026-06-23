"""Clean sample app — follows secure coding practices throughout.

Demonstrates a 0/100 PASS result: up-to-date dependencies, no hardcoded
secrets, parameterized SQL, strong hashing, safe deserialization, and no
debug/insecure-transport settings.
"""
import os
import hmac
import hashlib
import secrets
import sqlite3

import yaml
from flask import Flask, request, jsonify

app = Flask(__name__)
# Secrets come from the environment — never hardcoded.
app.config["SECRET_KEY"] = os.environ["APP_SECRET_KEY"]


def get_account(account_id: str):
    conn = sqlite3.connect("bank.db")
    cur = conn.cursor()
    # Parameterized query prevents SQL injection.
    cur.execute("SELECT id, balance FROM accounts WHERE id = ?", (account_id,))
    return cur.fetchone()


def hash_password(password: str) -> str:
    # Salted PBKDF2-SHA256 with a high iteration count.
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 240_000)
    return salt.hex() + ":" + digest.hex()


def verify_token(provided: str, expected: str) -> bool:
    # Constant-time comparison avoids timing attacks.
    return hmac.compare_digest(provided, expected)


def load_settings(path: str):
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)  # safe_load, not load


@app.route("/account/<account_id>")
def account(account_id):
    row = get_account(account_id)
    return jsonify({"id": row[0], "balance": row[1]} if row else {})


if __name__ == "__main__":
    # Debug disabled, bound to loopback, TLS terminated upstream.
    app.run(host="127.0.0.1", port=8000, debug=False)
