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

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateDay7UpgradeEmailHtml(name: string, pricingUrl: string): string {
  const displayName = name || "Artist";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#060b18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b18;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b1324;border:1px solid rgba(110,231,255,0.2);border-radius:16px;padding:40px;"><tr><td>
<h1 style="color:#ffffff;font-size:24px;margin:0 0 24px 0;font-weight:600;">${displayName},</h1>
<p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">After your first week on Verified Sound, here's what Tier II members experience:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(110,231,255,0.05);border:1px solid rgba(110,231,255,0.2);border-radius:12px;padding:24px;margin-bottom:24px;"><tr><td>
<p style="color:#6ee7ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px 0;">BY THE NUMBERS</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;"><span style="color:#10b981;font-size:24px;font-weight:700;">3x</span><span style="color:#94a3b8;font-size:14px;margin-left:8px;">faster A&R review turnaround</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#10b981;font-size:24px;font-weight:700;">2x</span><span style="color:#94a3b8;font-size:14px;margin-left:8px;">more label submission opportunities</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#10b981;font-size:24px;font-weight:700;">47%</span><span style="color:#94a3b8;font-size:14px;margin-left:8px;">higher response rate from A&R teams</span></td></tr>
</table></td></tr></table>
<p style="color:#ffffff;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px 0;">WHAT YOU'RE CURRENTLY MISSING ON TIER I:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="color:#ef4444;font-size:14px;padding:6px 0;">✗ <span style="color:#94a3b8;">Priority placement in A&R review queue</span></td></tr>
<tr><td style="color:#ef4444;font-size:14px;padding:6px 0;">✗ <span style="color:#94a3b8;">Monthly strategy calls with industry professionals</span></td></tr>
<tr><td style="color:#ef4444;font-size:14px;padding:6px 0;">✗ <span style="color:#94a3b8;">Direct feedback on your releases</span></td></tr>
<tr><td style="color:#ef4444;font-size:14px;padding:6px 0;">✗ <span style="color:#94a3b8;">Watermark-free EPK PDFs</span></td></tr>
<tr><td style="color:#ef4444;font-size:14px;padding:6px 0;">✗ <span style="color:#94a3b8;">Extended press image uploads (10 vs. 3)</span></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:24px;margin-bottom:24px;"><tr><td align="center">
<p style="color:#ffffff;font-size:16px;margin:0 0 16px 0;">Upgrade now and lock in your monthly rate:</p>
<a href="${pricingUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:9999px;">Upgrade to Tier II — $89/mo</a>
</td></tr></table>
<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
<p style="color:#94a3b8;font-size:14px;margin:0;">—<br><strong style="color:#ffffff;">Verified Sound A&R</strong><br><span style="color:#64748b;">Executive Representation for Label-Ready Artists</span></p>
</td></tr></table></td></tr></table></body></html>`;
}

function generateDay2ProfileReminderHtml(name: string, missingFields: string[], settingsUrl: string): string {
  const displayName = name || "Artist";
  const missingList = missingFields.map(f => `<li style="color:#fbbf24;padding:4px 0;">• ${f}</li>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#060b18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b18;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b1324;border:1px solid rgba(110,231,255,0.2);border-radius:16px;padding:40px;"><tr><td>
<h1 style="color:#ffffff;font-size:24px;margin:0 0 24px 0;font-weight:600;">${displayName},</h1>
<p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Your Verified Sound profile is <strong style="color:#fbbf24;">incomplete</strong>.</p>
<p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px 0;">A&R representatives review profiles daily. Incomplete profiles are deprioritized in our submission queue.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:20px;margin-bottom:24px;"><tr><td>
<p style="color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px 0;">MISSING FROM YOUR PROFILE:</p>
<ul style="margin:0;padding:0;list-style:none;">${missingList}</ul>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:16px;margin-bottom:24px;"><tr><td align="center">
<p style="color:#10b981;font-size:14px;margin:0;"><strong>Profiles with all sections completed receive 3x more A&R engagement.</strong></p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${settingsUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:9999px;">Complete Your Profile Now</a>
</td></tr></table>
<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
<p style="color:#94a3b8;font-size:14px;margin:0;">—<br><strong style="color:#ffffff;">Verified Sound A&R</strong></p>
</td></tr></table></td></tr></table></body></html>`;
}

function generateDay5EpkGuideHtml(name: string, completedCount: number, dashboardUrl: string): string {
  const displayName = name || "Artist";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#060b18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b18;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b1324;border:1px solid rgba(110,231,255,0.2);border-radius:16px;padding:40px;"><tr><td>
<h1 style="color:#ffffff;font-size:24px;margin:0 0 24px 0;font-weight:600;">${displayName},</h1>
<p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">After 5 days on the platform, here's what separates artists who get signed from those who don't:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(110,231,255,0.05);border:1px solid rgba(110,231,255,0.2);border-radius:12px;padding:24px;margin-bottom:24px;"><tr><td>
<p style="color:#6ee7ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px 0;">THE VERIFIED SOUND EPK CHECKLIST</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;"><span style="color:#64748b;">□</span><span style="color:#ffffff;margin-left:8px;font-weight:600;">Professional Press Image</span><span style="color:#64748b;font-size:13px;"> (not a selfie)</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#64748b;">□</span><span style="color:#ffffff;margin-left:8px;font-weight:600;">Concise Bio</span><span style="color:#64748b;font-size:13px;"> (150-300 words)</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#64748b;">□</span><span style="color:#ffffff;margin-left:8px;font-weight:600;">Active Streaming Links</span><span style="color:#64748b;font-size:13px;"> (Spotify, SoundCloud)</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#64748b;">□</span><span style="color:#ffffff;margin-left:8px;font-weight:600;">Social Proof</span><span style="color:#64748b;font-size:13px;"> (followers, placements)</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#64748b;">□</span><span style="color:#ffffff;margin-left:8px;font-weight:600;">Contact Information</span><span style="color:#64748b;font-size:13px;"> (booking email)</span></td></tr>
</table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin-bottom:24px;"><tr><td align="center">
<p style="color:#fbbf24;font-size:14px;margin:0;"><strong>Your current EPK status: ${completedCount}/5 complete</strong></p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${dashboardUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:9999px;">Review and Enhance Your EPK</a>
</td></tr></table>
<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
<p style="color:#94a3b8;font-size:14px;margin:0;">—<br><strong style="color:#ffffff;">Verified Sound A&R</strong></p>
</td></tr></table></td></tr></table></body></html>`;
}

function generateReengagementHtml(name: string, dashboardUrl: string, daysInactive: number): string {
  const displayName = name || "Artist";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#060b18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060b18;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#0b1324;border:1px solid rgba(110,231,255,0.2);border-radius:16px;padding:40px;"><tr><td>
<h1 style="color:#ffffff;font-size:24px;margin:0 0 24px 0;font-weight:600;">${displayName},</h1>
<p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">It's been <strong style="color:#fbbf24;">${daysInactive} days</strong> since you last accessed your Verified Sound dashboard.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(110,231,255,0.05);border:1px solid rgba(110,231,255,0.2);border-radius:12px;padding:24px;margin-bottom:24px;"><tr><td>
<p style="color:#6ee7ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px 0;">DURING THAT TIME:</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">•</span> New A&R opportunities were added to our network</td></tr>
<tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">•</span> Artists in your genre received label feedback</td></tr>
<tr><td style="color:#94a3b8;font-size:14px;padding:6px 0;"><span style="color:#10b981;">•</span> Your profile remained in our submission queue</td></tr>
</table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin-bottom:24px;"><tr><td align="center">
<p style="color:#fbbf24;font-size:14px;margin:0;"><strong>Don't let momentum slip.</strong> Even 5 minutes on your dashboard can move the needle.</p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${dashboardUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:9999px;">Return to Dashboard</a>
</td></tr></table>
<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;">
<p style="color:#94a3b8;font-size:14px;margin:0;">—<br><strong style="color:#ffffff;">Verified Sound A&R</strong></p>
</td></tr></table></td></tr></table></body></html>`;
}

// ============================================
// CRON JOB LOGIC
// ============================================

type EmailType = "day2" | "day5" | "day7" | "reengagement" | "all";

interface CronResults {
  requestId: string;
  emailTypes: string[];
  dryRun: boolean;
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
  breakdown: Record<string, { processed: number; sent: number; skipped: number }>;
}

/**
 * Cron endpoint to send scheduled emails
 * Called daily by Cloud Scheduler or similar service
 * 
 * Query params:
 * - type: "day2" | "day5" | "day7" | "reengagement" | "all" (default: all)
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
  const emailType = (searchParams.get("type") || "all") as EmailType;
  const dryRun = searchParams.get("dryRun") === "true";

  const emailTypes = emailType === "all" ? ["day2", "day5", "day7", "reengagement"] : [emailType];

  const results: CronResults = {
    requestId,
    emailTypes,
    dryRun,
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [],
    breakdown: {},
  };

  const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
  const now = Date.now();

  try {
    // ============================================
    // DAY 2: PROFILE COMPLETION REMINDER
    // ============================================
    if (emailTypes.includes("day2")) {
      results.breakdown.day2 = { processed: 0, sent: 0, skipped: 0 };
      
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

      try {
        const usersSnapshot = await adminDb
          .collection("users")
          .where("createdAt", ">=", threeDaysAgo)
          .where("createdAt", "<=", twoDaysAgo)
          .get();

        for (const userDoc of usersSnapshot.docs) {
          results.breakdown.day2.processed++;
          results.processed++;
          const userData = userDoc.data();
          const uid = userDoc.id;

          // Skip if already sent
          if (userData.emailFlags?.profileReminderSentAt) {
            results.breakdown.day2.skipped++;
            results.skipped++;
            continue;
          }

          // Check what's missing
          const missingFields: string[] = [];
          if (!userData.artistName) missingFields.push("Artist Name");
          if (!userData.genre) missingFields.push("Genre");
          if (!userData.bio) missingFields.push("Bio");
          
          // Skip if profile is complete
          if (missingFields.length === 0) {
            results.breakdown.day2.skipped++;
            results.skipped++;
            continue;
          }

          const email = userData.email;
          if (!email) {
            results.breakdown.day2.skipped++;
            results.skipped++;
            continue;
          }

          if (dryRun) {
            console.log(`[cron/emails] DRY RUN - Would send Day 2 email to ${email}`);
            results.breakdown.day2.sent++;
            results.sent++;
            continue;
          }

          try {
            await sendTransactionalEmail({
              to: email,
              subject: "Complete Your Artist Profile — A&R Teams Are Waiting",
              html: generateDay2ProfileReminderHtml(userData.artistName || "", missingFields, `${baseUrl}/settings`),
              text: `Your profile is incomplete. Missing: ${missingFields.join(", ")}. Complete it at ${baseUrl}/settings`,
              uid,
              emailType: "profile-reminder",
            });

            await adminDb.collection("users").doc(uid).set({
              emailFlags: { profileReminderSentAt: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });

            results.breakdown.day2.sent++;
            results.sent++;
          } catch (err: any) {
            results.errors.push(`day2:${email}: ${err?.message}`);
          }
        }
      } catch (err: any) {
        results.errors.push(`day2:query: ${err?.message}`);
      }
    }

    // ============================================
    // DAY 5: EPK SETUP GUIDE
    // ============================================
    if (emailTypes.includes("day5")) {
      results.breakdown.day5 = { processed: 0, sent: 0, skipped: 0 };
      
      const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);

      try {
        const usersSnapshot = await adminDb
          .collection("users")
          .where("createdAt", ">=", sixDaysAgo)
          .where("createdAt", "<=", fiveDaysAgo)
          .get();

        for (const userDoc of usersSnapshot.docs) {
          results.breakdown.day5.processed++;
          results.processed++;
          const userData = userDoc.data();
          const uid = userDoc.id;

          if (userData.emailFlags?.epkGuideSentAt) {
            results.breakdown.day5.skipped++;
            results.skipped++;
            continue;
          }

          const email = userData.email;
          if (!email) {
            results.breakdown.day5.skipped++;
            results.skipped++;
            continue;
          }

          // Calculate completion (simplified)
          let completedCount = 0;
          if (userData.bio) completedCount++;
          if (userData.artistName) completedCount++;
          if (userData.contactEmail || userData.email) completedCount++;

          if (dryRun) {
            console.log(`[cron/emails] DRY RUN - Would send Day 5 email to ${email}`);
            results.breakdown.day5.sent++;
            results.sent++;
            continue;
          }

          try {
            await sendTransactionalEmail({
              to: email,
              subject: "Your EPK Checklist — What Labels Look For",
              html: generateDay5EpkGuideHtml(userData.artistName || "", completedCount, `${baseUrl}/dashboard`),
              text: `Your EPK status: ${completedCount}/5 complete. Review at ${baseUrl}/dashboard`,
              uid,
              emailType: "epk-guide",
            });

            await adminDb.collection("users").doc(uid).set({
              emailFlags: { epkGuideSentAt: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });

            results.breakdown.day5.sent++;
            results.sent++;
          } catch (err: any) {
            results.errors.push(`day5:${email}: ${err?.message}`);
          }
        }
      } catch (err: any) {
        results.errors.push(`day5:query: ${err?.message}`);
      }
    }

    // ============================================
    // DAY 7: UPGRADE PROMPT
    // ============================================
    if (emailTypes.includes("day7")) {
      results.breakdown.day7 = { processed: 0, sent: 0, skipped: 0 };
      
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

      try {
        const usersSnapshot = await adminDb
          .collection("users")
          .where("createdAt", ">=", eightDaysAgo)
          .where("createdAt", "<=", sevenDaysAgo)
          .get();

        for (const userDoc of usersSnapshot.docs) {
          results.breakdown.day7.processed++;
          results.processed++;
          const userData = userDoc.data();
          const uid = userDoc.id;

          if (userData.emailFlags?.upgrade7DaySentAt) {
            results.breakdown.day7.skipped++;
            results.skipped++;
            continue;
          }

          const tier = userData.subscriptionTier || userData.tier;
          if (tier === "tier2" || tier === "tier3") {
            results.breakdown.day7.skipped++;
            results.skipped++;
            continue;
          }

          const email = userData.email;
          if (!email || !userData.onboardingCompleted) {
            results.breakdown.day7.skipped++;
            results.skipped++;
            continue;
          }

          if (dryRun) {
            console.log(`[cron/emails] DRY RUN - Would send Day 7 email to ${email}`);
            results.breakdown.day7.sent++;
            results.sent++;
            continue;
          }

          try {
            await sendTransactionalEmail({
              to: email,
              subject: "Tier II Artists Get 3x More A&R Engagement",
              html: generateDay7UpgradeEmailHtml(userData.artistName || "", `${baseUrl}/pricing`),
              text: `Tier II artists get 3x more engagement. Upgrade at ${baseUrl}/pricing`,
              uid,
              emailType: "upgrade-day7",
            });

            await adminDb.collection("users").doc(uid).set({
              emailFlags: { upgrade7DaySentAt: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });

            results.breakdown.day7.sent++;
            results.sent++;
          } catch (err: any) {
            results.errors.push(`day7:${email}: ${err?.message}`);
          }
        }
      } catch (err: any) {
        results.errors.push(`day7:query: ${err?.message}`);
      }
    }

    // ============================================
    // REENGAGEMENT: 7+ DAYS INACTIVE
    // ============================================
    if (emailTypes.includes("reengagement")) {
      results.breakdown.reengagement = { processed: 0, sent: 0, skipped: 0 };
      
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

      try {
        // Query users who haven't been active in 7-14 days
        const usersSnapshot = await adminDb
          .collection("users")
          .where("lastActiveAt", ">=", fourteenDaysAgo)
          .where("lastActiveAt", "<=", sevenDaysAgo)
          .get();

        for (const userDoc of usersSnapshot.docs) {
          results.breakdown.reengagement.processed++;
          results.processed++;
          const userData = userDoc.data();
          const uid = userDoc.id;

          // Skip if recently sent (within 14 days)
          const lastSent = userData.emailFlags?.reengagementSentAt?.toDate?.();
          if (lastSent && (now - lastSent.getTime()) < 14 * 24 * 60 * 60 * 1000) {
            results.breakdown.reengagement.skipped++;
            results.skipped++;
            continue;
          }

          const email = userData.email;
          if (!email) {
            results.breakdown.reengagement.skipped++;
            results.skipped++;
            continue;
          }

          const lastActiveAt = userData.lastActiveAt?.toDate?.() || new Date();
          const daysInactive = Math.floor((now - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));

          if (dryRun) {
            console.log(`[cron/emails] DRY RUN - Would send reengagement email to ${email} (${daysInactive} days inactive)`);
            results.breakdown.reengagement.sent++;
            results.sent++;
            continue;
          }

          try {
            await sendTransactionalEmail({
              to: email,
              subject: "Your A&R Representation Is Active — Are You?",
              html: generateReengagementHtml(userData.artistName || "", `${baseUrl}/dashboard`, daysInactive),
              text: `It's been ${daysInactive} days since your last visit. Return at ${baseUrl}/dashboard`,
              uid,
              emailType: "reengagement",
            });

            await adminDb.collection("users").doc(uid).set({
              emailFlags: { reengagementSentAt: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });

            results.breakdown.reengagement.sent++;
            results.sent++;
          } catch (err: any) {
            results.errors.push(`reengagement:${email}: ${err?.message}`);
          }
        }
      } catch (err: any) {
        results.errors.push(`reengagement:query: ${err?.message}`);
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
