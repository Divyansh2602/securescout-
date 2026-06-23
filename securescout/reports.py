"""SecureScout Premium HTML Report Generator v3.0

Produces a single self-contained HTML file (no external assets) with an
executive summary, risk gauge, severity distribution, and detailed,
severity-ranked finding cards. Safe to email or open offline.
"""
import html
from datetime import datetime

_SEV = {
    "CRITICAL": ("#ef4444", "#7f1d1d"),
    "HIGH":     ("#f97316", "#7c2d12"),
    "MEDIUM":   ("#eab308", "#713f12"),
    "LOW":      ("#3b82f6", "#1e3a8a"),
    "INFO":     ("#64748b", "#334155"),
}


def _risk(r):
    return min(100, r.critical * 10 + r.high * 4 + r.medium)


def _esc(s):
    return html.escape(str(s)) if s is not None else ""


def _gauge(score):
    if score >= 80:   color = "#ef4444"
    elif score >= 55: color = "#f97316"
    elif score >= 30: color = "#eab308"
    else:             color = "#22c55e"
    circ = 251.2  # 2*pi*40
    dash = circ * (score / 100.0)
    return f"""
    <svg viewBox="0 0 100 100" class="gauge">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e2236" stroke-width="9"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="{color}" stroke-width="9"
              stroke-linecap="round" stroke-dasharray="{dash:.1f} {circ:.1f}"
              transform="rotate(-90 50 50)"/>
      <text x="50" y="46" text-anchor="middle" class="gauge-num" fill="{color}">{score}</text>
      <text x="50" y="62" text-anchor="middle" class="gauge-lbl">/ 100</text>
    </svg>"""


def _donut(r):
    total = max(1, r.total_findings)
    segs, offset, circ = [], 0.0, 251.2
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        n = getattr(r, sev.lower(), 0)
        if not n:
            continue
        dash = circ * (n / total)
        color = _SEV[sev][0]
        segs.append(
            f'<circle cx="50" cy="50" r="40" fill="none" stroke="{color}" stroke-width="14" '
            f'stroke-dasharray="{dash:.1f} {circ - dash:.1f}" stroke-dashoffset="{-offset:.1f}" '
            f'transform="rotate(-90 50 50)"/>'
        )
        offset += dash
    return f'<svg viewBox="0 0 100 100" class="donut">{"".join(segs)}' \
           f'<text x="50" y="48" text-anchor="middle" class="donut-num">{r.total_findings}</text>' \
           f'<text x="50" y="62" text-anchor="middle" class="donut-lbl">findings</text></svg>'


def _finding_card(i, f):
    color, deep = _SEV.get(f.severity, _SEV["INFO"])
    cve = ""
    if f.cve_id:
        cvss = f' · CVSS {f.cvss_score}' if f.cvss_score else ''
        cve = f'<span class="pill" style="background:{deep};color:{color}">{_esc(f.cve_id)}{cvss}</span>'
    refs = ""
    if f.references:
        links = " ".join(f'<a href="{_esc(u)}" target="_blank" rel="noopener">{_esc(u)}</a>' for u in f.references)
        refs = f'<div class="refs">References: {links}</div>'
    return f"""
    <div class="card" style="border-left:4px solid {color}">
      <div class="card-head">
        <span class="sev" style="background:{color}">{_esc(f.severity)}</span>
        <span class="ttl">{i:02d}. {_esc(f.title)}</span>
        {cve}
      </div>
      <div class="meta"><span class="type">{_esc(f.type)}</span> · <code>{_esc(f.file)}:{f.line}</code></div>
      <p class="desc">{_esc(f.description)}</p>
      <div class="evidence"><span>Evidence</span><code>{_esc(f.evidence)}</code></div>
      <div class="fix"><span>Recommended Fix</span><div>{_esc(f.fix)}</div></div>
      {refs}
    </div>"""


