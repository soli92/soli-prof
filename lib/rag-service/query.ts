/**
 * Retrieval: data una query testuale e un corpus, ritorna context + sources.
 * Ex retrieveContextWithSources, rinominato per chiarezza e pronto per estrazione.
 */

import { embedTexts } from "./embedder";
import { RAG_CONFIG } from "./config";
import { searchSimilar } from "./store";
import type { CorpusId, QueryResult, RetrievedSource } from "./types";

const RRF_K = 60;

const COMMIT_HASH_REGEX = /\b([a-f0-9]{7,12})\b/;

/** Chiave per fusione RRF: repo + section (univoco per chunk nel nostro modello). */
function sourceKey(source: RetrievedSource): string {
  return `${source.repo}::${source.section}`;
}

export interface MultiCorpusQueryResult {
  context: string;
  sources: RetrievedSource[];
  corporaQueried: CorpusId[];
}

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

/**
 * Interroga N corpus in parallelo e fonde i risultati con Reciprocal Rank Fusion (RRF).
 *
 * RRF score: somma sui corpus `1 / (RRF_K + rank)` con rank 1-based; chunk assente in un corpus → 0.
 * `RRF_K` = 60 (Cormack et al., 2009).
 *
 * @param queryImpl override opzionale di {@link queryCorpus} (solo test).
 */
export async function queryMultipleCorpora(
  corpora: CorpusId[],
  query: string,
  topKPerCorpus: number = 25,
  topKOutput: number = 25,
  queryImpl: (
    corpus: CorpusId,
    userQuery: string,
    topK?: number
  ) => Promise<QueryResult> = queryCorpus
): Promise<MultiCorpusQueryResult> {
  if (corpora.length === 0) {
    return { context: "", sources: [], corporaQueried: [] };
  }

  const results = await Promise.all(
    corpora.map((corpus) =>
      queryImpl(corpus, query, topKPerCorpus).catch((err: unknown) => {
        console.warn(`[queryMultipleCorpora] queryCorpus failed for ${corpus}:`, err);
        return { corpus, context: "", sources: [] } satisfies QueryResult;
      })
    )
  );

  const rankings: Array<
    Map<string, { rank: number; corpus: CorpusId; source: RetrievedSource }>
  > = [];

  for (let i = 0; i < results.length; i++) {
    const corpus = corpora[i];
    const sources = results[i].sources;
    const ranking = new Map<
      string,
      { rank: number; corpus: CorpusId; source: RetrievedSource }
    >();
    sources.forEach((source, idx) => {
      const key = sourceKey(source);
      ranking.set(key, { rank: idx + 1, corpus, source });
    });
    rankings.push(ranking);
  }

  const aggregate = new Map<
    string,
    { score: number; corpus: CorpusId; source: RetrievedSource }
  >();

  for (const ranking of rankings) {
    for (const [, entry] of ranking) {
      const contribution = 1 / (RRF_K + entry.rank);
      const key = sourceKey(entry.source);
      const existing = aggregate.get(key);
      if (existing) {
        existing.score += contribution;
        if (entry.source.similarity > existing.source.similarity) {
          existing.source = entry.source;
          existing.corpus = entry.corpus;
        }
      } else {
        aggregate.set(key, {
          score: contribution,
          corpus: entry.corpus,
          source: entry.source,
        });
      }
    }
  }

  const sorted = Array.from(aggregate.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topKOutput);

  const sources = sorted.map((e) => e.source);

  const contextLines: string[] = [];
  if (sorted.length > 0) {
    contextLines.push("## Contesto recuperato\n");
  }
  for (const entry of sorted) {
    const { source } = entry;
    contextLines.push(`[Repo: ${source.repo} | Section: ${source.section}]`);
    contextLines.push(source.preview);
    contextLines.push(`(Similarity: ${source.similarity.toFixed(2)})`);
    contextLines.push("");
  }
  const context = contextLines.join("\n");

  return {
    context,
    sources,
    corporaQueried: corpora,
  };
}
