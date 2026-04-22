---

# AI Log — soli-prof

Memoria di sviluppo AI-assisted. Annotazioni sui prompt, decisioni e pattern emersi costruendo questo progetto con il supporto di AI.

## Overview del progetto

**Soli Prof**: app **Next.js 16** + **React 19** con chat tutor in italiano, streaming SSE da **`/api/chat`**, client **Anthropic** (`@anthropic-ai/sdk`), system prompt in `lib/prompts.ts`, UI con **@soli92/solids**. Documentazione di learning (`WEEKLY_LOG.md`, `SETUP_GUIDE.md`) e CI GitHub Actions verso Vercel.

**Stack AI usato (inferito; aggiornato 2026-04-22)**: **Cursor / assistente LLM** per scaffold e doc — doppia onda `chore:`/`feat:`/`config:` e commit `2636626` / `36632b2` (*scaffolding batch*). In runtime il tutor usa **Anthropic** (`@anthropic-ai/sdk` in `package.json`, client in `lib/anthropic.ts`). System prompt versionato in `lib/prompts.ts` (`SYSTEM_PROMPT`). Presenti `AGENTS.md`, CI `.github/workflows`. *Modello IDE esatto non desumibile.*

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

- **Roadmap README / WEEKLY_LOG**: settimane 2+ (RAG, eval, fine-tuning) descritte come piani — implementazione non tracciata in questo log come codice completato.
- **grep `TODO|FIXME|HACK|XXX`** in `app/`, `lib/`, `components/` (esclusi artifact): **nessun match** al momento dell’analisi.
- **Costi Anthropic**: da monitorare in produzione (nessun rate cap nel repo analizzato in questa passata).
- **Debito tecnico inferito**: history compressa in poche ore con 59 commit — conviene **squash** o policy commit prima di onboarding esterni.
- **Debito tecnico inferito**: streaming e error handling API da stress-testare con limiti token reali (non coperti da grep statico).
- **Debito tecnico inferito**: allineamento versione `AI_LOG.md` vs `WEEKLY_LOG.md` quando cambia lo stack (evitare drift narrativo).

---

> **Nota metodologica**: integrazione automatica 2026-04-22; le parti *[inferito]* vanno validate dal maintainer, in particolare i prompt ricostruiti senza transcript.

---

## Metodologia compilazione automatica

Completamento autonomo il **22 aprile 2026** su:

- **59** commit in `git log` (stesso giorno per gran parte della history)
- **~10** file di contesto (`package.json`, `next.config.ts`, `lib/prompts.ts`, `lib/anthropic.ts`, `AGENTS.md`, `.github/workflows/*`, `README.md`, `SETUP_GUIDE.md`, `WEEKLY_LOG.md`)
- **0** occorrenze `TODO|FIXME|HACK|XXX` nei path sorgente ispezionati

**Punti di minore confidenza:**

- Ricostruzione prompt fase 1 senza log Cursor.
- Ipotesi “due passate” di scaffold: dedotta da duplicazione messaggi, non da evidenza diretta.
- Copertura grep limitata ai file presenti nel workspace aperti dall’agente.

---
