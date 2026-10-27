import type Anthropic from "@anthropic-ai/sdk";

/** Every Sofía route (replies, diagnosis, feedback note) runs on Haiku 5.5. */
export const SOFIA_MODEL = "claude-haiku-5-5";

/**
 * Haiku 5.5 thinks adaptively by default, which slows replies and the
 * diagnosis noticeably for no gain on these short tasks.
 */
export const NO_THINKING: Anthropic.ThinkingConfigParam = { type: "disabled" };
