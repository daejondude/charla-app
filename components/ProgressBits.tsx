import type { DayState } from "@/lib/progress";

export function FlameIcon({ lit, className = "" }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 2c.6 3.2 3 4.9 4.6 7.1A7 7 0 1 1 5.4 13c.3-2.2 1.6-3.6 2.8-4.6.1 1.7.8 2.9 2 3.6C10 8.4 10.6 4.8 12 2Z"
        className={lit ? "fill-gold" : "fill-ink-soft/35"}
      />
      <path
        d="M12 13.2c.9 1.3 2.4 2.1 2.4 4a2.4 2.4 0 1 1-4.8 0c0-1.4.9-2.4 2.4-4Z"
        className={lit ? "fill-brand" : "fill-ink-soft/50"}
      />
    </svg>
  );
}

export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z"
        className="fill-brand"
      />
    </svg>
  );
}

export function SnowflakeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5" />
    </svg>
  );
}

/** Streak, XP, and freezes — always visible at the top of the home screen. */
export function StatChips({
  streak,
  litToday,
  xp,
  freezes,
}: {
  streak: number;
  litToday: boolean;
  xp: number;
  freezes: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-extrabold tabular-nums text-foreground shadow-sm"
        aria-label={`${streak} day streak`}
      >
        <FlameIcon lit={litToday} className={`h-5 w-5 ${litToday ? "animate-flicker" : ""}`} />
        {streak}
      </span>
      <span
        className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-extrabold tabular-nums text-foreground shadow-sm"
        aria-label={`${xp} XP total`}
      >
        <StarIcon className="h-4.5 w-4.5" />
        {xp}
      </span>
      {freezes > 0 && (
        <span
          className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-extrabold tabular-nums text-sky-600 shadow-sm dark:text-sky-300"
          aria-label={`${freezes} streak ${freezes === 1 ? "freeze" : "freezes"}`}
          title="Streak freezes cover a missed day automatically"
        >
          <SnowflakeIcon className="h-4 w-4" />
          {freezes}
        </span>
      )}
    </div>
  );
}

const DAY_STYLES: Record<DayState, string> = {
  active: "bg-gold text-night",
  frozen: "bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  today: "border-2 border-dashed border-brand text-brand",
  missed: "bg-border-soft/60 text-ink-soft",
};

export function WeekStrip({
  days,
}: {
  days: { key: string; label: string; state: DayState }[];
}) {
  return (
    <ol className="flex justify-between gap-1" aria-label="Practice in the last 7 days">
      {days.map((day) => (
        <li key={day.key} className="flex flex-col items-center gap-1">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-t-full rounded-b-sm text-[11px] font-bold ${DAY_STYLES[day.state]}`}
            aria-label={`${day.key}: ${day.state}`}
          >
            {day.state === "active" ? "✓" : day.state === "frozen" ? "❄" : ""}
          </span>
          <span className="text-[10px] font-semibold uppercase text-ink-soft">{day.label}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The daily goal as a doorway that fills from the floor up — the arch
 * motif doing real work as a progress meter.
 */
export function ArchMeter({
  value,
  max,
  className = "h-16 w-12",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-label="Daily goal progress"
      className={`relative inline-block overflow-hidden rounded-t-full rounded-b-md bg-border-soft ${className}`}
    >
      <span
        className="absolute inset-x-0 bottom-0 bg-gold transition-[height] duration-700 ease-out"
        style={{ height: `${percent}%` }}
      />
      {percent >= 100 && (
        <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-night">
          ✓
        </span>
      )}
    </span>
  );
}
