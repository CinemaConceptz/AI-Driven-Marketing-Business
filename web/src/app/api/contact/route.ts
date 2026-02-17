import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/services/email/postmark";

// Input validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, ""); // Strip HTML tags
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Rate limiting by IP (stricter for contact form)
    const ip = getRequestIp(req);
    const limit = rateLimit(`contact:${ip}`, 5, 60000); // 5 per minute
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, subject, message, artistUid } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid name" },
        { status: 400 }
      );
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "Please provide a message (at least 10 characters)" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedSubject = sanitizeInput(subject || "EPK Inquiry", 200);
    const sanitizedMessage = sanitizeInput(message, 5000);

    // Determine recipient
    let recipientEmail = process.env.ADMIN_NOTIFY_EMAIL;
    let artistName = "Verified Sound";

    // If artistUid provided, look up artist's contact email
    if (artistUid) {
      try {
        const artistDoc = await adminDb.collection("users").doc(artistUid).get();
        if (artistDoc.exists) {
          const artistData = artistDoc.data();
          recipientEmail = artistData?.contactEmail || artistData?.email || recipientEmail;
          artistName = artistData?.artistName || artistData?.displayName || "Artist";
        }
      } catch (err) {
        console.error(`[contact] Failed to lookup artist ${artistUid}:`, err);
      }
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { ok: false, error: "Unable to send message. Please try again later." },
        { status: 500 }
      );
    }

    // Log inquiry to Firestore
    const inquiryRef = adminDb.collection("contactInquiries").doc();
    await inquiryRef.set({
      name: sanitizedName,
      email: sanitizedEmail,
      subject: sanitizedSubject,
      message: sanitizedMessage,
      artistUid: artistUid || null,
      ip,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email notification
    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    
    await sendTransactionalEmail({
      to: recipientEmail,
      subject: `[EPK Inquiry] ${sanitizedSubject}`,
      html: `
        <h2>New EPK Inquiry</h2>
        <p><strong>From:</strong> ${sanitizedName} (${sanitizedEmail})</p>
        <p><strong>Subject:</strong> ${sanitizedSubject}</p>
        <hr/>
        <p>${sanitizedMessage.replace(/\n/g, "<br/>")}</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">
          This inquiry was sent via your EPK on Verified Sound A&R.<br/>
          Reply directly to this email to respond to ${sanitizedName}.
        </p>
      `,
      text: `
New EPK Inquiry

From: ${sanitizedName} (${sanitizedEmail})
Subject: ${sanitizedSubject}

${sanitizedMessage}

---
This inquiry was sent via your EPK on Verified Sound A&R.
Reply directly to this email to respond to ${sanitizedName}.
      `,
      emailType: "contact_inquiry",
      meta: {
        inquiryId: inquiryRef.id,
        artistUid,
        senderName: sanitizedName,
        senderEmail: sanitizedEmail,
      },
    });

    // Update inquiry status
    await inquiryRef.update({
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, inquiryId: inquiryRef.id });
  } catch (error: any) {
    console.error(`[contact] requestId=${requestId}`, error?.message || error);

    return NextResponse.json(
      { ok: false, error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
