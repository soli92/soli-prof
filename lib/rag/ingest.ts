import chalk from "chalk";
import { RAG_REPOS } from "./config";
import { fetchAILog } from "./github";
import { chunkMarkdown, type Chunk } from "./chunker";
import { embedTexts } from "./embedder";
import { upsertChunks, type ChunkWithEmbedding } from "./store";

export interface IngestReport {
  totalChunks: number;
  totalRepos: number;
  byRepo: Record<string, number>;
}

/**
 * Full ingest pipeline:
 * 1. Fetch AI_LOG.md for each configured repo
 * 2. Chunk by markdown headings
 * 3. Embed all chunks via Voyage AI (batches of 128)
 * 4. Upsert into Supabase rag_documents
 */
export async function ingestAll(): Promise<IngestReport> {
  const allChunks: Chunk[] = [];
  const byRepo: Record<string, number> = {};
  let totalRepos = 0;

  // ── Step 1: Fetch + chunk ──────────────────────────────────────────────────
  for (const { owner, repo, branch } of RAG_REPOS) {
    const markdown = await fetchAILog(owner, repo, branch);

    if (markdown === null) {
      console.log(chalk.yellow(`⚠ Skipped: no AI_LOG in ${owner}/${repo}`));
      continue;
    }

    const metadata = {
      owner,
      repo,
      branch,
      indexedAt: new Date().toISOString(),
    };

    const chunks = chunkMarkdown(markdown, metadata);
    allChunks.push(...chunks);
    byRepo[repo] = chunks.length;
    totalRepos++;
  }

  console.log(
    chalk.blue(
      `📦 Chunking done: ${allChunks.length} chunks across ${totalRepos} repos`
    )
  );

  if (allChunks.length === 0) {
    console.log(chalk.yellow("⚠ No chunks to embed. Exiting early."));
    return { totalChunks: 0, totalRepos, byRepo };
  }

  // ── Step 2: Embed ─────────────────────────────────────────────────────────
  const texts = allChunks.map((c) => c.content);
  const embeddings = await embedTexts(texts, "document");

  console.log(
    chalk.blue(`🔢 Embedding done: ${embeddings.length} chunks embedded`)
  );

  // ── Step 3: Merge embeddings into chunks ───────────────────────────────────
  const chunksWithEmbeddings: ChunkWithEmbedding[] = allChunks.map(
    (chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    })
  );

  // ── Step 4: Upsert ────────────────────────────────────────────────────────
  await upsertChunks(chunksWithEmbeddings);

  console.log(
    chalk.green(
      `✅ Ingest complete: ${allChunks.length} chunks upserted to Supabase`
    )
  );

  return {
    totalChunks: allChunks.length,
    totalRepos,
    byRepo,
  };
}
