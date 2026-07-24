import { NextRequest, NextResponse } from "next/server";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import { logSessionEntry } from "@/lib/supabase";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const VALID_LEVELS: SpanishLevel[] = ["Beginner", "Intermediate", "Advanced"];

export async function POST(request: NextRequest) {
  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request body must be multipart/form-data." },
      { status: 400 }
    );
  }

  const audioFile = incomingForm.get("audio");
  if (!(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Request must include an `audio` file field." },
      { status: 400 }
    );
  }

  if (audioFile.size === 0) {
    return NextResponse.json(
      { error: "Uploaded audio file is empty." },
      { status: 400 }
    );
  }

  // Optional — only used for Supabase logging, never for the transcription
  // itself, so a missing/invalid value doesn't block the core feature.
  const levelField = incomingForm.get("level");
  const sessionIdField = incomingForm.get("sessionId");
  const level =
    typeof levelField === "string" && VALID_LEVELS.includes(levelField as SpanishLevel)
      ? (levelField as SpanishLevel)
      : null;
  const sessionId = typeof sessionIdField === "string" && sessionIdField ? sessionIdField : null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  const outgoingForm = new FormData();
  outgoingForm.append("file", audioFile, audioFile.name || "audio.webm");
  outgoingForm.append("model", "whisper-1");
  // Force Spanish — without this, Whisper auto-detects language per request,
  // which is unreliable on short or quiet clips and was returning transcripts
  // in random languages.
  outgoingForm.append("language", "es");

  try {
    const openaiResponse = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: outgoingForm,
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${errorBody}` },
        { status: openaiResponse.status }
      );
    }

    const data = (await openaiResponse.json()) as { text?: string };

    if (typeof data.text !== "string") {
      return NextResponse.json(
        { error: "OpenAI response did not include transcribed text." },
        { status: 502 }
      );
    }

    if (sessionId && level) {
      await logSessionEntry({
        sessionId,
        level,
        role: "user",
        charCount: data.text.length,
      });
    }

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Unexpected error calling OpenAI Whisper API:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
