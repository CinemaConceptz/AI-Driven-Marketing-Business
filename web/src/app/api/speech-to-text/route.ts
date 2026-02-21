import { NextRequest, NextResponse } from "next/server";

// Google Cloud Speech-to-Text API endpoint
const GOOGLE_SPEECH_API = "https://speech.googleapis.com/v1/speech:recognize";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert blob to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // Get API key from environment
    const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
    
    if (!apiKey) {
      console.error("GOOGLE_SPEECH_API_KEY not configured");
      return NextResponse.json(
        { error: "Speech service not configured" },
        { status: 500 }
      );
    }

    // Call Google Cloud Speech-to-Text API
    const response = await fetch(`${GOOGLE_SPEECH_API}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS", // Browser MediaRecorder default
          sampleRateHertz: 48000,
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
          model: "latest_long", // Best for conversational speech
          useEnhanced: true,
          // Alternative models:
          // model: "phone_call" - for phone audio
          // model: "video" - for video audio
          // model: "default" - general purpose
        },
        audio: {
          content: base64Audio,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Speech API error:", errorText);
      return NextResponse.json(
        { error: "Speech recognition failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract transcription from response
    const transcription = data.results
      ?.map((result: any) => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(" ") || "";

    // Get confidence score
    const confidence = data.results?.[0]?.alternatives?.[0]?.confidence || 0;

    return NextResponse.json({
      success: true,
      transcription,
      confidence,
    });
  } catch (error) {
    console.error("Speech-to-text error:", error);
    return NextResponse.json(
      { error: "Failed to process speech", details: String(error) },
      { status: 500 }
    );
  }
}
