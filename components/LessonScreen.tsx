"use client";

import { useState } from "react";
import type { SpanishLevel } from "@/lib/sofia-prompt";
import type { Lesson, LessonDrill, Phrase } from "@/lib/lessons";
import type { SkillExample } from "@/lib/skill-profile";
import { SKILLS } from "@/lib/skills";
import { SofiaAvatar } from "./SofiaAvatar";
import { StarIcon } from "./ProgressBits";

export interface LessonOutcome {
  xp: number;
  streakExtended: boolean;
}

interface LessonScreenProps {
  lesson: Lesson;
  level: SpanishLevel;
  /** The learner's own recent mistake, quoted in the intro when we have one. */
  example: SkillExample | null;
  onSpeak: (text: string) => void;
  /** Banks the result; returns what to celebrate on the wrap-up card. */
  onComplete: (correct: number, total: number) => LessonOutcome;
  onPractice: () => void;
  onExit: () => void;
}

type Page =
  | { kind: "intro" }
  | { kind: "rule"; index: number }
  | { kind: "examples" }
  | { kind: "contrast" };

interface DrillState {
  /** Drill indices still to answer; a missed drill is re-queued once. */
  queue: number[];
  position: number;
  picked: string | null;
  firstTryCorrect: number;
  retried: number[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function SpeakButton({ text, onSpeak }: { text: string; onSpeak: (text: string) => void }) {
  return (
    <button
      onClick={() => onSpeak(text)}
      aria-label={`Hear: ${text}`}
      className="shrink-0 rounded-full bg-background px-2 py-1 text-sm hover:bg-brand-light"
    >
      🔊
    </button>
  );
}

function PhraseRow({
  phrase,
  onSpeak,
  delayMs = 0,
}: {
  phrase: Phrase;
  onSpeak: (text: string) => void;
  delayMs?: number;
}) {
  return (
    <li
      className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm animate-rise-in"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="flex-1">
        <span lang="es" className="block font-bold text-foreground">{phrase.es}</span>
        <span className="block text-sm text-ink-soft">{phrase.en}</span>
      </span>
      <SpeakButton text={phrase.es} onSpeak={onSpeak} />
    </li>
  );
}

export function LessonScreen({
  lesson,
  level,
  example,
  onSpeak,
  onComplete,
  onPractice,
  onExit,
}: LessonScreenProps) {
  const skill = SKILLS[lesson.skill];
  const pages: Page[] = [
    { kind: "intro" },
    ...lesson.rules.map((_, index) => ({ kind: "rule" as const, index })),
    { kind: "examples" },
    { kind: "contrast" },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  // Options are shuffled once per lesson so the answer isn't always in the
  // same slot, but stay put while the learner is looking at them.
  const [drills] = useState<LessonDrill[]>(() =>
    shuffle(lesson.drills).map((drill) => ({ ...drill, options: shuffle(drill.options) }))
  );
  const [drill, setDrill] = useState<DrillState>(() => ({
    queue: drills.map((_, index) => index),
    position: 0,
    picked: null,
    firstTryCorrect: 0,
    retried: [],
  }));
  const [outcome, setOutcome] = useState<LessonOutcome | null>(null);

  const inDrills = pageIndex >= pages.length;
  const totalSteps = pages.length + drill.queue.length;
  const step = inDrills ? pages.length + drill.position : pageIndex;
  const percent = outcome ? 100 : Math.round((step / totalSteps) * 100);

  function pick(option: string) {
    if (drill.picked) return;
    const current = drills[drill.queue[drill.position]];
    const index = drill.queue[drill.position];
    const isRetry = drill.retried.includes(index);
    const correct = option === current.answer;
    setDrill({
      ...drill,
      picked: option,
      firstTryCorrect: drill.firstTryCorrect + (correct && !isRetry ? 1 : 0),
      // Safe failure: a miss comes back once at the end, so the lesson
      // finishes on a right answer instead of a wrong one.
      queue: !correct && !isRetry ? [...drill.queue, index] : drill.queue,
      retried: !correct && !isRetry ? [...drill.retried, index] : drill.retried,
    });
  }

  function nextDrill() {
    const position = drill.position + 1;
    if (position >= drill.queue.length) {
      setOutcome(onComplete(drill.firstTryCorrect, drills.length));
      return;
    }
    setDrill({ ...drill, position, picked: null });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-5">
      <header className="flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label="Leave lesson"
          className="rounded-full px-2 py-1 text-lg font-bold text-ink-soft hover:text-brand"
        >
          ✕
        </button>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-card shadow-inner"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      </header>

      {outcome ? (
        <LessonWrap
          lesson={lesson}
          correct={drill.firstTryCorrect}
          total={drills.length}
          outcome={outcome}
          onPractice={onPractice}
          onExit={onExit}
        />
      ) : inDrills ? (
        <DrillCard
          key={drill.position}
          drill={drills[drill.queue[drill.position]]}
          isRetry={drill.position >= drills.length}
          picked={drill.picked}
          onPick={pick}
          onNext={nextDrill}
          onSpeak={onSpeak}
        />
      ) : (
        <TeachPage
          key={pageIndex}
          page={pages[pageIndex]}
          lesson={lesson}
          level={level}
          example={example}
          minutes={skill.minutes}
          drillCount={drills.length}
          onSpeak={onSpeak}
          onNext={() => setPageIndex(pageIndex + 1)}
        />
      )}
    </main>
  );
}

function ContinueButton({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <div className="mt-auto pt-8">
      <button
        onClick={onClick}
        className="press h-14 w-full rounded-2xl bg-gold text-lg font-extrabold text-night [--press-shadow:var(--gold-dark)]"
      >
        {label}
      </button>
    </div>
  );
}

function TeachPage({
  page,
  lesson,
  level,
  example,
  minutes,
  drillCount,
  onSpeak,
  onNext,
}: {
  page: Page;
  lesson: Lesson;
  level: SpanishLevel;
  example: SkillExample | null;
  minutes: number;
  drillCount: number;
  onSpeak: (text: string) => void;
  onNext: () => void;
}) {
  if (page.kind === "intro") {
    return (
      <>
        <section className="mt-8 flex flex-col items-center text-center animate-rise-in">
          <SofiaAvatar size="lg" />
          <h1 className="mt-4 font-display text-3xl leading-tight text-foreground">{lesson.title}</h1>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            ~{minutes} min · {drillCount} quick drills · then practice with me
          </p>
        </section>
        <div className="mt-6 rounded-2xl bg-card px-5 py-4 shadow-md shadow-night/5 animate-rise-in [animation-delay:120ms]">
          {example ? (
            <>
              <p className="text-sm text-ink-soft">Earlier you said</p>
              <p lang="es" className="mt-1 text-lg font-bold text-foreground line-through decoration-brand/60">
                {example.wrong}
              </p>
              <p className="mt-2 text-sm text-ink-soft">So close! By the end you&apos;ll say it like this:</p>
              <p lang="es" className="mt-1 flex items-center gap-2 text-lg font-bold text-accent">
                {example.right}
                <SpeakButton text={example.right} onSpeak={onSpeak} />
              </p>
            </>
          ) : (
            <>
              <p lang="es" className="text-xl font-bold leading-snug text-foreground">{lesson.hook.es}</p>
              <p className="mt-1 text-sm text-ink-soft">{lesson.hook.en}</p>
            </>
          )}
        </div>
        <ContinueButton onClick={onNext} label="Let's go" />
      </>
    );
  }

  if (page.kind === "rule") {
    const rule = lesson.rules[page.index];
    return (
      <>
        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">
          Rule {page.index + 1} of {lesson.rules.length}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight text-foreground animate-rise-in">
          {rule.name}
        </h2>
        <p
          lang={level === "Advanced" ? "es" : "en"}
          className="mt-3 text-base leading-relaxed text-foreground animate-rise-in [animation-delay:80ms]"
        >
          {level === "Advanced" ? rule.es : rule.en}
        </p>
        <ul className="mt-6">
          <PhraseRow phrase={rule.example} onSpeak={onSpeak} delayMs={160} />
        </ul>
        <ContinueButton onClick={onNext} />
      </>
    );
  }

  if (page.kind === "examples") {
    return (
      <>
        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">Hear it in action</p>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground">Real sentences</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {lesson.examples.map((phrase, index) => (
            <PhraseRow key={phrase.es} phrase={phrase} onSpeak={onSpeak} delayMs={index * 70} />
          ))}
        </ul>
        <ContinueButton onClick={onNext} />
      </>
    );
  }

  return (
    <>
      <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">Spot the difference</p>
      <h2 className="mt-1 text-2xl font-extrabold text-foreground">Common slips</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {lesson.contrasts.map((contrast, index) => (
          <li
            key={contrast.right}
            className="rounded-2xl bg-card px-4 py-3 shadow-sm animate-rise-in"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p lang="es" className="text-sm text-ink-soft line-through decoration-brand/60">
              {contrast.wrong}
            </p>
            <p lang="es" className="mt-0.5 flex items-center gap-2 font-bold text-accent">
              {contrast.right}
              <SpeakButton text={contrast.right} onSpeak={onSpeak} />
            </p>
            <p className="mt-1 text-sm text-foreground">{contrast.why}</p>
          </li>
        ))}
      </ul>
      <ContinueButton onClick={onNext} label="Try it yourself" />
    </>
  );
}

function DrillCard({
  drill,
  isRetry,
  picked,
  onPick,
  onNext,
  onSpeak,
}: {
  drill: LessonDrill;
  isRetry: boolean;
  picked: string | null;
  onPick: (option: string) => void;
  onNext: () => void;
  onSpeak: (text: string) => void;
}) {
  const answered = picked !== null;
  const correct = picked === drill.answer;
  const [before, after] = drill.prompt.split("___");

  return (
    <>
      <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">
        {isRetry ? "One more try" : "Fill the gap"}
      </p>
      <p lang="es" className="mt-3 text-2xl font-extrabold leading-snug text-foreground animate-rise-in">
        {before}
        <span
          className={`mx-1 inline-block min-w-16 border-b-4 text-center ${
            answered ? (correct ? "border-accent text-accent" : "border-brand text-brand") : "border-ink-soft/40"
          }`}
        >
          {answered ? drill.answer : " "}
        </span>
        {after}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{drill.hint}</p>

      <div className="mt-6 grid gap-3">
        {drill.options.map((option) => {
          const isAnswer = option === drill.answer;
          const isPicked = option === picked;
          const tone = !answered
            ? "border-border-soft bg-card hover:border-brand"
            : isAnswer
              ? "border-accent bg-accent-light"
              : isPicked
                ? "border-brand bg-brand-light"
                : "border-border-soft bg-card opacity-50";
          return (
            <button
              key={option}
              lang="es"
              onClick={() => onPick(option)}
              disabled={answered}
              className={`h-14 rounded-2xl border-2 text-lg font-bold text-foreground transition-colors ${tone}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          role="status"
          className={`mt-auto rounded-2xl px-4 pb-4 pt-3 animate-rise-in ${correct ? "bg-accent-light" : "bg-brand-light"}`}
        >
          <p className={`font-extrabold ${correct ? "text-accent" : "text-brand-dark"}`}>
            {correct ? "¡Eso es!" : isRetry ? "Casi — here's the trick:" : "Casi — it comes back at the end."}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-foreground">
            <span className="flex-1">{drill.why}</span>
            <SpeakButton text={drill.prompt.replace("___", drill.answer)} onSpeak={onSpeak} />
          </p>
          <button
            onClick={onNext}
            className={`press mt-3 h-12 w-full rounded-2xl text-base font-extrabold text-white ${
              correct ? "bg-accent [--press-shadow:#08715a]" : "bg-brand [--press-shadow:var(--brand-dark)]"
            }`}
          >
            Continue
          </button>
        </div>
      )}
    </>
  );
}

function LessonWrap({
  lesson,
  correct,
  total,
  outcome,
  onPractice,
  onExit,
}: {
  lesson: Lesson;
  correct: number;
  total: number;
  outcome: LessonOutcome;
  onPractice: () => void;
  onExit: () => void;
}) {
  const ratio = correct / total;
  const verdict =
    ratio === 1 ? "Perfect score!" : ratio >= 0.75 ? "Really strong!" : ratio >= 0.5 ? "Good progress!" : "You showed up — that's how it sticks.";

  return (
    <>
      <section className="mt-10 flex flex-col items-center text-center animate-rise-in">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Lesson complete</p>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{verdict}</h1>
        <span className="mt-5 flex items-center gap-2 font-display text-6xl leading-none text-brand animate-pop-in">
          <StarIcon className="h-10 w-10" />+{outcome.xp}
        </span>
        <span className="mt-1 text-sm font-bold uppercase tracking-wider text-ink-soft">XP earned</span>
        <p className="mt-4 text-sm text-ink-soft">
          {correct}/{total} right on the first try
          {outcome.streakExtended && " · streak +1 🔥"}
        </p>
      </section>

      <section className="mt-6 flex gap-3 rounded-2xl bg-brand-light px-4 py-4 animate-rise-in [animation-delay:200ms]">
        <SofiaAvatar size="sm" />
        <div className="flex-1">
          <p lang="es" className="font-bold text-foreground">{lesson.wrap.es}</p>
          <p className="mt-0.5 text-sm text-foreground">{lesson.wrap.en}</p>
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <button
          onClick={onPractice}
          className="press h-14 w-full rounded-2xl bg-gold text-lg font-extrabold text-night [--press-shadow:var(--gold-dark)]"
        >
          🎤 Practice with Sofía
        </button>
        <button
          onClick={onExit}
          className="h-12 w-full rounded-2xl text-base font-bold text-ink-soft hover:text-brand"
        >
          Back to lessons
        </button>
      </div>
    </>
  );
}
