import { SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import {
  STATUS_LABELS,
  skillStatus,
  suggestionLine,
  type LessonSuggestion,
  type SkillProfile,
  type SkillStatus,
} from "@/lib/skill-profile";
import { SofiaAvatar } from "./SofiaAvatar";

interface LibraryScreenProps {
  profile: SkillProfile;
  suggestion: LessonSuggestion | null;
  onOpenLesson: (skill: SkillId) => void;
  onBack: () => void;
}

const STATUS_STYLES: Record<SkillStatus, string> = {
  new: "bg-background text-ink-soft",
  "needs-work": "bg-brand-light text-brand-dark",
  improving: "bg-gold/25 text-foreground",
  mastered: "bg-accent-light text-accent",
};

export function StatusChip({ status }: { status: SkillStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status]}`}>
      {status === "mastered" && "✓ "}
      {STATUS_LABELS[status]}
    </span>
  );
}

export function LibraryScreen({ profile, suggestion, onOpenLesson, onBack }: LibraryScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-6">
      <button
        onClick={onBack}
        className="self-start text-sm font-semibold text-ink-soft hover:text-brand"
      >
        ← Back
      </button>
      <h1 className="mt-4 font-display text-3xl leading-tight text-foreground">Lessons</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Quick, focused lessons — then you practice with Sofía.
      </p>

      {suggestion && (
        <button
          onClick={() => onOpenLesson(suggestion.skill)}
          className="press mt-6 flex w-full items-center gap-3 rounded-2xl bg-night px-4 py-4 text-left text-white [--press-shadow:#1a0f3d] animate-rise-in"
        >
          <SofiaAvatar size="sm" />
          <span className="flex-1">
            <span className="block text-xs font-bold uppercase tracking-wider text-gold">
              Sofía suggests
            </span>
            <span className="mt-0.5 block text-sm font-semibold leading-snug">
              {suggestionLine(suggestion)}
            </span>
          </span>
          <span aria-hidden="true" className="text-xl">→</span>
        </button>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {SKILL_IDS.map((id, index) => {
          const skill = SKILLS[id];
          const state = profile.skills[id];
          const status = skillStatus(state);
          const percent = state.mastery === null ? null : Math.round(state.mastery * 100);
          return (
            <li key={id} className="animate-rise-in" style={{ animationDelay: `${80 + index * 60}ms` }}>
              <button
                onClick={() => onOpenLesson(id)}
                className="w-full rounded-2xl border-2 border-border-soft bg-card px-4 py-4 text-left transition-colors hover:border-brand"
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 text-2xl" aria-hidden="true">{skill.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-extrabold text-foreground">{skill.label}</span>
                      <StatusChip status={status} />
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{skill.tagline}</span>
                    {percent !== null && (
                      <span
                        className="mt-3 block h-1.5 overflow-hidden rounded-full bg-background"
                        role="progressbar"
                        aria-label={`${skill.label} skill`}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className={`block h-full rounded-full ${status === "mastered" ? "bg-accent" : "bg-brand"}`}
                          style={{ width: `${Math.max(6, percent)}%` }}
                        />
                      </span>
                    )}
                    <span className="mt-2 block text-xs font-semibold text-ink-soft">
                      ~{skill.minutes} min
                      {state.lessonsCompleted > 0 &&
                        ` · done ${state.lessonsCompleted}×`}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Sofía updates these after every conversation.
      </p>
    </main>
  );
}
