import crypto from "crypto";
import { RAG_CONFIG } from "./config";

export interface ChunkMetadata {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
  [key: string]: string;
}

export interface Chunk {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: ChunkMetadata;
}

// 1 token ≈ 4 chars → chunkMaxTokens * 4
const MAX_CHARS = RAG_CONFIG.chunkMaxTokens * 4;

function hashId(repo: string, section: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update(`${repo}::${section}::${content}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Splits oversized content into sub-chunks by double newline (paragraph boundary).
 * Each sub-chunk inherits the same section heading.
 */
function splitByParagraphs(
  repo: string,
  section: string,
  content: string,
  metadata: ChunkMetadata
): Chunk[] {
  const paragraphs = content.split(/\n\n+/);
  const subChunks: Chunk[] = [];
  let buffer = "";
  let partIndex = 0;

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length > MAX_CHARS && buffer) {
      const subSection = `${section} [part ${partIndex + 1}]`;
      subChunks.push({
        id: hashId(repo, subSection, buffer),
        repo,
        section: subSection,
        content: buffer.trim(),
        metadata,
      });
      buffer = para;
      partIndex++;
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim()) {
    const subSection =
      partIndex > 0 ? `${section} [part ${partIndex + 1}]` : section;
    subChunks.push({
      id: hashId(repo, subSection, buffer),
      repo,
      section: subSection,
      content: buffer.trim(),
      metadata,
    });
  }

  return subChunks;
}

/**
 * Splits a markdown document into chunks by h2 (##) and h3 (###) headings.
 * Each chunk carries the full heading path (e.g. "Fase 1 > Lezioni apprese").
 */
export function chunkMarkdown(
  text: string,
  metadata: ChunkMetadata
): Chunk[] {
  const { repo } = metadata;
  const lines = text.split("\n");
  const chunks: Chunk[] = [];

  let currentH2 = "";
  let currentH3 = "";
  let buffer = "";

  function flush(): void {
    const trimmed = buffer.trim();
    if (!trimmed) return;

    const section = currentH3
      ? `${currentH2} > ${currentH3}`
      : currentH2 || "Intro";

    if (trimmed.length > MAX_CHARS) {
      const sub = splitByParagraphs(repo, section, trimmed, metadata);
      chunks.push(...sub);
    } else {
      chunks.push({
        id: hashId(repo, section, trimmed),
        repo,
        section,
        content: trimmed,
        metadata,
      });
    }

    buffer = "";
  }

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h2Match) {
      flush();
      currentH2 = h2Match[1].trim();
      currentH3 = "";
    } else if (h3Match) {
      flush();
      currentH3 = h3Match[1].trim();
    } else {
      buffer += `${line}\n`;
    }
  }

  flush();

  return chunks;
}
