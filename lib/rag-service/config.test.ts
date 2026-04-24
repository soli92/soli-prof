import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CORPUS_REGISTRY, CORPUS_REPOS, RAG_CONFIG, requireEnv } from "./config";
import { MissingEnvError } from "./errors";

describe("CORPUS_REGISTRY", () => {
  it("defines two corpora with distinct tables and match RPC names", () => {
    expect(CORPUS_REGISTRY.ai_logs.id).toBe("ai_logs");
    expect(CORPUS_REGISTRY.ai_logs.supabaseTable).toBe("rag_ai_logs");
    expect(CORPUS_REGISTRY.ai_logs.matchFunction).toBe("match_rag_ai_logs");
    expect(CORPUS_REGISTRY.agents_md.sourceFileName).toBe("AGENTS.md");
    expect(CORPUS_REGISTRY.agents_md.supabaseTable).toBe("rag_agents_md");
    expect(CORPUS_REGISTRY.agents_md.matchFunction).toBe("match_rag_agents_md");
  });

  it("keys match CorpusId entries", () => {
    for (const id of Object.keys(CORPUS_REGISTRY) as (keyof typeof CORPUS_REGISTRY)[]) {
      expect(CORPUS_REGISTRY[id].id).toBe(id);
    }
  });
});

describe("CORPUS_REPOS", () => {
  it("lists at least one repo per corpus", () => {
    expect(CORPUS_REPOS.ai_logs.length).toBeGreaterThan(0);
    expect(CORPUS_REPOS.agents_md.length).toBeGreaterThan(0);
  });
});

describe("RAG_CONFIG", () => {
  it("keeps embedding and retrieval bounds consistent", () => {
    expect(RAG_CONFIG.embeddingModel).toBe("voyage-3");
    expect(RAG_CONFIG.defaultTopK).toBeLessThanOrEqual(RAG_CONFIG.maxTopK);
    expect(RAG_CONFIG.similarityThreshold).toBeGreaterThanOrEqual(0);
    expect(RAG_CONFIG.similarityThreshold).toBeLessThanOrEqual(1);
  });
});

describe("requireEnv", () => {
  const key = "SOLI_PROF_TEST_REQUIRE_ENV";

  beforeEach(() => {
    delete process.env[key];
  });

  afterEach(() => {
    delete process.env[key];
  });

  it("throws MissingEnvError when variable is unset", () => {
    expect(() => requireEnv(key)).toThrow(MissingEnvError);
    expect(() => requireEnv(key)).toThrow(/Missing required environment variable/);
  });

  it("throws when value is only whitespace", () => {
    process.env[key] = "   ";
    expect(() => requireEnv(key)).toThrow(MissingEnvError);
  });

  it("returns the value when set", () => {
    process.env[key] = "secret-value";
    expect(requireEnv(key)).toBe("secret-value");
  });
});
