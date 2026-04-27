import { describe, expect, it } from "vitest";
import { CORPUS_REPOS } from "./config";
import { filterTargetRepos } from "./ingest";
import type { RepoTarget } from "./types";

describe("ingestCorpus targetRepos (filterTargetRepos)", () => {
  it("senza targetRepos, mantiene tutti i repo del corpus (es. ai_logs: 13)", () => {
    const all = CORPUS_REPOS.ai_logs;
    expect(filterTargetRepos(all, undefined)).toEqual(all);
    expect(all.length).toBe(13);
  });

  it("con targetRepos di 1 repo, mantiene solo quello", () => {
    const all = CORPUS_REPOS.ai_logs;
    const target: RepoTarget[] = [
      { owner: "soli92", repo: "casa-mia-be", branch: "main" },
    ];
    const filtered = filterTargetRepos(all, target);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual(target[0]);
  });

  it("con targetRepos di repo non in CORPUS_REPOS, ritorna lista vuota (nessun ingest)", () => {
    const all = CORPUS_REPOS.ai_logs;
    const r = filterTargetRepos(all, [
      { owner: "alien", repo: "stranger", branch: "main" },
    ]);
    expect(r).toEqual([]);
  });
});
