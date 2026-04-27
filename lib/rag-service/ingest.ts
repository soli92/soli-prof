/**
 * Pipeline di ingest per un singolo corpus.
 * Accetta corpus come parametro, fetcha i repo configurati per quel corpus,
 * chunka, embedda, upserta.
 */

import chalk from "chalk";
import { chunkMarkdown } from "./chunker";
import { selectChunker } from "./chunkers/registry";
import { CORPUS_REGISTRY, CORPUS_REPOS, DEFAULT_CONFIG_SOURCES } from "./config";
import { embedTexts } from "./embedder";
import { fetchTextFile, listDirectoryFiles } from "./github";
import { RagServiceError } from "./errors";
import { upsertChunks } from "./store";
import type {
  Chunk,
  ChunkWithEmbedding,
  ConfigSource,
  CorpusId,
  IngestCorpusOptions,
  IngestReport,
  RepoTarget,
} from "./types";

/**
 * Espande un pattern da DEFAULT_CONFIG_SOURCES.
 * Glob supportato: solo `*.ext` nell'ultimo segmento (es. `.github/workflows/*.yml`), non `**`.
 */
async function expandSourcePattern(
  target: { owner: string; repo: string; branch: string },
  source: ConfigSource
): Promise<string[]> {
  const { pattern } = source;
  if (!pattern.includes("*")) {
    return [pattern];
  }
  const lastSlash = pattern.lastIndexOf("/");
  const dirPath = lastSlash === -1 ? "" : pattern.slice(0, lastSlash);
  const namePattern = lastSlash === -1 ? pattern : pattern.slice(lastSlash + 1);

  if (!namePattern.startsWith("*")) {
    console.warn(
      `[ingest] glob pattern non supportato: ${pattern}, solo "*.ext" nella directory è gestito`
    );
    return [];
  }

  const extension = namePattern.slice(1);
  const filenames = await listDirectoryFiles(
    target.owner,
    target.repo,
    target.branch,
    dirPath,
    [extension]
  );
  return filenames.map((name) => (dirPath ? `${dirPath}/${name}` : name));
}

/**
 * Intersezione tra i repo del corpus e `targetRepos` (match su owner+repo+branch).
 * `targetRepos` assente = tutti i repo del corpus. Voci in `targetRepos` non
 * presenti in `allRepos` non compaiono nel risultato.
 */
export function filterTargetRepos(
  allRepos: RepoTarget[],
  targetRepos: RepoTarget[] | undefined
): RepoTarget[] {
  if (targetRepos === undefined) {
    return allRepos;
  }
  return allRepos.filter((r) =>
    targetRepos.some(
      (t) =>
        t.owner === r.owner && t.repo === r.repo && t.branch === r.branch
    )
  );
}

export async function ingestCorpus(
  corpus: CorpusId,
  options: IngestCorpusOptions = {}
): Promise<IngestReport> {
  const startedAt = Date.now();
  const registryEntry = CORPUS_REGISTRY[corpus];
  const allRepos = CORPUS_REPOS[corpus];

  if (!allRepos || allRepos.length === 0) {
    throw new RagServiceError(`No repos configured for corpus ${corpus}`);
  }

  const repos = filterTargetRepos(allRepos, options.targetRepos);

  if (options.targetRepos && repos.length === 0) {
    const elapsedMs = Date.now() - startedAt;
    console.log(
      chalk.yellow(
        `⚠  Ingest selettivo: 0 repo nel corpus corrispondono a targetRepos — skip`
      )
    );
    options.onProgress?.({
      type: "complete",
      corpus,
      totalRepos: 0,
      totalChunks: 0,
      elapsedMs,
    });
    return {
      corpus,
      totalRepos: 0,
      totalChunks: 0,
      byRepo: {},
      elapsedMs,
    };
  }

  if (options.targetRepos) {
    console.log(
      chalk.cyan(
        `   Ingest selettivo: ${repos.length} repo${repos.length === 1 ? "" : "s"}`
      )
    );
  }

  const allChunks: Chunk[] = [];
  const byRepo: Record<string, number> = {};
  const indexedAt = new Date().toISOString();

  if (registryEntry.sourceFileName === null) {
    console.log(
      chalk.cyan(
        `\n🚀 Ingest corpus "${corpus}" (multi-file: ${DEFAULT_CONFIG_SOURCES.length} source patterns)`
      )
    );
    console.log(chalk.gray(`   ${repos.length} repos to process\n`));

    options.onProgress?.({ type: "start", corpus, totalRepos: repos.length });

    for (const target of repos) {
      options.onProgress?.({ type: "repo-start", repo: target.repo });
      try {
        const startedAtRepo = Date.now();
        const repoChunks: Chunk[] = [];
        let totalCharsForRepo = 0;

        for (const source of DEFAULT_CONFIG_SOURCES) {
          const filenames = await expandSourcePattern(target, source);
          for (const filename of filenames) {
            const content = await fetchTextFile(
              target.owner,
              target.repo,
              target.branch,
              filename
            );
            if (content === null) continue;

            totalCharsForRepo += content.length;

            try {
              const strategy = selectChunker(filename);
              const fileChunks = strategy.chunk(content, {
                repo: target.repo,
                owner: target.owner,
                branch: target.branch,
                indexedAt,
                filename,
              });
              repoChunks.push(...fileChunks);
            } catch (err) {
              console.warn(
                `[ingest] selectChunker failed for ${filename} in ${target.repo}:`,
                err
              );
            }
          }
        }

        if (repoChunks.length === 0) {
          console.log(
            chalk.yellow(
              `⚠  Skipped ${target.owner}/${target.repo} — no config files found`
            )
          );
          options.onProgress?.({
            type: "repo-skipped",
            repo: target.repo,
            reason: "no config files found",
          });
          continue;
        }

        console.log(
          chalk.green(
            `✓ Fetched config files from ${target.owner}/${target.repo} (${totalCharsForRepo} chars → ${repoChunks.length} chunks)`
          )
        );

        options.onProgress?.({
          type: "repo-fetched",
          repo: target.repo,
          chars: totalCharsForRepo,
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
  } else {
    const sourceFileName = registryEntry.sourceFileName;

    console.log(chalk.cyan(`\n🚀 Ingest corpus "${corpus}" (file: ${sourceFileName})`));
    console.log(chalk.gray(`   ${repos.length} repos to process\n`));

    options.onProgress?.({ type: "start", corpus, totalRepos: repos.length });

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
  options: IngestCorpusOptions = {}
): Promise<IngestReport[]> {
  const reports: IngestReport[] = [];
  for (const corpus of Object.keys(CORPUS_REGISTRY) as CorpusId[]) {
    const report = await ingestCorpus(corpus, options);
    reports.push(report);
  }
  return reports;
}
