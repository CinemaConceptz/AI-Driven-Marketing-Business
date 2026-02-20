import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

type UserProfile = {
  artistName?: string;
  bio?: string;
  genre?: string;
  genres?: string[];
  location?: string;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
};

async function searchArtistInfo(artistName: string, genres: string[]): Promise<string> {
  // Search for public information about the artist
  const genreText = genres.length > 0 ? genres.join(", ") : "music";

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return "";

    const searchPrompt = `You are a music industry researcher. Search your knowledge for any public information about an artist named "${artistName}" who makes ${genreText} music.

If you find information, provide:
- Any notable releases, EPs, or albums
- Collaborations with other artists
- Performance history (festivals, venues, tours)
- Press coverage or reviews
- Social media presence highlights
- Awards or recognition
- Record label affiliations (past or present)

If you don't find specific information about this exact artist, respond with "NO_PUBLIC_INFO_FOUND" and nothing else.

Be factual and only include verified information.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: searchPrompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3,
        },
      }),
    });

    const data = await response.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (result.includes("NO_PUBLIC_INFO_FOUND")) {
      return "";
    }

    return result.trim();
  } catch (error) {
    console.error("[epk/generate] Search error:", error);
    return "";
  }
}

async function generateEnhancedEpk(profile: UserProfile, publicInfo: string): Promise<{
  enhancedBio: string;
  tagline: string;
  pressRelease: string;
  highlights: string[];
  styleDescription: string;
}> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI service not configured");
  }

  const artistName = profile.artistName || "Artist";
  const genres = profile.genres?.length ? profile.genres : (profile.genre ? [profile.genre] : ["Electronic"]);
  const genreText = genres.join(", ");
  const originalBio = profile.bio || "";
  const location = profile.location || "";

  // Build context from links
  const platformsList: string[] = [];
  if (profile.links?.spotify) platformsList.push("Spotify");
  if (profile.links?.soundcloud) platformsList.push("SoundCloud");
  if (profile.links?.bandcamp) platformsList.push("Bandcamp");
  if (profile.links?.appleMusic) platformsList.push("Apple Music");
  if (profile.links?.youtube) platformsList.push("YouTube");

  const platformsText = platformsList.length > 0 ? `Available on: ${platformsList.join(", ")}` : "";

  const prompt = `You are an elite music industry PR writer and A&R consultant. Create a professional Electronic Press Kit (EPK) for an artist.

ARTIST INFORMATION:
- Name: ${artistName}
- Genres: ${genreText}
- Location: ${location || "Not specified"}
- Original Bio: ${originalBio || "No bio provided"}
- Platforms: ${platformsText}

${publicInfo ? `PUBLIC INFORMATION FOUND:\n${publicInfo}` : ""}

Generate the following EPK components. Write in third person. Be professional, engaging, and industry-ready. Use proper spelling and grammar.

1. ENHANCED BIO (250-400 words):
Write a compelling, professional biography that:
- Opens with a strong hook
- Highlights their unique sound and artistic vision
- Mentions their genre expertise
- Incorporates any public information found
- Ends with forward-looking statement
- Sounds like it was written by a top PR agency

2. TAGLINE (10-15 words):
A memorable one-liner that captures their essence.

3. PRESS RELEASE EXCERPT (150-200 words):
A ready-to-use press release paragraph for media outlets.

4. HIGHLIGHTS (3-5 bullet points):
Key achievements, milestones, or selling points. If no public info, create aspirational but realistic points based on their profile.

5. STYLE DESCRIPTION (50-75 words):
A vivid description of their musical style for booking agents and labels.

Format your response EXACTLY like this:
===ENHANCED_BIO===
[bio content]
===TAGLINE===
[tagline content]
===PRESS_RELEASE===
[press release content]
===HIGHLIGHTS===
- [highlight 1]
- [highlight 2]
- [highlight 3]
===STYLE_DESCRIPTION===
[style description content]`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2000,
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

  const enhancedBio = parseSection("ENHANCED_BIO", "TAGLINE");
  const tagline = parseSection("TAGLINE", "PRESS_RELEASE");
  const pressRelease = parseSection("PRESS_RELEASE", "HIGHLIGHTS");
  const highlightsRaw = parseSection("HIGHLIGHTS", "STYLE_DESCRIPTION");
  const styleDescription = parseSection("STYLE_DESCRIPTION");

  // Parse highlights into array
  const highlights = highlightsRaw
    .split("\n")
    .map(line => line.replace(/^[-•*]\s*/, "").trim())
    .filter(line => line.length > 0);

  return {
    enhancedBio: enhancedBio || originalBio || `${artistName} is an emerging artist in the ${genreText} scene.`,
    tagline: tagline || `${artistName} - Defining the future of ${genres[0] || "music"}`,
    pressRelease: pressRelease || "",
    highlights: highlights.length > 0 ? highlights : [
      `Emerging ${genreText} artist`,
      `Building a dedicated fanbase`,
      `Creating innovative sounds`,
    ],
    styleDescription: styleDescription || `${artistName} delivers ${genreText} with a unique perspective and fresh energy.`,
  };
}

export async function POST(req: Request) {
  try {
    const { uid } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: 5 EPK generations per day
    const limit = rateLimit(`epk:generate:${uid}:${ip}`, 5, 86400);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. You can generate 5 EPKs per day." },
        { status: 429 }
      );
    }

    // Get user profile from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const profile = userDoc.data() as UserProfile;

    if (!profile.artistName) {
      return NextResponse.json(
        { ok: false, error: "Artist name is required" },
        { status: 400 }
      );
    }

    // Step 1: Search for public information
    const genres = profile.genres?.length ? profile.genres : (profile.genre ? [profile.genre] : []);
    const publicInfo = await searchArtistInfo(profile.artistName, genres);

    // Step 2: Generate enhanced EPK content
    const epkContent = await generateEnhancedEpk(profile, publicInfo);

    // Step 3: Save enhanced EPK to user profile
    await adminDb.collection("users").doc(uid).set({
      epkEnhanced: true,
      epkContent: {
        ...epkContent,
        generatedAt: new Date().toISOString(),
        publicInfoFound: !!publicInfo,
      },
      epkReady: true,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      epk: epkContent,
      publicInfoFound: !!publicInfo,
      message: "EPK generated successfully!",
    });

  } catch (error: any) {
    console.error("[epk/generate] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate EPK" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
