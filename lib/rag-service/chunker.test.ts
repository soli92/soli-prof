import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "./chunker";

const meta = {
  repo: "demo-repo",
  owner: "soli92",
  branch: "main",
  indexedAt: "2026-04-24T12:00:00.000Z",
};

describe("chunkMarkdown", () => {
  it("returns [] for empty or whitespace-only markdown", () => {
    expect(chunkMarkdown("", meta)).toEqual([]);
    expect(chunkMarkdown("   \n\t", meta)).toEqual([]);
  });

  it("labels leading body as Intro before any heading", () => {
    const chunks = chunkMarkdown("Hello\n\nworld", meta);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("Intro");
    expect(chunks[0].content).toContain("Hello");
    expect(chunks[0].repo).toBe("demo-repo");
  });

  it("starts a new chunk at ## and uses h2 title as section", () => {
    const md = "## Sezione A\nContenuto A.\n## Sezione B\nContenuto B.";
    const chunks = chunkMarkdown(md, meta);
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain("Sezione A");
    expect(sections).toContain("Sezione B");
    expect(chunks.find((c) => c.section === "Sezione A")?.content).toContain("Contenuto A");
  });

  it("nests ### under ## in section path", () => {
    const md = "## Padre\n### Figlio\ntesto";
    const chunks = chunkMarkdown(md, meta);
    const child = chunks.find((c) => c.section.includes("Figlio"));
    expect(child).toBeDefined();
    expect(child!.section).toMatch(/Padre/);
    expect(child!.section).toMatch(/Figlio/);
    expect(child!.content).toContain("testo");
  });

  it("copies chunker metadata into chunk.metadata", () => {
    const [c] = chunkMarkdown("## S\nx", meta);
    expect(c.metadata).toMatchObject({
      repo: "demo-repo",
      owner: "soli92",
      branch: "main",
      indexedAt: meta.indexedAt,
    });
  });

  it("splits oversized sections using maxChars and paragraph boundaries", () => {
    const block = "word ".repeat(40).trim();
    const md = `## Big\n${block}\n\n${block}`;
    const chunks = chunkMarkdown(md, meta, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.section === "Big")).toBe(true);
  });

  it("produces stable ids for same repo, section, and content", () => {
    const md = "## A\nbody";
    const a = chunkMarkdown(md, meta);
    const b = chunkMarkdown(md, meta);
    expect(a[0].id).toBe(b[0].id);
  });
});
