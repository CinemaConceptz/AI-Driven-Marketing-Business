import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateFirstImageEmailHtml(
  name: string,
  resolution: string,
  format: string,
  mediaUrl: string,
  maxImages: number
): string {
  const displayName = name || "Artist";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>First Press Image Uploaded — Looking Professional</title>
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
                Your first press image is now <strong style="color: #10b981;">live</strong> on your EPK.
              </p>
              
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                This is the image A&R teams will see first. Ensure it represents your brand at its best.
              </p>
              
              <!-- Image Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #10b981; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0;">
                      QUICK CHECK:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Resolution: <span style="color: #94a3b8;">${resolution}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding: 4px 0;">
                          <span style="color: #10b981;">✓</span> Format: <span style="color: #94a3b8;">${format}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Tier Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(110, 231, 255, 0.05); border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #6ee7ff; font-size: 14px; margin: 0;">
                      Want to add more? You can upload up to <strong>${maxImages} images</strong> on your current plan.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${mediaUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Manage Press Images
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

function generateFirstImageEmailText(
  name: string,
  resolution: string,
  format: string,
  mediaUrl: string,
  maxImages: number
): string {
  const displayName = name || "Artist";

  return `${displayName},

Your first press image is now LIVE on your EPK.

This is the image A&R teams will see first. Ensure it represents your brand at its best.

QUICK CHECK:
✓ Resolution: ${resolution}
✓ Format: ${format}

Want to add more? You can upload up to ${maxImages} images on your current plan.

Manage Press Images:
→ ${mediaUrl}

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 first image email ever per user
    const limit = rateLimit(`email:first-image:${uid}`, 1, 365 * 24 * 60 * 60 * 1000);
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
    if (userData.emailFlags?.firstImageSentAt) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_sent" });
    }

    // Parse request body for image details
    let resolution = "High resolution";
    let format = "JPEG/PNG";
    try {
      const body = await req.json();
      if (body.resolution) resolution = body.resolution;
      if (body.format) format = body.format;
    } catch {
      // Use defaults
    }

    // Determine max images based on tier
    const tier = userData.subscriptionTier || userData.tier || "tier1";
    const maxImages = tier === "tier3" ? 20 : tier === "tier2" ? 10 : 3;

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const mediaUrl = `${baseUrl}/media`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "First Press Image Uploaded — Looking Professional",
      html: generateFirstImageEmailHtml(artistName, resolution, format, mediaUrl, maxImages),
      text: generateFirstImageEmailText(artistName, resolution, format, mediaUrl, maxImages),
      uid,
      emailType: "first-image",
      meta: { resolution, format, maxImages },
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          firstImageSentAt: admin.firestore.FieldValue.serverTimestamp(),
          firstImageMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    console.error(`[email/first-image] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
