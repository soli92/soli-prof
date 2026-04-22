/**
 * Message Bubble Component
 * Displays a single chat message with role indicator
 */

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-xs px-4 py-3 rounded-lg ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}
