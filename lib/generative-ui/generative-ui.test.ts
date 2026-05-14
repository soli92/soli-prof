import { describe, expect, it } from "vitest";
import { buildAnthropicMessages } from "./to-anthropic-messages";
import {
  applyStreamLine,
  createEmptySlotMap,
  finalizeStreamingSlots,
  slotsToBlocks,
} from "./merge-stream-slots";
import {
  getAnthropicTools,
  isRenderTool,
  parseShowTutorFocusCardInput,
  SHOW_TUTOR_FOCUS_CARD,
} from "./registry";
import { encodeStreamLine, tryParseStreamLine } from "./stream-protocol";
import { parseClientChatMessages } from "./validate-client-messages";

describe("generative-ui registry", () => {
  it("getAnthropicTools espone show_tutor_focus_card", () => {
    const tools = getAnthropicTools();
    expect(tools.length).toBe(1);
    expect(tools[0]?.name).toBe(SHOW_TUTOR_FOCUS_CARD);
    expect(tools[0]?.input_schema.type).toBe("object");
  });

  it("isRenderTool riconosce solo il tool registrato", () => {
    expect(isRenderTool(SHOW_TUTOR_FOCUS_CARD)).toBe(true);
    expect(isRenderTool("other_tool")).toBe(false);
  });

  it("parseShowTutorFocusCardInput accetta input valido", () => {
    const p = parseShowTutorFocusCardInput({
      title: " RAG ",
      summary: " Recupero contesto ",
      difficulty: "intermediate",
      tags: [" Next ", "Supabase"],
    });
    expect(p).toEqual({
      title: "RAG",
      summary: "Recupero contesto",
      difficulty: "intermediate",
      tags: ["Next", "Supabase"],
    });
  });

  it("parseShowTutorFocusCardInput rifiuta difficulty invalida", () => {
    expect(
      parseShowTutorFocusCardInput({
        title: "T",
        summary: "S",
        difficulty: "expert",
      })
    ).toBeNull();
  });
});

describe("stream-protocol", () => {
  it("encodeStreamLine termina con newline", () => {
    const s = encodeStreamLine({ v: 1, k: "text", i: 0, d: "hi" });
    expect(s.endsWith("\n")).toBe(true);
    expect(JSON.parse(s.trim())).toEqual({ v: 1, k: "text", i: 0, d: "hi" });
  });

  it("tryParseStreamLine accetta solo v:1", () => {
    expect(tryParseStreamLine('{"v":1,"k":"done"}')).toEqual({ v: 1, k: "done" });
    expect(tryParseStreamLine('{"v":2,"k":"text"}')).toBeNull();
    expect(tryParseStreamLine("not json")).toBeNull();
  });
});

describe("merge-stream-slots", () => {
  it("costruisce testo + tool completo in ordine di indice", () => {
    const slots = createEmptySlotMap();
    applyStreamLine(slots, { v: 1, k: "text", i: 0, d: "A" });
    applyStreamLine(slots, { v: 1, k: "text", i: 0, d: "B" });
    applyStreamLine(slots, { v: 1, k: "tbeg", i: 1, id: "tu_1", name: SHOW_TUTOR_FOCUS_CARD });
    applyStreamLine(slots, { v: 1, k: "tjson", i: 1, p: '{"title":"T"' });
    applyStreamLine(slots, { v: 1, k: "tjson", i: 1, p: ',"summary":"S"}' });
    applyStreamLine(slots, { v: 1, k: "tend", i: 1 });
    const blocks = slotsToBlocks(slots);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "text", text: "AB" });
    expect(blocks[1]).toMatchObject({
      type: "tool_use",
      id: "tu_1",
      name: SHOW_TUTOR_FOCUS_CARD,
      streaming: false,
    });
    expect((blocks[1] as { input: { title: string } }).input).toEqual({
      title: "T",
      summary: "S",
    });
  });

  it("streaming true fino a tend", () => {
    const slots = createEmptySlotMap();
    applyStreamLine(slots, { v: 1, k: "tbeg", i: 0, id: "x", name: SHOW_TUTOR_FOCUS_CARD });
    let blocks = slotsToBlocks(slots);
    expect(blocks[0]).toMatchObject({ type: "tool_use", streaming: true });
    applyStreamLine(slots, { v: 1, k: "tend", i: 0 });
    blocks = slotsToBlocks(slots);
    expect(blocks[0]).toMatchObject({ type: "tool_use", streaming: false });
  });

  it("finalizeStreamingSlots chiude JSON incompleto", () => {
    const slots = createEmptySlotMap();
    applyStreamLine(slots, { v: 1, k: "tbeg", i: 0, id: "x", name: SHOW_TUTOR_FOCUS_CARD });
    applyStreamLine(slots, { v: 1, k: "tjson", i: 0, p: '{"title":"T"' });
    finalizeStreamingSlots(slots);
    const blocks = slotsToBlocks(slots);
    expect(blocks[0]).toMatchObject({ streaming: false });
  });
});

describe("validate-client-messages", () => {
  it("accetta cronologia user + assistant stringa", () => {
    const m = parseClientChatMessages([
      { role: "user", content: "ciao" },
      { role: "assistant", content: "ok" },
    ]);
    expect(m).toEqual([
      { role: "user", content: "ciao" },
      { role: "assistant", content: "ok" },
    ]);
  });

  it("rifiuta tool_use in streaming nel payload", () => {
    expect(
      parseClientChatMessages([
        {
          role: "assistant",
          blocks: [
            {
              type: "tool_use",
              id: "1",
              name: SHOW_TUTOR_FOCUS_CARD,
              input: {},
              streaming: true,
            },
          ],
        },
      ])
    ).toBeNull();
  });

  it("accetta assistant con blocks completi", () => {
    const m = parseClientChatMessages([
      {
        role: "assistant",
        blocks: [
          { type: "text", text: "Ecco:" },
          {
            type: "tool_use",
            id: "toolu_01",
            name: SHOW_TUTOR_FOCUS_CARD,
            input: { title: "T", summary: "S" },
            streaming: false,
          },
        ],
      },
    ]);
    expect(m?.[0]).toMatchObject({ role: "assistant" });
    if (m?.[0]?.role === "assistant" && m[0].blocks) {
      expect(m[0].blocks).toHaveLength(2);
    }
  });
});

describe("buildAnthropicMessages", () => {
  it("inserisce tool_result dopo assistant con render tool", () => {
    const msgs = buildAnthropicMessages(
      [
        { role: "user", content: "domanda" },
        {
          role: "assistant",
          blocks: [
            { type: "text", text: "Vedi card." },
            {
              type: "tool_use",
              id: "id1",
              name: SHOW_TUTOR_FOCUS_CARD,
              input: { title: "T", summary: "S" },
              streaming: false,
            },
          ],
        },
      ],
      "follow-up"
    );
    expect(msgs).toHaveLength(4);
    expect(msgs[0]).toEqual({ role: "user", content: "domanda" });
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[2]).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "id1", content: "rendered" }],
    });
    expect(msgs[3]).toEqual({ role: "user", content: "follow-up" });
  });
});
