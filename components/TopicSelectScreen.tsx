import {
  CONVERSATION_TOPICS,
  pickRandomTopic,
  type ConversationTopic,
} from "@/lib/conversation-topics";
import type { SpanishLevel } from "@/lib/sofia-prompt";

const CHIP_STYLES = [
  "bg-brand-light",
  "bg-accent-light",
  "bg-amber-100 dark:bg-amber-950/40",
  "bg-sky-100 dark:bg-sky-950/40",
  "bg-rose-100 dark:bg-rose-950/40",
  "bg-emerald-100 dark:bg-emerald-950/40",
];

interface TopicSelectScreenProps {
  level: SpanishLevel;
  onBack: () => void;
  onSelect: (topic: ConversationTopic) => void;
}

export function TopicSelectScreen({ level, onBack, onSelect }: TopicSelectScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-border-soft bg-card p-8 shadow-lg shadow-brand/5">
        <button
          onClick={onBack}
          className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-brand hover:underline"
        >
          ← Change level ({level})
        </button>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          What should we talk about?
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Sofía opens the conversation. Pick a topic, or let her surprise you.
        </p>
        <button
          onClick={() => onSelect(pickRandomTopic())}
          className="mt-5 w-full animate-pop-in rounded-2xl bg-gradient-to-r from-brand to-brand-dark px-4 py-3.5 text-left font-display text-sm font-bold text-white shadow-md shadow-brand/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
        >
          🎲 Sorpréndeme — surprise me
        </button>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {CONVERSATION_TOPICS.map((option, index) => (
            <button
              key={option.id}
              onClick={() => onSelect(option)}
              className={`rounded-2xl border border-border-soft px-3 py-3 text-left text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md active:translate-y-0 active:scale-[0.99] ${CHIP_STYLES[index % CHIP_STYLES.length]}`}
            >
              <span className="mr-1.5 text-base">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
