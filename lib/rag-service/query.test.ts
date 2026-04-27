import { describe, it, expect, vi, afterEach } from "vitest";
import { queryMultipleCorpora } from "./query";
import type { QueryResult } from "./types";

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
});
