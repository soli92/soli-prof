"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { ProcessingIndicator, type ProcessingPhase } from "./processing-indicator";
import { SourceBadges, type Source } from "./source-badges";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  processingPhase?: ProcessingPhase | null;
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Ciao! Sono il tuo tutor personale per imparare AI engineering. Sono qui per aiutarti con domande pratiche, esempi di codice e percorsi di apprendimento concreti. Cosa vuoi imparare oggi?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageContent = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
    };
    const assistantId = (Date.now() + 1).toString();

    // Aggiunge user + placeholder assistant vuoto che verrà riempito dallo streaming
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        processingPhase: "searching",
      },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: userMessageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let errored = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Filtra marker del server
        let cleaned = chunk;
        let hitDone = false;
        if (cleaned.includes("[DONE]")) {
          hitDone = true;
          cleaned = cleaned.replace(/\n?\[DONE\]/g, "");
        }
        const errorMatch = cleaned.match(/\n?\[ERROR\]:\s*(.*)/);
        if (errorMatch) {
          errored = true;
          const errMsg = errorMatch[1] || "Errore sconosciuto";
          assistantContent = `Errore nella comunicazione con il tutor. Dettagli: ${errMsg}`;
          cleaned = "";
        }

        // Estrai blocco sources se presente (inviato prima del testo Anthropic)
        const sourcesMatch = cleaned.match(/__SOURCES__(.+?)__END_SOURCES__\n?/s);
        if (sourcesMatch) {
          try {
            const payload = JSON.parse(sourcesMatch[1]) as { type: string; data: Source[] };
            if (payload.type === "sources" && Array.isArray(payload.data)) {
              const parsedSources = payload.data;
              // Prima salva le sources (immediato)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: parsedSources } : m
                )
              );
              // Poi, al frame successivo, passa a "writing" per evitare flicker
              // quando searching e primo delta testo verrebbero renderizzati insieme
              if (typeof window !== "undefined") {
                window.requestAnimationFrame(() => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId && m.processingPhase === "searching"
                        ? { ...m, processingPhase: "writing" }
                        : m
                    )
                  );
                });
              }
            }
          } catch (err) {
            console.warn("Failed to parse sources block:", err);
          }
          // Rimuovi il blocco dal testo visualizzato
          cleaned = cleaned.replace(sourcesMatch[0], "");
        }

        if (cleaned) {
          assistantContent += cleaned;
        }

        // Aggiornamento in tempo reale del messaggio assistant
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: assistantContent,
                  processingPhase:
                    errored || hitDone ? null : m.processingPhase,
                }
              : m
          )
        );

        if (errored) break;
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Errore sconosciuto";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Errore nella comunicazione con il tutor. Dettagli: ${errMsg}`,
                processingPhase: null,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.processingPhase != null
            ? { ...m, processingPhase: null }
            : m
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Soli Prof</h1>
          <p className="text-sm text-gray-600">
            Il tuo tutor personale per AI engineering
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "user" ? (
                <MessageBubble role={message.role} content={message.content} />
              ) : message.content === "" ? (
                // Bubble assistant ancora vuota → mostro SOLO l'indicatore
                // Container con min-height stabile per evitare layout shift
                <div className="flex justify-start mb-4 min-h-[44px]">
                  {message.processingPhase != null && (
                    <ProcessingIndicator
                      phase={message.processingPhase}
                      visible={true}
                    />
                  )}
                </div>
              ) : (
                // Bubble assistant con contenuto
                <>
                  <MessageBubble role={message.role} content={message.content} />
                  {/* Area indicatore con height stabile: resta presente ma invisibile
                      quando processingPhase diventa null → no layout shift */}
                  <div className="flex justify-start mb-2 ml-1 min-h-[36px]">
                    {message.processingPhase != null && (
                      <ProcessingIndicator
                        phase={message.processingPhase}
                        visible={true}
                      />
                    )}
                  </div>
                  {message.role === "assistant" &&
                    message.sources &&
                    message.processingPhase == null && (
                      <div className="ml-1 -mt-2 mb-4">
                        <SourceBadges sources={message.sources} />
                      </div>
                    )}
                </>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 shadow-lg">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi la tua domanda..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "..." : "Invia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
