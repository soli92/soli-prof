# 🤖 AGENTS.md — Operative Context for AI Assistants

**Soli Prof** è un'applicazione web per learning AI engineering. Questo documento descrive l'architettura, le convenzioni e il contesto operativo per assistenti AI (Cursor, Soli Agent, altri).

## Panoramica progetto

### Cos'è?
Un **AI tutor personale** che risponde a domande di apprendimento con risposte:
- Brevi, concrete, pratiche
- In italiano
- Con esempi di codice e percorsi step-by-step
- Non teoriche o lunghe

### Stack tecnico

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16, React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 + `@soli92/solids` **^1.14.1** preset + brand assets; font stack in `app/layout.tsx` |
| **Backend** | Next.js API routes (streaming SSE) |
| **LLM** | Anthropic Claude Haiku 3.5 |
| **Deployment** | Vercel (automatico da `main`) |

### Repo GitHub
- **Owner**: soli92
- **Visibility**: Pubblica
- **Branch principale**: `main`
- **URL**: https://github.com/soli92/soli-prof
- **Docs**: README.md, WEEKLY_LOG.md, AI_LOG.md (memoria sviluppo AI-assisted), AGENTS.md, AGENT.md (redirect)

---

## Struttura directory

```
soli-prof/
├── app/
│   ├── admin/
│   │   └── page.tsx               # /admin — gate password + IngestPanel (re-ingest KB)
│   ├── api/
│   │   ├── admin/
│   │   │   └── verify-password/route.ts  # POST — verifica ADMIN_PAGE_PASSWORD, cookie sp_admin_session
│   │   ├── chat/
│   │   │   └── route.ts           # POST /api/chat — streaming SSE (RAG cross-corpus RRF via queryMultipleCorpora → lib/rag-service)
│   │   ├── rag/
│   │   │   ├── query/route.ts     # POST /api/rag/query — retrieval multi-corpus (x-api-key)
│   │   │   ├── ingest/route.ts    # POST /api/rag/ingest — indicizzazione sync (x-api-key + x-admin-confirm)
│   │   │   └── ingest-stream/route.ts  # POST SSE — stesso ingest con eventi per-repo (cookie admin OPPURE x-api-key)
│   │   └── webhooks/
│   │       └── github/
│   │           ├── route.ts        # POST — evento push GitHub, HMAC, re-ingest selettivo (fire-and-forget)
│   │           └── route.test.ts     # Vitest — firma, corpora, path workflow
│   ├── page.tsx                   # Pagina home (chat)
│   ├── layout.tsx                 # Root layout + metadati
│   └── globals.css                # Stili globali
├── components/
│   ├── admin/                     # UI ingest: ingest-panel, phase-indicator, repo-progress-row
│   ├── chat-view.tsx              # Componente chat (state, SSE, ProcessingIndicator, sources)
│   ├── message-bubble.tsx         # Visualizzazione messaggi
│   ├── processing-indicator.tsx   # Fasi searching / writing (anti-flicker)
│   └── source-badges.tsx          # Badge sorgenti RAG post-risposta
├── hooks/
│   └── use-ingest-stream.ts       # Client: fetch POST + parse SSE ingest; stato per corpus (`corpusRuns`) + derivati
├── lib/
│   ├── admin-session.ts           # Sessioni in-memory + cookie httpOnly (TTL 1h)
│   ├── anthropic.ts               # Client Anthropic (init, config)
│   ├── prompts.ts                 # System prompt del tutor (+ variant RAG)
│   ├── rag/                       # Modulo RAG legacy (non usato dalla chat principale; retain per riferimento)
│   └── rag-service/               # Modulo RAG multi-corpus (ingest, query, onProgress SSE, barrel index.ts)
├── public/                        # Assets statici (favicon, ecc.)
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions → Vercel (auto)
├── scripts/
│   ├── rag-ingest.ts              # CLI `npm run rag:ingest`
│   ├── setup-webhooks.sh          # Ops: registra webhook `push` sui repo in CORPUS_REPOS ( `GITHUB_PAT` + `GITHUB_WEBHOOK_SECRET` )
│   ├── chunker-dryrun.ts          # Dry-run chunker
│   └── test-chunker.ts
├── .env.example                   # Variabili d'ambiente template
├── .npmrc                         # NPM config (registry npmjs.org)
├── .nvmrc                         # Node.js version (22)
├── package.json                   # Dipendenze, script
├── tsconfig.json                  # TypeScript config
├── tailwind.config.ts             # Tailwind + preset SoliDS
├── postcss.config.mjs             # PostCSS (Tailwind, autoprefixer)
├── next.config.ts                 # Next.js config
├── README.md                       # Documentazione progetto
├── WEEKLY_LOG.md                  # Log settimanale apprendimento
├── AGENTS.md                       # Questo file (contesto operativo principale)
├── AGENT.md                        # Punta qui → AGENTS.md (alias nome singolare)
├── AI_LOG.md                      # Memoria sviluppo AI-assisted
├── vitest.config.ts               # Unit test (lib/**/*.test.ts, hooks/**/*.test.ts)
└── LICENSE                        # MIT License
```

