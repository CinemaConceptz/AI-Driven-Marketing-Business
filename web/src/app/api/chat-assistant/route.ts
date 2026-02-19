import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

type ChatMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

// Daily usage tracking (simple in-memory, resets on restart)
const dailyUsage = {
  count: 0,
  date: new Date().toDateString(),
  maxDaily: 5000, // Max 5000 requests per day (cost protection)
};

function checkDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (dailyUsage.date !== today) {
    // Reset for new day
    dailyUsage.count = 0;
    dailyUsage.date = today;
  }
  if (dailyUsage.count >= dailyUsage.maxDaily) {
    return false;
  }
  dailyUsage.count++;
  return true;
}

// System prompt for general assistant
const SYSTEM_PROMPT = `You are the Verified Sound assistant. You help visitors learn about Verified Sound A&R services and answer their questions.

## About Verified Sound A&R:
- Verified Sound is a premium representation platform for label-ready electronic music artists
- We specialize in House, EDM, Disco, Afro, Soulful, and Trance releases
- We provide executive-facing, campaign-driven outreach to labels
- Our team reviews each submission personally to ensure quality matches

## Services Overview:
- Artist representation and label outreach
- EPK (Electronic Press Kit) creation and hosting
- Campaign strategy and positioning
- Direct connections with A&R professionals at major and independent labels

## Pricing (Subscription Tiers):
- **Tier I** ($39/month or $390/year): Professional EPK hosting, up to 3 press images, basic A&R review, email support
- **Tier II** ($89/month or $890/year): Everything in Tier I plus priority A&R review, monthly strategy call, direct A&R feedback, analytics dashboard
- **Tier III** ($139/month or $1,390/year): Everything in Tier II plus dedicated A&R contact, quarterly label showcases, custom campaign strategy, priority label matching, 24/7 support

## Submission Process:
1. Create an account and choose a subscription tier
2. Complete the artist intake form (or chat with our AI assistant)
3. Upload press images and complete your EPK
4. Our A&R team reviews your submission (typically 1-2 weeks)
5. If approved, you'll be contacted for next steps and label matching

## Response Guidelines:
- Be helpful, professional, and friendly
- Answer questions about pricing, services, the submission process
- If someone seems ready to apply, direct them to /apply or /pricing
- Keep responses concise but informative (2-3 paragraphs max)
- If you don't know something specific, suggest they contact support

Respond naturally in plain text. Be conversational and helpful.`;

// Simple in-memory session storage
const sessionHistory = new Map<string, ChatMessage[]>();

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Check daily limit first (cost protection)
    if (!checkDailyLimit()) {
      console.warn(`[chat-assistant] Daily limit reached: ${dailyUsage.count}/${dailyUsage.maxDaily}`);
      return NextResponse.json(
        { ok: false, error: "Chat service is at capacity. Please try again tomorrow." },
        { status: 503 }
      );
    }

    // Rate limiting by IP (30 requests per minute per user)
    const ip = getRequestIp(req);
    const limit = rateLimit(`chat-assistant:${ip}`, 30, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    // Additional rate limit: 100 requests per hour per IP
    const hourlyLimit = rateLimit(`chat-assistant-hourly:${ip}`, 100, 3600000);
    if (!hourlyLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Hourly limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const userMessage: string = body?.message;
    const sessionId: string = body?.sessionId || `anon-${ip}-${Date.now()}`;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 }
      );
    }

    if (userMessage.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "Message too long. Please keep it under 1000 characters." },
        { status: 400 }
      );
    }

    // Get or create session history
    let history = sessionHistory.get(sessionId) || [];
    
    // Initialize Gemini
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    const assistantReply = response.text() || "I'm sorry, I couldn't process that. Please try again.";

    // Update history
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: assistantReply }] });
    
    // Keep only last 10 exchanges (20 messages)
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    // Save updated history
    sessionHistory.set(sessionId, history);

    // Clean up old sessions (basic memory management)
    if (sessionHistory.size > 1000) {
      const oldestKey = sessionHistory.keys().next().value;
      if (oldestKey) sessionHistory.delete(oldestKey);
    }

    return NextResponse.json({
      ok: true,
      reply: assistantReply,
    });
  } catch (error: any) {
    console.error(`[chat-assistant] requestId=${requestId}`, error?.message || error);

    // Return user-friendly error
    const errorMessage = error?.message?.includes("API_KEY") 
      ? "Chat service is temporarily unavailable."
      : "Failed to process message. Please try again.";

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
