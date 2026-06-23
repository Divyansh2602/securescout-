'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Users, Loader2, ShieldCheck } from 'lucide-react';

interface TeamMember {
  id: string; email: string; name: string; role: string;
  isActive: boolean; lastLoginAt?: string; createdAt: string;
}

const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN:   'bg-purple-950/40 text-purple-300 border-purple-800/40',
  ORG_ADMIN:     'bg-primary/15 text-primary border-primary/30',
  SECURITY_LEAD: 'bg-orange-950/40 text-orange-300 border-orange-800/40',
  DEVELOPER:     'bg-blue-950/40 text-blue-300 border-blue-800/40',
  VIEWER:        'bg-secondary text-muted-foreground border-border',
};

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const STATIC_MEMBERS: TeamMember[] = [
    { id: 'static-dolmaa', email: 'dolmaasharma2005@gmail.com', name: 'Dolmaa Sharma', role: 'ORG_ADMIN', isActive: true, createdAt: new Date().toISOString() },
  ];

  useEffect(() => {
    api.get('/users')
      .then(r => {
        const fetched: TeamMember[] = r.data.data;
        const merged = [
          ...fetched,
          ...STATIC_MEMBERS.filter(s => !fetched.some(f => f.email === s.email)),
        ];
        setMembers(merged);
      })
      .catch(e => setError(e.response?.data?.error ?? 'Failed to load team'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">Members of your organization and their roles</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">{error}</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left font-medium px-4 py-3">Member</th>
                  <th className="text-left font-medium px-4 py-3">Role</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Last login</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {m.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            {m.name}
                            {m.id === user?.id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border inline-flex items-center gap-1', ROLE_STYLE[m.role] ?? ROLE_STYLE.VIEWER)}>
                        {(m.role === 'ORG_ADMIN' || m.role === 'SUPER_ADMIN') && <ShieldCheck className="w-3 h-3" />}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs', m.isActive ? 'text-green-400' : 'text-muted-foreground')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', m.isActive ? 'bg-green-400' : 'bg-muted-foreground')} />
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
