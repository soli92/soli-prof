import crypto from "crypto";
import { RAG_CONFIG } from "./config";

export interface Chunk {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Stima approssimativa dei token: 1 token ≈ 4 caratteri
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Genera un id stabile da repo + section + contenuto (sha256, primi 16 char)
 */
function stableId(repo: string, section: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update(`${repo}::${section}::${content}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Se un chunk supera chunkMaxTokens lo spezza ulteriormente per paragrafi vuoti
 */
function splitByParagraphs(
  text: string,
  repo: string,
  section: string,
  metadata: Record<string, unknown>
): Chunk[] {
  const maxChars = RAG_CONFIG.chunkMaxTokens * 4;
  const paragraphs = text.split(/\n\n+/);
  const result: Chunk[] = [];
  let buffer = "";
  let partIndex = 0;

  const flush = () => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    const partSection = partIndex === 0 ? section : `${section} [part ${partIndex + 1}]`;
    result.push({
      id: stableId(repo, partSection, trimmed),
      repo,
      section: partSection,
      content: trimmed,
      metadata,
    });
    partIndex++;
    buffer = "";
  };

  for (const para of paragraphs) {
    if ((buffer + "\n\n" + para).length > maxChars) {
      flush();
    }
    buffer = buffer ? buffer + "\n\n" + para : para;
  }
  flush();

  return result;
}

/**
 * Splitta un documento markdown per heading h2 (##) e h3 (###).
 * Ogni sezione diventa un Chunk; sezioni troppo grandi vengono spezzate per paragrafi.
 */
export function chunkMarkdown(
  text: string,
  metadata: Record<string, unknown>
): Chunk[] {
  const repo = (metadata.repo as string) ?? "unknown";
  const maxChars = RAG_CONFIG.chunkMaxTokens * 4;

  // Splitta sulle righe che iniziano con ## o ###
  const lines = text.split("\n");
  const sections: Array<{ headingPath: string; lines: string[] }> = [];
  let currentHeading = "Introduction";
  let h2Heading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.*)/);
    const h2Match = line.match(/^##\s+(.*)/);

    if (h2Match) {
      // Salva sezione corrente
      if (currentLines.length > 0) {
        sections.push({ headingPath: currentHeading, lines: currentLines });
      }
      h2Heading = h2Match[1].trim();
      currentHeading = h2Heading;
      currentLines = [];
    } else if (h3Match) {
      // Salva sezione corrente
      if (currentLines.length > 0) {
        sections.push({ headingPath: currentHeading, lines: currentLines });
      }
      const h3Heading = h3Match[1].trim();
      currentHeading = h2Heading ? `${h2Heading} > ${h3Heading}` : h3Heading;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush dell'ultima sezione
  if (currentLines.length > 0) {
    sections.push({ headingPath: currentHeading, lines: currentLines });
  }

  const chunks: Chunk[] = [];

  for (const section of sections) {
    const content = section.lines.join("\n").trim();
    if (!content) continue;

    if (content.length > maxChars) {
      // Sezione troppo grande: split per paragrafi
      const subChunks = splitByParagraphs(content, repo, section.headingPath, metadata);
      chunks.push(...subChunks);
    } else {
      chunks.push({
        id: stableId(repo, section.headingPath, content),
        repo,
        section: section.headingPath,
        content,
        metadata,
      });
    }
  }

  return chunks;
}
