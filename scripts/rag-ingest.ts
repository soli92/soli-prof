/**
 * CLI entry point for the RAG ingest pipeline.
 * Run with: npm run rag:ingest
 *
 * Required env vars:
 *   GITHUB_TOKEN          – GitHub personal access token (read:contents)
 *   VOYAGE_API_KEY        – Voyage AI API key
 *   SUPABASE_URL          – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – Supabase service role key (bypasses RLS)
 */

import { ingestAll } from "../lib/rag/ingest";

async function main(): Promise<void> {
  console.log("🚀 Starting RAG ingest pipeline...\n");
  const startMs = Date.now();

  const report = await ingestAll();

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);

  console.log("\n── Ingest Report ──────────────────────────────");
  console.log(`   Total repos indexed : ${report.totalRepos}`);
  console.log(`   Total chunks stored : ${report.totalChunks}`);
  console.log(`   Elapsed             : ${elapsedSec}s`);

  if (Object.keys(report.byRepo).length > 0) {
    console.log("\n   Breakdown by repo:");
    for (const [repo, count] of Object.entries(report.byRepo)) {
      console.log(`     • ${repo}: ${count} chunks`);
    }
  }

  console.log("───────────────────────────────────────────────\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Ingest failed: ${message}`);
  process.exit(1);
});
