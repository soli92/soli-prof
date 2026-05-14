import type { AssistantBlock, ClientChatMessage } from "./types";
import { isRenderTool } from "./registry";

function isAssistantBlock(raw: unknown): raw is AssistantBlock {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as { type?: unknown };
  if (o.type === "text") {
    return typeof (raw as { text?: unknown }).text === "string";
  }
  if (o.type === "tool_use") {
    const t = raw as { id?: unknown; name?: unknown; input?: unknown; streaming?: unknown };
    return (
      typeof t.id === "string" &&
      typeof t.name === "string" &&
      (t.streaming === undefined || typeof t.streaming === "boolean")
    );
  }
  return false;
}

/**
 * Valida il payload `messages` dal client (cronologia prima del nuovo userMessage).
 */
export function parseClientChatMessages(raw: unknown): ClientChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ClientChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    if (role === "user") {
      const content = (item as { content?: unknown }).content;
      if (typeof content !== "string") return null;
      out.push({ role: "user", content });
      continue;
    }
    if (role === "assistant") {
      const blocksRaw = (item as { blocks?: unknown }).blocks;
      const content = (item as { content?: unknown }).content;
      if (Array.isArray(blocksRaw)) {
        if (!blocksRaw.every(isAssistantBlock)) return null;
        const blocks = blocksRaw as AssistantBlock[];
        for (const b of blocks) {
          if (b.type === "tool_use" && b.streaming) return null;
          if (b.type === "tool_use" && isRenderTool(b.name) && b.input === undefined) return null;
        }
        out.push({ role: "assistant", blocks });
      } else if (typeof content === "string") {
        out.push({ role: "assistant", content });
      } else {
        return null;
      }
      continue;
    }
    return null;
  }
  return out;
}
