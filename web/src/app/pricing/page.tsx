"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const handleCheckout = async () => {
    setError(null);
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="glass-panel rounded-3xl px-8 py-12">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="pricing-kicker"
        >
          Submission fee
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white" data-testid="pricing-title">
          Paid submission for Verified Sound A&R
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-200">
          Complete your paid submission to unlock the full intake and EPK review
          process.
        </p>
        {!user && (
          <div
            className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="pricing-auth-alert"
          >
            Sign in to continue to checkout.
          </div>
        )}
        {error && (
          <div
            className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="pricing-error-alert"
          >
            {error}
          </div>
        )}
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submission</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Submission Fee</h2>
        <p className="mt-3 text-sm text-slate-200">
          One-time payment to start your A&R-led intake and campaign review.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-slate-200">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-[#6ee7ff]" />
            <span>Priority intake review</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-[#6ee7ff]" />
            <span>Campaign-readiness audit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-[#6ee7ff]" />
            <span>EPK positioning review</span>
          </li>
        </ul>
        <button
          onClick={handleCheckout}
          className="mt-8 rounded-full bg-white px-4 py-3 text-xs font-semibold text-[#021024] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          data-testid="pricing-checkout-button"
        >
          {loading ? "Starting checkout..." : "Proceed to checkout"}
        </button>
      </section>
    </div>
  );
}
