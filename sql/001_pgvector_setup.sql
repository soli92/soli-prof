-- ============================================================
-- RAG setup for soli-prof
-- Run once in the Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension (requires Supabase dashboard toggle first)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Main documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id          TEXT        PRIMARY KEY,
  repo        TEXT        NOT NULL,
  section     TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  embedding   VECTOR(1024) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for fast repo-based filtering
CREATE INDEX IF NOT EXISTS rag_documents_repo_idx
  ON rag_documents (repo);

-- 4. IVFFlat index for approximate cosine similarity search
--    lists = 100 is a reasonable starting point; tune after data load
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rag_documents_updated_at ON rag_documents;
CREATE TRIGGER rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RPC function for similarity search
--    Used by store.ts → searchSimilar()
CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding VECTOR(1024),
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id         TEXT,
  repo       TEXT,
  section    TEXT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    repo,
    section,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM rag_documents
  ORDER BY embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- 7. Row Level Security (RLS)
--    Service role key bypasses RLS; anon key is blocked from reading embeddings
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Allow only the service role (server-side) to do anything
CREATE POLICY "service_role_full_access"
  ON rag_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verification queries (run after setup to confirm)
-- ============================================================
-- SELECT COUNT(*) FROM rag_documents;
-- SELECT id, repo, section, similarity
--   FROM match_rag_documents(
--     '[0.1, 0.2, ...]'::vector(1024),   -- replace with a real embedding
--     3
--   );
