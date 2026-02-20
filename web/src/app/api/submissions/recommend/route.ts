import { NextResponse } from "next/server";
import { verifyAuth, adminDb } from "@/lib/firebaseAdmin";

type Label = {
  id: string;
  name: string;
  genres: string[];
  submissionMethod: string;
  submissionEmail?: string;
  submissionUrl?: string;
  website?: string;
  country?: string;
  tier?: string;
  notes?: string;
};

type UserProfile = {
  artistName?: string;
  genre?: string;
  genres?: string[];
  epkContent?: {
    styleDescription?: string;
  };
  epkEnhanced?: boolean;
};

function calculateMatchScore(label: Label, userGenres: string[], styleDescription: string): number {
  let score = 0;
  const labelGenresLower = label.genres.map(g => g.toLowerCase());
  const userGenresLower = userGenres.map(g => g.toLowerCase());
  const styleLower = styleDescription.toLowerCase();

  // Genre matching (up to 60 points)
  for (const userGenre of userGenresLower) {
    for (const labelGenre of labelGenresLower) {
      // Exact match
      if (userGenre === labelGenre) {
        score += 20;
      }
      // Partial match (e.g., "Deep House" matches "House")
      else if (userGenre.includes(labelGenre) || labelGenre.includes(userGenre)) {
        score += 10;
      }
      // Style description contains the genre
      else if (styleLower.includes(labelGenre)) {
        score += 5;
      }
    }
  }

  // Cap genre score at 60
  score = Math.min(score, 60);

  // Tier bonus (up to 20 points)
  if (label.tier) {
    const tierLower = label.tier.toLowerCase();
    if (tierLower.includes("indie") || tierLower.includes("boutique")) {
      score += 20; // More likely to accept new artists
    } else if (tierLower.includes("mid")) {
      score += 15;
    } else if (tierLower.includes("major")) {
      score += 10;
    }
  } else {
    score += 15; // Default mid-tier assumption
  }

  // Submission method bonus (up to 10 points)
  if (label.submissionEmail) {
    score += 10; // Email submissions are easier
  } else if (label.submissionUrl) {
    score += 5; // Webform available
  }

  // Active accepting demos (up to 10 points)
  if (label.notes?.toLowerCase().includes("accepting") || 
      label.notes?.toLowerCase().includes("open for")) {
    score += 10;
  }

  // Normalize to 0-100
  return Math.min(Math.round(score), 100);
}

export async function GET(req: Request) {
  try {
    const { uid } = await verifyAuth(req);

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ ok: true, recommendations: [] });
    }

    const profile = userDoc.data() as UserProfile;

    // Check if EPK has been generated
    if (!profile.epkEnhanced) {
      return NextResponse.json({
        ok: true,
        recommendations: [],
        message: "Generate your AI EPK first to get personalized label recommendations.",
        requiresEpk: true,
      });
    }

    // Get user genres
    const userGenres = profile.genres?.length 
      ? profile.genres 
      : (profile.genre ? [profile.genre] : []);

    if (userGenres.length === 0) {
      return NextResponse.json({
        ok: true,
        recommendations: [],
        message: "Please add genres to your profile to get recommendations.",
      });
    }

    const styleDescription = profile.epkContent?.styleDescription || "";

    // Fetch all labels from the database
    const labelsSnapshot = await adminDb.collection("labels").get();
    const labels: Label[] = [];

    labelsSnapshot.forEach((doc) => {
      const data = doc.data();
      labels.push({
        id: doc.id,
        name: data.name,
        genres: data.genres || [],
        submissionMethod: data.submissionMethod || "unknown",
        submissionEmail: data.submissionEmail,
        submissionUrl: data.submissionUrl,
        website: data.website,
        country: data.country,
        tier: data.tier,
        notes: data.notes,
      });
    });

    // Calculate match scores and filter
    const scoredLabels = labels
      .map((label) => ({
        ...label,
        matchScore: calculateMatchScore(label, userGenres, styleDescription),
      }))
      .filter((label) => label.matchScore > 0) // Only include labels with some match
      .sort((a, b) => b.matchScore - a.matchScore) // Sort by score descending
      .slice(0, 20); // Top 20 recommendations

    return NextResponse.json({
      ok: true,
      recommendations: scoredLabels,
      totalLabels: labels.length,
      userGenres,
    });

  } catch (error: any) {
    console.error("[submissions/recommend] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to get recommendations" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
