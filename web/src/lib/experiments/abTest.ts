/**
 * A/B Testing Framework for Verified Sound
 * Handles variant assignment, tracking, and persistence
 */

import { trackEvent } from "@/lib/analytics/trackEvent";

// Experiment definitions
export type ExperimentId = 
  | "pricing_headline"
  | "upgrade_prompt_style"
  | "paywall_messaging";

export type Variant = "control" | "variant_a" | "variant_b";

export type Experiment = {
  id: ExperimentId;
  name: string;
  description: string;
  variants: {
    id: Variant;
    name: string;
    weight: number; // 0-100, total should equal 100
  }[];
  active: boolean;
};

// Active experiments configuration
export const EXPERIMENTS: Record<ExperimentId, Experiment> = {
  pricing_headline: {
    id: "pricing_headline",
    name: "Pricing Page Headline",
    description: "Test different headlines on the pricing page",
    variants: [
      { id: "control", name: "Choose Your Path to Label Success", weight: 34 },
      { id: "variant_a", name: "Get Discovered by Top Labels", weight: 33 },
      { id: "variant_b", name: "Your Music Deserves Label Attention", weight: 33 },
    ],
    active: true,
  },
  upgrade_prompt_style: {
    id: "upgrade_prompt_style",
    name: "Upgrade Prompt Style",
    description: "Test banner vs inline upgrade prompts",
    variants: [
      { id: "control", name: "Banner (top of page)", weight: 50 },
      { id: "variant_a", name: "Inline (contextual)", weight: 50 },
    ],
    active: true,
  },
  paywall_messaging: {
    id: "paywall_messaging",
    name: "Paywall Messaging",
    description: "Test urgency vs value-focused paywall copy",
    variants: [
      { id: "control", name: "Value-focused", weight: 50 },
      { id: "variant_a", name: "Urgency-focused", weight: 50 },
    ],
    active: true,
  },
};

// Cookie name for storing experiment assignments
const EXPERIMENT_COOKIE = "vs_experiments";

/**
 * Get all experiment assignments from cookie
 */
export function getExperimentAssignments(): Record<ExperimentId, Variant> {
  if (typeof document === "undefined") {
    return {} as Record<ExperimentId, Variant>;
  }

  try {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${EXPERIMENT_COOKIE}=`));
    
    if (cookie) {
      const value = cookie.split("=")[1];
      return JSON.parse(decodeURIComponent(value));
    }
  } catch {
    // Invalid cookie, return empty
  }

  return {} as Record<ExperimentId, Variant>;
}

/**
 * Save experiment assignments to cookie
 */
function saveExperimentAssignments(assignments: Record<ExperimentId, Variant>): void {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(assignments));
  // Set cookie for 30 days
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${EXPERIMENT_COOKIE}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Assign a variant based on weights
 */
function assignVariant(experiment: Experiment): Variant {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant.id;
    }
  }

  // Fallback to control
  return "control";
}

/**
 * Get the assigned variant for an experiment
 * Assigns a new variant if not already assigned
 */
export function getVariant(experimentId: ExperimentId, userId?: string | null): Variant {
  const experiment = EXPERIMENTS[experimentId];
  
  // Return control if experiment doesn't exist or is inactive
  if (!experiment || !experiment.active) {
    return "control";
  }

  // Check existing assignments
  const assignments = getExperimentAssignments();
  
  if (assignments[experimentId]) {
    return assignments[experimentId];
  }

  // Assign new variant
  const variant = assignVariant(experiment);
  assignments[experimentId] = variant;
  saveExperimentAssignments(assignments);

  // Track the assignment
  trackEvent("page_view", userId, {
    experiment: experimentId,
    variant,
    type: "experiment_assigned",
  });

  return variant;
}

/**
 * Track a conversion for an experiment
 */
export function trackExperimentConversion(
  experimentId: ExperimentId,
  conversionType: string,
  userId?: string | null,
  metadata?: Record<string, unknown>
): void {
  const variant = getExperimentAssignments()[experimentId];
  
  if (!variant) return;

  trackEvent("upgrade_click", userId, {
    experiment: experimentId,
    variant,
    conversionType,
    ...metadata,
  });
}

/**
 * Get experiment content based on variant
 */
export function getExperimentContent<T>(
  experimentId: ExperimentId,
  content: Record<Variant, T>,
  userId?: string | null
): T {
  const variant = getVariant(experimentId, userId);
  return content[variant] || content.control;
}

// Pricing headline variants content
export const PRICING_HEADLINES: Record<Variant, { title: string; subtitle: string }> = {
  control: {
    title: "Choose Your Path to Label Success",
    subtitle: "Select the plan that fits your career stage. All plans include access to our A&R network and professional EPK tools.",
  },
  variant_a: {
    title: "Get Discovered by Top Labels",
    subtitle: "Join hundreds of artists who've connected with A&R professionals. Choose your tier and start getting noticed.",
  },
  variant_b: {
    title: "Your Music Deserves Label Attention",
    subtitle: "Stop waiting to be discovered. Our tiered representation gets your music in front of the right people.",
  },
};

// Upgrade prompt styles
export const UPGRADE_PROMPT_STYLES: Record<Variant, "banner" | "inline"> = {
  control: "banner",
  variant_a: "inline",
  variant_b: "banner",
};

// Paywall messaging variants
export const PAYWALL_MESSAGES: Record<Variant, { title: string; cta: string; urgency?: string }> = {
  control: {
    title: "Unlock Premium Features",
    cta: "Upgrade Now",
  },
  variant_a: {
    title: "Limited Spots Available",
    cta: "Claim Your Spot",
    urgency: "Only 5 Tier II slots left this month",
  },
  variant_b: {
    title: "Unlock Premium Features",
    cta: "Upgrade Now",
  },
};
