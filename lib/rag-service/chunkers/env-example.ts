import crypto from "crypto";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const ENV_EXAMPLE_STRATEGY_VERSION = "env-example-v1.0";

const MATCH_NAMES = new Set([".env.example", ".env.sample", ".env.template"]);

export class EnvExampleChunkStrategy implements ChunkStrategy {
  readonly name = "env-example";
  readonly version = ENV_EXAMPLE_STRATEGY_VERSION;

  matches(filename: string): boolean {
    const base = filename.split("/").pop() ?? filename;
    return MATCH_NAMES.has(base);
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    if (content.trim() === "") {
      return [this.buildChunk(ctx, `${ctx.filename} > empty`, "")];
    }

    const normalized = content.replace(/\r\n/g, "\n");
    const groups = this.splitIntoGroups(normalized);
    if (groups.length <= 1) {
      return [this.buildChunk(ctx, ctx.filename, content)];
    }

    return groups.map((g, i) => {
      const label = this.inferSectionLabel(g, i + 1);
      const section = `${ctx.filename} > ${label}`;
      return this.buildChunk(ctx, section, g.trim());
    });
  }

  /** Split su `## ===` oppure doppio a capo prima di un blocco commentato (`#`). */
  private splitIntoGroups(text: string): string[] {
    if (text.includes("## ===")) {
      return text
        .split(/## =+[^\n]*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const byDoubleComment = text
      .split(/\n\s*\n(?=[\t ]*#)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return byDoubleComment.length > 1 ? byDoubleComment : [];
  }

  private inferSectionLabel(block: string, index: number): string {
    for (const line of block.split("\n")) {
      if (!/^\s*#/.test(line)) continue;
      const cleaned = line.replace(/^\s*#\s?/, "").trim();
      if (cleaned.length === 0 || /^=+$/.test(cleaned)) continue;
      return cleaned.length <= 80 ? cleaned : cleaned.slice(0, 80);
    }
    return `group ${index}`;
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
