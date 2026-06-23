import re
from securescout.engine import Finding
P=[
 {"id":"MD5","p":re.compile(r'hashlib\.md5\s*\('),"s":"HIGH","t":"MD5 Used for Hashing","f":"Use hashlib.sha256() or argon2/bcrypt for passwords.","ty":"WEAK_CRYPTO"},
 {"id":"SHA1","p":re.compile(r'hashlib\.sha1\s*\('),"s":"HIGH","t":"SHA-1 Used for Hashing","f":"Replace with hashlib.sha256() or sha3_256().","ty":"WEAK_CRYPTO"},
 {"id":"RAND","p":re.compile(r'(?<!\w)(random\.randint|random\.random|random\.choice)\s*\('),"s":"HIGH","t":"Insecure Random Generator","f":"Use secrets.token_hex() or secrets.randbelow().","ty":"WEAK_CRYPTO"},
 {"id":"PICKLE","p":re.compile(r'pickle\.loads?\s*\('),"s":"CRITICAL","t":"Insecure Deserialization (pickle)","f":"Use JSON instead of pickle for untrusted data.","ty":"INJECTION"},
 {"id":"YAML","p":re.compile(r'yaml\.load\s*\('),"s":"CRITICAL","t":"Unsafe YAML Load (RCE)","f":"Replace yaml.load() with yaml.safe_load().","ty":"WEAK_CRYPTO"},
 {"id":"SSL","p":re.compile(r'verify\s*=\s*False'),"s":"HIGH","t":"SSL Verification Disabled","f":"Remove verify=False. Provide CA bundle if needed.","ty":"MISCONFIG"},
 {"id":"CHMOD","p":re.compile(r'os\.chmod\s*\([^,]+,\s*0o?777\s*\)'),"s":"HIGH","t":"World-Readable File Permissions (777)","f":"Use os.chmod(path, 0o600) for sensitive files.","ty":"MISCONFIG"},
 {"id":"FDEBUG","p":re.compile(r'app\.run\s*\([^)]*debug\s*=\s*True'),"s":"HIGH","t":"Flask Debug Mode in app.run()","f":"Remove debug=True. Use env variable.","ty":"MISCONFIG"},
 {"id":"FHOST","p":re.compile(r'app\.run\s*\([^)]*host\s*=\s*["\']0\.0\.0\.0["\']'),"s":"HIGH","t":"Flask on All Interfaces","f":"Use 127.0.0.1 in dev. Use gunicorn in production.","ty":"MISCONFIG"},
]
class CryptoDetector:
    def run(self,files,base):
        import logging; log=logging.getLogger(__name__)
        out=[]
        for fp in files.get("python",[]):
            try:
                rel=str(fp.relative_to(base))
                for i,l in enumerate(fp.read_text(errors="ignore").splitlines(),1):
                    if l.strip().startswith("#"): continue
                    for x in P:
                        if x["p"].search(l):
                            out.append(Finding(f"{x['id']}-{rel}-{i}",x["ty"],x["s"],x["t"],f"Insecure pattern at line {i}.",rel,i,f"Line {i}: `{l.strip()[:100]}`",x["f"],"",0.0,["https://owasp.org/www-project-top-ten/"]))
            except Exception as e:
                log.warning("CryptoDetector skipped %s: %s", fp, e)
        return out
