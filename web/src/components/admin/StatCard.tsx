"use client";

export default function StatCard({ 
  title, 
  value,
  subtitle
}: { 
  title: string; 
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>}
    </div>
  );
}
