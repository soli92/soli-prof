import type Anthropic from "@anthropic-ai/sdk";

/** Nome tool registrato per la card focus tutor (snake_case, prefisso show_). */
export const SHOW_TUTOR_FOCUS_CARD = "show_tutor_focus_card" as const;

export type RenderToolName = typeof SHOW_TUTOR_FOCUS_CARD;

export type TutorFocusCardProps = {
  title: string;
  summary: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
};

const DIFFICULTIES = new Set<string>(["beginner", "intermediate", "advanced"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Valida e normalizza l'input del tool show_tutor_focus_card (nessuna dipendenza Zod).
 */
export function parseShowTutorFocusCardInput(input: unknown): TutorFocusCardProps | null {
  if (!isRecord(input)) return null;
  const title = input.title;
  const summary = input.summary;
  if (typeof title !== "string" || !title.trim()) return null;
  if (typeof summary !== "string" || !summary.trim()) return null;

  let difficulty: TutorFocusCardProps["difficulty"];
  if (input.difficulty !== undefined) {
    if (typeof input.difficulty !== "string" || !DIFFICULTIES.has(input.difficulty)) {
      return null;
    }
    difficulty = input.difficulty as TutorFocusCardProps["difficulty"];
  }

  let tags: string[] | undefined;
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || !input.tags.every((t) => typeof t === "string")) {
      return null;
    }
    tags = input.tags.map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) tags = undefined;
  }

  return {
    title: title.trim(),
    summary: summary.trim(),
    difficulty,
    tags,
  };
}

const SHOW_TUTOR_FOCUS_CARD_TOOL: Anthropic.Tool = {
  name: SHOW_TUTOR_FOCUS_CARD,
  description:
    "Mostra una card visuale per evidenziare UN argomento di studio o un concetto (titolo + riassunto breve). Usala quando una rappresentazione strutturata aiuta più del solo testo (es. un focus su un tema, un modulo, un percorso). NON usarla per liste lunghe né per sostituire spiegazioni dettagliate: combina testo di contesto + questa card. Non ripetere in prosa i campi già mostrati nella card.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titolo breve dell'argomento in evidenza" },
      summary: { type: "string", description: "1–2 frasi di riassunto" },
      difficulty: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"],
        description: "Livello opzionale per il learner",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tag opzionali (es. RAG, Next.js)",
      },
    },
    required: ["title", "summary"],
  },
};

const RENDER_TOOLS_LIST: Anthropic.Tool[] = [SHOW_TUTOR_FOCUS_CARD_TOOL];

export function getAnthropicTools(): Anthropic.Tool[] {
  return RENDER_TOOLS_LIST;
}

export function isRenderTool(name: string): name is RenderToolName {
  return name === SHOW_TUTOR_FOCUS_CARD;
}

export function parseRenderToolInput(
  name: string,
  input: unknown
): TutorFocusCardProps | null {
  if (name === SHOW_TUTOR_FOCUS_CARD) return parseShowTutorFocusCardInput(input);
  return null;
}
