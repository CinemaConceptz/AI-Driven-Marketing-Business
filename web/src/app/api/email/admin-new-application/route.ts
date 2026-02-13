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
    const limit = rateLimit(`email:admin-application:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ ok: false, error: "Missing ADMIN_NOTIFY_EMAIL" }, { status: 500 });
    }

    const payload = await req.json();
    const name = payload?.name || "";
    const genre = payload?.genre || "";
    const links = payload?.links || "";
    const goals = payload?.goals || "";

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    if (userData.paymentStatus !== "paid") {
      return NextResponse.json({ ok: false, error: "Payment required" }, { status: 402 });
    }

    const submissionRef = adminDb.collection("submissions").doc(uid);
    const submissionSnap = await submissionRef.get();

    if (submissionSnap.exists && submissionSnap.data()?.emailFlags?.adminNotifiedAt) {
      return NextResponse.json({ ok: true, skipped: true, submissionId: submissionRef.id });
    }

    await submissionRef.set(
      {
        uid,
        email: email || userData.email || "",
        name,
        genre,
        links,
        goals,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentStatus: "paid",
      },
      { merge: true }
    );

    await userRef.set(
      {
        applicationStatus: "new",
        applicationReviewNotes: null,
      },
      { merge: true }
    );

    const templateId = process.env.POSTMARK_TEMPLATE_ADMIN_NEW_APP_ID;
    let messageId: string | undefined;

    if (templateId) {
      const result = await sendWithTemplate({
        to: adminEmail,
        templateId,
        model: {
          uid,
          email: email || userData.email || "",
          name,
          genre,
          links,
          goals,
          submissionId: submissionRef.id,
          submittedAt: new Date().toISOString(),
        },
      });
      messageId = result.messageId;
    } else {
      const result = await sendTransactionalEmail({
        to: adminEmail,
        subject: "New Verified Sound A&R Application",
        html: `<p>New application received.</p><p>Name: ${name}</p><p>Email: ${email || ""}</p><p>UID: ${uid}</p><p>Submission: ${submissionRef.id}</p>`,
        text: `New application received. Name: ${name}. Email: ${email || ""}. UID: ${uid}. Submission: ${submissionRef.id}.`,
      });
      messageId = result.messageId;
    }

    await submissionRef.set(
      {
        emailFlags: {
          adminNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          adminNotifiedMessageId: messageId || null,
        },
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, submissionId: submissionRef.id });
  } catch (error: any) {
    console.error(`[email/admin-new-application] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
