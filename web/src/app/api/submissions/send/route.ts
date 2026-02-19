import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendTransactionalEmail } from "@/services/email/postmark";
import { 
  getMonthlySubmissionCount, 
  createSubmissionLog, 
  updateSubmissionLog,
  getLabel 
} from "@/lib/submissions/queries";
import { getArtistPitch } from "@/lib/submissions/queries";
import { canSubmit, type SubmissionStatus } from "@/lib/submissions";
import { normalizeTier } from "@/lib/subscription";

// Verify user token and get user data
async function verifyUser(req: Request): Promise<{
  uid: string;
  email: string;
  tier: string;
  status: string;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    
    // Get user data
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    
    const userData = userDoc.data()!;
    
    return {
      uid: decoded.uid,
      email: userData.email || decoded.email || "",
      tier: userData.subscriptionTier || userData.tier || "tier1",
      status: userData.subscriptionStatus || "active",
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/submissions/send
 * Send a submission to a label (Mode C - Email)
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { labelId, pitchType = "medium", customMessage } = body;

    if (!labelId) {
      return NextResponse.json({ error: "Label ID required" }, { status: 400 });
    }

    // Check submission limit
    const monthlyCount = await getMonthlySubmissionCount(user.uid);
    const limitCheck = canSubmit(monthlyCount, user.tier, user.status);

    if (!limitCheck.allowed) {
      return NextResponse.json({
        ok: false,
        error: `Monthly submission limit reached (${limitCheck.limit}/${limitCheck.limit}). Upgrade your tier for more submissions.`,
        remaining: 0,
        limit: limitCheck.limit,
      }, { status: 429 });
    }

    // Get label info
    const label = await getLabel(labelId);
    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (label.submissionMethod !== "email" || !label.submissionEmail) {
      return NextResponse.json({ 
        error: "This label does not accept email submissions" 
      }, { status: 400 });
    }

    // Get user's pitch
    const pitch = await getArtistPitch(user.uid);
    if (!pitch) {
      return NextResponse.json({
        error: "Please generate your pitch first",
      }, { status: 400 });
    }

    // Select pitch content based on type
    let pitchContent: string;
    switch (pitchType) {
      case "short":
        pitchContent = pitch.shortPitch;
        break;
      case "long":
      case "medium":
      default:
        pitchContent = pitch.mediumPitch;
    }

    // Append custom message if provided
    if (customMessage) {
      pitchContent = `${pitchContent}\n\n${customMessage}`;
    }

    // Build email HTML
    const emailHtml = buildSubmissionEmailHtml({
      labelName: label.name,
      artistName: pitch.artistName,
      genre: pitch.genre,
      pitchContent,
      trackUrl: pitch.trackUrl,
      epkUrl: pitch.epkUrl,
      spotifyUrl: pitch.spotifyUrl,
      soundcloudUrl: pitch.soundcloudUrl,
      contactEmail: pitch.contactEmail,
    });

    const emailText = buildSubmissionEmailText({
      artistName: pitch.artistName,
      pitchContent,
      trackUrl: pitch.trackUrl,
      epkUrl: pitch.epkUrl,
      contactEmail: pitch.contactEmail,
    });

    // Create submission log first (status: pending)
    const submissionId = await createSubmissionLog({
      userId: user.uid,
      labelId: label.id,
      labelName: label.name,
      method: "email",
      status: "pending",
      sentTo: label.submissionEmail,
      sentFrom: pitch.contactEmail,
      subject: pitch.subjectLine,
      pitchUsed: pitchType as "short" | "medium" | "long",
    });

    let status: SubmissionStatus = "pending";
    let messageId: string | undefined;

    try {
      // Send email via Postmark
      // Note: The "From" address must be a verified sender in Postmark
      // For now, we send from the platform but include reply-to as the artist
      const result = await sendTransactionalEmail({
        to: label.submissionEmail,
        subject: pitch.subjectLine,
        html: emailHtml,
        text: emailText,
        uid: user.uid,
        emailType: "label-submission",
        meta: {
          labelId: label.id,
          labelName: label.name,
          submissionId,
        },
      });

      messageId = result.messageId;
      status = "sent";

      // Update submission log
      await updateSubmissionLog(submissionId, {
        status: "sent",
        postmarkMessageId: messageId,
      });
    } catch (emailError: any) {
      status = "failed";
      await updateSubmissionLog(submissionId, {
        status: "failed",
        notes: emailError?.message || "Email send failed",
      });

      return NextResponse.json({
        ok: false,
        error: "Failed to send submission email. Please try again.",
        submissionId,
        status: "failed",
      }, { status: 500 });
    }

    // Track event
    try {
      await adminDb.collection("funnelEvents").add({
        event: "submission_sent",
        userId: user.uid,
        metadata: {
          labelId: label.id,
          labelName: label.name,
          method: "email",
          tier: user.tier,
        },
        timestamp: new Date(),
        source: "server",
      });
    } catch {
      // Don't fail if tracking fails
    }

    return NextResponse.json({
      ok: true,
      submissionId,
      status,
      messageId,
      remaining: limitCheck.remaining - 1,
      limit: limitCheck.limit,
      message: `Submission sent to ${label.name}`,
    });
  } catch (error: any) {
    console.error("[api/submissions/send] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to send submission" },
      { status: 500 }
    );
  }
}

// ============================================
// Email HTML Builder
// ============================================

interface EmailParams {
  labelName: string;
  artistName: string;
  genre: string;
  pitchContent: string;
  trackUrl: string;
  epkUrl: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  contactEmail: string;
}

function buildSubmissionEmailHtml(params: EmailParams): string {
  const links: string[] = [];
  
  links.push(`<a href="${params.trackUrl}" style="color:#10b981;text-decoration:none;">Featured Track</a>`);
  links.push(`<a href="${params.epkUrl}" style="color:#10b981;text-decoration:none;">Full EPK</a>`);
  
  if (params.spotifyUrl) {
    links.push(`<a href="${params.spotifyUrl}" style="color:#10b981;text-decoration:none;">Spotify</a>`);
  }
  if (params.soundcloudUrl) {
    links.push(`<a href="${params.soundcloudUrl}" style="color:#10b981;text-decoration:none;">SoundCloud</a>`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="white-space:pre-wrap;font-size:15px;">${escapeHtml(params.pitchContent)}</div>
    
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e5e5;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#666;">
        <strong>Links:</strong> ${links.join(" | ")}
      </p>
      <p style="margin:0;font-size:14px;color:#666;">
        <strong>Contact:</strong> ${params.contactEmail}
      </p>
    </div>
    
    <div style="margin-top:32px;font-size:12px;color:#999;">
      <p style="margin:0;">
        This submission was sent via Verified Sound A&R on behalf of ${escapeHtml(params.artistName)}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildSubmissionEmailText(params: Omit<EmailParams, "labelName" | "genre" | "spotifyUrl" | "soundcloudUrl">): string {
  return `${params.pitchContent}

---
Links:
- Featured Track: ${params.trackUrl}
- Full EPK: ${params.epkUrl}

Contact: ${params.contactEmail}

---
This submission was sent via Verified Sound A&R on behalf of ${params.artistName}.`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}
