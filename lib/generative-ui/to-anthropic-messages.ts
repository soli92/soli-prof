import type Anthropic from "@anthropic-ai/sdk";
import { isRenderTool } from "./registry";
import type { AssistantBlock, ClientChatMessage } from "./types";

/**
 * Converte la cronologia client + nuovo messaggio utente in MessageParam per l'API Anthropic.
 * Dopo un assistente con `tool_use` (render), inserisce la riga `user` con `tool_result` richiesta dall'API.
 */
export function buildAnthropicMessages(
  history: ClientChatMessage[],
  newUserText: string
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];

  for (const m of history) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
      continue;
    }

    if (m.blocks && m.blocks.length > 0) {
      const content = blocksToAssistantContent(m.blocks);
      out.push({ role: "assistant", content });
      const toolResults = collectRenderToolResults(m.blocks);
      if (toolResults.length > 0) {
        out.push({ role: "user", content: toolResults });
      }
    } else if (typeof m.content === "string") {
      out.push({ role: "assistant", content: m.content });
    } else {
      out.push({ role: "assistant", content: "" });
    }
  }

  out.push({ role: "user", content: newUserText });
  return out;
}

function blocksToAssistantContent(
  blocks: AssistantBlock[]
): Anthropic.MessageParam["content"] {
  const parts: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
  for (const b of blocks) {
    if (b.type === "text" && b.text.trim()) {
      parts.push({ type: "text", text: b.text });
    } else if (b.type === "tool_use" && !b.streaming && b.input !== undefined) {
      parts.push({
        type: "tool_use",
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      });
    }
  }
  if (parts.length === 0) return "";
  return parts as Anthropic.MessageParam["content"];
}

function collectRenderToolResults(
  blocks: AssistantBlock[]
): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const b of blocks) {
    if (b.type === "tool_use" && !b.streaming && isRenderTool(b.name)) {
      results.push({
        type: "tool_result",
        tool_use_id: b.id,
        content: "rendered",
      });
    }
  }
  return results;
}
