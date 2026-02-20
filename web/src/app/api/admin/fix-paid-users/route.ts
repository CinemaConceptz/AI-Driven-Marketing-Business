import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

// One-time fix: Set onboardingCompleted for all active subscribers
// DELETE THIS FILE AFTER RUNNING ONCE
export async function POST(req: Request) {
  // Check for secret (use your CRON_SECRET)
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all users with active subscriptions but no onboardingCompleted
    const usersSnapshot = await adminDb
      .collection("users")
      .where("subscriptionStatus", "==", "active")
      .get();

    const updates: string[] = [];

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      if (!data.onboardingCompleted) {
        await adminDb.collection("users").doc(doc.id).update({
          onboardingCompleted: true,
          onboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updates.push(doc.id);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Fixed ${updates.length} users`,
      userIds: updates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
}
