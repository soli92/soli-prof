const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_BATCH_SIZE = 128;

export type InputType = "document" | "query";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

/**
 * Chiama l'API Voyage AI per ottenere embedding.
 * Gestisce automaticamente i batch da max 128 testi.
 */
export async function embedTexts(
  texts: string[],
  inputType: InputType = "document"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY mancante. Aggiungila alle variabili d'ambiente."
    );
  }

  const allEmbeddings: number[][] = [];

  // Split in batch da max VOYAGE_BATCH_SIZE
  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_SIZE) {
    const batch = texts.slice(i, i + VOYAGE_BATCH_SIZE);

    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: "voyage-3",
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Voyage AI API error (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as VoyageResponse;

    // Riordina per indice (Voyage garantisce l'ordine ma meglio essere espliciti)
    const sorted = data.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((d) => d.embedding));
  }

  return allEmbeddings;
}
