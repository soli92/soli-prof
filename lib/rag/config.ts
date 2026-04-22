export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
}

export const RAG_REPOS: RepoConfig[] = [
  { owner: "soli92", repo: "soli-agent", branch: "main" },
  { owner: "soli92", repo: "casa-mia-be", branch: "main" },
  { owner: "soli92", repo: "casa-mia-fe", branch: "main" },
  { owner: "soli92", repo: "bachelor-party-claudiano", branch: "main" },
  { owner: "soli92", repo: "solids", branch: "main" },
  { owner: "soli92", repo: "soli-prof", branch: "main" },
];

export const RAG_CONFIG = {
  embeddingModel: "voyage-3",
  embeddingDimensions: 1024,
  chunkMaxTokens: 1500,
  topK: 5,
  aiLogPath: "AI_LOG.md",
} as const;
