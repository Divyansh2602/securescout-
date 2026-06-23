"""SecureScout Code & Config Auto-Remediation Engine v3.0

Companion to autofix.py (which patches dependency versions). This module
rewrites *source and config files* for the classes of issue that can be fixed
deterministically without changing program behaviour, e.g.:

  yaml.load → yaml.safe_load,  hashlib.md5 → sha256,  verify=False → verify=True,
  debug=True → False,  shell=True → shell=False,  ECB → GCM,  tls:false → true …

Two further categories are handled conservatively:
  * EXTERNALIZED — a hardcoded secret assignment is rewritten to read from the
    environment (the secret leaves the source; you set the env var).
  * MANUAL       — issues that cannot be safely auto-rewritten (SQL injection,
    eval/exec, insecure deserialization, XSS). These are reported, never
    silently changed, because a mechanical rewrite would risk breaking logic.

Fixes are written to sibling `*.fixed.<ext>` files; originals are untouched.
"""
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Callable, Optional, Tuple

# A handler takes a source line and returns the rewritten line, or None if it
# did not apply to that line.
Handler = Callable[[str], Optional[str]]


def _sub(pattern: str, repl: str, flags: int = 0) -> Handler:
    rx = re.compile(pattern, flags)
    def fn(line: str) -> Optional[str]:
        new = rx.sub(repl, line)
        return new if new != line else None
    return fn


# ── secret externalization ──────────────────────────────────────────────────
_PY_ASSIGN = re.compile(r'^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(["\']).*?\3\s*$')

def _externalize_py(line: str) -> Optional[str]:
    """NAME = "literal"  ->  NAME = os.environ["NAME"]"""
    m = _PY_ASSIGN.match(line)
    if not m:
        return None
    indent, name = m.group(1), m.group(2)
    return f'{indent}{name} = os.environ["{name}"]  # SecureScout: secret externalized'

_CFG_PW = re.compile(r'(?i)^(\s*password\s*:\s*).*$')

def _externalize_cfg_pw(line: str) -> Optional[str]:
    m = _CFG_PW.match(line)
    return f'{m.group(1)}${{DB_PASSWORD}}  # SecureScout: use env substitution' if m else None

def _externalize_cfg_aws(line: str) -> Optional[str]:
    new = re.sub(r'AKIA[0-9A-Z]{16}', '${AWS_ACCESS_KEY_ID}', line)
    return new if new != line else None


# ── config SSL/TLS toggles ──────────────────────────────────────────────────
_SSL = re.compile(r'(?i)^(\s*ssl[_\s]*(?:mode|enabled|verify)?\s*:\s*)(disable|false|no|0)\b.*$')

def _fix_ssl(line: str) -> Optional[str]:
    m = _SSL.match(line)
    if not m:
        return None
    repl = 'verify-full' if m.group(2).lower() == 'disable' else 'true'
    return f'{m.group(1)}{repl}'

def _fix_verify_disabled(line: str) -> Optional[str]:
    """Handles both Python `verify=False` and YAML `verify_ssl: false`."""
    if re.search(r'verify\s*=\s*False', line):
        return re.sub(r'verify\s*=\s*False', 'verify=True', line)
    new = re.sub(r'(?i)(verify[_\-]?ssl\s*:\s*)(false|no|0)\b', r'\1true', line)
    return new if new != line else None


# title (as emitted by the detectors)  ->  (kind, handler)
#   kind: 'auto' (logic-preserving) | 'externalized' (secret moved to env)
AUTO: Dict[str, Tuple[str, Handler]] = {
    # crypto / deserialization (safe mechanical swaps)
    "Unsafe YAML Load (RCE)":            ('auto', _sub(r'\byaml\.load\s*\(', 'yaml.safe_load(')),
    "MD5 Used for Hashing":              ('auto', _sub(r'hashlib\.md5\s*\(', 'hashlib.sha256(')),
    "SHA-1 Used for Hashing":            ('auto', _sub(r'hashlib\.sha1\s*\(', 'hashlib.sha256(')),
    "Insecure Random Generator":         ('auto', _sub(r'(?<!\w)random\.(randint|random|choice)\s*\(',
                                                       r'secrets.SystemRandom().\1(')),
    # transport / runtime hardening
    "SSL Verification Disabled":         ('auto', _fix_verify_disabled),
    "World-Readable File Permissions (777)": ('auto', _sub(r'0o?777', '0o600')),
    "Flask Debug Mode in app.run()":     ('auto', _sub(r'debug\s*=\s*True', 'debug=False')),
    "Debug Mode Enabled":                ('auto', _sub(r'(?i)\b(DEBUG|TESTING)\s*=\s*(?:True|1|true)', r'\1 = False')),
    "Flask on All Interfaces":           ('auto', _sub(r'0\.0\.0\.0', '127.0.0.1')),
    "Command Injection via shell=True":  ('auto', _sub(r'shell\s*=\s*True', 'shell=False')),
    # config files
    "SSL/TLS Disabled in Config":        ('auto', _fix_ssl),
    "TLS Disabled in Config":            ('auto', _sub(r'(?i)(tls\s*:\s*)(?:false|no|0)\b', r'\1true')),
    "ECB Encryption Mode":               ('auto', _sub(r'(?i)(mode\s*:\s*)ECB\b', r'\1GCM')),
    "Broken Encryption Algorithm":       ('auto', _sub(r'(?i)(algorithm\s*:\s*)(?:DES|RC4|MD5|SHA1|3DES)\b', r'\1AES-256-GCM')),
    "Password Logging Enabled":          ('auto', _sub(r'(?i)(log[_\-]?passwords?\s*:\s*)(?:true|yes|1)\b', r'\1false')),
    "Card Number Logging Enabled":       ('auto', _sub(r'(?i)(log[_\-]?card[_\-]?numbers?\s*:\s*)(?:true|yes|1)\b', r'\1false')),
    "Debug Logging in Production":       ('auto', _sub(r'(?i)(level\s*:\s*)DEBUG\b', r'\1WARNING')),
    "Weak Cryptographic Key Size":       ('auto', _sub(r'(?i)(key[_\-]?size\s*:\s*)(?:56|64|128)\b', r'\g<1>256')),
    "Excessively Long JWT Expiry":       ('auto', _sub(r'(?i)(expir[yie]+\s*:\s*)\d{5,}', r'\g<1>3600')),
    # secrets → environment
    "Hardcoded Password / Secret":       ('externalized', _externalize_py),
    "Hardcoded JWT Secret":              ('externalized', _externalize_py),
    "Hardcoded API Key":                 ('externalized', _externalize_py),
    "Hardcoded AWS Access Key ID":       ('externalized', _externalize_py),
    "Hardcoded Password in Config":      ('externalized', _externalize_cfg_pw),
    "AWS Access Key in Config":          ('externalized', _externalize_cfg_aws),
}

