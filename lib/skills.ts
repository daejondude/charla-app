/**
 * The grammar skills Charla can detect and teach. Shared by the server
 * (diagnosis schema, Sofía's focus prompt) and the client (library, lessons),
 * so it holds plain data only.
 */

export const SKILL_IDS = ["past-tense", "por-para", "ser-estar"] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export interface Skill {
  id: SkillId;
  label: string;
  emoji: string;
  /** One-line learner-facing hook for the library card. */
  tagline: string;
  /** Plain-English description, used to brief the diagnosis model. */
  detection: string;
  /** How Sofía steers a focused conversation so the learner must use the skill. */
  focusGuidance: string;
  /** Conversation topic whose questions naturally call for this skill. */
  practiceTopicId: string;
  /** Rough length shown on the lesson card. */
  minutes: number;
}

export const SKILLS: Record<SkillId, Skill> = {
  "past-tense": {
    id: "past-tense",
    label: "Past tense",
    emoji: "⏪",
    tagline: "Talk about what you did — fui, comí, hablé.",
    detection:
      "Talking about completed past events with the preterite (fui, comí, hablé, tuve, hice). Errors include using the present or an infinitive for a finished past action (\"ayer yo ir\", \"ayer como pizza\"), wrong preterite endings (\"comé\", \"hablí\"), or regularizing irregulars (\"tení\", \"hacé\"). A correct use is any correctly formed past-tense verb for a past event.",
    focusGuidance:
      "Ask about finished events — yesterday, last weekend, a past trip, what they did this morning — so every answer needs the preterite. If they answer in the present, gently correct it to the preterite.",
    practiceTopicId: "travel",
    minutes: 7,
  },
  "por-para": {
    id: "por-para",
    label: "Por vs para",
    emoji: "🔀",
    tagline: "Two ways to say “for” — and when to use each.",
    detection:
      "Choosing between por and para. Para: purpose (para aprender), recipient (para ti), destination (para Madrid), deadline (para el lunes). Por: cause/reason (por la lluvia), exchange/price (por diez euros), duration (por dos horas), through/along (por el parque), means (por teléfono), thanks (gracias por). An error is using one where the other is required; a correct use is a correctly chosen por or para.",
    focusGuidance:
      "Ask questions that call for reasons, purposes, gifts, prices, and durations — why they study Spanish, who they buy presents for, how long they do things, what they paid — so answers need por or para.",
    practiceTopicId: "shopping",
    minutes: 6,
  },
  "ser-estar": {
    id: "ser-estar",
    label: "Ser vs estar",
    emoji: "⚖️",
    tagline: "Who you are vs how you are right now.",
    detection:
      "Choosing between ser and estar. Ser: identity, origin, profession, characteristics, time, events (soy de Chicago, es alto, es lunes). Estar: location, temporary states, feelings, progressive (estoy cansado, está en casa, estoy comiendo). An error is using one where the other is required; a correct use is a correctly chosen form.",
    focusGuidance:
      "Ask about where things and people are, how they feel today, what people are like, and where they are from — so answers need both ser and estar.",
    practiceTopicId: "family-friends",
    minutes: 6,
  },
};

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (SKILL_IDS as readonly string[]).includes(value);
}
