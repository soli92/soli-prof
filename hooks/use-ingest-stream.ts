"use client";

import { useCallback, useRef, useState } from "react";
import type { RepoProgress } from "@/components/admin/repo-progress-row";
import type { Phase } from "@/components/admin/phase-indicator";

type CorpusChoice = "ai_logs" | "agents_md" | "all";

// Tipi speculari agli eventi emessi dal backend
type IngestEvent =
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

export interface UseIngestStreamReturn {
  phase: Phase;
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
  const [repos, setRepos] = useState<RepoProgress[]>([]);
  const [totalChunks, setTotalChunks] = useState<number | undefined>(undefined);
  const [elapsedMs, setElapsedMs] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const isRunning =
    phase !== "idle" && phase !== "complete" && phase !== "error";

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("idle");
    setRepos([]);
    setTotalChunks(undefined);
    setElapsedMs(undefined);
    setError(null);
  }, []);

  const start = useCallback(async (corpus: CorpusChoice) => {
    // Cleanup eventuale job precedente
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("starting");
    setRepos([]);
    setTotalChunks(undefined);
    setElapsedMs(undefined);
    setError(null);

    try {
      const res = await fetch("/api/rag/ingest-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // invia cookie admin
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
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split per frame SSE (separati da \n\n)
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          processFrame(frame);
        }
      }

      // Flush eventuale frame residuo (edge: server chiude senza \n\n finale)
      if (buffer.trim()) {
        processFrame(buffer);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // Abort voluto (reset / unmount): non è un errore
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
      // Un frame SSE può avere righe data: / event: / ecc. Noi usiamo solo data:
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
          setPhase("fetching-repos");
          // Non conosciamo ancora i nomi dei repo, popoleremo su repo-start
          break;

        case "repo-start":
          setRepos((prev) => {
            // Se il repo non è nella lista, aggiungilo in stato fetching
            if (prev.some((r) => r.repo === event.repo)) {
              return prev.map((r) =>
                r.repo === event.repo ? { ...r, status: "fetching" } : r
              );
            }
            return [...prev, { repo: event.repo, status: "fetching" }];
          });
          break;

        case "repo-fetched":
          // Transiziona da fetching a chunking
          setRepos((prev) =>
            prev.map((r) =>
              r.repo === event.repo ? { ...r, status: "chunking" } : r
            )
          );
          break;

        case "repo-chunked":
          setRepos((prev) =>
            prev.map((r) =>
              r.repo === event.repo
                ? { ...r, chunks: event.chunks }
                : r
            )
          );
          break;

        case "repo-done":
          setRepos((prev) =>
            prev.map((r) =>
              r.repo === event.repo
                ? {
                    ...r,
                    status: "done",
                    chunks: event.chunks,
                    elapsedMs: event.elapsedMs,
                  }
                : r
            )
          );
          break;

        case "repo-skipped":
          setRepos((prev) => {
            if (prev.some((r) => r.repo === event.repo)) {
              return prev.map((r) =>
                r.repo === event.repo
                  ? { ...r, status: "skipped", reason: event.reason }
                  : r
              );
            }
            return [
              ...prev,
              { repo: event.repo, status: "skipped", reason: event.reason },
            ];
          });
          break;

        case "repo-error":
          setRepos((prev) => {
            if (prev.some((r) => r.repo === event.repo)) {
              return prev.map((r) =>
                r.repo === event.repo
                  ? { ...r, status: "error", error: event.error }
                  : r
              );
            }
            return [
              ...prev,
              { repo: event.repo, status: "error", error: event.error },
            ];
          });
          break;

        case "phase":
          if (event.phase === "embedding") {
            setPhase("embedding");
            if (event.totalChunks !== undefined) {
              setTotalChunks(event.totalChunks);
            }
          } else if (event.phase === "upserting") {
            setPhase("upserting");
          }
          break;

        case "complete":
          setPhase("complete");
          setTotalChunks(event.totalChunks);
          setElapsedMs(event.elapsedMs);
          break;

        case "error":
          setPhase("error");
          setError(event.error);
          break;
      }
    }
  }, []);

  return { phase, repos, totalChunks, elapsedMs, error, start, reset, isRunning };
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
