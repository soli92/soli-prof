import { describe, it, expect, vi, afterEach } from "vitest";
import { GithubWorkflowChunkStrategy } from "./github-workflow";

describe("GithubWorkflowChunkStrategy", () => {
  const strategy = new GithubWorkflowChunkStrategy();
  const ctx = {
    repo: "soli-prof",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename: ".github/workflows/ci.yml",
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sample = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
`;

  it("matches solo workflow sotto .github/workflows con yml o yaml", () => {
    expect(strategy.matches(".github/workflows/ci.yml")).toBe(true);
    expect(strategy.matches(".github/workflows/release.yaml")).toBe(true);
    expect(strategy.matches("workflows/ci.yml")).toBe(false);
    expect(strategy.matches(".github/workflows/readme.md")).toBe(false);
  });

  it("estrae chunk metadata + jobs.test + jobs.lint", () => {
    const chunks = strategy.chunk(sample, ctx);
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain(".github/workflows/ci.yml > metadata");
    expect(sections).toContain(".github/workflows/ci.yml > jobs.test");
    expect(sections).toContain(".github/workflows/ci.yml > jobs.lint");
    expect(chunks).toHaveLength(3);
  });

  it("fallback se YAML malformato", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const chunks = strategy.chunk("::: not yaml", ctx);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe(".github/workflows/ci.yml > raw");
  });

  it("popola chunkerVersion e corpusVersion", () => {
    const chunks = strategy.chunk(sample, ctx);
    expect(chunks[0].metadata.chunkerVersion).toBe("github-workflow-v1.0");
    expect(chunks[0].metadata.corpusVersion).toBe("v1");
  });
});
