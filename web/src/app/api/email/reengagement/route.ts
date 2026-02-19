import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateReengagementEmailHtml(
  name: string,
  dashboardUrl: string,
  daysInactive: number
): string {
  const displayName = name || "Artist";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your A&R Representation Is Active — Are You?</title>
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
                It's been <strong style="color: #fbbf24;">${daysInactive} days</strong> since you last accessed your Verified Sound dashboard.
              </p>
              
              <!-- Activity Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(110, 231, 255, 0.05); border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #6ee7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                      DURING THAT TIME:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding: 6px 0;">
                          <span style="color: #10b981;">•</span> New A&R opportunities were added to our network
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding: 6px 0;">
                          <span style="color: #10b981;">•</span> Artists in your genre received label feedback
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding: 6px 0;">
                          <span style="color: #10b981;">•</span> Your profile remained in our submission queue
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Urgency -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #fbbf24; font-size: 14px; margin: 0;">
                      <strong>Don't let momentum slip.</strong> Even 5 minutes on your dashboard can move the needle.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Return to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Suggestions -->
              <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
                If you're between releases, use this time to:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 4px 0;">
                    <span style="color: #6ee7ff;">→</span> Update your bio with recent achievements
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 4px 0;">
                    <span style="color: #6ee7ff;">→</span> Refresh your press images
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 4px 0;">
                    <span style="color: #6ee7ff;">→</span> Review your subscription tier
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

function generateReengagementEmailText(
  name: string,
  dashboardUrl: string,
  daysInactive: number
): string {
  const displayName = name || "Artist";

  return `${displayName},

It's been ${daysInactive} days since you last accessed your Verified Sound dashboard.

DURING THAT TIME:
• New A&R opportunities were added to our network
• Artists in your genre received label feedback
• Your profile remained in our submission queue

Don't let momentum slip. Even 5 minutes on your dashboard can move the needle.

Return to Dashboard:
→ ${dashboardUrl}

If you're between releases, use this time to:
→ Update your bio with recent achievements
→ Refresh your press images
→ Review your subscription tier

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 re-engagement per 2 weeks per user
    const limit = rateLimit(`email:reengagement:${uid}`, 1, 14 * 24 * 60 * 60 * 1000);
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

    // Calculate days inactive
    const lastActiveAt = userData.lastActiveAt?.toDate?.() || userData.updatedAt?.toDate?.() || new Date();
    const daysInactive = Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));

    // Only send if inactive for 7+ days
    if (daysInactive < 7) {
      return NextResponse.json({ ok: true, skipped: true, reason: "recently_active" });
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const dashboardUrl = `${baseUrl}/dashboard`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "Your A&R Representation Is Active — Are You?",
      html: generateReengagementEmailHtml(artistName, dashboardUrl, daysInactive),
      text: generateReengagementEmailText(artistName, dashboardUrl, daysInactive),
      uid,
      emailType: "reengagement",
      meta: { daysInactive },
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          reengagementSentAt: admin.firestore.FieldValue.serverTimestamp(),
          reengagementMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId, daysInactive });
  } catch (error: any) {
    console.error(`[email/reengagement] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
