import { NextResponse } from "next/server";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

// System prompt for general assistant (not intake-specific)
const GENERAL_ASSISTANT_PROMPT = `You are the Verified Sound assistant. You help visitors learn about Verified Sound A&R services and answer their questions.

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
- Keep responses concise but informative
- If you don't know something specific, suggest they contact support

Respond naturally in plain text. Be conversational and helpful.`;

// Simple in-memory session storage (for non-authenticated users)
const sessionMessages = new Map<string, ChatMessage[]>();

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Rate limiting by IP
    const ip = getRequestIp(req);
    const limit = rateLimit(`chat-assistant:${ip}`, 30, 60000); // 30 requests per minute
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please slow down." },
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

    // Get or create session history (limited to last 10 messages for memory efficiency)
    let history = sessionMessages.get(sessionId) || [];
    
    // Add user message to history
    history.push({ role: "user", content: userMessage });
    
    // Keep only last 10 messages
    if (history.length > 10) {
      history = history.slice(-10);
    }

    // Build messages array for OpenAI
    const messages: ChatMessage[] = [
      { role: "system", content: GENERAL_ASSISTANT_PROMPT },
      ...history,
    ];

    // Call OpenAI
    const openai = getOpenAIClient();
    const model = getOpenAIModel();

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantReply = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't process that. Please try again.";

    // Add assistant reply to history
    history.push({ role: "assistant", content: assistantReply });
    
    // Save updated history
    sessionMessages.set(sessionId, history);

    // Clean up old sessions (basic memory management)
    if (sessionMessages.size > 1000) {
      const oldestKey = sessionMessages.keys().next().value;
      if (oldestKey) sessionMessages.delete(oldestKey);
    }

    return NextResponse.json({
      ok: true,
      reply: assistantReply,
    });
  } catch (error: any) {
    console.error(`[chat-assistant] requestId=${requestId}`, error?.message || error);

    return NextResponse.json(
      { ok: false, error: "Failed to process message. Please try again." },
      { status: 500 }
    );
  }
}
