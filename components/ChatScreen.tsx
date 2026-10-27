"use client";

import { useState, type RefObject } from "react";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import type { ConversationTopic } from "@/lib/conversation-topics";
import type { ChatMessage, Status } from "@/lib/chat-types";
import { SofiaAvatar } from "./SofiaAvatar";
import { TypingIndicator } from "./TypingIndicator";
import { StarIcon } from "./ProgressBits";

const STATUS_META: Record<Status, { icon: string; label: string }> = {
  idle: { icon: "🎤", label: "Tap the mic and answer in Spanish." },
  recording: { icon: "🔴", label: "Te escucho… tap again when you're done." },
  transcribing: { icon: "✍️", label: "Catching every word…" },
  thinking: { icon: "💭", label: "Sofía is thinking…" },
  speaking: { icon: "🔊", label: "Sofía is talking…" },
  paused: { icon: "⏸️", label: "Paused — mic is off. Tap Resume to continue." },
};

/** A just-earned reward, keyed so repeated rewards re-trigger the animation. */
export interface RewardFlash {
  id: number;
  xp: number;
  label: string | null;
}

interface ChatScreenProps {
  level: SpanishLevel;
  topic: ConversationTopic;
  messages: ChatMessage[];
  status: Status;
  error: string | null;
  sessionXp: number;
  todayTurns: number;
  goalTurns: number;
  reward: RewardFlash | null;
  isRecordButtonDisabled: boolean;
  onRecordButtonClick: () => void;
  onSendText: (text: string) => void;
  onTogglePause: () => void;
  onFinish: () => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatScreen({
  level,
  topic,
  messages,
  status,
  error,
  sessionXp,
  todayTurns,
  goalTurns,
  reward,
  isRecordButtonDisabled,
  onRecordButtonClick,
  onSendText,
  onTogglePause,
  onFinish,
  messagesEndRef,
}: ChatScreenProps) {
  const isPaused = status === "paused";
  const isRecording = status === "recording";
  const [textValue, setTextValue] = useState("");
  // Typing is blocked only while audio is actually being captured/processed
  // for a voice turn (recording/transcribing) — allowed while idle, and
  // also while Sofia is "thinking" or "speaking" so the user can interrupt
  // her instead of waiting. onSendText handles canceling whatever's in
  // flight when that happens.
  const canType = status !== "recording" && status !== "transcribing";
  const goalPercent = Math.min(100, Math.round((todayTurns / goalTurns) * 100));

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background">
      {reward?.label && (
        <div
          key={reward.id}
          role="status"
          className="pointer-events-none absolute left-1/2 top-20 z-10 animate-toast-in whitespace-nowrap rounded-full bg-night px-4 py-2 text-sm font-bold text-white shadow-lg"
        >
          {reward.label}
          {reward.xp > 0 && <span className="ml-1.5 text-gold">+{reward.xp}</span>}
        </div>
      )}

      <header className="bg-card px-4 pb-2 pt-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SofiaAvatar size="sm" speaking={status === "speaking"} />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">Sofía</p>
              <p className="truncate text-xs text-ink-soft">
                {topic.emoji} {topic.label} · {level}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="relative flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-sm font-extrabold tabular-nums text-foreground"
              aria-label={`${sessionXp} XP this conversation`}
            >
              <StarIcon className="h-4 w-4" />
              {sessionXp}
              {reward && reward.xp > 0 && (
                <span
                  key={reward.id}
                  aria-hidden="true"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 animate-float-up text-xs font-extrabold text-brand"
                >
                  +{reward.xp}
                </span>
              )}
            </span>
            <button
              onClick={onTogglePause}
              aria-label={isPaused ? "Resume conversation" : "Pause conversation"}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                isPaused ? "bg-gold text-night" : "bg-background text-ink-soft hover:text-brand"
              }`}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              onClick={onFinish}
              className="rounded-full bg-brand px-3 py-1 text-xs font-extrabold text-white hover:bg-brand-dark"
            >
              Finish
            </button>
          </div>
        </div>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border-soft"
          role="progressbar"
          aria-label="Daily goal progress"
          aria-valuemin={0}
          aria-valuemax={goalTurns}
          aria-valuenow={Math.min(todayTurns, goalTurns)}
        >
          <span
            className="block h-full rounded-full bg-gold transition-[width] duration-700 ease-out"
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-atomic="false">
        {messages.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <SofiaAvatar size="md" speaking />
            <p className="text-sm text-ink-soft">Sofía is pulling up a chair…</p>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex animate-message-in items-end gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && <SofiaAvatar size="sm" />}
                <div
                  lang="es"
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-sm bg-night text-white"
                      : "rounded-bl-sm bg-card text-foreground shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {status === "thinking" && (
              <div className="flex animate-message-in items-end justify-start gap-2">
                <SofiaAvatar size="sm" />
                <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-ink-soft shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-1px_0_var(--border-soft)]">
        <div className="flex w-full flex-col items-center gap-3">
          {error && (
            <p role="alert" className="text-center text-sm font-semibold text-brand-dark">
              {error}
            </p>
          )}
          <button
            onClick={onRecordButtonClick}
            disabled={isRecordButtonDisabled}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className="relative flex h-20 w-20 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-brand/50 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full bg-brand/50 animate-pulse-ring [animation-delay:0.5s]" />
              </>
            )}
            <span
              className={`press relative flex h-20 w-20 items-center justify-center rounded-full ${
                isRecording
                  ? "bg-brand [--press-shadow:var(--brand-dark)]"
                  : "bg-gold [--press-shadow:var(--gold-dark)]"
              }`}
            >
              {isRecording ? (
                <span className="h-7 w-7 rounded-md bg-white" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 fill-night">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm7 8a1 1 0 0 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 0 0-2 0v1a7 7 0 0 0 6 6.9V21H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.1a7 7 0 0 0 6-6.9v-1Z" />
                </svg>
              )}
            </span>
          </button>
          <p aria-live="polite" className="flex items-center gap-1.5 text-center text-xs font-medium text-ink-soft">
            <span aria-hidden="true">{STATUS_META[status].icon}</span>
            {STATUS_META[status].label}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!textValue.trim() || !canType) return;
              onSendText(textValue);
              setTextValue("");
            }}
            className="flex w-full items-center gap-2"
          >
            <input
              type="text"
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              disabled={!canType}
              placeholder="Or type your message in Spanish..."
              aria-label="Type a message in Spanish"
              lang="es"
              className="flex-1 rounded-full border-2 border-border-soft bg-background px-4 py-2 text-sm text-foreground placeholder:text-ink-soft/70 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canType || !textValue.trim()}
              aria-label="Send message"
              className="rounded-full bg-night px-4 py-2 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
