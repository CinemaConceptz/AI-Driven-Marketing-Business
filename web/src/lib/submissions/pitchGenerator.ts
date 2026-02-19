import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface PitchInput {
  artistName: string;
  genre: string;
  subGenres?: string[];
  bio?: string;
  trackTitle?: string;
  trackUrl: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  monthlyListeners?: number;
  pressHighlights?: string[];
  achievements?: string[];
  epkUrl: string;
  contactEmail: string;
}

export interface GeneratedPitch {
  hookLine: string;
  shortPitch: string;
  mediumPitch: string;
  subjectLine: string;
  recommendedTrack: string;
}

const PITCH_SYSTEM_PROMPT = `You are a professional A&R pitch writer for electronic music artists. Your pitches are:

- Professional and industry-standard
- Concise and impactful
- Genre-appropriate
- Focused on what makes the artist stand out
- Never exaggerated or over-hyped
- Written in third person

You understand the electronic music industry and know what A&Rs look for:
- Quality production
- Unique sound
- Professional presentation
- Streaming numbers (if impressive)
- Notable releases or placements

IMPORTANT: 
- Do NOT use phrases like "emerging artist" or "rising star" - be specific
- Do NOT use generic descriptions - be unique to this artist
- Do NOT mention things that aren't provided
- Keep streaming numbers only if they're impressive (10k+)
- Focus on the music and sound`;

/**
 * Generate pitch content for an artist
 */
export async function generatePitches(input: PitchInput): Promise<GeneratedPitch> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: PITCH_SYSTEM_PROMPT,
  });

  // Build context
  const context = buildArtistContext(input);

  const prompt = `Based on this artist information, generate professional A&R pitch content:

${context}

Generate the following (respond in JSON format):

1. "hookLine": A compelling one-liner (max 15 words) that captures their sound
2. "subjectLine": Professional email subject line for label submission (max 60 characters)
3. "shortPitch": 100-word pitch suitable for webform submissions
4. "mediumPitch": 300-word pitch for email submissions with full context
5. "recommendedTrack": Which track to lead with and why (just the track name if only one)

Respond ONLY with valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse JSON response
  try {
    // Clean up response - remove markdown code blocks if present
    const cleanedResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    
    return {
      hookLine: parsed.hookLine || "",
      shortPitch: parsed.shortPitch || "",
      mediumPitch: parsed.mediumPitch || "",
      subjectLine: parsed.subjectLine || `Submission: ${input.artistName} - ${input.genre}`,
      recommendedTrack: parsed.recommendedTrack || input.trackTitle || "Featured Track",
    };
  } catch (error) {
    console.error("[pitch-generator] Failed to parse AI response:", error);
    // Return fallback pitches
    return generateFallbackPitch(input);
  }
}

/**
 * Build context string from artist input
 */
function buildArtistContext(input: PitchInput): string {
  const lines: string[] = [
    `Artist Name: ${input.artistName}`,
    `Primary Genre: ${input.genre}`,
  ];

  if (input.subGenres?.length) {
    lines.push(`Sub-genres: ${input.subGenres.join(", ")}`);
  }

  if (input.bio) {
    lines.push(`Bio: ${input.bio}`);
  }

  if (input.trackTitle) {
    lines.push(`Featured Track: ${input.trackTitle}`);
  }

  lines.push(`Track Link: ${input.trackUrl}`);

  if (input.monthlyListeners && input.monthlyListeners > 10000) {
    lines.push(`Monthly Listeners: ${input.monthlyListeners.toLocaleString()}`);
  }

  if (input.pressHighlights?.length) {
    lines.push(`Press/Placements: ${input.pressHighlights.join("; ")}`);
  }

  if (input.achievements?.length) {
    lines.push(`Achievements: ${input.achievements.join("; ")}`);
  }

  if (input.spotifyUrl) {
    lines.push(`Spotify: ${input.spotifyUrl}`);
  }

  if (input.soundcloudUrl) {
    lines.push(`SoundCloud: ${input.soundcloudUrl}`);
  }

  lines.push(`EPK: ${input.epkUrl}`);
  lines.push(`Contact: ${input.contactEmail}`);

  return lines.join("\n");
}

/**
 * Generate fallback pitch if AI fails
 */
function generateFallbackPitch(input: PitchInput): GeneratedPitch {
  const artistName = input.artistName;
  const genre = input.genre;

  return {
    hookLine: `${artistName} delivers quality ${genre} productions ready for label consideration.`,
    subjectLine: `Demo Submission: ${artistName} - ${genre}`,
    shortPitch: `${artistName} is a ${genre} producer presenting new material for your consideration. The attached track showcases a professional production style suited to your label's catalog. Full EPK and additional tracks available at ${input.epkUrl}. Contact: ${input.contactEmail}`,
    mediumPitch: `Dear A&R Team,

${artistName} is pleased to submit new ${genre} material for your consideration.

The featured track demonstrates production quality and style aligned with your label's releases. ${input.bio ? input.bio.slice(0, 200) : ""}

Links:
- Featured Track: ${input.trackUrl}
- Full EPK: ${input.epkUrl}
${input.spotifyUrl ? `- Spotify: ${input.spotifyUrl}` : ""}
${input.soundcloudUrl ? `- SoundCloud: ${input.soundcloudUrl}` : ""}

For further information or additional material, please contact ${input.contactEmail}.

Best regards,
${artistName}`,
    recommendedTrack: input.trackTitle || "Featured Track",
  };
}

/**
 * Customize pitch for a specific label
 */
export async function customizePitchForLabel(
  basePitch: GeneratedPitch,
  labelName: string,
  labelGenres: string[],
  artistGenre: string
): Promise<GeneratedPitch> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: PITCH_SYSTEM_PROMPT,
  });

  const prompt = `Customize this pitch for submission to ${labelName}, a label focused on ${labelGenres.join(", ")}.

Original pitch:
${basePitch.mediumPitch}

Artist genre: ${artistGenre}

Requirements:
- Keep the same information
- Adjust tone/angle to match label style
- If genres overlap, emphasize that connection
- Keep professional and concise
- Max 300 words

Respond with ONLY the customized pitch text, no JSON or formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const customizedMedium = result.response.text().trim();

    return {
      ...basePitch,
      mediumPitch: customizedMedium,
      subjectLine: `Submission for ${labelName}: ${basePitch.subjectLine.replace("Demo Submission: ", "")}`,
    };
  } catch {
    // Return original if customization fails
    return basePitch;
  }
}
