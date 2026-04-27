import { describe, it, expect } from "vitest";
import { GenericConfigChunkStrategy } from "./generic-config";

describe("GenericConfigChunkStrategy", () => {
  const strategy = new GenericConfigChunkStrategy();
  const ctx = {
    repo: "soli-prof",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename: "next.config.ts",
  };

  it("matches nomi standard next/vite/tailwind/postcss/playwright/vitest", () => {
    expect(strategy.matches("next.config.ts")).toBe(true);
    expect(strategy.matches("vite.config.ts")).toBe(true);
    expect(strategy.matches("tailwind.config.js")).toBe(true);
    expect(strategy.matches("vitest.config.ts")).toBe(true);
    expect(strategy.matches("webpack.config.js")).toBe(false);
  });

  it("produce un singolo chunk con header e corpo", () => {
    const body = `import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
`;
    const chunks = strategy.chunk(body, ctx);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("next.config.ts > config");
    expect(chunks[0].content).toContain("Configuration file: next.config.ts");
    expect(chunks[0].content).toContain("reactStrictMode");
  });

  it("truncation oltre 4000 caratteri", () => {
    const huge = "x".repeat(5000);
    const viteCtx = { ...ctx, filename: "vite.config.ts" };
    const chunks = strategy.chunk(huge, viteCtx);
    expect(chunks[0].section).toBe("vite.config.ts > config");
    expect(chunks[0].content.length).toBeLessThanOrEqual(4000);
    expect(chunks[0].content).toContain("[truncated]");
  });
});
