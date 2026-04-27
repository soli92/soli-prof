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
  IngestOptions,
  IngestReport,
} from "./types";

export async function ingestCorpus(
  corpus: CorpusId,
  options: IngestOptions = {}
): Promise<IngestReport> {
  const startedAt = Date.now();
  const registryEntry = CORPUS_REGISTRY[corpus];
  const repos = CORPUS_REPOS[corpus];

  if (registryEntry.sourceFileName === null) {
    options.onProgress?.({ type: "start", corpus, totalRepos: repos.length });
    options.onProgress?.({
      type: "complete",
      corpus,
      totalRepos: repos.length,
      totalChunks: 0,
      elapsedMs: Date.now() - startedAt,
    });
    return {
      corpus,
      totalRepos: repos.length,
      totalChunks: 0,
      byRepo: {},
      elapsedMs: Date.now() - startedAt,
    };
  }

  const sourceFileName = registryEntry.sourceFileName;

  console.log(chalk.cyan(`\n🚀 Ingest corpus "${corpus}" (file: ${sourceFileName})`));
  console.log(chalk.gray(`   ${repos.length} repos to process\n`));

  options.onProgress?.({ type: "start", corpus, totalRepos: repos.length });

  const allChunks: Chunk[] = [];
  const byRepo: Record<string, number> = {};
  const indexedAt = new Date().toISOString();

  for (const target of repos) {
    options.onProgress?.({ type: "repo-start", repo: target.repo });
    try {
      const startedAtRepo = Date.now();
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
        options.onProgress?.({
          type: "repo-skipped",
          repo: target.repo,
          reason: `no ${sourceFileName}`,
        });
        continue;
      }

      console.log(
        chalk.green(
          `✓ Fetched ${sourceFileName} from ${target.owner}/${target.repo} (${markdown.length} chars)`
        )
      );

      options.onProgress?.({
        type: "repo-fetched",
        repo: target.repo,
        chars: markdown.length,
      });

      const repoChunks = chunkMarkdown(markdown, {
        repo: target.repo,
        owner: target.owner,
        branch: target.branch,
        indexedAt,
      });

      options.onProgress?.({
        type: "repo-chunked",
        repo: target.repo,
        chunks: repoChunks.length,
      });

      allChunks.push(...repoChunks);
      byRepo[target.repo] = repoChunks.length;

      options.onProgress?.({
        type: "repo-done",
        repo: target.repo,
        chunks: repoChunks.length,
        elapsedMs: Date.now() - startedAtRepo,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`✗ Error on ${target.owner}/${target.repo}: ${msg}`));
      options.onProgress?.({ type: "repo-error", repo: target.repo, error: msg });
    }
  }

  console.log(
    chalk.blue(
      `\n📦 Chunking done: ${allChunks.length} chunks across ${Object.keys(byRepo).length} repos`
    )
  );

  if (allChunks.length === 0) {
    console.log(chalk.yellow("⚠  Nothing to embed. Exiting."));
    options.onProgress?.({
      type: "complete",
      corpus,
      totalRepos: Object.keys(byRepo).length,
      totalChunks: allChunks.length,
      elapsedMs: Date.now() - startedAt,
    });
    return {
      corpus,
      totalRepos: 0,
      totalChunks: 0,
      byRepo: {},
      elapsedMs: Date.now() - startedAt,
    };
  }

  // Embedding
  options.onProgress?.({
    type: "phase",
    phase: "embedding",
    totalChunks: allChunks.length,
  });

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
  options.onProgress?.({ type: "phase", phase: "upserting" });

  await upsertChunks(corpus, chunksWithEmbedding);

  console.log(
    chalk.green(
      `✅ Ingest complete: ${chunksWithEmbedding.length} chunks upserted to ${CORPUS_REGISTRY[corpus].supabaseTable}`
    )
  );

  options.onProgress?.({
    type: "complete",
    corpus,
    totalRepos: Object.keys(byRepo).length,
    totalChunks: allChunks.length,
    elapsedMs: Date.now() - startedAt,
  });

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
export async function ingestAllCorpora(
  options: IngestOptions = {}
): Promise<IngestReport[]> {
  const reports: IngestReport[] = [];
  for (const corpus of Object.keys(CORPUS_REGISTRY) as CorpusId[]) {
    const report = await ingestCorpus(corpus, options);
    reports.push(report);
  }
  return reports;
}
