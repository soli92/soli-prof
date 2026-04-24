/**
 * Interfacce pubbliche del servizio RAG.
 * Questo file è il "contract" — domani quando estraiamo il servizio standalone,
 * questi tipi restano stabili e diventano la base del client SDK.
 */

export type CorpusId = "ai_logs" | "agents_md";

export interface CorpusConfig {
  id: CorpusId;
  description: string;
  sourceFileName: string;       // "AI_LOG.md" | "AGENTS.md"
  supabaseTable: string;         // "rag_ai_logs" | "rag_agents_md"
  matchFunction: string;         // "match_rag_ai_logs" | "match_rag_agents_md"
}

export interface Chunk {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

export interface RetrievedChunk {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface RetrievedSource {
  repo: string;
  section: string;
  similarity: number;
  preview: string;
  commitHash?: string;
}

export interface QueryResult {
  corpus: CorpusId;
  context: string;
  sources: RetrievedSource[];
}

export interface IngestReport {
  corpus: CorpusId;
  totalRepos: number;
  totalChunks: number;
  byRepo: Record<string, number>;
  elapsedMs: number;
}

export interface RepoTarget {
  owner: string;
  repo: string;
  branch: string;
}
