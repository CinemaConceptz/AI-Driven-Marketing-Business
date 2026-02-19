import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

type PostmarkWebhookEvent = {
  RecordType: "Bounce" | "SpamComplaint" | "SubscriptionChange";
  MessageID: string;
  Email: string;
  BouncedAt?: string;
  Type?: string;
  TypeCode?: number;
  Description?: string;
  Details?: string;
  Tag?: string;
  Subject?: string;
  ServerID?: number;
  MessageStream?: string;
  // Spam complaint specific
  ChangedAt?: string;
  // Subscription change specific
  SuppressSending?: boolean;
  SuppressionReason?: string;
};

/**
 * Postmark Webhook Handler
 * Receives bounce, spam complaint, and subscription change events
 */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    const event: PostmarkWebhookEvent = await req.json();
    
    console.log(`[postmark-webhook] ${requestId} Received ${event.RecordType} for ${event.Email}`);

    // Log to Firestore
    await adminDb.collection("emailWebhooks").add({
      requestId,
      recordType: event.RecordType,
      email: event.Email,
      messageId: event.MessageID,
      type: event.Type || null,
      typeCode: event.TypeCode || null,
      description: event.Description || null,
      subject: event.Subject || null,
      tag: event.Tag || null,
      suppressSending: event.SuppressSending || null,
      suppressionReason: event.SuppressionReason || null,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: JSON.stringify(event),
    });

    // Handle bounces - mark email as invalid
    if (event.RecordType === "Bounce") {
      const bounceType = event.Type || "Unknown";
      const isHardBounce = event.TypeCode && event.TypeCode >= 1 && event.TypeCode <= 99;
      
      console.log(`[postmark-webhook] Bounce: ${bounceType} (code: ${event.TypeCode}) - Hard: ${isHardBounce}`);
      
      // Find user by email and mark as bounced
      const usersSnapshot = await adminDb
        .collection("users")
        .where("email", "==", event.Email)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          emailBounced: true,
          emailBounceType: bounceType,
          emailBounceCode: event.TypeCode || null,
          emailBouncedAt: admin.firestore.FieldValue.serverTimestamp(),
          emailBounceDescription: event.Description || null,
        });
        console.log(`[postmark-webhook] Marked user ${userDoc.id} email as bounced`);
      }
    }

    // Handle spam complaints - suppress future emails
    if (event.RecordType === "SpamComplaint") {
      console.log(`[postmark-webhook] Spam complaint from ${event.Email}`);
      
      const usersSnapshot = await adminDb
        .collection("users")
        .where("email", "==", event.Email)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          emailSpamComplaint: true,
          emailSpamComplaintAt: admin.firestore.FieldValue.serverTimestamp(),
          emailSuppressed: true,
        });
        console.log(`[postmark-webhook] Suppressed emails for user ${userDoc.id}`);
      }
    }

    // Handle subscription changes (unsubscribe)
    if (event.RecordType === "SubscriptionChange") {
      console.log(`[postmark-webhook] Subscription change for ${event.Email}: suppress=${event.SuppressSending}`);
      
      const usersSnapshot = await adminDb
        .collection("users")
        .where("email", "==", event.Email)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          emailSuppressed: event.SuppressSending || false,
          emailSuppressionReason: event.SuppressionReason || null,
          emailSuppressionChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (error: any) {
    console.error(`[postmark-webhook] ${requestId} Error:`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// Postmark sends GET to verify endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "postmark-webhook" });
}
