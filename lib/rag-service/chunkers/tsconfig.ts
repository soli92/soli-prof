import crypto from "crypto";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const TSCONFIG_STRATEGY_VERSION = "tsconfig-v1.0";

function stripJsoncComments(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .trim();
}

export class TsconfigChunkStrategy implements ChunkStrategy {
  readonly name = "tsconfig";
  readonly version = TSCONFIG_STRATEGY_VERSION;

  matches(filename: string): boolean {
    if (filename === "tsconfig.json") return true;
    const base = filename.split("/").pop() ?? filename;
    return /^tsconfig\.[^.]+\.json$/.test(base);
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    if (content.trim() === "") {
      return [this.buildChunk(ctx, `${ctx.filename} > empty`, "")];
    }

    const stripped = stripJsoncComments(content);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      console.warn("[TsconfigChunkStrategy] JSON.parse failed; using raw fallback");
      return [this.buildChunk(ctx, `${ctx.filename} > raw`, content)];
    }

    const keys = ["compilerOptions", "include", "exclude", "references", "extends"] as const;
    const chunks: Chunk[] = [];

    for (const key of keys) {
      if (!(key in parsed)) continue;
      const value = parsed[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
        continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === "string" && value.trim() === "") continue;

      const formatted =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      chunks.push(
        this.buildChunk(ctx, `${ctx.filename} > ${key}`, `${key}:\n${formatted}`)
      );
    }

    return chunks.length > 0
      ? chunks
      : [this.buildChunk(ctx, ctx.filename, content)];
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
