import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

/**
 * Helper function to end text at a complete sentence
 */
function endAtSentence(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  
  // Take maxWords and find the last sentence ending
  const truncated = words.slice(0, maxWords).join(" ");
  
  // Find the last sentence-ending punctuation
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclamation = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");
  
  const lastEnding = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastEnding > truncated.length * 0.5) {
    // Only cut at sentence if we're past halfway
    return truncated.slice(0, lastEnding + 1).trim();
  }
  
  // Otherwise, add ellipsis at a word boundary
  return truncated.trim() + "...";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      artistName,
      genre,
      secondaryGenres,
      location,
      yearsActive,
      soundDescription,
      artistInfluences,
      uniqueValue,
      careerObjective,
    } = body;

    if (!artistName || !genre) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a professional music industry copywriter. Create a compelling, polished artist biography for a record label submission.

Artist Information:
- Name: ${artistName}
- Primary Genre: ${genre}
- Secondary Genres: ${secondaryGenres?.join(", ") || "None"}
- Location: ${location}
- Years Active: ${yearsActive}
- Sound Description (from artist): "${soundDescription}"
- Influences: ${artistInfluences?.join(", ") || "Various artists"}
- Unique Value: "${uniqueValue}"
- Career Goals: "${careerObjective}"

Requirements:
1. Write in third person, professional tone
2. Create 3-4 well-structured paragraphs (150-200 words total)
3. Start with a strong hook that captures attention
4. Highlight what makes this artist unique
5. End each paragraph with a COMPLETE sentence - never cut off mid-word or mid-sentence
6. Make it sound professional and polished, not like a templated bio
7. Include their influences naturally, not as a list
8. End with forward momentum about their future

DO NOT just rewrite what the artist said - transform it into a professional narrative that would impress A&R representatives.

Return ONLY the bio text, no headers or formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let bio = response.text().trim();
    
    // Ensure bio ends at a complete sentence (max 250 words)
    bio = endAtSentence(bio, 250);

    return NextResponse.json({ bio });
  } catch (error) {
    console.error("Bio generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate bio" },
      { status: 500 }
    );
  }
}
