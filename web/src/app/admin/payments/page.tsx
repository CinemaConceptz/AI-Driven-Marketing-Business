"use client";

import { useEffect, useState } from "react";
import { listRecentPayments } from "@/lib/admin/queries";
import DataTable from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import type { Payment } from "@/lib/admin/types";

function formatDate(timestamp: any): string {
  if (!timestamp) return "—";
  const date = timestamp?.toDate?.() ?? new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount?: number, currency?: string): string {
  if (!amount) return "—";
  const value = amount / 100; // Stripe uses cents
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecentPayments()
      .then(setRows)
      .catch((err) => {
        console.error("Error loading payments:", err);
        setError(err?.message || "Failed to load payments");
      })
      .finally(() => setLoading(false));
  }, []);

  const tableHeaders = ["ID", "User ID", "Amount", "Status", "Stripe Session", "Created"];
  const tableRows = rows.map((pay) => [
    <span key="id" className="font-mono text-xs text-neutral-400">{pay.id.slice(0, 8)}...</span>,
    <span key="uid" className="font-mono text-xs text-neutral-400">{pay.uid?.slice(0, 8)}...</span>,
    formatAmount(pay.amount, pay.currency),
    <StatusPill key="status" value={pay.status} />,
    pay.stripeCheckoutSessionId ? (
      <span key="stripe" className="font-mono text-xs text-neutral-400">
        {pay.stripeCheckoutSessionId.slice(0, 12)}...
      </span>
    ) : (
      "—"
    ),
    formatDate(pay.createdAt),
  ]);

  return (
    <div className="space-y-4" data-testid="admin-payments">
      <div className="text-xl font-semibold text-white">Payments</div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="payments-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400" data-testid="payments-loading">Loading payments...</div>
      ) : (
        <DataTable
          headers={tableHeaders}
          rows={tableRows}
          emptyMessage="No payments found."
        />
      )}
    </div>
  );
}
