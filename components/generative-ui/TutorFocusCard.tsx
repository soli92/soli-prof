"use client";

import type { TutorFocusCardProps } from "@/lib/generative-ui/registry";

const DIFF_LABEL: Record<NonNullable<TutorFocusCardProps["difficulty"]>, string> = {
  beginner: "Base",
  intermediate: "Intermedio",
  advanced: "Avanzato",
};

/**
 * Card “focus” allineata ai token semantici del preset SoliDS (shadcn bridge).
 */
export function TutorFocusCard({ title, summary, difficulty, tags }: TutorFocusCardProps) {
  return (
    <article className="w-full rounded-lg border border-border bg-muted/30 p-3 text-left shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
        {difficulty ? (
          <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {DIFF_LABEL[difficulty]}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      {tags && tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tag">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
