/**
 * Interfacce pubbliche del servizio RAG.
 * Questo file è il "contract" — domani quando estraiamo il servizio standalone,
 * questi tipi restano stabili e diventano la base del client SDK.
 */

export type CorpusId = "ai_logs" | "agents_md" | "repo_configs";

/**
 * Descrive un file specifico da indicizzare nel corpus repo_configs.
 * Diversamente da ai_logs/agents_md che hanno UN solo file per repo
 * (AI_LOG.md, AGENTS.md), repo_configs indicizza N file per repo.
 */
export interface ConfigSource {
  /**
   * Pattern di filename relativo alla root del repo.
   * Supporta glob semplici (es. ".github/workflows/*.yml").
   * NOTA: implementazione del glob arriva nel sub-step 3.4.
   */
  pattern: string;

  /**
   * Tipo di file. Determina quale ChunkStrategy verrà usata.
   */
  fileType:
    | "package-json"
    | "tsconfig"
    | "github-workflow"
    | "prisma-schema"
    | "env-example"
    | "generic-config";
}

/** Voce registry corpus: tabella Supabase, RPC match, file singolo o multi. */
export interface CorpusRegistryEntry {
  sourceFileName: string | null;
  supabaseTable: string;
  /** Vector cosine similarity (semantic). */
  matchFunction: string;
  /** Text search (ts_rank / BM25-like) su `content_tsv`. */
  matchFunctionText: string;
  description: string;
}

export type CorpusConfig =
  | (CorpusRegistryEntry & { id: "ai_logs"; sourceFileName: string })
  | (CorpusRegistryEntry & { id: "agents_md"; sourceFileName: string })
  | (CorpusRegistryEntry & { id: "repo_configs"; sourceFileName: null });

/** Metadati persistiti con ogni chunk (JSONB + colonne dedicate in Supabase). */
export interface ChunkMetadata {
  repo: string;
  owner: string;
  branch: string;
  indexedAt: string;
  chunkerVersion: string;
  corpusVersion: string;
}

export interface Chunk {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: ChunkMetadata;
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

/**
 * Opzioni per `ingestCorpus` / `ingestAllCorpora`.
 */
export interface IngestCorpusOptions {
  onProgress?: IngestProgressCallback;

  /**
   * Se presente, ingesta SOLO i repo specificati invece di tutti i repo
   * del corpus. Usato per ingest selettivo (es. webhook GitHub: re-ingest
   * solo il repo che ha pushato).
   *
   * I repo passati che NON appartengono a CORPUS_REPOS[corpus] vengono
   * IGNORATI silenziosamente (security: non si possono ingestare repo
   * arbitrari).
   *
   * Default: undefined → ingest di tutti i repo del corpus (comportamento
   * storico).
   */
  targetRepos?: RepoTarget[];
}

/**
 * Nome storico, equivalente a {@link IngestCorpusOptions}.
 */
export type IngestOptions = IngestCorpusOptions;
