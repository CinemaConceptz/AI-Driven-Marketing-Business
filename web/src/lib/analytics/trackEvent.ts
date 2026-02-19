import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Funnel Event Types for conversion tracking
 */
export type FunnelEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "first_image_uploaded"
  | "image_uploaded"
  | "epk_viewed"
  | "epk_shared"
  | "pdf_download_started"
  | "pdf_download_completed"
  | "pricing_page_viewed"
  | "upgrade_click"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_abandoned"
  | "subscription_upgraded"
  | "subscription_downgraded"
  | "subscription_cancelled";

export type EventMetadata = {
  page?: string;
  tier?: string;
  step?: number;
  source?: string;
  referrer?: string;
  [key: string]: unknown;
};

/**
 * Track a funnel event (client-side)
 * Events are stored in Firestore for analysis
 */
export async function trackEvent(
  event: FunnelEvent,
  userId?: string | null,
  metadata?: EventMetadata
): Promise<void> {
  try {
    // Don't track in development unless explicitly enabled
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_TRACK_DEV) {
      console.log(`[analytics] DEV: ${event}`, { userId, metadata });
      return;
    }

    await addDoc(collection(db, "funnelEvents"), {
      event,
      userId: userId || null,
      metadata: metadata || {},
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });
  } catch (error) {
    // Silently fail - don't break user experience for analytics
    console.error("[analytics] Failed to track event:", error);
  }
}

/**
 * Track page view
 */
export function trackPageView(page: string, userId?: string | null): void {
  trackEvent("page_view", userId, { page });
}

/**
 * Track upgrade click with source
 */
export function trackUpgradeClick(
  userId: string | null,
  source: string,
  currentTier?: string,
  targetTier?: string
): void {
  trackEvent("upgrade_click", userId, {
    source,
    currentTier,
    targetTier,
  });
}

/**
 * Track checkout started
 */
export function trackCheckoutStarted(
  userId: string,
  tier: string,
  billingPeriod: "monthly" | "annual"
): void {
  trackEvent("checkout_started", userId, {
    tier,
    billingPeriod,
  });
}
