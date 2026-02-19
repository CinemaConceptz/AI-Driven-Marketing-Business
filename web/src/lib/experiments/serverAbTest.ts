import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

export type ExperimentId = 
  | "pricing_headline"
  | "upgrade_prompt_style"
  | "paywall_messaging";

export type Variant = "control" | "variant_a" | "variant_b";

/**
 * Track experiment event server-side
 */
export async function trackExperimentEvent(
  experimentId: ExperimentId,
  variant: Variant,
  eventType: "view" | "conversion",
  userId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await adminDb.collection("experimentEvents").add({
      experimentId,
      variant,
      eventType,
      userId: userId || null,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[experiments] Failed to track event:", error);
  }
}

/**
 * Get experiment metrics for admin dashboard
 */
export async function getExperimentMetrics(
  experimentId: ExperimentId,
  days: number = 30
): Promise<{
  variants: {
    id: Variant;
    views: number;
    conversions: number;
    conversionRate: number;
  }[];
  totalViews: number;
  totalConversions: number;
  winningVariant: Variant | null;
  statisticalSignificance: boolean;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const eventsSnapshot = await adminDb
    .collection("experimentEvents")
    .where("experimentId", "==", experimentId)
    .where("timestamp", ">=", cutoffDate)
    .get();

  const variantData: Record<Variant, { views: number; conversions: number }> = {
    control: { views: 0, conversions: 0 },
    variant_a: { views: 0, conversions: 0 },
    variant_b: { views: 0, conversions: 0 },
  };

  eventsSnapshot.forEach((doc) => {
    const data = doc.data();
    const variant = data.variant as Variant;
    const eventType = data.eventType as "view" | "conversion";

    if (variantData[variant]) {
      if (eventType === "view") {
        variantData[variant].views++;
      } else if (eventType === "conversion") {
        variantData[variant].conversions++;
      }
    }
  });

  const variants = Object.entries(variantData).map(([id, data]) => ({
    id: id as Variant,
    views: data.views,
    conversions: data.conversions,
    conversionRate: data.views > 0 ? Math.round((data.conversions / data.views) * 100) : 0,
  }));

  const totalViews = variants.reduce((sum, v) => sum + v.views, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

  // Find winning variant (highest conversion rate with min 30 views)
  const eligibleVariants = variants.filter((v) => v.views >= 30);
  const winningVariant = eligibleVariants.length > 0
    ? eligibleVariants.reduce((best, v) => 
        v.conversionRate > best.conversionRate ? v : best
      ).id
    : null;

  // Simple significance check (need 100+ views per variant)
  const statisticalSignificance = variants.every((v) => v.views >= 100);

  return {
    variants,
    totalViews,
    totalConversions,
    winningVariant,
    statisticalSignificance,
  };
}

/**
 * Get all experiment metrics
 */
export async function getAllExperimentMetrics(days: number = 30): Promise<
  Record<ExperimentId, Awaited<ReturnType<typeof getExperimentMetrics>>>
> {
  const experimentIds: ExperimentId[] = [
    "pricing_headline",
    "upgrade_prompt_style", 
    "paywall_messaging",
  ];

  const results: Record<string, Awaited<ReturnType<typeof getExperimentMetrics>>> = {};

  for (const id of experimentIds) {
    results[id] = await getExperimentMetrics(id, days);
  }

  return results as Record<ExperimentId, Awaited<ReturnType<typeof getExperimentMetrics>>>;
}
