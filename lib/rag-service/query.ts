/**
 * Retrieval: data una query testuale e un corpus, ritorna context + sources.
 * Ex retrieveContextWithSources, rinominato per chiarezza e pronto per estrazione.
 */

import { embedTexts } from "./embedder";
import { RAG_CONFIG } from "./config";
import { searchSimilar } from "./store";
import type { CorpusId, QueryResult, RetrievedSource } from "./types";

const COMMIT_HASH_REGEX = /\b([a-f0-9]{7,12})\b/;

function extractCommitHash(content: string): string | undefined {
  const match = content.match(COMMIT_HASH_REGEX);
  return match?.[1];
}

function buildContextString(
  chunks: Array<{
    repo: string;
    section: string;
    content: string;
    similarity: number;
  }>
): string {
  if (chunks.length === 0) return "";

  const lines: string[] = ["## Contesto recuperato\n"];
  for (const c of chunks) {
    lines.push(`### Da ${c.repo} — ${c.section}`);
    lines.push(c.content);
    lines.push(`(Similarity: ${c.similarity.toFixed(2)})`);
    lines.push("");
  }
  return lines.join("\n");
}

export async function queryCorpus(
  corpus: CorpusId,
  userQuery: string,
  topK: number = RAG_CONFIG.defaultTopK
): Promise<QueryResult> {
  if (!userQuery || userQuery.trim() === "") {
    return { corpus, context: "", sources: [] };
  }

  const safeTopK = Math.min(Math.max(topK, 1), RAG_CONFIG.maxTopK);

  // Embed della query con input_type="query"
  const [queryEmbedding] = await embedTexts([userQuery], "query");

  // Similarity search nella tabella giusta
  const retrieved = await searchSimilar(corpus, queryEmbedding, safeTopK);

  // Filtro per contesto LLM: include chunk con similarity moderata,
  // il LLM ha più materiale per inferenza
  const contextFiltered = retrieved.filter(
    (c) => c.similarity >= RAG_CONFIG.similarityThresholdForContext
  );

  // Filtro per sources (badge UI): mostra solo chunk ad alta confidenza,
  // evita rumore visivo su query generiche
  const sourcesFiltered = retrieved.filter(
    (c) => c.similarity >= RAG_CONFIG.similarityThresholdForSources
  );

  // Build context + sources
  const context = buildContextString(contextFiltered);
  const sources: RetrievedSource[] = sourcesFiltered.map((c) => ({
    repo: c.repo,
    section: c.section,
    similarity: c.similarity,
    preview: c.content.slice(0, 200),
    commitHash: extractCommitHash(c.content),
  }));

  return { corpus, context, sources };
}