---

## Convenzioni di codice

### File naming
- **Server**: `.ts` (Node.js APIs, lib)
- **Client**: `.tsx` per componenti React, `.ts` per utility client-side
- **Directorio**: kebab-case (`chat-view.tsx`, `message-bubble.tsx`)

### TypeScript
- Rigorosamente `strict: true` in `tsconfig.json`
- Tipi espliciti per funzioni (params + return)
- Interfacce per dati ricorrenti (es. `ChatMessage`)

### React + Next.js
- **App Router** (new style)
- `"use client"` su componenti interattivi
- Server components di default
- CSS modules o Tailwind (no styled-components)

### Tailwind CSS
- Classi Tailwind inline (niente @ in componenti)
- Quando disponibile, usare token SoliDS (`--sd-color-*`, `--sd-space-*`, ecc.)
- Responsive: `md:`, `lg:` per breakpoint (mobile-first)

---

## API endpoint: POST /api/chat

### Interfaccia

**Request body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  userMessage: string;  // Ultimo messaggio utente
}
```

**Response:**
- **Content-Type**: `text/event-stream`
- **Encoding**: UTF-8
- **Body**: Streaming testo della risposta Claude + `[DONE]` al termine
- **Error marker**: `[ERROR]: <message>` se fallito

### Implementazione chiave

**File**: `app/api/chat/route.ts`

```typescript
// Validazione input
if (!body.userMessage || typeof body.userMessage !== "string") {
  return NextResponse.json({ error: "..." }, { status: 400 });
}

// Costruzione conversazione
const conversationMessages: ChatMessage[] = [
  ...body.messages,
  { role: "user", content: body.userMessage }
];

// Streaming SSE
const stream = new ReadableStream({
  async start(controller) {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: getSystemPrompt(),
      messages: conversationMessages,
      stream: true,  // ← IMPORTANTE
    });
    // Loop sui delta, enqueue chunks
  }
});
```

**Client-side** (`chat-view.tsx`):
```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, userMessage: input })
});

const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  assistantContent += decoder.decode(value);  // Accumula streaming
}
```

---

## System Prompt del tutor

**File**: `lib/prompts.ts`

Il system prompt definisce il comportamento dell'LLM:

```
Sei il tutor personale di Simone, un senior frontend developer che sta 
imparando AI engineering.

