/**
 * Blocchi assistente in chat (testo + tool use per Generative UI).
 * Usati lato client e serializzati verso /api/chat.
 */

export type AssistantTextBlock = {
  type: "text";
  text: string;
};

export type AssistantToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  /** Input completo dopo content_block_stop; durante stream può essere assente */
  input: unknown;
  /** true mentre gli input_json_delta non sono ancora chiusi */
  streaming?: boolean;
};

export type AssistantBlock = AssistantTextBlock | AssistantToolUseBlock;

/** Messaggio utente nel payload chat (solo testo). */
export type ClientUserMessage = {
  role: "user";
  content: string;
};

/** Messaggio assistente: legacy stringa oppure blocchi strutturati. */
export type ClientAssistantMessage = {
  role: "assistant";
  content?: string;
  blocks?: AssistantBlock[];
};

export type ClientChatMessage = ClientUserMessage | ClientAssistantMessage;

export function assistantHasRenderableTools(blocks: AssistantBlock[] | undefined): boolean {
  if (!blocks?.length) return false;
  return blocks.some((b) => b.type === "tool_use");
}
