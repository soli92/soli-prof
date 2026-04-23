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

// ---------------------------------------------------------------------------
// Extended types for source-aware retrieval
// ---------------------------------------------------------------------------

export interface RetrievedSource {
  repo: string;
  section: string;
  similarity: number;
  preview: string;     // primi 200 chars del content
  commitHash?: string; // estratto con regex dal content se presente
}

export interface RetrievalResult {
  context: string;
  sources: RetrievedSource[];
}

/**
 * Same as retrieveContext() but also returns structured source metadata for
 * each retrieved chunk. Used by the chat API to display citation badges in UI.
 *
 * Does NOT modify retrieveContext() — kept for backward compat.
 *
 * @param query - The user question or search string
 * @param topK  - Number of chunks to retrieve (default: RAG_CONFIG.topK)
 * @returns     - { context: formatted string, sources: RetrievedSource[] }
 */
export async function retrieveContextWithSources(
  query: string,
  topK: number = RAG_CONFIG.topK
): Promise<RetrievalResult> {
  // 1. Embed the query (input_type: "query" for retrieval)
  const queryEmbedding = await embedQuery(query);

  // 2. Search Supabase for nearest neighbours
  const results = await searchSimilar(queryEmbedding, topK);

  if (results.length === 0) {
    return { context: "", sources: [] };
  }

  // 3. Build context string (same logic as retrieveContext)
  const blocks = results.map((chunk) => {
    const similarityStr = chunk.similarity.toFixed(2);
    const header = `--- [repo: ${chunk.repo} | section: ${chunk.section} | similarity: ${similarityStr}] ---`;
    return `${header}\n${chunk.content}`;
  });
  const context = blocks.join("\n\n");

  // 4. Build sources array with metadata
  const sources: RetrievedSource[] = results.map((chunk) => {
    // Extract first short commit hash found in content (7-12 hex chars)
    const commitMatch = chunk.content.match(/\b([a-f0-9]{7,12})\b/);
    return {
      repo: chunk.repo,
      section: chunk.section,
      similarity: chunk.similarity,
      preview: chunk.content.slice(0, 200),
      commitHash: commitMatch ? commitMatch[1] : undefined,
    };
  });

  return { context, sources };
}
