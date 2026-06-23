#!/usr/bin/env python3
"""SecureScout remediation bundler.

Scans a target, runs the dependency + code/config auto-fixers, and packages the
fixed files into a single .zip a developer can unzip over their repo. Prints a
JSON summary to stdout for the API to store. Source files are NOT left modified
(the .fixed.* artifacts are cleaned up after zipping).

Usage:  python remediate.py <target> --out <bundle.zip>
"""
import sys, json, zipfile, argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from securescout.engine import SecureScoutEngine
from securescout.autofix import write_fixes
from securescout.codefix import generate_code_fixes


def _orig_rel(target: Path, fixed_path: str) -> str:
    """`.../src/app.fixed.py` -> `src/app.py` (relative to target)."""
    rel = str(Path(fixed_path).resolve().relative_to(target)).replace("\\", "/")
    return rel.replace(".fixed.", ".", 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    target = Path(a.target).resolve()
    res = SecureScoutEngine(str(target)).scan()

    fr = write_fixes(res, str(target))                 # requirements.fixed.txt
    cr = generate_code_fixes(res, str(target))         # *.fixed.py / *.fixed.yaml
    written = list(fr.files_written) + list(cr.files_written)

    # Map manual items to their fix suggestion from the original findings.
    fix_for = {(f.file, f.line, f.title): f.fix for f in res.findings}
    manual = [{
        "file": f.file, "line": f.line, "title": f.title,
        "severity": f.severity, "fix": fix_for.get((f.file, f.line, f.title), ""),
    } for f in cr.fixes if f.kind == "manual"]

    changed = [_orig_rel(target, w) for w in written]

    # Human-readable summary shipped inside the bundle.
    md = ["# SecureScout Remediation Bundle", "",
          f"- Dependencies patched: {fr.total}",
          f"- Code/config auto-fixed: {cr.auto}",
          f"- Secrets externalized to environment: {cr.externalized}",
          f"- Manual review required: {len(manual)}", "",
          "## Files changed (unzip over your repo to apply)"]
    md += [f"- {c}" for c in changed]
    if fr.patches:
        md += ["", "## Dependency upgrades"]
        md += [f"- {p.old} -> {p.new}  ({p.cve_id})" for p in fr.patches]
    if cr.externalized:
        md += ["", "## Environment variables to set",
               "These secrets were moved out of source; provide them at runtime:"]
        md += [f"- {f.file}:{f.line}  {f.title}" for f in cr.fixes if f.kind == "externalized"]
    if manual:
        md += ["", "## Manual review (NOT auto-applied — would risk breaking logic)"]
        md += [f"- {m['file']}:{m['line']}  [{m['severity']}] {m['title']}\n    Fix: {m['fix']}" for m in manual]

    # Build the zip: each fixed file at its ORIGINAL path + the summary doc.
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for w in written:
            z.write(w, arcname=_orig_rel(target, w))
        z.writestr("SECURESCOUT_REMEDIATION.md", "\n".join(md) + "\n")

    # Clean up the .fixed.* artifacts so we never pollute the scanned source.
    for w in written:
        try: Path(w).unlink()
        except OSError: pass

    print(json.dumps({
        "available": len(written) > 0,
        "deps": fr.total,
        "autoFixed": cr.auto,
        "externalized": cr.externalized,
        "manual": len(manual),
        "filesChanged": changed,
        "manualItems": manual,
        "bundle": str(out),
    }))


if __name__ == "__main__":
    main()
