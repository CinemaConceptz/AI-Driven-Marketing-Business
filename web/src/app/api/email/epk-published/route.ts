import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateEpkPublishedEmailHtml(
  name: string,
  epkUrl: string,
  dashboardUrl: string
): string {
  const displayName = name || "Artist";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your EPK Is Live — Share It Strategically</title>
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
                Your Electronic Press Kit is now <strong style="color: #10b981;">public and shareable</strong>.
              </p>
              
              <!-- EPK URL -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(110, 231, 255, 0.05); border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #6ee7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">
                      YOUR EPK URL:
                    </p>
                    <p style="color: #ffffff; font-size: 14px; margin: 0; word-break: break-all;">
                      <a href="${epkUrl}" style="color: #6ee7ff; text-decoration: none;">${epkUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Strategic Sharing -->
              <p style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                STRATEGIC SHARING RECOMMENDATIONS:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">
                    <span style="color: #10b981; font-weight: 600;">1.</span> Add to your Instagram/TikTok bio
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">
                    <span style="color: #10b981; font-weight: 600;">2.</span> Include in email signatures
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">
                    <span style="color: #10b981; font-weight: 600;">3.</span> Send directly to booking agents and promoters
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">
                    <span style="color: #10b981; font-weight: 600;">4.</span> Submit with demo tracks to labels
                  </td>
                </tr>
              </table>
              
              <!-- PDF Download -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #10b981; font-size: 14px; margin: 0;">
                      <strong>Pro tip:</strong> Download your EPK as a PDF for offline sharing
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTAs -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${epkUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      View Your EPK
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="color: #6ee7ff; font-size: 14px; text-decoration: none;">
                      Download PDF EPK →
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

function generateEpkPublishedEmailText(
  name: string,
  epkUrl: string,
  dashboardUrl: string
): string {
  const displayName = name || "Artist";

  return `${displayName},

Your Electronic Press Kit is now PUBLIC AND SHAREABLE.

YOUR EPK URL:
${epkUrl}

STRATEGIC SHARING RECOMMENDATIONS:

1. Add to your Instagram/TikTok bio
2. Include in email signatures
3. Send directly to booking agents and promoters
4. Submit with demo tracks to labels

Pro tip: Download your EPK as a PDF for offline sharing

View Your EPK: ${epkUrl}
Download PDF EPK: ${dashboardUrl}

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 EPK published email per day per user
    const limit = rateLimit(`email:epk-published:${uid}`, 1, 24 * 60 * 60 * 1000);
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

    // Check if already sent recently (within 24 hours)
    const lastSent = userData.emailFlags?.epkPublishedSentAt;
    if (lastSent) {
      const lastSentTime = lastSent.toDate ? lastSent.toDate() : new Date(lastSent);
      const hoursSinceLastSent = (Date.now() - lastSentTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSent < 24) {
        return NextResponse.json({ ok: true, skipped: true, reason: "recently_sent" });
      }
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const epkUrl = `${baseUrl}/epk/${uid}`;
    const dashboardUrl = `${baseUrl}/dashboard`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "Your EPK Is Live — Share It Strategically",
      html: generateEpkPublishedEmailHtml(artistName, epkUrl, dashboardUrl),
      text: generateEpkPublishedEmailText(artistName, epkUrl, dashboardUrl),
      uid,
      emailType: "epk-published",
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          epkPublishedSentAt: admin.firestore.FieldValue.serverTimestamp(),
          epkPublishedMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    console.error(`[email/epk-published] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
