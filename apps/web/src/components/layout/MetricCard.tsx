'use client';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Props {
  title:    string;
  value:    string | number;
  icon:     ReactNode;
  loading?: boolean;
  variant?: 'default' | 'critical' | 'high' | 'success';
}

const variants = {
  default:  'border-border',
  critical: 'border-red-800/40 bg-red-950/10',
  high:     'border-orange-800/40 bg-orange-950/10',
  success:  'border-green-800/40 bg-green-950/10',
};

const textVariants = {
  default:  'text-foreground',
  critical: 'text-red-400',
  high:     'text-orange-400',
  success:  'text-green-400',
};

export function MetricCard({ title, value, icon, loading, variant = 'default' }: Props) {
  return (
    <div className={cn('bg-card rounded-xl border p-4', variants[variant])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-secondary/50 rounded animate-pulse" />
      ) : (
        <div className={cn('text-2xl font-bold font-mono', textVariants[variant])}>{value}</div>
      )}
    </div>
  );
}
