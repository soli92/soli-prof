import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Chunk } from "./chunker";

const TABLE_NAME = "rag_documents";
const RPC_NAME = "match_rag_documents";

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

export interface ChunkWithScore extends Chunk {
  similarity: number;
}

/**
 * Crea un client Supabase autenticato con la service role key.
 * Richiede SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nelle env.
 */
export function createClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL mancante nelle variabili d'ambiente.");
  if (!key)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mancante nelle variabili d'ambiente."
    );

  return createSupabaseClient(url, key);
}

/**
 * Upsert di un array di chunk con embedding su Supabase.
 * La chiave primaria è "id" (hash stabile): se esiste, aggiorna; altrimenti inserisce.
 */
export async function upsertChunks(
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  const client = createClient();

  // Supabase upsert in batch per performance
  const rows = chunks.map((c) => ({
    id: c.id,
    repo: c.repo,
    section: c.section,
    content: c.content,
    metadata: c.metadata,
    embedding: c.embedding,
  }));

  const { error } = await client
    .from(TABLE_NAME)
    .upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
}

/**
 * Cerca i chunk più simili a un query embedding usando la RPC pgvector.
 * Richiede che la funzione "match_rag_documents" esista su Supabase.
 */
export async function searchSimilar(
  queryEmbedding: number[],
  topK: number
): Promise<ChunkWithScore[]> {
  const client = createClient();

  const { data, error } = await client.rpc(RPC_NAME, {
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }

  return (data ?? []) as ChunkWithScore[];
}
