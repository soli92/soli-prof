/**
 * Dry-run chunker multi-repo.
 *
 * Scarica AI_LOG.md e AGENTS.md da tutti i repo configurati,
 * li chunka con il nuovo chunker, stampa un report senza
 * toccare Supabase né Voyage.
 *
 * Uso:
 *   npx tsx scripts/chunker-dryrun.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { chunkMarkdown } from "../lib/rag-service/chunker";
import { fetchTextFile } from "../lib/rag-service/github";
import { CORPUS_REGISTRY, CORPUS_REPOS } from "../lib/rag-service/config";
import type { CorpusId } from "../lib/rag-service/types";

// Conteggi noti in Supabase prima del re-ingest (dal precedente ingest reale)
const KNOWN_COUNTS_BEFORE: Record<string, Record<string, number>> = {
  ai_logs: {
    "soli-agent": 12,
    "casa-mia-be": 6,
    "casa-mia-fe": 6,
    "bachelor-party-claudiano": 26,
    solids: 6,
    "soli-prof": 42,
    // soli-dm-be/fe, soli-dome, pippify, soli-platform, Koollector non indicizzati in ai_logs (solo agents_md)
  },
  agents_md: {
    "soli-agent": 12,
    "casa-mia-be": 6,
    "casa-mia-fe": 6,
    "bachelor-party-claudiano": 26,
    solids: 6,
    "soli-prof": 42,
    "soli-dm-be": 11,
    "soli-dm-fe": 10,
    "soli-dome": 6,
    pippify: 6,
    "soli-platform": 6,
    Koollector: 6,
  },
};

interface RepoStat {
  repo: string;
  oldCount: number | null;
  newCount: number;
  splittedChunks: number;
  ratio: string;
}

async function dryRunCorpus(corpus: CorpusId): Promise<RepoStat[]> {
  const entry = CORPUS_REGISTRY[corpus];
  if (entry.sourceFileName === null) {
    console.log(`\n⏭  Corpus "${corpus}" — dry-run single-file non applicabile (multi-source).\n`);
    return [];
  }
  const sourceFileName = entry.sourceFileName;
  const repos = CORPUS_REPOS[corpus];
  const stats: RepoStat[] = [];
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
        console.log(`⚠  ${target.repo}: no ${sourceFileName}`);
        continue;
      }

      const chunks = chunkMarkdown(markdown, {
        repo: target.repo,
        owner: target.owner,
        branch: target.branch,
        indexedAt,
      });

      const splitted = chunks.filter((c) => c.section.includes("> Item"));
      const oldCount = KNOWN_COUNTS_BEFORE[corpus]?.[target.repo] ?? null;
      const ratio = oldCount
        ? `${(chunks.length / oldCount).toFixed(2)}x`
        : "n/a";

      stats.push({
        repo: target.repo,
        oldCount,
        newCount: chunks.length,
        splittedChunks: splitted.length,
        ratio,
      });
    } catch (err) {
      console.log(`✗ ${target.repo}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return stats;
}

function printTable(corpus: string, stats: RepoStat[]): void {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Corpus: ${corpus}`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(
    `  Repo                           Vecchio   Nuovo   Split   Ratio`
  );
  console.log(
    `  ────────────────────────────── ───────── ─────── ─────── ───────`
  );
  for (const s of stats) {
    const name = s.repo.padEnd(30);
    const old = (s.oldCount ?? "-").toString().padEnd(9);
    const neu = s.newCount.toString().padEnd(7);
    const split = s.splittedChunks.toString().padEnd(7);
    console.log(`  ${name} ${old} ${neu} ${split} ${s.ratio}`);
  }

  const totalNew = stats.reduce((sum, s) => sum + s.newCount, 0);
  const totalOld = stats.reduce((sum, s) => sum + (s.oldCount ?? 0), 0);
  const totalSplit = stats.reduce((sum, s) => sum + s.splittedChunks, 0);
  console.log(
    `  ────────────────────────────── ───────── ─────── ─────── ───────`
  );
  console.log(
    `  TOTAL                          ${totalOld
      .toString()
      .padEnd(9)} ${totalNew.toString().padEnd(7)} ${totalSplit
      .toString()
      .padEnd(7)} ${totalOld ? (totalNew / totalOld).toFixed(2) + "x" : "n/a"}`
  );
}

async function main() {
  console.log("🔍 Chunker dry-run — fetch + chunk senza Supabase/Voyage");

  for (const corpus of Object.keys(CORPUS_REGISTRY) as CorpusId[]) {
    const stats = await dryRunCorpus(corpus);
    printTable(corpus, stats);
  }

  console.log("\n✓ Dry-run completato. Nessun dato scritto.\n");
}

main().catch((err) => {
  console.error("❌ Dry-run failed:", err);
  process.exit(1);
});
