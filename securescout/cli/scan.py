#!/usr/bin/env python3
"""SecureScout CLI v3.0"""
import sys, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from securescout.engine import SecureScoutEngine

def risk(r): return min(100, r.critical*10 + r.high*4 + r.medium)
def main():
    p=argparse.ArgumentParser(prog="securescout")
    p.add_argument("target")
    p.add_argument("--output",choices=["terminal","json","html","all"],default="terminal")
    p.add_argument("--json-out",default="securescout_report.json")
    p.add_argument("--report",default="securescout_report.html")
    p.add_argument("--fail-on-critical",action="store_true")
    p.add_argument("--autofix",action="store_true",help="generate patched requirements.fixed.txt for vulnerable deps")
    p.add_argument("--verbose","-v",action="store_true")
    a=p.parse_args()
    if not Path(a.target).exists():
        print(f"Error: path not found: {a.target}"); sys.exit(1)
    eng=SecureScoutEngine(a.target,verbose=a.verbose); res=eng.scan(); sc=risk(res)
    print(f"\n  SecureScout v3.0 - Scan Complete")
    print(f"  Target: {res.target}")
    print(f"  Risk Score: {sc}/100  |  Status: {'PASS' if res.passed else 'FAIL'}")
    print(f"  Critical: {res.critical}  High: {res.high}  Medium: {res.medium}  Low: {res.low}")
    print(f"  Total: {res.total_findings} findings in {res.scan_time}s\n")
    if a.output in("terminal","all"):
        for i,f in enumerate(res.findings,1):
            print(f"  [{i:02d}] {f.severity:9} {f.title}")
            print(f"       {f.file}:{f.line}")
            if f.cve_id: print(f"       {f.cve_id} CVSS {f.cvss_score}")
            print(f"       Fix: {f.fix[:90]}\n")
    if a.output in("json","all"):
        with open(a.json_out,"w",encoding="utf-8") as fp: fp.write(eng.to_json(res))
        print(f"  JSON: {a.json_out}")
    if a.output in("html","all"):
        from securescout.reports import generate_html
        with open(a.report,"w",encoding="utf-8") as fp: fp.write(generate_html(res))
        print(f"  HTML: {a.report}")
    if a.autofix:
        from securescout.autofix import write_fixes
        from securescout.codefix import generate_code_fixes
        print(f"\n  Auto-Remediation Engine")
        # 1) Dependency upgrades
        fr=write_fixes(res,a.target)
        if fr.total==0:
            print(f"  Dependencies: nothing to patch.")
        else:
            print(f"  Dependencies patched ({fr.total}):")
            for p in fr.patches:
                print(f"    [FIX] {p.old:26} -> {p.new:24} ({p.cve_id})")
        # 2) Code & config remediation
        cr=generate_code_fixes(res,a.target)
        if cr.changed:
            print(f"  Code & config auto-fixed ({cr.changed}):")
            for f in cr.fixes:
                if f.kind=="auto":
                    print(f"    [FIX] {f.file}:{f.line}  {f.title}")
                elif f.kind=="externalized":
                    print(f"    [ENV] {f.file}:{f.line}  {f.title} -> environment")
        # 3) Manual-review items (cannot be safely auto-rewritten)
        manual=[f for f in cr.fixes if f.kind=="manual"]
        if manual:
            print(f"  Needs manual review ({len(manual)}) - fix suggestions provided, not auto-applied:")
            for f in manual:
                print(f"    [TODO] {f.file}:{f.line}  {f.title}")
        # 4) Output files
        for w in fr.files_written+cr.files_written:
            print(f"  Wrote: {w}")
        total_fixed=fr.total+cr.changed
        print(f"\n  Summary: {total_fixed} auto-remediated, {len(manual)} flagged for review.\n")
    if a.fail_on_critical and res.critical>0: sys.exit(1)
if __name__=="__main__": main()
