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
} from "./query";

export {
  countCorpus,
} from "./store";

export {
  CORPUS_REGISTRY,
  CORPUS_REPOS,
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
  CorpusId,
  CorpusConfig,
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
