import re
from securescout.engine import Finding
P=[
 {"id":"EMPTY","p":re.compile(r'(?i)password\s*:\s*["\']?\s*["\']?\s*$'),"s":"CRITICAL","t":"Empty Password in Config","f":"Set a strong password, store in env vars."},
 {"id":"JWT","p":re.compile(r'(?i)expir[yie]+\s*:\s*(\d{5,})'),"s":"MEDIUM","t":"Excessively Long JWT Expiry","f":"Set expiry to 15-60 minutes for access tokens."},
 {"id":"DLOG","p":re.compile(r'(?i)level\s*:\s*DEBUG\b'),"s":"MEDIUM","t":"Debug Logging in Production","f":"Set logging level to WARNING or ERROR."},
 {"id":"KEY","p":re.compile(r'(?i)key[_\-]?size\s*:\s*(56|64|128)\b'),"s":"HIGH","t":"Weak Cryptographic Key Size","f":"Use minimum 256-bit key size."},
]
class ConfigDetector:
    def run(self,files,base):
        import logging; log=logging.getLogger(__name__)
        out=[]
        for fp in files.get("yaml",[])+files.get("config",[]):
            try:
                rel=str(fp.relative_to(base))
                for i,l in enumerate(fp.read_text(errors="ignore").splitlines(),1):
                    if l.strip().startswith("#"): continue
                    for x in P:
                        if x["p"].search(l):
                            out.append(Finding(f"{x['id']}-{rel}-{i}","MISCONFIG",x["s"],x["t"],f"Insecure config at line {i}.",rel,i,f"Line {i}: `{l.strip()[:100]}`",x["f"],"",0.0,["https://owasp.org/www-project-top-ten/"]))
            except Exception as e:
                log.warning("ConfigDetector skipped %s: %s", fp, e)
        return out
