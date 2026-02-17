import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

// Price ID mapping for subscription tiers
const PRICE_IDS: Record<string, Record<string, string>> = {
  tier1: {
    monthly: "price_1SzkYq3zToN8UgmiKlRDmqFj",
    annual: "price_1SzkYq3zToN8UgmiD4qzWq2Z",
  },
  tier2: {
    monthly: "price_1SzkaS3zToN8UgmiqY0FaEjZ",
    annual: "price_1SzkaS3zToN8Ugmi2TENTSxN",
  },
  tier3: {
    monthly: "price_1Szkc03zToN8UgmiSKbf7MNS",
    annual: "price_1Szkc03zToN8UgmiPP2tQFx7",
  },
};

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { uid, email } = await verifyAuth(req);
    const ip = getRequestIp(req);
    const limit = rateLimit(`stripe:checkout:${uid}:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const tier = body.tier || "tier1";
    const billingPeriod = body.billingPeriod || "monthly";

    // Get the correct price ID based on tier and billing period
    const tierPrices = PRICE_IDS[tier];
    if (!tierPrices) {
      return NextResponse.json({ ok: false, error: "Invalid tier selected" }, { status: 400 });
    }

    const priceId = tierPrices[billingPeriod];
    if (!priceId) {
      return NextResponse.json({ ok: false, error: "Invalid billing period" }, { status: 400 });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${baseUrl}/billing/success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${baseUrl}/pricing`;

    const successUrlWithSession = successUrl.includes("?")
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;

    // Create subscription checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrlWithSession,
      cancel_url: cancelUrl,
      client_reference_id: uid,
      customer_email: email,
      metadata: {
        uid,
        tier,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          uid,
          tier,
          billingPeriod,
        },
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
