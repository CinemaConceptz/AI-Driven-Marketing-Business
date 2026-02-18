/**
 * Subscription utility — single source of truth for tier access.
 * Tier values in Firestore: "tier1" | "tier2" | "tier3"
 * Status values: "active" | "trialing" | "past_due" | "canceled" | "inactive"
 */

export type SubscriptionTier = "tier1" | "tier2" | "tier3";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "inactive";

// Features gated by tier
export type Feature =
  | "pdf_download"         // All tiers — quality varies
  | "press_images_extended" // Tier II+: up to 10 images
  | "priority_review"       // Tier II+
  | "strategy_call"         // Tier II+
  | "ar_feedback"           // Tier II+
  | "analytics"             // Tier II+
  | "dedicated_ar"          // Tier III only
  | "label_showcases"       // Tier III only
  | "custom_campaign"       // Tier III only
  | "pdf_premium"           // Tier III only (branded PDF)
  | "support_247";          // Tier III only

const TIER_LEVEL: Record<SubscriptionTier, number> = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
};

const FEATURE_MIN_TIER: Record<Feature, number> = {
  pdf_download: 1,
  press_images_extended: 2,
  priority_review: 2,
  strategy_call: 2,
  ar_feedback: 2,
  analytics: 2,
  dedicated_ar: 3,
  label_showcases: 3,
  custom_campaign: 3,
  pdf_premium: 3,
  support_247: 3,
};

/** Normalize any raw tier string from Firestore to a canonical SubscriptionTier */
export function normalizeTier(raw?: string | null): SubscriptionTier {
  if (!raw) return "tier1";
  const lower = raw.toLowerCase().trim();
  if (lower === "tier2" || lower === "tier ii" || lower === "2") return "tier2";
  if (lower === "tier3" || lower === "tier iii" || lower === "3") return "tier3";
  return "tier1";
}

/** Returns true if the subscription status grants access (not canceled/inactive) */
export function isSubscriptionActive(status?: string | null): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" // Grace period — still show features but show warning
  );
}

/** Returns true if status is in a warning state (payment issues but not fully locked) */
export function isPaymentWarning(status?: string | null): boolean {
  return status === "past_due";
}

/** Returns true if user has been fully locked out */
export function isLocked(status?: string | null): boolean {
  return (
    status === "canceled" ||
    status === "inactive" ||
    status === "incomplete" ||
    !status
  );
}

/** Returns the effective tier — tier1 if not active */
export function getEffectiveTier(
  rawTier?: string | null,
  status?: string | null
): SubscriptionTier {
  if (!isSubscriptionActive(status)) return "tier1";
  return normalizeTier(rawTier);
}

/** Check if the user's effective tier grants access to a feature */
export function hasFeature(
  rawTier?: string | null,
  status?: string | null,
  feature?: Feature
): boolean {
  if (!feature) return true;
  const effectiveTier = getEffectiveTier(rawTier, status);
  const userLevel = TIER_LEVEL[effectiveTier];
  const requiredLevel = FEATURE_MIN_TIER[feature];
  return userLevel >= requiredLevel;
}

/** Max press images allowed per tier */
export function getMaxPressImages(
  rawTier?: string | null,
  status?: string | null
): number {
  const tier = getEffectiveTier(rawTier, status);
  if (tier === "tier2" || tier === "tier3") return 10;
  return 3;
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  tier1: "Tier I",
  tier2: "Tier II",
  tier3: "Tier III",
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  tier1: "$39/mo",
  tier2: "$89/mo",
  tier3: "$139/mo",
};
