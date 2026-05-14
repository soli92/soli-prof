---

# AI Log — soli-prof

Memoria di sviluppo AI-assisted. Annotazioni sui prompt, decisioni e pattern emersi costruendo questo progetto con il supporto di AI.

## Overview del progetto

**Soli Prof**: app **Next.js 16** + **React 19** con chat tutor in italiano, streaming SSE da **`/api/chat`** (blocco `__SOURCES__` poi **NDJSON Generative UI** `v:1` per testo + tool `show_tutor_focus_card`; vedi `lib/generative-ui/`, `docs/generative-ui.md`), client **Anthropic** (`@anthropic-ai/sdk`), system prompt in `lib/prompts.ts` e variante **RAG** (`getRAGSystemPrompt`), UI con **@soli92/solids ^1.14.1** (font in `app/layout.tsx`, test `lib/solids-package.test.ts`). **RAG** su **Supabase + pgvector**: ingest da GitHub (Contents API), chunking markdown, embedding **Voyage AI** (HTTP), SQL `sql/001_pgvector_setup.sql`. **`lib/rag-service/`** è il percorso attivo per **query** nella chat (**`queryMultipleCorpora`** su `ai_logs` + `agents_md` + `repo_configs` con **RRF**, `topK` 25; **`queryCorpus`** resta per **`POST /api/rag/query`** e client singolo-corpus) e per ingest/query HTTP; **`lib/rag/`** resta codice legacy di riferimento. CLI `npm run rag:ingest` con corpus opzionale; HTTP **`POST /api/rag/query`**, **`POST /api/rag/ingest`**, **`POST /api/rag/ingest-stream`** (SSE + `onProgress`). **Admin**: pagina **`/admin`**, `ADMIN_PAGE_PASSWORD`, cookie **`sp_admin_session`** (`lib/admin-session.ts`), UI ingest **`components/admin/*`** + hook **`hooks/use-ingest-stream.ts`** (stato **`corpusRuns`** per ingest `all`, reducer puro **`ingestCorpusRunsReducer`** testato in **`hooks/use-ingest-stream.test.ts`**). **Chat**: parsing sources su **buffer accumulato** in `components/chat-view.tsx` se il blocco `__SOURCES__` supera la dimensione tipica di un chunk SSE; dopo sources, **parser NDJSON** per Generative UI (`v:1`); bottone invia con **flex layout centrato** (`flex items-center justify-center`). **Vitest**: `lib/**/*.test.ts`, `hooks/**/*.test.ts`, `npm test` (inclusi **`lib/rag-service/query.test.ts`** per RRF e **`lib/generative-ui/generative-ui.test.ts`** per registry/stream). Documentazione (`WEEKLY_LOG.md`, `SETUP_GUIDE.md`, `AGENTS.md`, `AGENT.md`, questo file) e CI verso Vercel.

**Stack AI usato (inferito; aggiornato 2026-04-22)**: **Cursor / assistente LLM** per scaffold, doc e implementazione RAG (serie `feat(rag):` con Step A ripetuti poi consolidati). Runtime tutor: **Anthropic** + contesto recuperato (`lib/rag/retrieve.ts`, `topK=15` in `9ba4c05`). Embeddings: **Voyage** (`VOYAGE_API_KEY`, `lib/rag/embedder.ts`). Vector store: **Supabase** + **pgvector** (`@supabase/supabase-js`, RPC/search in `lib/rag/store.ts`). *Modello IDE esatto non desumibile.*

**Periodo di sviluppo**: 2026-04-22 (`0006c8d` Initial commit) → 2026-04-24 (ultimo refactor RAG multi-corpus e admin).

**Numero di commit**: 85+

---

## Aggiornamento 2026-05-14 — Generative UI (chat)

- **Registry e stream**: `lib/generative-ui/*` — tool Anthropic `show_tutor_focus_card`, protocollo NDJSON `v:1` dopo `__SOURCES__`, `buildAnthropicMessages` + `tool_result` `"rendered"` per round-trip API.
- **UI**: `components/generative-ui/*` + `components/chat-view.tsx` (blocchi assistente, skeleton tool).
- **Route**: `app/api/chat/route.ts` — `tools` da registry, eventi stream mappati su NDJSON.
- **Doc**: `docs/generative-ui.md`, `docs/UI_COMPONENTS.md`, `README.md`; **test**: `lib/generative-ui/generative-ui.test.ts`.

---

## Aggiornamento 2026-04-29 — Migrazione branding SoliDS 1.14.1

