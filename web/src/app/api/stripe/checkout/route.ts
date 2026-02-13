import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { verifyAuth } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const priceId = process.env.STRIPE_PRICE_ID;
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${baseUrl}/apply/success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${baseUrl}/pricing`;

    if (!priceId) {
      return NextResponse.json({ ok: false, error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
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
