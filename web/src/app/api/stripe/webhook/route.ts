import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getStripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebaseAdmin";


export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ ok: false, error: "Missing webhook secret" }, { status: 400 });
    }

    const body = await req.text();
    const event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const sessionId = session.id as string;
      const uid = session.client_reference_id || session.metadata?.uid;


      if (uid) {
        await adminDb.collection("users").doc(uid).set(
          {
            paymentStatus: "paid",
            paymentPaidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await adminDb.collection("payments").doc(sessionId).set(
        {
          uid: uid || null,
          status: "paid",
          amountTotal: session.amount_total,
          currency: session.currency,
          customerEmail: session.customer_email || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );


    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(`[stripe/webhook] requestId=${requestId}`, error?.message || error);
    return NextResponse.json({ ok: false, error: "Webhook error" }, { status: 400 });
  }
}
