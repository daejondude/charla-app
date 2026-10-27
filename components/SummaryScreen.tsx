"use client";

import { useEffect, useState } from "react";
import { recentWeek, type Progress, type SessionBonus } from "@/lib/progress";
import { SofiaAvatar } from "./SofiaAvatar";
import { ArchMeter, FlameIcon, WeekStrip } from "./ProgressBits";

export interface SessionSummary {
  turns: number;
  turnXp: number;
  bonuses: SessionBonus[];
  streakExtended: boolean;
  goalHit: boolean;
  isFirstSession: boolean;
  headline: string;
}

interface SummaryScreenProps {
  summary: SessionSummary;
  progress: Progress;
  /** null while Sofía's note is still being written. */
  note: string | null;
  onKeepTalking: () => void;
  onDone: () => void;
}

const CONFETTI_COLORS = ["bg-brand", "bg-gold", "bg-accent", "bg-night", "bg-brand-light"];

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          className={`absolute top-0 h-3 w-2 animate-confetti rounded-sm ${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}`}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 7) * 110}ms`,
            animationDuration: `${2.2 + (index % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

function useCountUp(target: number, durationMs = 1100): number {
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reducedMotion]);
  return reducedMotion ? target : value;
}

export function SummaryScreen({ summary, progress, note, onKeepTalking, onDone }: SummaryScreenProps) {
  const totalXp = summary.turnXp + summary.bonuses.reduce((sum, bonus) => sum + bonus.xp, 0);
  const shownXp = useCountUp(totalXp);
  const celebrate = summary.isFirstSession || summary.goalHit || summary.streakExtended;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-8">
      {celebrate && <Confetti />}

      <p className="text-center text-xs font-bold uppercase tracking-wider text-brand animate-rise-in">
        Conversation complete
      </p>
      <h1 className="mt-2 text-center text-2xl font-extrabold text-foreground animate-rise-in">
        {summary.headline}
      </h1>

      <div className="mt-6 flex flex-col items-center animate-pop-in [animation-delay:150ms]">
        <span className="font-display text-7xl leading-none text-brand tabular-nums" aria-label={`${totalXp} XP earned`}>
          +{shownXp}
        </span>
        <span className="mt-1 text-sm font-bold uppercase tracking-wider text-ink-soft">XP earned</span>
      </div>

      {summary.bonuses.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {summary.bonuses.map((bonus) => (
            <li
              key={bonus.label}
              className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-foreground animate-pop-in [animation-delay:500ms]"
            >
              {bonus.label} +{bonus.xp}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-6 grid grid-cols-3 gap-3 animate-rise-in [animation-delay:250ms]" aria-label="Session stats">
        <div className="flex flex-col items-center rounded-2xl bg-card px-2 py-3 shadow-sm">
          <span className="text-2xl font-extrabold tabular-nums text-foreground">{summary.turns}</span>
          <span className="text-xs text-ink-soft">{summary.turns === 1 ? "turn" : "turns"}</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl bg-card px-2 py-3 shadow-sm">
          <span className="flex items-center gap-1 text-2xl font-extrabold tabular-nums text-foreground">
            <FlameIcon lit className={`h-6 w-6 ${summary.streakExtended ? "animate-flicker" : ""}`} />
            {progress.streak}
          </span>
          <span className="text-xs text-ink-soft">
            {summary.streakExtended ? "streak +1" : "day streak"}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-2xl bg-card px-2 py-3 shadow-sm">
          <ArchMeter value={progress.todayTurns} max={progress.goalTurns} className="h-8 w-6" />
          <span className="mt-1 text-xs text-ink-soft">
            {Math.min(progress.todayTurns, progress.goalTurns)}/{progress.goalTurns} goal
          </span>
        </div>
      </section>

      <div className="mt-4 rounded-2xl bg-card px-4 py-3 shadow-sm animate-rise-in [animation-delay:320ms]">
        <WeekStrip days={recentWeek(progress)} />
      </div>

      <section
        className="mt-4 flex gap-3 rounded-2xl bg-brand-light px-4 py-4 animate-rise-in [animation-delay:400ms]"
        aria-label="A note from Sofía"
        aria-live="polite"
      >
        <SofiaAvatar size="sm" />
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">A note from Sofía</p>
          {note === null ? (
            <div className="mt-2 space-y-2" aria-label="Sofía is writing you a note">
              <span className="block h-3 w-full animate-pulse rounded bg-brand/20" />
              <span className="block h-3 w-4/5 animate-pulse rounded bg-brand/20" />
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-foreground">{note}</p>
          )}
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <button
          onClick={onKeepTalking}
          className="press h-14 w-full rounded-2xl bg-gold text-lg font-extrabold text-night [--press-shadow:var(--gold-dark)]"
        >
          Keep talking
        </button>
        <button
          onClick={onDone}
          className="h-12 w-full rounded-2xl text-base font-bold text-ink-soft hover:text-brand"
        >
          Done for now
        </button>
      </div>
    </main>
  );
}
