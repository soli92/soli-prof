/**
 * Pipeline di ingest per un singolo corpus.
 * Accetta corpus come parametro, fetcha i repo configurati per quel corpus,
 * chunka, embedda, upserta.
 */

import chalk from "chalk";
import { chunkMarkdown } from "./chunker";
import { CORPUS_REGISTRY, CORPUS_REPOS } from "./config";
import { embedTexts } from "./embedder";
import { fetchTextFile } from "./github";
import { upsertChunks } from "./store";
import type {
  Chunk,
  ChunkWithEmbedding,
  CorpusId,
  IngestReport,
} from "./types";

export async function ingestCorpus(corpus: CorpusId): Promise<IngestReport> {
  const startedAt = Date.now();
  const { sourceFileName } = CORPUS_REGISTRY[corpus];
  const repos = CORPUS_REPOS[corpus];

  console.log(chalk.cyan(`\n🚀 Ingest corpus "${corpus}" (file: ${sourceFileName})`));
  console.log(chalk.gray(`   ${repos.length} repos to process\n`));

  const allChunks: Chunk[] = [];
  const byRepo: Record<string, number> = {};
  const indexedAt = new Date().toISOString();

  for (const target of repos) {
    try {
      const markdown = await fetchTextFile(
        target.owner,
        target.repo,
        target.branch,
        sourceFileName
      );

      if (markdown === null) {
        console.log(
          chalk.yellow(`⚠  Skipped ${target.owner}/${target.repo} — no ${sourceFileName}`)
        );
        continue;
      }

      console.log(
        chalk.green(
          `✓ Fetched ${sourceFileName} from ${target.owner}/${target.repo} (${markdown.length} chars)`
        )
      );

      const repoChunks = chunkMarkdown(markdown, {
        repo: target.repo,
        owner: target.owner,
        branch: target.branch,
        indexedAt,
      });

      allChunks.push(...repoChunks);
      byRepo[target.repo] = repoChunks.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`✗ Error on ${target.owner}/${target.repo}: ${msg}`));
    }
  }

  console.log(
    chalk.blue(
      `\n📦 Chunking done: ${allChunks.length} chunks across ${Object.keys(byRepo).length} repos`
    )
  );

  if (allChunks.length === 0) {
    console.log(chalk.yellow("⚠  Nothing to embed. Exiting."));
    return {
      corpus,
      totalRepos: 0,
      totalChunks: 0,
      byRepo: {},
      elapsedMs: Date.now() - startedAt,
    };
  }

  // Embedding
  const embeddings = await embedTexts(
    allChunks.map((c) => c.content),
    "document"
  );

  console.log(chalk.blue(`🔢 Embedding done: ${embeddings.length} chunks embedded`));

  const chunksWithEmbedding: ChunkWithEmbedding[] = allChunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  // Upsert
  await upsertChunks(corpus, chunksWithEmbedding);

  console.log(
    chalk.green(
      `✅ Ingest complete: ${chunksWithEmbedding.length} chunks upserted to ${CORPUS_REGISTRY[corpus].supabaseTable}`
    )
  );

  return {
    corpus,
    totalRepos: Object.keys(byRepo).length,
    totalChunks: allChunks.length,
    byRepo,
    elapsedMs: Date.now() - startedAt,
  };
}

/**
 * Ingest tutti i corpus in sequenza. Comodo per rebuild completo.
 */
export async function ingestAllCorpora(): Promise<IngestReport[]> {
  const reports: IngestReport[] = [];
  for (const corpus of Object.keys(CORPUS_REGISTRY) as CorpusId[]) {
    const report = await ingestCorpus(corpus);
    reports.push(report);
  }
  return reports;
}
