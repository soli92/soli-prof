---

# AI Log — soli-prof

Memoria di sviluppo AI-assisted. Annotazioni sui prompt, decisioni e pattern emersi costruendo questo progetto con il supporto di AI.

## Overview del progetto

**Soli Prof**: app **Next.js 16** + **React 19** con chat tutor in italiano, streaming SSE da **`/api/chat`**, client **Anthropic** (`@anthropic-ai/sdk`), system prompt in `lib/prompts.ts`, UI con **@soli92/solids**. Documentazione di learning (`WEEKLY_LOG.md`, `SETUP_GUIDE.md`) e CI GitHub Actions verso Vercel.

**Stack AI usato (inferito)**: **Cursor / LLM** per scaffolding e documentazione (evidenza indiretta: doppia onda di commit quasi speculari `chore:`/`feat:`/`config:` che aggiungono gli stessi file concettuali; commit `2636626 fix: apply missing refactors from scaffolding batch` dichiara esplicitamente uno **“scaffolding batch”** — tipico di generazione assistita + correzione successiva). **Non** è noto quale modello.

**Periodo di sviluppo**: 2026-04-22 (`0006c8d` Initial commit alle 11:29) → 2026-04-22 (`2636626` fix scaffolding alle 13:18) — **meno di un giorno** di wall-clock per 59 commit (indicativo di sessione intensiva o rewrite history).

**Numero di commit**: 59

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

**Prompt chiave usati**: > [TODO da compilare manualmente]

**Lezioni apprese**: > [TODO da compilare manualmente]

### Fase 2 — Documentazione operativa e CI

**Timeframe**: `96b612a`–`92674ab` (LICENSE, README, WEEKLY_LOG, AGENTS, workflow Actions).

**Cosa è stato fatto**: narrativa README, log settimanale, contesto per assistenti AI in `AGENTS.md`, pipeline CI/CD, `SETUP_GUIDE.md`.

**Evidenza di AI-assist** (inferita):

- Struttura “learning in public” + `AGENTS.md` allineata all’ecosistema soli92 (pattern visto in altri repo).

**Decisioni architetturali notevoli**:

- Trattare **AGENTS.md** come manuale operativo per tool/agenti che lavorano sul repo.

**Prompt chiave usati**: > [TODO da compilare manualmente]

**Lezioni apprese**: > [TODO da compilare manualmente]

### Fase 3 — Correzione packaging SoliDS (npm pubblico) e fix tecnici

**Timeframe**: da `46d08f4` / `ac2632f` (rimozione GitHub Packages da `.npmrc`) attraverso molteplici commit quasi ripetitivi su README/SETUP/AGENTS/.env → `0dd5060` swcMinify, `baacbc4` SDK mancante, `2636626` refactors.

**Cosa è stato fatto**: allineamento a **`@soli92/solids` pubblico su npm** (stesso messaggio ripetuto su più file in commit distinti — possibile split meccanico o sessioni multiple), rimozione `NPM_TOKEN` dalla documentazione, fix `next.config` (`swcMinify` rimosso come deprecato), aggiunta esplicita `@anthropic-ai/sdk` in dipendenze.

**Evidenza di AI-assist** (inferita):

- **Alta** per volume e parallelismo: molti commit con messaggio quasi identico che tocca README, SETUP, AGENTS, `.env.example`, `.npmrc` a piccoli incrementi — pattern da “find-replace assistito” o da più passate agent.

**Decisioni architetturali notevoli**:

- Semplificare onboarding togliendo PAT GitHub quando il pacchetto design system è su **npm pubblico**.

**Prompt chiave usati**: > [TODO da compilare manualmente]

**Lezioni apprese**: > [TODO da compilare manualmente]

---

## Pattern ricorrenti identificati

- **Conventional commits** (`feat:`, `fix:`, `config:`, `docs:`, `chore:`).
- **Doppio binario documentazione**: README narrativo + `SETUP_GUIDE` operativo + `AGENTS` per agenti.
- **Correzione post-scaffold** esplicita nei messaggi (`scaffolding batch`).
- **Allineamento toolchain**: Node 22 (`.nvmrc` / `engines`).

---

## Tecnologie e scelte di stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind + preset `@soli92/solids`
- **State**: componente chat client-side (streaming)
- **Deploy**: Vercel (homepage nel `package.json` e workflow CI)
- **LLM integration**: Anthropic SDK, SSE in API route, system prompt dedicato

## Problemi tecnici risolti (inferiti)

1. **Dipendenza Anthropic mancante in manifest**: `baacbc4 fix: add missing @anthropic-ai/sdk dependency`.
2. **Opzione Next deprecata**: `0dd5060 fix(next): remove deprecated swcMinify option`.
3. **Refactor incompleti dopo scaffold**: `36632b2`, `2636626`.
4. **Documentazione/registry npm vs GitHub Packages**: serie di commit `fix: rimuovi NPM_TOKEN…` / `.npmrc` (allineamento a pacchetto pubblico).

---

## Appendice — Commit notevoli (estratto da `git log --oneline`)

La history del 2026-04-22 mostra **due ondate** di file simili (`chore:`/`feat:`/`config:`) e una lunga serie di fix su documentazione/npm; segue estratto HEAD→radice.

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

> [TODO da compilare manualmente: roadmap settimanale (RAG, eval, fine-tuning come da README), costi API Anthropic, contenuti WEEKLY_LOG]

---

> **Nota metodologica**: questo file è stato generato retroattivamente analizzando la history del repo. Le sezioni con `> [TODO da compilare manualmente]` richiedono la memoria del developer e non possono essere inferite dalla sola analisi automatica. Integra progressivamente con annotazioni manuali mentre lavori alle prossime fasi del progetto.

---
