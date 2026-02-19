import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebaseAdmin";

// Verify user token
async function verifyUser(req: Request): Promise<{ uid: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    
    return {
      uid: decoded.uid,
      isAdmin: adminDoc.exists,
    };
  } catch {
    return null;
  }
}

// Initialize Gemini
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

const RESEARCH_PROMPT = `You are a music industry research assistant specializing in finding record label submission information.

Given a record label name, search your knowledge to find:
1. Official website URL
2. Demo submission page URL (if available)
3. Demo submission email (if available)
4. Primary genres the label releases
5. Country/region of operation
6. Any submission requirements or guidelines
7. Whether they are currently accepting demos
8. Label tier (Major/Mid-tier/Underground)

IMPORTANT: Only provide information you are confident about. If you don't know something, say "Unknown" for that field.

Respond in this exact JSON format:
{
  "labelName": "string",
  "found": true/false,
  "confidence": "high/medium/low",
  "data": {
    "website": "URL or null",
    "submissionUrl": "URL or null",
    "submissionEmail": "email or null",
    "genres": ["array", "of", "genres"],
    "country": "country or null",
    "tier": "Major/Mid-tier/Underground",
    "acceptingDemos": "Yes/No/Unknown",
    "requirements": "string describing requirements or null",
    "notes": "any additional relevant info"
  },
  "sources": "Brief description of where this info comes from (your training data cutoff)"
}`;

/**
 * POST /api/labels/research
 * AI-assisted label research
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { labelName, genre } = body;

    if (!labelName || typeof labelName !== "string") {
      return NextResponse.json(
        { error: "labelName is required" },
        { status: 400 }
      );
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    const prompt = `${RESEARCH_PROMPT}

Research this label: "${labelName}"
${genre ? `Genre hint: ${genre}` : ""}

Return ONLY the JSON response, no markdown or extra text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let researchData;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      researchData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[labels/research] Failed to parse AI response:", text);
      return NextResponse.json({
        ok: false,
        error: "Failed to parse research results",
        rawResponse: text,
      }, { status: 500 });
    }

    // Log research query for analytics
    await adminDb.collection("researchLogs").add({
      userId: user.uid,
      labelName,
      genre: genre || null,
      found: researchData.found,
      confidence: researchData.confidence,
      timestamp: new Date(),
    });

    return NextResponse.json({
      ok: true,
      research: researchData,
    });
  } catch (error: any) {
    console.error("[labels/research] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Research failed" },
      { status: 500 }
    );
  }
}

/**
 * Bulk research multiple labels
 */
export async function PUT(req: Request) {
  const user = await verifyUser(req);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { labelNames } = body;

    if (!labelNames || !Array.isArray(labelNames)) {
      return NextResponse.json(
        { error: "labelNames array is required" },
        { status: 400 }
      );
    }

    // Limit to 10 at a time
    const toResearch = labelNames.slice(0, 10);

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    const prompt = `${RESEARCH_PROMPT}

Research these labels and return an array of results:
${toResearch.map((name: string, i: number) => `${i + 1}. "${name}"`).join("\n")}

Return ONLY a JSON array of results, no markdown:
[
  { result for label 1 },
  { result for label 2 },
  ...
]`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let researchData;
    try {
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      researchData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[labels/research] Failed to parse bulk AI response:", text);
      return NextResponse.json({
        ok: false,
        error: "Failed to parse research results",
        rawResponse: text,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      results: researchData,
      count: researchData.length,
    });
  } catch (error: any) {
    console.error("[labels/research] Bulk error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Bulk research failed" },
      { status: 500 }
    );
  }
}
