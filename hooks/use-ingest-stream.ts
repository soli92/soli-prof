"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { RepoProgress } from "@/components/admin/repo-progress-row";
import type { Phase } from "@/components/admin/phase-indicator";

type CorpusChoice = "ai_logs" | "agents_md" | "repo_configs" | "all";

export type CorpusId = "ai_logs" | "agents_md" | "repo_configs";

export type CorpusRunPhase =
  | "running"
  | "embedding"
  | "upserting"
  | "complete"
  | "error";

export interface CorpusRun {
  corpus: CorpusId;
  totalRepos: number;
  repos: RepoProgress[];
  totalChunks: number | undefined;
  elapsedMs: number | undefined;
  phase: CorpusRunPhase;
}

// Tipi speculari agli eventi emessi dal backend
export type IngestEvent =
  | { type: "start"; corpus: string; totalRepos: number }
  | { type: "repo-start"; repo: string }
  | { type: "repo-fetched"; repo: string; chars: number }
  | { type: "repo-chunked"; repo: string; chunks: number }
  | { type: "repo-done"; repo: string; chunks: number; elapsedMs: number }
  | { type: "repo-skipped"; repo: string; reason: string }
  | { type: "repo-error"; repo: string; error: string }
  | { type: "phase"; phase: "embedding" | "upserting"; totalChunks?: number }
  | { type: "complete"; corpus: string; totalRepos: number; totalChunks: number; elapsedMs: number }
  | { type: "error"; error: string };

type RepoIngestEvent = Extract<
  IngestEvent,
  | { type: "repo-start" }
  | { type: "repo-fetched" }
  | { type: "repo-chunked" }
  | { type: "repo-done" }
  | { type: "repo-skipped" }
  | { type: "repo-error" }
>;

/** Riduce lo stato `corpusRuns` in risposta a un evento SSE ingest (puro, testabile). */
export function ingestCorpusRunsReducer(
  prev: CorpusRun[],
  event: IngestEvent
): CorpusRun[] {
  switch (event.type) {
    case "start":
      return [
        ...prev,
        {
          corpus: event.corpus as CorpusId,
          totalRepos: event.totalRepos,
          repos: [],
          totalChunks: undefined,
          elapsedMs: undefined,
          phase: "running",
        },
      ];

    case "repo-start":
    case "repo-fetched":
    case "repo-chunked":
    case "repo-done":
    case "repo-skipped":
    case "repo-error": {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const lastRun = prev[lastIdx];
      const updatedRun = applyRepoEventToRun(lastRun, event);
      return [...prev.slice(0, lastIdx), updatedRun];
    }

    case "phase": {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const nextPhase: CorpusRunPhase =
        event.phase === "embedding" ? "embedding" : "upserting";
      return [...prev.slice(0, lastIdx), { ...prev[lastIdx], phase: nextPhase }];
    }

    case "complete": {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const updated: CorpusRun = {
        ...prev[lastIdx],
        phase: "complete",
        totalChunks: event.totalChunks,
        elapsedMs: event.elapsedMs,
      };
      return [...prev.slice(0, lastIdx), updated];
    }

    case "error": {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      return [...prev.slice(0, lastIdx), { ...prev[lastIdx], phase: "error" }];
    }
  }
}

/** Campi derivati per backward-compat (`repos` flat, totali solo se ogni run è `complete`). */
export function deriveIngestAggregates(corpusRuns: CorpusRun[]): {
  repos: RepoProgress[];
  totalChunks: number | undefined;
  elapsedMs: number | undefined;
} {
  const repos = corpusRuns.flatMap((run) => run.repos);
  if (corpusRuns.length === 0) {
    return { repos, totalChunks: undefined, elapsedMs: undefined };
  }
  if (!corpusRuns.every((r) => r.phase === "complete")) {
    return { repos, totalChunks: undefined, elapsedMs: undefined };
  }
  return {
    repos,
    totalChunks: corpusRuns.reduce((sum, r) => sum + (r.totalChunks ?? 0), 0),
    elapsedMs: corpusRuns.reduce((sum, r) => sum + (r.elapsedMs ?? 0), 0),
  };
}

