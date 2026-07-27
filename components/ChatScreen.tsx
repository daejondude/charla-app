"use client";

import { useEffect, useState, type RefObject } from "react";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import type { ConversationTopic } from "@/lib/conversation-topics";
import type { ChatMessage, Status } from "@/lib/chat-types";
import { SofiaAvatar } from "./SofiaAvatar";
import { TypingIndicator } from "./TypingIndicator";

const STATUS_META: Record<Status, { icon: string; label: string }> = {
  idle: { icon: "🎤", label: "Tap the mic and say something in Spanish." },
  recording: { icon: "🔴", label: "Listening... tap again to stop." },
  transcribing: { icon: "✍️", label: "Transcribing your voice..." },
  thinking: { icon: "💭", label: "Sofía is thinking..." },
  speaking: { icon: "🔊", label: "Sofía is speaking..." },
  paused: { icon: "⏸️", label: "Paused — mic is off. Tap Resume to continue." },
};

interface ChatScreenProps {
  level: SpanishLevel;
  topic: ConversationTopic;
  messages: ChatMessage[];
  status: Status;
  error: string | null;
  isRecordButtonDisabled: boolean;
  onRecordButtonClick: () => void;
  onSendText: (text: string) => void;
  onTogglePause: () => void;
  onNewTopic: () => void;
  onChangeLevel: () => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatScreen({
  level,
  topic,
  messages,
  status,
  error,
  isRecordButtonDisabled,
  onRecordButtonClick,
  onSendText,
  onTogglePause,
  onNewTopic,
  onChangeLevel,
  messagesEndRef,
}: ChatScreenProps) {
  const isPaused = status === "paused";
  const turnCount = messages.filter((message) => message.role === "user").length;
  const [celebration, setCelebration] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  // Typing is blocked only while audio is actually being captured/processed
  // for a voice turn (recording/transcribing) — allowed while idle, and
  // also while Sofia is "thinking" or "speaking" so the user can interrupt
  // her instead of waiting. onSendText handles canceling whatever's in
  // flight when that happens.
  const canType = status !== "recording" && status !== "transcribing";

  useEffect(() => {
    if (turnCount > 0 && turnCount % 5 === 0) {
      setCelebration(`¡Vas muy bien! 🔥 ${turnCount} turnos`);
      const timeout = setTimeout(() => setCelebration(null), 2600);
      return () => clearTimeout(timeout);
    }
  }, [turnCount]);

  return (
    <div className="relative flex flex-1 flex-col bg-background">
      {celebration && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 animate-toast-in whitespace-nowrap rounded-full bg-gradient-to-r from-gold to-brand px-4 py-2 text-xs font-bold text-white shadow-lg">
          {celebration}
        </div>
      )}

      <header className="flex items-center justify-between border-b border-border-soft bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SofiaAvatar size="sm" speaking={status === "speaking"} />
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              Charla con Sofía
            </p>
            <p className="text-xs text-ink-soft">
              {level} · {topic.emoji} {topic.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {turnCount > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-bold text-brand-dark sm:inline-flex">
              🔥 {turnCount}
            </span>
          )}
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume conversation" : "Pause conversation"}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
              isPaused
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-border-soft text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            onClick={onNewTopic}
            className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-brand hover:underline"
          >
            New topic
          </button>
          <button
            onClick={onChangeLevel}
            className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-brand hover:underline"
          >
            Change level
          </button>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-soft">
            Sofía is getting the conversation started...
          </p>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
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
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-brand to-brand-dark text-white"
                      : "rounded-bl-md border border-border-soft bg-card text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {status === "thinking" && (
              <div className="flex animate-message-in items-end justify-start gap-2">
                <SofiaAvatar size="sm" />
                <div className="rounded-2xl rounded-bl-md border border-border-soft bg-card px-4 py-3 text-ink-soft shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border-soft bg-card px-4 py-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3">
          {error && (
            <p
              role="alert"
              className="text-center text-xs font-medium text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
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
              className="flex-1 rounded-full border border-border-soft bg-background px-4 py-2 text-sm text-foreground placeholder:text-ink-soft/60 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canType || !textValue.trim()}
              aria-label="Send message"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p
            aria-live="polite"
            className="flex items-center gap-1.5 text-center text-xs text-ink-soft"
          >
            <span aria-hidden="true">{STATUS_META[status].icon}</span>
            {STATUS_META[status].label}
          </p>
          <button
            onClick={onRecordButtonClick}
            disabled={isRecordButtonDisabled}
            aria-label={status === "recording" ? "Stop recording" : "Start recording"}
            className="relative flex h-16 w-16 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "recording" && (
              <>
                <span className="absolute inset-0 rounded-full bg-rose-500/50 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full bg-rose-500/50 animate-pulse-ring [animation-delay:0.5s]" />
              </>
            )}
            <span
              className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform ${
                status === "recording"
                  ? "bg-gradient-to-br from-rose-500 to-rose-600"
                  : "bg-gradient-to-br from-brand to-brand-dark hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-white"
              >
                <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
