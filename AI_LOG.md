---

# AI Log — soli-prof

Memoria di sviluppo AI-assisted. Annotazioni sui prompt, decisioni e pattern emersi costruendo questo progetto con il supporto di AI.

## Overview del progetto

**Soli Prof**: app **Next.js 16** + **React 19** con chat tutor in italiano, streaming SSE da **`/api/chat`**, client **Anthropic** (`@anthropic-ai/sdk`), system prompt in `lib/prompts.ts` e variante **RAG** (`getRAGSystemPrompt`), UI con **@soli92/solids**. **RAG** su **Supabase + pgvector**: ingest da GitHub (Contents API) degli `AI_LOG.md` dei repo configurati, chunking markdown, embedding **Voyage AI** (HTTP), script CLI `npm run rag:ingest` → `scripts/rag-ingest.ts`, SQL `sql/001_pgvector_setup.sql`. Documentazione (`WEEKLY_LOG.md`, `SETUP_GUIDE.md`) e CI verso Vercel.

**Stack AI usato (inferito; aggiornato 2026-04-22)**: **Cursor / assistente LLM** per scaffold, doc e implementazione RAG (serie `feat(rag):` con Step A ripetuti poi consolidati). Runtime tutor: **Anthropic** + contesto recuperato (`lib/rag/retrieve.ts`, `topK=15` in `9ba4c05`). Embeddings: **Voyage** (`VOYAGE_API_KEY`, `lib/rag/embedder.ts`). Vector store: **Supabase** + **pgvector** (`@supabase/supabase-js`, RPC/search in `lib/rag/store.ts`). *Modello IDE esatto non desumibile.*

**Periodo di sviluppo**: 2026-04-22 (`0006c8d` Initial commit) → 2026-04-22 (`9ba4c05` feat(rag): attiva retrieval con topK=15 + prompt rinforzato).

**Numero di commit**: 85

---

## Fasi di sviluppo (inferite dal history)

### Fase 1 — Initial commit e doppio scaffold Next/SoliDS/Anthropic

**Timeframe**: `0006c8d` → onda `92b40c0`…`5f9aeb5` e onda parallela `dfc425b`…`8c8bf2a` (stesso giorno, messaggi speculari “chore/add” vs “feat/add”).

**Cosa è stato fatto**: `package.json` con Next 16, SoliDS, Anthropic; `.npmrc` per GitHub Packages; template env; gitignore; tsconfig/tailwind/postcss/next; `prompts.ts`, `anthropic.ts`, componenti chat, route streaming, layout/page, README/weekly log, MIT.

**Evidenza di AI-assist** (inferita):

- **Alta**: duplicazione funzionale tra serie `chore:`/`feat:`/`config:` che toccano gli stessi layer (es. più commit “add chat API route with streaming” e varianti).
- Commit finali `36632b2` / `2636626` citano **“scaffolding batch”** — ammissione implicita di generazione massiva seguita da refactor mancanti.

**Decisioni architetturali notevoli**:

- **App Router** Next con route `app/api/chat/route.ts` per streaming.
- **SoliDS** come preset Tailwind (`3968f53`, `2d1a6ef` duplicato concettuale).

**Prompt chiave usati**

> **Prompt [inferito]**: "Scaffold Next.js 16 + React 19 + Tailwind preset SoliDS, route `app/api/chat` con streaming SSE verso Anthropic, componenti `chat-view` e `message-bubble`, `lib/prompts.ts` con system prompt tutor in italiano."
> *Evidenza*: commit paralleli `61cc0b5`/`7f087aa`, `ad63e64`, file `lib/prompts.ts` (contenuto esplicito ruolo tutor), messaggi *scaffolding batch* `2636626`.

> **Prompt [inferito]**: Nessun prompt specifico desumibile oltre l’inferenza sopra; la duplicazione commit suggerisce **due passate** di generazione o merge manuale.

**Lezioni apprese**

- Doppio scaffold lascia **refactor incompleti** finché non si normalizza il tree (`36632b2`, `2636626`).
- `.npmrc` iniziale verso GitHub Packages diventa **debito** se `@soli92/solids` è pubblico su npm — richiede sweep su README/SETUP/AGENTS (serie commit `46d08f4`…).

### Fase 2 — Documentazione operativa e CI

**Timeframe**: `96b612a`–`92674ab` (LICENSE, README, WEEKLY_LOG, AGENTS, workflow Actions).

