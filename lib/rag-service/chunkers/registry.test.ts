import { describe, it, expect } from "vitest";
import { selectChunker, listStrategies } from "./registry";

describe("chunker registry", () => {
  it("seleziona MarkdownChunkStrategy per file .md", () => {
    const strategy = selectChunker("AI_LOG.md");
    expect(strategy.name).toBe("markdown");
  });

  it("seleziona MarkdownChunkStrategy per file .markdown", () => {
    const strategy = selectChunker("README.markdown");
    expect(strategy.name).toBe("markdown");
  });

  it("throws su filename non gestito", () => {
    expect(() => selectChunker("package.json")).toThrow(/No chunk strategy found/);
  });

  it("listStrategies ritorna almeno la strategia markdown", () => {
    const all = listStrategies();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((s) => s.name === "markdown")).toBe(true);
  });
});