- **Branding/header/loading/manifest**: introdotto `components/ui/logo-loader.tsx` (logo themed gold/mono), usato in `components/chat-view.tsx`, `components/processing-indicator.tsx`, `app/admin/page.tsx` e nel nuovo `app/loading.tsx`.
- **Head/metadata PWA**: in `app/layout.tsx` aggiunti `metadataBase`, Open Graph image brand, icone (`icon`/`apple`/`shortcut`) e `manifest` collegato a `app/manifest.ts` (route `manifest.webmanifest`) con asset SoliDS.
- **Dipendenze/documentazione**: bump `@soli92/solids` a `^1.14.1`, test di guardia aggiornato (`lib/solids-package.test.ts`), allineamento in `README.md`, `AGENTS.md`, `docs/UI_COMPONENTS.md`.
- **Tooling**: script lint aggiornato da `next lint` a `eslint .` con `eslint.config.mjs` (flat config Next), per mantenere una validazione compatibile con Next 16.

---

## Aggiornamento 2026-04-27 — Vitest: `admin-session` (segreto mancante)

- **`lib/admin-session.test.ts`**: il test che si aspetta l’`Error` *Missing ADMIN_SESSION_SECRET* usava `vi.unstubAllEnvs()`, che **ripristina l’ambiente reale**; in locale, con `ADMIN_SESSION_SECRET` già impostata, `createAdminSession()` non lanciava e la suite flakkava. Fix: **`vi.stubEnv("ADMIN_SESSION_SECRET", "")`** (equivalente a mancante per `getSecret()` in `lib/admin-session.ts`). Riferimenti: sezione **Testing** in `AGENTS.md` → *Known edge*.

---

## Aggiornamento 2026-04-27 — GitHub `push` → Soli Prof (webhook + `setup-webhooks.sh`)

- **Endpoint** `app/api/webhooks/github/route.ts` (già con Vitest in `app/api/webhooks/github/route.test.ts`): verifica HMAC, ingest selettivo in fire-and-forget, `maxDuration` 60. Su Vercel **`GITHUB_WEBHOOK_SECRET`** deve combaciare con la config del webhook su ogni repo.
- **13 repo** coperti: `soli-prof` (setup manuale) + 12 con **`scripts/setup-webhooks.sh`** (`GITHUB_PAT` con `admin:repo_hook`, stesso `GITHUB_WEBHOOK_SECRET`); elenco in script: `soli-agent`, `casa-mia-be`, `casa-mia-fe`, `bachelor-party-claudiano`, `solids`, `soli-dm-be`, `soli-dm-fe`, `soli-dome`, `pippify`, `soli-platform`, `koollector`, `health-wand-and-fire`.
- **Documentazione** aggiornata: `AGENTS.md` (struttura `app/api`, sezione RAG + webhook, env, test, gotchas), `README` (RAG + webhook), `SETUP_GUIDE`, `.env.example` (commento `GITHUB_PAT` opzionale). I repo **consumer** nel workspace elencano la stessa integrazione in `AGENTS.md` / `README` / `AI_LOG` dove presenti.

---

## Aggiornamento 2026-04-27 — RAG: repo health-wand-and-fire

