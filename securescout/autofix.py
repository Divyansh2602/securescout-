"""SecureScout Auto-Fix Engine v3.0

Generates a patched `requirements.fixed.txt` for every requirements file that
contains a vulnerable dependency. Fixes are derived from the CVE detector's
remediation advice (e.g. "Upgrade to flask>=2.3.3"), so the patched pins always
move to a known-safe version.

Code-level findings (injection, secrets, weak crypto) are reported as manual
review items — auto-patching source code is intentionally out of scope to avoid
breaking application logic.
"""
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict

# "Upgrade to flask>=2.3.3"  ->  ("flask", ">=", "2.3.3")
_FIX_RE = re.compile(r"to\s+([A-Za-z0-9_.\-]+)\s*([<>=!]=?)\s*([0-9][^\s,;]*)")
# "flask==0.12.2 (affected: ...)"  ->  ("flask", "0.12.2")
_EVID_RE = re.compile(r"^([A-Za-z0-9_.\-]+)==([0-9][^\s,;#]*)")


@dataclass
class Patch:
    file: str            # requirements file (relative to target)
    package: str
    old: str             # "flask==0.12.2"
    new: str             # "flask>=2.3.3"
    cve_id: str
    severity: str


@dataclass
class FixResult:
    patches: List[Patch]
    files_written: List[str]
    manual_review: int   # code findings that need a human

    @property
    def total(self) -> int:
        return len(self.patches)


def _recommended(fix_text: str):
    m = _FIX_RE.search(fix_text or "")
    if not m:
        return None, None, None
    return m.group(1).lower(), m.group(2), m.group(3)


def generate_fixes(result, target_path: str) -> FixResult:
    """Build patched requirements files. Returns a FixResult; writes nothing
    until `write_fixes` is called so callers can preview first."""
    base = Path(target_path).resolve()
    # Map each vulnerable package (by requirements file) to its safe pin.
    by_file: Dict[str, Dict[str, Patch]] = {}
    manual = 0

    for f in result.findings:
        if f.type != "CVE":
            if f.severity in ("CRITICAL", "HIGH", "MEDIUM"):
                manual += 1
            continue
        pkg, op, ver = _recommended(f.fix)
        ev = _EVID_RE.match(f.evidence.strip())
        old_pkg = ev.group(1).lower() if ev else pkg
        old_ver = ev.group(2) if ev else "?"
        if not pkg or not ver:
            continue
        by_file.setdefault(f.file, {})[old_pkg] = Patch(
            file=f.file, package=old_pkg,
            old=f"{old_pkg}=={old_ver}", new=f"{pkg}{op}{ver}",
            cve_id=f.cve_id, severity=f.severity,
        )

    patches: List[Patch] = []
    for fpatches in by_file.values():
        patches.extend(fpatches.values())
    return FixResult(patches=patches, files_written=[], manual_review=manual), base, by_file


def write_fixes(result, target_path: str) -> FixResult:
    """Generate AND write `*.fixed.txt` next to each affected requirements file."""
    fix_result, base, by_file = generate_fixes(result, target_path)
    written: List[str] = []

    for rel_file, fpatches in by_file.items():
        src = (base / rel_file)
        if not src.exists():
            continue
        lines = src.read_text(errors="ignore").splitlines()
        out_lines = []
        for line in lines:
            ev = _EVID_RE.match(line.strip())
            if ev and ev.group(1).lower() in fpatches:
                p = fpatches[ev.group(1).lower()]
                indent = line[: len(line) - len(line.lstrip())]
                out_lines.append(f"{indent}{p.new}  # SecureScout: {p.cve_id} ({p.severity}) was {p.old}")
            else:
                out_lines.append(line)
        dest = src.with_name(src.stem + ".fixed.txt")
        dest.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
        written.append(str(dest))

    fix_result.files_written = written
    return fix_result
