/**
 * Barrel export: superficie pubblica del modulo rag-service.
 *
 * Tutto ciò che un consumer (API route, CLI script, futuro client SDK) deve
 * usare passa da qui. Se un simbolo non è esportato in questo file, è privato.
 */

export {
  ingestCorpus,
  ingestAllCorpora,
} from "./ingest";

export {
  queryCorpus,
  queryMultipleCorpora,
} from "./query";

export { rerank, type RerankResult } from "./reranker";

export {
  upsertChunks,
  searchSimilar,
  searchSimilarText,
  countCorpus,
} from "./store";

export {
  CORPUS_REGISTRY,
  CORPUS_REPOS,
  CURRENT_CHUNKER_VERSION,
  CURRENT_CORPUS_VERSION,
  DEFAULT_CONFIG_SOURCES,
  RAG_CONFIG,
} from "./config";

export {
  RagServiceError,
  CorpusNotFoundError,
  MissingEnvError,
  GitHubFetchError,
  EmbeddingError,
  StoreError,
  InvalidApiKeyError,
} from "./errors";

export type {
  ConfigSource,
  CorpusId,
  CorpusConfig,
  CorpusRegistryEntry,
  Chunk,
  ChunkWithEmbedding,
  RetrievedChunk,
  RetrievedSource,
  QueryResult,
  IngestReport,
  RepoTarget,
  IngestProgressEvent,
  IngestProgressCallback,
  IngestOptions,
} from "./types";

export type { MultiCorpusQueryResult } from "./query";
