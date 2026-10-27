import type { SpanishLevel } from "./sofia-prompt";

/**
 * Local-first learner progress: streak, XP, daily goal, streak freezes.
 * Lives in localStorage so the very first conversation counts without any
 * signup. Every function here is pure (takes a Progress, returns a new one)
 * except load/save, which are the only places that touch storage.
 */

const STORAGE_KEY = "charla:progress:v1";

export const DAILY_GOAL_TURNS = 5;
const MAX_FREEZES = 2;
const ACTIVE_DATES_KEPT = 30;

const XP_VOICE_TURN = 15;
const XP_TEXT_TURN = 8;
const XP_LONG_SENTENCE = 5;
const LONG_SENTENCE_WORDS = 8;
const LUCKY_CHANCE = 0.12;
const XP_GOAL_COMPLETE = 30;
const XP_SESSION_COMPLETE = 20;
const XP_MISSION_COMPLETE = 20;
const MIN_TURNS_FOR_SESSION_BONUS = 3;
const XP_LESSON_DRILL = 5;
const XP_LESSON_COMPLETE = 25;

export interface Progress {
  xp: number;
  streak: number;
  longestStreak: number;
  freezes: number;
  /** Local calendar date (YYYY-MM-DD) of the last day with a completed turn. */
  lastActiveDate: string | null;
  /** Days with a completed turn, most recent last. */
  activeDates: string[];
  /** Days a streak freeze covered, so the week view can show them. */
  frozenDates: string[];
  todayDate: string;
  todayTurns: number;
  todayXp: number;
  goalTurns: number;
  sessionsCompleted: number;
  /** Date the daily mission bonus was last earned — it pays out once a day. */
  missionDoneDate: string | null;
  level: SpanishLevel | null;
}

export type RewardKind = "lucky" | "long" | "streak" | "goal" | "freeze";

export interface RewardEvent {
  kind: RewardKind;
  xp: number;
}

export type StreakNotice = "freeze-used" | "streak-lost" | null;

export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day + days));
}

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function keepRecent(dates: string[]): string[] {
  return dates.slice(-ACTIVE_DATES_KEPT);
}

export function createProgress(today: string = dateKey()): Progress {
  return {
    xp: 0,
    streak: 0,
    longestStreak: 0,
    // One freeze to start, so a single missed day early on doesn't erase
    // the habit before it has formed.
    freezes: 1,
    lastActiveDate: null,
    activeDates: [],
    frozenDates: [],
    todayDate: today,
    todayTurns: 0,
    todayXp: 0,
    goalTurns: DAILY_GOAL_TURNS,
    sessionsCompleted: 0,
    missionDoneDate: null,
    level: null,
  };
}

/**
 * Rolls the daily counters over and settles the streak for any days missed
 * since the last visit, spending freezes to cover gaps when there are enough.
 */
export function reconcileProgress(
  progress: Progress,
  today: string = dateKey()
): { progress: Progress; notice: StreakNotice } {
  let next = { ...progress };
  let notice: StreakNotice = null;

  if (next.todayDate !== today) {
    next = { ...next, todayDate: today, todayTurns: 0, todayXp: 0 };
  }

  if (next.lastActiveDate && next.streak > 0) {
    const missedDays = daysBetween(next.lastActiveDate, today) - 1;
    if (missedDays > 0) {
      if (missedDays <= next.freezes) {
        const covered = Array.from({ length: missedDays }, (_, index) =>
          shiftDateKey(next.lastActiveDate as string, index + 1)
        );
        next = {
          ...next,
          freezes: next.freezes - missedDays,
          frozenDates: keepRecent([...next.frozenDates, ...covered]),
          // Treat yesterday as active so today's first turn extends the streak.
          lastActiveDate: shiftDateKey(today, -1),
        };
        notice = "freeze-used";
      } else {
        next = { ...next, streak: 0 };
        notice = "streak-lost";
      }
    }
  }

  return { progress: next, notice };
}

export function loadProgress(): { progress: Progress; notice: StreakNotice } {
  const today = dateKey();
  let stored: Partial<Progress> | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    stored = raw ? (JSON.parse(raw) as Partial<Progress>) : null;
  } catch {
    stored = null;
  }
  return reconcileProgress({ ...createProgress(today), ...stored }, today);
}

export function saveProgress(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or storage full — progress just won't survive a reload.
  }
}

/**
 * Counts today toward the streak if it doesn't already. Any real practice —
 * a conversation turn or a finished lesson — keeps the flame lit.
 */
