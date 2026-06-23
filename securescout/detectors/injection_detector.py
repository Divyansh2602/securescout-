import re
from securescout.engine import Finding
P=[
 {"id":"SQLF","p":re.compile(r'(?i)(execute|cursor\.execute)\s*\(\s*f["\'].*?(SELECT|INSERT|UPDATE|DELETE|WHERE)'),"s":"CRITICAL","t":"SQL Injection via f-string","f":"Use parameterized queries: cursor.execute('... WHERE id=?', (id,))"},
 {"id":"SQLC","p":re.compile(r'(?i)(execute)\s*\(\s*["\'].*?(SELECT|WHERE).*?\+\s*\w'),"s":"CRITICAL","t":"SQL Injection via Concatenation","f":"Use parameterized queries with placeholders."},
 {"id":"CMD","p":re.compile(r'subprocess\.(run|call|Popen|check_output)\s*\([^)]*shell\s*=\s*True'),"s":"CRITICAL","t":"Command Injection via shell=True","f":"Use shell=False with arg list."},
 {"id":"OSSYS","p":re.compile(r'os\.(system|popen)\s*\('),"s":"HIGH","t":"Command Execution via os.system","f":"Replace with subprocess.run([...], shell=False)."},
 {"id":"XSS","p":re.compile(r'render_template_string\s*\(\s*f["\']'),"s":"HIGH","t":"XSS via render_template_string","f":"Use render_template() or markupsafe.escape()."},
 {"id":"REDIR","p":re.compile(r'(?i)(url\s*=\s*request\.(args|form|values)\.get)'),"s":"MEDIUM","t":"Potential Open Redirect","f":"Validate redirect URL stays on same host."},
 {"id":"EVAL","p":re.compile(r'\beval\s*\('),"s":"CRITICAL","t":"Code Injection via eval()","f":"Remove eval(). Use ast.literal_eval()."},
 {"id":"EXEC","p":re.compile(r'\bexec\s*\('),"s":"CRITICAL","t":"Code Injection via exec()","f":"Remove exec() entirely. Refactor logic."},
]
class InjectionDetector:
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
                            out.append(Finding(f"{x['id']}-{rel}-{i}","INJECTION",x["s"],x["t"],f"Injection vulnerability at line {i}.",rel,i,f"Line {i}: `{l.strip()[:100]}`",x["f"],"",0.0,["https://owasp.org/www-community/attacks/Injection"]))
            except Exception as e:
                log.warning("InjectionDetector skipped %s: %s", fp, e)
        return out
