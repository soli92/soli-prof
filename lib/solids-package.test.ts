import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

describe("@soli92/solids", () => {
  it("package.json richiede ^1.14.1", () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["@soli92/solids"]).toBe("^1.14.1");
  });
});
