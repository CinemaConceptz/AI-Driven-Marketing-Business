"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

type BillingCycle = "monthly" | "annual";

type Tier = {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: string;
  annualPrice: string;
  priceIds: {
    monthly: string;
    annual: string;
  };
  features: string[];
};

const tiers: Tier[] = [
  {
    id: "tier-1",
    name: "Tier 1",
    tagline: "Label-ready positioning for emerging acts.",
    monthlyPrice: "$39/mo",
    annualPrice: "$39/mo billed annually",
    priceIds: {
      monthly: "price_1SzkYq3zToN8UgmiKlRDmqFj",
      annual: "price_1SzkYq3zToN8UgmiD4qzWq2Z",
    },
    features: [
      "Representation intake & A&R audit",
      "Campaign-ready positioning deck",
      "Monthly outreach cycle",
      "Quarterly progress review",
    ],
  },
  {
    id: "tier-2",
    name: "Tier 2",
    tagline: "Executive-facing campaign execution.",
    monthlyPrice: "$89/mo",
    annualPrice: "$89/mo billed annually",
    priceIds: {
      monthly: "price_1SzkaS3zToN8UgmiqY0FaEjZ",
      annual: "price_1SzkaS3zToN8Ugmi2TENTSxN",
    },
    features: [
      "Dedicated A&R strategist",
      "Bi-weekly outreach sprints",
      "Placement tracking dashboard",
      "Priority label submissions",
    ],
  },
  {
    id: "tier-3",
    name: "Tier 3",
    tagline: "Full representation with campaign leadership.",
    monthlyPrice: "$189/mo",
    annualPrice: "$189/mo billed annually",
    priceIds: {
      monthly: "price_1Szkc03zToN8UgmiSKbf7MNS",
      annual: "price_1Szkc03zToN8UgmiPP2tQFx7",
    },
    features: [
      "Executive campaign director",
      "Weekly outreach & follow-up",
      "Custom placement roadmap",
      "Priority creative review",
    ],
  },
];

const checkoutEndpoint =
  "https://createcheckoutsession-36s4g56bza-uc.a.run.app";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const pricingLabel = useMemo(
    () =>
      billingCycle === "monthly"
        ? "Monthly billing"
        : "Annual billing",
    [billingCycle]
  );

  const handleCheckout = async (tier: Tier) => {
    setError(null);
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }

    setActiveTier(tier.id);

    try {
      const token = await user.getIdToken();
      const successUrl = `${window.location.origin}/billing/success`;
      const cancelUrl = `${window.location.origin}/billing/cancel`;
      const payload = {
        priceId: tier.priceIds[billingCycle],
        successUrl,
        cancelUrl,
        uid: user.uid,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Checkout failed. Please try again.");
      }

      const data = await response.json();
      const checkoutUrl = data.url || data.checkoutUrl || data.sessionUrl;
      if (!checkoutUrl) {
        throw new Error("Checkout URL missing from response.");
      }

      window.location.href = checkoutUrl;
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setActiveTier(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
      <section className="glass-panel rounded-3xl px-8 py-12">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="pricing-kicker"
        >
          Representation pricing
        </p>
        <h1
          className="mt-3 text-4xl font-semibold text-white"
          data-testid="pricing-title"
        >
          Tiered representation for campaign-driven outcomes
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-200">
          Choose the representation intensity that matches your release
          schedule. Every tier includes an A&R-led intake and placement-focused
          outreach.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              billingCycle === "monthly"
                ? "bg-white text-[#021024]"
                : "border border-white/20 text-white"
            }`}
            data-testid="pricing-toggle-monthly"
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              billingCycle === "annual"
                ? "bg-white text-[#021024]"
                : "border border-white/20 text-white"
            }`}
            data-testid="pricing-toggle-annual"
          >
            Annual
          </button>
          <span
            className="text-xs uppercase tracking-[0.2em] text-slate-400"
            data-testid="pricing-billing-label"
          >
            {pricingLabel}
          </span>
        </div>
        {!user && (
          <div
            className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="pricing-auth-alert"
          >
            Sign in before starting a subscription. You can review tiers without
            logging in.
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

      <section className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="glass-panel flex h-full flex-col justify-between rounded-3xl px-6 py-8"
            data-testid={`pricing-card-${tier.id}`}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {tier.name}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {tier.tagline}
              </h2>
              <p
                className="mt-4 text-3xl font-semibold text-white"
                data-testid={`pricing-price-${tier.id}`}
              >
                {billingCycle === "monthly" ? tier.monthlyPrice : tier.annualPrice}
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#6ee7ff]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleCheckout(tier)}
              className="mt-8 rounded-full bg-[#6ee7ff] px-5 py-3 text-sm font-semibold text-[#021024] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              data-testid={`pricing-cta-${tier.id}`}
              disabled={activeTier === tier.id}
            >
              {activeTier === tier.id ? "Redirecting..." : "Start subscription"}
            </button>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <h3 className="text-xl font-semibold text-white" data-testid="pricing-note-title">
          Payment flow
        </h3>
        <p className="mt-3 text-sm text-slate-200" data-testid="pricing-note-copy">
          Checkout uses a secure session and supports Firebase ID token
          authorization. The temporary UID payload will be removed once token
          verification is enforced.
        </p>
      </section>
    </div>
  );
}
