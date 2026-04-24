/**
 * POST /api/rag/ingest
 *
 * Triggera l'indicizzazione di un corpus. Protetto da:
 *  - x-api-key (stessa di /query)
 *  - x-admin-confirm: yes (guardrail anti-incidente, non sicurezza vera)
 *
 * Request body: { corpus: "ai_logs" | "agents_md" | "all" }
 * Response 200: { reports: IngestReport[] }
 *
 * Operazione sincrona: blocca la request finché l'ingest finisce.
 * Per corpus grandi potrebbe durare 10-60 secondi.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ingestCorpus,
  ingestAllCorpora,
  CORPUS_REGISTRY,
  CorpusNotFoundError,
  InvalidApiKeyError,
  RagServiceError,
  type CorpusId,
} from "@/lib/rag-service";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max — Vercel pro serve per durate lunghe

interface IngestRequest {
  corpus?: unknown;
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

function checkAdminConfirm(req: NextRequest): void {
  const confirm = req.headers.get("x-admin-confirm");
  if (confirm !== "yes") {
    throw new RagServiceError(
      "Missing header x-admin-confirm: yes — this endpoint requires explicit admin confirmation"
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    checkApiKey(req);
    checkAdminConfirm(req);

    const body = (await req.json()) as IngestRequest;

    if (typeof body.corpus !== "string") {
      throw new RagServiceError("'corpus' must be a string");
    }

    if (body.corpus === "all") {
      const reports = await ingestAllCorpora();
      return NextResponse.json({ reports }, { status: 200 });
    }

    const validCorpora = Object.keys(CORPUS_REGISTRY);
    if (!validCorpora.includes(body.corpus)) {
      throw new CorpusNotFoundError(body.corpus);
    }

    const report = await ingestCorpus(body.corpus as CorpusId);
    return NextResponse.json({ reports: [report] }, { status: 200 });
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
    console.error("[rag/ingest] unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
