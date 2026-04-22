import chalk from "chalk";
import { RAG_REPOS } from "./config";
import { fetchAILog } from "./github";
import { chunkMarkdown, type Chunk } from "./chunker";
import { embedTexts } from "./embedder";
import { upsertChunks, type ChunkWithEmbedding } from "./store";

const EMBED_BATCH_SIZE = 128;

export interface IngestReport {
  totalChunks: number;
  totalRepos: number;
  byRepo: Record<string, number>;
}

/**
 * Ingesta tutti gli AI_LOG dai repo configurati:
 * 1. Fetch da GitHub
 * 2. Chunking per heading h2/h3
 * 3. Embedding via Voyage AI (batch 128)
 * 4. Upsert su Supabase pgvector
 */
export async function ingestAll(): Promise<IngestReport> {
  const byRepo: Record<string, number> = {};
  const allChunks: Chunk[] = [];
  let processedRepos = 0;

  // ── 1. Fetch + Chunk ──────────────────────────────────────────────────────
  for (const { owner, repo, branch } of RAG_REPOS) {
    const repoKey = `${owner}/${repo}`;

    const raw = await fetchAILog(owner, repo, branch);

    if (raw === null) {
      console.log(chalk.yellow(`⚠️  Skipped: no AI_LOG in ${repoKey}`));
      byRepo[repoKey] = 0;
      continue;
    }

    const metadata = {
      owner,
      repo,
      branch,
      indexedAt: new Date().toISOString(),
    };

    const chunks = chunkMarkdown(raw, metadata);
    byRepo[repoKey] = chunks.length;
    allChunks.push(...chunks);
    processedRepos++;
  }

  console.log(
    chalk.blue(
      `📦 Chunking done: ${allChunks.length} chunks across ${processedRepos} repos`
    )
  );

  if (allChunks.length === 0) {
    console.log(chalk.yellow("⚠️  Nessun chunk da indicizzare. Fine."));
    return { totalChunks: 0, totalRepos: processedRepos, byRepo };
  }

  // ── 2. Embed in batch ─────────────────────────────────────────────────────
  const chunksWithEmbedding: ChunkWithEmbedding[] = [];

  for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => `${c.section}\n\n${c.content}`);
    const embeddings = await embedTexts(texts, "document");

    for (let j = 0; j < batch.length; j++) {
      chunksWithEmbedding.push({
        ...batch[j],
        embedding: embeddings[j],
      });
    }

    console.log(
      chalk.blue(
        `🔢 Embedded batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / EMBED_BATCH_SIZE)} (${i + batch.length}/${allChunks.length})`
      )
    );
  }

  console.log(
    chalk.blue(`✨ Embedding done: ${chunksWithEmbedding.length} chunks embedded`)
  );

  // ── 3. Upsert su Supabase ─────────────────────────────────────────────────
  await upsertChunks(chunksWithEmbedding);

  console.log(
    chalk.green(
      `🎉 Ingest complete: ${chunksWithEmbedding.length} chunks upserted`
    )
  );

  return {
    totalChunks: chunksWithEmbedding.length,
    totalRepos: processedRepos,
    byRepo,
  };
}
