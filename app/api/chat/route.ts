import { NextRequest, NextResponse } from "next/server";
import { anthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import { getRAGSystemPrompt } from "@/lib/prompts";
import { queryCorpus, type RetrievedSource } from "@/lib/rag-service";

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

    // RAG: retrieval contesto dagli AI_LOG indicizzati
    // Fallback silenzioso: se il retrieval fallisce, il tutor risponde senza contesto
    let retrievedContext = "";
    let sources: RetrievedSource[] = [];
    try {
      const ragResult = await queryCorpus("ai_logs", body.userMessage, 25);
      retrievedContext = ragResult.context;
      sources = ragResult.sources;
      console.log(`[RAG] Retrieved ${retrievedContext.length} chars of context, ${sources.length} sources`);
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

          const response = await anthropic.messages.create({
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
