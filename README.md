# ⚡ Soli Prof

**Il tuo tutor personale per imparare AI engineering in pubblico.**

Soli Prof è un side-project di apprendimento AI engineering dove scopri, sperimenti e documenti il tuo percorso verso la padronanza dell'IA applicata allo sviluppo software. È costruito **completamente in pubblico** su GitHub: ogni settimana aggiungo feature, rifletto sui learnings e aggiorno la documentazione.

## Perché?

Come senior frontend developer, il salto verso AI engineering è complesso: non è solo saper usare un'API, ma capire prompt design, gestione contesto, tool use, RAG, fine-tuning. Questo progetto serve come **laboratorio pubblico** e **riferimento** per altri che affrontano lo stesso percorso.

## Stack

| Layer | Tech |
|-------|------|
| **Framework** | Next.js 16, TypeScript, React |
| **Styling** | Tailwind CSS + @soli92/solids (design system privato) |
| **AI/LLM** | Anthropic Claude Haiku 4.5 (streaming SSE) |
| **Deploy** | Vercel (web), future: Railway/Render per backend |
| **Database** | (Roadmap: Supabase per persistenza conversazionale) |

## Setup Locale

### 1. Prerequisiti
- Node.js **22+** (vedi `.nvmrc`)
- Token GitHub con scope `read:packages` per installare @soli92/solids da GitHub Packages

### 2. Clone e Installa

```bash
git clone https://github.com/soli92/soli-prof
cd soli-prof

# Esporta NPM_TOKEN PRIMA di npm install
export NPM_TOKEN="ghp_your_github_token_here"

npm install
```

**Come creare il GitHub token:**
1. Vai a [github.com/settings/tokens](https://github.com/settings/tokens)
2. Crea un **Personal Access Token (Fine-grained)**
3. Seleziona solo lo scope **`read:packages`**
4. Copia il token e salvalo in un posto sicuro
5. Nel terminale: `export NPM_TOKEN="ghp_xxx"`

Se npm install fallisce con 401 Unauthorized, il token non è impostato correttamente. Verifica che `NPM_TOKEN` sia visibile con `echo $NPM_TOKEN`.

### 3. Configura le Variabili d'Ambiente

```bash
cp .env.example .env.local
```

Compila `.env.local`:

```env
# Ottenere da https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Lo stesso token GitHub di cui sopra (opzionale in .env se già in shell)
NPM_TOKEN=ghp_...
```

### 4. Avvia lo Sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) — il tutor è pronto a chattare!

## Uso

1. **Home Page** (`/`): Chat interface minimale
2. **API Route** (`/api/chat`): Endpoint POST con streaming SSE
   - Body: `{ messages: Array<{ role: "user" | "assistant", content: string }> }`
   - Response: Server-Sent Events con chunk di testo (`data: {...}\n\n`)

### Esempio di Prompt

```
Come inizio a imparare il prompt design per LLM?
```

Il tutor risponderà in italiano, con risposte brevi, concrete e pratiche — evitando teoria astratta.

## Struttura del Progetto

```
soli-prof/
├── app/
│   ├── layout.tsx           # Root layout + metadati
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles (SoliDS + Tailwind)
│   └── api/
│       └── chat/
│           └── route.ts     # Streaming chat endpoint
├── components/
│   ├── chat-view.tsx        # Componente chat principale
│   └── message-bubble.tsx   # Bubble singolo messaggio
├── lib/
│   ├── anthropic.ts         # Client Anthropic helper
│   └── prompts.ts           # System prompt e utility
├── WEEKLY_LOG.md            # Documentazione settimanale
├── package.json
├── tsconfig.json
├── tailwind.config.ts       # Config Tailwind con SoliDS preset
├── .env.example
└── .npmrc                   # Registry config per GitHub Packages
```

## Roadmap

### Settimana 2-3
- [ ] Test suite con Playwright
- [ ] GitHub Actions: lint, type check, test su PR
- [ ] Deploy automatico su Vercel

### Settimana 4-6
- [ ] Memoria conversazionale: Supabase + sessioni utente
- [ ] Rich messages: markdown, code syntax highlighting
- [ ] Theme selector (light/dark con next-themes)

### Settimana 7+
- [ ] Tool use: esecuzione sandbox code (`/api/sandbox`)
- [ ] RAG: indexing docs personali (blog, notes)
- [ ] Context window optimization
- [ ] Analytics e metrics learnings
- [ ] Blog pubblico per documentare insights settimanali

## Comandi Principali

```bash
npm run dev           # Avvia dev server su :3000
npm run build         # Build production
npm run start         # Start production server
npm run lint          # ESLint
npm run type-check    # TypeScript check
```

## Live Demo

🚀 **Coming soon**: Vercel deployment  
📚 **Blog**: (placeholder per futuri articoli)

## Design System: @soli92/solids

Questo progetto usa il **design system personale** `@soli92/solids` (GitHub Packages):
- Token CSS variables (`--sd-color-*`, `--sd-space-*`, ecc.)
- Preset Tailwind completamente allineato
- Temi light/dark/custom disponibili
- Documentazione: [github.com/soli92/solids](https://github.com/soli92/solids)

## Contributi & Feedback

Questo è un progetto personale pubblico. Se hai feedback, correzioni o idee:
1. Apri una GitHub Issue
2. Fai un fork e PR per piccole correzioni
3. Contattami via GitHub Discussions (quando saranno attive)

## License

MIT © [soli92](https://github.com/soli92)

---

**Ultimo aggiornamento**: Settimana 1, Aprile 2026  
**Prossimo update**: Weekly log + feature sprint
