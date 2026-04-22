/**
 * Entry point CLI per l'ingest RAG.
 *
 * Uso:
 *   npm run rag:ingest
 *
 * Richiede le seguenti variabili d'ambiente:
 *   - GITHUB_TOKEN          (consigliato, evita rate limit)
 *   - VOYAGE_API_KEY        (obbligatorio)
 *   - SUPABASE_URL          (obbligatorio)
 *   - SUPABASE_SERVICE_ROLE_KEY  (obbligatorio)
 */

import { ingestAll } from "../lib/rag/ingest";

async function main() {
  console.log("🚀 Avvio RAG ingest...\n");

  const startTime = Date.now();

  const report = await ingestAll();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n📊 Report finale:");
  console.log(`   Repos processati : ${report.totalRepos}`);
  console.log(`   Chunks totali    : ${report.totalChunks}`);
  console.log(`   Tempo            : ${elapsed}s`);
  console.log("\n   Dettaglio per repo:");
  for (const [repo, count] of Object.entries(report.byRepo)) {
    const icon = count === 0 ? "⏭️ " : "✅";
    console.log(`   ${icon} ${repo}: ${count} chunks`);
  }

  console.log("\n✅ RAG ingest completato con successo.");
}

main().catch((err) => {
  console.error("\n❌ Errore durante il RAG ingest:", err);
  process.exit(1);
});
