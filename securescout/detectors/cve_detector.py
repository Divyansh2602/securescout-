import re
from typing import List, Dict
from packaging import version
from securescout.engine import Finding

CVE_DB = {
    "flask":[("< 1.0","1.0","CVE-2018-1000656","HIGH",7.5,"Flask DoS via Large Request","Flask before 1.0 vulnerable to DoS through JSON parsing.","Upgrade to flask>=2.3.3")],
    "requests":[("< 2.20.0","2.20.0","CVE-2018-18074","MEDIUM",5.0,"requests HTTP Header Injection","Sends Authorization header on http redirect.","Upgrade to requests>=2.31.0")],
    "pyyaml":[("< 5.1","5.1","CVE-2017-18342","CRITICAL",9.8,"PyYAML Arbitrary Code Execution","yaml.load() allows arbitrary object deserialization.","Upgrade to pyyaml>=6.0.1 and use yaml.safe_load()")],
    "cryptography":[("< 2.3","2.3","CVE-2018-10903","HIGH",7.5,"cryptography Bleichenbacher Timing Attack","Vulnerable to timing attack in RSA decryption.","Upgrade to cryptography>=41.0.5")],
    "paramiko":[("< 2.4.2","2.4.2","CVE-2018-1000805","CRITICAL",9.8,"Paramiko Authentication Bypass","Does not properly check auth in server mode.","Upgrade to paramiko>=3.3.1")],
    "django":[("< 1.11.15","1.11.15","CVE-2018-14574","MEDIUM",6.1,"Django Open Redirect","Open redirect in CommonMiddleware.","Upgrade to django>=4.2.7"),("< 2.0","2.0","CVE-2019-3498","MEDIUM",6.5,"Django Content Spoofing","Content spoofing via crafted URLs.","Upgrade to django>=4.2.7")],
    "pillow":[("< 5.2.0","5.2.0","CVE-2018-12015","HIGH",7.5,"Pillow Path Traversal","Path traversal via EpsImagePlugin.","Upgrade to pillow>=10.1.0")],
    "sqlalchemy":[("< 1.2.0","1.2.0","CVE-2019-7164","HIGH",7.3,"SQLAlchemy SQL Injection via order_by","SQL injection via order_by parameter.","Upgrade to sqlalchemy>=2.0.23")],
    "pymongo":[("< 3.7.0","3.7.0","CVE-2018-16793","HIGH",8.1,"PyMongo Authentication Bypass","Improper auth failure handling.","Upgrade to pymongo>=4.6.0")],
    "celery":[("< 4.0","4.0","CVE-2021-23727","HIGH",7.5,"Celery Stored Command Injection","Command injection via task arguments.","Upgrade to celery>=5.3.4")],
    "numpy":[("< 1.16.0","1.16.0","CVE-2019-6446","HIGH",7.8,"NumPy Arbitrary Code Execution","Code execution loading crafted .npy files.","Upgrade to numpy>=1.26.1")],
    "pandas":[("< 1.0.0","1.0.0","CVE-2020-13091","HIGH",7.5,"Pandas Arbitrary Code Execution","Code execution via crafted pickle.","Upgrade to pandas>=2.1.2")],
    "boto3":[("< 1.9.0","1.9.0","CVE-2018-15869","MEDIUM",5.3,"boto3 Credential Exposure","May expose AWS credentials in logs.","Upgrade to boto3>=1.29.0")],
    "stripe":[("< 2.0.0","2.0.0","CVE-2018-11776","HIGH",8.1,"Stripe TLS Validation Weakness","Weaknesses in TLS cert validation.","Upgrade to stripe>=7.0.0")],
}
def parse(line):
    line=line.strip()
    if not line or line.startswith("#"): return None,None
    m=re.match(r'^([a-zA-Z0-9_\-\.]+)==([0-9][^\s;#]*)',line)
    return (m.group(1).lower(),m.group(2)) if m else (None,None)
def affected(v,c):
    try:
        pv=version.parse(v); op,ver=c.strip().split(); t=version.parse(ver)
        return {"<":pv<t,"<=":pv<=t,">":pv>t,">=":pv>=t,"==":pv==t}.get(op,False)
    except: return False
class CVEDetector:
    def run(self,files,base):
        import logging; log=logging.getLogger(__name__)
        out=[]
        for rf in files.get("requirements",[]):
            try:
                lines=rf.read_text(errors="ignore").splitlines(); rel=str(rf.relative_to(base))
                for i,line in enumerate(lines,1):
                    pkg,ver=parse(line)
                    if not pkg or pkg not in CVE_DB: continue
                    for (c,fix_v,cve,sev,cvss,title,desc,fix) in CVE_DB[pkg]:
                        if affected(ver,c):
                            out.append(Finding(f"CVE-{pkg}-{i}","CVE",sev,title,desc,rel,i,
                                f"{pkg}=={ver} (affected: {c}, fixed in: {fix_v})",fix,cve,cvss,
                                [f"https://nvd.nist.gov/vuln/detail/{cve}"]))
            except Exception as e:
                log.warning("CVEDetector skipped %s: %s", rf, e)
        return out
