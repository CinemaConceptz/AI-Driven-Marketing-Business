import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUserSubmissions, getMonthlySubmissionCount } from "@/lib/submissions/queries";
import { canSubmit } from "@/lib/submissions";

// Verify user token
async function verifyUser(req: Request): Promise<{
  uid: string;
  tier: string;
  status: string;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    
    const userData = userDoc.data()!;
    
    return {
      uid: decoded.uid,
      tier: userData.subscriptionTier || userData.tier || "tier1",
      status: userData.subscriptionStatus || "active",
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/submissions/history
 * Get user's submission history and stats
 */
export async function GET(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const status = searchParams.get("status") || undefined;

  try {
    // Get submissions
    const submissions = await getUserSubmissions(user.uid, { limit, status });

    // Get monthly count
    const monthlyCount = await getMonthlySubmissionCount(user.uid);
    const limitCheck = canSubmit(monthlyCount, user.tier, user.status);

    // Calculate stats
    const stats = {
      total: submissions.length,
      thisMonth: monthlyCount,
      remaining: limitCheck.remaining,
      limit: limitCheck.limit,
      byStatus: {
        sent: submissions.filter(s => s.status === "sent").length,
        delivered: submissions.filter(s => s.status === "delivered").length,
        opened: submissions.filter(s => s.status === "opened").length,
        replied: submissions.filter(s => s.status === "replied").length,
        bounced: submissions.filter(s => s.status === "bounced").length,
        failed: submissions.filter(s => s.status === "failed").length,
      },
    };

    return NextResponse.json({
      ok: true,
      submissions,
      stats,
    });
  } catch (error: any) {
    console.error("[api/submissions/history] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
