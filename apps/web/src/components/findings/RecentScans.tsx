'use client';
import Link from 'next/link';
import { Scan } from '@/types';
import { cn, riskMeta, displayTarget } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const STATUS_ICON = {
  COMPLETED: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
  FAILED:    <XCircle className="w-3.5 h-3.5 text-red-400" />,
  RUNNING:   <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />,
  QUEUED:    <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function RecentScans({ scans, loading }: { scans: Scan[]; loading: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Recent Scans</div>
        <Link href="/reports" className="text-xs text-primary hover:underline">View all →</Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No scans yet. <Link href="/scan" className="text-primary hover:underline">Run your first scan →</Link>
        </div>
      ) : (
        <div className="space-y-1">
          {scans.map(scan => {
            const meta = riskMeta(scan.riskScore);
            return (
              <Link key={scan.id} href={`/reports/${scan.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group">
                <div className="flex-shrink-0">{STATUS_ICON[scan.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{scan.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{displayTarget(scan.target)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {scan.status === 'COMPLETED' && (
                    <span className={cn('text-xs font-mono font-bold', meta.color)}>{scan.riskScore}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
