import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateEpkGuideEmailHtml(
  name: string,
  completedCount: number,
  dashboardUrl: string
): string {
  const displayName = name || "Artist";
  
  const checklist = [
    { item: "Professional Press Image", desc: "not a selfie, not a live shot", done: false },
    { item: "Concise Bio", desc: "150-300 words, third person, recent highlights", done: false },
    { item: "Active Streaming Links", desc: "Spotify, SoundCloud, Apple Music", done: false },
    { item: "Social Proof", desc: "follower counts, playlist placements, press mentions", done: false },
    { item: "Contact Information", desc: "booking email, management if applicable", done: false },
  ];

  const checklistHtml = checklist.map((c, i) => {
    const isDone = i < completedCount;
    const checkmark = isDone 
      ? '<span style="color: #10b981;">✓</span>' 
      : '<span style="color: #64748b;">□</span>';
    const textColor = isDone ? "#10b981" : "#ffffff";
    return `
      <tr>
        <td style="padding: 8px 0;">
          ${checkmark}
          <span style="color: ${textColor}; margin-left: 8px; font-weight: 600;">${c.item}</span>
          <span style="color: #64748b; font-size: 13px;"> (${c.desc})</span>
        </td>
      </tr>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your EPK Checklist — What Labels Look For</title>
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
                After 5 days on the platform, here's what separates artists who get signed from those who don't:
              </p>
              
              <!-- Checklist -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(110, 231, 255, 0.05); border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #6ee7ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                      THE VERIFIED SOUND EPK CHECKLIST
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${checklistHtml}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Status -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #fbbf24; font-size: 14px; margin: 0;">
                      <strong>Your current EPK status: ${completedCount}/5 complete</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Review and Enhance Your EPK
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #64748b; font-size: 13px; margin: 0;">
                      Need guidance? Our AI assistant can review your profile and suggest improvements.
                    </p>
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

function generateEpkGuideEmailText(
  name: string,
  completedCount: number,
  dashboardUrl: string
): string {
  const displayName = name || "Artist";

  return `${displayName},

After 5 days on the platform, here's what separates artists who get signed from those who don't:

THE VERIFIED SOUND EPK CHECKLIST

□ Professional Press Image (not a selfie, not a live shot)
□ Concise Bio (150-300 words, third person, recent highlights)
□ Active Streaming Links (Spotify, SoundCloud, Apple Music)
□ Social Proof (follower counts, playlist placements, press mentions)
□ Contact Information (booking email, management if applicable)

Your current EPK status: ${completedCount}/5 complete

Review and enhance your EPK:
→ ${dashboardUrl}

Need guidance? Our AI assistant can review your profile and suggest improvements.

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 EPK guide per week per user
    const limit = rateLimit(`email:epk-guide:${uid}`, 1, 7 * 24 * 60 * 60 * 1000);
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
    if (userData.emailFlags?.epkGuideSentAt) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_sent" });
    }

    // Calculate EPK completion score
    let completedCount = 0;
    
    // Check for press images
    const mediaSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("media")
      .limit(1)
      .get();
    if (!mediaSnapshot.empty) completedCount++;
    
    // Check bio
    if (userData.bio && userData.bio.length >= 50) completedCount++;
    
    // Check streaming links
    const socials = userData.socialLinks || {};
    if (socials.spotify || socials.soundcloud || socials.appleMusic) completedCount++;
    
    // Check social proof (any social media)
    if (socials.instagram || socials.youtube || socials.tiktok) completedCount++;
    
    // Check contact info
    if (userData.contactEmail || userData.email) completedCount++;

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const dashboardUrl = `${baseUrl}/dashboard`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "Your EPK Checklist — What Labels Look For",
      html: generateEpkGuideEmailHtml(artistName, completedCount, dashboardUrl),
      text: generateEpkGuideEmailText(artistName, completedCount, dashboardUrl),
      uid,
      emailType: "epk-guide",
      meta: { completedCount },
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          epkGuideSentAt: admin.firestore.FieldValue.serverTimestamp(),
          epkGuideMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId, completedCount });
  } catch (error: any) {
    console.error(`[email/epk-guide] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
