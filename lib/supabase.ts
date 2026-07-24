import { createClient } from "@supabase/supabase-js";
import type { SpanishLevel } from "./sofia-prompt";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

export interface SessionLogEntry {
  sessionId: string;
  level: SpanishLevel;
  role: "user" | "assistant";
  charCount: number;
}

/**
 * Logs one row to the `sessions` table. Never throws — a logging failure
 * (or Supabase being unconfigured) must never break the actual
 * transcribe/converse response, so failures are swallowed and reported to
 * the server console only.
 */
export async function logSessionEntry(entry: SessionLogEntry): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured — skipping session log.");
    return;
  }
  try {
    const { error } = await supabase.from("sessions").insert({
      session_id: entry.sessionId,
      level: entry.level,
      role: entry.role,
      char_count: entry.charCount,
    });
    if (error) {
      console.error("Failed to log session entry to Supabase:", error.message);
    }
  } catch (err) {
    console.error("Unexpected error logging session entry:", err);
  }
}
