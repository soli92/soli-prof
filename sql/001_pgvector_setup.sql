-- ============================================================
-- RAG: pgvector setup per Soli Prof
-- Esegui questo script manualmente nel Supabase SQL Editor.
--
-- Prerequisito: abilitare l'estensione pgvector dal dashboard
-- Supabase > Database > Extensions > cerca "vector" > Enable
-- ============================================================

-- 1. Abilita l'estensione pgvector (idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. Tabella principale dei documenti RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id          TEXT PRIMARY KEY,           -- hash sha256 stabile (16 char)
  repo        TEXT NOT NULL,              -- es. "soli-agent"
  section     TEXT NOT NULL,              -- heading path, es. "Fase 1 > Lezioni apprese"
  content     TEXT NOT NULL,             -- testo del chunk
  metadata    JSONB DEFAULT '{}',         -- owner, branch, indexedAt, ecc.
  embedding   vector(1024),              -- Voyage AI voyage-3 = 1024 dimensioni
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indice IVFFlat per ricerca approssimativa veloce su cosine similarity
-- Nota: crea l'indice DOPO aver inserito i primi dati (lists = sqrt(N righe))
-- Decommentare quando si hanno almeno ~100 righe:
-- CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
--   ON rag_documents
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 10);

-- ============================================================
-- 3. Trigger per aggiornare updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rag_documents_updated_at ON rag_documents;

CREATE TRIGGER set_rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RPC per la ricerca per similarità coseno
--    Usata da store.ts > searchSimilar()
-- ============================================================
CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding vector(1024),
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.repo,
    d.section,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM rag_documents d
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 5. Row Level Security (opzionale ma consigliato)
--    Il client usa la service role key (bypass RLS), ma
--    abilitiamo RLS per bloccare accessi anonimi in lettura.
-- ============================================================
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- Permetti lettura solo a ruoli autenticati o service_role (bypass)
CREATE POLICY "Allow service_role full access"
  ON rag_documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Verifica: conta le righe dopo l'ingest
-- SELECT repo, COUNT(*) FROM rag_documents GROUP BY repo ORDER BY repo;
-- ============================================================
