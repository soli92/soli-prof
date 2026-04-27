import { describe, it, expect } from "vitest";
import { EnvExampleChunkStrategy } from "./env-example";

describe("EnvExampleChunkStrategy", () => {
  const strategy = new EnvExampleChunkStrategy();

  const ctx = (filename: string) => ({
    repo: "soli-dm-be",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename,
  });

  const sample = `# ==================
# Database
# ==================
DATABASE_URL=postgresql://localhost:5432/db

# ==================
# Auth
# ==================
AUTH_SECRET=changeme
ADMIN_PASSWORD=changeme
`;

  it("matches .env.example, .env.sample, .env.template", () => {
    expect(strategy.matches(".env.example")).toBe(true);
    expect(strategy.matches("apps/api/.env.sample")).toBe(true);
    expect(strategy.matches(".env.template")).toBe(true);
    expect(strategy.matches(".env")).toBe(false);
  });

  it("estrae due gruppi (Database e Auth) da banner commentati", () => {
    const chunks = strategy.chunk(sample, ctx(".env.example"));
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const labels = chunks.map((c) => c.section);
    expect(labels.some((s) => s.includes("Database"))).toBe(true);
    expect(labels.some((s) => s.includes("Auth"))).toBe(true);
  });

  it("fallback su file senza separatori (singolo chunk)", () => {
    const flat = "NODE_ENV=development\nPORT=3000\n";
    const chunks = strategy.chunk(flat, ctx(".env.example"));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe(".env.example");
  });
});
