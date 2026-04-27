import { describe, it, expect } from "vitest";
import { PrismaSchemaChunkStrategy } from "./prisma-schema";

describe("PrismaSchemaChunkStrategy", () => {
  const strategy = new PrismaSchemaChunkStrategy();
  const ctx = {
    repo: "casa-mia-be",
    owner: "soli92",
    branch: "main",
    indexedAt: "2026-04-27",
    filename: "prisma/schema.prisma",
  };

  const sample = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id
  email String @unique
  posts Post[]
}

model Post {
  id       String @id
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}
`;

  it("matches path che termina con schema.prisma", () => {
    expect(strategy.matches("prisma/schema.prisma")).toBe(true);
    expect(strategy.matches("schema.prisma")).toBe(true);
    expect(strategy.matches("prisma/schema.prisma.backup")).toBe(false);
  });

  it("estrae generator, datasource e due model", () => {
    const chunks = strategy.chunk(sample, ctx);
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain("schema.prisma > generator client");
    expect(sections).toContain("schema.prisma > datasource db");
    expect(sections).toContain("schema.prisma > model User");
    expect(sections).toContain("schema.prisma > model Post");
    expect(chunks).toHaveLength(4);
  });

  it("fallback a un chunk se nessun blocco riconosciuto", () => {
    const prose = "// solo commenti\n// nessun modello\n";
    const chunks = strategy.chunk(prose, ctx);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("schema.prisma");
  });
});
