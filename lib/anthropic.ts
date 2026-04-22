/**
 * Anthropic Claude client configuration
 */

import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
export const STREAMING_TIMEOUT_MS = 60000; // 60 seconds
