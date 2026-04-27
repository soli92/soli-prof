import type { RetrievedSource } from "./types";

const VOYAGE_RERANK_ENDPOINT = "https://api.voyageai.com/v1/rerank";
const DEFAULT_MODEL = "rerank-2-lite";

export interface RerankResult {
  sources: RetrievedSource[];
  rerankApplied: boolean;
  model?: string;
}

/**
 * Rerank di una lista di sources usando Voyage rerank API.
 * Cross-encoder che valuta query+document insieme.
 *
 * Comportamento:
 * - Se VOYAGE_RERANK_ENABLED=false (o assente): NO-OP rerank, ritorna
 *   `sources.slice(0, topK ?? sources.length)` con rerankApplied=false.
 * - Se VOYAGE_API_KEY assente (con rerank abilitato): stesso slice, warning.
 * - Se chiamata API fallisce: stesso slice, warning.
 * - Successo: ritorna sources riordinati per relevance_score, poi slice top-K.
 *
 * Il caller (es. route chat) passa topK da RAG_FINAL_TOP_K per uniformare
 * lunghezza finale con rerank ON o OFF.
 *
 * @param query testo della query utente
 * @param sources lista candidati da rerankare
 * @param topK numero massimo di sources in output (default = sources.length)
 */
export async function rerank(
  query: string,
  sources: RetrievedSource[],
  topK?: number
): Promise<RerankResult> {
  const enabled = process.env.VOYAGE_RERANK_ENABLED === "true";
  const k = topK ?? sources.length;

  if (!enabled) {
    return { sources: sources.slice(0, k), rerankApplied: false };
  }

  if (sources.length === 0) {
    return { sources: [], rerankApplied: false };
  }

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.warn(
      "[reranker] VOYAGE_RERANK_ENABLED=true but VOYAGE_API_KEY is missing. Skipping rerank."
    );
    return { sources: sources.slice(0, k), rerankApplied: false };
  }

  const model = process.env.VOYAGE_RERANK_MODEL || DEFAULT_MODEL;

  const documents = sources.map(
    (s) => `[${s.repo}] ${s.section}\n${s.preview ?? ""}`
  );

  try {
    const res = await fetch(VOYAGE_RERANK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        documents,
        model,
        top_k: k,
        return_documents: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[reranker] Voyage rerank HTTP ${res.status}: ${body.slice(0, 200)}. Skipping rerank.`
      );
      return { sources: sources.slice(0, k), rerankApplied: false };
    }

    const data = (await res.json()) as {
      data: Array<{ index: number; relevance_score: number }>;
    };

    if (!data.data || !Array.isArray(data.data)) {
      console.warn(
        "[reranker] Voyage rerank response missing 'data' array. Skipping rerank."
      );
      return { sources: sources.slice(0, k), rerankApplied: false };
    }

    const reranked = data.data
      .map((item) => sources[item.index])
      .filter(Boolean);

    return {
      sources: reranked.slice(0, k),
      rerankApplied: true,
      model,
    };
  } catch (err) {
    console.warn("[reranker] Voyage rerank fetch failed:", err);
    return { sources: sources.slice(0, k), rerankApplied: false };
  }
}
