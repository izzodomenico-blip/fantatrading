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
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

export function fmt(n: number, dec = 0) {
  return n.toFixed(dec);
}

export function pct(n: number, dec = 1) {
  return n.toFixed(dec) + '%';
}
