'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Scan } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { cn, riskMeta, displayTarget } from '@/lib/utils';
import { FileText, Loader2, ChevronRight, Scan as ScanIcon } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'bg-green-950/40 text-green-400 border-green-800/40',
  RUNNING:   'bg-blue-950/40 text-blue-400 border-blue-800/40',
  QUEUED:    'bg-blue-950/40 text-blue-400 border-blue-800/40',
  FAILED:    'bg-red-950/40 text-red-400 border-red-800/40',
  CANCELLED: 'bg-secondary text-muted-foreground border-border',
};

export default function ReportsPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = (initial = false) => {
    if (initial) setLoading(true);
    api.get('/scans', { params: { page: 1, limit: 50 } })
      .then(r => setScans(r.data.data.scans))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(true);
    // Refresh so queued/running scans flip to completed without a manual reload.
    const t = setInterval(() => load(), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">All security scans for your organization</p>
          </div>
          <Link href="/scan"
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            <ScanIcon className="w-4 h-4" /> New Scan
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : scans.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">No scans yet</div>
            <div className="text-xs text-muted-foreground mt-1">Run your first scan to see reports here.</div>
            <Link href="/scan" className="inline-block mt-4 text-sm text-primary hover:underline">Start a scan →</Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left font-medium px-4 py-3">Scan</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Risk</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Findings (C/H/M)</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {scans.map(s => {
                  const meta = riskMeta(s.riskScore);
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/reports/${s.id}`} className="font-medium hover:text-primary transition-colors">{s.name}</Link>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[220px]">{displayTarget(s.target)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border', STATUS_STYLE[s.status] ?? STATUS_STYLE.CANCELLED)}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.status === 'COMPLETED'
                          ? <span className={cn('font-mono font-bold', meta.color)}>{s.riskScore}<span className="text-muted-foreground font-normal">/100</span></span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">
                        <span className="text-red-400">{s.critical}</span> / <span className="text-orange-400">{s.high}</span> / <span className="text-yellow-400">{s.medium}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/reports/${s.id}`} className="text-muted-foreground hover:text-primary inline-flex"><ChevronRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
