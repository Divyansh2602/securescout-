'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Shield, LayoutDashboard, Scan, FileText,
  Users, Settings, LogOut, ChevronRight, BookOpen
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const NAV = [
  { href: '/dashboard', label: 'Overview',     icon: LayoutDashboard },
  { href: '/scan',      label: 'New Scan',     icon: Scan },
  { href: '/reports',   label: 'Reports',      icon: FileText },
  { href: '/guide',     label: 'How it works', icon: BookOpen },
  { href: '/settings',  label: 'Settings',     icon: Settings },
];

const ADMIN_NAV = [
  { href: '/users', label: 'Team', icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card/40">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">SecureScout</div>
              <div className="text-[10px] text-muted-foreground font-mono">v3.0.0</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {[...NAV, ...(isAdmin ? ADMIN_NAV : [])].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {pathname.startsWith(href) && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
