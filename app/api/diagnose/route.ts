import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import { getAnthropicApiKey } from "@/lib/anthropic-key";
import { NO_THINKING, SOFIA_MODEL } from "@/lib/models";
import {
  DIAGNOSE_SYSTEM_PROMPT,
  DIAGNOSIS_OUTPUT_SCHEMA,
  toObservations,
} from "@/lib/diagnosis";

export const maxDuration = 30;

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_TRANSCRIPT_TURNS = 40;

const VALID_LEVELS: SpanishLevel[] = ["Beginner", "Intermediate", "Advanced"];

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

function isConversationTurn(value: unknown): value is ConversationTurn {
  if (typeof value !== "object" || value === null) return false;
  const turn = value as Record<string, unknown>;
  return (
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { history, level } = (body ?? {}) as { history?: unknown; level?: unknown };

  if (!Array.isArray(history) || !history.every(isConversationTurn) || history.length === 0) {
    return NextResponse.json(
      { error: "`history` must be a non-empty array of conversation turns." },
      { status: 400 }
    );
  }

  if (typeof level !== "string" || !VALID_LEVELS.includes(level as SpanishLevel)) {
    return NextResponse.json(
      { error: `\`level\` must be one of: ${VALID_LEVELS.join(", ")}.` },
      { status: 400 }
    );
  }

  if (!history.some((turn) => turn.role === "user")) {
    return NextResponse.json({ observations: [] });
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing CHARLA_API_KEY." }, { status: 500 });
  }

  const transcript = history
    .slice(-MAX_TRANSCRIPT_TURNS)
    .map((turn) => `${turn.role === "user" ? "Learner" : "Sofía"}: ${turn.content}`)
    .join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create(
      {
        model: SOFIA_MODEL,
        thinking: NO_THINKING,
        max_tokens: 1024,
        system: DIAGNOSE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `The learner's level is ${level}. Here is the conversation:\n\n${transcript}`,
          },
        ],
        output_config: { format: { type: "json_schema", schema: DIAGNOSIS_OUTPUT_SCHEMA } },
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      console.error("Diagnosis stopped early:", response.stop_reason);
      return NextResponse.json({ error: "Couldn't analyze the conversation." }, { status: 502 });
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ observations: toObservations(JSON.parse(text)) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error (diagnose):", error.status, error.message);
    } else {
      console.error("Unexpected error diagnosing conversation:", error);
    }
    // Diagnosis is a background enhancement — the client simply skips the
    // lesson suggestion when it fails.
    return NextResponse.json({ error: "Couldn't analyze the conversation." }, { status: 502 });
  }
}
