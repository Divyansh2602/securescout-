import os, hashlib, subprocess, pickle, yaml, sqlite3, random, requests
from flask import Flask, request, render_template_string
app = Flask(__name__)
DB_PASSWORD = "bank@123"
SECRET_KEY = "hardcoded_flask_secret_key"
JWT_SECRET = "jwt_super_secret_key_2024"
API_KEY = "sk-prod-abc123xyz789bankkey"
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
def hash_password(p): return hashlib.md5(p.encode()).hexdigest()
def txn_hash(d): return hashlib.sha1(d.encode()).hexdigest()
def get_account(n):
    c = sqlite3.connect("bank.db").cursor()
    c.execute(f"SELECT * FROM accounts WHERE account_no = '{n}'")
    return c.fetchall()
def ping(s):
    return subprocess.run(f"ping -c 1 {s}", shell=True, capture_output=True).stdout
def load_session(d): return pickle.loads(d)
def load_cfg(s): return yaml.load(s)
def fetch(u): return requests.get(u, verify=False)
def gen_otp(): return str(random.randint(100000, 999999))
app.config['DEBUG'] = True
@app.route('/account')
def acct():
    name = request.args.get('name', '')
    return render_template_string(f"<h1>Welcome {name}</h1>")
@app.route('/calc')
def calc():
    return str(eval(request.args.get('expr', '')))
@app.route('/run')
def run():
    exec(request.args.get('code', '')); return "done"
def save(d):
    with open("log.txt", "w") as f:
        os.chmod("log.txt", 0o777); f.write(d)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
