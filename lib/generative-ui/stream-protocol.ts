/**
 * Protocollo stream dopo il blocco __SOURCES__...__END_SOURCES__:
 * una riga = un JSON (NDJSON). Versione `v: 1`.
 * Evita collisioni con testo libero perché il modello non emette righe che iniziano con `{"v":1`.
 */

export const STREAM_PROTOCOL_VERSION = 1 as const;

export type StreamLineText = {
  v: typeof STREAM_PROTOCOL_VERSION;
  k: "text";
  /** Indice blocco (content_block_delta.index) */
  i: number;
  /** Delta testo (chunk Anthropic) */
  d: string;
};

export type StreamLineToolBegin = {
  v: typeof STREAM_PROTOCOL_VERSION;
  k: "tbeg";
  /** Indice blocco (allineato a content_block_start.index) */
  i: number;
  id: string;
  name: string;
};

export type StreamLineToolJson = {
  v: typeof STREAM_PROTOCOL_VERSION;
  k: "tjson";
  i: number;
  /** Frammento JSON parziale (input_json_delta.partial_json) */
  p: string;
};

export type StreamLineToolEnd = {
  v: typeof STREAM_PROTOCOL_VERSION;
  k: "tend";
  i: number;
};

export type StreamLineDone = {
  v: typeof STREAM_PROTOCOL_VERSION;
  k: "done";
};

export type StreamLine = StreamLineText | StreamLineToolBegin | StreamLineToolJson | StreamLineToolEnd | StreamLineDone;

export function encodeStreamLine(line: StreamLine): string {
  return `${JSON.stringify(line)}\n`;
}

export function tryParseStreamLine(raw: string): StreamLine | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (o.v !== STREAM_PROTOCOL_VERSION) return null;
    if (typeof o.k !== "string") return null;
    return o as StreamLine;
  } catch {
    return null;
  }
}
