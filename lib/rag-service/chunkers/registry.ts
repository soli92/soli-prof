import { EnvExampleChunkStrategy } from "./env-example";
import { GenericConfigChunkStrategy } from "./generic-config";
import { GithubWorkflowChunkStrategy } from "./github-workflow";
import { MarkdownChunkStrategy } from "./markdown";
import { PackageJsonChunkStrategy } from "./package-json";
import { PrismaSchemaChunkStrategy } from "./prisma-schema";
import { TsconfigChunkStrategy } from "./tsconfig";
import type { ChunkStrategy } from "./types";

const strategies: ChunkStrategy[] = [
  new MarkdownChunkStrategy(),
  new PackageJsonChunkStrategy(),
  new TsconfigChunkStrategy(),
  new GithubWorkflowChunkStrategy(),
  new PrismaSchemaChunkStrategy(),
  new EnvExampleChunkStrategy(),
  new GenericConfigChunkStrategy(),
];

/**
 * Restituisce la strategia che gestisce il filename dato.
 * Throw se nessuna match.
 */
export function selectChunker(filename: string): ChunkStrategy {
  const strategy = strategies.find((s) => s.matches(filename));
  if (!strategy) {
    throw new Error(
      `No chunk strategy found for filename: "${filename}". ` +
        `Registered strategies: ${strategies.map((s) => s.name).join(", ")}`
    );
  }
  return strategy;
}

/**
 * Lista tutte le strategie registrate. Utile per test e debug.
 */
export function listStrategies(): readonly ChunkStrategy[] {
  return strategies;
}
