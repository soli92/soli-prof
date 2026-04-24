"use client";

import React from "react";

export type Phase =
  | "idle"
  | "starting"
  | "fetching-repos"
  | "embedding"
  | "upserting"
  | "complete"
  | "error";

interface Props {
  phase: Phase;
  totalChunks?: number;
  totalElapsedMs?: number;
}

const PHASE_CONFIG: Record<
  Phase,
  { emoji: string; label: string; bg: string; text: string }
> = {
  idle: { emoji: "⏸", label: "In attesa", bg: "bg-gray-100", text: "text-gray-600" },
  starting: { emoji: "🚀", label: "Avvio del job", bg: "bg-blue-50", text: "text-blue-700" },
  "fetching-repos": {
    emoji: "📥",
    label: "Scarico i repository",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  embedding: {
    emoji: "🧮",
    label: "Calcolo embeddings",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
  upserting: {
    emoji: "💾",
    label: "Salvo su Supabase",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
  },
  complete: { emoji: "✅", label: "Completato", bg: "bg-green-50", text: "text-green-700" },
  error: { emoji: "⚠️", label: "Errore", bg: "bg-red-50", text: "text-red-700" },
};

export function PhaseIndicator({ phase, totalChunks, totalElapsedMs }: Props) {
  const { emoji, label, bg, text } = PHASE_CONFIG[phase];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${bg} ${text} text-sm`}
      aria-live="polite"
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="font-medium">{label}</span>
      {phase === "complete" && (
        <span className="text-xs opacity-75">
          {totalChunks !== undefined && `${totalChunks} chunk`}
          {totalElapsedMs !== undefined && ` · ${(totalElapsedMs / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
}
