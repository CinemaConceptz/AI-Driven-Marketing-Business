import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { generatePitches, type PitchInput } from "@/lib/submissions/pitchGenerator";
import { saveArtistPitch, getArtistPitch } from "@/lib/submissions/queries";

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
 * GET /api/submissions/pitch
 * Get user's current pitch content
 */
export async function GET(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pitch = await getArtistPitch(uid);

    if (!pitch) {
      return NextResponse.json({
        ok: true,
        pitch: null,
        message: "No pitch generated yet",
      });
    }

    return NextResponse.json({
      ok: true,
      pitch,
    });
  } catch (error: any) {
    console.error("[api/submissions/pitch] GET error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch pitch" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/submissions/pitch
 * Generate or regenerate pitch content
 */
export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const forceRegenerate = body.forceRegenerate === true;

    // Get user profile data
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const baseUrl = process.env.APP_BASE_URL || "https://verifiedsoundar.com";
    const epkSlug = userData.epkSlug || uid;

    // Check if pitch already exists and is recent (within 24 hours)
    if (!forceRegenerate) {
      const existingPitch = await getArtistPitch(uid);
      if (existingPitch) {
        const hoursSinceGeneration = 
          (Date.now() - existingPitch.generatedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceGeneration < 24) {
          return NextResponse.json({
            ok: true,
            pitch: existingPitch,
            cached: true,
            message: "Using cached pitch (regenerate available in " + 
              Math.round(24 - hoursSinceGeneration) + " hours)",
          });
        }
      }
    }

    // Build pitch input from user data
    const pitchInput: PitchInput = {
      artistName: userData.artistName || userData.displayName || "Artist",
      genre: userData.genre || "Electronic",
      subGenres: userData.subGenres || [],
      bio: userData.bio || undefined,
      trackTitle: body.trackTitle || userData.featuredTrack || undefined,
      trackUrl: body.trackUrl || userData.featuredTrackUrl || userData.spotifyUrl || userData.soundcloudUrl || "",
      spotifyUrl: userData.spotifyUrl || undefined,
      soundcloudUrl: userData.soundcloudUrl || undefined,
      monthlyListeners: userData.monthlyListeners || undefined,
      pressHighlights: userData.pressHighlights || [],
      achievements: userData.achievements || [],
      epkUrl: `${baseUrl}/epk/${epkSlug}`,
      contactEmail: userData.contactEmail || userData.email || "",
    };

    // Validate we have minimum required data
    if (!pitchInput.trackUrl) {
      return NextResponse.json({
        ok: false,
        error: "Missing track URL. Please add a Spotify or SoundCloud link in your profile.",
      }, { status: 400 });
    }

    if (!pitchInput.contactEmail) {
      return NextResponse.json({
        ok: false,
        error: "Missing contact email. Please update your profile.",
      }, { status: 400 });
    }

    // Generate pitches
    const generatedPitch = await generatePitches(pitchInput);

    // Save to database
    await saveArtistPitch(uid, {
      artistName: pitchInput.artistName,
      genre: pitchInput.genre,
      subGenres: pitchInput.subGenres,
      hookLine: generatedPitch.hookLine,
      shortPitch: generatedPitch.shortPitch,
      mediumPitch: generatedPitch.mediumPitch,
      subjectLine: generatedPitch.subjectLine,
      trackUrl: pitchInput.trackUrl,
      epkUrl: pitchInput.epkUrl,
      spotifyUrl: pitchInput.spotifyUrl,
      soundcloudUrl: pitchInput.soundcloudUrl,
      pressHighlights: pitchInput.pressHighlights,
      monthlyListeners: pitchInput.monthlyListeners,
      contactEmail: pitchInput.contactEmail,
    });

    // Fetch the saved pitch (to get timestamps)
    const savedPitch = await getArtistPitch(uid);

    return NextResponse.json({
      ok: true,
      pitch: savedPitch,
      cached: false,
      message: "Pitch generated successfully",
    });
  } catch (error: any) {
    console.error("[api/submissions/pitch] POST error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate pitch" },
      { status: 500 }
    );
  }
}
