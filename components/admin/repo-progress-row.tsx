"use client";

import React from "react";

export type RepoStatus =
  | "pending"
  | "fetching"
  | "chunking"
  | "done"
  | "skipped"
  | "error";

export interface RepoProgress {
  repo: string;
  status: RepoStatus;
  chunks?: number;
  elapsedMs?: number;
  reason?: string; // per skipped
  error?: string; // per error
}

interface Props {
  progress: RepoProgress;
}

const STATUS_CONFIG: Record<
  RepoStatus,
  { icon: string; color: string; label: string; animated: boolean }
> = {
  pending: { icon: "○", color: "text-gray-400", label: "In attesa", animated: false },
  fetching: { icon: "⟳", color: "text-blue-500", label: "Download", animated: true },
  chunking: { icon: "⟳", color: "text-blue-500", label: "Chunking", animated: true },
  done: { icon: "✓", color: "text-green-600", label: "Completato", animated: false },
  skipped: { icon: "⊘", color: "text-gray-400", label: "Saltato", animated: false },
  error: { icon: "✗", color: "text-red-600", label: "Errore", animated: false },
};

export function RepoProgressRow({ progress }: Props) {
  const { icon, color, label, animated } = STATUS_CONFIG[progress.status];

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
      <span
        className={`text-lg w-6 flex-shrink-0 ${color} ${
          animated ? "animate-spin" : ""
        }`}
        aria-label={label}
      >
        {icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-900 truncate">
            {progress.repo}
          </span>
          {progress.status === "done" && progress.chunks !== undefined && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {progress.chunks} chunk
              {progress.elapsedMs !== undefined &&
                ` · ${formatElapsed(progress.elapsedMs)}`}
            </span>
          )}
          {progress.status === "fetching" && (
            <span className="text-xs text-blue-500">scaricando AI_LOG…</span>
          )}
          {progress.status === "chunking" && progress.chunks !== undefined && (
            <span className="text-xs text-blue-500">
              {progress.chunks} chunk preparati
            </span>
          )}
        </div>

        {progress.status === "skipped" && progress.reason && (
          <div className="text-xs text-gray-400 mt-0.5">{progress.reason}</div>
        )}
        {progress.status === "error" && progress.error && (
          <div className="text-xs text-red-600 mt-0.5 truncate">
            {progress.error}
          </div>
        )}
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
