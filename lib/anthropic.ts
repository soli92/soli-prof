/**
 * Anthropic Claude client configuration
 */

import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export const DEFAULT_MODEL = "claude-haiku-4-5";
export const STREAMING_TIMEOUT_MS = 60000;