- **`lib/rag-service/config.ts`**: `CORPUS_REPOS` esteso con **health-wand-and-fire** (owner `soli92`, branch `main`) per **`ai_logs`** e **`agents_md`**, allineato al [repo gioco](https://github.com/soli92/health-wand-and-fire) (Vercel: `health-wand-and-fire.vercel.app`).
- **Test**: `lib/rag-service/config.test.ts` verifica la presenza del target in entrambi i corpora.
- **Doc**: README, SETUP_GUIDE, AGENTS.md, questo file; dopo deploy: `npm run rag:ingest` o ingest admin per reindicizzare.

---

## Aggiornamento 2026-04-27 — RAG: RRF cross-corpus in `/api/chat`

- **`lib/rag-service/query.ts`**: **`queryMultipleCorpora`** interroga N corpus in parallelo, gestisce fallimento singolo corpus con `catch` + `console.warn`, fonde ranking con **Reciprocal Rank Fusion** (`RRF_K = 60`, Cormack et al. 2009). Chiave deduplica chunk: `repo::section`. Opzionale **`queryImpl`** (5° argomento) per test senza embed reali.
- **`app/api/chat/route.ts`**: retrieval tutor su **`["ai_logs", "agents_md", "repo_configs"]`** via **`queryMultipleCorpora`** (25 per corpus, 25 in output); log `[RAG]` include `corporaQueried.length`.
- **`lib/rag-service/index.ts`**: export **`queryMultipleCorpora`** e tipo **`MultiCorpusQueryResult`**.
- **`lib/rag-service/query.test.ts`**: 6 casi (corpora vuoti, fusione RRF a 2 corpus, resilienza a throw, `topKOutput`, tre corpora mock, tutti vuoti).
- **`queryCorpus`** invariata per **`POST /api/rag/query`** e integrazioni (es. Soli Agent `search_knowledge` su corpus singolo).

---

## Fasi di sviluppo (inferite dal history)

### Fase 1 — Initial commit e doppio scaffold Next/SoliDS/Anthropic

**Timeframe**: `0006c8d` → onda `92b40c0`…`5f9aeb5` e onda parallela `dfc425b`…`8c8bf2a` (stesso giorno, messaggi speculari "chore/add" vs "feat/add").

**Cosa è stato fatto**: `package.json` con Next 16, SoliDS, Anthropic; `.npmrc` per GitHub Packages; template env; gitignore; tsconfig/tailwind/postcss/next; `prompts.ts`, `anthropic.ts`, componenti chat, route streaming, layout/page, README/weekly log, MIT.

**Evidenza di AI-assist** (inferita):

- **Alta**: duplicazione funzionale tra serie `chore:`/`feat:`/`config:` che toccano gli stessi layer (es. più commit "add chat API route with streaming" e varianti).
- Commit finali `36632b2` / `2636626` citano **"scaffolding batch"** — ammissione implicita di generazione massiva seguita da refactor mancanti.

**Decisioni architetturali notevoli**:

- **App Router** Next con route `app/api/chat/route.ts` per streaming.
- **SoliDS** come preset Tailwind.

**Lezioni apprese**

- Doppio scaffold lascia **refactor incompleti** finché non si normalizza il tree.
- `.npmrc` iniziale verso GitHub Packages diventa **debito** se `@soli92/solids` è pubblico su npm.

### Fase 2 — Documentazione operativa e CI

**Timeframe**: `96b612a`–`92674ab` (LICENSE, README, WEEKLY_LOG, AGENTS, workflow Actions).

**Cosa è stato fatto**: narrativa README, log settimanale, contesto per assistenti AI in `AGENTS.md`, pipeline CI/CD, `SETUP_GUIDE.md`.

**Decisioni architetturali notevoli**:

- Trattare **AGENTS.md** come manuale operativo per tool/agenti che lavorano sul repo.

**Lezioni apprese**

- **AGENTS.md** allineato al resto dell'ecosistema soli92 riduce attrito per Cursor/Soli Agent.
- CI/CD documentata insieme al codice evita segreti sparsi solo in chat.

### Fase 3 — Correzione packaging SoliDS (npm pubblico) e fix tecnici

**Timeframe**: da `46d08f4` / `ac2632f` attraverso molteplici commit sulla documentazione.

**Cosa è stato fatto**: allineamento a **`@soli92/solids` pubblico su npm**, rimozione `NPM_TOKEN` dalla documentazione, fix `next.config` (`swcMinify` rimosso come deprecato), aggiunta esplicita `@anthropic-ai/sdk` in dipendenze.

**Lezioni apprese**

- **Opzione Next deprecata** (`swcMinify`) va rimossa per build pulite su Next 16.
- Dipendenze usate solo a runtime API route devono comparire in **`dependencies`**.

### Fase 4 — RAG: pgvector, ingest AI_LOG da GitHub, Voyage, retrieve in chat

**Timeframe**: da `edace82` fino a `9ba4c05` (retrieval attivo + prompt rinforzato).

**Cosa è stato fatto**: modulo `lib/rag/` (config, chunker, embedder Voyage, GitHub fetch AI_LOG, ingest, store Supabase, retrieve); `sql/001_pgvector_setup.sql` (tabella, indici, trigger, RPC); CLI `scripts/rag-ingest.ts`; integrazione in chat con `retrieveContext` e **`getRAGSystemPrompt`**; fallback silenzioso se retrieval fallisce.

**Decisioni architetturali notevoli**:

- **Contesto RAG trattato come autoritativo** nel system prompt — regole obbligatorie su citazioni, commit hash, gap espliciti.
- **topK=15** per il retrieve.

**Lezioni apprese**

- **Fallback silenzioso** su retrieval evita 500 in chat se vector store momentaneamente assente.
- Script ingest deve caricare **`.env.local`** in modo coerente.

### Fase 5 — Refactor RAG multi-corpus (`lib/rag-service`, API HTTP, Vitest)

**Timeframe**: 2026-04-24 (modulo + store/ingest/query; test unitari).

**Cosa è stato fatto**: cartella **`lib/rag-service/`** con tipi, errori, config multi-corpus, chunker, embedder, GitHub fetch, store, ingest, query. Route Next **`app/api/rag/query`** e **`app/api/rag/ingest`** con autenticazione `RAG_API_KEY` e header **`x-admin-confirm`**. Script **`scripts/rag-ingest.ts`** con arg `all` | `ai_logs` | `agents_md`. Vitest 3 con test su chunker/config/errori.

**Decisioni**: ingest/query esposti da HTTP; chat migrata su **`queryCorpus`** da `rag-service`.

**Lezioni**: barrel export + errori tipizzati semplificano consumer HTTP/CLI; test puri evitano dipendenze esterne in CI.

### Fase 6 — Ingest SSE, admin panel, sessione cookie, UI progress

**Cosa è stato fatto**: endpoint **`POST /api/rag/ingest-stream`** con SSE; autenticazione **doppia** (cookie admin *oppure* `x-api-key` + `x-admin-confirm`); **`POST /api/admin/verify-password`** per cookie httpOnly. UI **`/admin`** con **`IngestPanel`** e **`useIngestStream`**. In chat: **`ProcessingIndicator`**, `requestAnimationFrame` sulla transizione fase, contenitori a altezza minima anti layout shift.

**Lezioni**: non mettere **`RAG_API_KEY`** nel bundle — il browser usa solo cookie + POST same-origin; stream manuale su **`ReadableStream`** per POST ingest.

### Fase 7 — Fix UI bottone Invia: spacing e allineamento label

**Commit**: allineamento label bottone con **flexbox centrato**.

**Cosa è stato fatto**: bottone invia (`components/chat-view.tsx`) originariamente aveva spacing OK (`px-6 py-3`) ma label non centrata verticalmente. Aggiunta `flex items-center justify-center` al className per centrare il testo sia verticalmente che orizzontalmente.

**Prima**:
```jsx
className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ... sd-min-touch-target"
```

**Dopo**:
```jsx
className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ... sd-min-touch-target"
```

**Lezioni**: quando un bottone contiene testo senza altri elementi, **`flex + items-center + justify-center`** è il pattern standard per centratura perfetta; evita problemi di line-height ereditato o baseline diversi del font.

---

## Note generali su prompt e pattern emersi

### Pattern efficaci

1. **Multi-file refactor**: quando molti file toccano lo stesso layer (doc, configurazione), è meglio un **unico commit multi-file** con messaggio generico (es. `docs: update RAG references`) che tanti commit "Step A" ripetitivi.

2. **RAG + fallback silenzioso**: se il retrieval fallisce, chat continua senza contesto anziché 500 — UX migliore, debug in logs.

3. **Barrel export + errori tipizzati**: `lib/rag-service/index.ts` come punto di ingresso centralizza l'interfaccia pubblica; errori custom facilitano consumer HTTP/CLI.

4. **SSE per operazioni lunghe**: `ingest-stream` su POST/SSE è migliore di polling; UI aggiorna in real-time con basso overhead.

5. **Test puri di logica**: `vitest` su chunker/config senza dipendenze Supabase/GitHub accelera feedback loop; integrazioni vanno in CI GitHub Actions.

### Anti-pattern evitati

- ❌ RAG_API_KEY nel bundle browser (era a rischio prima della fix autenticazione).
- ❌ Molti commit "Step A" con messaggio identico (appesantisce history).
- ❌ Dipendenze API esterne mancanti nel `package.json` (è capitato con `@anthropic-ai/sdk`).
- ❌ Layout shift da altezza variabile di componenti dinamici (contenitori min-height lo evitano).

---

## Roadmap futuri (da documentare qui)

- Sessione admin: expiry timeout, refresh token
- Fine-tuning Anthropic con embedding locali (non Voyage)
- Caching embedding query (Redis)
- Mobile: PWA o app Expo
- Metriche: tracking domande utente → feedback loop su dataset

---

## Aggiornamento 2026-05-06 — LLM Wiki context refinement

- Aggiornati `docs/wiki/wiki/index.md` e `docs/wiki/wiki/log.md` per allineare il wiki al contesto reale del repository.
- Snapshot iniziale e pagine top-level resi coerenti con `AGENTS.md`, `README.md` e questo `AI_LOG.md`.
- Nessun ingest di sorgenti effettuato: aggiornamento solo strutturale/documentale.

---

## Aggiornamento 2026-05-14 — SourceBadges: soglia allineata a `RAG_CONFIG`

- **`components/source-badges.tsx`**: import di **`RAG_CONFIG`** da `lib/rag-service/config` e filtro delle fonti con **`similarityThresholdForSources`** (stesso valore usato in `lib/rag-service/query.ts` per le sources nel marker `__SOURCES__`), al posto del **0.2** hardcoded che poteva mostrare badge non coerenti con il filtro server.
- **`AGENTS.md`**: nota in alberatura `components/` + sottosezione **SourceBadges** sotto ChatView.
- La soglia **`isStrong`** (evidenza visiva ≥ **0.35**) resta locale al componente.
