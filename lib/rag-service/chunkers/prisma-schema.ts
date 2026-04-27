import crypto from "crypto";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const PRISMA_SCHEMA_STRATEGY_VERSION = "prisma-schema-v1.0";

export class PrismaSchemaChunkStrategy implements ChunkStrategy {
  readonly name = "prisma-schema";
  readonly version = PRISMA_SCHEMA_STRATEGY_VERSION;

  matches(filename: string): boolean {
    return filename.endsWith("schema.prisma");
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    if (content.trim() === "") {
      return [this.buildChunk(ctx, "schema.prisma > empty", "")];
    }

    const lines = content.split("\n");
    const chunks: Chunk[] = [];
    let currentBlock: { keyword: string; name: string; lines: string[]; depth: number } | null =
      null;

    for (const line of lines) {
      if (!currentBlock) {
        const match = line.match(
          /^(model|enum|generator|datasource|view)\s+(\w+)\s*\{/
        );
        if (match) {
          currentBlock = {
            keyword: match[1],
            name: match[2],
            lines: [line],
            depth: 1,
          };
        }
      } else {
        currentBlock.lines.push(line);
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        currentBlock.depth += opens - closes;
        if (currentBlock.depth === 0) {
          chunks.push(
            this.buildChunk(
              ctx,
              `schema.prisma > ${currentBlock.keyword} ${currentBlock.name}`,
              currentBlock.lines.join("\n")
            )
          );
          currentBlock = null;
        }
      }
    }

    return chunks.length > 0
      ? chunks
      : [this.buildChunk(ctx, "schema.prisma", content)];
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
