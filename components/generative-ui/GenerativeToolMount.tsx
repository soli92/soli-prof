"use client";

import {
  isRenderTool,
  parseRenderToolInput,
  SHOW_TUTOR_FOCUS_CARD,
} from "@/lib/generative-ui/registry";
import { TutorFocusCard } from "./TutorFocusCard";

type ToolRenderProps = {
  name: string;
  input: unknown;
};

/**
 * Risolve un tool_use verso il componente registrato; parse fallito → fallback discreto.
 */
export function GenerativeToolMount({ name, input }: ToolRenderProps) {
  if (!isRenderTool(name)) {
    return <ToolFallback />;
  }

  const props = parseRenderToolInput(name, input);
  if (!props) {
    console.error("[GenerativeUI] parse failed for tool:", name, input);
    return <ToolFallback />;
  }

  if (name === SHOW_TUTOR_FOCUS_CARD) {
    return <TutorFocusCard {...props} />;
  }

  return <ToolFallback />;
}

function ToolFallback() {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
      Componente non disponibile
    </span>
  );
}
