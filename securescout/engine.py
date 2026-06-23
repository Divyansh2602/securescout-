"""SecureScout Scanner Engine v3.0"""
import json, time
from pathlib import Path
from typing import List
from dataclasses import dataclass, asdict, field

@dataclass
class Finding:
    id: str; type: str; severity: str; title: str; description: str
    file: str; line: int; evidence: str; fix: str
    cve_id: str = ""; cvss_score: float = 0.0
    references: List[str] = field(default_factory=list)

@dataclass
class ScanResult:
    target: str; scan_time: float; total_findings: int
    critical: int; high: int; medium: int; low: int; info: int
    findings: List[Finding]; scanner_version: str = "3.0.0"; passed: bool = False

class SecureScoutEngine:
    def __init__(self, target_path: str, verbose: bool = False):
        self.target_path = Path(target_path).resolve()
        self.verbose = verbose
        self.findings: List[Finding] = []
        self._load_detectors()

    def _load_detectors(self):
        from securescout.detectors.cve_detector       import CVEDetector
        from securescout.detectors.secret_detector    import SecretDetector
        from securescout.detectors.crypto_detector    import CryptoDetector
        from securescout.detectors.injection_detector import InjectionDetector
        from securescout.detectors.config_detector    import ConfigDetector
        self.detectors = [CVEDetector(), SecretDetector(), CryptoDetector(), InjectionDetector(), ConfigDetector()]

    def scan(self) -> ScanResult:
        start = time.time(); self.findings = []
        # Skip SecureScout's own remediation output so fixed files are never re-scanned.
        def _g(pattern): return [p for p in self.target_path.rglob(pattern) if ".fixed." not in p.name]
        files = {
            "python":       _g("*.py"),
            "yaml":         _g("*.yaml") + _g("*.yml"),
            "requirements": _g("requirements*.txt"),
            "config":       _g("*.cfg") + _g("*.ini"),
            "json":         _g("*.json"),
        }
        for d in self.detectors:
            try: self.findings.extend(d.run(files, self.target_path))
            except Exception as e:
                if self.verbose: print(f"[!] {e}")
        elapsed = round(time.time() - start, 2)
        seen, unique = set(), []
        for f in self.findings:
            k = (f.file, f.line, f.title)
            if k not in seen: seen.add(k); unique.append(f)
        unique.sort(key=lambda x: ["CRITICAL","HIGH","MEDIUM","LOW","INFO"].index(x.severity))
        c = {s: sum(1 for f in unique if f.severity == s) for s in ["CRITICAL","HIGH","MEDIUM","LOW","INFO"]}
        return ScanResult(str(self.target_path), elapsed, len(unique),
                          c["CRITICAL"], c["HIGH"], c["MEDIUM"], c["LOW"], c["INFO"],
                          unique, passed=c["CRITICAL"]==0 and c["HIGH"]==0)

    def to_json(self, result): return json.dumps(asdict(result), indent=2)
