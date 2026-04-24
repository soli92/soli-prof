/**
 * Configurazione del servizio RAG.
 * Legge env vars, definisce i corpus disponibili, espone la lista repo.
 */

import { MissingEnvError } from "./errors";
import type { CorpusConfig, CorpusId, RepoTarget } from "./types";

/**
 * Registry dei corpus supportati.
 * Per aggiungere un nuovo corpus: aggiungere l'entry qui + creare tabella SQL.
 */
export const CORPUS_REGISTRY: Record<CorpusId, CorpusConfig> = {
  ai_logs: {
    id: "ai_logs",
    description: "AI development logs (AI_LOG.md files)",
    sourceFileName: "AI_LOG.md",
    supabaseTable: "rag_ai_logs",
    matchFunction: "match_rag_ai_logs",
  },
  agents_md: {
    id: "agents_md",
    description: "Agent operative context (AGENTS.md files)",
    sourceFileName: "AGENTS.md",
    supabaseTable: "rag_agents_md",
    matchFunction: "match_rag_agents_md",
  },
};

/**
 * Config globale di pipeline.
 */
export const RAG_CONFIG = {
  embeddingModel: "voyage-3",
  embeddingDimensions: 1024,
  chunkMaxTokens: 1500,
  defaultTopK: 15,
  maxTopK: 30,
  similarityThreshold: 0.20,
};

/**
 * Repo target per ogni corpus.
 * In futuro questo sarà config remota (DB o file YAML), per ora hardcoded.
 */
export const CORPUS_REPOS: Record<CorpusId, RepoTarget[]> = {
  ai_logs: [
    { owner: "soli92", repo: "soli-agent", branch: "main" },
    { owner: "soli92", repo: "casa-mia-be", branch: "main" },
    { owner: "soli92", repo: "casa-mia-fe", branch: "main" },
    { owner: "soli92", repo: "bachelor-party-claudiano", branch: "main" },
    { owner: "soli92", repo: "solids", branch: "main" },
    { owner: "soli92", repo: "soli-prof", branch: "main" },
  ],
  agents_md: [
    { owner: "soli92", repo: "soli-agent", branch: "main" },
    { owner: "soli92", repo: "casa-mia-be", branch: "main" },
    { owner: "soli92", repo: "casa-mia-fe", branch: "main" },
    { owner: "soli92", repo: "bachelor-party-claudiano", branch: "main" },
    { owner: "soli92", repo: "solids", branch: "main" },
    { owner: "soli92", repo: "soli-prof", branch: "main" },
    { owner: "soli92", repo: "soli-dm-be", branch: "main" },
    { owner: "soli92", repo: "soli-dm-fe", branch: "main" },
    { owner: "soli92", repo: "soli-dome", branch: "main" },
    { owner: "soli92", repo: "pippify", branch: "main" },
    { owner: "soli92", repo: "soli-platform", branch: "main" },
    { owner: "soli92", repo: "Koollector", branch: "main" },
  ],
};

/**
 * Legge una env var obbligatoria, throw se mancante.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new MissingEnvError(name);
  }
  return value;
}
