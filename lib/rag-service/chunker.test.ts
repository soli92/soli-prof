import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "./chunker";

const meta = {
  repo: "demo-repo",
  owner: "soli92",
  branch: "main",
  indexedAt: "2026-04-24T12:00:00.000Z",
};

describe("chunkMarkdown", () => {
  it("returns [] for empty or whitespace-only markdown", () => {
    expect(chunkMarkdown("", meta)).toEqual([]);
    expect(chunkMarkdown("   \n\t", meta)).toEqual([]);
  });

  it("labels leading body as Intro before any heading", () => {
    const chunks = chunkMarkdown("Hello\n\nworld", meta);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("Intro");
    expect(chunks[0].content).toContain("Hello");
    expect(chunks[0].repo).toBe("demo-repo");
  });

  it("starts a new chunk at ## and uses h2 title as section", () => {
    const md = "## Sezione A\nContenuto A.\n## Sezione B\nContenuto B.";
    const chunks = chunkMarkdown(md, meta);
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain("Sezione A");
    expect(sections).toContain("Sezione B");
    expect(chunks.find((c) => c.section === "Sezione A")?.content).toContain("Contenuto A");
  });

  it("nests ### under ## in section path", () => {
    const md = "## Padre\n### Figlio\ntesto";
    const chunks = chunkMarkdown(md, meta);
    const child = chunks.find((c) => c.section.includes("Figlio"));
    expect(child).toBeDefined();
    expect(child!.section).toMatch(/Padre/);
    expect(child!.section).toMatch(/Figlio/);
    expect(child!.content).toContain("testo");
  });

  it("copies chunker metadata into chunk.metadata", () => {
    const [c] = chunkMarkdown("## S\nx", meta);
    expect(c.metadata).toMatchObject({
      repo: "demo-repo",
      owner: "soli92",
      branch: "main",
      indexedAt: meta.indexedAt,
    });
  });

  it("splits oversized sections using maxChars and paragraph boundaries", () => {
    const block = "word ".repeat(40).trim();
    const md = `## Big\n${block}\n\n${block}`;
    const chunks = chunkMarkdown(md, meta, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.section === "Big")).toBe(true);
  });

  it("produces stable ids for same repo, section, and content", () => {
    const md = "## A\nbody";
    const a = chunkMarkdown(md, meta);
    const b = chunkMarkdown(md, meta);
    expect(a[0].id).toBe(b[0].id);
  });

  it("sezione senza lista resta chunk unico", () => {
    const md =
      "## Risoluzione CORS\n\nParagrafo esplicativo senza elenco puntato.\n\nAltro testo.";
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("Risoluzione CORS");
    expect(chunks[0].content).toContain("Paragrafo esplicativo");
  });

  it("sezione con 2 bullet lunghi NON viene splittata (sotto soglia 3)", () => {
    const long = "x".repeat(55);
    const md = `## Due soli\n\n- ${long}\n- ${long}`;
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("- ");
  });

  it("sezione con 5 bullet lunghi VIENE splittata in 5 chunk con preambolo", () => {
    const b1 = "1. **Compatibilità ESM vs require**: " + "y".repeat(52);
    const b2 = "2. **Pooler Supabase**: " + "z".repeat(52);
    const b3 = "3. **CORS multi-origine**: " + "w".repeat(52);
    const b4 = "4. **Schema Prisma**: " + "v".repeat(52);
    const b5 = "5. **Deploy Render**: " + "u".repeat(52);
    const md = `## Problemi tecnici risolti (inferiti)

Questi sono i problemi che ho affrontato durante lo sviluppo.

${b1}
${b2}
${b3}
${b4}
${b5}`;
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(5);
    for (let n = 1; n <= 5; n++) {
      const c = chunks[n - 1];
      expect(c.section).toBe(`Problemi tecnici risolti (inferiti) > Item ${n}`);
      expect(c.content).toContain("Problemi tecnici risolti (inferiti)");
      expect(c.content).toContain("Questi sono i problemi");
      expect(c.content).toContain(`${n}.`);
    }
  });

  it("sezione con bullet misti (alcuni <50 char) NON viene splittata", () => {
    const long = "Lungo abbastanza per superare i cinquanta caratteri minimi qui. Fine.";
    const md = `## Mix

- corto
- ${long}
- ${long}
- ${long}`;
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("Mix");
  });

  it("section del chunk splittato usa formato 'Heading > Item N'", () => {
    const item = (n: number, body: string) => `${n}. **T${n}**: ${body}`;
    const body = "p".repeat(50);
    const md = `## Solo lista

${item(1, body)}
${item(2, body)}
${item(3, body)}`;
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.section)).toEqual([
      "Solo lista > Item 1",
      "Solo lista > Item 2",
      "Solo lista > Item 3",
    ]);
  });

  it("preambolo è troncato se supera MAX_PREAMBLE_CHARS (300)", () => {
    const preamble = "P".repeat(350);
    const body = "q".repeat(50);
    const md = `## Tronc

${preamble}

1. **Uno**: ${body}
2. **Due**: ${body}
3. **Tre**: ${body}`;
    const chunks = chunkMarkdown(md, meta);
    expect(chunks).toHaveLength(3);
    const preamblePart = chunks[0].content.split("\n\n")[1];
    expect(preamblePart).toBe("P".repeat(300));
  });

  it("lista ordered (1. 2. 3.) e unordered (-) sono riconosciute", () => {
    const b = "b".repeat(50);
    const ordered = `## O\n\n1. a ${b}\n2. c ${b}\n3. e ${b}`;
    const co = chunkMarkdown(ordered, meta);
    expect(co).toHaveLength(3);
    expect(co[0].content).toMatch(/^O\n\n1\. a/);

    const unordered = `## U\n\n- x ${b}\n- y ${b}\n- z ${b}`;
    const cu = chunkMarkdown(unordered, meta);
    expect(cu).toHaveLength(3);
    expect(cu[1].content).toContain("- y");
  });

  it("item lungo oltre maxChars viene ancora spezzato da splitByParagraphs", () => {
    const para = "w ".repeat(200).trim();
    const body = `${para}\n\n${para}`;
    const md = `## Big items

1. **A**: ${body}
2. **B**: ${"t".repeat(50)}
3. **C**: ${"u".repeat(50)}`;
    const chunks = chunkMarkdown(md, meta, 120);
    const item1Chunks = chunks.filter((c) => c.section.includes("Item 1"));
    expect(item1Chunks.length).toBeGreaterThan(1);
    expect(item1Chunks.every((c) => c.section === "Big items > Item 1")).toBe(true);
    // splitByParagraphs spezza su \n\n; il primo pezzo può includere heading+preambolo e superare maxChars
    expect(item1Chunks.some((c) => c.content.length <= 120)).toBe(true);
  });
});
