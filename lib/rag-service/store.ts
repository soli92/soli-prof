/**
 * Wrapper Supabase pgvector con supporto multi-corpus.
 *
 * Ogni corpus ha la propria tabella (rag_ai_logs, rag_agents_md) e la propria
 * RPC di match. La funzione accetta CorpusId come parametro e usa CORPUS_REGISTRY
 * per risolvere nomi tabella / funzione.
 */

import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { CORPUS_REGISTRY, CURRENT_CORPUS_VERSION, requireEnv } from "./config";
import { StoreError } from "./errors";
import type { ChunkWithEmbedding, CorpusId, RetrievedChunk } from "./types";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  cachedClient = createSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * Upsert batch di chunk embedded nella tabella del corpus specificato.
 */
export async function upsertChunks(
  corpus: CorpusId,
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  if (chunks.length === 0) return;
  const { supabaseTable } = CORPUS_REGISTRY[corpus];

  const rows = chunks.map((c) => ({
    id: c.id,
    repo: c.repo,
    section: c.section,
    content: c.content,
    metadata: c.metadata,
    embedding: c.embedding,
    updated_at: new Date().toISOString(),
    chunker_version: c.metadata.chunkerVersion,
    corpus_version: c.metadata.corpusVersion,
  }));

  const client = getClient();
  const { error } = await client.from(supabaseTable).upsert(rows, { onConflict: "id" });
  if (error) {
    throw new StoreError(`Upsert into ${supabaseTable} failed: ${error.message}`);
  }
}

/**
 * Similarity search su un corpus specifico.
 * Usa la RPC dedicata (match_rag_ai_logs / match_rag_agents_md).
 */
export async function searchSimilar(
  corpus: CorpusId,
  queryEmbedding: number[],
  topK: number
): Promise<RetrievedChunk[]> {
  const { matchFunction } = CORPUS_REGISTRY[corpus];
  const client = getClient();

  const filterByVersion = process.env.RAG_FILTER_BY_VERSION !== "false";
  const rpcArgs: {
    query_embedding: number[];
    match_count: number;
    target_corpus_version?: string;
  } = {
    query_embedding: queryEmbedding,
    match_count: topK,
  };
  if (filterByVersion) {
    rpcArgs.target_corpus_version = CURRENT_CORPUS_VERSION;
  }

  const { data, error } = await client.rpc(matchFunction, rpcArgs);

  if (error) {
    throw new StoreError(`RPC ${matchFunction} failed: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new StoreError(`RPC ${matchFunction} returned non-array: ${typeof data}`);
  }

  return data as RetrievedChunk[];
}

/**
 * Text-based similarity search su un corpus specifico (BM25-like via ts_rank).
 * Usa la RPC `match_rag_X_text` che lavora su `content_tsv` (tsvector).
 *
 * Differenze rispetto a `searchSimilar` (semantic):
 * - Input: testo della query (non embedding)
 * - Output: stessa shape `RetrievedChunk[]` ma `similarity` è ts_rank (0.05–0.3 tipici)
 * - No embedding API call: tutto in DB
 */
export async function searchSimilarText(
  corpus: CorpusId,
  queryText: string,
  topK: number
): Promise<RetrievedChunk[]> {
  const { matchFunctionText } = CORPUS_REGISTRY[corpus];
  const client = getClient();

  const filterByVersion = process.env.RAG_FILTER_BY_VERSION !== "false";
  const rpcArgs: {
    query_text: string;
    match_count: number;
    target_corpus_version?: string;
  } = {
    query_text: queryText,
    match_count: topK,
  };
  if (filterByVersion) {
    rpcArgs.target_corpus_version = CURRENT_CORPUS_VERSION;
  }

  const { data, error } = await client.rpc(matchFunctionText, rpcArgs);

  if (error) {
    throw new StoreError(`RPC ${matchFunctionText} failed: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new StoreError(
      `RPC ${matchFunctionText} returned non-array: ${typeof data}`
    );
  }

  return data as RetrievedChunk[];
}

/**
 * Conta righe nella tabella del corpus (utile per health check / report).
 */
export async function countCorpus(corpus: CorpusId): Promise<number> {
  const { supabaseTable } = CORPUS_REGISTRY[corpus];
  const client = getClient();
  const { count, error } = await client
    .from(supabaseTable)
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new StoreError(`Count ${supabaseTable} failed: ${error.message}`);
  }
  return count ?? 0;
}
