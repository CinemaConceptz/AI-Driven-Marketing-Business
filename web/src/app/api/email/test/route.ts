import { NextResponse } from "next/server";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const testKey = process.env.EMAIL_TEST_KEY;
    const headerKey = req.headers.get("x-email-test-key");

    if (process.env.NODE_ENV === "production" && (!headerKey || headerKey !== testKey)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (!testKey) {
      return NextResponse.json(
        { ok: false, error: "Missing EMAIL_TEST_KEY" },
        { status: 500 }
      );
    }

    if (!headerKey || headerKey !== testKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`email:test:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const to = body?.to;
    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing 'to' field" }, { status: 400 });
    }

    const fromEmail = process.env.POSTMARK_FROM_EMAIL;
    const messageStream = process.env.POSTMARK_MESSAGE_STREAM;
    if (!fromEmail || !messageStream) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_FROM_EMAIL or POSTMARK_MESSAGE_STREAM" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const timestamp = new Date().toISOString();

    const result = await sendTransactionalEmail({
      to,
      subject: "Postmark test - VerifiedSoundAR",
      html: `<p>Postmark test email.</p><p>Env: ${process.env.NODE_ENV}</p><p>Time: ${timestamp}</p><p>App: ${baseUrl}</p>`,
      text: `Postmark test email. Env: ${process.env.NODE_ENV}. Time: ${timestamp}. App: ${baseUrl}`,
    });

    return NextResponse.json({ ok: true, messageId: result.messageId || null });
  } catch (error: any) {
    console.error(`[email/test] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
