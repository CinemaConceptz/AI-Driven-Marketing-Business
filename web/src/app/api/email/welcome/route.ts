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
    const limit = rateLimit(`email:welcome:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const targetEmail = email || userData.email;

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: "Missing user email" }, { status: 400 });
    }

    if (userData.emailFlags?.welcomeSentAt) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const dashboardUrl = `${baseUrl}/dashboard`;
    const mediaUrl = `${baseUrl}/media`;

    const templateId = process.env.POSTMARK_TEMPLATE_WELCOME_ID;
    if (templateId) {
      await sendWithTemplate({
        to: targetEmail,
        templateId,
        model: {
          dashboardUrl,
          mediaUrl,
          name: userData.artistName || userData.displayName || "",
        },
      });
    } else {
      await sendTransactionalEmail({
        to: targetEmail,
        subject: "Welcome to Verified Sound A&R",
        html: `<p>Welcome to Verified Sound A&R.</p><p>Start here: <a href="${dashboardUrl}">Dashboard</a> or upload media in <a href="${mediaUrl}">Media</a>.</p>`,
        text: `Welcome to Verified Sound A&R. Dashboard: ${dashboardUrl} Media: ${mediaUrl}`,
      });
    }

    await userRef.set(
      {
        emailFlags: {
          welcomeSentAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        email: targetEmail,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(`[email/welcome] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
