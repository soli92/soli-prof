/**
 * Fetcher generico per file di testo da repository GitHub via REST API.
 * A differenza del vecchio lib/rag/github.ts, accetta un fileName come parametro
 * (così funziona sia per AI_LOG.md sia per AGENTS.md o altri file futuri).
 */

import { GitHubFetchError, MissingEnvError } from "./errors";

const GITHUB_API = "https://api.github.com";

function githubAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Lista i file in una directory GitHub via API contents.
 * Usato per glob tipo `.github/workflows/*.yml` (solo `*.ext` nella directory, non `**`).
 *
 * @param dirPath path directory relativo alla root (es. `.github/workflows`); stringa vuota = root repo
 * @param extensions estensioni da includere (es. `[".yml", ".yaml"]`)
 */
export async function listDirectoryFiles(
  owner: string,
  repo: string,
  branch: string,
  dirPath: string,
  extensions: string[]
): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new MissingEnvError("GITHUB_TOKEN");
  }

  const pathSegment =
    dirPath.length > 0
      ? dirPath
          .split("/")
          .map((seg) => encodeURIComponent(seg))
          .join("/")
      : "";
  const url =
    pathSegment.length > 0
      ? `${GITHUB_API}/repos/${owner}/${repo}/contents/${pathSegment}?ref=${encodeURIComponent(branch)}`
      : `${GITHUB_API}/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, {
    headers: githubAuthHeaders(token),
  });

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubFetchError(
      `${owner}/${repo}`,
      `listDirectoryFiles ${dirPath || "(root)"}: HTTP ${res.status}: ${body}`
    );
  }

  const items = (await res.json()) as Array<{ name: string; type: string }>;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item.type === "file")
    .map((item) => item.name)
    .filter((name) => extensions.some((ext) => name.endsWith(ext)));
}

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
