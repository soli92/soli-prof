import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CORPUS_REGISTRY,
  CORPUS_REPOS,
  CURRENT_CHUNKER_VERSION,
  CURRENT_CORPUS_VERSION,
  DEFAULT_CONFIG_SOURCES,
  RAG_CONFIG,
  requireEnv,
} from "./config";
import { MissingEnvError } from "./errors";

describe("version constants", () => {
  it("esporta CURRENT_CORPUS_VERSION e CURRENT_CHUNKER_VERSION come stringhe non vuote", () => {
    expect(CURRENT_CORPUS_VERSION).toBeTruthy();
    expect(typeof CURRENT_CORPUS_VERSION).toBe("string");
    expect(CURRENT_CHUNKER_VERSION).toBeTruthy();
    expect(typeof CURRENT_CHUNKER_VERSION).toBe("string");
    expect(CURRENT_CHUNKER_VERSION).toMatch(/^[a-z]+-v\d+(\.\d+)?$/);
  });
});

describe("CORPUS_REGISTRY", () => {
  it("defines corpora with distinct tables and match RPC names", () => {
    expect(CORPUS_REGISTRY.ai_logs.id).toBe("ai_logs");
    expect(CORPUS_REGISTRY.ai_logs.supabaseTable).toBe("rag_ai_logs");
    expect(CORPUS_REGISTRY.ai_logs.matchFunction).toBe("match_rag_ai_logs");
    expect(CORPUS_REGISTRY.agents_md.sourceFileName).toBe("AGENTS.md");
    expect(CORPUS_REGISTRY.agents_md.supabaseTable).toBe("rag_agents_md");
    expect(CORPUS_REGISTRY.agents_md.matchFunction).toBe("match_rag_agents_md");
  });

  it("CORPUS_REGISTRY include repo_configs con sourceFileName null", () => {
    expect(CORPUS_REGISTRY.repo_configs).toBeDefined();
    expect(CORPUS_REGISTRY.repo_configs.sourceFileName).toBeNull();
    expect(CORPUS_REGISTRY.repo_configs.supabaseTable).toBe("rag_repo_configs");
    expect(CORPUS_REGISTRY.repo_configs.matchFunction).toBe("match_rag_repo_configs");
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
    expect(CORPUS_REPOS.repo_configs.length).toBeGreaterThan(0);
  });

  it("CORPUS_REPOS.repo_configs ha 13 repo", () => {
    expect(CORPUS_REPOS.repo_configs).toHaveLength(13);
    expect(CORPUS_REPOS.repo_configs.every((r) => r.owner === "soli92")).toBe(true);
  });

  it("includes health-wand-and-fire in both corpora (ai_logs + agents_md)", () => {
    const target = { owner: "soli92", repo: "health-wand-and-fire", branch: "main" };
    expect(CORPUS_REPOS.ai_logs).toContainEqual(target);
    expect(CORPUS_REPOS.agents_md).toContainEqual(target);
  });
});

describe("DEFAULT_CONFIG_SOURCES", () => {
  it("include i 6 fileType attesi", () => {
    const fileTypes = new Set(DEFAULT_CONFIG_SOURCES.map((s) => s.fileType));
    expect(fileTypes.has("package-json")).toBe(true);
    expect(fileTypes.has("tsconfig")).toBe(true);
    expect(fileTypes.has("github-workflow")).toBe(true);
    expect(fileTypes.has("prisma-schema")).toBe(true);
    expect(fileTypes.has("env-example")).toBe(true);
    expect(fileTypes.has("generic-config")).toBe(true);
  });
});

describe("RAG_CONFIG", () => {
  it("keeps embedding and retrieval bounds consistent", () => {
    expect(RAG_CONFIG.embeddingModel).toBe("voyage-3");
    expect(RAG_CONFIG.defaultTopK).toBeLessThanOrEqual(RAG_CONFIG.maxTopK);
    expect(RAG_CONFIG.similarityThresholdForContext).toBeGreaterThanOrEqual(0);
    expect(RAG_CONFIG.similarityThresholdForContext).toBeLessThanOrEqual(1);
    expect(RAG_CONFIG.similarityThresholdForSources).toBeGreaterThanOrEqual(0);
    expect(RAG_CONFIG.similarityThresholdForSources).toBeLessThanOrEqual(1);
    expect(RAG_CONFIG.similarityThresholdForSources).toBeGreaterThanOrEqual(
      RAG_CONFIG.similarityThresholdForContext
    );
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
