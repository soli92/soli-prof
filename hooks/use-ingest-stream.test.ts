import { describe, expect, it } from "vitest";
import {
  deriveIngestAggregates,
  ingestCorpusRunsReducer,
  type CorpusRun,
  type IngestEvent,
} from "./use-ingest-stream";

function runAiLogs(partial: Partial<CorpusRun> = {}): CorpusRun {
  return {
    corpus: "ai_logs",
    totalRepos: 2,
    repos: [],
    totalChunks: undefined,
    elapsedMs: undefined,
    phase: "running",
    ...partial,
  };
}

describe("ingestCorpusRunsReducer", () => {
  it("append a new run on start", () => {
    const e: IngestEvent = { type: "start", corpus: "ai_logs", totalRepos: 3 };
    const next = ingestCorpusRunsReducer([], e);
    expect(next).toHaveLength(1);
    expect(next[0].corpus).toBe("ai_logs");
    expect(next[0].totalRepos).toBe(3);
    expect(next[0].repos).toEqual([]);
    expect(next[0].phase).toBe("running");
  });

  it("does not mutate repo events when there is no active run", () => {
    const e: IngestEvent = { type: "repo-start", repo: "soli-agent" };
    expect(ingestCorpusRunsReducer([], e)).toEqual([]);
  });

  it("accumulates repos only on the last run (multi-corpus all)", () => {
    let runs = ingestCorpusRunsReducer([], {
      type: "start",
      corpus: "ai_logs",
      totalRepos: 1,
    });
    runs = ingestCorpusRunsReducer(runs, { type: "repo-start", repo: "repo-a" });
    runs = ingestCorpusRunsReducer(runs, {
      type: "repo-done",
      repo: "repo-a",
      chunks: 10,
      elapsedMs: 100,
    });
    runs = ingestCorpusRunsReducer(runs, {
      type: "complete",
      corpus: "ai_logs",
      totalRepos: 1,
      totalChunks: 10,
      elapsedMs: 500,
    });

    runs = ingestCorpusRunsReducer(runs, {
      type: "start",
      corpus: "agents_md",
      totalRepos: 1,
    });
    runs = ingestCorpusRunsReducer(runs, { type: "repo-start", repo: "repo-a" });
    runs = ingestCorpusRunsReducer(runs, {
      type: "repo-done",
      repo: "repo-a",
      chunks: 5,
      elapsedMs: 50,
    });
    runs = ingestCorpusRunsReducer(runs, {
      type: "complete",
      corpus: "agents_md",
      totalRepos: 1,
      totalChunks: 5,
      elapsedMs: 200,
    });

    expect(runs).toHaveLength(2);
    expect(runs[0].repos).toHaveLength(1);
    expect(runs[0].repos[0].chunks).toBe(10);
    expect(runs[0].phase).toBe("complete");
    expect(runs[0].totalChunks).toBe(10);

    expect(runs[1].repos).toHaveLength(1);
    expect(runs[1].repos[0].chunks).toBe(5);
    expect(runs[1].phase).toBe("complete");
    expect(runs[1].totalChunks).toBe(5);
  });

  it("updates phase on the last run only", () => {
    let runs: CorpusRun[] = [
      runAiLogs({ phase: "complete", totalChunks: 1, elapsedMs: 1 }),
    ];
    runs = ingestCorpusRunsReducer(runs, {
      type: "start",
      corpus: "agents_md",
      totalRepos: 1,
    });
    runs = ingestCorpusRunsReducer(runs, { type: "phase", phase: "embedding" });
    expect(runs[0].phase).toBe("complete");
    expect(runs[1].phase).toBe("embedding");
  });

  it("marks last run error on stream error event", () => {
    let runs = ingestCorpusRunsReducer([], {
      type: "start",
      corpus: "ai_logs",
      totalRepos: 1,
    });
    runs = ingestCorpusRunsReducer(runs, { type: "error", error: "boom" });
    expect(runs[0].phase).toBe("error");
  });
});

describe("deriveIngestAggregates", () => {
  it("returns undefined totals until every run is complete", () => {
    const runs: CorpusRun[] = [
      runAiLogs({
        phase: "complete",
        totalChunks: 3,
        elapsedMs: 100,
        repos: [{ repo: "a", status: "done" }],
      }),
      {
        corpus: "agents_md",
        totalRepos: 1,
        repos: [{ repo: "b", status: "fetching" }],
        totalChunks: undefined,
        elapsedMs: undefined,
        phase: "running",
      },
    ];
    const d = deriveIngestAggregates(runs);
    expect(d.repos).toHaveLength(2);
    expect(d.totalChunks).toBeUndefined();
    expect(d.elapsedMs).toBeUndefined();
  });

  it("sums chunks and elapsed when all runs are complete", () => {
    const runs: CorpusRun[] = [
      runAiLogs({
        phase: "complete",
        totalChunks: 10,
        elapsedMs: 100,
        repos: [],
      }),
      {
        corpus: "agents_md",
        totalRepos: 1,
        repos: [],
        totalChunks: 20,
        elapsedMs: 300,
        phase: "complete",
      },
    ];
    const d = deriveIngestAggregates(runs);
    expect(d.totalChunks).toBe(30);
    expect(d.elapsedMs).toBe(400);
  });

  it("returns undefined totals for empty corpusRuns", () => {
    const d = deriveIngestAggregates([]);
    expect(d.repos).toEqual([]);
    expect(d.totalChunks).toBeUndefined();
    expect(d.elapsedMs).toBeUndefined();
  });
});
