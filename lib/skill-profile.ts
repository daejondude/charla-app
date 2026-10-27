import { SKILL_IDS, SKILLS, type SkillId } from "./skills";
import { dateKey } from "./progress";

/**
 * The learner's weakness profile: a mastery estimate per skill, updated from
 * two kinds of evidence — what Sofía's post-conversation diagnosis saw them
 * say, and how they did on lesson drills. Local-first like Progress, and
 * every function here is pure except load/save.
 */

const STORAGE_KEY = "charla:skills:v1";

/** Mastery for a skill we've never observed — "probably fine, unproven". */
const PRIOR_MASTERY = 0.6;
/** How far one well-evidenced conversation can move mastery toward what it saw. */
const CONVERSATION_RATE = 0.5;
/** How far one lesson can move mastery toward the drill score. */
const LESSON_RATE = 0.35;
/**
 * Drills prove recognition, not spontaneous use — so lessons alone can lift
 * a skill to "Improving" but only real conversation can make it "Mastered".
 */
const LESSON_MASTERY_CAP = 0.79;
const MASTERED_AT = 0.8;
const NEEDS_WORK_BELOW = 0.5;
const MASTERED_MIN_EVIDENCE = 4;
/** Below this confidence, a diagnosis is treated as noise. */
const MIN_CONFIDENCE = 0.5;
/** Suggest a lesson only for mistakes the diagnosis is fairly sure about. */
const SUGGEST_MIN_CONFIDENCE = 0.6;

export interface SkillExample {
  /** What the learner actually said. */
  wrong: string;
  /** The corrected version. */
  right: string;
}

export interface SkillState {
  /** 0–1 estimate of how reliably the learner uses the skill; null until observed. */
  mastery: number | null;
  /** Confidence-weighted count of observed attempts in conversation. */
  evidence: number;
  correctTotal: number;
  errorsTotal: number;
  /** The most recent mistake, quoted back in the lesson intro. */
  lastExample: SkillExample | null;
  lastSeenDate: string | null;
  lessonsCompleted: number;
  lastLessonDate: string | null;
  bestDrillScore: number | null;
}

export interface SkillProfile {
  skills: Record<SkillId, SkillState>;
  /**
   * A skill the learner just studied. The next conversation is steered to
   * practice it, then it clears — learning feeds straight back into talking.
   */
  focusSkill: SkillId | null;
}

/** One skill's evidence from one conversation, as returned by /api/diagnose. */
export interface SkillObservation {
  skill: SkillId;
  correct: number;
  errors: number;
  confidence: number;
  example: SkillExample | null;
}

export type SkillStatus = "new" | "needs-work" | "improving" | "mastered";

export const STATUS_LABELS: Record<SkillStatus, string> = {
  new: "Not started",
  "needs-work": "Needs practice",
  improving: "Improving",
  mastered: "Mastered",
};

export interface LessonSuggestion {
  skill: SkillId;
  example: SkillExample | null;
}

function emptySkillState(): SkillState {
  return {
    mastery: null,
    evidence: 0,
    correctTotal: 0,
    errorsTotal: 0,
    lastExample: null,
    lastSeenDate: null,
    lessonsCompleted: 0,
    lastLessonDate: null,
    bestDrillScore: null,
  };
}

export function createSkillProfile(): SkillProfile {
  const skills = Object.fromEntries(
    SKILL_IDS.map((id) => [id, emptySkillState()])
  ) as Record<SkillId, SkillState>;
  return { skills, focusSkill: null };
}

export function loadSkillProfile(): SkillProfile {
  const fresh = createSkillProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const stored = JSON.parse(raw) as Partial<SkillProfile>;
    // Merge per skill so skills added in later versions get a clean state.
    const skills = { ...fresh.skills };
    for (const id of SKILL_IDS) {
      skills[id] = { ...fresh.skills[id], ...stored.skills?.[id] };
    }
    return {
      skills,
      focusSkill: stored.focusSkill && SKILL_IDS.includes(stored.focusSkill) ? stored.focusSkill : null,
    };
  } catch {
    return fresh;
  }
}

export function saveSkillProfile(profile: SkillProfile): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode or storage full — the profile just won't survive a reload.
  }
}

export function skillStatus(state: SkillState): SkillStatus {
  if (state.mastery === null) return state.lessonsCompleted > 0 ? "improving" : "new";
  if (state.mastery >= MASTERED_AT && state.evidence >= MASTERED_MIN_EVIDENCE) return "mastered";
  // "Improving" has to be earned — by studying it, or by getting it right at
  // least as often as wrong. Mistakes alone, however few, mean practice.
  const earned = state.lessonsCompleted > 0 || state.correctTotal >= state.errorsTotal;
  if (state.mastery < NEEDS_WORK_BELOW || !earned) return "needs-work";
  return "improving";
}

