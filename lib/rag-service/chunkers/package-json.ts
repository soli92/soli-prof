import crypto from "crypto";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const PACKAGE_JSON_STRATEGY_VERSION = "package-json-v1.0";

export class PackageJsonChunkStrategy implements ChunkStrategy {
  readonly name = "package-json";
  readonly version = PACKAGE_JSON_STRATEGY_VERSION;

  matches(filename: string): boolean {
    return filename === "package.json";
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    if (content.trim() === "") {
      return [this.buildChunk(ctx, "package.json > empty", "")];
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      console.warn("[PackageJsonChunkStrategy] JSON.parse failed; using raw fallback");
      return [this.buildChunk(ctx, "package.json > raw", content)];
    }

    const chunks: Chunk[] = [];

    const overviewFields: string[] = [];
    if (typeof parsed.name === "string") overviewFields.push(`name: ${parsed.name}`);
    if (typeof parsed.version === "string")
      overviewFields.push(`version: ${parsed.version}`);
    if (typeof parsed.description === "string")
      overviewFields.push(`description: ${parsed.description}`);
    if (typeof parsed.type === "string") overviewFields.push(`type: ${parsed.type}`);
    if (typeof parsed.main === "string") overviewFields.push(`main: ${parsed.main}`);
    if (overviewFields.length > 0) {
      chunks.push(
        this.buildChunk(ctx, "package.json > overview", overviewFields.join("\n"))
      );
    }

    const sectionsToExtract = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "scripts",
      "engines",
    ] as const;

    for (const sectionName of sectionsToExtract) {
      const section = parsed[sectionName];
      if (
        section &&
        typeof section === "object" &&
        !Array.isArray(section) &&
        Object.keys(section as object).length > 0
      ) {
        const formatted = JSON.stringify(section, null, 2);
        chunks.push(
          this.buildChunk(
            ctx,
            `package.json > ${sectionName}`,
            `${sectionName}:\n${formatted}`
          )
        );
      }
    }

    return chunks.length > 0 ? chunks : [this.buildChunk(ctx, "package.json", content)];
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
