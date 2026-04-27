import { describe, it, expect, vi, afterEach } from "vitest";
import { TsconfigChunkStrategy } from "./tsconfig";

describe("TsconfigChunkStrategy", () => {
  const strategy = new TsconfigChunkStrategy();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ctx = (filename: string) => ({
    repo: "soli-prof",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename,
  });

  it("matches tsconfig.json e tsconfig.build.json", () => {
    expect(strategy.matches("tsconfig.json")).toBe(true);
    expect(strategy.matches("packages/lib/tsconfig.build.json")).toBe(true);
    expect(strategy.matches("jsconfig.json")).toBe(false);
  });

  it("estrae compilerOptions e include da tsconfig reale", () => {
    const raw = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`;

    const chunks = strategy.chunk(raw, ctx("tsconfig.json"));
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain("tsconfig.json > compilerOptions");
    expect(sections).toContain("tsconfig.json > include");
    expect(sections).toContain("tsconfig.json > exclude");
  });

  it("gestisce commenti JSONC", () => {
    const raw = `{
  // path aliases
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["src"]
}`;
    const chunks = strategy.chunk(raw, ctx("tsconfig.json"));
    expect(chunks.some((c) => c.section === "tsconfig.json > compilerOptions")).toBe(true);
  });

  it("fallback a chunk raw se JSON malformato dopo strip", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = "{ not json";
    const chunks = strategy.chunk(broken, ctx("tsconfig.json"));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("tsconfig.json > raw");
  });
});
