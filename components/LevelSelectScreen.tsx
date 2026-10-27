import type { SpanishLevel } from "@/lib/sofia-prompt";
import { SofiaAvatar } from "./SofiaAvatar";

const LEVELS: {
  level: SpanishLevel;
  title: string;
  blurb: string;
  /** How much of the arch is filled — difficulty at a glance. */
  fill: number;
}[] = [
  { level: "Beginner", title: "I know a few words", blurb: "Short, simple Spanish. Corrections in English.", fill: 33 },
  { level: "Intermediate", title: "I can get by", blurb: "Everyday topics and past tense. Corrections in English.", fill: 66 },
  { level: "Advanced", title: "I want to sound native", blurb: "Natural speed, idioms, and slang. All in Spanish.", fill: 100 },
];

interface LevelSelectScreenProps {
  current: SpanishLevel | null;
  onSelect: (level: SpanishLevel) => void;
  onBack?: () => void;
}

export function LevelSelectScreen({ current, onSelect, onBack }: LevelSelectScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-6">
      {onBack && (
        <button
          onClick={onBack}
          className="self-start text-sm font-semibold text-ink-soft hover:text-brand"
        >
          ← Back
        </button>
      )}
      <div className="mt-4 flex items-end gap-3 animate-rise-in">
        <SofiaAvatar size="md" />
        <p lang="es" className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-base font-semibold text-foreground shadow-sm">
          ¿Cuánto español hablas? <span className="block text-sm font-normal text-ink-soft">How much Spanish do you speak?</span>
        </p>
      </div>
      <h1 className="mt-8 font-display text-3xl leading-tight text-foreground">
        Pick your difficulty
      </h1>
      <p className="mt-1 text-sm text-ink-soft">You can change this any time.</p>

      <div className="mt-6 flex flex-col gap-4">
        {LEVELS.map(({ level, title, blurb, fill }, index) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            style={{ animationDelay: `${index * 70}ms` }}
            className={`press group flex animate-rise-in items-center gap-4 rounded-2xl border-2 bg-card px-4 py-4 text-left [--press-shadow:var(--border-soft)] ${
              current === level ? "border-brand" : "border-border-soft hover:border-brand"
            }`}
          >
            <span
              className="relative h-14 w-10 shrink-0 overflow-hidden rounded-t-full rounded-b-sm bg-border-soft"
              aria-hidden="true"
            >
              <span className="absolute inset-x-0 bottom-0 bg-brand" style={{ height: `${fill}%` }} />
            </span>
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand">{level}</span>
              <span className="block text-lg font-bold text-foreground">{title}</span>
              <span className="block text-sm text-ink-soft">{blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
