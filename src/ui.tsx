import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <div className="rounded-lg px-3.5 py-3 bg-muted/50 border border-border">
      <span className="block text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      <strong className={cn('block mt-1 mb-0.5 font-bold tracking-tight text-foreground', compact ? 'text-lg' : 'text-2xl')}>
        {value}
      </strong>
      <small className="block text-muted-foreground text-[11px]">{footnote}</small>
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
    <div className="border border-border bg-muted/50 rounded-lg p-4">
      <strong className="block text-sm mb-1">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="border border-border bg-muted/50 rounded-lg p-4">
      <strong className="block text-sm mb-1">{title}</strong>
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </article>
  );
}
