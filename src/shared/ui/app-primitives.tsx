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
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-[13px]">{subtitle}</CardDescription>
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
    <div className="rounded-lg border border-border bg-muted/50 px-3.5 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <strong className={cn('mt-1 mb-0.5 block font-bold tracking-tight text-foreground', compact ? 'text-lg' : 'text-2xl')}>
        {value}
      </strong>
      <small className="block text-[11px] text-muted-foreground">{footnote}</small>
    </div>
  );
}

const toneClasses = {
  neutral: 'bg-muted text-muted-foreground border-transparent',
  warn: 'bg-warn-soft text-amber-700 border-transparent',
  success: 'bg-success-soft text-emerald-600 border-transparent',
  danger: 'bg-danger-soft text-red-600 border-transparent',
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
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <strong className="mb-1 block text-sm">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/50 p-4">
      <strong className="mb-1 block text-sm">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </article>
  );
}
