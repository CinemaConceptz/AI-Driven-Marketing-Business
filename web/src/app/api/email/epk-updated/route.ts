import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail, sendWithTemplate } from "@/services/email/postmark";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);
    const limit = rateLimit(`email:epk:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const pressRef = userRef.collection("media").doc("press");

    const [userSnap, pressSnap] = await Promise.all([userRef.get(), pressRef.get()]);
    if (!pressSnap.exists) {
      return NextResponse.json({ ok: false, error: "Press media not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const pressData = pressSnap.data() || {};
    const targetEmail = email || userData.email;

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
    }

    const pressUpdatedAt = pressData.updatedAt || pressData.createdAt || pressSnap.updateTime;
    const lastSent = userData.emailFlags?.epkUpdatedLastSentAt;

    if (pressUpdatedAt && lastSent && pressUpdatedAt.toMillis() <= lastSent.toMillis()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const epkUrl = `${baseUrl}/epk`;

    const templateId = process.env.POSTMARK_TEMPLATE_EPK_UPDATED_ID;
    if (templateId) {
      await sendWithTemplate({
        to: targetEmail,
        templateId,
        model: {
          epkUrl,
          title: pressData.title || "Press Image",
          caption: pressData.caption || "",
          downloadUrl: pressData.downloadURL || "",
        },
      });
    } else {
      await sendTransactionalEmail({
        to: targetEmail,
        subject: "Your EPK was updated",
        html: `<p>Your EPK was updated.</p><p><a href="${epkUrl}">View EPK</a></p>`,
        text: `Your EPK was updated. View: ${epkUrl}`,
      });
    }

    await userRef.set(
      {
        emailFlags: {
          epkUpdatedLastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(`[email/epk-updated] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
