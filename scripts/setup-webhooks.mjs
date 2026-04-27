#!/usr/bin/env node
/**
 * One-shot script: configura il push webhook su 12 repo soli92.
 * Esegui con: GITHUB_TOKEN=... GITHUB_WEBHOOK_SECRET=... node scripts/setup-webhooks.mjs
 * 
 * NON committare valori di token o secret. Usa variabili d'ambiente.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

if (!GITHUB_TOKEN) {
  console.error("STOP: GITHUB_TOKEN non impostato.");
  process.exit(1);
}
if (!WEBHOOK_SECRET) {
  console.error("STOP: GITHUB_WEBHOOK_SECRET non impostato.");
  process.exit(1);
}

const REPOS = [
  "soli-agent",
  "casa-mia-be",
  "casa-mia-fe",
  "bachelor-party-claudiano",
  "solids",
  "soli-dm-be",
  "soli-dm-fe",
  "soli-dome",
  "pippify",
  "soli-platform",
  "koollector",
  "health-wand-and-fire",
];

const WEBHOOK_URL = "https://soli-prof.vercel.app/api/webhooks/github";

const results = [];

for (const repo of REPOS) {
  let status, body;

  try {
    const res = await fetch(`https://api.github.com/repos/soli92/${repo}/hooks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "soli-webhook-setup",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: WEBHOOK_URL,
          content_type: "json",
          secret: WEBHOOK_SECRET,
          insecure_ssl: "0",
        },
      }),
    });

    status = res.status;
    try { body = await res.json(); } catch { body = { error: "non-JSON" }; }
  } catch (err) {
    results.push({ repo, status: "ERR", outcome: `network error: ${err.message}`, hook_id: null });
    continue;
  }

  let outcome, hook_id = null;

  if (status === 201) {
    hook_id = body.id ?? null;
    outcome = "created";
  } else if (status === 422 && JSON.stringify(body).includes("Hook already exists")) {
    outcome = "already_exists";
  } else if (status === 401) {
    outcome = "401 unauthorized — STOPPED";
    results.push({ repo, status, outcome, hook_id });
    break;
  } else if (status === 404) {
    outcome = "404 not found / no permissions";
  } else if (status === 422) {
    const msg = body?.errors?.[0]?.message ?? body?.message ?? JSON.stringify(body).slice(0, 100);
    outcome = `422: ${msg}`;
  } else {
    const msg = body?.message ?? JSON.stringify(body).slice(0, 200);
    outcome = `error ${status}: ${msg}`;
  }

  results.push({ repo, status, outcome, hook_id });
}

// Report (nessun secret, nessun token)
console.log("\n=== WEBHOOK SETUP REPORT ===\n");
const header = "repo".padEnd(34) + "HTTP".padEnd(8) + "outcome".padEnd(32) + "hook_id";
console.log(header);
console.log("-".repeat(85));

for (const r of results) {
  const icon = r.outcome === "created" ? "✅" :
               r.outcome === "already_exists" ? "⏭️" : "❌";
  const hookDisplay = r.hook_id != null ? String(r.hook_id) : "-";
  const line =
    r.repo.padEnd(34) +
    String(r.status).padEnd(8) +
    (icon + " " + r.outcome).padEnd(35) +
    hookDisplay;
  console.log(line);
}

console.log("\nCompleted:", results.length, "repos processed.");
