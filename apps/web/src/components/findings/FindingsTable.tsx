'use client';

import { useState } from 'react';
import { Finding } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

const SEV_CLASS: Record<string, string> = {
  CRITICAL:'sev-critical', HIGH:'sev-high', MEDIUM:'sev-medium', LOW:'sev-low', INFO:'sev-info'
};

const FILTERS = ['ALL','CRITICAL','HIGH','MEDIUM','CVE','SECRET','INJECTION','MISCONFIG'];

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen]     = useState<string | null>(null);

  const sevFilters = ['CRITICAL','HIGH','MEDIUM','LOW'];
  const filtered = findings.filter(f => {
    const mf = filter === 'ALL' ? true
      : sevFilters.includes(filter) ? f.severity === filter
      : filter === 'MISCONFIG' ? (f.type === 'MISCONFIG' || f.type === 'WEAK_CRYPTO')
      : f.type === filter;
    const ms = !search
      || f.title.toLowerCase().includes(search.toLowerCase())
      || f.file.toLowerCase().includes(search.toLowerCase())
      || (f.cveId?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return mf && ms;
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Findings ({filtered.length})
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setOpen(null); }}
            className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
              filter === f ? 'bg-primary/15 text-primary border-primary/40'
                           : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary')}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No findings match this filter.</div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map(f => (
            <div key={f.id}>
              <button onClick={() => setOpen(open === f.id ? null : f.id)}
                className="w-full flex items-center gap-2.5 py-2.5 px-1 hover:bg-secondary/40 rounded transition-colors text-left">
                {open === f.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                               : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <span className={cn('text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0', SEV_CLASS[f.severity])}>
                  {f.severity}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border flex-shrink-0">
                  {f.type === 'WEAK_CRYPTO' ? 'CRYPTO' : f.type}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{f.title}</span>
                {f.cveId && <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40 flex-shrink-0">{f.cveId}</span>}
                <span className="text-xs text-muted-foreground font-mono flex-shrink-0 hidden sm:block">{f.file}:{f.line}</span>
              </button>

              {open === f.id && (
                <div className="pb-3 pl-7 pr-1 space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-muted-foreground font-medium w-16 flex-shrink-0 pt-1">Evidence</span>
                    <code className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-pink-400 font-mono text-[11px] break-all">{f.evidence}</code>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-muted-foreground font-medium w-16 flex-shrink-0 pt-1">Fix</span>
                    <div className="flex-1 bg-green-950/20 border-l-2 border-green-600 rounded-r px-2 py-1.5 text-green-300 text-[11px] leading-relaxed">{f.fix}</div>
                  </div>
                  {f.cvssScore ? (
                    <div className="flex gap-2 text-xs">
                      <span className="text-muted-foreground font-medium w-16 flex-shrink-0">CVSS</span>
                      <span className="font-mono text-foreground">{f.cvssScore}</span>
                    </div>
                  ) : null}
                  {f.references?.[0] && (
                    <div className="flex gap-2 text-xs">
                      <span className="text-muted-foreground font-medium w-16 flex-shrink-0">Ref</span>
                      <a href={f.references[0]} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[11px] break-all">{f.references[0]}</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
