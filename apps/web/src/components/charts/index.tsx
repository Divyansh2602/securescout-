'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { riskMeta } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Risk Gauge ────────────────────────────────────────────────────────────────
export function RiskGauge({ score }: { score: number }) {
  const meta = riskMeta(score);
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Risk Score</div>
      <div className="flex items-center justify-center gap-6 py-2">
        <div className={cn('text-5xl font-bold font-mono', meta.color)}>{score}</div>
        <div>
          <div className={cn('text-xs font-bold font-mono tracking-wider', meta.color)}>{meta.label}</div>
          <div className="text-xs text-muted-foreground mt-1">out of 100</div>
          <div className={cn('mt-2 rounded px-2 py-0.5 text-xs border', meta.bg, meta.border, meta.color)}>
            {score >= 80 ? 'Immediate action required' :
             score >= 55 ? 'Remediation recommended' :
             score >= 30 ? 'Review findings' : 'No critical issues'}
          </div>
        </div>
      </div>
      <div className="mt-3 bg-secondary rounded-full h-1.5 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700',
          score >= 80 ? 'bg-red-500' : score >= 55 ? 'bg-orange-500' : score >= 30 ? 'bg-yellow-500' : 'bg-green-500'
        )} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Severity Chart ────────────────────────────────────────────────────────────
const SEV_COLORS: Record<string, string> = {
  CRITICAL:'#e24b4a', HIGH:'#ef9f27', MEDIUM:'#d4a017', LOW:'#22c55e', INFO:'#6b7280'
};

export function SeverityChart({ data }: { data: { severity: string; _count: number }[] }) {
  const chartData = data.map(d => ({ name: d.severity, value: d._count, color: SEV_COLORS[d.severity] ?? '#6b7280' }));
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">By Severity</div>
      <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2}>
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background:'#0f1120', border:'1px solid #1e2236', borderRadius:6, fontSize:12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {chartData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-mono font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────
export function TrendChart({ data }: { data: { createdAt: string; riskScore: number }[] }) {
  const chartData = data.map(d => ({
    date: new Date(d.createdAt).toLocaleDateString('en', { month:'short', day:'numeric' }),
    risk: d.riskScore,
  })).reverse();

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Risk Trend</div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top:4, right:4, left:-24, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2236" />
          <XAxis dataKey="date" tick={{ fill:'#4a5470', fontSize:10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill:'#4a5470', fontSize:10 }} axisLine={false} tickLine={false} domain={[0,100]} />
          <Tooltip contentStyle={{ background:'#0f1120', border:'1px solid #1e2236', borderRadius:6, fontSize:12 }} />
          <Line type="monotone" dataKey="risk" stroke="#818cf8" strokeWidth={2} dot={{ fill:'#818cf8', r:3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
