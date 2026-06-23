<#
  SecureScout — One-Command Demo (Windows / PowerShell)
  Scans the intentionally-vulnerable banking app end to end:
    scan -> risk score -> JSON + premium HTML report -> auto-fixed requirements
  then opens the HTML report in your browser.

  Usage:   .\demo.ps1
#>
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

function Section($t) {
  Write-Host ""
  Write-Host ("  " + $t) -ForegroundColor Cyan
  Write-Host ("  " + ("-" * $t.Length)) -ForegroundColor DarkGray
}

Clear-Host
Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Blue
Write-Host "     SecureScout v3.0  -  Live Demo" -ForegroundColor White
Write-Host "     PSB Hackathon 2026  -  Problem Statement 3" -ForegroundColor Gray
Write-Host "  =====================================================" -ForegroundColor Blue

# --- 0. Prereqs -------------------------------------------------------------
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $py) { Write-Host "  [X] Python not found on PATH." -ForegroundColor Red; exit 1 }
$python = $py.Source

Section "Step 1/4  Installing scanner dependencies"
& $python -m pip install -q -e .
Write-Host "  [ok] dependencies ready" -ForegroundColor Green

# --- 1. Scan + reports + autofix -------------------------------------------
$target = "vulnerable_bank_app"
$html   = Join-Path $root "securescout_report.html"
$json   = Join-Path $root "securescout_report.json"

Section "Step 2/4  Scanning '$target'"
& $python securescout/cli/scan.py $target `
    --output all `
    --report $html `
    --json-out $json `
    --autofix

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
  Write-Host "  [X] Scan failed (exit $LASTEXITCODE)." -ForegroundColor Red; exit 1
}

# --- 2. Show artifacts ------------------------------------------------------
Section "Step 3/4  Generated artifacts"
foreach ($f in @($json, $html, (Join-Path $root "$target\requirements.fixed.txt"))) {
  if (Test-Path $f) {
    $kb = [math]::Round((Get-Item $f).Length / 1KB, 1)
    Write-Host ("  [ok] {0,-40} {1} KB" -f (Split-Path $f -Leaf), $kb) -ForegroundColor Green
  } else {
    Write-Host ("  [--] {0}  (not generated)" -f (Split-Path $f -Leaf)) -ForegroundColor DarkYellow
  }
}

# --- 3. Open the report -----------------------------------------------------
Section "Step 4/4  Opening premium HTML report"
if (Test-Path $html) {
  Start-Process $html
  Write-Host "  [ok] report opened in default browser" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Demo complete." -ForegroundColor White
Write-Host "  Next: launch the dashboard  ->  npm run dev   (apps/web on http://localhost:3000)" -ForegroundColor Gray
Write-Host ""
