import type { ConversationTopic } from "@/lib/conversation-topics";
import { recentWeek, type Progress } from "@/lib/progress";
import type { SofiaLine } from "@/lib/sofia-lines";
import { SofiaAvatar } from "./SofiaAvatar";
import { ArchMeter, StatChips, WeekStrip } from "./ProgressBits";

interface HomeScreenProps {
  progress: Progress;
  greeting: SofiaLine;
  mission: ConversationTopic;
  onStartMission: () => void;
  onPickTopic: () => void;
  onChangeLevel: () => void;
}

export function HomeScreen({
  progress,
  greeting,
  mission,
  onStartMission,
  onPickTopic,
  onChangeLevel,
}: HomeScreenProps) {
  const litToday = progress.lastActiveDate === progress.todayDate;
  const goalDone = progress.todayTurns >= progress.goalTurns;
  const turnsLeft = Math.max(0, progress.goalTurns - progress.todayTurns);
  const isNew = progress.sessionsCompleted === 0 && progress.todayTurns === 0;
  const missionDone = progress.missionDoneDate === progress.todayDate;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-4">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl text-brand">Charla</span>
        <StatChips
          streak={progress.streak}
          litToday={litToday}
          xp={progress.xp}
          freezes={progress.freezes}
        />
      </header>

      {/* Hero: nested Barragán arches framing Sofía, her line in a bubble. */}
      <section className="relative mt-6 animate-rise-in" aria-label="Sofía">
        <div className="relative mx-auto h-48 w-full max-w-[17rem] overflow-hidden rounded-t-full bg-brand">
          <div className="absolute inset-x-8 bottom-0 top-10 rounded-t-full bg-gold" />
          <div className="absolute inset-x-16 bottom-0 top-20 rounded-t-full bg-night" />
          <div className="absolute inset-x-0 bottom-5 flex justify-center">
            <SofiaAvatar size="lg" />
          </div>
        </div>
        <div className="relative -mt-3 rounded-2xl bg-card px-5 py-4 shadow-md shadow-night/5">
          <p lang="es" className="text-xl font-bold leading-snug text-foreground">
            {greeting.es}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{greeting.en}</p>
        </div>
      </section>

      <section
        className="mt-4 flex items-center gap-4 rounded-2xl bg-card px-5 py-4 shadow-sm animate-rise-in [animation-delay:80ms]"
        aria-label="Daily goal"
      >
        <ArchMeter value={progress.todayTurns} max={progress.goalTurns} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            {goalDone
              ? "Daily goal done"
              : `${turnsLeft} ${turnsLeft === 1 ? "turn" : "turns"} to today's goal`}
          </p>
          <p className="mb-2 text-xs text-ink-soft">
            {progress.todayTurns}/{progress.goalTurns} turns · +{progress.todayXp} XP today
          </p>
          <WeekStrip days={recentWeek(progress)} />
        </div>
      </section>

      <section
        className={`mt-4 rounded-2xl border-2 px-5 py-4 animate-rise-in [animation-delay:160ms] ${
          missionDone ? "border-accent/50 bg-accent-light" : "border-dashed border-brand/40"
        }`}
        aria-label="Today's mission"
      >
        <p className={`text-xs font-bold uppercase tracking-wider ${missionDone ? "text-accent" : "text-brand"}`}>
          {missionDone ? "Mission complete ✓" : "Today's mission"}
        </p>
        <p className="mt-1 flex items-center gap-2 text-lg font-bold text-foreground">
          <span aria-hidden="true">{mission.emoji}</span>
          Talk about {mission.label.toLowerCase()}
        </p>
        <p className="text-xs text-ink-soft">
          {missionDone
            ? "A new mission arrives tomorrow."
            : "3+ turns earns a +20 XP mission bonus."}
        </p>
      </section>

      <div className="mt-auto pt-6">
        <button
          onClick={onStartMission}
          className="press flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-extrabold text-night [--press-shadow:var(--gold-dark)]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-night">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm7 8a1 1 0 0 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 0 0-2 0v1a7 7 0 0 0 6 6.9V21H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.1a7 7 0 0 0 6-6.9v-1Z" />
          </svg>
          {isNew ? "Start talking" : goalDone ? "Keep talking" : "Start today's chat"}
        </button>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={onPickTopic}
            className="font-semibold text-ink-soft underline-offset-4 hover:text-brand hover:underline"
          >
            Pick a different topic
          </button>
          {progress.level && (
            <button
              onClick={onChangeLevel}
              className="rounded-full bg-card px-3 py-1 font-semibold text-ink-soft shadow-sm hover:text-brand"
            >
              {progress.level} · change
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
