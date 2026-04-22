"use client";

/**
 * Chat View Component
 * Main interface for the tutor chatbot
 */

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ciao! Sono il tuo tutor personale per AI engineering. Che cosa vuoi imparare oggi?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantMessage = "";

      // Read SSE stream
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const chunk = JSON.parse(data);
              if (chunk.content) {
                assistantMessage += chunk.content;
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMessage || "Scusa, non ho potuto processare la tua richiesta.",
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Scusa, c'è stato un errore. Riprovare più tardi.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sd-flex sd-flex-col sd-h-screen sd-bg-canvas">
      {/* Header */}
      <div className="sd-bg-surface sd-border-b sd-border-border-default sd-p-lg sd-shadow-sm">
        <h1 className="sd-text-2xl sd-font-bold sd-text-primary">
          Soli Prof
        </h1>
        <p className="sd-text-secondary sd-text-sm">
          Il tuo tutor personale per AI engineering
        </p>
      </div>

      {/* Messages Container */}
      <div className="sd-flex-1 sd-overflow-y-auto sd-p-lg sd-space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="sd-border-t sd-border-border-default sd-bg-surface sd-p-lg"
      >
        <div className="sd-flex sd-gap-md">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Scrivi la tua domanda..."
            className="sd-flex-1 sd-px-md sd-py-sm sd-rounded-md sd-border sd-border-border-default sd-bg-canvas sd-text-primary placeholder:sd-text-tertiary focus:sd-outline-none focus:sd-ring-2 focus:sd-ring-primary disabled:sd-opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="sd-px-lg sd-py-sm sd-rounded-md sd-bg-primary sd-text-white sd-font-semibold hover:sd-bg-primary-hover active:sd-bg-primary-active disabled:sd-opacity-50 disabled:sd-cursor-not-allowed transition-colors"
          >
            {isLoading ? "..." : "Invia"}
          </button>
        </div>
      </form>
    </div>
  );
}
