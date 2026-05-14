"use client";

import type { AssistantBlock } from "@/lib/generative-ui/types";
import { GenerativeToolMount } from "./GenerativeToolMount";

type AssistantMessageProps = {
  blocks: AssistantBlock[];
};

/**
 * Messaggio assistente strutturato: testo + tool inline (Generative UI).
 */
export function AssistantMessage({ blocks }: AssistantMessageProps) {
  return (
    <div className="flex w-full justify-start mb-4">
      <div className="relative group max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl w-full space-y-3 rounded-tl-[2px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[8px] border border-border bg-card px-3 py-2.5 text-card-foreground shadow-sm">
        {blocks.map((block, idx) => {
          if (block.type === "text") {
            if (!block.text) return null;
            return (
              <p
                key={`t-${idx}`}
                className="text-sm md:text-base leading-relaxed whitespace-pre-wrap"
              >
                {block.text}
              </p>
            );
          }
          if (block.type === "tool_use") {
            if (block.streaming) {
              return (
                <div
                  key={block.id}
                  className="animate-pulse rounded-lg border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  Carico componente…
                </div>
              );
            }
            return (
              <div key={block.id} className="w-full">
                <GenerativeToolMount name={block.name} input={block.input} />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
