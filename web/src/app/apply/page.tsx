"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";

type ApplicationFormState = {
  name: string;
  email: string;
  genre: string;
  links: string;
  goals: string;
};

const initialFormState: ApplicationFormState = {
  name: "",
  email: "",
  genre: "",
  links: "",
  goals: "",
};

export default function ApplyPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [formState, setFormState] = useState<ApplicationFormState>(initialFormState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"loading" | "paid" | "unpaid">(
    "loading"
  );



  useEffect(() => {
    if (loading || !user) return;

    let active = true;
    const loadPayment = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.data();
        const paid = data?.paymentStatus === "paid";
        if (active) {
          setPaymentStatus(paid ? "paid" : "unpaid");
        }
      } catch {
        if (active) {
          setPaymentStatus("unpaid");
        }
      }
    };

    loadPayment();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const canSubmit = useMemo(
    () =>
      formState.name &&
      formState.email &&
      formState.genre &&
      formState.links &&
      formState.goals,
    [formState]
  );

  const handleChange = (key: keyof ApplicationFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/email/admin-new-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formState),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to submit application.");
      }

      setStatus("success");
      setFormState(initialFormState);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit application."
      );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl" data-testid="apply-loading">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10" data-testid="apply-login-required">
          <h1 className="text-2xl font-semibold text-white">Login required</h1>
          <p className="mt-3 text-sm text-slate-200">
            Sign in to continue your submission.
          </p>
          <button
            onClick={() => router.push("/login?next=/apply")}
            className="mt-6 rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#021024]"
            data-testid="apply-login-cta"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl" data-testid="apply-payment-loading">
        Checking payment status...
      </div>
    );
  }

  if (paymentStatus !== "paid") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10" data-testid="apply-payment-required">
          <h1 className="text-2xl font-semibold text-white">Payment required</h1>
          <p className="mt-3 text-sm text-slate-200">
            Complete your submission payment to unlock the intake form.
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="mt-6 rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#021024]"
            data-testid="apply-go-to-pricing"
          >
            Go to pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Apply</p>
        <h1
          className="mt-3 text-3xl font-semibold text-white"
          data-testid="apply-title"
        >
          Artist intake form
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="apply-subtitle">
          Tell us about your music, goals, and campaign readiness. We focus on
          House, EDM, Disco, Afro, Soulful, and Trance releases.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="glass-panel space-y-6 rounded-3xl px-8 py-10"
        data-testid="apply-form"
      >
        {status === "success" && (
          <div
            className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            data-testid="apply-success"
          >
            Intake submitted. Our team will follow up with next steps.
          </div>
        )}
        {status === "error" && (
          <div
            className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="apply-error"
          >
            {errorMessage}
          </div>
        )}

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Name
          <input
            type="text"
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-name-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Email
          <input
            type="email"
            value={formState.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-email-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Primary genre
          <input
            type="text"
            value={formState.genre}
            onChange={(event) => handleChange("genre", event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-genre-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Links (Spotify, SoundCloud, socials)
          <textarea
            value={formState.links}
            onChange={(event) => handleChange("links", event.target.value)}
            rows={3}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-links-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Goals
          <textarea
            value={formState.goals}
            onChange={(event) => handleChange("goals", event.target.value)}
            rows={4}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-goals-input"
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#021024] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit || status === "submitting"}
          data-testid="apply-submit-button"
        >
          {status === "submitting" ? "Submitting..." : "Submit intake"}
        </button>
      </form>
    </div>
  );
}