def generate_html(r):
    score = _risk(r)
    status = "PASS" if r.passed else "FAIL"
    status_color = "#22c55e" if r.passed else "#ef4444"
    ts = datetime.now().strftime("%d %b %Y, %H:%M")

    cards = "".join(_finding_card(i, f) for i, f in enumerate(r.findings, 1))
    summary = "".join(
        f'<div class="stat" style="--c:{_SEV[s][0]}"><div class="num">{getattr(r, s.lower())}</div>'
        f'<div class="lbl">{s.title()}</div></div>'
        for s in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")
    )

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SecureScout Report — {_esc(r.target)}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0d14;color:#c8d0e7;line-height:1.5;padding:0 0 4rem}}
  .wrap{{max-width:980px;margin:0 auto;padding:0 1.5rem}}
  header{{background:linear-gradient(135deg,#11142080,#1e223680);border-bottom:1px solid #1e2236;padding:2rem 0;margin-bottom:2rem}}
  .brand{{display:flex;align-items:center;gap:.6rem;font-size:1.4rem;font-weight:700;color:#818cf8}}
  .brand .v{{font-size:.7rem;font-weight:600;color:#64748b;background:#1e2236;padding:2px 8px;border-radius:999px}}
  .sub{{color:#8a93ad;font-size:.85rem;margin-top:.35rem}}
  .hero{{display:grid;grid-template-columns:170px 170px 1fr;gap:1.5rem;align-items:center;margin-bottom:2rem}}
  .panel{{background:#11142066;border:1px solid #1e2236;border-radius:16px;padding:1.2rem;text-align:center}}
  .gauge,.donut{{width:140px;height:140px;display:block;margin:0 auto}}
  .gauge-num{{font-size:1.9rem;font-weight:700}} .gauge-lbl,.donut-lbl{{font-size:.55rem;fill:#8a93ad}}
  .donut-num{{font-size:1.5rem;font-weight:700;fill:#e6ebff}}
  .panel h3{{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#8a93ad;margin-top:.6rem}}
  .verdict{{text-align:left}}
  .verdict .status{{display:inline-block;font-size:1.1rem;font-weight:700;padding:.3rem .9rem;border-radius:10px;color:#0b0d14}}
  .verdict .target{{font-family:ui-monospace,Menlo,monospace;font-size:.85rem;color:#aeb7d4;margin:.7rem 0 .2rem;word-break:break-all}}
  .verdict .time{{font-size:.8rem;color:#8a93ad}}
  .stats{{display:grid;grid-template-columns:repeat(5,1fr);gap:.8rem;margin-bottom:2.4rem}}
  .stat{{background:#11142066;border:1px solid #1e2236;border-top:3px solid var(--c);border-radius:12px;padding:1rem;text-align:center}}
  .stat .num{{font-size:1.8rem;font-weight:700;color:var(--c)}}
  .stat .lbl{{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#8a93ad;margin-top:.2rem}}
  h2{{font-size:1.05rem;margin-bottom:1rem;color:#e6ebff}}
  .card{{background:#11142080;border:1px solid #1e2236;border-radius:12px;padding:1.1rem 1.2rem;margin-bottom:1rem}}
  .card-head{{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem}}
  .sev{{font-size:.66rem;font-weight:700;letter-spacing:.05em;color:#0b0d14;padding:2px 9px;border-radius:999px}}
  .ttl{{font-weight:600;color:#e6ebff;font-size:.95rem}}
  .pill{{font-size:.68rem;font-weight:600;padding:2px 9px;border-radius:999px;margin-left:auto}}
  .meta{{font-size:.8rem;color:#8a93ad;margin-bottom:.5rem}}
  .meta .type{{color:#818cf8;font-weight:600}} .meta code{{color:#aeb7d4}}
  .desc{{font-size:.88rem;color:#c8d0e7;margin-bottom:.7rem}}
  .evidence,.fix{{border-radius:8px;padding:.55rem .7rem;margin-bottom:.5rem;font-size:.82rem}}
  .evidence{{background:#0b0d14;border:1px solid #1e2236}}
  .evidence span,.fix span{{display:block;font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;color:#8a93ad;margin-bottom:.25rem}}
  .evidence code{{color:#f0b5b5;font-family:ui-monospace,Menlo,monospace;word-break:break-all}}
  .fix{{background:#0e1f17;border:1px solid #14502f}} .fix div{{color:#86efac}}
  .refs{{font-size:.74rem;color:#8a93ad;margin-top:.3rem}} .refs a{{color:#7c93f5;word-break:break-all}}
  footer{{text-align:center;color:#5a637c;font-size:.76rem;margin-top:2.5rem}}
  @media(max-width:720px){{.hero{{grid-template-columns:1fr}}.stats{{grid-template-columns:repeat(2,1fr)}}}}
</style></head>
<body>
<header><div class="wrap">
  <div class="brand">🛡️ SecureScout <span class="v">v{_esc(r.scanner_version)}</span></div>
  <div class="sub">Automated Dependency &amp; Code Security Report · PSB Hackathon 2026 · Problem Statement 3</div>
</div></header>

<div class="wrap">
  <div class="hero">
    <div class="panel">{_gauge(score)}<h3>Risk Score</h3></div>
    <div class="panel">{_donut(r)}<h3>Severity Mix</h3></div>
    <div class="panel verdict">
      <span class="status" style="background:{status_color}">{status}</span>
      <div class="target">{_esc(r.target)}</div>
      <div class="time">{r.total_findings} findings · scanned in {r.scan_time}s · {ts}</div>
    </div>
  </div>

  <div class="stats">{summary}</div>

  <h2>Findings ({r.total_findings})</h2>
  {cards if cards else '<p class="sub">No findings — clean scan. ✅</p>'}

  <footer>Generated by SecureScout v{_esc(r.scanner_version)} · {ts}</footer>
</div>
</body></html>"""
