"use client";

import { useEffect, useState } from "react";
import { listRecentUsers } from "@/lib/admin/queries";
import DataTable from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import type { AdminUser } from "@/lib/admin/types";

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

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecentUsers()
      .then(setRows)
      .catch((err) => {
        console.error("Error loading users:", err);
        setError(err?.message || "Failed to load users");
      })
      .finally(() => setLoading(false));
  }, []);

  const tableHeaders = ["ID", "Name", "Email", "Payment", "Application", "Joined"];
  const tableRows = rows.map((user) => [
    <span key="id" className="font-mono text-xs text-neutral-400">{user.id.slice(0, 8)}...</span>,
    user.artistName || user.displayName || "—",
    user.email || "—",
    <StatusPill key="pay" value={user.paymentStatus || "unpaid"} />,
    <StatusPill key="app" value={user.applicationStatus || "none"} />,
    formatDate(user.createdAt),
  ]);

  return (
    <div className="space-y-4" data-testid="admin-users">
      <div className="text-xl font-semibold text-white">Users</div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="users-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400" data-testid="users-loading">Loading users...</div>
      ) : (
        <DataTable
          headers={tableHeaders}
          rows={tableRows}
          emptyMessage="No users found."
        />
      )}
    </div>
  );
}
