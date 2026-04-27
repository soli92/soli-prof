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
    expect(() => selectChunker("Cargo.toml")).toThrow(/No chunk strategy found/);
  });

  it("listStrategies ritorna almeno la strategia markdown", () => {
    const all = listStrategies();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((s) => s.name === "markdown")).toBe(true);
  });

  it("seleziona PackageJsonChunkStrategy per package.json", () => {
    expect(selectChunker("package.json").name).toBe("package-json");
  });

  it("seleziona TsconfigChunkStrategy per tsconfig.json", () => {
    expect(selectChunker("tsconfig.json").name).toBe("tsconfig");
  });

  it("seleziona GithubWorkflowChunkStrategy per workflow", () => {
    expect(selectChunker(".github/workflows/ci.yml").name).toBe("github-workflow");
  });

  it("seleziona PrismaSchemaChunkStrategy per schema.prisma", () => {
    expect(selectChunker("prisma/schema.prisma").name).toBe("prisma-schema");
  });

  it("seleziona EnvExampleChunkStrategy per .env.example", () => {
    expect(selectChunker(".env.example").name).toBe("env-example");
  });

  it("seleziona GenericConfigChunkStrategy per vite.config.ts", () => {
    expect(selectChunker("vite.config.ts").name).toBe("generic-config");
  });

  it("listStrategies ritorna 7 strategies", () => {
    expect(listStrategies().length).toBe(7);
  });
});
