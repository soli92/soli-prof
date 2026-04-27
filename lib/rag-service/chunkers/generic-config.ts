import crypto from "crypto";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const GENERIC_CONFIG_STRATEGY_VERSION = "generic-config-v1.0";

const MAX_CHARS = 4000;
const TRUNC_SUFFIX = "\n... [truncated]";

const ALLOWED_FILENAMES = new Set([
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.js",
  "vite.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
]);

export class GenericConfigChunkStrategy implements ChunkStrategy {
  readonly name = "generic-config";
  readonly version = GENERIC_CONFIG_STRATEGY_VERSION;

  matches(filename: string): boolean {
    const base = filename.split("/").pop() ?? filename;
    return ALLOWED_FILENAMES.has(base);
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    const header = `Configuration file: ${ctx.filename}`;
    const prefix = `${header}\n\n`;
    const maxBody = Math.max(0, MAX_CHARS - prefix.length);
    let body = content;
    if (body.length > maxBody) {
      const cut = Math.max(0, maxBody - TRUNC_SUFFIX.length);
      body = body.slice(0, cut) + TRUNC_SUFFIX;
    }
    const full = `${prefix}${body}`;
    return [this.buildChunk(ctx, `${ctx.filename} > config`, full)];
  }

  private buildChunk(ctx: ChunkStrategyContext, section: string, body: string): Chunk {
    const id = crypto
      .createHash("sha256")
      .update(`${ctx.repo}::${section}::${body}::${this.version}::${CURRENT_CORPUS_VERSION}`)
      .digest("hex")
      .slice(0, 16);

    const metadata: ChunkMetadata = {
      repo: ctx.repo,
      owner: ctx.owner,
      branch: ctx.branch,
      indexedAt: ctx.indexedAt,
      chunkerVersion: this.version,
      corpusVersion: CURRENT_CORPUS_VERSION,
    };

    return {
      id,
      repo: ctx.repo,
      section,
      content: body,
      metadata,
    };
  }
}
