import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