- Rispondi SEMPRE in italiano
- Sii breve, concreto, con esempi pratici
- Se il topic è complesso, dividi in passi
- Chiedi di approfondire uno specifico aspetto
- Tono: cordiale, supportivo, mai condiscendente
```

**Quando editare:**
- Se il profilo dell'utente cambia (es. da frontend a fullstack)
- Se la specializzazione cambia (es. aggiungere DevOps)
- Se il tono deve adattarsi

### Varianti future
Possibile creare funzione `getSystemPrompt(specialization?: string)` per adattare il sistema prompt. Per ora è singolo.

---

## RAG: `lib/rag-service` e endpoint HTTP

### Due layer
| Modulo | Uso |
|--------|-----|
| **`lib/rag/`** | Legacy (retrieve/config/chunker ecc.): mantenuto in repo; **non** usato dalla chat principale. |
| **`lib/rag-service/`** | Multi-corpus (`ai_logs`, `agents_md`, `repo_configs`), ingest con **`IngestOptions.onProgress`**, **`queryCorpus`** (singolo corpus), **`queryMultipleCorpora`** (RRF su N corpus), errori tipizzati. La **chat** in `app/api/chat/route.ts` chiama **`queryMultipleCorpora(["ai_logs", "agents_md", "repo_configs"], …)`** con fusione **RRF** (`RRF_K=60`). **`POST /api/rag/query`** e integrazioni esterne usano **`queryCorpus`** su un corpus alla volta. Import pubblico da **`@/lib/rag-service`** (barrel `index.ts`). |

### Repository indicizzati (`CORPUS_REPOS`)

L’elenco vive in **`lib/rag-service/config.ts`** (tre chiavi: `ai_logs`, `agents_md`, `repo_configs`). Tra i repo: `soli-agent`, `casa-mia-be`, `casa-mia-fe`, `bachelor-party-claudiano`, `solids`, `soli-prof`; per `agents_md` anche `soli-dm-be`, `soli-dm-fe`, `soli-dome`, `pippify`, `soli-platform`, `Koollector` e **health-wand-and-fire** (stesso identificatore in **ai_logs** e **agents_md**, branch `main`, owner `soli92`). Il corpus **`repo_configs`** indicizza file di configurazione per repo (vedi `DEFAULT_CONFIG_SOURCES` in config).

### CLI ingest
```bash
npm run rag:ingest                # tutti i corpus
npm run rag:ingest -- ai_logs    # solo AI_LOG.md
npm run rag:ingest -- agents_md  # solo AGENTS.md
npm run rag:ingest -- repo_configs # solo file config indicizzati
```
Script: `scripts/rag-ingest.ts` (carica `.env.local` via `dotenv`).

### POST `/api/rag/query`
- Header: `x-api-key: <RAG_API_KEY>`
- Body JSON: `{ "corpus": "ai_logs" \| "agents_md" \| "repo_configs", "query": string, "topK"?: number }` (corpus validi = chiavi di **`CORPUS_REGISTRY`**)
- Risposta: `{ corpus, context, sources }`

### POST `/api/rag/ingest`
- Header: `x-api-key` come sopra, più **`x-admin-confirm: yes`**
- Body JSON: `{ "corpus": "ai_logs" \| "agents_md" \| "repo_configs" \| "all" }`
- Risposta: `{ reports: IngestReport[] }` (operazione sincrona, può richiedere minuti)

### POST `/api/rag/ingest-stream` (SSE)
- **Content-Type** risposta: `text/event-stream` — frame `data: {JSON}\n\n` con `IngestProgressEvent` (`start`, `repo-start`, `repo-fetched`, `repo-chunked`, `repo-done`, `repo-skipped`, `repo-error`, `phase`, `complete`) e sentinella `event: end`.
- **Auth** (alternativa):
  1. **Cookie** `sp_admin_session` valido (login da **`POST /api/admin/verify-password`** con `ADMIN_PAGE_PASSWORD`) — niente `x-api-key` né `x-admin-confirm` nel browser.
  2. **Oppure** `x-api-key: <RAG_API_KEY>` + **`x-admin-confirm: yes`** (CLI, script, integrazioni esterne).
- Body JSON: come ingest REST (`corpus` singolo o `"all"`).
- Con **`corpus: "all"`** il backend emette **una sequenza per corpus** in fila (ordine definito dal servizio, tipicamente `ai_logs` → `agents_md` → `repo_configs`): ogni `start` … `complete` è uno scope distinto. Il client (`useIngestStream`) mantiene un array **`corpusRuns`** e aggiorna solo l’ultimo run su eventi repo/phase/complete; la fase globale **`complete`** passa a fine stream (chiusura `ReadableStream`), non sul primo `complete` JSON.

### `POST /api/webhooks/github` (GitHub → re-ingest su `push`)

- **Implementazione**: `app/api/webhooks/github/route.ts` — verifica **`X-Hub-Signature-256`** (HMAC-SHA256) con **`GITHUB_WEBHOOK_SECRET`**. Se il secret manca: 500; firma assente/invalida: 401. Parsing payload **`push`**, scelta **corpus** e **scope repo** in base ai path modificati; **`ingestCorpus`** in **fire-and-forget** (risposta 200 immediata, `maxDuration` 60s; non bloccare il client GitHub oltre il timeout di retry). Test: `app/api/webhooks/github/route.test.ts`.
- **Registrazione lato GitHub** (13 repo in tutto, evento **`push`**, URL `https://soli-prof.vercel.app/api/webhooks/github`, `content_type: json`): **soli-prof** configurato manualmente; per gli altri 12 (stessi elenco in **`scripts/setup-webhooks.sh`**: `soli-agent`, `casa-mia-be`, `casa-mia-fe`, `bachelor-party-claudiano`, `solids`, `soli-dm-be`, `soli-dm-fe`, `soli-dome`, `pippify`, `soli-platform`, `koollector`, `health-wand-and-fire`) usare quello script da macchina con env **`GITHUB_PAT`** (scope `admin:repo_hook`) e **`GITHUB_WEBHOOK_SECRET`** (identico a Vercel). Il PAT **non** serve al runtime Next, solo al setup.
- I repo sopra corrispondono a **`CORPUS_REPOS`** in `lib/rag-service/config.ts` (per corpus `ai_logs` / `agents_md` / `repo_configs` a seconda del target); il nome remoto `koollector` è `Koollector` in alcuni path locali, su GitHub è `koollector`.

