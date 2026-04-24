/**
 * Interfacce pubbliche del servizio RAG.
 * Questo file è il "contract" — domani quando estraiamo il servizio standalone,
 * questi tipi restano stabili e diventano la base del client SDK.
 */

export type CorpusId = "ai_logs" | "agents_md";

export interface CorpusConfig {
  id: CorpusId;
  description: string;
  sourceFileName: string;
  supabaseTable: string;
  matchFunction: string;
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

/**
 * Eventi emessi durante l'ingest quando viene passato onProgress.
 */
export type IngestProgressEvent =
  | { type: "start"; corpus: CorpusId; totalRepos: number }
  | { type: "repo-start"; repo: string }
  | { type: "repo-fetched"; repo: string; chars: number }
  | { type: "repo-chunked"; repo: string; chunks: number }
  | { type: "repo-done"; repo: string; chunks: number; elapsedMs: number }
  | { type: "repo-skipped"; repo: string; reason: string }
  | { type: "repo-error"; repo: string; error: string }
  | { type: "phase"; phase: "embedding" | "upserting"; totalChunks?: number }
  | { type: "complete"; corpus: CorpusId; totalRepos: number; totalChunks: number; elapsedMs: number };

export type IngestProgressCallback = (event: IngestProgressEvent) => void;

export interface IngestOptions {
  onProgress?: IngestProgressCallback;
}
