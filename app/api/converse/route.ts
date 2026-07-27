import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSofiaSystemPrompt, type SpanishLevel } from "@/lib/sofia-prompt";
import { logSessionEntry } from "@/lib/supabase";

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
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { history, level, sessionId } = (body ?? {}) as {
    history?: unknown;
    level?: unknown;
    sessionId?: unknown;
  };

  if (!Array.isArray(history) || !history.every(isConversationTurn)) {
    return NextResponse.json(
      {
        error:
          "`history` must be an array of { role: 'user' | 'assistant', content: string }.",
      },
      { status: 400 }
    );
  }

  if (history.length === 0) {
    return NextResponse.json(
      { error: "`history` must contain at least one message." },
      { status: 400 }
    );
  }

  if (typeof level !== "string" || !VALID_LEVELS.includes(level as SpanishLevel)) {
    return NextResponse.json(
      { error: `\`level\` must be one of: ${VALID_LEVELS.join(", ")}.` },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: buildSofiaSystemPrompt(level as SpanishLevel),
      messages: history,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Claude returned an empty response." },
        { status: 502 }
      );
    }

    if (typeof sessionId === "string" && sessionId) {
      await logSessionEntry({
        sessionId,
        level: level as SpanishLevel,
        role: "assistant",
        charCount: reply.length,
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // Log the full upstream detail server-side only — it can contain raw
      // JSON/internal detail that shouldn't be shown to end users.
      console.error("Anthropic API error:", error.status, error.message);
      const status = error.status ?? 502;
      const userMessage =
        status === 429
          ? "Sofía is getting a lot of requests right now — please wait a moment and try again."
          : "Sofía couldn't respond right now. Please try again in a moment.";
      return NextResponse.json({ error: userMessage }, { status });
    }
    console.error("Unexpected error calling Anthropic API:", error);
    return NextResponse.json(
      { error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}
