"use client";

import Link from "next/link";
import { type Feature, type SubscriptionTier, hasFeature, TIER_LABELS, TIER_PRICES, normalizeTier, FEATURE_MIN_TIER, isSubscriptionActive } from "@/lib/subscription";

type Props = {
  feature: Feature;
  rawTier?: string | null;
  status?: string | null;
  children: React.ReactNode;
  /** Optional custom locked UI */
  fallback?: React.ReactNode;
};

const FEATURE_MIN_TIER_TYPE: Record<Feature, SubscriptionTier> = {
  pdf_download: "tier1",
  press_images_extended: "tier2",
  priority_review: "tier2",
  strategy_call: "tier2",
  ar_feedback: "tier2",
  analytics: "tier2",
  dedicated_ar: "tier3",
  label_showcases: "tier3",
  custom_campaign: "tier3",
  pdf_premium: "tier3",
  support_247: "tier3",
};

export default function TierGate({ feature, rawTier, status, children, fallback }: Props) {
  const access = hasFeature(rawTier, status, feature);
  if (access) return <>{children}</>;

  const requiredTier = FEATURE_MIN_TIER_TYPE[feature];
  const tierLabel = TIER_LABELS[requiredTier];
  const tierPrice = TIER_PRICES[requiredTier];

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <span className="text-sm font-semibold text-white">{tierLabel} feature</span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">{tierPrice}</span>
      </div>
      <p className="text-sm text-slate-400">
        Upgrade to {tierLabel} to unlock this feature.
      </p>
      <Link
        href="/pricing"
        className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
      >
        View upgrade options →
      </Link>
    </div>
  );
}
