import { NextResponse } from "next/server";
import { getAllExperimentMetrics } from "@/lib/experiments/serverAbTest";
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
 * GET /api/admin/experiments
 * Get all experiment metrics for admin dashboard
 */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const metrics = await getAllExperimentMetrics(days);

    return NextResponse.json({
      ok: true,
      days,
      experiments: metrics,
    });
  } catch (error: any) {
    console.error("[admin/experiments] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch experiment metrics" },
      { status: 500 }
    );
  }
}
