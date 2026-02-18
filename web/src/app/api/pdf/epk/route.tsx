import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { EpkPdfDocument, type EpkPdfData } from "@/lib/pdf/EpkPdfTemplate";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30 second timeout for PDF generation

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Verify authentication
    const { uid, email } = await verifyAuth(req);
    
    // Rate limiting (5 PDFs per hour per user)
    const ip = getRequestIp(req);
    const limit = rateLimit(`pdf-epk:${uid}:${ip}`, 5, 3600000);
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
    const tier = userData.subscriptionTier || "tier1";
    
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
      stats: userData.stats || undefined,
      links: userData.links || undefined,
      pressImages,
      tier: tier as "tier1" | "tier2" | "tier3",
      brandColor: tier === "tier3" ? userData.brandColor : undefined,
      logoUrl: tier === "tier3" ? userData.logoUrl : undefined,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(EpkPdfDocument, { data: pdfData })
    );

    // Log PDF generation
    await adminDb.collection("pdfDownloads").add({
      uid,
      tier,
      generatedAt: new Date(),
      ip,
      fileSize: pdfBuffer.length,
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
