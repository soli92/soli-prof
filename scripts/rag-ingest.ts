import { config } from "dotenv";
config({ path: ".env.local" });

import chalk from "chalk";
import {
  ingestCorpus,
  ingestAllCorpora,
  CORPUS_REGISTRY,
  type CorpusId,
} from "../lib/rag-service";

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === "all") {
    console.log(chalk.cyan("\n🚀 Ingesting ALL corpora\n"));
    const reports = await ingestAllCorpora();
    console.log(chalk.green("\n── Ingest Reports ─────────────────────────────"));
    for (const r of reports) {
      console.log(`   [${r.corpus}]`);
      console.log(`     Total repos indexed : ${r.totalRepos}`);
      console.log(`     Total chunks stored : ${r.totalChunks}`);
      console.log(`     Elapsed             : ${(r.elapsedMs / 1000).toFixed(1)}s`);
      console.log(`     Breakdown by repo:`);
      for (const [repo, count] of Object.entries(r.byRepo)) {
        console.log(`       • ${repo}: ${count} chunks`);
      }
      console.log();
    }
    console.log(chalk.green("───────────────────────────────────────────────\n"));
    return;
  }

  const validCorpora = Object.keys(CORPUS_REGISTRY) as CorpusId[];
  if (!validCorpora.includes(arg as CorpusId)) {
    console.error(
      chalk.red(
        `❌ Unknown corpus "${arg}". Valid: ${validCorpora.join(", ")}, all`
      )
    );
    process.exit(1);
  }

  const report = await ingestCorpus(arg as CorpusId);

  console.log(chalk.green("\n── Ingest Report ──────────────────────────────"));
  console.log(`   Corpus              : ${report.corpus}`);
  console.log(`   Total repos indexed : ${report.totalRepos}`);
  console.log(`   Total chunks stored : ${report.totalChunks}`);
  console.log(`   Elapsed             : ${(report.elapsedMs / 1000).toFixed(1)}s`);
  console.log(`   Breakdown by repo:`);
  for (const [repo, count] of Object.entries(report.byRepo)) {
    console.log(`     • ${repo}: ${count} chunks`);
  }
  console.log(chalk.green("───────────────────────────────────────────────\n"));
}

main().catch((err) => {
  console.error(chalk.red("❌ Ingest failed:"), err instanceof Error ? err.message : err);
  process.exit(1);
});
