import { describe, it, expect, vi, afterEach } from "vitest";
import { queryMultipleCorpora, queryCorpusHybrid } from "./query";
import type { QueryResult, RetrievedChunk } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("queryMultipleCorpora (RRF)", () => {
  it("ritorna risultato vuoto se corpora vuoti", async () => {
    const result = await queryMultipleCorpora([], "test query");
    expect(result.context).toBe("");
    expect(result.sources).toEqual([]);
    expect(result.corporaQueried).toEqual([]);
  });

  it("fonde ranking da 2 corpus con RRF score corretto", async () => {
    const mock0: QueryResult = {
      corpus: "ai_logs",
      context: "...",
      sources: [
        { repo: "r1", section: "s1", similarity: 0.9, preview: "p1" },
        { repo: "r2", section: "s2", similarity: 0.7, preview: "p2" },
      ],
    };
    const mock1: QueryResult = {
      corpus: "agents_md",
      context: "...",
      sources: [
        { repo: "r2", section: "s2", similarity: 0.8, preview: "p2" },
        { repo: "r3", section: "s3", similarity: 0.6, preview: "p3" },
      ],
    };

    const queryImpl = vi
      .fn()
      .mockResolvedValueOnce(mock0)
      .mockResolvedValueOnce(mock1);

    const result = await queryMultipleCorpora(
      ["ai_logs", "agents_md"],
      "test",
      25,
      25,
      queryImpl
    );

    expect(result.sources.length).toBe(3);
    expect(result.sources[0].repo).toBe("r2");
    expect(result.sources[0].similarity).toBe(0.8);
    expect(result.corporaQueried).toEqual(["ai_logs", "agents_md"]);
  });

  it("non rompe se uno dei corpus throw", async () => {
    const queryImpl = vi
      .fn()
      .mockResolvedValueOnce({
        corpus: "ai_logs",
        context: "...",
        sources: [{ repo: "r1", section: "s1", similarity: 0.9, preview: "p1" }],
      })
      .mockRejectedValueOnce(new Error("RPC failed"));

    const result = await queryMultipleCorpora(
      ["ai_logs", "agents_md"],
      "test",
      25,
      25,
      queryImpl
    );
    expect(result.sources.length).toBe(1);
    expect(result.sources[0].repo).toBe("r1");
  });

  it("rispetta topKOutput", async () => {
    const sources = Array.from({ length: 50 }, (_, i) => ({
      repo: `r${i}`,
      section: `s${i}`,
      similarity: 0.9 - i * 0.01,
      preview: `p${i}`,
    }));

    const queryImpl = vi.fn().mockResolvedValue({
      corpus: "ai_logs",
      context: "",
      sources,
    });

    const result = await queryMultipleCorpora(["ai_logs"], "test", 50, 10, queryImpl);
    expect(result.sources.length).toBe(10);
  });

  it("corporaQueried riflette la lista richiesta", async () => {
    const queryImpl = vi.fn().mockResolvedValue({
      corpus: "ai_logs",
      context: "",
      sources: [],
    });

    const corpora = ["ai_logs", "agents_md", "repo_configs"] as const;
    const result = await queryMultipleCorpora([...corpora], "x", 25, 25, queryImpl);
    expect(result.corporaQueried).toEqual(corpora);
    expect(queryImpl).toHaveBeenCalledTimes(3);
  });

  it("con tutti i corpus senza hit restituisce contesto e sorgenti vuoti", async () => {
    const queryImpl = vi.fn().mockResolvedValue({
      corpus: "ai_logs",
      context: "",
      sources: [],
    });

    const result = await queryMultipleCorpora(
      ["ai_logs", "agents_md"],
      "query generica",
      25,
      25,
      queryImpl
    );
    expect(result.sources).toEqual([]);
    expect(result.context).toBe("");
  });

  it("con queryImpl esplicito e mode hybrid usa queryImpl (ignora default hybrid)", async () => {
    const queryImpl = vi.fn().mockResolvedValue({
      corpus: "ai_logs",
      context: "",
      sources: [{ repo: "injected", section: "s", similarity: 0.9, preview: "p" }],
    });

    const result = await queryMultipleCorpora(
      ["ai_logs"],
      "q",
      25,
      25,
      queryImpl,
      "hybrid"
    );

    expect(queryImpl).toHaveBeenCalledWith("ai_logs", "q", 25);
    expect(result.sources[0]?.repo).toBe("injected");
  });
});

describe("queryCorpusHybrid", () => {
  const mockChunkSemantic1: RetrievedChunk = {
    id: "id-sem-1",
    repo: "r1",
    section: "s1",
    content: "content semantic 1",
    metadata: {},
    similarity: 0.85,
  };
  const mockChunkBM25_1: RetrievedChunk = {
    id: "id-bm-1",
    repo: "r2",
    section: "s2",
    content: "content BM25 1",
    metadata: {},
    similarity: 0.35,
  };
  const mockChunkBoth: RetrievedChunk = {
    id: "id-both",
    repo: "r3",
    section: "s3",
    content: "content both",
    metadata: {},
    similarity: 0.75,
  };

  it("ritorna context vuoto se entrambi i ranking sono vuoti", async () => {
    const result = await queryCorpusHybrid("ai_logs", "test", 25, {
      searchSimilarFn: vi.fn().mockResolvedValue([]),
      searchSimilarTextFn: vi.fn().mockResolvedValue([]),
      embedTextsFn: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });
    expect(result.sources).toEqual([]);
    expect(result.context).toBe("");
  });

  it("fonde semantic + BM25 con RRF, chunk in entrambi vince", async () => {
    const result = await queryCorpusHybrid("ai_logs", "test", 25, {
      searchSimilarFn: vi.fn().mockResolvedValue([mockChunkSemantic1, mockChunkBoth]),
      searchSimilarTextFn: vi.fn().mockResolvedValue([mockChunkBoth, mockChunkBM25_1]),
      embedTextsFn: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].repo).toBe("r3");
  });

  it("se embed fallisce, fallback a solo BM25", async () => {
    const result = await queryCorpusHybrid("ai_logs", "test", 25, {
      searchSimilarFn: vi.fn(),
      searchSimilarTextFn: vi.fn().mockResolvedValue([mockChunkBM25_1]),
      embedTextsFn: vi.fn().mockRejectedValue(new Error("Voyage down")),
    });

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].repo).toBe("r2");
  });

  it("se semantic fallisce ma BM25 va, ritorna solo BM25", async () => {
    const result = await queryCorpusHybrid("ai_logs", "test", 25, {
      searchSimilarFn: vi.fn().mockRejectedValue(new Error("RPC error")),
      searchSimilarTextFn: vi.fn().mockResolvedValue([mockChunkBM25_1]),
      embedTextsFn: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].repo).toBe("r2");
  });

  it("rispetta topK", async () => {
    const manyChunks = Array.from({ length: 30 }, (_, i) => ({
      id: `id-${i}`,
      repo: `r${i}`,
      section: `s${i}`,
      content: `content ${i}`,
      metadata: {},
      similarity: 0.5,
    }));

    const result = await queryCorpusHybrid("ai_logs", "test", 5, {
      searchSimilarFn: vi.fn().mockResolvedValue(manyChunks),
      searchSimilarTextFn: vi.fn().mockResolvedValue([]),
      embedTextsFn: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });

    expect(result.sources.length).toBeLessThanOrEqual(5);
  });
});
