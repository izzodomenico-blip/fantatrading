import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function MetricCard({ label, value, sub, color = 'var(--accent)' }: MetricCardProps) {
  return (
    <div className="metric-card" style={{ borderTopColor: color }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function Section({ title, children, actions }: SectionProps) {
  return (
    <div className="section">
      <div className="section-heading">
        <div className="section-title">{title}</div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function StatusBadges({ items }: { items: string[] }) {
  return (
    <div className="status-badges">
      {items.map(item => (
        <span className="status-badge" key={item}>{item}</span>
      ))}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state empty-state-box">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function fmt(n: number, dec = 0) {
  return n.toFixed(dec);
}

export function pct(n: number, dec = 1) {
  return n.toFixed(dec) + '%';
}
