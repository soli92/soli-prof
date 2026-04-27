/**
 * ONE-SHOT admin endpoint: configura il push webhook su 12 repo soli92.
 * Protetto da ADMIN_PAGE_PASSWORD (header X-Admin-Password).
 * DA ELIMINARE dopo l'uso.
 *
 * POST /api/admin/setup-webhooks
 * Header: X-Admin-Password: <ADMIN_PAGE_PASSWORD>
 */

import { NextResponse } from "next/server";

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

interface HookResult {
  repo: string;
  status: number | string;
  outcome: string;
  hook_id: number | null;
}

export async function POST(request: Request) {
  // Auth check
  const adminPassword = request.headers.get("X-Admin-Password");
  if (!adminPassword || adminPassword !== process.env.ADMIN_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!githubToken) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ error: "GITHUB_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const results: HookResult[] = [];

  for (const repo of REPOS) {
    let status: number | string;
    let body: Record<string, unknown>;

    try {
      const res = await fetch(`https://api.github.com/repos/soli92/${repo}/hooks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
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
            secret: webhookSecret,
            insecure_ssl: "0",
          },
        }),
      });

      status = res.status;
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = { error: "non-JSON response" };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ repo, status: "ERR", outcome: `network error: ${message}`, hook_id: null });
      continue;
    }

    let outcome: string;
    let hook_id: number | null = null;

    if (status === 201) {
      hook_id = typeof body.id === "number" ? body.id : null;
      outcome = "created";
    } else if (status === 422 && JSON.stringify(body).includes("Hook already exists")) {
      outcome = "already_exists";
    } else if (status === 401) {
      results.push({ repo, status, outcome: "401 unauthorized — STOPPED", hook_id: null });
      break;
    } else if (status === 404) {
      outcome = "404 not found / no permissions";
    } else if (status === 422) {
      const errors = body.errors as Array<{ message?: string }> | undefined;
      const msg = errors?.[0]?.message ?? (body.message as string) ?? JSON.stringify(body).slice(0, 100);
      outcome = `422: ${msg}`;
    } else {
      const msg = (body.message as string) ?? JSON.stringify(body).slice(0, 200);
      outcome = `error ${status}: ${msg}`;
    }

    results.push({ repo, status, outcome, hook_id });

    // Stop on auth failure
    if (typeof status === "number" && status === 401) break;
  }

  // Return report (no secrets, no tokens in response)
  return NextResponse.json({
    processed: results.length,
    results: results.map((r) => ({
      repo: r.repo,
      http_status: r.status,
      outcome: r.outcome,
      hook_id: r.hook_id,
    })),
  });
}
