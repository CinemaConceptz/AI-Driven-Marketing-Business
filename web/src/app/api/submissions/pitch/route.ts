import { NextResponse } from "next/server";
import { verifyAuth, adminDb } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

type EpkContent = {
  enhancedBio?: string;
  tagline?: string;
  styleDescription?: string;
  highlights?: string[];
};

type AudioTrack = {
  id: string;
  name: string;
  url: string;
};

type UserProfile = {
  artistName?: string;
  bio?: string;
  genre?: string;
  genres?: string[];
  location?: string;
  epkContent?: EpkContent;
  audioTracks?: AudioTrack[];
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
  };
  epkSlug?: string;
  submissionPitch?: Pitch;
};

type Pitch = {
  artistName: string;
  genre: string;
  hookLine: string;
  shortPitch: string;
  mediumPitch: string;
  subjectLine: string;
  trackUrl: string;
  epkUrl: string;
  generatedAt: string;
};

async function generateAIPitch(profile: UserProfile, baseUrl: string): Promise<Pitch> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI service not configured");
  }

  const artistName = profile.artistName || "Artist";
  const genres = profile.genres?.length ? profile.genres : (profile.genre ? [profile.genre] : ["Electronic"]);
  const genreText = genres.join(", ");
  const location = profile.location || "";

  // Use EPK content if available, otherwise use basic bio
  const epk = profile.epkContent;
  const bio = epk?.enhancedBio || profile.bio || "";
  const tagline = epk?.tagline || "";
  const styleDescription = epk?.styleDescription || "";
  const highlights = epk?.highlights || [];

  // Get track info
  const tracks = profile.audioTracks || [];
  const trackNames = tracks.map(t => t.name).join(", ");
  const primaryTrackUrl = tracks[0]?.url || profile.links?.soundcloud || profile.links?.spotify || "";

  // Get EPK URL
  const epkUrl = profile.epkSlug ? `${baseUrl}/epk/${profile.epkSlug}` : `${baseUrl}/epk`;

  // Build streaming links
  const streamingLinks: string[] = [];
  if (profile.links?.spotify) streamingLinks.push(`Spotify: ${profile.links.spotify}`);
  if (profile.links?.soundcloud) streamingLinks.push(`SoundCloud: ${profile.links.soundcloud}`);
  if (profile.links?.bandcamp) streamingLinks.push(`Bandcamp: ${profile.links.bandcamp}`);
  if (profile.links?.appleMusic) streamingLinks.push(`Apple Music: ${profile.links.appleMusic}`);

  const prompt = `You are an elite music industry PR specialist. Create compelling pitches for an artist to send to record labels.

ARTIST INFORMATION:
- Name: ${artistName}
- Genres: ${genreText}
- Location: ${location || "Not specified"}
- Tagline: ${tagline || "N/A"}
- Style: ${styleDescription || "N/A"}

BIO:
${bio || "No bio available"}

${highlights.length > 0 ? `HIGHLIGHTS:\n${highlights.map(h => `- ${h}`).join("\n")}` : ""}

MUSIC:
${trackNames ? `Tracks: ${trackNames}` : "No tracks uploaded"}
${streamingLinks.length > 0 ? `\nStreaming Links:\n${streamingLinks.join("\n")}` : ""}

EPK Link: ${epkUrl}

Generate the following pitches. Be professional, engaging, and make A&R reps want to listen. Use proper grammar and spelling.

1. HOOK LINE (1 sentence, max 20 words):
A compelling opening that grabs attention immediately.

2. SUBJECT LINE (max 60 characters):
Email subject that gets opened. Include artist name and genre hint.

3. SHORT PITCH (80-100 words):
Quick pitch for busy A&Rs. Include: who you are, your sound, why they should care, and a call to action.

4. MEDIUM PITCH (250-300 words):
Full pitch with: introduction, sound description, achievements/highlights, what you're looking for, links, and professional sign-off.

Format your response EXACTLY like this:
===HOOK===
[hook line]
===SUBJECT===
[subject line]
===SHORT===
[short pitch]
===MEDIUM===
[medium pitch]`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    }),
  });

  const data = await response.json();
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse the response
  const parseSection = (marker: string, nextMarker?: string): string => {
    const startIdx = result.indexOf(`===${marker}===`);
    if (startIdx === -1) return "";
    const contentStart = startIdx + `===${marker}===`.length;
    const endIdx = nextMarker ? result.indexOf(`===${nextMarker}===`) : result.length;
    return result.slice(contentStart, endIdx === -1 ? undefined : endIdx).trim();
  };

  const hookLine = parseSection("HOOK", "SUBJECT") || `${artistName} delivers fresh ${genreText} that commands attention.`;
  const subjectLine = parseSection("SUBJECT", "SHORT") || `Demo Submission: ${artistName} - ${genres[0]} Artist`;
  const shortPitch = parseSection("SHORT", "MEDIUM") || `${artistName} is a ${genreText} artist creating innovative sounds. Check out the attached demo and EPK for more information.`;
  const mediumPitch = parseSection("MEDIUM") || shortPitch;

  return {
    artistName,
    genre: genreText,
    hookLine,
    shortPitch,
    mediumPitch,
    subjectLine,
    trackUrl: primaryTrackUrl,
    epkUrl,
    generatedAt: new Date().toISOString(),
  };
}

// GET: Retrieve existing pitch
export async function GET(req: Request) {
  try {
    const { uid } = await verifyAuth(req);

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ ok: true, pitch: null });
    }

    const userData = userDoc.data();
    const pitch = userData?.submissionPitch || null;

    return NextResponse.json({ ok: true, pitch });
  } catch (error: any) {
    console.error("[submissions/pitch] GET error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to get pitch" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// POST: Generate new pitch
export async function POST(req: Request) {
  try {
    const { uid } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: 10 pitch generations per day
    const limit = rateLimit(`pitch:generate:${uid}:${ip}`, 10, 86400);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Try again tomorrow." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const forceRegenerate = body?.forceRegenerate === true;

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const profile = userDoc.data() as UserProfile;

    // Check if we have a cached pitch and don't need to regenerate
    if (!forceRegenerate && profile.submissionPitch) {
      const existingPitch = profile.submissionPitch as Pitch;
      const generatedAt = new Date(existingPitch.generatedAt);
      const hoursSinceGeneration = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);

      // Return cached pitch if less than 24 hours old
      if (hoursSinceGeneration < 24) {
        return NextResponse.json({
          ok: true,
          pitch: existingPitch,
          cached: true,
        });
      }
    }

    // Validate required fields
    if (!profile.artistName) {
      return NextResponse.json(
        { ok: false, error: "Artist name is required. Please complete your profile." },
        { status: 400 }
      );
    }

    // Check if EPK has been generated (recommended but not required)
    if (!profile.epkContent?.enhancedBio && !profile.bio) {
      return NextResponse.json(
        { ok: false, error: "Please add a bio or generate your EPK first for a better pitch." },
        { status: 400 }
      );
    }

    // Generate pitch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verifiedsoundar.com";
    const pitch = await generateAIPitch(profile, baseUrl);

    // Save pitch to user profile
    await adminDb.collection("users").doc(uid).set({
      submissionPitch: pitch,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      pitch,
      cached: false,
    });

  } catch (error: any) {
    console.error("[submissions/pitch] POST error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate pitch" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
