import chalk from "chalk";
import { RAG_CONFIG } from "./config";

interface GitHubContentsResponse {
  content: string;
  encoding: string;
  name: string;
  size: number;
}

/**
 * Fetches AI_LOG.md from a GitHub repo via the Contents API.
 * Returns the decoded markdown string, or null if the file does not exist.
 */
export async function fetchAILog(
  owner: string,
  repo: string,
  branch: string
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. Add it to your environment variables."
    );
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${RAG_CONFIG.aiLogPath}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub API error for ${owner}/${repo}: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as GitHubContentsResponse;

  if (json.encoding !== "base64") {
    throw new Error(
      `Unexpected encoding "${json.encoding}" for ${owner}/${repo}/${RAG_CONFIG.aiLogPath}`
    );
  }

  const decoded = Buffer.from(json.content, "base64").toString("utf-8");

  console.log(
    chalk.green(
      `✓ Fetched AI_LOG from ${owner}/${repo} (${decoded.length} chars)`
    )
  );

  return decoded;
}
