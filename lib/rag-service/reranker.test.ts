import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rerank } from "./reranker";

describe("rerank", () => {
  const sampleSources = [
    { repo: "r1", section: "s1", similarity: 0.5, preview: "p1" },
    { repo: "r2", section: "s2", similarity: 0.4, preview: "p2" },
    { repo: "r3", section: "s3", similarity: 0.3, preview: "p3" },
  ];

  beforeEach(() => {
    delete process.env.VOYAGE_RERANK_ENABLED;
    delete process.env.VOYAGE_API_KEY;
    delete process.env.VOYAGE_RERANK_MODEL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("NO-OP se VOYAGE_RERANK_ENABLED non è true", async () => {
    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources).toEqual(sampleSources);
  });

  it("NO-OP applica slice a topK", async () => {
    const result = await rerank("query", sampleSources, 2);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources.length).toBe(2);
    expect(result.sources[0].repo).toBe("r1");
    expect(result.sources[1].repo).toBe("r2");
  });

  it("NO-OP senza topK ritorna tutto", async () => {
    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources.length).toBe(3);
  });

  it("NO-OP se VOYAGE_RERANK_ENABLED=true ma VOYAGE_API_KEY mancante", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources).toEqual(sampleSources);
  });

  it("riordina sources secondo response Voyage", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    process.env.VOYAGE_API_KEY = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { index: 2, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.85 },
          { index: 1, relevance_score: 0.65 },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(true);
    expect(result.model).toBe("rerank-2-lite");
    expect(result.sources[0].repo).toBe("r3");
    expect(result.sources[1].repo).toBe("r1");
    expect(result.sources[2].repo).toBe("r2");
  });

  it("rispetta topK", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    process.env.VOYAGE_API_KEY = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { index: 0, relevance_score: 0.9 },
          { index: 1, relevance_score: 0.8 },
          { index: 2, relevance_score: 0.7 },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await rerank("query", sampleSources, 2);
    expect(result.sources.length).toBe(2);
  });

  it("degrade graceful su fetch error", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    process.env.VOYAGE_API_KEY = "test-key";

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network down"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources).toEqual(sampleSources.slice(0, 3));
  });

  it("degrade graceful su HTTP error", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    process.env.VOYAGE_API_KEY = "test-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limit",
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await rerank("query", sampleSources);
    expect(result.rerankApplied).toBe(false);
    expect(result.sources).toEqual(sampleSources.slice(0, 3));
  });

  it("usa VOYAGE_RERANK_MODEL custom se presente", async () => {
    process.env.VOYAGE_RERANK_ENABLED = "true";
    process.env.VOYAGE_API_KEY = "test-key";
    process.env.VOYAGE_RERANK_MODEL = "rerank-2";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ index: 0, relevance_score: 0.9 }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await rerank("query", sampleSources);
    expect(result.model).toBe("rerank-2");

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as { body: string }).body
    );
    expect(body.model).toBe("rerank-2");
  });
});