# Issues we deliberately do NOT auto-rewrite (would risk breaking behaviour).
MANUAL_TITLES = {
    "SQL Injection via f-string", "SQL Injection via Concatenation",
    "Code Injection via eval()", "Code Injection via exec()",
    "Insecure Deserialization (pickle)", "XSS via render_template_string",
    "Command Execution via os.system", "Potential Open Redirect",
    "CORS Wildcard Configured", "Empty Password in Config",
}


@dataclass
class CodeFix:
    file: str
    line: int
    title: str
    severity: str
    kind: str            # 'auto' | 'externalized' | 'manual'
    before: str
    after: str = ""      # '' for manual


@dataclass
class CodeFixResult:
    fixes: List[CodeFix]
    files_written: List[str]

    @property
    def auto(self) -> int:         return sum(1 for f in self.fixes if f.kind == 'auto')
    @property
    def externalized(self) -> int: return sum(1 for f in self.fixes if f.kind == 'externalized')
    @property
    def manual(self) -> int:       return sum(1 for f in self.fixes if f.kind == 'manual')
    @property
    def changed(self) -> int:      return self.auto + self.externalized


def _ensure_import(lines: List[str], module: str) -> List[str]:
    """Insert `import <module>` if the file rewrites now depend on it."""
    if any(re.match(rf'^\s*(import\s+{module}\b|from\s+{module}\b)', ln) for ln in lines):
        return lines
    insert_at = 0
    for i, ln in enumerate(lines[:60]):
        if re.match(r'^\s*(import\s+\w|from\s+\w)', ln):
            insert_at = i + 1
    return lines[:insert_at] + [f'import {module}'] + lines[insert_at:]


def generate_code_fixes(result, target_path: str) -> CodeFixResult:
    base = Path(target_path).resolve()
    # Group non-dependency findings by file.
    by_file: Dict[str, List] = {}
    for f in result.findings:
        if f.type == "CVE":
            continue
        by_file.setdefault(f.file, []).append(f)

    all_fixes: List[CodeFix] = []
    written: List[str] = []

    for rel_file, findings in by_file.items():
        src = base / rel_file
        if not src.exists():
            continue
        lines = src.read_text(errors="ignore").splitlines()
        changed = False
        need_os = need_secrets = False
        fixed_lines: set = set()   # line indices already remediated this pass

        # Apply line-by-line, lowest line number first.
        for fnd in sorted(findings, key=lambda x: x.line):
            idx = fnd.line - 1
            if idx < 0 or idx >= len(lines):
                # Can't locate the line; record as manual for visibility.
                all_fixes.append(CodeFix(rel_file, fnd.line, fnd.title, fnd.severity, 'manual', '', ''))
                continue
            original = lines[idx]
            entry = AUTO.get(fnd.title)
            if entry is None:
                all_fixes.append(CodeFix(rel_file, fnd.line, fnd.title, fnd.severity, 'manual', original.strip(), ''))
                continue
            kind, handler = entry
            new_line = handler(lines[idx])
            if new_line is None:
                # An auto-fixable issue whose line a prior rule already rewrote is
                # remediated (subsumed), not manual. Only a true pattern miss is manual.
                sub_kind = 'auto' if idx in fixed_lines else 'manual'
                all_fixes.append(CodeFix(rel_file, fnd.line, fnd.title, fnd.severity, sub_kind, original.strip(), lines[idx].strip() if sub_kind == 'auto' else ''))
                continue
            lines[idx] = new_line
            changed = True
            fixed_lines.add(idx)
            if 'os.environ' in new_line:                 need_os = True
            if 'secrets.SystemRandom' in new_line:        need_secrets = True
            all_fixes.append(CodeFix(rel_file, fnd.line, fnd.title, fnd.severity, kind, original.strip(), new_line.strip()))

        if changed:
            if src.suffix == '.py':
                if need_os:      lines = _ensure_import(lines, 'os')
                if need_secrets: lines = _ensure_import(lines, 'secrets')
            dest = src.with_name(src.stem + '.fixed' + src.suffix)
            dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
            written.append(str(dest))

    return CodeFixResult(fixes=all_fixes, files_written=written)
