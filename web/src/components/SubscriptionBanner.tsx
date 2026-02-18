"use client";

import Link from "next/link";
import { isPaymentWarning, isLocked } from "@/lib/subscription";

type Props = {
  status?: string | null;
};

export default function SubscriptionBanner({ status }: Props) {
  if (isPaymentWarning(status)) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-300">Payment past due</p>
            <p className="text-xs text-red-400 mt-0.5">Update your billing info to keep your subscription active.</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="shrink-0 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400 transition-colors"
        >
          Update billing
        </Link>
      </div>
    );
  }

  if (isLocked(status)) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-lg">🔒</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">No active subscription</p>
            <p className="text-xs text-amber-400 mt-0.5">Subscribe to unlock all features and A&R representation.</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          View plans
        </Link>
      </div>
    );
  }

  return null;
}
