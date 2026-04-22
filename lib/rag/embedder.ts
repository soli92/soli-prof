import { RAG_CONFIG } from "./config";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 128; // Voyage AI max per request

type InputType = "document" | "query";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

async function callVoyageAPI(
  texts: string[],
  inputType: InputType
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Add it to your environment variables."
    );
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: RAG_CONFIG.embeddingModel,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Voyage AI API error ${response.status}: ${error}`
    );
  }

  const json = (await response.json()) as VoyageResponse;

  // Sort by index to preserve original order
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Embeds an array of texts using Voyage AI.
 * Automatically batches in groups of 128 (Voyage API limit).
 * Use inputType "document" for indexing, "query" for search queries.
 */
export async function embedTexts(
  texts: string[],
  inputType: InputType = "document"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await callVoyageAPI(batch, inputType);
    results.push(...embeddings);
  }

  return results;
}

/**
 * Convenience wrapper for embedding a single query string.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query], "query");
  if (!embedding) {
    throw new Error("Voyage AI returned no embedding for the query.");
  }
  return embedding;
}
