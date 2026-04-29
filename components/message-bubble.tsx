"use client";

import React, { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`
          relative group
          max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-3 py-2.5
          ${isUser
            ? "bg-blue-600 text-white rounded-tl-[8px] rounded-tr-[8px] rounded-bl-[8px] rounded-br-[2px]"
            : "bg-gray-200 text-gray-900 rounded-tl-[2px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[8px]"}
        `}
      >
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {content}
        </p>

        {!isUser && content && content.trim() !== "" && (
          <button
            onClick={handleCopy}
            className={`
              absolute top-1.5 right-1.5
              inline-flex items-center gap-1 px-1.5 py-0.5 rounded
              text-[10px] font-medium
              bg-white/70 hover:bg-white/90 text-gray-600 hover:text-gray-900
              border border-gray-300
              opacity-0 group-hover:opacity-100
              transition-opacity duration-150
              cursor-pointer
            `}
            title={copied ? "Copiato!" : "Copia messaggio"}
            type="button"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Copiato</span>
              </>
            ) : (
              <span>📋</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
