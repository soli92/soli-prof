import crypto from "crypto";
import { parse as parseYaml } from "yaml";
import { CURRENT_CORPUS_VERSION } from "../config";
import type { Chunk, ChunkMetadata } from "../types";
import type { ChunkStrategy, ChunkStrategyContext } from "./types";

export const GITHUB_WORKFLOW_STRATEGY_VERSION = "github-workflow-v1.0";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export class GithubWorkflowChunkStrategy implements ChunkStrategy {
  readonly name = "github-workflow";
  readonly version = GITHUB_WORKFLOW_STRATEGY_VERSION;

  matches(filename: string): boolean {
    if (!filename.startsWith(".github/workflows/")) return false;
    return filename.endsWith(".yml") || filename.endsWith(".yaml");
  }

  chunk(content: string, ctx: ChunkStrategyContext): Chunk[] {
    if (content.trim() === "") {
      return [this.buildChunk(ctx, `${ctx.filename} > empty`, "")];
    }

    let doc: unknown;
    try {
      doc = parseYaml(content);
    } catch {
      console.warn("[GithubWorkflowChunkStrategy] YAML parse failed; using raw fallback");
      return [this.buildChunk(ctx, `${ctx.filename} > raw`, content)];
    }

    if (!isRecord(doc)) {
      return [this.buildChunk(ctx, `${ctx.filename} > raw`, content)];
    }

    const chunks: Chunk[] = [];
    const metaParts: string[] = [];

    if (typeof doc.name === "string") metaParts.push(`name: ${doc.name}`);
    if (doc.on !== undefined) {
      metaParts.push(`on:\n${typeof doc.on === "string" ? doc.on : JSON.stringify(doc.on, null, 2)}`);
    }
    if (doc.env !== undefined && isRecord(doc.env)) {
      metaParts.push(`env:\n${JSON.stringify(doc.env, null, 2)}`);
    }

    if (metaParts.length > 0) {
      chunks.push(
        this.buildChunk(ctx, `${ctx.filename} > metadata`, metaParts.join("\n\n"))
      );
    }

    const jobs = doc.jobs;
    if (isRecord(jobs)) {
      for (const [jobName, jobDef] of Object.entries(jobs)) {
        const body =
          typeof jobDef === "object" && jobDef !== null
            ? JSON.stringify(jobDef, null, 2)
            : String(jobDef);
        chunks.push(
          this.buildChunk(ctx, `${ctx.filename} > jobs.${jobName}`, `job ${jobName}:\n${body}`)
        );
      }
    }

    return chunks.length > 0
      ? chunks
      : [this.buildChunk(ctx, `${ctx.filename} > raw`, content)];
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
