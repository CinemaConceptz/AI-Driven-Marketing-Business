"use client";

import { useEffect, useState } from "react";
import { getAdminOverviewCounts } from "@/lib/admin/queries";
import StatCard from "@/components/admin/StatCard";

type OverviewCounts = {
  submissionsTotal: number;
  submissionsPending: number;
  paymentsPaid: number;
  emailFailed: number;
  usersTotal: number;
};

export default function AdminOverviewPage() {
  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminOverviewCounts()
      .then(setCounts)
      .catch((err) => {
        console.error("Error loading admin counts:", err);
        setError(err?.message || "Failed to load overview data");
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="admin-overview-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-overview">
      <div className="text-xl font-semibold text-white">Overview</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Submissions" value={counts?.submissionsTotal ?? "—"} />
        <StatCard title="Pending Review" value={counts?.submissionsPending ?? "—"} />
        <StatCard title="Paid Payments" value={counts?.paymentsPaid ?? "—"} />
        <StatCard title="Email Failures" value={counts?.emailFailed ?? "—"} />
        <StatCard title="Total Users" value={counts?.usersTotal ?? "—"} />
      </div>

      <div className="text-sm text-neutral-400">
        Use the tabs above to manage submissions, verify payments, and monitor email delivery.
      </div>
    </div>
  );
}
