import { NextRequest, NextResponse } from "next/server";
import type { OpenAITTSRequest, OpenAIVoice, OpenAIModel } from "@/types/tts";

const OPENAI_API_URL = "https://api.openai.com/v1/audio/speech";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const body: OpenAITTSRequest = await request.json();
    const { text, voice = "alloy", model = "tts-1", speed = 1.0 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const truncatedText = text.length > 4096 ? text.substring(0, 4096) : text;

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: truncatedText,
        voice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI TTS API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate speech" },
        { status: response.status },
      );
    }

    const audioData = await response.arrayBuffer();

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioData.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const isConfigured = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({
    configured: isConfigured,
    voices: [
      "alloy",
      "echo",
      "fable",
      "onyx",
      "nova",
      "shimmer",
    ] as OpenAIVoice[],
    models: ["tts-1", "tts-1-hd"] as OpenAIModel[],
  });
}
