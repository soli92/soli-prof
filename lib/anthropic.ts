/**
 * Anthropic Claude client setup
 */

import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  return new Anthropic({
    apiKey,
  });
}

export const MODEL = "claude-3-5-haiku-20241022";
