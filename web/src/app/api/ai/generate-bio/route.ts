import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const { uid } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: 5 bio generations per hour
    const limit = rateLimit(`ai:bio:${uid}:${ip}`, 5, 3600);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { artistName, genres, links } = body;

    if (!artistName) {
      return NextResponse.json(
        { ok: false, error: "Artist name required" },
        { status: 400 },
      );
    }

    const genreList =
      genres?.length > 0 ? genres.join(", ") : "electronic music";
    const hasSpotify = !!links?.spotify;
    const hasSoundcloud = !!links?.soundcloud;

    // Build context for AI
    const platformContext =
      hasSpotify || hasSoundcloud
        ? `They have presence on ${[hasSpotify && "Spotify", hasSoundcloud && "SoundCloud"].filter(Boolean).join(" and ")}.`
        : "";

    const prompt = `Write a professional artist bio for a musician named "${artistName}" who specializes in ${genreList}. ${platformContext}

The bio should be:
- 150-250 words (around 800-900 characters)
- Written in third person
- Professional but engaging
- Highlight their unique sound and artistic vision
- Mention their dedication to their craft
- End with forward-looking statement about their career

Do not include any placeholder text or brackets. Write as if this is a real, established artist.`;

    // Try to use Google AI (Gemini)
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.8,
              },
            }),
          },
        );

        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
          // Trim to 900 characters if needed
          const bio = generatedText.trim().slice(0, 900);
          return NextResponse.json({ ok: true, bio });
        }
      } catch (aiError) {
        console.error("[ai/generate-bio] AI error:", aiError);
      }
    }

    // Fallback: Generate a template bio
    const fallbackBio = `${artistName} is a dynamic force in the ${genreList} scene, crafting immersive sonic experiences that push the boundaries of modern electronic music. With a distinctive sound that blends innovative production techniques with infectious rhythms, ${artistName} has been steadily building a reputation among tastemakers and dance floor enthusiasts alike.

Drawing inspiration from a diverse palette of influences, ${artistName}'s productions showcase a meticulous attention to detail and an unwavering commitment to artistic authenticity. Each track tells a story, taking listeners on a journey through carefully constructed soundscapes that resonate on both emotional and physical levels.

Currently focused on expanding their creative horizons and connecting with forward-thinking labels, ${artistName} continues to evolve while staying true to their artistic vision. With upcoming releases and live performances on the horizon, this is an artist poised to make significant waves in the global electronic music community.`;

    return NextResponse.json({ ok: true, bio: fallbackBio.slice(0, 900) });
  } catch (error: any) {
    console.error("[ai/generate-bio] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate bio" },
      { status: error?.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
