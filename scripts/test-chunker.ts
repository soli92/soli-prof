/**
 * Esegui dalla root del repo:
 *   npx tsx scripts/test-chunker.ts
 *
 * Opzionale: passa un file markdown come argomento per chunkarlo.
 *   npx tsx scripts/test-chunker.ts path/to/file.md
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chunkMarkdown } from "../lib/rag-service/chunker";

const meta = {
  repo: "local-test",
  owner: "soli92",
  branch: "main",
  indexedAt: new Date().toISOString(),
};

const sample = `## Problemi tecnici risolti (inferiti)

Questi sono i problemi che ho affrontato durante lo sviluppo.

1. **Compatibilità ESM vs require**: ${"a".repeat(52)}
2. **Pooler Supabase**: ${"b".repeat(52)}
3. **CORS multi-origine**: ${"c".repeat(52)}`;

const mdPath = process.argv[2];
const markdown = mdPath
  ? readFileSync(resolve(process.cwd(), mdPath), "utf-8")
  : sample;

const chunks = chunkMarkdown(markdown, meta);

console.log(JSON.stringify({ count: chunks.length, chunks }, null, 2));
