/**
 * Fetcher generico per file di testo da repository GitHub via REST API.
 * A differenza del vecchio lib/rag/github.ts, accetta un fileName come parametro
 * (così funziona sia per AI_LOG.md sia per AGENTS.md o altri file futuri).
 */

import { GitHubFetchError, MissingEnvError } from "./errors";

const GITHUB_API = "https://api.github.com";

export async function fetchTextFile(
  owner: string,
  repo: string,
  branch: string,
  fileName: string
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new MissingEnvError("GITHUB_TOKEN");
  }

  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${fileName}?ref=${branch}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) {
    return null; // file non esiste in questo repo — non è un errore
  }

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubFetchError(`${owner}/${repo}`, `GitHub API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding !== "base64") {
    throw new GitHubFetchError(`${owner}/${repo}`, `Unexpected encoding: ${data.encoding}`);
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}