function markActive(progress: Progress, today: string, events: RewardEvent[]): Progress {
  if (progress.lastActiveDate === today) return progress;
  const continues =
    progress.lastActiveDate !== null && daysBetween(progress.lastActiveDate, today) === 1;
  const streak = continues ? progress.streak + 1 : 1;
  let next: Progress = {
    ...progress,
    streak,
    longestStreak: Math.max(progress.longestStreak, streak),
    lastActiveDate: today,
    activeDates: keepRecent([...progress.activeDates, today]),
  };
  events.push({ kind: "streak", xp: 0 });

  if (streak % 7 === 0 && next.freezes < MAX_FREEZES) {
    next = { ...next, freezes: next.freezes + 1 };
    events.push({ kind: "freeze", xp: 0 });
  }
  return next;
}

/**
 * Awards XP for one completed learner turn. Voice is worth more than typing
 * to keep people speaking; a small random chance doubles the base award so
 * rewards stay variable rather than perfectly predictable.
 */
export function awardTurn(
  progress: Progress,
  turn: { mode: "voice" | "text"; text: string },
  today: string = dateKey()
): { progress: Progress; gained: number; events: RewardEvent[] } {
  const events: RewardEvent[] = [];
  const base = turn.mode === "voice" ? XP_VOICE_TURN : XP_TEXT_TURN;
  let gained = base;

  if (Math.random() < LUCKY_CHANCE) {
    gained += base;
    events.push({ kind: "lucky", xp: base });
  }

  const wordCount = turn.text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= LONG_SENTENCE_WORDS) {
    gained += XP_LONG_SENTENCE;
    events.push({ kind: "long", xp: XP_LONG_SENTENCE });
  }

  let next: Progress = {
    ...progress,
    todayDate: today,
    todayTurns: progress.todayDate === today ? progress.todayTurns + 1 : 1,
  };

  next = markActive(next, today, events);

  if (next.todayTurns === next.goalTurns) {
    gained += XP_GOAL_COMPLETE;
    events.push({ kind: "goal", xp: XP_GOAL_COMPLETE });
  }

  next = {
    ...next,
    xp: next.xp + gained,
    todayXp: (progress.todayDate === today ? progress.todayXp : 0) + gained,
  };

  return { progress: next, gained, events };
}

export interface SessionBonus {
  label: string;
  xp: number;
}

/** Closes out a conversation, granting completion bonuses for real effort. */
export function completeSession(
  progress: Progress,
  session: { turns: number; wasDailyMission: boolean }
): { progress: Progress; bonuses: SessionBonus[] } {
  const bonuses: SessionBonus[] = [];
  let missionDoneDate = progress.missionDoneDate;
  if (session.turns >= MIN_TURNS_FOR_SESSION_BONUS) {
    bonuses.push({ label: "Conversation complete", xp: XP_SESSION_COMPLETE });
    if (session.wasDailyMission && missionDoneDate !== progress.todayDate) {
      bonuses.push({ label: "Daily mission", xp: XP_MISSION_COMPLETE });
      missionDoneDate = progress.todayDate;
    }
  }
  const bonusXp = bonuses.reduce((sum, bonus) => sum + bonus.xp, 0);
  return {
    progress: {
      ...progress,
      xp: progress.xp + bonusXp,
      todayXp: progress.todayXp + bonusXp,
      sessionsCompleted: progress.sessionsCompleted + 1,
      missionDoneDate,
    },
    bonuses,
  };
}

/**
 * Closes out a lesson: XP per correct drill plus a completion bonus, and the
 * day counts toward the streak. Lessons don't add conversation turns — the
 * daily goal stays about talking.
 */
export function completeLesson(
  progress: Progress,
  lesson: { correct: number },
  today: string = dateKey()
): { progress: Progress; gained: number; streakExtended: boolean } {
  const gained = lesson.correct * XP_LESSON_DRILL + XP_LESSON_COMPLETE;
  const events: RewardEvent[] = [];
  const rolled: Progress =
    progress.todayDate === today ? progress : { ...progress, todayDate: today, todayTurns: 0, todayXp: 0 };
  const next = markActive(rolled, today, events);
  return {
    progress: { ...next, xp: next.xp + gained, todayXp: next.todayXp + gained },
    gained,
    streakExtended: events.some((event) => event.kind === "streak"),
  };
}

export type DayState = "active" | "frozen" | "today" | "missed";

/** The last seven days, oldest first, for the week strip. */
export function recentWeek(
  progress: Progress,
  today: string = dateKey()
): { key: string; label: string; state: DayState }[] {
  const active = new Set(progress.activeDates);
  const frozen = new Set(progress.frozenDates);
  return Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(today, index - 6);
    const [year, month, day] = key.split("-").map(Number);
    const label = new Date(year, month - 1, day)
      .toLocaleDateString("en-US", { weekday: "narrow" });
    const state: DayState = active.has(key)
      ? "active"
      : frozen.has(key)
        ? "frozen"
        : key === today
          ? "today"
          : "missed";
    return { key, label, state };
  });
}
