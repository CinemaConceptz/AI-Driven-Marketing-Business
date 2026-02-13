import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/services/email/postmark";

export async function POST(req: Request) {
  try {
    const testKey = process.env.EMAIL_TEST_KEY;
    if (!testKey) {
      return NextResponse.json(
        { ok: false, error: "Missing EMAIL_TEST_KEY" },
        { status: 500 }
      );
    }

    const headerKey = req.headers.get("x-email-test-key");
    if (!headerKey || headerKey !== testKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const to = body?.to;
    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing 'to' field" }, { status: 400 });
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
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
