/**
 * POST /api/rag/query
 *
 * Endpoint pubblico per similarity search su un corpus.
 * Protetto da header x-api-key. Usato da Soli Prof stesso e (prossimamente)
 * da Soli Agent via tool search_knowledge.
 *
 * Request body:
 *   {
 *     corpus: "ai_logs" | "agents_md",
 *     query: string,
 *     topK?: number (default 15, max 30)
 *   }
 *
 * Response 200:
 *   {
 *     corpus: string,
 *     context: string,
 *     sources: Array<{ repo, section, similarity, preview, commitHash? }>
 *   }
 *
 * Errori: 401 invalid key, 400 payload invalido, 404 corpus sconosciuto, 500 generic.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  queryCorpus,
  CORPUS_REGISTRY,
  CorpusNotFoundError,
  InvalidApiKeyError,
  RagServiceError,
  type CorpusId,
} from "@/lib/rag-service";

export const runtime = "nodejs";
export const maxDuration = 30;

interface QueryRequest {
  corpus?: unknown;
  query?: unknown;
  topK?: unknown;
}

function checkApiKey(req: NextRequest): void {
  const expected = process.env.RAG_API_KEY;
  if (!expected) {
    throw new RagServiceError(
      "Server misconfigured: RAG_API_KEY env var missing"
    );
  }
  const received = req.headers.get("x-api-key");
  if (!received || received !== expected) {
    throw new InvalidApiKeyError();
  }
}

function parseBody(body: QueryRequest): {
  corpus: CorpusId;
  query: string;
  topK?: number;
} {
  if (typeof body.query !== "string" || body.query.trim() === "") {
    throw new RagServiceError("'query' must be a non-empty string");
  }
  if (typeof body.corpus !== "string") {
    throw new RagServiceError("'corpus' must be a string");
  }
  const validCorpora = Object.keys(CORPUS_REGISTRY);
  if (!validCorpora.includes(body.corpus)) {
    throw new CorpusNotFoundError(body.corpus);
  }
  const topK =
    typeof body.topK === "number" && Number.isFinite(body.topK)
      ? body.topK
      : undefined;
  return {
    corpus: body.corpus as CorpusId,
    query: body.query,
    topK,
  };
}

export async function POST(req: NextRequest) {
  try {
    checkApiKey(req);

    const body = (await req.json()) as QueryRequest;
    const { corpus, query, topK } = parseBody(body);

    const result = await queryCorpus(corpus, query, topK);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof InvalidApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof CorpusNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof RagServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[rag/query] unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
