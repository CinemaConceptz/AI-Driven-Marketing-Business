import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail, sendWithTemplate } from "@/services/email/postmark";

function generateWelcomeEmailHtml(name: string, dashboardUrl: string, mediaUrl: string, pricingUrl: string): string {
  const displayName = name || "Artist";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Verified Sound A&R</title>
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
                Welcome to Verified Sound A&R.
              </p>
              
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                You've joined an executive-grade representation platform built for label-ready artists. Our network spans major labels, independent A&Rs, and playlist curators across House, EDM, Disco, Afro, Soulful, and Trance.
              </p>
              
              <p style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                Your immediate next steps:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 16px; background-color: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 12px;">
                    <p style="color: #ffffff; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">1. Upload Your Press Images</p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">High-resolution press photos are essential for label submissions.</p>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: rgba(255,255,255,0.03); border-radius: 12px;">
                    <p style="color: #ffffff; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">2. Complete Your EPK</p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Your Electronic Press Kit is your calling card. Make it count.</p>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: rgba(255,255,255,0.03); border-radius: 12px;">
                    <p style="color: #ffffff; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">3. Review Your Subscription</p>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Ensure you're on the right tier for your career stage.</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Open Dashboard
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${mediaUrl}" style="color: #6ee7ff; font-size: 14px; text-decoration: none;">Upload Press Images →</a>
                    <span style="color: #475569; margin: 0 12px;">|</span>
                    <a href="${pricingUrl}" style="color: #6ee7ff; font-size: 14px; text-decoration: none;">View Plans →</a>
                  </td>
                </tr>
              </table>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;">
              
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                Questions? Reply to this email or use the chat assistant on any page.
              </p>
              
              <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0 0;">
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

function generateWelcomeEmailText(name: string, dashboardUrl: string, mediaUrl: string, pricingUrl: string): string {
  const displayName = name || "Artist";
  return `${displayName},

Welcome to Verified Sound A&R.

You've joined an executive-grade representation platform built for label-ready artists. Our network spans major labels, independent A&Rs, and playlist curators across House, EDM, Disco, Afro, Soulful, and Trance.

YOUR IMMEDIATE NEXT STEPS:

1. Upload Your Press Images
   High-resolution press photos are essential for label submissions.
   → ${mediaUrl}

2. Complete Your EPK
   Your Electronic Press Kit is your calling card. Make it count.
   → ${dashboardUrl}

3. Review Your Subscription
   Ensure you're on the right tier for your career stage.
   → ${pricingUrl}

Questions? Reply to this email or use the chat assistant on any page.

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);
    const limit = rateLimit(`email:welcome:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const targetEmail = email || userData.email;

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
    }

    if (userData.emailFlags?.welcomeSentAt) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const dashboardUrl = `${baseUrl}/dashboard`;
    const mediaUrl = `${baseUrl}/media`;
    const pricingUrl = `${baseUrl}/pricing`;
    const artistName = userData.artistName || userData.displayName || "";

    const templateId = process.env.POSTMARK_TEMPLATE_WELCOME_ID;
    let messageId: string | undefined;

    if (templateId) {
      const result = await sendWithTemplate({
        to: targetEmail,
        templateId,
        model: {
          dashboardUrl,
          mediaUrl,
          pricingUrl,
          name: artistName,
        },
        uid,
        emailType: "welcome",
      });
      messageId = result.messageId;
    } else {
      const result = await sendTransactionalEmail({
        to: targetEmail,
        subject: "Your A&R Representation Begins Now",
        html: generateWelcomeEmailHtml(artistName, dashboardUrl, mediaUrl, pricingUrl),
        text: generateWelcomeEmailText(artistName, dashboardUrl, mediaUrl, pricingUrl),
        uid,
        emailType: "welcome",
      });
      messageId = result.messageId;
    }

    await userRef.set(
      {
        emailFlags: {
          welcomeSentAt: admin.firestore.FieldValue.serverTimestamp(),
          welcomeMessageId: messageId || null,
        },
        email: targetEmail,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(`[email/welcome] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
