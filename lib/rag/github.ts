import chalk from "chalk";
import { RAG_CONFIG } from "./config";

interface GitHubContentResponse {
  content: string;
  encoding: string;
  name: string;
  size: number;
}

/**
 * Fetcha il file AI_LOG.md da una repo GitHub via API.
 * Ritorna il contenuto decodificato o null se il file non esiste (404).
 */
export async function fetchAILog(
  owner: string,
  repo: string,
  branch: string
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${RAG_CONFIG.aiLogPath}?ref=${branch}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub API error for ${owner}/${repo}: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as GitHubContentResponse;

  if (data.encoding !== "base64") {
    throw new Error(
      `Unexpected encoding "${data.encoding}" for ${owner}/${repo}/AI_LOG.md`
    );
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");

  console.log(
    chalk.green(
      `✅ Fetched AI_LOG from ${owner}/${repo} (${decoded.length} chars)`
    )
  );

  return decoded;
}
