import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getLabels } from "@/lib/submissions/queries";
import { rankLabelsByGenreMatch } from "@/lib/submissions";

// Verify user token
async function verifyUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/submissions/recommend
 * Get AI-recommended labels based on artist's genre
 */
export async function GET(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    // Get user's genre info
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const userGenres: string[] = [];

    // Collect all user genres
    if (userData.genre) {
      userGenres.push(userData.genre);
    }
    if (userData.subGenres && Array.isArray(userData.subGenres)) {
      userGenres.push(...userData.subGenres);
    }

    if (userGenres.length === 0) {
      return NextResponse.json({
        ok: true,
        recommendations: [],
        message: "Please add your genre in your profile to get recommendations",
      });
    }

    // Get all active labels with email submission
    const labels = await getLabels({
      activeOnly: true,
      limit: 200, // Get more to filter
    });

    // Filter to only labels that accept submissions
    const submittableLabels = labels.filter(
      l => l.submissionMethod === "email" && l.submissionEmail
    );

    // Rank by genre match
    const rankedLabels = rankLabelsByGenreMatch(userGenres, submittableLabels);

    // Return top recommendations
    const recommendations = rankedLabels.slice(0, limit).map(label => ({
      id: label.id,
      name: label.name,
      genres: label.genres,
      matchScore: label.matchScore,
      submissionMethod: label.submissionMethod,
      website: label.website,
      country: label.country,
    }));

    return NextResponse.json({
      ok: true,
      recommendations,
      userGenres,
      totalMatches: rankedLabels.length,
    });
  } catch (error: any) {
    console.error("[api/submissions/recommend] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
