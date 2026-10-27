import { SKILL_IDS, SKILLS, isSkillId } from "./skills";
import type { SkillObservation } from "./skill-profile";

/**
 * The grammar-diagnosis prompt, output schema, and result parsing, shared by
 * /api/diagnose and any tooling that evaluates it.
 */

const SKILL_BRIEF = SKILL_IDS.map((id) => `- "${id}": ${SKILLS[id].detection}`).join("\n");

export const DIAGNOSE_SYSTEM_PROMPT = `You analyze a Spanish learner's grammar in a practice conversation with their tutor, Sofía. Only the Learner's lines count as evidence; Sofía's lines are context.

Track exactly these skills:
${SKILL_BRIEF}

For each skill the learner actually attempted, report one observation:
- correct: how many times they used it correctly.
- errors: how many times they got it wrong. Count a mistake once even if repeated in the same sentence. Speech-to-text artifacts (missing accents, odd punctuation, a misheard word) are NOT errors.
- confidence: 0 to 1, how sure you are of this judgment. Use under 0.5 when the evidence is ambiguous or the learner barely touched the skill.
- wrong / right: if there was an error, quote the learner's shortest phrase containing it (wrong) and the corrected phrase (right). Otherwise leave both as empty strings.

Skip skills the learner never attempted — avoiding a structure is not evidence. If none were attempted, return an empty list.`;

export const DIAGNOSIS_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string", enum: [...SKILL_IDS] },
          correct: { type: "integer" },
          errors: { type: "integer" },
          confidence: { type: "number" },
          wrong: { type: "string" },
          right: { type: "string" },
        },
        required: ["skill", "correct", "errors", "confidence", "wrong", "right"],
        additionalProperties: false,
      },
    },
  },
  required: ["observations"],
  additionalProperties: false,
};

function clampCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(20, Math.max(0, Math.round(value)))
    : 0;
}

/** The schema guarantees shape; this guards the ranges and de-duplicates skills. */
export function toObservations(parsed: unknown): SkillObservation[] {
  const raw = (parsed as { observations?: unknown })?.observations;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const observations: SkillObservation[] = [];
  for (const item of raw) {
    const entry = item as Record<string, unknown>;
    if (!isSkillId(entry.skill) || seen.has(entry.skill)) continue;
    seen.add(entry.skill);
    const wrong = typeof entry.wrong === "string" ? entry.wrong.trim() : "";
    const right = typeof entry.right === "string" ? entry.right.trim() : "";
    const confidence = typeof entry.confidence === "number" ? entry.confidence : 0;
    observations.push({
      skill: entry.skill,
      correct: clampCount(entry.correct),
      errors: clampCount(entry.errors),
      confidence: Math.min(1, Math.max(0, confidence)),
      example: wrong && right ? { wrong, right } : null,
    });
  }
  return observations;
}
