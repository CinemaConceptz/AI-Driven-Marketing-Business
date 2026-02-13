import { NextResponse } from "next/server";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const internalKey = process.env.EMAIL_TEST_KEY;
    const headerKey = req.headers.get("x-email-test-key");

    if (!internalKey || headerKey !== internalKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`email:send:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const token = process.env.POSTMARK_SERVER_TOKEN;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL;
    const fromName = process.env.POSTMARK_FROM_NAME || "Verified Sound A&R";

    if (!token || !fromEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_SERVER_TOKEN or POSTMARK_FROM_EMAIL" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const to = body?.to;
    const subject = body?.subject || "Verified Sound A&R Test";
    const text = body?.text || "Postmark test email.";

    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing 'to' field" }, { status: 400 });
    }

    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: `${fromName} <${fromEmail}>`,
        To: to,
        Subject: subject,
        TextBody: text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.Message || "Postmark request failed", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, messageId: data?.MessageID || null });
  } catch (error: any) {
    console.error(`[email/send] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
