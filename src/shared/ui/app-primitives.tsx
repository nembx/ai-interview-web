import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Panel({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4 max-sm:flex-col">
        <div className="space-y-0.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MetricTile({
  label,
  value,
  footnote,
  compact = false,
}: {
  label: string;
  value: string;
  footnote: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-muted/30 px-4 py-3',
      compact && 'px-3 py-2.5',
    )}>
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <strong className={cn('mt-1 block font-semibold tracking-tight text-foreground', compact ? 'text-xl' : 'text-2xl')}>
        {value}
      </strong>
      <small className="block text-[11px] text-muted-foreground">{footnote}</small>
    </div>
  );
}

const toneClasses = {
  neutral: 'bg-muted text-muted-foreground border-border',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-red-50 text-red-600 border-red-200',
} as const;

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'warn' | 'success' | 'danger';
}) {
  return (
    <Badge variant="outline" className={cn('rounded-full text-xs font-semibold', toneClasses[tone])}>
      {label}
    </Badge>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5">
      <strong className="mb-1.5 block text-sm">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <strong className="mb-1 block text-sm">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </article>
  );
}
