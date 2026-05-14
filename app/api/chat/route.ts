import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { getRAGSystemPrompt } from "@/lib/prompts";
import {
  queryMultipleCorpora,
  rerank,
  type RetrievedSource,
} from "@/lib/rag-service";
import { getAnthropicTools } from "@/lib/generative-ui/registry";
import { buildAnthropicMessages } from "@/lib/generative-ui/to-anthropic-messages";
import { encodeStreamLine } from "@/lib/generative-ui/stream-protocol";
import { parseClientChatMessages } from "@/lib/generative-ui/validate-client-messages";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequest {
  messages: unknown;
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

/** Estrae index da eventi stream Anthropic (shape runtime SDK). */
function readStreamIndex(ev: { index?: number }): number {
  return typeof ev.index === "number" ? ev.index : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.userMessage || typeof body.userMessage !== "string") {
      return NextResponse.json(
        { error: "userMessage è richiesto" },
        { status: 400 }
      );
    }

    const parsedHistory = parseClientChatMessages(body.messages ?? []);
    if (parsedHistory === null) {
      return NextResponse.json(
        { error: "Formato messages non valido" },
        { status: 400 }
      );
    }

    const conversationMessages = buildAnthropicMessages(
      parsedHistory,
      body.userMessage
    );

    let retrievedContext = "";
    let sources: RetrievedSource[] = [];
    try {
      const hybridEnabled = process.env.RAG_HYBRID_ENABLED === "true";
      const mode = hybridEnabled ? "hybrid" : "semantic";
      if (hybridEnabled) {
        console.log("[RAG] Hybrid search ENABLED (semantic + BM25)");
      }

      const ragResult = await queryMultipleCorpora(
        ["ai_logs", "agents_md", "repo_configs"],
        body.userMessage,
        25,
        25,
        undefined,
        mode
      );

      const originalSourceCount = ragResult.sources.length;
      const finalTopK = parseRagFinalTopK();

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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sourcesPayload = JSON.stringify({ type: "sources", data: sources });
          controller.enqueue(
            encoder.encode(`__SOURCES__${sourcesPayload}__END_SOURCES__\n`)
          );

          const response = await getAnthropicClient().messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 1024,
            system: getRAGSystemPrompt(retrievedContext),
            messages: conversationMessages,
            tools: getAnthropicTools(),
            stream: true,
          });

          /** Traccia il tipo di blocco per indice (evita tend sui blocchi testo). */
          const blockKindByIndex = new Map<number, "text" | "tool">();

          for await (const event of response) {
            if (!event || typeof event !== "object") continue;
            const ev = event as {
              type?: string;
              index?: number;
              delta?: {
                type?: string;
                text?: string;
                partial_json?: string;
              };
              content_block?: {
                type?: string;
                id?: string;
                name?: string;
              };
            };

            switch (ev.type) {
              case "content_block_start": {
                const idx = readStreamIndex(ev);
                const cb = ev.content_block;
                if (cb?.type === "text") {
                  blockKindByIndex.set(idx, "text");
                } else if (cb?.type === "tool_use" && cb.id && cb.name) {
                  blockKindByIndex.set(idx, "tool");
                  controller.enqueue(
                    encoder.encode(
                      encodeStreamLine({
                        v: 1,
                        k: "tbeg",
                        i: idx,
                        id: cb.id,
                        name: cb.name,
                      })
                    )
                  );
                }
                break;
              }
              case "content_block_delta": {
                const idx = readStreamIndex(ev);
                const d = ev.delta;
                if (!d) break;
                if (d.type === "text_delta" && typeof d.text === "string") {
                  controller.enqueue(
                    encoder.encode(
                      encodeStreamLine({ v: 1, k: "text", i: idx, d: d.text })
                    )
                  );
                } else if (
                  d.type === "input_json_delta" &&
                  typeof d.partial_json === "string"
                ) {
                  controller.enqueue(
                    encoder.encode(
                      encodeStreamLine({ v: 1, k: "tjson", i: idx, p: d.partial_json })
                    )
                  );
                }
                break;
              }
              case "content_block_stop": {
                const idx = readStreamIndex(ev);
                if (blockKindByIndex.get(idx) === "tool") {
                  controller.enqueue(
                    encoder.encode(encodeStreamLine({ v: 1, k: "tend", i: idx }))
                  );
                }
                break;
              }
              default:
                break;
            }
          }

          controller.enqueue(encoder.encode(encodeStreamLine({ v: 1, k: "done" })));
          controller.enqueue(encoder.encode("\n[DONE]"));
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
