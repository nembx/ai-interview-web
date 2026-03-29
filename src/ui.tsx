import type { ReactNode } from 'react';

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
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
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
    <div className={`metric-tile ${compact ? 'is-compact' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{footnote}</small>
    </div>
  );
}

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'warn' | 'success' | 'danger';
}) {
  return <span className={`status-chip tone-${tone}`}>{label}</span>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="feature-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

