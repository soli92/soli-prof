/**
 * Chunker markdown per heading h2/h3.
 * Logica equivalente al vecchio lib/rag/chunker.ts, tipi dal nuovo modulo.
 * Liste markdown (≥3 item, ogni item ≥ caratteri minimo): un chunk per item
 * con preambolo contestuale (contextual retrieval).
 */

import crypto from "crypto";
import { CURRENT_CHUNKER_VERSION, CURRENT_CORPUS_VERSION } from "./config";
import type { Chunk, ChunkMetadata } from "./types";

const MIN_LIST_ITEMS_FOR_SPLIT = 3;
const MIN_BULLET_CHARS = 50;
const MAX_PREAMBLE_CHARS = 300;
const MAX_LIST_PARENT_HEADING_CHARS = 200;

function stableId(repo: string, section: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update(
      `${repo}::${section}::${content}::${CURRENT_CHUNKER_VERSION}::${CURRENT_CORPUS_VERSION}`
    )
    .digest("hex")
    .slice(0, 16);
}

function buildChunkMetadata(meta: ChunkerMetadata): ChunkMetadata {
  return {
    ...meta,
    chunkerVersion: CURRENT_CHUNKER_VERSION,
    corpusVersion: CURRENT_CORPUS_VERSION,
  };
}

interface ChunkerMetadata {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
}

function leadingWhitespaceLength(line: string): number {
  let i = 0;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) {
    i++;
  }
  return i;
}

function stripLeadingWhitespace(line: string): string {
  return line.slice(leadingWhitespaceLength(line));
}

/** True se la riga è un bullet/numbered item alla indentazione root della lista. */
function isRootListLine(line: string, rootIndentChars: number): boolean {
  if (leadingWhitespaceLength(line) !== rootIndentChars) return false;
  const rest = stripLeadingWhitespace(line);
  return /^[-*]\s/.test(rest) || /^\d+\.\s+/.test(rest);
}

function detectBulletList(content: string): {
  hasListBlock: boolean;
  preamble: string;
  items: string[];
  trailing: string;
} {
  const lines = content.split("\n");
  let firstBulletIdx = -1;
  let rootIndentChars = 0;

  for (let i = 0; i < lines.length; i++) {
    const ws = leadingWhitespaceLength(lines[i]);
    const rest = lines[i].slice(ws);
    if (/^[-*]\s/.test(rest) || /^\d+\.\s+/.test(rest)) {
      firstBulletIdx = i;
      rootIndentChars = ws;
      break;
    }
  }

  if (firstBulletIdx < 0) {
    return { hasListBlock: false, preamble: content, items: [], trailing: "" };
  }

  const preamble = lines.slice(0, firstBulletIdx).join("\n");
  const items: string[] = [];
  const buf: string[] = [];
  let i = firstBulletIdx;

  while (i < lines.length) {
    const line = lines[i];

    if (isRootListLine(line, rootIndentChars)) {
      if (buf.length > 0) {
        items.push(buf.join("\n"));
        buf.length = 0;
      }
      buf.push(line);
      i++;
      continue;
    }

    buf.push(line);
    i++;
  }

  if (buf.length > 0) {
    items.push(buf.join("\n"));
  }

  return {
    hasListBlock: items.length > 0,
    preamble,
    items,
    trailing: "",
  };
}

function truncatePreamble(preamble: string): string {
  const t = preamble.trim();
  if (t.length <= MAX_PREAMBLE_CHARS) return t;
  return t.slice(0, MAX_PREAMBLE_CHARS);
}

function truncateSectionLabel(heading: string): string {
  if (heading.length <= MAX_LIST_PARENT_HEADING_CHARS) return heading;
  return heading.slice(0, MAX_LIST_PARENT_HEADING_CHARS);
}

function shouldSplitListBlock(detection: ReturnType<typeof detectBulletList>): boolean {
  if (!detection.hasListBlock) return false;
  if (detection.items.length < MIN_LIST_ITEMS_FOR_SPLIT) return false;
  return detection.items.every((item) => item.trim().length >= MIN_BULLET_CHARS);
}

function buildListItemChunkBody(
  fullSectionHeading: string,
  truncatedPreamble: string,
  item: string
): string {
  const parts: string[] = [fullSectionHeading.trim()];
  if (truncatedPreamble.length > 0) {
    parts.push(truncatedPreamble);
  }
  parts.push(item.trim());
  return parts.join("\n\n");
}

export function chunkMarkdown(
  markdown: string,
  metadata: ChunkerMetadata,
  maxChars: number = 6000
): Chunk[] {
  if (!markdown || markdown.trim() === "") return [];

  const lines = markdown.split("\n");
  const chunks: Chunk[] = [];

  let currentSection = "Intro";
  let currentContent: string[] = [];

  const pushChunks = (section: string, body: string) => {
    const parts =
      body.length > maxChars ? splitByParagraphs(body, maxChars) : [body];
    for (const part of parts) {
      if (part.trim() === "") continue;
      chunks.push({
        id: stableId(metadata.repo, section, part),
        repo: metadata.repo,
        section,
        content: part,
        metadata: buildChunkMetadata(metadata),
      });
    }
  };

  const flush = () => {
    const content = currentContent.join("\n").trim();
    if (!content) return;

    const detection = detectBulletList(content);

    if (shouldSplitListBlock(detection)) {
      const truncatedPre = truncatePreamble(detection.preamble);
      const sectionBase = truncateSectionLabel(currentSection);

      let itemNum = 0;
      for (const item of detection.items) {
        itemNum += 1;
        const subsection = `${sectionBase} > Item ${itemNum}`;
        const combined = buildListItemChunkBody(
          currentSection,
          truncatedPre,
          item
        );
        pushChunks(subsection, combined);
      }

      if (detection.trailing.trim()) {
        pushChunks(currentSection, detection.trailing.trim());
      }
      return;
    }

    const parts =
      content.length > maxChars ? splitByParagraphs(content, maxChars) : [content];

    for (const part of parts) {
      if (part.trim() === "") continue;
      chunks.push({
        id: stableId(metadata.repo, currentSection, part),
        repo: metadata.repo,
        section: currentSection,
        content: part,
        metadata: buildChunkMetadata(metadata),
      });
    }
  };

  const headingStack: { level: number; title: string }[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match) {
      flush();
      currentContent = [];
      headingStack.length = 0;
      headingStack.push({ level: 2, title: h2Match[1].trim() });
      currentSection = h2Match[1].trim();
    } else if (h3Match) {
      flush();
      currentContent = [];
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= 3) {
        headingStack.pop();
      }
      headingStack.push({ level: 3, title: h3Match[1].trim() });
      currentSection = headingStack.map((h) => h.title).join(" > ");
    } else {
      currentContent.push(line);
    }
  }
  flush();
  return chunks;
}

function splitByParagraphs(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const result: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if ((buffer + "\n\n" + para).length > maxChars && buffer) {
      result.push(buffer);
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  if (buffer) result.push(buffer);
  return result;
}
