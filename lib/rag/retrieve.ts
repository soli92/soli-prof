import { embedQuery } from "./embedder";
import { searchSimilar } from "./store";
import { RAG_CONFIG } from "./config";

/**
 * Retrieves the top-K most relevant chunks for a given query
 * and formats them as a context string ready to be injected into a prompt.
 *
 * Format:
 * --- [repo: soli-agent | section: Fase 1 > Lezioni apprese | similarity: 0.87] ---
 * <content>
 *
 * @param query   - The user question or search string
 * @param topK    - Number of chunks to retrieve (default: RAG_CONFIG.topK)
 * @returns       - Formatted context string (empty string if no results)
 */
export async function retrieveContext(
  query: string,
  topK: number = RAG_CONFIG.topK
): Promise<string> {
  // 1. Embed the query (input_type: "query" for retrieval)
  const queryEmbedding = await embedQuery(query);

  // 2. Search Supabase for nearest neighbours
  const results = await searchSimilar(queryEmbedding, topK);

  if (results.length === 0) {
    return "";
  }

  // 3. Format each chunk as a labelled block
  const blocks = results.map((chunk) => {
    const similarityStr = chunk.similarity.toFixed(2);
    const header = `--- [repo: ${chunk.repo} | section: ${chunk.section} | similarity: ${similarityStr}] ---`;
    return `${header}\n${chunk.content}`;
  });

  return blocks.join("\n\n");
}
