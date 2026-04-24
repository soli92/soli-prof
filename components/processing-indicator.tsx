"use client";

import React from "react";

export type ProcessingPhase = "searching" | "writing";

interface ProcessingIndicatorProps {
  phase: ProcessingPhase;
  visible?: boolean;
}

const PHASE_CONFIG: Record<ProcessingPhase, { emoji: string; text: string }> = {
  searching: { emoji: "🔍", text: "Cerco nei tuoi progetti" },
  writing: { emoji: "✍️", text: "Scrivo la risposta" },
};

export function ProcessingIndicator({
  phase,
  visible = true,
}: ProcessingIndicatorProps) {
  const { emoji, text } = PHASE_CONFIG[phase];

  return (
    <div
      className="inline-flex items-center transition-opacity duration-100 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      aria-live="polite"
      role="status"
    >
      <div
        className="
          inline-flex items-center gap-2 px-3 py-2 rounded-lg
          bg-gray-100 text-gray-700
          text-sm
          min-h-[36px]
        "
      >
        <span aria-hidden="true">{emoji}</span>
        <span>{text}</span>
        <span className="inline-flex gap-0.5 ml-1" aria-hidden="true">
          <span className="dot-1 w-1 h-1 rounded-full bg-gray-500" />
          <span className="dot-2 w-1 h-1 rounded-full bg-gray-500" />
          <span className="dot-3 w-1 h-1 rounded-full bg-gray-500" />
        </span>
      </div>
      <style>{`
        .dot-1, .dot-2, .dot-3 {
          animation: dot-bounce 1.2s infinite ease-in-out;
        }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }
        @keyframes dot-bounce {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%          { opacity: 1;    transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
