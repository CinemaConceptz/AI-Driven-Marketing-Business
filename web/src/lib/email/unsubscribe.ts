import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * Generate unsubscribe token for a user
 */
export function generateUnsubscribeToken(uid: string): string {
  const timestamp = Date.now();
  return Buffer.from(`${uid}:${timestamp}`).toString("base64");
}

/**
 * Generate unsubscribe URL for a user
 */
export function getUnsubscribeUrl(uid: string, emailType?: string): string {
  const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
  const token = generateUnsubscribeToken(uid);
  const typeParam = emailType ? `&type=${emailType}` : "";
  return `${baseUrl}/api/email/unsubscribe?uid=${uid}&token=${token}${typeParam}`;
}

/**
 * Check if user is unsubscribed from a specific email type
 */
export async function isUserUnsubscribed(uid: string, emailType?: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return false;

    const data = userDoc.data();
    const prefs = data?.emailPreferences || {};

    // Check if globally unsubscribed from marketing
    if (prefs.marketingUnsubscribed) return true;

    // Check specific email type
    if (emailType && prefs[`unsubscribed_${emailType}`]) return true;

    return false;
  } catch {
    return false;
  }
}
