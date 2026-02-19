import { NextResponse } from "next/server";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getFunnelMetrics } from "@/lib/analytics/serverTracking";

export async function GET(req: Request) {
  try {
    // Verify admin access
    const { uid } = await verifyAuth(req);
    
    // Check if user is admin
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get days parameter (default 30)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Get funnel metrics
    const metrics = await getFunnelMetrics(days);

    // Get additional stats
    const usersSnapshot = await adminDb.collection("users").get();
    const totalUsers = usersSnapshot.size;
    
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;
    let onboardedCount = 0;
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const tier = data.subscriptionTier || data.tier || "tier1";
      if (tier === "tier1") tier1Count++;
      else if (tier === "tier2") tier2Count++;
      else if (tier === "tier3") tier3Count++;
      if (data.onboardingCompleted) onboardedCount++;
    });

    return NextResponse.json({
      ok: true,
      days,
      totalUsers,
      tierBreakdown: {
        tier1: tier1Count,
        tier2: tier2Count,
        tier3: tier3Count,
      },
      onboardingRate: totalUsers > 0 ? Math.round((onboardedCount / totalUsers) * 100) : 0,
      ...metrics,
    });
  } catch (error: any) {
    console.error("[api/admin/funnel] Error:", error?.message);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
