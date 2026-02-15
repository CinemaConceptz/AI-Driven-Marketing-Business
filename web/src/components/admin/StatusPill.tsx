"use client";

export default function StatusPill({ value }: { value: string }) {
  const v = value?.toLowerCase?.() ?? "";
  const style =
    v === "paid" || v === "approved" || v === "sent"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : v === "failed" || v === "rejected"
      ? "border-red-400/40 bg-red-500/10 text-red-200"
      : v === "reviewing" || v === "submitted"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
      : "border-neutral-700 bg-neutral-900/60 text-neutral-200";

  return (
    <span 
      className={`inline-flex rounded-full border px-2 py-1 text-xs ${style}`}
      data-testid="status-pill"
    >
      {value}
    </span>
  );
}
