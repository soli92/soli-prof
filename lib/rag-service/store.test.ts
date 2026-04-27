import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { persistSession: false, autoRefreshToken: false },
    rpc: mockRpc,
  }),
}));

import { searchSimilarText } from "./store";
import { CURRENT_CORPUS_VERSION } from "./config";

describe("searchSimilarText", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("chiama RPC match_rag_ai_logs_text con argomenti corretti", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: "1",
          repo: "r1",
          section: "s1",
          content: "c1",
          metadata: {},
          similarity: 0.15,
        },
      ],
      error: null,
    });

    const result = await searchSimilarText("ai_logs", "CORS", 5);

    expect(result.length).toBe(1);
    expect(result[0].repo).toBe("r1");
    expect(mockRpc).toHaveBeenCalledWith(
      "match_rag_ai_logs_text",
      expect.objectContaining({
        query_text: "CORS",
        match_count: 5,
        target_corpus_version: CURRENT_CORPUS_VERSION,
      })
    );
  });

  it("throw se RPC ritorna error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "table does not exist" },
    });

    await expect(searchSimilarText("ai_logs", "CORS", 5)).rejects.toThrow(
      /table does not exist/
    );
  });

  it("throw se RPC ritorna non-array", async () => {
    mockRpc.mockResolvedValue({
      data: "not an array",
      error: null,
    });

    await expect(searchSimilarText("ai_logs", "CORS", 5)).rejects.toThrow(/non-array/);
  });
});