/**
 * Folds one conversation's diagnosis into the profile. Each observation
 * pulls mastery toward the accuracy it saw, weighted by how sure the
 * diagnosis was and how many attempts it was based on — one shaky slip
 * barely moves it, a pattern of clear mistakes moves it a lot.
 */
export function applyObservations(
  profile: SkillProfile,
  observations: SkillObservation[],
  today: string = dateKey()
): SkillProfile {
  const skills = { ...profile.skills };
  for (const observation of observations) {
    const attempts = observation.correct + observation.errors;
    if (attempts === 0 || observation.confidence < MIN_CONFIDENCE) continue;

    const state = skills[observation.skill];
    const accuracy = observation.correct / attempts;
    const weight = CONVERSATION_RATE * observation.confidence * Math.min(1, attempts / 3);
    const current = state.mastery ?? PRIOR_MASTERY;

    skills[observation.skill] = {
      ...state,
      mastery: current + weight * (accuracy - current),
      evidence: state.evidence + attempts * observation.confidence,
      correctTotal: state.correctTotal + observation.correct,
      errorsTotal: state.errorsTotal + observation.errors,
      lastExample: observation.errors > 0 && observation.example ? observation.example : state.lastExample,
      lastSeenDate: today,
    };
  }
  return { ...profile, skills };
}

/** Records a finished lesson and queues its skill for the next conversation. */
export function applyLessonResult(
  profile: SkillProfile,
  skill: SkillId,
  drillScore: number,
  today: string = dateKey()
): SkillProfile {
  const state = profile.skills[skill];
  const current = state.mastery ?? PRIOR_MASTERY;
  const lifted = current + LESSON_RATE * (drillScore - current);
  // Never let a lesson lower mastery below where conversation put it if the
  // learner did well, and never let it push past the conversation-only cap.
  const mastery = Math.min(Math.max(current, lifted), Math.max(current, LESSON_MASTERY_CAP));
  return {
    skills: {
      ...profile.skills,
      [skill]: {
        ...state,
        mastery,
        lessonsCompleted: state.lessonsCompleted + 1,
        lastLessonDate: today,
        bestDrillScore: Math.max(state.bestDrillScore ?? 0, drillScore),
      },
    },
    focusSkill: skill,
  };
}

export function clearFocus(profile: SkillProfile): SkillProfile {
  return profile.focusSkill ? { ...profile, focusSkill: null } : profile;
}

function lessonedToday(state: SkillState, today: string): boolean {
  return state.lastLessonDate === today;
}

/**
 * Picks the one lesson worth offering after a conversation: the skill with
 * the clearest mistakes this session, if it isn't already mastered or
 * studied today. One suggestion, never a list — the point is a single
 * friendly nudge, not a report card.
 */
export function suggestFromSession(
  profile: SkillProfile,
  observations: SkillObservation[],
  today: string = dateKey()
): LessonSuggestion | null {
  const candidates = observations
    .filter(
      (observation) =>
        observation.errors > 0 &&
        observation.confidence >= SUGGEST_MIN_CONFIDENCE &&
        skillStatus(profile.skills[observation.skill]) !== "mastered" &&
        !lessonedToday(profile.skills[observation.skill], today)
    )
    .sort((a, b) => b.errors * b.confidence - a.errors * a.confidence);
  const best = candidates[0];
  return best ? { skill: best.skill, example: best.example } : null;
}

/** The weakest observed skill, for the home screen and the top of the library. */
export function suggestFromProfile(
  profile: SkillProfile,
  today: string = dateKey()
): LessonSuggestion | null {
  const weakest = SKILL_IDS.map((id) => ({ id, state: profile.skills[id] }))
    .filter(
      ({ state }) =>
        state.mastery !== null &&
        skillStatus(state) === "needs-work" &&
        !lessonedToday(state, today)
    )
    .sort((a, b) => (a.state.mastery ?? 1) - (b.state.mastery ?? 1))[0];
  return weakest ? { skill: weakest.id, example: weakest.state.lastExample } : null;
}

/** Sofía's one-line nudge for a suggestion, in her voice. */
export function suggestionLine(suggestion: LessonSuggestion): string {
  const skill = SKILLS[suggestion.skill];
  switch (suggestion.skill) {
    case "past-tense":
      return "I noticed the past tense tripping you up a little. Want a quick lesson?";
    case "por-para":
      return "Por and para got a little tangled — totally normal! Want a quick lesson?";
    case "ser-estar":
      return "Ser and estar swapped places on you. Want a quick lesson?";
    default:
      return `Want a quick lesson on ${skill.label.toLowerCase()}?`;
  }
}