**Cosa è stato fatto**: narrativa README, log settimanale, contesto per assistenti AI in `AGENTS.md`, pipeline CI/CD, `SETUP_GUIDE.md`.

**Evidenza di AI-assist** (inferita):

- Struttura “learning in public” + `AGENTS.md` allineata all’ecosistema soli92 (pattern visto in altri repo).

**Decisioni architetturali notevoli**:

- Trattare **AGENTS.md** come manuale operativo per tool/agenti che lavorano sul repo.

**Prompt chiave usati**

> **Prompt [inferito]**: "Scrivi README narrativo, WEEKLY_LOG settimana 1, AGENTS per assistenti AI, SETUP_GUIDE passo-passo, LICENSE MIT, GitHub Actions CI/CD e deploy Vercel."
> *Evidenza*: `45828ff`, `7132fbe`, `90fc89b`, `eb2343e`, `92674ab`, `96b612a`.

**Lezioni apprese**

- **AGENTS.md** allineato al resto dell’ecosistema soli92 riduce attrito per Cursor/Soli Agent (`90fc89b`).
- CI/CD documentata insieme al codice evita segreti sparsi solo in chat (`f66949c`, `92674ab`).

### Fase 3 — Correzione packaging SoliDS (npm pubblico) e fix tecnici

**Timeframe**: da `46d08f4` / `ac2632f` (rimozione GitHub Packages da `.npmrc`) attraverso molteplici commit quasi ripetitivi su README/SETUP/AGENTS/.env → `0dd5060` swcMinify, `baacbc4` SDK mancante, `2636626` refactors.

**Cosa è stato fatto**: allineamento a **`@soli92/solids` pubblico su npm** (stesso messaggio ripetuto su più file in commit distinti — possibile split meccanico o sessioni multiple), rimozione `NPM_TOKEN` dalla documentazione, fix `next.config` (`swcMinify` rimosso come deprecato), aggiunta esplicita `@anthropic-ai/sdk` in dipendenze.

**Evidenza di AI-assist** (inferita):

- **Alta** per volume e parallelismo: molti commit con messaggio quasi identico che tocca README, SETUP, AGENTS, `.env.example`, `.npmrc` a piccoli incrementi — pattern da “find-replace assistito” o da più passate agent.

**Decisioni architetturali notevoli**:

- Semplificare onboarding togliendo PAT GitHub quando il pacchetto design system è su **npm pubblico**.

**Prompt chiave usati**

> **Prompt [inferito]**: "Rimuovi NPM_TOKEN e riferimenti a GitHub Packages da README, SETUP_GUIDE, AGENTS, `.env.example`, `.npmrc` perché `@soli92/solids` è su npm pubblico; aggiungi `@anthropic-ai/sdk` se manca; rimuovi `swcMinify` deprecato da next.config."
> *Evidenza*: catena commit quasi identici su doc/npm (`7be7e62`…`46d08f4`), `baacbc4`, `0dd5060`.

**Lezioni apprese**

- **Opzione Next deprecata** (`swcMinify`) va rimossa per build pulite su Next 16 (`0dd5060`).
- Dipendenze usate solo a runtime API route devono comparire in **`dependencies`**, non solo come trasitive (`baacbc4`).
- Ripetere lo stesso messaggio di commit su molti file è sintomo di **replace meccanico**: un unico commit multi-file sarebbe più leggibile in history.

### Fase 4 — RAG: pgvector, ingest AI_LOG da GitHub, Voyage, retrieve in chat

**Timeframe**: da `edace82` / `0ef1c25` (*feat(rag): add RAG config — Step A*) fino a `9ba4c05` (retrieval attivo + prompt rinforzato).

**Cosa è stato fatto**: modulo `lib/rag/` (`config`, `chunker`, `embedder` Voyage, `github` fetch AI_LOG via API Contents, `ingest` orchestrazione fetch/chunk/embed/upsert, `store` Supabase, `retrieve` query embedding + contesto formattato); `sql/001_pgvector_setup.sql` (tabella, indici, trigger, RPC, RLS); CLI `scripts/rag-ingest.ts` e script `rag:ingest`; integrazione in `app/api/chat/route.ts` con `retrieveContext` e **`getRAGSystemPrompt`**; fallback silenzioso se retrieval fallisce; fix ingest env `91dbb86`.

