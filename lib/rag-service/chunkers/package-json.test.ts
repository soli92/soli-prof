import { describe, it, expect, vi, afterEach } from "vitest";
import { PackageJsonChunkStrategy } from "./package-json";

describe("PackageJsonChunkStrategy", () => {
  const strategy = new PackageJsonChunkStrategy();
  const ctx = {
    repo: "test-repo",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename: "package.json",
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches solo package.json esatto", () => {
    expect(strategy.matches("package.json")).toBe(true);
    expect(strategy.matches("package-lock.json")).toBe(false);
    expect(strategy.matches("package.JSON")).toBe(false);
  });

  it("estrae sezioni separate (overview, deps, scripts)", () => {
    const pkg = JSON.stringify({
      name: "soli-prof",
      version: "1.0.0",
      dependencies: { next: "16.0.0", react: "19.0.0" },
      devDependencies: { vitest: "3.0.0" },
      scripts: { dev: "next dev" },
    });

    const chunks = strategy.chunk(pkg, ctx);
    const sections = chunks.map((c) => c.section);

    expect(sections).toContain("package.json > overview");
    expect(sections).toContain("package.json > dependencies");
    expect(sections).toContain("package.json > devDependencies");
    expect(sections).toContain("package.json > scripts");
  });

  it("ignora sezioni vuote o assenti", () => {
    const pkg = JSON.stringify({
      name: "minimal",
      version: "1.0.0",
    });
    const chunks = strategy.chunk(pkg, ctx);
    expect(chunks.length).toBe(1);
    expect(chunks[0].section).toBe("package.json > overview");
  });

  it("fallback a chunk raw se JSON malformato", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = "{ this is not json";
    const chunks = strategy.chunk(broken, ctx);
    expect(chunks.length).toBe(1);
    expect(chunks[0].section).toBe("package.json > raw");
    expect(chunks[0].content).toBe(broken);
  });

  it("popola chunkerVersion e corpusVersion", () => {
    const pkg = JSON.stringify({ name: "x", version: "1.0.0" });
    const chunks = strategy.chunk(pkg, ctx);
    expect(chunks[0].metadata.chunkerVersion).toBe("package-json-v1.0");
    expect(chunks[0].metadata.corpusVersion).toBe("v1");
  });
});