---

## Admin panel (`/admin`)

- **UI**: `app/admin/page.tsx` — form password; dopo OK mostra **`IngestPanel`** (`components/admin/ingest-panel.tsx`) con tre azioni corpus e progress real-time via **`hooks/use-ingest-stream.ts`** (`fetch` POST + `ReadableStream`, `credentials: "include"`). Il pannello raggruppa i repo **per corpus** (`corpusRuns`); restano esposti anche **`repos`** / **`totalChunks`** / **`elapsedMs`** derivati (flat + somme quando ogni run è `complete`) per compatibilità.
- **Login**: `POST /api/admin/verify-password` con body `{ "password": string }` — confronto server-side con **`ADMIN_PAGE_PASSWORD`**; se ok crea token in **`lib/admin-session.ts`** (Map in-memory, TTL 1h) e imposta cookie **httpOnly** `sp_admin_session` (`SameSite=Strict`, `Secure` in produzione).
- **Logout** (UI): solo stato React; il cookie resta fino a scadenza — eventuale revoca server esplicita non è ancora esposta come route dedicata.
- **Ingest da browser**: dopo login, il pannello chiama **`/api/rag/ingest-stream`**; non esporre **`RAG_API_KEY`** nel client.

---

## Variabili d'ambiente

### Richieste (produzione)
- `ANTHROPIC_API_KEY` — Chiave API da [console.anthropic.com](https://console.anthropic.com)

### RAG (vector store + HTTP)
- `VOYAGE_API_KEY` — Embeddings (Voyage)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase pgvector
- `GITHUB_TOKEN` — Lettura repo per ingest (Contents API)
- `RAG_API_KEY` — Protegge `/api/rag/query`, `/api/rag/ingest` e (se non si usa il cookie admin) **`/api/rag/ingest-stream`** (stesso valore in header `x-api-key`)

### Webhook GitHub (re-ingest) e ops
- `GITHUB_WEBHOOK_SECRET` — Verifica HMAC su **`POST /api/webhooks/github`**. Valore in Vercel e nel campo **secret** del webhook GitHub. Se assente, l’handler webhook risponde 500.
- `GITHUB_PAT` — **Opzionale**, **non** usato da Next in produzione: serve solo in locale per eseguire **`scripts/setup-webhooks.sh`** (creazione webhook con API GitHub; scope `admin:repo_hook`). Inseribile in `.env.local` senza committare.

### Altre
- `ADMIN_PAGE_PASSWORD` — Protegge il gate **`/admin`** e alimenta il cookie di sessione via `verify-password` (generazione suggerita: `openssl rand -base64 24`)

Vedi `.env.example` per i placeholder.

### Opzionali (dev)
- `VERCEL_TOKEN` — Per deploy da CLI (raramente usato)

### Setup locale

```bash
npm install
cp .env.example .env.local
# Scrivi ANTHROPIC_API_KEY in .env.local

npm run dev
```

### Setup Vercel

1. Vai a [vercel.com](https://vercel.com) → Project Settings
2. Environment Variables:
   - `ANTHROPIC_API_KEY` — (tutti gli ambienti)
3. Deploy automatico su `main` push

---

## Componenti principali

### ChatView (`components/chat-view.tsx`)

**Responsabilità:**
- Gestione state messaggi (useState)
- Input form e submit handler
- Fetch POST /api/chat
- Streaming reader per accumulare risposta in **`rawBuffer`**: il blocco **`__SOURCES__`…`__END_SOURCES__`** può essere spezzato su più chunk SSE (~16 KB); finché il marker di chiusura non c’è nel buffer non si appende testo (evita che il JSON sources compaia in chat). Poi **`[DONE]`** / **`[ERROR]`**; fasi **`processingPhase`** (`searching` → `writing`) con **`ProcessingIndicator`**
- Scroll automatico

**Hook usati:**
- `useState` — messages, input, loading
- `useRef` — scroll ref
- `useEffect` — auto-scroll

### MessageBubble (`components/message-bubble.tsx`)

**Responsabilità:**
- Rendering singolo messaggio
- Styling differente user (blu) vs assistant (grigio)
- Responsive layout

**Props:**
```typescript
{
  role: "user" | "assistant";
  content: string;
}
```

### Anthropic client (`lib/anthropic.ts`)

**Responsabilità:**
- Esportare istanza Anthropic singleton
- Verificare API key
- Esporre costanti modello e timeout

---

## Task comuni per agenti AI

### 1. Aggiungere un nuovo componente

```bash
# Crea file in components/
components/my-component.tsx
```

Usa `"use client"` se interattivo, TypeScript con interfacce, Tailwind per styling.

### 2. Modificare system prompt

Edita `lib/prompts.ts` → funzione `getSystemPrompt()`. Test: invia messaggio in locale, verifica risposta.

### 3. Aggiungere variabile d'ambiente

1. Aggiungi chiave in `.env.example` con commento
2. Leggi con `process.env.CHIAVE` lato server (route.ts, lib)
3. Verifica in `.env.local` locale + Vercel dashboard

### 4. Aggiornare design tramite SoliDS

Cambia tema o token:
- Verifica token disponibili: [Storybook SoliDS](https://soli92.github.io/solids/)
- Aggiorna `tailwind.config.ts` se serve override
- Test: `npm run dev` e ispeziona DevTools

### 5. Deploy manuale

Se GitHub Actions fallisce o vuoi deploy immediato:

```bash
npm run build
vercel --prod  # Richiede VERCEL_TOKEN in .env.local o login interattivo
```

---

## Testing

**Unit test**: [Vitest](https://vitest.dev/) 3.x, config `vitest.config.ts`. Pattern **`lib/**/*.test.ts`**, **`hooks/**/*.test.ts`** e **`app/api/webhooks/github/route.test.ts`**: **`lib/rag-service/*.test.ts`** (chunker, config, errori, **`query.test.ts`** — RRF **`queryMultipleCorpora`** con mock `queryImpl`), **`lib/admin-session.test.ts`** (HMAC `ADMIN_SESSION_SECRET`, opzioni cookie; per assert “secret mancante” usare **`vi.stubEnv("ADMIN_SESSION_SECRET", "")`** invece di contare solo su **`vi.unstubAllEnvs()`**, che ripristina l’env reale e può lasciare la variabile valorizzata in shell / `.env`), **`lib/solids-package.test.ts`** (range **`@soli92/solids` ^1.14.1**), **`hooks/use-ingest-stream.test.ts`** (reducer multi-corpus `ingestCorpusRunsReducer`, `deriveIngestAggregates`); **`route.test.ts`** (webhook: firma HMAC, filtri `push`, trigger corpus).

```bash
npm test              # vitest run — CI-friendly
npm run test:watch    # vitest — watch locale
npm run type-check    # tsc --noEmit
```

**Integration / E2E** (non ancora in repo): eventuali test su `app/api/**` o Playwright in `e2e/` restano da introdurre in una fase successiva.

---

## CI/CD — GitHub Actions

**File**: `.github/workflows/deploy.yml`

### Trigger
- Push a `main`
- Manuale via `workflow_dispatch`

### Step
1. Checkout repo
2. Setup Node.js 22
3. NPM install
4. Type-check (`tsc --noEmit`)
5. Build (`next build`)
6. Deploy Vercel (con `VERCEL_TOKEN` + `ANTHROPIC_API_KEY` come secrets)

In locale, prima del push, conviene anche **`npm test`**. Il workflow in `.github/workflows/deploy.yml` può essere esteso con uno step `npm test` quando vorrai bloccare deploy su test rotti.

### Secrets da aggiungere

Vai a **repo → Settings → Secrets and variables → Actions**:

| Secret | Valore |
|--------|--------|
| `VERCEL_TOKEN` | Token da [Vercel → Settings → Tokens](https://vercel.com/account/tokens) |
| `ANTHROPIC_API_KEY` | Chiave API Anthropic |

---

## Performance e ottimizzazioni (futura)

### Potenziali miglioramenti
- **Caching messaggi**: Redis per sessioni persistenti
- **Compressione**: Gzip risposta SSE
- **Code splitting**: Dynamic imports su componenti pesanti
- **Lazy loading**: Immagini, font
- **Rate limiting**: Per API Anthropic (preventivo costi)

Per ora il focus è semplicità e apprendimento.

---

## Debugging

### Dev server non parte
```bash
# Verifica Node.js version
node --version  # Deve essere 22+

# Pulisci dependencies
rm -rf node_modules .next
npm install

npm run dev
```

### API /chat non risponde
```bash
# Verifica ANTHROPIC_API_KEY in .env.local
echo $ANTHROPIC_API_KEY

# Check API key validity
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/models
```

### Styling non applica (Tailwind)
```bash
# Verifica content path in tailwind.config.ts
# Deve includere app/** e components/**

# Rebuild
npm run build

# Ispeziona DevTools per vedere classe Tailwind applicata
```

### Streaming incompleto
- Browser DevTools → Network → /api/chat
- Guarda se response è `200 OK` e `Content-Type: text/event-stream`
- Console.log in `chat-view.tsx` per debuggare reader loop

---

## Links utili

- **GitHub**: https://github.com/soli92/soli-prof
- **Live**: https://soli-prof.vercel.app
- **Anthropic Docs**: https://docs.anthropic.com
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind Docs**: https://tailwindcss.com/docs
- **SoliDS Storybook**: https://soli92.github.io/solids/

---

## Contatti e supporto

- **Creatore**: [soli92](https://github.com/soli92)
- **Issue tracker**: [GitHub Issues](https://github.com/soli92/soli-prof/issues)
- **Discussioni**: [GitHub Discussions](https://github.com/soli92/soli-prof/discussions)

---

**Ultimo aggiornamento**: Aprile 2026 — **`/api/webhooks/github`** (re-ingest su `push`, HMAC, `scripts/setup-webhooks.sh` per 12 repo + soli-prof manuale), oltre a: `/admin` + cookie, **`/api/rag/ingest-stream`**, hook **`use-ingest-stream`**, buffer SSE in **`chat-view`**, **`queryMultipleCorpora`** (RRF), Vitest `lib/` + `hooks/` + **webhook route test**, **`CORPUS_REPOS`** con **health-wand-and-fire**

---

## Known edge cases & gotchas

- **SSE ingest da browser: no `EventSource`**: per `/api/rag/ingest-stream` lato client non basta `EventSource`, perché serve una `POST` con body; il flusso va letto via `fetch` + `ReadableStream` parser. Vedi AI_LOG Fase 6 (commit `fb4e5d2`, `55edbbc`).

- **Chat deve degradare senza RAG**: in `app/api/chat/route.ts` il retrieve RAG è in fallback silenzioso, per evitare 500 quando vector store/env non sono disponibili. Se si rimuove questo comportamento, la chat può rompersi per guasti temporanei del layer RAG (fix `2001d4a`, consolidato `9ba4c05`).

- **Webhook GitHub**: l’ingest avviata da **`/api/webhooks/github`** non è `await` nella route; errori in background vanno solo in log. Se Vercel termina l’istanza subito dopo la risposta 200, valutare `waitUntil` / queue (oggi assunto: sufficiente per fire-and-forget in produzione).

- **Vitest + `process.env` (admin-session)**: test che vogliono un env “assente” non possono basarsi solo su `vi.unstubAllEnvs()` se nel processo esiste già `ADMIN_SESSION_SECRET` (CI/shell/IDE). Vedi nota sotto **Testing** e `lib/admin-session.test.ts`.

- **Runtime route chat: `nodejs` + `maxDuration`**: la route chat combina streaming SSE e chiamate esterne legate al retrieval; è documentato l'uso di runtime Node con `maxDuration` 60 per stabilità operativa. Prima di cambiare runtime/timeout, verifica i vincoli in AI_LOG Fase 4.

- **Next 16: non reintrodurre `swcMinify`**: questa opzione è stata rimossa per deprecazione; reintrodurla in `next.config.ts` riporta warning/build noise evitabile. Fix: `0dd5060`.

- **`@anthropic-ai/sdk` deve restare dipendenza diretta**: è già successo che mancasse nel manifest; il runtime della chat dipende esplicitamente da questo pacchetto. Se viene rimosso o reso solo transitivo, l'API chat rischia failure in build/run (fix `baacbc4`).
