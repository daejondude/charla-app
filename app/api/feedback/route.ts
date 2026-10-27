import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import { getAnthropicApiKey } from "@/lib/anthropic-key";

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

const FEEDBACK_SYSTEM_PROMPT = `You are Sofía, a warm, playful Spanish conversation partner from Guadalajara who lives in Madrid. You just finished a practice conversation with a learner, and you're leaving them a short personal note.

Write the note in English, 2-3 sentences, under 60 words total:
- Name one specific thing they did well, quoting a short Spanish phrase they actually said.
- Give one gentle, concrete tip for next time, with the correct Spanish form if it's about a mistake.
- End with a short Spanish sign-off (for example "¡Hasta mañana!").
Sound like a friend, not a report card: warm, specific, a little playful. No headings, no lists, no quotation of this instruction.`;

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
        model: "claude-opus-4-8",
        max_tokens: 300,
        system: FEEDBACK_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `The learner's level is ${level}. Here is the conversation:\n\n${transcript}\n\nWrite your note now.`,
          },
        ],
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const note = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!note) {
      return NextResponse.json({ error: "Empty feedback." }, { status: 502 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error (feedback):", error.status, error.message);
    } else {
      console.error("Unexpected error generating feedback:", error);
    }
    // The client falls back to a canned note, so the message here is never shown.
    return NextResponse.json({ error: "Couldn't generate feedback." }, { status: 502 });
  }
}
