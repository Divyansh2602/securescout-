'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardStats } from '@/types';
import { MetricCard }     from '@/components/layout/MetricCard';
import { RiskGauge }      from '@/components/charts/RiskGauge';
import { SeverityChart }  from '@/components/charts/SeverityChart';
import { TrendChart }     from '@/components/charts/TrendChart';
import { RecentScans }    from '@/components/findings/RecentScans';
import { AppShell }       from '@/components/layout/AppShell';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.get('/scans/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    load();
    // Silently refresh so a freshly-completed scan shows up on the overview
    // without a manual reload (scans run async on the server).
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const avgRisk = stats?.recentScans?.length
    ? Math.round(stats.recentScans.reduce((a, s) => a + s.riskScore, 0) / stats.recentScans.length)
    : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            PSB Hackathon 2026 · UCO Bank x IIT Kharagpur · Problem Statement 3
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Scans"
            value={stats?.totalScans ?? 0}
            icon={<Shield className="w-4 h-4" />}
            loading={loading}
          />
          <MetricCard
            title="Average Risk"
            value={`${avgRisk}/100`}
            icon={<AlertTriangle className="w-4 h-4" />}
            loading={loading}
            variant={avgRisk >= 80 ? 'critical' : avgRisk >= 55 ? 'high' : 'default'}
          />
          <MetricCard
            title="Clean Scans"
            value={stats?.recentScans?.filter(s => s.passed).length ?? 0}
            icon={<CheckCircle className="w-4 h-4" />}
            loading={loading}
            variant="success"
          />
          <MetricCard
            title="Last Scan"
            value={stats?.recentScans?.[0]
              ? new Date(stats.recentScans[0].createdAt).toLocaleDateString()
              : '—'}
            icon={<Clock className="w-4 h-4" />}
            loading={loading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskGauge score={avgRisk} />
          <SeverityChart data={stats?.severityCounts ?? []} />
          <TrendChart    data={stats?.trend ?? []} />
        </div>

        {/* Recent Scans */}
        <RecentScans scans={stats?.recentScans ?? []} loading={loading} />
      </div>
    </AppShell>
  );
}
