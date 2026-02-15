"use client";

import { useEffect, useState } from "react";
import { listRecentEmailLogs, listEmailFailures } from "@/lib/admin/queries";
import DataTable from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import type { EmailLog } from "@/lib/admin/types";

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

export default function AdminEmailsPage() {
  const [mode, setMode] = useState<"all" | "failed">("all");
  const [rows, setRows] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetcher = mode === "failed" ? listEmailFailures : listRecentEmailLogs;

    fetcher()
      .then(setRows)
      .catch((err) => {
        console.error("Error loading email logs:", err);
        setError(err?.message || "Failed to load email logs");
      })
      .finally(() => setLoading(false));
  }, [mode]);

  const tableHeaders = ["ID", "Type", "To", "Status", "Message ID", "Created"];
  const tableRows = rows.map((log) => [
    <span key="id" className="font-mono text-xs text-neutral-400">{log.id.slice(0, 8)}...</span>,
    <span key="type" className="font-mono text-xs">{log.type}</span>,
    log.to || "—",
    <StatusPill key="status" value={log.status} />,
    log.postmarkMessageId ? (
      <span key="msgid" className="font-mono text-xs text-neutral-400">
        {log.postmarkMessageId.slice(0, 12)}...
      </span>
    ) : (
      <span key="error" className="text-xs text-red-300">{log.error || "—"}</span>
    ),
    formatDate(log.createdAt),
  ]);

  return (
    <div className="space-y-4" data-testid="admin-emails">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-white">Email Logs</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("all")}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              mode === "all"
                ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white"
                : "border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:border-neutral-600"
            }`}
            data-testid="filter-all-emails"
          >
            All
          </button>
          <button
            onClick={() => setMode("failed")}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              mode === "failed"
                ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white"
                : "border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:border-neutral-600"
            }`}
            data-testid="filter-failed-emails"
          >
            Failed Only
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="emails-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400" data-testid="emails-loading">Loading email logs...</div>
      ) : (
        <DataTable
          headers={tableHeaders}
          rows={tableRows}
          emptyMessage="No email logs found."
        />
      )}
    </div>
  );
}
