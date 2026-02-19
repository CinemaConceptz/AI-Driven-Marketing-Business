import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateDay7UpgradeEmailHtml(name: string, pricingUrl: string): string {
  const displayName = name || "Artist";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tier II Artists Get 3x More A&R Engagement</title>
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
                After your first week on Verified Sound, here's what Tier II members experience:
              </p>
              
              <!-- Stats Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(110, 231, 255, 0.05); border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #6ee7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">BY THE NUMBERS</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #10b981; font-size: 24px; font-weight: 700;">3x</span>
                          <span style="color: #94a3b8; font-size: 14px; margin-left: 8px;">faster A&R review turnaround</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #10b981; font-size: 24px; font-weight: 700;">2x</span>
                          <span style="color: #94a3b8; font-size: 14px; margin-left: 8px;">more label submission opportunities</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #10b981; font-size: 24px; font-weight: 700;">47%</span>
                          <span style="color: #94a3b8; font-size: 14px; margin-left: 8px;">higher response rate from A&R teams</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- What You're Missing Section -->
              <p style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                WHAT YOU'RE CURRENTLY MISSING ON TIER I:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="color: #ef4444; font-size: 14px; padding: 6px 0;">
                    ✗ <span style="color: #94a3b8;">Priority placement in A&R review queue</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #ef4444; font-size: 14px; padding: 6px 0;">
                    ✗ <span style="color: #94a3b8;">Monthly strategy calls with industry professionals</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #ef4444; font-size: 14px; padding: 6px 0;">
                    ✗ <span style="color: #94a3b8;">Direct feedback on your releases</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #ef4444; font-size: 14px; padding: 6px 0;">
                    ✗ <span style="color: #94a3b8;">Watermark-free EPK PDFs</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #ef4444; font-size: 14px; padding: 6px 0;">
                    ✗ <span style="color: #94a3b8;">Extended press image uploads (10 vs. 3)</span>
                  </td>
                </tr>
              </table>
              
              <!-- Upgrade CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">
                      Upgrade now and lock in your monthly rate:
                    </p>
                    <a href="${pricingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Upgrade to Tier II — $89/mo
                    </a>
                  </td>
                </tr>
              </table>
              
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

function generateDay7UpgradeEmailText(name: string, pricingUrl: string): string {
  const displayName = name || "Artist";

  return `${displayName},

After your first week on Verified Sound, here's what Tier II members experience:

BY THE NUMBERS
━━━━━━━━━━━━━━━━
• 3x faster A&R review turnaround
• 2x more label submission opportunities
• 47% higher response rate from A&R teams

WHAT YOU'RE CURRENTLY MISSING ON TIER I:

✗ Priority placement in A&R review queue
✗ Monthly strategy calls with industry professionals
✗ Direct feedback on your releases
✗ Watermark-free EPK PDFs
✗ Extended press image uploads (10 vs. 3)

Upgrade now and lock in your monthly rate:
→ ${pricingUrl}

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

// Direct API call (for manual trigger or testing)
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 day7 upgrade email per week per user
    const limit = rateLimit(`email:upgrade-day7:${uid}`, 1, 7 * 24 * 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: true, skipped: true, reason: "rate_limited" });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const targetEmail = email || userData.email;

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
    }

    // Check if already sent
    if (userData.emailFlags?.upgrade7DaySentAt) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_sent" });
    }

    // Check if user is already on Tier II or III (no need to send upgrade email)
    const tier = userData.subscriptionTier || userData.tier || "tier1";
    if (tier === "tier2" || tier === "tier3") {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_upgraded" });
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const pricingUrl = `${baseUrl}/pricing`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "Tier II Artists Get 3x More A&R Engagement",
      html: generateDay7UpgradeEmailHtml(artistName, pricingUrl),
      text: generateDay7UpgradeEmailText(artistName, pricingUrl),
      uid,
      emailType: "upgrade-day7",
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          upgrade7DaySentAt: admin.firestore.FieldValue.serverTimestamp(),
          upgrade7DayMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    console.error(`[email/upgrade-day7] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
