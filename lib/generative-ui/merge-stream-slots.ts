import type { StreamLine } from "./stream-protocol";
import type { AssistantBlock } from "./types";

type TextSlot = { kind: "text"; text: string };
type ToolSlot = {
  kind: "tool";
  id: string;
  name: string;
  json: string;
  /** dopo tend */
  complete: boolean;
  parsedInput: unknown;
};

export type BlockSlot = TextSlot | ToolSlot;

export function createEmptySlotMap(): Map<number, BlockSlot> {
  return new Map();
}

/**
 * Applica una riga protocollo NDJSON allo stato per-indice dei blocchi assistente.
 */
export function applyStreamLine(slots: Map<number, BlockSlot>, line: StreamLine): void {
  switch (line.k) {
    case "text": {
      const prev = slots.get(line.i);
      if (!prev || prev.kind !== "text") {
        slots.set(line.i, { kind: "text", text: line.d });
      } else {
        slots.set(line.i, { kind: "text", text: prev.text + line.d });
      }
      break;
    }
    case "tbeg":
      slots.set(line.i, {
        kind: "tool",
        id: line.id,
        name: line.name,
        json: "",
        complete: false,
        parsedInput: {},
      });
      break;
    case "tjson": {
      const t = slots.get(line.i);
      if (t && t.kind === "tool") {
        slots.set(line.i, { ...t, json: t.json + line.p });
      }
      break;
    }
    case "tend": {
      const t = slots.get(line.i);
      if (t && t.kind === "tool") {
        let parsed: unknown = {};
        try {
          parsed = t.json.trim() ? JSON.parse(t.json) : {};
        } catch {
          parsed = { _parseError: true };
        }
        slots.set(line.i, {
          ...t,
          complete: true,
          parsedInput: parsed,
        });
      }
      break;
    }
    default:
      break;
  }
}

/** Converte slot ordinati per indice in blocchi UI. */
export function slotsToBlocks(slots: Map<number, BlockSlot>): AssistantBlock[] {
  const keys = [...slots.keys()].sort((a, b) => a - b);
  const out: AssistantBlock[] = [];
  for (const k of keys) {
    const s = slots.get(k);
    if (!s) continue;
    if (s.kind === "text") {
      if (s.text) out.push({ type: "text", text: s.text });
    } else if (s.kind === "tool") {
      if (!s.complete) {
        out.push({
          type: "tool_use",
          id: s.id,
          name: s.name,
          input: {},
          streaming: true,
        });
      } else {
        out.push({
          type: "tool_use",
          id: s.id,
          name: s.name,
          input: s.parsedInput,
          streaming: false,
        });
      }
    }
  }
  return out;
}

/**
 * Alla fine dello stream: tenta JSON.parse sugli slot tool ancora aperti.
 */
export function finalizeStreamingSlots(slots: Map<number, BlockSlot>): void {
  for (const [i, s] of slots.entries()) {
    if (s.kind === "tool" && !s.complete) {
      let parsed: unknown = {};
      try {
        parsed = s.json.trim() ? JSON.parse(s.json) : {};
      } catch {
        parsed = { _parseError: true };
      }
      slots.set(i, { ...s, complete: true, parsedInput: parsed });
    }
  }
}
