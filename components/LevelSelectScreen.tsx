import type { SpanishLevel } from "@/lib/sofia-prompt";
import { SofiaAvatar } from "./SofiaAvatar";

const LEVELS: { level: SpanishLevel; icon: string; blurb: string }[] = [
  { level: "Beginner", icon: "🌱", blurb: "Simple words, present tense. Corrections in English." },
  { level: "Intermediate", icon: "🌿", blurb: "Everyday vocabulary, past tense. All in Spanish." },
  { level: "Advanced", icon: "🌳", blurb: "Natural, fast, idiomatic — like a native speaker." },
];

interface LevelSelectScreenProps {
  onSelect: (level: SpanishLevel) => void;
}

export function LevelSelectScreen({ onSelect }: LevelSelectScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border-soft bg-card p-8 shadow-lg shadow-brand/5">
        <SofiaAvatar size="lg" />
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">
          Charla
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Practice speaking Spanish with Sofía. Pick your level to start.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {LEVELS.map(({ level, icon, blurb }) => (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className="group flex items-start gap-3 rounded-2xl border border-border-soft bg-background px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md active:translate-y-0 active:scale-[0.99]"
            >
              <span className="text-2xl">{icon}</span>
              <span>
                <span className="block font-display text-base font-semibold text-foreground group-hover:text-brand">
                  {level}
                </span>
                <span className="block text-xs text-ink-soft">{blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
