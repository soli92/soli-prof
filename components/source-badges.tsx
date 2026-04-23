"use client";

import React, { useState } from "react";

export interface Source {
  repo: string;
  section: string;
  similarity: number;
  preview: string;
  commitHash?: string;
}

interface Props {
  sources: Source[];
}

const REPO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "soli-agent":      { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  "casa-mia-be":     { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200" },
  "casa-mia-fe":     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "bachelor-party-claudiano": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "solids":          { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "soli-prof":       { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
};
const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

function deduplicate(sources: Source[]): Array<Source & { count: number }> {
  const map = new Map<string, Source & { count: number }>();
  for (const s of sources) {
    const key = `${s.repo}::${s.section}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.similarity = Math.max(existing.similarity, s.similarity);
    } else {
      map.set(key, { ...s, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.similarity - a.similarity);
}

function sectionToAnchor(section: string): string {
  return section
    .toLowerCase()
    .replace(/[>→]/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildLink(source: Source): string {
  const owner = "soli92";
  if (source.commitHash) {
    return `https://github.com/${owner}/${source.repo}/commit/${source.commitHash}`;
  }
  const anchor = sectionToAnchor(source.section);
  return `https://github.com/${owner}/${source.repo}/blob/main/AI_LOG.md${anchor ? "#" + anchor : ""}`;
}

function shortSection(section: string): string {
  const parts = section.split(">").map((s) => s.trim());
  const last = parts[parts.length - 1];
  return last.length > 35 ? last.slice(0, 32) + "…" : last;
}

export function SourceBadges({ sources }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const filtered = sources.filter((s) => s.similarity >= 0.2);
  if (filtered.length === 0) return null;

  const deduped = deduplicate(filtered);
  const visible = expanded ? deduped : deduped.slice(0, 6);
  const hidden = deduped.length - visible.length;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500">
          📚 Fonti ({deduped.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((source) => {
          const colors = REPO_COLORS[source.repo] ?? DEFAULT_COLOR;
          const isStrong = source.similarity >= 0.35;
          const key = `${source.repo}::${source.section}`;
          return (
            <a
              key={key}
              href={buildLink(source)}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "group relative inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                "border transition-all",
                colors.bg,
                colors.text,
                colors.border,
                isStrong ? "font-medium" : "opacity-75",
                "hover:shadow-sm hover:opacity-100",
              ].join(" ")}
            >
              <span className="font-mono">{source.repo}</span>
              <span className="opacity-50">·</span>
              <span>{shortSection(source.section)}</span>
              {source.count > 1 && (
                <span className="ml-1 px-1 rounded bg-white/60 text-[10px]">
                  ×{source.count}
                </span>
              )}
              {source.commitHash && (
                <span className="ml-1 font-mono text-[10px] opacity-60">
                  {source.commitHash.slice(0, 7)}
                </span>
              )}

              {/* Tooltip CSS-only: group-hover + opacity transition + delay per evitare flicker */}
              {source.preview && (
                <div
                  className={[
                    "absolute z-10 top-full mt-1 left-0",
                    "w-80 p-3 rounded-lg shadow-lg bg-white border border-gray-200",
                    "text-gray-700 font-normal pointer-events-none",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-150 delay-300 group-hover:delay-0",
                  ].join(" ")}
                >
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                    Similarity {source.similarity.toFixed(2)}
                  </div>
                  <div className="text-xs leading-relaxed">
                    {source.preview}...
                  </div>
                </div>
              )}
            </a>
          );
        })}
        {hidden > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            + altre {hidden}
          </button>
        )}
      </div>
    </div>
  );
}
