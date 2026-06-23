'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { User, Building2, ShieldCheck, LogOut, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  const field = (label: string, value?: string) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value ?? '—'}</span>
    </div>
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Your account and organization details</p>
        </div>

        {/* Profile */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>
          {field('Name', user?.name)}
          {field('Email', user?.email)}
          {field('Role', user?.role)}
        </section>

        {/* Organization */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Organization</h2>
          </div>
          {field('Organization ID', user?.orgId)}
        </section>

        {/* Security posture (informational) */}
        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Security</h2>
          </div>
          <div className="space-y-2">
            {[
              ['JWT access tokens', 'Short-lived (15m) with refresh rotation'],
              ['Role-based access control', '5-tier RBAC enforced server-side'],
              ['Rate limiting', 'Redis-backed, shared across instances'],
              ['Password policy', '12+ chars · upper, lower, number & symbol'],
              ['Audit logging', 'Enabled for sensitive actions'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2.5">
                <KeyRound className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">{k}</div>
                  <div className="text-xs text-muted-foreground">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Account actions */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-3">Account</h2>
          <button onClick={logout}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'text-destructive border border-destructive/30 hover:bg-destructive/10')}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}
