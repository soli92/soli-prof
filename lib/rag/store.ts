import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Chunk, ChunkMetadata } from "./chunker";

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

export interface ChunkWithScore {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: ChunkMetadata;
  similarity: number;
}

// Supabase row shape returned by the RPC
interface MatchRagDocumentsRow {
  id: string;
  repo: string;
  section: string;
  content: string;
  metadata: ChunkMetadata;
  similarity: number;
}

/**
 * Creates a Supabase client using service role key (bypasses RLS for server-side ops).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export function createClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL is not set.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Upserts an array of chunks (with embeddings) into the rag_documents table.
 * Uses the id as conflict key → update on duplicate.
 */
export async function upsertChunks(
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  if (chunks.length === 0) return;

  const client = createClient();

  const rows = chunks.map((chunk) => ({
    id: chunk.id,
    repo: chunk.repo,
    section: chunk.section,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: chunk.embedding,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from("rag_documents")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
}

/**
 * Finds the top-K most similar chunks to a query embedding via Supabase RPC.
 * Relies on the match_rag_documents SQL function.
 */
export async function searchSimilar(
  queryEmbedding: number[],
  topK: number
): Promise<ChunkWithScore[]> {
  const client = createClient();

  const { data, error } = await client.rpc("match_rag_documents", {
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }

  return (data as MatchRagDocumentsRow[]).map((row) => ({
    id: row.id,
    repo: row.repo,
    section: row.section,
    content: row.content,
    metadata: row.metadata,
    similarity: row.similarity,
  }));
}
