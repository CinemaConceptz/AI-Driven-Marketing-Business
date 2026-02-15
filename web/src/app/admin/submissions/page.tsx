"use client";

import { useEffect, useState } from "react";
import { listRecentSubmissions, listPendingSubmissions } from "@/lib/admin/queries";
import DataTable from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import type { Submission } from "@/lib/admin/types";

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

export default function AdminSubmissionsPage() {
  const [mode, setMode] = useState<"pending" | "all">("pending");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetcher = mode === "pending" ? listPendingSubmissions : listRecentSubmissions;

    fetcher()
      .then(setRows)
      .catch((err) => {
        console.error("Error loading submissions:", err);
        setError(err?.message || "Failed to load submissions");
      })
      .finally(() => setLoading(false));
  }, [mode]);

  const tableHeaders = ["ID", "Artist", "Email", "Genre", "Status", "Submitted"];
  const tableRows = rows.map((sub) => [
    <span key="id" className="font-mono text-xs text-neutral-400">{sub.id.slice(0, 8)}...</span>,
    sub.name || sub.artistName || "—",
    sub.email || "—",
    sub.genre || "—",
    <StatusPill key="status" value={sub.status || "submitted"} />,
    formatDate(sub.submittedAt || sub.createdAt),
  ]);

  return (
    <div className="space-y-4" data-testid="admin-submissions">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-white">Submissions</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("pending")}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              mode === "pending"
                ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white"
                : "border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:border-neutral-600"
            }`}
            data-testid="filter-pending"
          >
            Pending
          </button>
          <button
            onClick={() => setMode("all")}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              mode === "all"
                ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white"
                : "border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:border-neutral-600"
            }`}
            data-testid="filter-all"
          >
            All
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="submissions-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400" data-testid="submissions-loading">Loading submissions...</div>
      ) : (
        <DataTable
          headers={tableHeaders}
          rows={tableRows}
          emptyMessage="No submissions found."
        />
      )}
    </div>
  );
}
