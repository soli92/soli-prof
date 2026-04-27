import type { Chunk } from "../types";

export interface ChunkStrategyContext {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
  filename: string;
  maxChars?: number;
}

export interface ChunkStrategy {
  /** Identificatore univoco della strategia (es. "markdown", "package-json"). */
  readonly name: string;

  /**
   * Versione della strategia. Usata come Chunk.metadata.chunkerVersion.
   * Convenzione: "<name>-vMAJOR.MINOR" (es. "markdown-v2.1")
   * Incrementare quando la logica di chunking cambia in modo che
   * produrrebbe chunk diversi sullo stesso input.
   */
  readonly version: string;

  /**
   * True se questa strategia gestisce il filename dato.
   * Esempio: MarkdownChunkStrategy matches("AI_LOG.md") = true.
   */
  matches(filename: string): boolean;

  /**
   * Chunka il contenuto. NON popola chunkerVersion/corpusVersion: lo fa il caller (registry o wrapper).
   * Deve popolare repo, owner, branch, indexedAt nei metadata.
   */
  chunk(content: string, ctx: ChunkStrategyContext): Chunk[];
}
