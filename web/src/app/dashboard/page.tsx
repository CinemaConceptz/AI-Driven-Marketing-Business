"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import PressImageManager from "@/components/PressImageManager";
import EpkSettingsPanel from "@/components/EpkSettingsPanel";
import DownloadEpkButton from "@/components/DownloadEpkButton";

type UserProfile = {
  tier?: string;
  status?: string;
  currentPeriodEnd?: {
    seconds?: number;
    nanoseconds?: number;
  } | string | number | null;
  monthlyCap?: string | number | null;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: {
    seconds?: number;
  } | string | number | null;
  subscriptionMonthlyCap?: string | number | null;
  applicationStatus?: string;
  applicationReviewNotes?: string | null;
  emailFlags?: {
    welcomeSentAt?: any;
  };
};

function formatDate(
  value?: UserProfile["currentPeriodEnd"] | UserProfile["subscriptionCurrentPeriodEnd"]
) {
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

const applicationStatusCopy: Record<
  string,
  { title: string; description: string }
> = {
  new: {
    title: "Submission received",
    description: "Your intake is in review. We will follow up with next steps.",
  },
  reviewed: {
    title: "Under review",
    description: "Our A&R team is reviewing your materials and positioning.",
  },
  accepted: {
    title: "Accepted",
    description: "You have been accepted. We will schedule your kickoff call.",
  },
  declined: {
    title: "Not selected",
    description: "We are unable to proceed at this time. Thank you for sharing.",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) {
      setProfile(null);
      return;
    }

    let alive = true;
    const loadProfile = async () => {
      try {
        setStatus("loading");
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (!alive) return;
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setStatus("ready");
      } catch (error: any) {
        if (!alive) return;
        setErrorMessage(error?.message ?? String(error));
        setStatus("error");
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, [loading, user]);

  // Send welcome email on first dashboard visit
  useEffect(() => {
    if (!user || !profile) return;
    if (typeof window === "undefined") return;

    const localKey = `welcome-email:${user.uid}`;
    if (localStorage.getItem(localKey)) return;

    if (!profile.emailFlags?.welcomeSentAt) {
      (async () => {
        try {
          const token = await user.getIdToken();
          await fetch("/api/email/welcome", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.error("Welcome email trigger failed", err);
        } finally {
          localStorage.setItem(localKey, "1");
        }
      })();
    }
  }, [profile, user]);

  const statusLabel = useMemo(() => {
    const rawStatus = profile?.subscriptionStatus ?? profile?.status;
    if (!rawStatus) return "Inactive";
    return rawStatus;
  }, [profile]);

  const tierLabel = profile?.subscriptionTier ?? profile?.tier ?? "—";
  const monthlyCapLabel = profile?.subscriptionMonthlyCap ?? profile?.monthlyCap ?? "—";
  const periodEndLabel = formatDate(
    profile?.subscriptionCurrentPeriodEnd ?? profile?.currentPeriodEnd
  );

  const applicationStatus = profile?.applicationStatus || "none";
  const applicationCopy = applicationStatusCopy[applicationStatus] || {
    title: "No submission yet",
    description: "Submit your intake to start the review process.",
  };

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
            value: tierLabel,
            testId: "dashboard-tier-value",
          },
          {
            label: "Status",
            value: statusLabel,
            testId: "dashboard-status-value",
          },
          {
            label: "Current period end",
            value: periodEndLabel,
            testId: "dashboard-period-end-value",
          },
          {
            label: "Monthly cap",
            value: monthlyCapLabel,
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
          data-testid="dashboard-application-status-title"
        >
          Application status
        </h2>
        <div className="mt-4" data-testid="dashboard-application-status">
          <p className="text-lg font-semibold text-white">
            {applicationCopy.title}
          </p>
          <p className="mt-2 text-sm text-slate-200" data-testid="dashboard-application-message">
            {applicationCopy.description}
          </p>
          {profile?.applicationReviewNotes && (
            <p
              className="mt-3 text-sm text-slate-200"
              data-testid="dashboard-application-review-notes"
            >
              Notes: {profile.applicationReviewNotes}
            </p>
          )}
        </div>
      </section>

      <section
        className="glass-panel rounded-3xl px-8 py-10"
        data-testid="dashboard-press-images-section"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-white">Press images</h2>
          <p className="text-sm text-slate-200">
            Upload up to 3 press images (JPG/PNG/WEBP, max 1000×1000, max 10MB each).
          </p>
        </div>
        <div className="mt-6">
          <PressImageManager user={user} />
        </div>
      </section>

      {/* EPK Settings */}
      {user && (
        <section data-testid="dashboard-epk-settings-section">
          <EpkSettingsPanel user={user} />
        </section>
      )}

      {/* PDF Download */}
      {user && (
        <section className="glass-panel rounded-2xl px-6 py-6" data-testid="dashboard-pdf-section">
          <DownloadEpkButton user={user} tier={profile?.subscriptionTier || profile?.tier || "tier1"} />
        </section>
      )}

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
        {status === "ready" && !profile && (
          <div
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="dashboard-empty-alert"
          >
            No profile found yet. Submit your intake to get started.
          </div>
        )}
      </section>
    </div>
  );
}
