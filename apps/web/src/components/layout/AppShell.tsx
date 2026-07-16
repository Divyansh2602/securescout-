'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Shield, LayoutDashboard, Scan, FileText,
  Users, Settings, LogOut, ChevronRight, BookOpen, Menu, X
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
  const [open, setOpen]         = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport so we can drive the drawer transform explicitly on mobile
  // (avoids Tailwind translate-variant conflicts between the mobile drawer and
  // the desktop static sidebar).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobile && open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  const drawerOpen = isMobile && open;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-sm font-semibold text-foreground">SecureScout</div>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu"
          className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop (mobile only, when drawer open) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar — static on desktop, off-canvas drawer on mobile.
          On mobile the transform is set inline so no class can override it. */}
      <aside
        style={isMobile ? { transform: open ? 'translateX(0)' : 'translateX(-100%)' } : undefined}
        className={cn(
        'flex-shrink-0 border-r border-border flex flex-col',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-64 max-md:bg-card max-md:transition-transform max-md:duration-200 max-md:ease-out max-md:-translate-x-full',
        'md:static md:w-56 md:bg-card/40'
      )}>
        {/* Logo + mobile close */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">SecureScout</div>
              <div className="text-[10px] text-muted-foreground font-mono">v3.0.0</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
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
        <div className="max-w-6xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
