/**
 * Wrapper Voyage AI per embeddings.
 * Equivalente al vecchio lib/rag/embedder.ts con errori tipizzati.
 */

import { EmbeddingError, MissingEnvError } from "./errors";
import { RAG_CONFIG } from "./config";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 128;

type InputType = "document" | "query";

export async function embedTexts(
  texts: string[],
  inputType: InputType = "document"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new MissingEnvError("VOYAGE_API_KEY");
  }
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: batch,
        model: RAG_CONFIG.embeddingModel,
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new EmbeddingError(`Voyage API ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { data: { embedding: number[] }[] };
    for (const item of data.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
