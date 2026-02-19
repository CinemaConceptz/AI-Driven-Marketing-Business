import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendTransactionalEmail } from "@/services/email/postmark";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[cron/emails] CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV !== "production";
  }
  
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  return token === cronSecret;
}

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
              
              <p style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">
                WHAT YOU'RE CURRENTLY MISSING ON TIER I:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr><td style="color: #ef4444; font-size: 14px; padding: 6px 0;">✗ <span style="color: #94a3b8;">Priority placement in A&R review queue</span></td></tr>
                <tr><td style="color: #ef4444; font-size: 14px; padding: 6px 0;">✗ <span style="color: #94a3b8;">Monthly strategy calls with industry professionals</span></td></tr>
                <tr><td style="color: #ef4444; font-size: 14px; padding: 6px 0;">✗ <span style="color: #94a3b8;">Direct feedback on your releases</span></td></tr>
                <tr><td style="color: #ef4444; font-size: 14px; padding: 6px 0;">✗ <span style="color: #94a3b8;">Watermark-free EPK PDFs</span></td></tr>
                <tr><td style="color: #ef4444; font-size: 14px; padding: 6px 0;">✗ <span style="color: #94a3b8;">Extended press image uploads (10 vs. 3)</span></td></tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">Upgrade now and lock in your monthly rate:</p>
                    <a href="${pricingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 9999px;">
                      Upgrade to Tier II — $89/mo
                    </a>
                  </td>
                </tr>
              </table>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;">
              
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                —<br><strong style="color: #ffffff;">Verified Sound A&R</strong><br>
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
• 3x faster A&R review turnaround
• 2x more label submission opportunities  
• 47% higher response rate from A&R teams

WHAT YOU'RE CURRENTLY MISSING ON TIER I:
✗ Priority placement in A&R review queue
✗ Monthly strategy calls with industry professionals
✗ Direct feedback on your releases
✗ Watermark-free EPK PDFs
✗ Extended press image uploads (10 vs. 3)

Upgrade now: ${pricingUrl}

—
Verified Sound A&R`;
}

/**
 * Cron endpoint to send scheduled emails
 * Called daily by Cloud Scheduler or similar service
 * 
 * Supports query params:
 * - type: "day7" | "day14" | "reengagement" (default: all)
 * - dryRun: "true" to preview without sending
 */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  console.log(`[cron/emails] Starting job ${requestId}`);

  // Verify authorization
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const emailType = searchParams.get("type") || "day7";
  const dryRun = searchParams.get("dryRun") === "true";

  const results = {
    requestId,
    emailType,
    dryRun,
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const pricingUrl = `${baseUrl}/pricing`;
    const now = Date.now();

    if (emailType === "day7" || emailType === "all") {
      // Find users who:
      // 1. Created account 7+ days ago
      // 2. Are on Tier I (or no tier)
      // 3. Haven't received the Day 7 email yet
      // 4. Have completed onboarding
      
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

      // Query users created between 7-8 days ago (to catch the day 7 window)
      const usersSnapshot = await adminDb
        .collection("users")
        .where("createdAt", ">=", eightDaysAgo)
        .where("createdAt", "<=", sevenDaysAgo)
        .get();

      console.log(`[cron/emails] Found ${usersSnapshot.size} users in Day 7 window`);

      for (const userDoc of usersSnapshot.docs) {
        results.processed++;
        const userData = userDoc.data();
        const uid = userDoc.id;

        // Skip if already sent
        if (userData.emailFlags?.upgrade7DaySentAt) {
          results.skipped++;
          continue;
        }

        // Skip if already upgraded
        const tier = userData.subscriptionTier || userData.tier;
        if (tier === "tier2" || tier === "tier3") {
          results.skipped++;
          continue;
        }

        // Skip if no email
        const email = userData.email;
        if (!email) {
          results.skipped++;
          continue;
        }

        // Skip if onboarding not completed
        if (!userData.onboardingCompleted) {
          results.skipped++;
          continue;
        }

        const artistName = userData.artistName || userData.displayName || "";

        if (dryRun) {
          console.log(`[cron/emails] DRY RUN - Would send Day 7 email to ${email}`);
          results.sent++;
          continue;
        }

        try {
          const result = await sendTransactionalEmail({
            to: email,
            subject: "Tier II Artists Get 3x More A&R Engagement",
            html: generateDay7UpgradeEmailHtml(artistName, pricingUrl),
            text: generateDay7UpgradeEmailText(artistName, pricingUrl),
            uid,
            emailType: "upgrade-day7",
          });

          // Update user's email flags
          await adminDb.collection("users").doc(uid).set(
            {
              emailFlags: {
                upgrade7DaySentAt: admin.firestore.FieldValue.serverTimestamp(),
                upgrade7DayMessageId: result.messageId || null,
              },
            },
            { merge: true }
          );

          results.sent++;
          console.log(`[cron/emails] Sent Day 7 email to ${email}`);
        } catch (err: any) {
          results.errors.push(`${email}: ${err?.message || "Unknown error"}`);
          console.error(`[cron/emails] Failed to send to ${email}:`, err?.message);
        }
      }
    }

    console.log(`[cron/emails] Job ${requestId} complete:`, results);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error(`[cron/emails] Job ${requestId} failed:`, error?.message || error);
    return NextResponse.json(
      { ...results, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: Request) {
  return GET(req);
}
