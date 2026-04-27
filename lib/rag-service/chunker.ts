/**
 * Chunker markdown per heading h2/h3.
 * Wrapper backward-compatible: delega a {@link MarkdownChunkStrategy} via registry.
 */

import { selectChunker } from "./chunkers/registry";
import type { Chunk } from "./types";

interface ChunkMarkdownOptions {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
}

/**
 * Backward-compatible wrapper. Internamente delega alla strategia markdown via registry.
 * Nuovo codice può usare `selectChunker(filename)` direttamente.
 */
export function chunkMarkdown(
  content: string,
  options: ChunkMarkdownOptions,
  maxChars: number = 6000
): Chunk[] {
  const strategy = selectChunker("AI_LOG.md");
  return strategy.chunk(content, {
    ...options,
    filename: "AI_LOG.md",
    maxChars,
  });
}
