import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

/**
 * Server-side funnel event tracking
 * Use this in API routes and server components
 */
export async function trackServerEvent(
  event: string,
  userId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await adminDb.collection("funnelEvents").add({
      event,
      userId: userId || null,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: "server",
    });
  } catch (error) {
    console.error("[analytics:server] Failed to track event:", error);
  }
}

/**
 * Get funnel metrics for admin dashboard
 */
export async function getFunnelMetrics(days: number = 30): Promise<{
  events: Record<string, number>;
  conversionRates: Record<string, number>;
  dailySignups: { date: string; count: number }[];
  dailyUpgrades: { date: string; count: number }[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get all events in the time period
  const eventsSnapshot = await adminDb
    .collection("funnelEvents")
    .where("timestamp", ">=", cutoffDate)
    .get();

  const eventCounts: Record<string, number> = {};
  const dailySignups: Record<string, number> = {};
  const dailyUpgrades: Record<string, number> = {};

  eventsSnapshot.forEach((doc) => {
    const data = doc.data();
    const event = data.event as string;
    
    // Count events
    eventCounts[event] = (eventCounts[event] || 0) + 1;

    // Track daily signups
    if (event === "signup_completed" && data.timestamp) {
      const date = data.timestamp.toDate().toISOString().split("T")[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    }

    // Track daily upgrades
    if (event === "checkout_completed" && data.timestamp) {
      const date = data.timestamp.toDate().toISOString().split("T")[0];
      dailyUpgrades[date] = (dailyUpgrades[date] || 0) + 1;
    }
  });

  // Calculate conversion rates
  const conversionRates: Record<string, number> = {};
  
  const signups = eventCounts["signup_completed"] || 0;
  const onboardingComplete = eventCounts["onboarding_completed"] || 0;
  const firstImage = eventCounts["first_image_uploaded"] || 0;
  const pricingViewed = eventCounts["pricing_page_viewed"] || 0;
  const upgradeClicks = eventCounts["upgrade_click"] || 0;
  const checkoutStarted = eventCounts["checkout_started"] || 0;
  const checkoutCompleted = eventCounts["checkout_completed"] || 0;

  if (signups > 0) {
    conversionRates["signup_to_onboarding"] = Math.round((onboardingComplete / signups) * 100);
    conversionRates["signup_to_first_image"] = Math.round((firstImage / signups) * 100);
    conversionRates["signup_to_upgrade"] = Math.round((checkoutCompleted / signups) * 100);
  }

  if (pricingViewed > 0) {
    conversionRates["pricing_to_checkout"] = Math.round((checkoutStarted / pricingViewed) * 100);
  }

  if (checkoutStarted > 0) {
    conversionRates["checkout_completion"] = Math.round((checkoutCompleted / checkoutStarted) * 100);
  }

  if (upgradeClicks > 0) {
    conversionRates["upgrade_click_to_checkout"] = Math.round((checkoutStarted / upgradeClicks) * 100);
  }

  // Format daily data
  const formatDailyData = (data: Record<string, number>) => {
    return Object.entries(data)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  return {
    events: eventCounts,
    conversionRates,
    dailySignups: formatDailyData(dailySignups),
    dailyUpgrades: formatDailyData(dailyUpgrades),
  };
}

/**
 * Get user journey for a specific user
 */
export async function getUserJourney(userId: string): Promise<{
  event: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}[]> {
  const eventsSnapshot = await adminDb
    .collection("funnelEvents")
    .where("userId", "==", userId)
    .orderBy("timestamp", "asc")
    .get();

  return eventsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      event: data.event,
      timestamp: data.timestamp?.toDate() || new Date(),
      metadata: data.metadata || {},
    };
  });
}
