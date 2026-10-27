import {
  CONVERSATION_TOPICS,
  pickRandomTopic,
  type ConversationTopic,
} from "@/lib/conversation-topics";

interface TopicSelectScreenProps {
  mission: ConversationTopic;
  onBack: () => void;
  onSelect: (topic: ConversationTopic) => void;
}

export function TopicSelectScreen({ mission, onBack, onSelect }: TopicSelectScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-6">
      <button
        onClick={onBack}
        className="self-start text-sm font-semibold text-ink-soft hover:text-brand"
      >
        ← Back
      </button>
      <h1 className="mt-4 font-display text-3xl leading-tight text-foreground">
        What should we talk about?
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Sofía opens the conversation.</p>

      <button
        onClick={() => onSelect(pickRandomTopic())}
        className="press mt-6 w-full rounded-2xl bg-brand px-5 py-4 text-left text-base font-extrabold text-white [--press-shadow:var(--brand-dark)]"
      >
        🎲 Sorpréndeme <span className="font-semibold opacity-80">— surprise me</span>
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {CONVERSATION_TOPICS.map((option) => {
          const isMission = option.id === mission.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option)}
              className={`relative rounded-2xl border-2 bg-card px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-brand ${
                isMission ? "border-gold" : "border-border-soft"
              }`}
            >
              {isMission && (
                <span className="absolute -top-2.5 right-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase text-night">
                  Mission
                </span>
              )}
              <span className="mr-1.5 text-base" aria-hidden="true">{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>
    </main>
  );
}
