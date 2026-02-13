import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);
    const limit = rateLimit(`stripe:checkout:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${baseUrl}/apply/success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${baseUrl}/pricing`;

    if (!priceId) {
      return NextResponse.json({ ok: false, error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    }

    const successUrlWithSession = successUrl.includes("?")
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrlWithSession,
      cancel_url: cancelUrl,
      client_reference_id: uid,
      customer_email: email,
      metadata: {
        uid,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error: any) {
    console.error(`[stripe/checkout] requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