function applyRepoEventToRun(run: CorpusRun, event: RepoIngestEvent): CorpusRun {
  switch (event.type) {
    case "repo-start":
      if (run.repos.some((r) => r.repo === event.repo)) {
        return {
          ...run,
          repos: run.repos.map((r) =>
            r.repo === event.repo ? { ...r, status: "fetching" } : r
          ),
        };
      }
      return { ...run, repos: [...run.repos, { repo: event.repo, status: "fetching" }] };

    case "repo-fetched":
      return {
        ...run,
        repos: run.repos.map((r) =>
          r.repo === event.repo ? { ...r, status: "chunking" } : r
        ),
      };

    case "repo-chunked":
      return {
        ...run,
        repos: run.repos.map((r) =>
          r.repo === event.repo ? { ...r, chunks: event.chunks } : r
        ),
      };

    case "repo-done":
      return {
        ...run,
        repos: run.repos.map((r) =>
          r.repo === event.repo
            ? { ...r, status: "done", chunks: event.chunks, elapsedMs: event.elapsedMs }
            : r
        ),
      };

    case "repo-skipped":
      if (run.repos.some((r) => r.repo === event.repo)) {
        return {
          ...run,
          repos: run.repos.map((r) =>
            r.repo === event.repo ? { ...r, status: "skipped", reason: event.reason } : r
          ),
        };
      }
      return {
        ...run,
        repos: [...run.repos, { repo: event.repo, status: "skipped", reason: event.reason }],
      };

    case "repo-error":
      if (run.repos.some((r) => r.repo === event.repo)) {
        return {
          ...run,
          repos: run.repos.map((r) =>
            r.repo === event.repo ? { ...r, status: "error", error: event.error } : r
          ),
        };
      }
      return {
        ...run,
        repos: [...run.repos, { repo: event.repo, status: "error", error: event.error }],
      };

    default:
      return run;
  }
}

export interface UseIngestStreamReturn {
  phase: Phase;
  corpusRuns: CorpusRun[];
  repos: RepoProgress[];
  totalChunks: number | undefined;
  elapsedMs: number | undefined;
  error: string | null;
  start: (corpus: CorpusChoice) => Promise<void>;
  reset: () => void;
  isRunning: boolean;
}

export function useIngestStream(): UseIngestStreamReturn {
  const [phase, setPhase] = useState<Phase>("idle");
  const [corpusRuns, setCorpusRuns] = useState<CorpusRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const isRunning =
    phase !== "idle" && phase !== "complete" && phase !== "error";

  const { repos, totalChunks, elapsedMs } = useMemo(
    () => deriveIngestAggregates(corpusRuns),
    [corpusRuns]
  );

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("idle");
    setCorpusRuns([]);
    setError(null);
  }, []);

  const start = useCallback(async (corpus: CorpusChoice) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("starting");
    setCorpusRuns([]);
    setError(null);

    try {
      const res = await fetch("/api/rag/ingest-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ corpus }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = await safeReadErrorBody(res);
        setPhase("error");
        setError(msg ?? `HTTP ${res.status}`);
        return;
      }

      if (!res.body) {
        setPhase("error");
        setError("Response without body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          processFrame(frame);
        }

        if (done) {
          if (buffer.trim()) {
            processFrame(buffer);
            buffer = "";
          }
          setPhase((currentPhase) => (currentPhase === "error" ? "error" : "complete"));
          break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setPhase("error");
      setError(msg);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }

    function processFrame(frame: string) {
      const lines = frame.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let event: IngestEvent;
        try {
          event = JSON.parse(payload) as IngestEvent;
        } catch {
          continue;
        }
        applyEvent(event);
      }
    }

    function applyEvent(event: IngestEvent) {
      switch (event.type) {
        case "start":
          setCorpusRuns((prev) => ingestCorpusRunsReducer(prev, event));
          setPhase("fetching-repos");
          break;

        case "repo-start":
        case "repo-fetched":
        case "repo-chunked":
        case "repo-done":
        case "repo-skipped":
        case "repo-error":
          setCorpusRuns((prev) => ingestCorpusRunsReducer(prev, event));
          break;

        case "phase":
          setCorpusRuns((prev) => ingestCorpusRunsReducer(prev, event));
          if (event.phase === "embedding") {
            setPhase("embedding");
          } else if (event.phase === "upserting") {
            setPhase("upserting");
          }
          break;

        case "complete":
          setCorpusRuns((prev) => ingestCorpusRunsReducer(prev, event));
          break;

        case "error":
          setPhase("error");
          setError(event.error);
          setCorpusRuns((prev) => ingestCorpusRunsReducer(prev, event));
          break;
      }
    }
  }, []);

  return {
    phase,
    corpusRuns,
    repos,
    totalChunks,
    elapsedMs,
    error,
    start,
    reset,
    isRunning,
  };
}

async function safeReadErrorBody(res: Response): Promise<string | null> {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = (await res.json()) as { error?: string };
      return data.error ?? null;
    }
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return null;
  }
}
