import re
from pathlib import Path
from securescout.engine import Finding

PY=[
 {"id":"CRED","p":re.compile(r'(?i)(password|passwd|pwd|secret|token|api_key|apikey|auth_key)\s*=\s*["\']([^"\']{4,})["\']'),"s":"CRITICAL","t":"Hardcoded Password / Secret","f":"Use environment variables or a secrets manager."},
 {"id":"AWS","p":re.compile(r'AKIA[0-9A-Z]{16}'),"s":"CRITICAL","t":"Hardcoded AWS Access Key ID","f":"Revoke immediately. Use IAM roles or env vars."},
 {"id":"APIKEY","p":re.compile(r'(?i)(api[_\-]?key|apikey)\s*=\s*["\']([a-zA-Z0-9\-_]{16,})["\']'),"s":"HIGH","t":"Hardcoded API Key","f":"Move to environment variables. Rotate the key."},
 {"id":"DEBUG","p":re.compile(r'(?i)(DEBUG|TESTING)\s*=\s*(True|1|true)'),"s":"HIGH","t":"Debug Mode Enabled","f":"Set DEBUG=False in production via env var."},
 {"id":"JWT","p":re.compile(r'(?i)(jwt[_\-]?secret|jwt[_\-]?key|secret[_\-]?key)\s*=\s*["\']([^"\']{4,})["\']'),"s":"CRITICAL","t":"Hardcoded JWT Secret","f":"Generate a 256-bit random secret, store in env vars."},
]
YAML=[
 {"id":"PASS","p":re.compile(r'(?i)^\s*password\s*:\s*["\']?(?!\$)(?!<)([^\s"\'#]{4,})'),"s":"CRITICAL","t":"Hardcoded Password in Config","f":"Use env variable substitution: password: ${DB_PASSWORD}"},
 {"id":"AWS","p":re.compile(r'AKIA[0-9A-Z]{16}'),"s":"CRITICAL","t":"AWS Access Key in Config","f":"Remove from config. Use IAM instance roles."},
 {"id":"SSL","p":re.compile(r'(?i)ssl[_\s]*(mode|enabled|verify)?\s*:\s*(disable|false|no|0)\b'),"s":"HIGH","t":"SSL/TLS Disabled in Config","f":"Enable SSL: ssl_mode: verify-full"},
 {"id":"CORS","p":re.compile(r'(?i)(cors|allowed_hosts?)\s*:\s*\[?\s*["\']?\*'),"s":"MEDIUM","t":"CORS Wildcard Configured","f":"Restrict to specific trusted origins."},
 {"id":"LOGP","p":re.compile(r'(?i)log[_\-]?passwords?\s*:\s*(true|yes|1)'),"s":"CRITICAL","t":"Password Logging Enabled","f":"Disable: log_passwords: false"},
 {"id":"LOGC","p":re.compile(r'(?i)log[_\-]?card[_\-]?numbers?\s*:\s*(true|yes|1)'),"s":"CRITICAL","t":"Card Number Logging Enabled","f":"Disable: log_card_numbers: false"},
 {"id":"ALGO","p":re.compile(r'(?i)algorithm\s*:\s*(DES|RC4|MD5|SHA1|3DES)\b'),"s":"CRITICAL","t":"Broken Encryption Algorithm","f":"Use AES-256-GCM. Use SHA-256 for hashing."},
 {"id":"ECB","p":re.compile(r'(?i)mode\s*:\s*ECB\b'),"s":"HIGH","t":"ECB Encryption Mode","f":"Use GCM or CBC mode with proper IV."},
 {"id":"TLS","p":re.compile(r'(?i)tls\s*:\s*(false|no|0)\b'),"s":"HIGH","t":"TLS Disabled in Config","f":"Enable TLS: tls: true"},
 {"id":"VER","p":re.compile(r'(?i)verify[_\-]?ssl\s*:\s*(false|no|0)\b'),"s":"HIGH","t":"SSL Verification Disabled","f":"Enable SSL verification."},
]
class SecretDetector:
    def run(self,files,base):
        import logging; log=logging.getLogger(__name__)
        out=[]
        for fp in files.get("python",[]):
            try:
                rel=str(fp.relative_to(base))
                for i,l in enumerate(fp.read_text(errors="ignore").splitlines(),1):
                    if l.strip().startswith("#"): continue
                    for x in PY:
                        if x["p"].search(l):
                            out.append(Finding(f"{x['id']}-{rel}-{i}","SECRET",x["s"],x["t"],f"Sensitive value hardcoded at line {i}.",rel,i,f"Line {i}: `{l.strip()[:80]}`",x["f"],"",0.0,["https://owasp.org/www-project-top-ten/"]))
            except Exception as e:
                log.warning("SecretDetector skipped %s: %s", fp, e)
        for fp in files.get("yaml",[]):
            try:
                rel=str(fp.relative_to(base))
                for i,l in enumerate(fp.read_text(errors="ignore").splitlines(),1):
                    if l.strip().startswith("#"): continue
                    for x in YAML:
                        if x["p"].search(l):
                            t="SECRET" if x["id"] in("PASS","AWS","LOGP","LOGC") else "MISCONFIG"
                            out.append(Finding(f"{x['id']}-{rel}-{i}",t,x["s"],x["t"],f"Config issue at line {i}.",rel,i,f"Line {i}: `{l.strip()[:80]}`",x["f"],"",0.0,["https://owasp.org/www-project-top-ten/"]))
            except Exception as e:
                log.warning("SecretDetector skipped %s: %s", fp, e)
        return out
