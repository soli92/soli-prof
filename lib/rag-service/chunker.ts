/**
 * Chunker markdown per heading h2/h3.
 * Logica identica al vecchio lib/rag/chunker.ts ma importa tipi dal nuovo modulo.
 */

import crypto from "crypto";
import type { Chunk } from "./types";

function stableId(repo: string, section: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update(`${repo}::${section}::${content}`)
    .digest("hex")
    .slice(0, 16);
}

interface ChunkerMetadata {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
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

  const flush = () => {
    const content = currentContent.join("\n").trim();
    if (!content) return;

    const parts = content.length > maxChars ? splitByParagraphs(content, maxChars) : [content];

    for (const part of parts) {
      if (part.trim() === "") continue;
      chunks.push({
        id: stableId(metadata.repo, currentSection, part),
        repo: metadata.repo,
        section: currentSection,
        content: part,
        metadata: { ...metadata },
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
