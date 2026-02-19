import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendTransactionalEmail } from "@/services/email/postmark";
import { getUnsubscribeUrl, isUserUnsubscribed } from "../unsubscribe/route";

/**
 * POST /api/email/winback
 * Send win-back email to churned users
 * 
 * Body: { uid: string }
 * 
 * Triggered by cron job for users who:
 * - Canceled subscription 30+ days ago
 * - Haven't received win-back email in 60 days
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const uid: string = body?.uid;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Check if user is unsubscribed
    if (await isUserUnsubscribed(uid, "winback")) {
      return NextResponse.json({ 
        ok: false, 
        skipped: true, 
        reason: "User unsubscribed" 
      });
    }

    // Get user data
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const email = userData.email;
    
    if (!email) {
      return NextResponse.json({ error: "No email address" }, { status: 400 });
    }

    // Check if already sent recently (60 days)
    const lastSent = userData.emailFlags?.winbackSentAt?.toDate?.();
    if (lastSent && (Date.now() - lastSent.getTime()) < 60 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ 
        ok: false, 
        skipped: true, 
        reason: "Already sent within 60 days" 
      });
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = getUnsubscribeUrl(uid, "winback");
    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";

    // Send email
    await sendTransactionalEmail({
      to: email,
      subject: "We Miss You — Special Offer Inside",
      html: generateWinbackEmailHtml(
        userData.artistName || "",
        `${baseUrl}/pricing`,
        unsubscribeUrl
      ),
      text: `We noticed you've been away. Come back and get 20% off your first month. Visit ${baseUrl}/pricing`,
      uid,
      emailType: "winback",
    });

    // Update email flags
    await adminDb.collection("users").doc(uid).update({
      "emailFlags.winbackSentAt": new Date(),
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (error: any) {
    console.error("[email/winback] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to send winback email" },
      { status: 500 }
    );
  }
}

function generateWinbackEmailHtml(
  name: string, 
  pricingUrl: string,
  unsubscribeUrl: string
): string {
  const displayName = name || "Artist";
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#060b18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b18;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b1324;border:1px solid rgba(110,231,255,0.2);border-radius:16px;padding:40px;">
          <tr>
            <td>
              <h1 style="color:#ffffff;font-size:24px;margin:0 0 24px 0;font-weight:600;">
                ${displayName}, we miss you.
              </h1>
              
              <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
                It's been a while since you last visited Verified Sound, and we wanted to reach out.
              </p>
              
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                While you were away, we've been working hard to expand our A&R network and improve our platform. Here's what's new:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(110,231,255,0.05);border:1px solid rgba(110,231,255,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="color:#6ee7ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px 0;">
                      WHAT'S NEW
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">+</span> Expanded A&R network with 15+ new label contacts</td></tr>
                      <tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">+</span> Improved EPK templates with better label visibility</td></tr>
                      <tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">+</span> Faster A&R review turnaround times</td></tr>
                      <tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">+</span> New AI assistant for 24/7 support</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Special Offer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(6,78,59,0.2) 100%);border:2px solid rgba(16,185,129,0.4);border-radius:16px;padding:32px;margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <p style="color:#10b981;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 8px 0;">
                      WELCOME BACK OFFER
                    </p>
                    <p style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px 0;">
                      20% OFF
                    </p>
                    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px 0;">
                      Your first month back on any tier
                    </p>
                    <a href="${pricingUrl}?promo=WELCOMEBACK20" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:9999px;">
                      Claim Your 20% Off
                    </a>
                    <p style="color:#64748b;font-size:12px;margin:16px 0 0 0;">
                      Use code: WELCOMEBACK20 at checkout
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                Your profile and EPK data are still safely stored with us. Pick up right where you left off.
              </p>
              
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
              
              <p style="color:#94a3b8;font-size:14px;margin:0;">
                —<br>
                <strong style="color:#ffffff;">Verified Sound A&R</strong><br>
                <span style="color:#64748b;">Executive Representation for Label-Ready Artists</span>
              </p>
              
              <p style="color:#64748b;font-size:12px;margin:24px 0 0 0;">
                <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from win-back emails
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
