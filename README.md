# 🎓 Soli Prof

**Soli Prof** è il mio tutor personale AI per imparare **AI engineering in pubblico**.

Uno spazio dove documento il percorso di apprendimento: come funzionano i modelli LLM, prompt engineering, RAG, fine-tuning, valutazione dei risultati, e tutto ciò che serve per costruire applicazioni AI solide.

## Perché?

Come senior frontend developer, voglio acquisire **expertise pratica** su AI engineering senza leggere solo teoria. Questo progetto è un learning journal pubblico dove costruisco, sperimento e documento le settimane di apprendimento.

Chiunque può usare lo stesso setup per avere il proprio tutor personale.

## Stack

| Layer | Tecnologia |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **UI** | Tailwind CSS + `@soli92/solids` **^1.14.1** (token / preset + brand assets); font Google (Inter, DM Sans, JetBrains Mono, famiglie tema) in `app/layout.tsx` |
| **LLM** | Anthropic Claude Haiku 3.5 (streaming SSE) |
| **Hosting** | Vercel |

## Setup locale

### 1. Prerequisiti

- **Node.js 22+** (verifica con `node --version`)
- **npm 10+** (verifica con `npm --version`)

### 2. Clona il repo

```bash
git clone https://github.com/soli92/soli-prof
cd soli-prof
```

### 3. Installa le dipendenze

`@soli92/solids` è un pacchetto **pubblico su npm**: nessun token necessario.

```bash
npm install
```