**Evidenza di AI-assist** (inferita):

- Ondata di commit **Step A** ripetuti/paralleli (`88638a9`, `64fa450`, …) poi integrazione in `route.ts` (`2001d4a`, `9ba4c05`) — tipico iterazione assistita su pipeline multi-file.

**Decisioni architetturali notevoli**:

- **Contesto RAG trattato come autoritativo** nel system prompt (`lib/prompts.ts` — regole obbligatorie su citazioni, commit hash, gap espliciti).
- **Runtime `nodejs`** e `maxDuration` 60 in API chat (file `route.ts`) per embedding/HTTP e streaming combinati.
- **topK=15** per il retrieve (`9ba4c05`).

**Prompt chiave usati**

> **Prompt [inferito]**: "Implementa RAG: schema pgvector su Supabase, ingest degli AI_LOG da GitHub, embedding Voyage, retrieve nella POST /api/chat con prompt che impone citazione repo e hash commit."
> *Evidenza*: `da89e9b`, `862e8df`, `21f76fc`, `2001d4a`, `9ba4c05`, `getRAGSystemPrompt` in `lib/prompts.ts`.

**Lezioni apprese**

- **Fallback silenzioso** su retrieval evita 500 in chat se vector store o env sono momentaneamente assenti (`route.ts` try/catch).
- Script ingest deve caricare **`.env.local`** in modo coerente con `dotenv`/`tsx` (`91dbb86 fix(rag-ingest)`).
- Ripetere molti commit “Step A” con messaggio simile appesantisce la history — squash o piano unico riduce rumore.

---

## Pattern ricorrenti identificati

- **Conventional commits** (`feat:`, `fix:`, `config:`, `docs:`, `chore:`), scope **`(rag)`** per la pipeline RAG.
- **Doppio binario documentazione**: README narrativo + `SETUP_GUIDE` operativo + `AGENTS` per agenti.
- **Correzione post-scaffold** esplicita nei messaggi (`scaffolding batch`).
- **Allineamento toolchain**: Node 22 (`.nvmrc` / `engines`).
- **RAG come estensione del tutor**: stesso endpoint chat, contesto opzionale ma governato da prompt dedicato.

---

## Tecnologie e scelte di stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind + preset `@soli92/solids`
- **State**: componente chat client-side (streaming)
- **Deploy**: Vercel (homepage nel `package.json` e workflow CI)
- **LLM integration**: Anthropic SDK, SSE in API route, `SYSTEM_PROMPT` + **`getRAGSystemPrompt`**
- **RAG / dati**: Supabase (pgvector), `@supabase/supabase-js`, SQL in `sql/001_pgvector_setup.sql`
- **Embeddings**: Voyage AI API (`lib/rag/embedder.ts`, `VOYAGE_API_KEY` in `.env.example`)
- **Ingest**: GitHub Contents API (`lib/rag/github.ts`), CLI `tsx scripts/rag-ingest.ts` (`npm run rag:ingest`)

---

## Problemi tecnici risolti (inferiti)

1. **Dipendenza Anthropic mancante in manifest**: `baacbc4 fix: add missing @anthropic-ai/sdk dependency`.
2. **Opzione Next deprecata**: `0dd5060 fix(next): remove deprecated swcMinify option`.
3. **Refactor incompleti dopo scaffold**: `36632b2`, `2636626`.
4. **Documentazione/registry npm vs GitHub Packages**: serie di commit `fix: rimuovi NPM_TOKEN…` / `.npmrc` (allineamento a pacchetto pubblico).
5. **Ingest CLI e variabili env**: `91dbb86 fix(rag-ingest): fixed import for env.local variable retrieving`.
6. **Retrieval non collegato al flusso chat**: risolto con `2001d4a` / `9ba4c05` (integrazione `retrieveContext` + `getRAGSystemPrompt`).

---

## Appendice — Commit notevoli (estratto da `git log --oneline`)

Estratto HEAD→radice (in cima i più recenti): prima blocco **RAG**, poi scaffold/fix iniziali.

