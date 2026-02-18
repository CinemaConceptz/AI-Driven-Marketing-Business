import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import admin from "firebase-admin";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { EpkPdfDocument, type EpkPdfData, type EpkTier, type TrackInfo } from "@/lib/pdf/EpkPdfTemplate";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for PDF generation

// Generate QR code as data URL
async function generateQRCode(url: string): Promise<string | undefined> {
  try {
    return await QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: "#10b981", light: "#00000000" },
    });
  } catch {
    return undefined;
  }
}

// Get cached PDF path
function getCachePath(uid: string): string {
  return `epk-pdfs/${uid}/epk-latest.pdf`;
}

// Check if cached PDF exists and is recent
async function getCachedPdf(uid: string, tier: EpkTier): Promise<Buffer | null> {
  // Only cache for Tier II and III
  if (tier === "tier1") return null;
  
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(getCachePath(uid));
    const [exists] = await file.exists();
    
    if (!exists) return null;
    
    // Check if cache is less than 1 hour old
    const [metadata] = await file.getMetadata();
    const updatedAt = new Date(metadata.updated as string);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (updatedAt < hourAgo) return null;
    
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error("[pdf/epk] Cache read error:", error);
    return null;
  }
}

// Save PDF to cache
async function cachePdf(uid: string, buffer: Buffer, tier: EpkTier): Promise<void> {
  // Only cache for Tier II and III
  if (tier === "tier1") return;
  
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(getCachePath(uid));
    await file.save(buffer, {
      contentType: "application/pdf",
      metadata: {
        cacheControl: "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[pdf/epk] Cache write error:", error);
  }
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Verify authentication
    const { uid, email } = await verifyAuth(req);
    
    // Rate limiting based on tier
    const ip = getRequestIp(req);
    const limit = rateLimit(`pdf-epk:${uid}:${ip}`, 10, 3600000); // 10 per hour
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Fetch user data
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    
    // Determine subscription tier
    const tier: EpkTier = (userData.subscriptionTier as EpkTier) || "tier1";
    
    // Check subscription status
    const subStatus = userData.subscriptionStatus || userData.paymentStatus;
    if (subStatus !== "active" && subStatus !== "paid" && subStatus !== "trialing") {
      return NextResponse.json(
        { ok: false, error: "Active subscription required to download PDF" },
        { status: 403 }
      );
    }
    
    // Check for cached PDF (Tier II & III only)
    const forceRegenerate = req.headers.get("x-force-regenerate") === "true";
    if (!forceRegenerate) {
      const cached = await getCachedPdf(uid, tier);
      if (cached) {
        // Log cached download
        await adminDb.collection("pdfDownloads").add({
          uid,
          tier,
          cached: true,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ip,
          fileSize: cached.length,
        });
        
        const filename = `${(userData.artistName || "Artist").replace(/[^a-zA-Z0-9]/g, "_")}_EPK.pdf`;
        return new NextResponse(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": cached.length.toString(),
            "X-Cache": "HIT",
          },
        });
      }
    }

    // Fetch press images
    const mediaSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("media")
      .orderBy("sortOrder", "asc")
      .limit(6)
      .get();

    const pressImages = mediaSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        url: data.downloadURL,
        width: data.width || 500,
        height: data.height || 500,
      };
    });

    // Build tracks with QR codes (Tier II & III)
    let tracks: TrackInfo[] | undefined;
    if (userData.tracks && Array.isArray(userData.tracks)) {
      tracks = await Promise.all(
        userData.tracks.slice(0, tier === "tier1" ? 3 : 5).map(async (track: any) => {
          const trackInfo: TrackInfo = {
            title: track.title || "Untitled",
            description: track.description,
            streamingUrl: track.streamingUrl || track.url,
          };
          
          // Generate QR codes for Tier II & III
          if (tier !== "tier1" && trackInfo.streamingUrl) {
            trackInfo.qrCodeDataUrl = await generateQRCode(trackInfo.streamingUrl);
          }
          
          return trackInfo;
        })
      );
    }

    // Build PDF data
    const pdfData: EpkPdfData = {
      artistName: userData.artistName || userData.displayName || "Artist",
      tagline: userData.tagline || userData.genre || undefined,
      bio: userData.bio || undefined,
      genre: userData.genre || undefined,
      location: userData.location || undefined,
      contactEmail: userData.contactEmail || email || undefined,
      website: userData.links?.website || undefined,
      quote: userData.quote || undefined,
      achievements: userData.achievements || undefined,
      tracks,
      pressQuotes: tier === "tier3" ? userData.pressQuotes : undefined,
      stats: userData.stats || undefined,
      links: userData.links || undefined,
      pressImages,
      tier,
      brandSettings: tier === "tier3" ? userData.brandSettings : undefined,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(EpkPdfDocument, { data: pdfData })
    );
    
    const generationTime = Date.now() - startTime;

    // Cache PDF for Tier II & III
    await cachePdf(uid, pdfBuffer, tier);

    // Log PDF generation with analytics
    await adminDb.collection("pdfDownloads").add({
      uid,
      tier,
      cached: false,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ip,
      fileSize: pdfBuffer.length,
      generationDuration: generationTime,
      imageCount: pressImages.length,
      trackCount: tracks?.length || 0,
    });

    // Generate filename
    const filename = `${pdfData.artistName.replace(/[^a-zA-Z0-9]/g, "_")}_EPK.pdf`;

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, max-age=0",
        "X-Cache": "MISS",
        "X-Generation-Time": `${generationTime}ms`,
      },
    });
  } catch (error: any) {
    console.error(`[pdf/epk] requestId=${requestId}`, error?.message || error);

    if (error?.message === "Unauthorized") {
      return NextResponse.json(
        { ok: false, error: "Please log in to download your EPK" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to generate PDF. Please try again." },
      { status: 500 }
    );
  }
}

// POST endpoint to regenerate PDF (clears cache)
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    const { uid } = await verifyAuth(req);
    
    // Rate limit regeneration
    const ip = getRequestIp(req);
    const limit = rateLimit(`pdf-regen:${uid}:${ip}`, 3, 3600000); // 3 per hour
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Regeneration limit reached. Try again later." },
        { status: 429 }
      );
    }
    
    // Delete cached PDF
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file(getCachePath(uid));
      await file.delete();
    } catch (error) {
      // Ignore if doesn't exist
    }
    
    // Redirect to GET to regenerate
    return NextResponse.json({ ok: true, message: "Cache cleared. Download again to regenerate." });
  } catch (error: any) {
    console.error(`[pdf/epk] regenerate requestId=${requestId}`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to regenerate" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
