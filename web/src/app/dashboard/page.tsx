"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";

type SubscriptionData = {
  tier?: string;
  status?: string;
  currentPeriodEnd?: {
    seconds?: number;
    nanoseconds?: number;
  } | string | number | null;
  monthlyCap?: string | number | null;
};

function formatDate(value?: SubscriptionData["currentPeriodEnd"]) {
  if (!value) return "—";
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  }
  if (typeof value === "object" && "seconds" in value && value.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  return "—";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    const subscriptionRef = doc(db, "subscriptions", user.uid);
    const unsubscribe = onSnapshot(
      subscriptionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSubscription(snapshot.data() as SubscriptionData);
        } else {
          setSubscription(null);
        }
        setStatus("ready");
      },
      (error) => {
        setErrorMessage(error.message);
        setStatus("error");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const statusLabel = useMemo(() => {
    if (!subscription?.status) return "Inactive";
    return subscription.status;
  }, [subscription]);

  if (!user && loading) {
    return (
      <div className="mx-auto w-full max-w-4xl" data-testid="dashboard-loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="dashboard-kicker"
        >
          Subscription overview
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-white"
          data-testid="dashboard-title"
        >
          Representation dashboard
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="dashboard-subtitle">
          Track your current representation tier and next steps.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          {
            label: "Tier",
            value: subscription?.tier || "—",
            testId: "dashboard-tier-value",
          },
          {
            label: "Status",
            value: statusLabel,
            testId: "dashboard-status-value",
          },
          {
            label: "Current period end",
            value: formatDate(subscription?.currentPeriodEnd),
            testId: "dashboard-period-end-value",
          },
          {
            label: "Monthly cap",
            value: subscription?.monthlyCap || "—",
            testId: "dashboard-cap-value",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-panel rounded-2xl px-6 py-6"
            data-testid={item.testId}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <h2
          className="text-2xl font-semibold text-white"
          data-testid="dashboard-next-steps-title"
        >
          Next steps
        </h2>
        <ul
          className="mt-4 space-y-3 text-sm text-slate-200"
          data-testid="dashboard-next-steps-list"
        >
          <li>Share updated releases and campaign timelines.</li>
          <li>Confirm your positioning deck review call.</li>
          <li>Monitor outreach updates in weekly reporting.</li>
        </ul>
        {status === "error" && (
          <div
            className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="dashboard-error-alert"
          >
            {errorMessage}
          </div>
        )}
        {status === "ready" && !subscription && (
          <div
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="dashboard-empty-alert"
          >
            No active subscription found. Visit pricing to activate a tier.
          </div>
        )}
      </section>
    </div>
  );
}