- `9ba4c05` feat(rag): attiva retrieval con topK=15 + prompt rinforzato
- `2001d4a` feat(rag): integra retrieveContext nel route.ts con fallback silenzioso
- `91dbb86` fix(rag-ingest): fixed import for env.local variable retrieving
- `88d8f00` / `7857c22` / `d0c96c9` feat(rag): aggiungi deps, env vars e prompt RAG
- `da89e9b` feat(rag): add sql/001_pgvector_setup.sql with table, indexes, trigger, RPC and RLS
- `47e6b02` feat(rag): add scripts/rag-ingest.ts CLI entry point
- `21f76fc` feat(rag): add retrieve.ts with query embedding and formatted context output
- `d24d71d` feat(rag): add ingest.ts orchestrator with fetch/chunk/embed/upsert pipeline
- `862e8df` feat(rag): add github.ts with AI_LOG.md fetcher via GitHub Contents API
- `188a383` feat(rag): add store.ts with Supabase upsertChunks and searchSimilar
- `620d8b9` feat(rag): add embedder.ts with Voyage AI wrapper and batching
- `30632aa` feat(rag): add chunker.ts with h2/h3 split and paragraph overflow handling
- `0ef1c25` feat(rag): add config.ts with repo list and global constants
- `2636626` fix: apply missing refactors from scaffolding batch
- `36632b2` fix: apply missing refactors from scaffolding
- `0dd5060` fix(next): remove deprecated swcMinify option
- `baacbc4` fix: add missing @anthropic-ai/sdk dependency
- `46d08f4` fix: rimuovi direttive GitHub Packages da `.npmrc` — @soli92/solids è pubblico su npm
- `eb2343e` docs: SETUP_GUIDE.md - guida passo-passo completa
- `92674ab` ci: update GitHub Actions deploy workflow for Vercel
- `90fc89b` docs: AGENTS.md - operative context per AI assistants
- `7132fbe` docs: WEEKLY_LOG.md prima settimana
- `45828ff` docs: README.md narrativo con setup completo
- `61cc0b5` feat: app/api/chat/route.ts - endpoint streaming chat
- `ad63e64` feat: lib/prompts.ts con system prompt tutor
- `5f9aeb5` init: package.json Next.js 16 con @soli92/solids
- `7e82a8f` chore: configure npm registry for GitHub Packages (@soli92/solids)
- `0006c8d` Initial commit

---

## Punti aperti / note per il futuro

- **Roadmap README / WEEKLY_LOG**: aggiornare log settimanali e README per descrivere **RAG operativo** (prima erano solo piani).
- **grep `TODO|FIXME|HACK|XXX`** in `app/`, `lib/`, `components/`, `lib/rag/`: **nessun match** prioritario nell’ultima passata.
- **Costi**: Anthropic + **Voyage** + traffico **Supabase** / GitHub API ingest — nessun budget cap o quota monitoring nel codice analizzato.
- **Ingest**: frequenza aggiornamento indice (cron vs manuale), secret `GITHUB_TOKEN` / permessi repo, limiti rate GitHub Contents API.
- **Debito tecnico inferito**: estensione `pgvector` e RLS su progetto Supabase devono restare allineate a `sql/001_pgvector_setup.sql` (migrazioni manuali vs file in repo).
- **Debito tecnico inferito**: `topK` e soglia similarità / filtri per repo — tuning solo in commit `9ba4c05`, da validare su query reali.
- **Debito tecnico inferito**: history ancora densa (85 commit in un giorno) — valutare squash prima di release “pubblica” narrativa.

---

> **Nota metodologica**: ultimo aggiornamento manuale **2026-04-22** (post-RAG); le parti *[inferito]* vanno validate dal maintainer.

---

## Metodologia compilazione automatica

Ultimo aggiornamento contenuti **2026-04-22** (allineato a `9ba4c05`), analizzando:

- **85** commit in `git log` su `main`
- **~18** file/aree di contesto (`package.json`, `next.config.ts`, `app/api/chat/route.ts`, `lib/prompts.ts`, `lib/anthropic.ts`, `lib/rag/*`, `scripts/rag-ingest.ts`, `sql/001_pgvector_setup.sql`, `.env.example`, `AGENTS.md`, workflow CI, README/SETUP/WEEKLY_LOG)
- **0** occorrenze `TODO|FIXME|HACK|XXX` nei path sorgente campionati

**Punti di minore confidenza:**

- Prompt testuali fase RAG ricostruiti senza transcript sessione.
- Dettaglio RLS/policies Supabase in produzione vs file SQL in repo.
- Copertura test automatici su pipeline RAG (non evidenziata nei commit).

---
