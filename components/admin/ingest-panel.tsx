"use client";

import React from "react";
import { useIngestStream } from "@/hooks/use-ingest-stream";
import { RepoProgressRow } from "./repo-progress-row";
import { PhaseIndicator } from "./phase-indicator";

type CorpusChoice = "ai_logs" | "agents_md" | "all";

interface CorpusButton {
  id: CorpusChoice;
  label: string;
  description: string;
  emoji: string;
}

const CORPUS_BUTTONS: CorpusButton[] = [
  {
    id: "ai_logs",
    label: "Re-ingest AI_LOG",
    description:
      "Indicizza solo i file AI_LOG.md (decisioni, lezioni, pattern storici).",
    emoji: "📜",
  },
  {
    id: "agents_md",
    label: "Re-ingest AGENTS.md",
    description:
      "Indicizza solo i file AGENTS.md (convenzioni di codice, setup per agenti).",
    emoji: "🤖",
  },
  {
    id: "all",
    label: "Re-ingest Tutto",
    description:
      "Indicizza entrambi i corpus. Usa questo dopo aggiornamenti multipli.",
    emoji: "🔁",
  },
];

export function IngestPanel() {
  const {
    phase,
    repos,
    totalChunks,
    elapsedMs,
    error,
    start,
    reset,
    isRunning,
  } = useIngestStream();

  const [selectedCorpus, setSelectedCorpus] = React.useState<CorpusChoice | null>(null);

  const handleCorpusClick = (corpus: CorpusChoice) => {
    if (isRunning) return;
    setSelectedCorpus(corpus);
    void start(corpus);
  };

  const handleReset = () => {
    setSelectedCorpus(null);
    reset();
  };

  const totalChunksDone = repos
    .filter((r) => r.status === "done")
    .reduce((sum, r) => sum + (r.chunks ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Bottoni corpus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CORPUS_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => handleCorpusClick(btn.id)}
            disabled={isRunning}
            className={`
              text-left p-4 rounded-lg border transition-all
              ${
                selectedCorpus === btn.id
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {btn.emoji}
              </span>
              <div>
                <div className="font-medium text-gray-900 text-sm">
                  {btn.label}
                </div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">
                  {btn.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Stato job corrente */}
      {phase !== "idle" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <PhaseIndicator
              phase={phase}
              totalChunks={phase === "complete" ? totalChunks : undefined}
              totalElapsedMs={phase === "complete" ? elapsedMs : undefined}
            />
            {(phase === "complete" || phase === "error") && (
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Nuovo job
              </button>
            )}
          </div>

          {/* Errore globale */}
          {phase === "error" && error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              <div className="font-medium mb-1">
                {"Errore durante l'ingest"}
              </div>
              <div className="text-xs">{error}</div>
            </div>
          )}

          {/* Lista repo */}
          {repos.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">
                  Repository ({repos.length})
                </h3>
              </div>
              <div>
                {repos.map((r) => (
                  <RepoProgressRow key={r.repo} progress={r} />
                ))}
              </div>
            </div>
          )}

          {/* Placeholder iniziale prima del primo repo-start */}
          {repos.length === 0 && isRunning && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded p-4">
              Preparazione job…
            </div>
          )}

          {/* Summary durante running */}
          {isRunning && repos.length > 0 && (
            <div className="text-xs text-gray-500">
              {repos.filter((r) => r.status === "done").length} di{" "}
              {repos.length} completati
              {totalChunksDone > 0 && ` · ${totalChunksDone} chunk finora`}
            </div>
          )}
        </div>
      )}

      {phase === "idle" && (
        <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded p-4">
          {"Seleziona un'opzione sopra per avviare il re-ingest."}
        </div>
      )}
    </div>
  );
}
