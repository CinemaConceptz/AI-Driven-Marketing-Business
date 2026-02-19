import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

function generateProfileReminderEmailHtml(
  name: string,
  missingFields: string[],
  settingsUrl: string
): string {
  const displayName = name || "Artist";
  const missingList = missingFields.length > 0 
    ? missingFields.map(f => `<li style="color: #fbbf24; padding: 4px 0;">• ${f}</li>`).join("")
    : "<li style=\"color: #94a3b8; padding: 4px 0;\">• Complete your profile details</li>";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Artist Profile</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060b18; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0b1324; border: 1px solid rgba(110, 231, 255, 0.2); border-radius: 16px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0; font-weight: 600;">${displayName},</h1>
              
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Your Verified Sound profile is <strong style="color: #fbbf24;">incomplete</strong>.
              </p>
              
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                A&R representatives review profiles daily. Incomplete profiles are deprioritized in our submission queue.
              </p>
              
              <!-- Missing Fields -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0;">
                      MISSING FROM YOUR PROFILE:
                    </p>
                    <ul style="margin: 0; padding: 0; list-style: none;">
                      ${missingList}
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #10b981; font-size: 14px; margin: 0;">
                      <strong>Profiles with all sections completed receive 3x more A&R engagement.</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${settingsUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Complete Your Profile Now
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

function generateProfileReminderEmailText(
  name: string,
  missingFields: string[],
  settingsUrl: string
): string {
  const displayName = name || "Artist";
  const missingList = missingFields.length > 0 
    ? missingFields.map(f => `• ${f}`).join("\n")
    : "• Complete your profile details";

  return `${displayName},

Your Verified Sound profile is INCOMPLETE.

A&R representatives review profiles daily. Incomplete profiles are deprioritized in our submission queue.

MISSING FROM YOUR PROFILE:
${missingList}

Profiles with all sections completed receive 3x more A&R engagement.

Complete your profile now:
→ ${settingsUrl}

—
Verified Sound A&R
Executive Representation for Label-Ready Artists`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: max 1 profile reminder per 3 days per user
    const limit = rateLimit(`email:profile-reminder:${uid}`, 1, 3 * 24 * 60 * 60 * 1000);
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
    if (userData.emailFlags?.profileReminderSentAt) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_sent" });
    }

    // Check what's missing from profile
    const missingFields: string[] = [];
    if (!userData.artistName) missingFields.push("Artist / Stage Name");
    if (!userData.genre) missingFields.push("Primary Genre");
    if (!userData.bio) missingFields.push("Artist Bio");
    if (!userData.location) missingFields.push("Location");
    if (!userData.contactEmail) missingFields.push("Contact Email");
    
    // Check social links
    const socials = userData.socialLinks || {};
    if (!socials.spotify && !socials.soundcloud && !socials.instagram) {
      missingFields.push("Social Media Links");
    }

    // If profile is complete, skip
    if (missingFields.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "profile_complete" });
    }

    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const settingsUrl = `${baseUrl}/settings`;
    const artistName = userData.artistName || userData.displayName || "";

    const result = await sendTransactionalEmail({
      to: targetEmail,
      subject: "Complete Your Artist Profile — A&R Teams Are Waiting",
      html: generateProfileReminderEmailHtml(artistName, missingFields, settingsUrl),
      text: generateProfileReminderEmailText(artistName, missingFields, settingsUrl),
      uid,
      emailType: "profile-reminder",
      meta: { missingFields },
    });

    // Update user's email flags
    await userRef.set(
      {
        emailFlags: {
          profileReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          profileReminderMessageId: result.messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    console.error(`[email/profile-reminder] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
