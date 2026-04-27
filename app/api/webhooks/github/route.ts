/**
 * GitHub webhook handler per re-ingest automatico.
 *
 * Configurato in ognuno dei 13 repo monitorati come webhook su push events.
 * Verifica HMAC, parsa il payload, determina quali corpus reindicizzare
 * in base ai file cambiati, e triggera ingestCorpus selettivo.
 *
 * Pattern: ingest sincrono con await prima della risposta 200 (serverless
 * Vercel termina la function al return; fire-and-forget non completava).
 * GitHub timeout webhook 10s con retry; idempotenza upsert su ingest.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  ingestCorpus,
  CORPUS_REPOS,
  DEFAULT_CONFIG_SOURCES,
} from "@/lib/rag-service";
import type { CorpusId, RepoTarget } from "@/lib/rag-service";

export const maxDuration = 60; // Vercel: fino a 60s per ingest prima della risposta

/**
 * Verifica firma HMAC del payload GitHub.
 * Header X-Hub-Signature-256 contiene "sha256=<hex_digest>".
 * Confronto timing-safe per evitare timing attack.
 */
function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const providedSig = signatureHeader.slice("sha256=".length);
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Timing-safe equal richiede buffer di stessa lunghezza
  const provided = Buffer.from(providedSig, "hex");
  const expected = Buffer.from(expectedSig, "hex");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Determina quali corpus reindicizzare in base ai file cambiati.
 */
function corporaToReindex(changedFiles: string[]): CorpusId[] {
  const corpora = new Set<CorpusId>();

  for (const file of changedFiles) {
    // ai_logs: AI_LOG.md alla root
    if (file === "AI_LOG.md") {
      corpora.add("ai_logs");
      continue;
    }

    // agents_md: AGENTS.md alla root
    if (file === "AGENTS.md") {
      corpora.add("agents_md");
      continue;
    }

    // repo_configs: matcha pattern in DEFAULT_CONFIG_SOURCES
    for (const source of DEFAULT_CONFIG_SOURCES) {
      if (matchesPattern(file, source.pattern)) {
        corpora.add("repo_configs");
        break;
      }
    }
  }

  return Array.from(corpora);
}

/**
 * Match semplice pattern→file (literal o glob *.ext).
 * Coerente con expandSourcePattern in ingest.ts.
 */
function matchesPattern(file: string, pattern: string): boolean {
  if (pattern === file) return true;

  if (pattern.includes("*")) {
    // Solo glob "*.ext" supportato
    const lastSlash = pattern.lastIndexOf("/");
    const dirPattern = lastSlash === -1 ? "" : pattern.slice(0, lastSlash);
    const namePattern = lastSlash === -1 ? pattern : pattern.slice(lastSlash + 1);

    if (!namePattern.startsWith("*")) return false;
    const extension = namePattern.slice(1);

    const fileLastSlash = file.lastIndexOf("/");
    const fileDir = fileLastSlash === -1 ? "" : file.slice(0, fileLastSlash);
    const fileName = fileLastSlash === -1 ? file : file.slice(fileLastSlash + 1);

    return fileDir === dirPattern && fileName.endsWith(extension);
  }

  return false;
}

/**
 * Verifica se un (owner, repo) è monitorato in almeno un corpus.
 */
function isMonitoredRepo(owner: string, repo: string): boolean {
  const corpora = Object.keys(CORPUS_REPOS) as CorpusId[];
  return corpora.some((c) =>
    CORPUS_REPOS[c].some((r) => r.owner === owner && r.repo === repo)
  );
}

export async function POST(req: NextRequest) {
  // Lettura raw body per HMAC (Next 16: req.text() funziona con App Router)
  const rawBody = await req.text();

  // Verifica firma
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] GITHUB_WEBHOOK_SECRET non configurato");
    return NextResponse.json(
      { error: "webhook handler not configured" },
      { status: 500 }
    );
  }

  const signatureHeader = req.headers.get("x-hub-signature-256");
  if (!verifyGitHubSignature(rawBody, signatureHeader, secret)) {
    console.warn("[webhook] firma HMAC invalida o assente");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Parsing payload
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Type guard del payload (interessati solo a push event)
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("ref" in payload) ||
    !("repository" in payload) ||
    !("commits" in payload)
  ) {
    // Probabilmente ping event o altro: rispondi 200 (non vogliamo retry)
    return NextResponse.json({ status: "ignored", reason: "not a push event" });
  }

  const p = payload as {
    ref: string;
    repository: { owner: { login: string }; name: string };
    commits: Array<{
      added?: string[];
      modified?: string[];
      removed?: string[];
    }>;
  };

  // Solo push a main
  if (p.ref !== "refs/heads/main") {
    return NextResponse.json({
      status: "ignored",
      reason: `branch ${p.ref} not monitored`,
    });
  }

  const owner = p.repository.owner.login;
  const repo = p.repository.name;

  // Solo repo monitorati
  if (!isMonitoredRepo(owner, repo)) {
    return NextResponse.json({
      status: "ignored",
      reason: `repo ${owner}/${repo} not monitored`,
    });
  }

  // Aggrega tutti i file cambiati nei commit
  const changedFiles = new Set<string>();
  for (const commit of p.commits) {
    for (const f of commit.added ?? []) changedFiles.add(f);
    for (const f of commit.modified ?? []) changedFiles.add(f);
    for (const f of commit.removed ?? []) changedFiles.add(f);
  }

  // Determina corpus
  const corpora = corporaToReindex(Array.from(changedFiles));

  if (corpora.length === 0) {
    return NextResponse.json({
      status: "ignored",
      reason: "no monitored files changed",
      files: Array.from(changedFiles).slice(0, 10),
    });
  }

  const target: RepoTarget = { owner, repo, branch: "main" };

  // Ingest SINCRONO prima di rispondere. Pattern fire-and-forget
  // non funziona su Vercel serverless (function killata al return).
  // GitHub webhook timeout: 10s. Per repo singolo tipicamente staiamo
  // sotto i 7s. Se sforiamo, GitHub ritenta — idempotenza upsert
  // garantisce no double-ingest.
  const ingestResults = await Promise.allSettled(
    corpora.map((corpus) =>
      ingestCorpus(corpus, { targetRepos: [target] })
    )
  );

  const successes = ingestResults.filter((r) => r.status === "fulfilled").length;
  const failures = ingestResults
    .map((r, i) => ({ corpus: corpora[i], result: r }))
    .filter((x) => x.result.status === "rejected");

  if (failures.length > 0) {
    for (const { corpus, result } of failures) {
      console.error(
        `[webhook] ingest failed corpus=${corpus} repo=${owner}/${repo}:`,
        (result as PromiseRejectedResult).reason
      );
    }
  }

  return NextResponse.json({
    status: "completed",
    repo: `${owner}/${repo}`,
    corpora,
    filesChanged: changedFiles.size,
    ingestSummary: {
      total: corpora.length,
      succeeded: successes,
      failed: failures.length,
    },
  });
}