### 4. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
```

Compila `.env.local` partendo da **`.env.example`** (Anthropic, Supabase/Voyage se usi RAG, `RAG_API_KEY`, e **`ADMIN_PAGE_PASSWORD`** se usi **`/admin`** in locale).

Minimo solo chat:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Come ottenere `ANTHROPIC_API_KEY`:**
- Vai su [console.anthropic.com](https://console.anthropic.com)
- Settings → API Keys → Crea una nuova chiave
- Copia il valore in `.env.local`

### 5. Avvia il dev server

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## Uso

Scrivi nella chat e riceverai risposte dal tutor personale. Le risposte sono:

- **Pratiche**: focus su codice e esempi reali, non teoria astratta
- **Brevi**: niente risposte lunghe (chiedi di approfondire se serve)
- **In italiano**: tono cordiale e supportivo
- **Contestuali**: il tutor conosce il tuo background (senior frontend) e adatta la spiegazione

## Branding e PWA

- Header chat/admin e stati di caricamento usano il logo Soli (`components/ui/logo-loader.tsx`) con variante automatica in base al tema.
- Metadata e head sono allineati agli asset SoliDS (`app/layout.tsx`) con Open Graph image, favicon, apple-touch-icon e manifest.
- Manifest PWA generato da `app/manifest.ts` (`/manifest.webmanifest`) usando i brand assets pubblici di `@soli92/solids`.

## Progetti e settimanali

### Stato attuale

- **Settimana 1** ✅ — Setup iniziale, primo scaffold con Soli Agent, deploy su Vercel

### Roadmap

- **Settimana 2** → Prompt engineering: tecniche di base (zero-shot, few-shot, chain-of-thought)
- **Settimana 3** → RAG: retrieval-augmented generation con embedding locali
- **Settimana 4** → Fine-tuning: creare dataset e fine-tunare modelli piccoli
- **Settimana 5** → Evaluazione: metriche per valutare output LLM

Dettagli: vedi [WEEKLY_LOG.md](./WEEKLY_LOG.md).

## RAG (knowledge base)

Il tutor può attingere a contesto da **Supabase + pgvector**: ingest da repository GitHub in **`lib/rag-service/config.ts`** (`CORPUS_REPOS`), con tre corpus — **`ai_logs`** (`AI_LOG.md`), **`agents_md`** (`AGENTS.md`), **`repo_configs`** (file di configurazione tipo `package.json`, workflow, ecc.) — tra cui progetti come `soli-agent`, `solids`, `soli-prof` e **health-wand-and-fire** (shooter arcade).

La **chat principale** (`POST /api/chat`) recupera in parallelo dai tre corpus e fonde i risultati con **Reciprocal Rank Fusion (RRF)** (`lib/rag-service/query.ts`, funzione **`queryMultipleCorpora`**), così da bilanciare ranking tra corpora di dimensioni diverse. L’endpoint **`POST /api/rag/query`** resta su **un corpus alla volta** (`queryCorpus`), utile per strumenti esterni.

Dopo ogni modifica all’elenco repo, eseguire `npm run rag:ingest` (o ingest da `/admin` in locale) e verificare variabili `VOYAGE_*`, `SUPABASE_*`, `GITHUB_TOKEN` come in `AGENTS.md` e `.env.example`.

### Re-ingest su push (webhook GitHub)

Con **`GITHUB_WEBHOOK_SECRET`** configurato su Vercel, l’API **`POST /api/webhooks/github`** riceve gli eventi `push` dai repository in **CORPUS** (tredici in tutto, inclusi **soli-prof** e i dodici elencati in `scripts/setup-webhooks.sh` su GitHub: `soli-agent`, `casa-mia-be`, `casa-mia-fe`, `bachelor-party-claudiano`, `solids`, `soli-dm-be`, `soli-dm-fe`, `soli-dome`, `pippify`, `soli-platform`, `koollector`, `health-wand-and-fire`). La firma **`X-Hub-Signature-256`** viene verificata; parte un **re-ingest selettivo** in background (i dettagli sono in **`AGENTS.md`**, sezione *POST /api/webhooks/github*). Per **creare** o ripristinare i webhook sull’org serve uno script con PAT (`admin:repo_hook`): vedi `scripts/setup-webhooks.sh` e le variabili d’ambiente in **`AGENTS.md`**.

## Tecnologie principali

### Next.js 16 + TypeScript

- App Router (server/client components)
- API routes (POST `/api/chat`)
- Streaming SSE per risposta in tempo reale

### Tailwind CSS + SoliDS

- Design system allineato a token semantici (`--sd-color-*`, `--sd-space-*`, ecc.)
- Tema light/dark automatico
- Componenti riusabili

### Anthropic Claude Haiku 3.5

- Modello veloce, leggero, economico per tutor interattivo
- Streaming per UX fluida
- System prompt ottimizzato per insegnamento pratico
- Generative UI (tool `show_tutor_focus_card`): vedi `docs/generative-ui.md`

## Architettura

```
soli-prof/
├── app/
│   ├── admin/page.tsx         # Area admin (re-ingest KB) — richiede ADMIN_PAGE_PASSWORD
│   ├── api/
│   │   ├── chat/route.ts      # Chat streaming + RAG + NDJSON Generative UI (tools da lib/generative-ui)
│   │   ├── admin/verify-password/route.ts
│   │   └── rag/
│   │       ├── query, ingest, ingest-stream   # RAG HTTP (+ SSE progress su ingest-stream)
│   ├── page.tsx               # Chat principale
│   ├── layout.tsx             # Metadati e setup
│   └── globals.css            # Stili globali
├── components/
│   ├── chat-view.tsx          # Chat (SSE, indicator, sources, NDJSON Generative UI)
│   ├── generative-ui/         # AssistantMessage, TutorFocusCard, mount tool
│   ├── admin/                  # Pannello ingest + progress repo
│   └── message-bubble.tsx     # Bubble messaggi
├── hooks/
│   └── use-ingest-stream.ts   # Client SSE verso ingest-stream (cookie)
├── lib/
│   ├── admin-session.ts       # Sessioni cookie admin (server)
│   ├── rag-service/           # Multi-corpus ingest/query
│   ├── generative-ui/         # Registry render tool + protocollo NDJSON stream
│   ├── anthropic.ts           # Client Anthropic
│   └── prompts.ts             # System prompt del tutor
├── package.json               # Dependencies
├── tailwind.config.ts         # Preset @soli92/solids
└── tsconfig.json              # TypeScript config
```

## Sviluppo

```bash
# Dev server
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Test unitari (Vitest — rag-service, RRF, admin-session con note env in AGENTS.md, hooks, webhook)
npm test

# Lint
npm run lint
```

## Deploy su Vercel

Il repo è pronto per il deploy automatico su Vercel.

### Opzione 1: Connetti GitHub (consigliato)

1. Vai su [vercel.com](https://vercel.com)
2. Connetti il tuo account GitHub
3. Seleziona il repo `soli-prof`
4. Aggiungi le variabili d'ambiente nel dashboard:
   - `ANTHROPIC_API_KEY`
5. Deploy automatico su ogni push a `main`

### Opzione 2: Deploy da CLI

```bash
npm i -g vercel
vercel --prod
```

**URL live:** [soli-prof.vercel.app](https://soli-prof.vercel.app) (quando deployato)

## Licenza

MIT © [soli92](https://github.com/soli92)

---

## Note di sviluppo

Questo progetto è costruito per imparare in pubblico. Il codice, le note e le sperimentazioni sono documentati nel repo e nei log settimanali. Feedback e pull request sono benvenuti!

**Contatti:**
- GitHub: [@soli92](https://github.com/soli92)
- Portfolio: [soli92.dev](https://soli92.dev) (futuri aggiornamenti)
