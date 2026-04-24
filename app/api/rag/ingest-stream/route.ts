/**
 * POST /api/rag/ingest-stream
 *
 * Versione SSE dell'endpoint ingest. Invece di bloccare e ritornare JSON,
 * streama eventi IngestProgressEvent al client man mano che il lavoro procede.
 *
 * Auth: stessa di /api/rag/ingest (x-api-key + x-admin-confirm: yes).
 *
 * Request body: { corpus: "ai_logs" | "agents_md" | "all" }
 * Response: text/event-stream con eventi "data: {...JSON...}\n\n"
 */

import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-session";
import {
  ingestCorpus,
  ingestAllCorpora,
  CORPUS_REGISTRY,
  CorpusNotFoundError,
  InvalidApiKeyError,
  RagServiceError,
  type CorpusId,
  type IngestProgressEvent,
} from "@/lib/rag-service";

export const runtime = "nodejs";
export const maxDuration = 300;

interface IngestRequest {
  corpus?: unknown;
}

function checkAuth(req: NextRequest): void {
  // Strategia 1: cookie admin session (dal browser admin panel)
  const sessionCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminSession(sessionCookie)) {
    return;
  }

  // Strategia 2: x-api-key (da client esterni, CLI, altri applicativi)
  const expected = process.env.RAG_API_KEY;
  if (!expected) {
    throw new RagServiceError(
      "Server misconfigured: RAG_API_KEY env var missing"
    );
  }
  const received = req.headers.get("x-api-key");
  if (received && received === expected) {
    return;
  }

  throw new InvalidApiKeyError();
}

function checkAdminConfirm(req: NextRequest): void {
  // Se l'utente è autenticato via cookie admin, non serve x-admin-confirm:
  // ha già superato il gate password, è nell'admin panel, l'intento è esplicito.
  const sessionCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminSession(sessionCookie)) {
    return;
  }

  // Client esterni (CLI, altri servizi) devono ancora confermare esplicitamente.
  const confirm = req.headers.get("x-admin-confirm");
  if (confirm !== "yes") {
    throw new RagServiceError(
      "Missing header x-admin-confirm: yes"
    );
  }
}

export async function POST(req: NextRequest) {
  // Auth check fuori dallo stream, così errori 401/400 sono response HTTP normali
  try {
    checkAuth(req);
    checkAdminConfirm(req);
  } catch (err) {
    if (err instanceof InvalidApiKeyError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (err instanceof RagServiceError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Auth error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: IngestRequest;
  try {
    body = (await req.json()) as IngestRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof body.corpus !== "string") {
    return new Response(
      JSON.stringify({ error: "'corpus' must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validCorpora = Object.keys(CORPUS_REGISTRY);
  const isAll = body.corpus === "all";
  if (!isAll && !validCorpora.includes(body.corpus)) {
    return new Response(
      JSON.stringify({
        error: `Unknown corpus: "${body.corpus}". Valid: ${validCorpora.join(", ")}, all.`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: IngestProgressEvent) => {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        if (isAll) {
          await ingestAllCorpora({ onProgress: emit });
        } else {
          await ingestCorpus(body.corpus as CorpusId, { onProgress: emit });
        }
        // Sentinella fine stream (oltre a "complete" che è già stato emesso)
        controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const errorEvent = {
          type: "error" as const,
          error: msg,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
