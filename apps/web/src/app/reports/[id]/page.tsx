'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Scan, Finding, Severity } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { FindingsTable } from '@/components/findings/FindingsTable';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { cn, riskMeta } from '@/lib/utils';
import { Download, Loader2, CheckCircle2, XCircle, Wrench, KeyRound, AlertTriangle } from 'lucide-react';

interface Remediation {
  available: boolean;
  deps?: number; autoFixed?: number; externalized?: number; manual?: number;
  filesChanged?: string[];
  manualItems?: { file: string; line: number; title: string; severity: string; fix: string }[];
}

// Web-only users (e.g. a bank) download the fixed files here — no CLI needed.
function RemediationPanel({ scanId }: { scanId: string }) {
  const [rem, setRem] = useState<Remediation | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/scans/${scanId}/remediation`).then(r => setRem(r.data.data)).catch(() => setRem({ available: false }));
  }, [scanId]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/scans/${scanId}/remediation/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `securescout-remediation-${scanId}.zip`; a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  if (!rem || !rem.available) return null;
  const autoTotal = (rem.deps ?? 0) + (rem.autoFixed ?? 0) + (rem.externalized ?? 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Auto-Remediation</h3>
        </div>
        <button onClick={download} disabled={downloading}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3.5 py-2 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download fixes (.zip)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Dependencies patched', val: rem.deps ?? 0,        icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Code/config fixed',    val: rem.autoFixed ?? 0,   icon: Wrench,       color: 'text-green-400' },
          { label: 'Secrets externalized', val: rem.externalized ?? 0, icon: KeyRound,     color: 'text-blue-400' },
          { label: 'Manual review',        val: rem.manual ?? 0,      icon: AlertTriangle, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-background border border-border rounded-lg p-3 text-center">
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
            <div className={cn('text-xl font-bold font-mono', s.color)}>{s.val}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        <span className="font-semibold text-foreground">{autoTotal}</span> issues auto-remediated.
        The bundle contains your fixed files at their original paths plus a summary — unzip it over the repo to apply.
      </p>

      {rem.manualItems && rem.manualItems.length > 0 && (
        <div className="border border-orange-800/30 bg-orange-950/10 rounded-lg p-3">
          <div className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs manual review (not auto-applied — would risk breaking logic)
          </div>
          <div className="space-y-2">
            {rem.manualItems.map((m, i) => (
              <div key={i} className="text-xs">
                <div className="font-medium">{m.title} <span className="text-muted-foreground font-mono">· {m.file}:{m.line}</span></div>
                <div className="text-muted-foreground">→ {m.fix}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Explains exactly how riskScore and the PASS/FAIL verdict were derived.
function ScoreBreakdown({ scan }: { scan: Scan }) {
  const raw = scan.critical * 10 + scan.high * 4 + scan.medium * 1;
  const capped = raw > 100;
  const meta = riskMeta(scan.riskScore);
  const term = (n: number, w: number, color: string) => (
    <span className={cn('font-mono', n > 0 ? color : 'text-muted-foreground')}>
      {n}<span className="text-muted-foreground">×{w}</span>
    </span>
  );
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold">Why this score?</h3>
        <span className={cn('text-xs font-mono font-semibold px-2 py-0.5 rounded-md border', meta.color, meta.bg, meta.border)}>
          {meta.label}
        </span>
      </div>

      {/* Formula with this scan's actual numbers */}
      <div className="bg-background border border-border rounded-lg px-4 py-3 text-sm">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Weighted formula (Critical=10, High=4, Medium=1)</div>
        <div className="font-mono flex items-center gap-1.5 flex-wrap">
          {term(scan.critical, 10, 'text-red-400')}<span className="text-muted-foreground">+</span>
          {term(scan.high, 4, 'text-orange-400')}<span className="text-muted-foreground">+</span>
          {term(scan.medium, 1, 'text-yellow-400')}
          <span className="text-muted-foreground">=</span>
          <span className="font-semibold">{raw}</span>
          {capped && <span className="text-muted-foreground">→ capped at 100</span>}
          <span className="text-muted-foreground">→</span>
          <span className={cn('font-bold', meta.color)}>{scan.riskScore}/100</span>
        </div>
      </div>

      {/* Pass / fail reasoning */}
      <div className={cn('mt-3 flex items-start gap-2.5 rounded-lg px-4 py-3 border',
        scan.passed ? 'bg-green-950/20 border-green-800/40' : 'bg-red-950/20 border-red-800/40')}>
        {scan.passed
          ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
        <div className="text-sm">
          <div className={cn('font-semibold', scan.passed ? 'text-green-400' : 'text-red-400')}>
            {scan.passed ? 'Build gate PASSED' : 'Build gate FAILED'}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {scan.passed
              ? 'No Critical or High severity findings. CI/CD with --fail-on-critical would let this build through.'
              : `The gate blocks on any Critical or High finding. This scan has ${scan.critical} Critical and ${scan.high} High — a CI build would fail.`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/scans/${id}`)
      .then(r => setScan(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Poll while scan is running
    const interval = setInterval(() => {
      if (scan?.status === 'RUNNING' || scan?.status === 'QUEUED') load();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, scan?.status]);

  const exportJson = async () => {
    const { data } = await api.get(`/reports/scan/${id}/json`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `securescout-${id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!scan)   return <AppShell><div className="text-center py-20 text-muted-foreground">Scan not found</div></AppShell>;

  const meta = riskMeta(scan.riskScore);
  const running = scan.status === 'RUNNING' || scan.status === 'QUEUED';

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{scan.name}</h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">{scan.target}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-md text-xs font-mono font-semibold',
              scan.passed ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                          : 'bg-red-950/40 text-red-400 border border-red-800/40')}>
              {scan.passed ? 'BUILD PASSED' : 'BUILD FAILED'}
            </span>
            {!running && (
              <button onClick={exportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border hover:bg-secondary transition-colors">
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
            )}
          </div>
        </div>

        {running ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <div className="text-sm font-medium">Scan {scan.status.toLowerCase()}...</div>
            <div className="text-xs text-muted-foreground mt-1">This page updates automatically</div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RiskGauge score={scan.riskScore} />
              <div className="md:col-span-2 bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Findings Summary</div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label:'Total', val:scan.totalFindings, color:'text-foreground' },
                    { label:'Critical', val:scan.critical, color:'text-red-400' },
                    { label:'High', val:scan.high, color:'text-orange-400' },
                    { label:'Medium', val:scan.medium, color:'text-yellow-400' },
                    { label:'Low', val:scan.low, color:'text-green-400' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={cn('text-2xl font-bold font-mono', s.color)}>{s.val}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Scan duration: {scan.scanTime}s</span>
                  <span>Completed: {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            </div>

            {/* Score breakdown — explains how the number was derived */}
            <ScoreBreakdown scan={scan} />

            {/* Auto-remediation — download fixed files (web-only workflow) */}
            <RemediationPanel scanId={String(id)} />

            {/* Findings */}
            <FindingsTable findings={scan.findings ?? []} />
          </>
        )}
      </div>
    </AppShell>
  );
}
