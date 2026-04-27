import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listDirectoryFiles } from "./github";
import { MissingEnvError } from "./errors";

describe("listDirectoryFiles", () => {
  const prevToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (prevToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = prevToken;
    }
  });

  it("ritorna lista filtrata per estensione", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { name: "ci.yml", type: "file" },
        { name: "deploy.yaml", type: "file" },
        { name: "README.md", type: "file" },
        { name: "subdir", type: "dir" },
      ],
    });
    vi.stubGlobal("fetch", mockFetch);

    const files = await listDirectoryFiles(
      "soli92",
      "test",
      "main",
      ".github/workflows",
      [".yml", ".yaml"]
    );
    expect(files).toEqual(["ci.yml", "deploy.yaml"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/repos/soli92/test/contents/"),
      expect.any(Object)
    );
  });

  it("ritorna array vuoto su 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })
    );

    const files = await listDirectoryFiles("soli92", "test", "main", ".github/workflows", [
      ".yml",
    ]);
    expect(files).toEqual([]);
  });

  it("throw senza GITHUB_TOKEN", async () => {
    process.env.GITHUB_TOKEN = "";
    await expect(
      listDirectoryFiles("soli92", "test", "main", "x", [".y"])
    ).rejects.toThrow(MissingEnvError);
  });

  it("ritorna array vuoto se path è un file invece che directory", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: "single-file.json", type: "file" }),
      })
    );

    const files = await listDirectoryFiles("soli92", "test", "main", "single-file.json", [
      ".json",
    ]);
    expect(files).toEqual([]);
  });
});
