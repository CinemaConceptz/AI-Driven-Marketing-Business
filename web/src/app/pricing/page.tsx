"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { trackEvent, trackUpgradeClick, trackCheckoutStarted } from "@/lib/analytics/trackEvent";
import { getExperimentContent, trackExperimentConversion, PRICING_HEADLINES } from "@/lib/experiments/abTest";

type BillingPeriod = "monthly" | "annual";

type PricingTier = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
};

const tiers: PricingTier[] = [
  {
    id: "tier1",
    name: "Tier I",
    description: "For emerging artists ready to build their presence",
    monthlyPrice: 39,
    annualPrice: 390,
    features: [
      "Professional EPK hosting",
      "Up to 3 press images",
      "Basic A&R review",
      "Email support",
      "Standard submission queue",
    ],
    ctaText: "Get Started",
  },
  {
    id: "tier2",
    name: "Tier II",
    description: "For serious artists seeking label connections",
    monthlyPrice: 89,
    annualPrice: 890,
    features: [
      "Everything in Tier I",
      "Priority A&R review",
      "Monthly strategy call",
      "Direct A&R feedback",
      "Analytics dashboard",
      "Faster response time",
    ],
    highlighted: true,
    ctaText: "Go Tier II",
  },
  {
    id: "tier3",
    name: "Tier III",
    description: "White-glove service for label-ready artists",
    monthlyPrice: 139,
    annualPrice: 1390,
    features: [
      "Everything in Tier II",
      "Dedicated A&R contact",
      "Quarterly label showcases",
      "Custom campaign strategy",
      "Priority label matching",
      "24/7 priority support",
      "Unlimited revisions",
    ],
    ctaText: "Go Tier III",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Get A/B test variant for headline
  const headline = getExperimentContent("pricing_headline", PRICING_HEADLINES, user?.uid);

  // Track pricing page view
  useEffect(() => {
    trackEvent("pricing_page_viewed", user?.uid || null, { source: "direct" });
  }, [user?.uid]);

  const handleSelectTier = async (tierId: string) => {
    setError(null);
    
    // Track upgrade click
    trackUpgradeClick(user?.uid || null, "pricing_page", undefined, tierId);
    
    // Track A/B test conversion
    trackExperimentConversion("pricing_headline", "tier_selected", user?.uid, { tier: tierId });
    
    if (!user) {
      router.push(`/login?next=/pricing&tier=${tierId}`);
      return;
    }

    setLoading(tierId);
    
    // Track checkout started
    trackCheckoutStarted(user.uid, tierId, billingPeriod);
    
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: tierId,
          billingPeriod,
        }),
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
      setLoading(null);
    }
  };

  const getPrice = (tier: PricingTier) => {
    return billingPeriod === "monthly" ? tier.monthlyPrice : tier.annualPrice;
  };

  const getSavings = (tier: PricingTier) => {
    const monthlyCost = tier.monthlyPrice * 12;
    const annualCost = tier.annualPrice;
    const savings = monthlyCost - annualCost;
    return savings > 0 ? savings : 0;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      {/* Header */}
      <section className="text-center">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="pricing-kicker"
        >
          Pricing
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white" data-testid="pricing-title">
          {headline.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-200">
          {headline.subtitle}
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              billingPeriod === "monthly"
                ? "bg-white text-[#021024]"
                : "text-slate-300 hover:text-white"
            }`}
            data-testid="pricing-monthly-toggle"
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              billingPeriod === "annual"
                ? "bg-white text-[#021024]"
                : "text-slate-300 hover:text-white"
            }`}
            data-testid="pricing-yearly-toggle"
          >
            Annual
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              Save 17%
            </span>
          </button>
        </div>

        {!user && (
          <div
            className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="pricing-auth-alert"
          >
            Sign in to subscribe and start your journey.
          </div>
        )}

        {error && (
          <div
            className="mx-auto mt-4 max-w-md rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="pricing-error-alert"
          >
            {error}
          </div>
        )}
      </section>

      {/* Pricing Cards */}
      <section className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative flex flex-col rounded-3xl border px-6 py-8 transition-all ${
              tier.highlighted
                ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent scale-105 shadow-xl shadow-emerald-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
            data-testid={`pricing-tier-${tier.id}`}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{tier.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${getPrice(tier)}</span>
                <span className="text-slate-400">
                  /{billingPeriod === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              {billingPeriod === "annual" && getSavings(tier) > 0 && (
                <p className="mt-1 text-sm text-emerald-400">
                  Save ${getSavings(tier)}/year
                </p>
              )}
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                  <svg
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                      tier.highlighted ? "text-emerald-400" : "text-[#6ee7ff]"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectTier(tier.id)}
              disabled={loading === tier.id}
              className={`w-full rounded-full py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                tier.highlighted
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-white text-[#021024] hover:bg-slate-100"
              }`}
              data-testid={`pricing-cta-${tier.id}`}
            >
              {loading === tier.id ? "Starting checkout..." : tier.ctaText}
            </button>
          </div>
        ))}
      </section>

      {/* FAQ or additional info */}
      <section className="glass-panel rounded-3xl px-8 py-10 text-center">
        <h2 className="text-xl font-semibold text-white">Questions?</h2>
        <p className="mt-2 text-sm text-slate-200">
          Not sure which plan is right for you? Use our chat assistant or{" "}
          <a href="mailto:support@verifiedsoundar.com" className="text-emerald-400 hover:underline">
            contact our team
          </a>{" "}
          for personalized guidance.
        </p>
      </section>
    </div>
  );
}
