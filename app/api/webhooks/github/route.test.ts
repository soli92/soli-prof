import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Mock di ingestCorpus
vi.mock("@/lib/rag-service", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    ingestCorpus: vi.fn().mockResolvedValue({
      corpus: "ai_logs",
      totalChunks: 0,
      byRepo: {},
      durationMs: 0,
    }),
  };
});

import { POST } from "./route";
import { ingestCorpus } from "@/lib/rag-service";
import type { NextRequest } from "next/server";

const SECRET = "test-secret";

function signPayload(payload: object, secret: string = SECRET): { body: string; sig: string } {
  const body = JSON.stringify(payload);
  const sig =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return { body, sig };
}

function makeRequest(body: string, sig: string | null): NextRequest {
  return new Request("http://test/api/webhooks/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sig ? { "x-hub-signature-256": sig } : {}),
    },
    body,
  }) as NextRequest;
}

describe("POST /api/webhooks/github", () => {
  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    const fn = ingestCorpus as ReturnType<typeof vi.fn>;
    fn.mockReset();
    fn.mockResolvedValue({
      corpus: "ai_logs",
      totalChunks: 0,
      byRepo: {},
      durationMs: 0,
    });
  });

  it("rifiuta firma assente con 401", async () => {
    const { body } = signPayload({ ref: "refs/heads/main" });
    const req = makeRequest(body, null);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rifiuta firma invalida con 401", async () => {
    const { body } = signPayload({ ref: "refs/heads/main" });
    const req = makeRequest(body, "sha256=deadbeef");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ignora push su branch != main con 200", async () => {
    const payload = {
      ref: "refs/heads/develop",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AI_LOG.md"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("ignored");
    expect(ingestCorpus).not.toHaveBeenCalled();
  });

  it("ignora repo non monitorati", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "alien" }, name: "stranger" },
      commits: [{ modified: ["AI_LOG.md"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();
    expect(json.status).toBe("ignored");
    expect(ingestCorpus).not.toHaveBeenCalled();
  });

  it("triggera ai_logs ingest se AI_LOG.md modificato", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AI_LOG.md"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("completed");
    expect(json.corpora).toContain("ai_logs");
    expect(json.ingestSummary).toEqual({ total: 1, succeeded: 1, failed: 0 });

    expect(ingestCorpus).toHaveBeenCalledWith(
      "ai_logs",
      expect.objectContaining({
        targetRepos: [{ owner: "soli92", repo: "casa-mia-be", branch: "main" }],
      })
    );
  });

  it("triggera agents_md ingest se AGENTS.md modificato", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AGENTS.md"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    await POST(req);
    expect(ingestCorpus).toHaveBeenCalledWith("agents_md", expect.anything());
  });

  it("triggera repo_configs se package.json modificato", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["package.json"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    await POST(req);
    expect(ingestCorpus).toHaveBeenCalledWith("repo_configs", expect.anything());
  });

  it("triggera repo_configs se .github/workflows/X.yml modificato", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: [".github/workflows/ci.yml"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    await POST(req);
    expect(ingestCorpus).toHaveBeenCalledWith("repo_configs", expect.anything());
  });

  it("ignora se file modificati irrilevanti", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["README.md", "src/some-file.ts"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();
    expect(json.status).toBe("ignored");
    expect(ingestCorpus).not.toHaveBeenCalled();
  });

  it("triggera multipli corpora se file di tipi diversi modificati nello stesso push", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AI_LOG.md", "AGENTS.md", "package.json"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();
    expect(json.corpora).toEqual(
      expect.arrayContaining(["ai_logs", "agents_md", "repo_configs"])
    );
    expect(res.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.ingestSummary).toEqual({ total: 3, succeeded: 3, failed: 0 });
  });

  it("aspetta il completamento di ingestCorpus prima di rispondere (no fire-and-forget)", async () => {
    let resolveIngest!: (value: unknown) => void;
    const ingestPromise = new Promise((res) => {
      resolveIngest = res;
    });

    (ingestCorpus as ReturnType<typeof vi.fn>).mockImplementation(() => ingestPromise);

    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AI_LOG.md"] }],
    };
    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);

    let responseReceived = false;
    const responsePromise = POST(req).then((res) => {
      responseReceived = true;
      return res;
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(responseReceived).toBe(false);

    resolveIngest({
      corpus: "ai_logs",
      totalChunks: 5,
      byRepo: { "casa-mia-be": 5 },
      durationMs: 50,
    });

    const res = await responsePromise;
    expect(responseReceived).toBe(true);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("completed");
    expect(json.ingestSummary).toEqual({ total: 1, succeeded: 1, failed: 0 });
  });

  it("ritorna ingestSummary con failed > 0 se un corpus throws", async () => {
    const payload = {
      ref: "refs/heads/main",
      repository: { owner: { login: "soli92" }, name: "casa-mia-be" },
      commits: [{ modified: ["AI_LOG.md", "AGENTS.md"] }],
    };

    (ingestCorpus as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        corpus: "ai_logs",
        totalChunks: 5,
        byRepo: {},
        durationMs: 100,
      })
      .mockRejectedValueOnce(new Error("fetch failed"));

    const { body, sig } = signPayload(payload);
    const req = makeRequest(body, sig);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("completed");
    expect(json.ingestSummary).toEqual({ total: 2, succeeded: 1, failed: 1 });
  });
});
