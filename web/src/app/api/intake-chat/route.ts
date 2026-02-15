import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { getOpenAIClient, getOpenAIModel, INTAKE_SYSTEM_PROMPT } from "@/lib/openai";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ExtractedData = {
  artistName?: string | null;
  email?: string | null;
  genre?: string | null;
  location?: string | null;
  goals?: string | null;
  links?: string[] | null;
  notes?: string | null;
};

type AIResponse = {
  reply: string;
  extractedData: ExtractedData;
  intakeComplete: boolean;
};

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Verify authentication
    const { uid, email } = await verifyAuth(req);
    
    // Rate limiting
    const ip = getRequestIp(req);
    const limit = rateLimit(`intake-chat:${uid}:${ip}`, 30, 60000); // 30 requests per minute
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const userMessage: string = body?.message;
    const sessionId: string = body?.sessionId || `session-${Date.now()}`;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Get or create chat session document
    const chatRef = adminDb.collection("intakeChats").doc(uid);
    const messagesRef = chatRef.collection("messages");
    
    // Fetch recent messages for context (last 20)
    const recentMessagesSnap = await messagesRef
      .orderBy("createdAt", "asc")
      .limitToLast(20)
      .get();

    const chatHistory: ChatMessage[] = recentMessagesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        role: data.role as "user" | "assistant",
        content: data.content,
      };
    });

    // Build messages array for OpenAI
    const messages: ChatMessage[] = [
      { role: "system", content: INTAKE_SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: userMessage },
    ];

    // Call OpenAI
    const openai = getOpenAIClient();
    const model = getOpenAIModel();

    const completion = await openai.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantContent = completion.choices[0]?.message?.content || "";
    
    // Parse AI response
    let aiResponse: AIResponse;
    try {
      aiResponse = JSON.parse(assistantContent);
    } catch {
      // Fallback if JSON parsing fails
      aiResponse = {
        reply: assistantContent || "I'm sorry, I had trouble processing that. Could you try again?",
        extractedData: {},
        intakeComplete: false,
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Store user message
    await messagesRef.add({
      role: "user",
      content: userMessage,
      createdAt: now,
      sessionId,
    });

    // Store assistant message
    await messagesRef.add({
      role: "assistant",
      content: aiResponse.reply,
      createdAt: now,
      sessionId,
      extractedData: aiResponse.extractedData || null,
      intakeComplete: aiResponse.intakeComplete || false,
    });

    // Update chat session metadata
    await chatRef.set(
      {
        uid,
        email: email || null,
        lastMessageAt: now,
        sessionId,
        intakeComplete: aiResponse.intakeComplete || false,
      },
      { merge: true }
    );

    // Update intake profile with extracted data
    if (aiResponse.extractedData && Object.values(aiResponse.extractedData).some(v => v !== null)) {
      const intakeProfileRef = adminDb.collection("intakeProfiles").doc(uid);
      const existingProfile = await intakeProfileRef.get();
      const existingData = existingProfile.data()?.intake || {};

      // Merge new data with existing (don't overwrite with null)
      const mergedIntake: Record<string, unknown> = { ...existingData };
      const extracted = aiResponse.extractedData;
      
      if (extracted.artistName) mergedIntake.artistName = extracted.artistName;
      if (extracted.email) mergedIntake.email = extracted.email;
      if (extracted.genre) mergedIntake.genre = extracted.genre;
      if (extracted.location) mergedIntake.location = extracted.location;
      if (extracted.goals) mergedIntake.goals = extracted.goals;
      if (extracted.links && extracted.links.length > 0) mergedIntake.links = extracted.links;
      if (extracted.notes) mergedIntake.notes = extracted.notes;

      await intakeProfileRef.set(
        {
          uid,
          intake: mergedIntake,
          intakeComplete: aiResponse.intakeComplete || false,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      reply: aiResponse.reply,
      extractedData: aiResponse.extractedData,
      intakeComplete: aiResponse.intakeComplete,
    });
  } catch (error: any) {
    console.error(`[intake-chat] requestId=${requestId}`, error?.message || error);
    
    if (error?.message === "Unauthorized") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to process message. Please try again." },
      { status: 500 }
    );
  }
}
