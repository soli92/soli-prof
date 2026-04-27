import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { getRAGSystemPrompt } from "@/lib/prompts";
import {
  queryMultipleCorpora,
  rerank,
  type RetrievedSource,
} from "@/lib/rag-service";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  userMessage: string;
}

/** Allineato a `queryMultipleCorpora` in lib/rag-service/query.ts */
function buildRagContextFromSources(src: RetrievedSource[]): string {
  const contextLines: string[] = [];
  if (src.length > 0) {
    contextLines.push("## Contesto recuperato\n");
  }
  for (const s of src) {
    contextLines.push(`[Repo: ${s.repo} | Section: ${s.section}]`);
    contextLines.push(s.preview);
    contextLines.push(`(Similarity: ${s.similarity.toFixed(2)})`);
    contextLines.push("");
  }
  return contextLines.join("\n");
}

function parseRagFinalTopK(): number {
  const n = parseInt(process.env.RAG_FINAL_TOP_K || "25", 10);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    // Validazione input
    if (!body.userMessage || typeof body.userMessage !== "string") {
      return NextResponse.json(
        { error: "userMessage è richiesto" },
        { status: 400 }
      );
    }

    // Preparazione messaggi per Claude
    const conversationMessages: ChatMessage[] = [
      ...(body.messages || []),
      {
        role: "user",
        content: body.userMessage,
      },
    ];

    // RAG: retrieval cross-corpus (ai_logs + agents_md + repo_configs) con RRF
    // Fallback silenzioso: se il retrieval fallisce, il tutor risponde senza contesto
    let retrievedContext = "";
    let sources: RetrievedSource[] = [];
    try {
      const ragResult = await queryMultipleCorpora(
        ["ai_logs", "agents_md", "repo_configs"],
        body.userMessage,
        25,
        25
      );

      const originalSourceCount = ragResult.sources.length;
      const finalTopK = parseRagFinalTopK();

      // Reranker: con rerank OFF o errore applica comunque slice a finalTopK.
      const rerankResult = await rerank(
        body.userMessage,
        ragResult.sources,
        finalTopK
      );

      ragResult.sources = rerankResult.sources;

      if (rerankResult.rerankApplied) {
        console.log(
          `[RAG] Reranked top-${rerankResult.sources.length} via Voyage ${rerankResult.model}`
        );
        ragResult.context = buildRagContextFromSources(rerankResult.sources);
      } else if (rerankResult.sources.length < originalSourceCount) {
        ragResult.context = buildRagContextFromSources(rerankResult.sources);
      }

      retrievedContext = ragResult.context;
      sources = ragResult.sources;
      console.log(
        `[RAG] Retrieved ${retrievedContext.length} chars of context from ${ragResult.corporaQueried.length} corpora, ${sources.length} sources`
      );
    } catch (err) {
      console.error("[RAG] Retrieval failed, continuing without context:", err);
    }

    // Streaming response con SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Invia le sources come evento speciale PRIMA del testo Anthropic
          // Il client le parserà e le rimuoverà dalla stringa visualizzata
          const sourcesPayload = JSON.stringify({ type: "sources", data: sources });
          controller.enqueue(
            encoder.encode(`__SOURCES__${sourcesPayload}__END_SOURCES__\n`)
          );

          const response = await getAnthropicClient().messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 1024,
            system: getRAGSystemPrompt(retrievedContext),
            messages: conversationMessages,
            stream: true,
          });

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // Invia chunk di testo
              controller.enqueue(
                encoder.encode(event.delta.text)
              );
            }
          }

          // Invia segnale fine stream
          controller.enqueue(
            encoder.encode("\n[DONE]")
          );
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Errore sconosciuto";
          controller.enqueue(
            encoder.encode(`\n[ERROR]: ${errorMessage}`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno del server",
      },
      { status: 500 }
    );
  }
}
