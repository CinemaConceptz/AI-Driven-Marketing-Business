import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

type LimitType = "press_images" | "pdf_download" | "generic";

const LIMIT_DETAILS: Record<LimitType, { feature: string; action: string; tierILimit: string }> = {
  press_images: {
    feature: "press image",
    action: "upload more press images",
    tierILimit: "3 images",
  },
  pdf_download: {
    feature: "PDF download",
    action: "download more EPK PDFs",
    tierILimit: "basic PDF",
  },
  generic: {
    feature: "feature",
    action: "access this feature",
    tierILimit: "limited access",
  },
};

function generateUpgradeEmailHtml(
  name: string,
  limitType: LimitType,
  currentValue: string,
  pricingUrl: string
): string {
  const displayName = name || "Artist";
  const details = LIMIT_DETAILS[limitType] || LIMIT_DETAILS.generic;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upgrade to Continue - Verified Sound A&R</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060b18; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0b1324; border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 16px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0; font-weight: 600;">${displayName},</h1>
              
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You've reached the <strong style="color: #6ee7ff;">${details.feature}</strong> limit on Tier I.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #fca5a5; font-size: 14px; margin: 0;">
                      <strong>Current limit:</strong> ${details.tierILimit}<br>
                      <strong>Your usage:</strong> ${currentValue}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                To ${details.action}, upgrade to Tier II:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #10b981; font-size: 18px; font-weight: 700; margin: 0 0 4px 0;">TIER II — $89/mo</p>
                    <hr style="border: none; border-top: 1px solid rgba(16, 185, 129, 0.3); margin: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> 10 press images (vs. 3)
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Watermark-free PDF EPK
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Priority A&R review queue
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Monthly strategy call
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Direct A&R feedback
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${pricingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Upgrade to Tier II
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748b; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
                Or continue with Tier I by removing existing items to make room.
              </p>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;">
              
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                —<br>
                <strong style="color: #ffffff;">Verified Sound A&R</strong><br>
                <span style="color: #64748b;">Executive Representation for Label-Ready Artists</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateUpgradeEmailText(
  name: string,
  limitType: LimitType,
  currentValue: string,
  pricingUrl: string
): string {
  const displayName = name || "Artist";
  const details = LIMIT_DETAILS[limitType] || LIMIT_DETAILS.generic;

  return `${displayName},

You've reached the ${details.feature} limit on Tier I.

Current limit: ${details.tierILimit}
Your usage: ${currentValue}

To ${details.action}, upgrade to Tier II:

TIER II — $89/mo
━━━━━━━━━━━━━━━━
✓ 10 press images (vs. 3)
✓ Watermark-free PDF EPK
✓ Priority A&R review queue
✓ Monthly strategy call
✓ Direct A&R feedback

→ Upgrade now: ${pricingUrl}

Or continue with Tier I by removing existing items to make room.

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 2 upgrade emails per day per user
    const limit = rateLimit(`email:upgrade-limit:${uid}`, { maxRequests: 2, windowMs: 86400000 });
    if (!limit.allowed) {
      return NextResponse.json({ ok: true, skipped: true, reason: "rate_limited" });
    }

    // Parse request body
    let limitType: LimitType = "generic";
    let currentValue = "limit reached";
    try {
      const body = await req.json();
      if (body.limitType && LIMIT_DETAILS[body.limitType as LimitType]) {
        limitType = body.limitType as LimitType;
      }
      if (body.currentValue) {
        currentValue = String(body.currentValue);
      }
    } catch {
      // Use defaults if no body
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const targetEmail = email || userData.email;

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
    }

    // Check if already sent this type of upgrade email recently (within 24 hours)
    const lastSent = userData.emailFlags?.upgradeLimitSentAt;
    if (lastSent) {
      const lastSentTime = lastSent.toDate ? lastSent.toDate() : new Date(lastSent);
      const hoursSinceLastSent = (Date.now() - lastSentTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSent < 24) {
        return NextResponse.json({ ok: true, skipped: true, reason: "recently_sent" });
      }
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const pricingUrl = `${baseUrl}/pricing`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "You've Hit Your Tier I Limit — Upgrade to Continue",
      html: generateUpgradeEmailHtml(artistName, limitType, currentValue, pricingUrl),
      text: generateUpgradeEmailText(artistName, limitType, currentValue, pricingUrl),
      uid,
      emailType: "upgrade-limit",
      meta: { limitType, currentValue },
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          upgradeLimitSentAt: admin.firestore.FieldValue.serverTimestamp(),
          upgradeLimitMessageId: result.messageId || null,
          upgradeLimitType: limitType,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    console.error(`[email/upgrade-limit] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
