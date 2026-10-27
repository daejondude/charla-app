/**
 * The Anthropic key is stored as CHARLA_API_KEY; ANTHROPIC_API_KEY is still
 * accepted so deployments configured under the old name keep working.
 */
export function getAnthropicApiKey(): string | undefined {
  return process.env.CHARLA_API_KEY || process.env.ANTHROPIC_API_KEY;
}
