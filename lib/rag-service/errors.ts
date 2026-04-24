/**
 * Errori tipizzati del servizio RAG.
 * Quando estrarremo come microservizio, ognuno di questi mappa a un HTTP status code.
 */

export class RagServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RagServiceError";
  }
}

export class CorpusNotFoundError extends RagServiceError {
  constructor(corpus: string) {
    super(`Unknown corpus: "${corpus}". Valid options: ai_logs, agents_md.`);
    this.name = "CorpusNotFoundError";
  }
}

export class MissingEnvError extends RagServiceError {
  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`);
    this.name = "MissingEnvError";
  }
}

export class GitHubFetchError extends RagServiceError {
  constructor(repo: string, reason: string) {
    super(`Failed to fetch from ${repo}: ${reason}`);
    this.name = "GitHubFetchError";
  }
}

export class EmbeddingError extends RagServiceError {
  constructor(reason: string) {
    super(`Embedding failed: ${reason}`);
    this.name = "EmbeddingError";
  }
}

export class StoreError extends RagServiceError {
  constructor(reason: string) {
    super(`Vector store error: ${reason}`);
    this.name = "StoreError";
  }
}

export class InvalidApiKeyError extends RagServiceError {
  constructor() {
    super("Invalid or missing API key");
    this.name = "InvalidApiKeyError";
  }
}
