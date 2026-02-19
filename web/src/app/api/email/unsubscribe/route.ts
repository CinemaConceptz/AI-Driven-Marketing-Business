import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

/**
 * GET /api/email/unsubscribe
 * Handle email unsubscribe requests
 * 
 * Query params:
 * - uid: User ID
 * - token: Verification token (base64 of uid + timestamp)
 * - type: Email type to unsubscribe from (optional, defaults to all marketing)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const emailType = searchParams.get("type") || "all";

  if (!uid || !token) {
    return new Response(unsubscribePageHtml("Invalid unsubscribe link", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Verify token (simple verification - token is base64(uid:timestamp))
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [tokenUid] = decoded.split(":");
    
    if (tokenUid !== uid) {
      return new Response(unsubscribePageHtml("Invalid unsubscribe link", false), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Update user preferences
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return new Response(unsubscribePageHtml("User not found", false), {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Set unsubscribe preferences
    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (emailType === "all") {
      updateData["emailPreferences.marketingUnsubscribed"] = true;
      updateData["emailPreferences.unsubscribedAt"] = admin.firestore.FieldValue.serverTimestamp();
    } else {
      updateData[`emailPreferences.unsubscribed_${emailType}`] = true;
    }

    await userRef.update(updateData);

    // Log the unsubscribe
    await adminDb.collection("emailUnsubscribes").add({
      uid,
      emailType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.headers.get("user-agent") || null,
    });

    return new Response(unsubscribePageHtml("Successfully unsubscribed", true), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("[email/unsubscribe] Error:", error);
    return new Response(unsubscribePageHtml("An error occurred. Please try again.", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

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

function unsubscribePageHtml(message: string, success: boolean): string {
  const iconColor = success ? "#10b981" : "#ef4444";
  const icon = success
    ? `<svg width="48" height="48" fill="none" stroke="${iconColor}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
    : `<svg width="48" height="48" fill="none" stroke="${iconColor}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? "Unsubscribed" : "Error"} - Verified Sound</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #060b18 0%, #0b1324 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 48px;
      text-align: center;
      max-width: 400px;
    }
    .icon { margin-bottom: 24px; }
    h1 {
      color: #ffffff;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      background: #10b981;
      color: white;
      text-decoration: none;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
    }
    .btn:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${message}</h1>
    <p>${success 
      ? "You have been unsubscribed from our marketing emails. You will still receive important account notifications."
      : "We couldn't process your unsubscribe request. Please try again or contact support."
    }</p>
    <a href="https://verifiedsoundar.com" class="btn">Return to Verified Sound</a>
  </div>
</body>
</html>`;
}
