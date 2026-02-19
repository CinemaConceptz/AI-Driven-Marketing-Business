import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { 
  getMonthlySubmissionCount, 
  createSubmissionLog, 
  getLabel 
} from "@/lib/submissions/queries";
import { canSubmit } from "@/lib/submissions";

// Verify user token and get user data
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
 * POST /api/submissions/log-webform
 * Log a webform submission (Mode A - user manually completed the form)
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { labelId, notes } = body;

    if (!labelId) {
      return NextResponse.json({ error: "Label ID required" }, { status: 400 });
    }

    // Check submission limit
    const monthlyCount = await getMonthlySubmissionCount(user.uid);
    const limitCheck = canSubmit(monthlyCount, user.tier, user.status);

    if (!limitCheck.allowed) {
      return NextResponse.json({
        ok: false,
        error: `Monthly submission limit reached (${limitCheck.limit}/${limitCheck.limit}).`,
        remaining: 0,
        limit: limitCheck.limit,
      }, { status: 429 });
    }

    // Get label info
    const label = await getLabel(labelId);
    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Create submission log
    const submissionId = await createSubmissionLog({
      userId: user.uid,
      labelId: label.id,
      labelName: label.name,
      method: "webform",
      status: "sent", // User says they submitted
      sentTo: label.submissionUrl || label.website || undefined,
      notes: notes || "Submitted via webform (Mode A)",
    });

    // Track event
    try {
      await adminDb.collection("funnelEvents").add({
        event: "submission_sent",
        userId: user.uid,
        metadata: {
          labelId: label.id,
          labelName: label.name,
          method: "webform",
          tier: user.tier,
          mode: "A",
        },
        timestamp: new Date(),
        source: "server",
      });
    } catch {
      // Don't fail if tracking fails
    }

    return NextResponse.json({
      ok: true,
      submissionId,
      remaining: limitCheck.remaining - 1,
      limit: limitCheck.limit,
      message: `Submission to ${label.name} logged`,
    });
  } catch (error: any) {
    console.error("[api/submissions/log-webform] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to log submission" },
      { status: 500 }
    );
  }
}
