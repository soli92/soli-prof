import { embedTexts } from "./embedder";
import { searchSimilar } from "./store";
import { RAG_CONFIG } from "./config";

/**
 * Recupera il contesto rilevante per una query usando RAG.
 *
 * 1. Embedda la query con input_type "query"
 * 2. Cerca i top-K chunk più simili su Supabase pgvector
 * 3. Formatta il contesto come testo strutturato per il prompt LLM
 *
 * @param query  - La domanda dell'utente
 * @param topK   - Numero di chunk da recuperare (default: RAG_CONFIG.topK)
 * @returns      - Stringa di contesto pronta per essere iniettata nel prompt
 */
export async function retrieveContext(
  query: string,
  topK: number = RAG_CONFIG.topK
): Promise<string> {
  // 1. Embedding della query (input_type: "query" per Voyage AI)
  const [queryEmbedding] = await embedTexts([query], "query");

  // 2. Ricerca dei chunk più simili
  const chunks = await searchSimilar(queryEmbedding, topK);

  if (chunks.length === 0) {
    return "";
  }

  // 3. Formattazione del contesto per il prompt
  const contextBlocks = chunks.map((chunk, i) => {
    const repoLabel = chunk.repo ?? chunk.metadata?.repo ?? "unknown";
    const section = chunk.section ?? "–";
    const similarity = typeof chunk.similarity === "number"
      ? ` (similarity: ${chunk.similarity.toFixed(3)})`
      : "";

    return [
      `--- Source ${i + 1}: ${repoLabel} / ${section}${similarity} ---`,
      chunk.content.trim(),
    ].join("\n");
  });

  return contextBlocks.join("\n\n");
}
