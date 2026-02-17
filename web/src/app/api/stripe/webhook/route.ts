import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getStripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import Stripe from "stripe";

// Map Stripe subscription status to app status
function mapSubscriptionStatus(status: string): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return status;
  }
}

// Extract tier from metadata or price
function extractTier(subscription: Stripe.Subscription): string {
  // Try metadata first
  if (subscription.metadata?.tier) {
    return subscription.metadata.tier;
  }
  
  // Try to determine from price ID
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    if (priceId.includes("SzkYq")) return "tier1";
    if (priceId.includes("SzkaS")) return "tier2";
    if (priceId.includes("Szkc0")) return "tier3";
  }
  
  return "tier1"; // Default
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error(`[stripe/webhook] Missing signature or secret`);
      return NextResponse.json({ ok: false, error: "Missing webhook config" }, { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`[stripe/webhook] Signature verification failed:`, err.message);
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[stripe/webhook] Processing event: ${event.type} (${event.id})`);

    // Handle checkout session completed (initial subscription)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const uid = session.client_reference_id || session.metadata?.uid;
      const tier = session.metadata?.tier || "tier1";
      const billingPeriod = session.metadata?.billingPeriod || "monthly";

      // Record payment
      await adminDb.collection("payments").doc(sessionId).set({
        uid: uid || null,
        type: "checkout",
        status: "completed",
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email || null,
        customerId: session.customer || null,
        subscriptionId: session.subscription || null,
        tier,
        billingPeriod,
        stripeEventId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Update user subscription status
      if (uid) {
        await adminDb.collection("users").doc(uid).set({
          paymentStatus: "paid",
          subscriptionStatus: "active",
          subscriptionTier: tier,
          subscriptionBillingPeriod: billingPeriod,
          subscriptionId: session.subscription || null,
          stripeCustomerId: session.customer || null,
          paymentPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    // Handle subscription updates (upgrade/downgrade, renewal)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata?.uid;
      const tier = extractTier(subscription);
      const status = mapSubscriptionStatus(subscription.status);

      if (uid) {
        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: status,
          subscriptionTier: tier,
          subscriptionCurrentPeriodEnd: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000) 
            : null,
          subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
          subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // Log subscription change
      await adminDb.collection("payments").add({
        uid: uid || null,
        type: "subscription_update",
        subscriptionId: subscription.id,
        status,
        tier,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
        stripeEventId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata?.uid;

      if (uid) {
        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "canceled",
          paymentStatus: "canceled",
          subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // Log cancellation
      await adminDb.collection("payments").add({
        uid: uid || null,
        type: "subscription_canceled",
        subscriptionId: subscription.id,
        stripeEventId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Handle payment failures
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      // Try to get uid from subscription metadata
      let uid: string | null = null;
      if (subscriptionId) {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          uid = subscription.metadata?.uid || null;
        } catch (err) {
          console.error(`[stripe/webhook] Failed to retrieve subscription:`, err);
        }
      }

      if (uid) {
        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "past_due",
          paymentStatus: "past_due",
          lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // Log payment failure
      await adminDb.collection("payments").add({
        uid: uid || null,
        type: "payment_failed",
        subscriptionId,
        invoiceId: invoice.id,
        amountDue: invoice.amount_due,
        stripeEventId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Handle successful invoice payment (subscription renewal)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      // Skip if this is the first payment (handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") {
        return NextResponse.json({ ok: true, skipped: "initial_payment" });
      }

      let uid: string | null = null;
      if (subscriptionId) {
        try {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          uid = subscription.metadata?.uid || null;
        } catch (err) {
          console.error(`[stripe/webhook] Failed to retrieve subscription:`, err);
        }
      }

      if (uid) {
        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "active",
          paymentStatus: "paid",
          lastPaymentSucceededAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // Log renewal payment
      await adminDb.collection("payments").add({
        uid: uid || null,
        type: "renewal",
        subscriptionId,
        invoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        stripeEventId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true, event: event.type });
  } catch (error: any) {
    console.error(`[stripe/webhook] requestId=${requestId}`, error?.message || error);
    return NextResponse.json({ ok: false, error: "Webhook processing error" }, { status: 500 });
  }
}
