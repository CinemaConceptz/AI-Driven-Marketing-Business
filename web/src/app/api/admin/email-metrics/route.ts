import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Simple admin verification
async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.split("Bearer ")[1];
  
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    return adminDoc.exists;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/email-metrics
 * Get email sequence performance metrics
 */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get email logs
    const emailLogsSnapshot = await adminDb
      .collection("emailLogs")
      .where("createdAt", ">=", cutoffDate)
      .get();

    // Aggregate by email type
    const emailMetrics: Record<string, {
      sent: number;
      failed: number;
      total: number;
    }> = {};

    emailLogsSnapshot.forEach((doc) => {
      const data = doc.data();
      const type = data.type || "unknown";
      
      if (!emailMetrics[type]) {
        emailMetrics[type] = { sent: 0, failed: 0, total: 0 };
      }
      
      emailMetrics[type].total++;
      if (data.status === "sent") {
        emailMetrics[type].sent++;
      } else {
        emailMetrics[type].failed++;
      }
    });

    // Get unsubscribe count
    const unsubscribesSnapshot = await adminDb
      .collection("emailUnsubscribes")
      .where("timestamp", ">=", cutoffDate)
      .get();

    const unsubscribeCount = unsubscribesSnapshot.size;

    // Get bounce/spam count from email webhooks (if tracked)
    let bounceCount = 0;
    let spamCount = 0;
    
    try {
      const webhooksSnapshot = await adminDb
        .collection("emailWebhooks")
        .where("timestamp", ">=", cutoffDate)
        .get();

      webhooksSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "Bounce") bounceCount++;
        if (data.type === "SpamComplaint") spamCount++;
      });
    } catch {
      // emailWebhooks collection may not exist
    }

    // Calculate totals
    const totalSent = Object.values(emailMetrics).reduce((sum, m) => sum + m.sent, 0);
    const totalFailed = Object.values(emailMetrics).reduce((sum, m) => sum + m.failed, 0);

    // Email sequence breakdown with friendly names
    const sequences = [
      { id: "welcome", name: "Welcome Email", priority: "P0" },
      { id: "upgrade-limit", name: "Upgrade (Limit Hit)", priority: "P0" },
      { id: "upgrade-day7", name: "Day 7 Upgrade", priority: "P1" },
      { id: "profile-reminder", name: "Profile Reminder", priority: "P1" },
      { id: "epk-guide", name: "EPK Guide", priority: "P2" },
      { id: "reengagement", name: "Re-engagement", priority: "P2" },
      { id: "first-image", name: "First Image", priority: "P3" },
      { id: "epk-published", name: "EPK Published", priority: "P3" },
      { id: "winback", name: "Win-back", priority: "P2" },
    ].map((seq) => ({
      ...seq,
      metrics: emailMetrics[seq.id] || { sent: 0, failed: 0, total: 0 },
      successRate: emailMetrics[seq.id] 
        ? Math.round((emailMetrics[seq.id].sent / Math.max(emailMetrics[seq.id].total, 1)) * 100)
        : 0,
    }));

    return NextResponse.json({
      ok: true,
      days,
      summary: {
        totalSent,
        totalFailed,
        successRate: totalSent + totalFailed > 0 
          ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
          : 0,
        unsubscribes: unsubscribeCount,
        bounces: bounceCount,
        spamComplaints: spamCount,
      },
      sequences,
    });
  } catch (error: any) {
    console.error("[admin/email-metrics] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch email metrics" },
      { status: 500 }
    );
  }
}
