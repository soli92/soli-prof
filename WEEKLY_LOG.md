# 📖 Weekly Learning Log — Soli Prof

Documentazione settimanale del percorso di apprendimento AI engineering.

---

## Settimana 1: Setup iniziale e primo scaffold (22 Aprile 2024)

### 🎯 Obiettivi
- ✅ Creare il progetto Next.js 16 con TypeScript
- ✅ Integrare il design system `@soli92/solids`
- ✅ Implementare un'interfaccia chat semplice ma pulita
- ✅ Collegare Claude Haiku 3.5 con streaming SSE
- ✅ Deploy automatico su Vercel con GitHub Actions

### 📝 Cosa è stato fatto

#### Infrastruttura
- Repository GitHub `soli92/soli-prof` creata e pubblica
- Stack scelto: Next.js 16 + React 19 + TypeScript
- Tailwind CSS con preset `@soli92/solids` (design system privato su GitHub Packages)
- Configurazione `.npmrc` per accesso a `@soli92/solids`

#### Frontend
- Componente `ChatView` — interfaccia chat con:
  - Input campo per domande
  - Scroll automatico ai nuovi messaggi
  - Loading indicator animato
  - Gestione errori di API
- Componente `MessageBubble` — visualizzazione messaggi user/assistant
- Stili Tailwind CSS allineati ai token SoliDS (`--sd-color-*`, `--sd-space-*`)

#### Backend
- API route `POST /api/chat` con streaming SSE
  - Integrazione Anthropic Claude Haiku 3.5
  - System prompt ottimizzato per tutor personale
  - Timeout 60 secondi
  - Manejo errori con messaggi chiari

#### Sistema prompt
- System prompt pensato per:
  - Risposte in italiano, sempre
  - Brevità e concretezza (no teoria astratta)
  - Esempi pratici di codice
  - Tono supportivo senza condiscendenza
  - Specializzazione: AI engineering, frontend avanzato, DevOps

#### Documentazione
- README completo con:
  - Spiegazione del perché del progetto
  - Setup passo-passo (incluso NPM_TOKEN per GitHub Packages)
  - Istruzioni deploy Vercel
  - Stack tecnico
- `.env.example` con commenti per ogni variabile
- WEEKLY_LOG per documentare il progresso

#### DevOps / CI-CD
- GitHub Actions workflow per:
  - Build e type-check su ogni push
  - Deploy automatico su Vercel per branch `main`

### 🔍 Learning takeaways

1. **Streaming SSE in Next.js** → ReadableStream + encoder per risposta real-time
2. **Anthropic SDK** → Modelli, timeout, cost-optimization con Haiku
3. **Design system riusabile** → Integrare preset Tailwind + CSS variables
4. **GitHub Packages** → Setup NPM auth con PAT per dipendenze private
5. **System prompt engineering** → Come guidare l'LLM per specifico ruolo

### 🐛 Problemi incontrati e soluzioni

| Problema | Soluzione |
|----------|-----------|
| `@soli92/solids` non installabile senza auth | Configurare `.npmrc` con `NPM_TOKEN` e GitHub Packages registry |
| Streaming SSE incompleto nel client | Leggere intero stream con `while (true)` fino a `done: true` |
| Scroll non fluido in chat mobile | Usare `scrollIntoView({ behavior: 'smooth' })` con ref |

### 📚 Prossimo step
- **Settimana 2**: Prompt engineering avanzato
  - Zero-shot vs few-shot prompting
  - Chain-of-thought prompts
  - Valutazione della qualità delle risposte

---

## Giorno 2 — 24 aprile 2026

### Cosa ho fatto
- Integrato RAG nella chat del tutor (retrieveContextWithSources)
- Risolto problema di retrieval scadente passando da topK=5 a topK=15
- Rinforzato system prompt con regole esplicite di citazione
- UI badge citazioni cliccabili colorati per repo
- Tooltip on hover con preview chunk + similarity (fix flicker con CSS-only)
- Pulsante copia messaggio sulle bubble assistant

### Quello che funziona
- Tutor cita esplicitamente commit hash dai miei repo (es. e97fe95 per CORS casa-mia-be)
- Tutor si auto-presenta usando il contesto dei miei AI_LOG (conosce i miei repo)
- Deploy Vercel automatico su push
- 70 chunk indicizzati da 6 repo (soli-agent, casa-mia-be/fe, bachelor-party, solids, soli-prof)

### Cosa ho imparato
- Retrieval è il collo di bottiglia del RAG, non la generation
- System prompt "ignoralo se non rilevante" = LLM ignora sempre → serve "USA il contesto OBBLIGATORIAMENTE"
- Tooltip con React state genera flicker, pattern CSS group-hover è stabile
- Soli Agent è affidabile su sovrascrittura completa file, inaffidabile su patch multi-file

### Aperto per un'altra sessione
- Ingest automatico (bottone manuale nel frontend vs GitHub Action)
- Chunking più fine per liste markdown
- Auth team per Soli Prof
- Disciplina AI_LOG in tempo reale durante sessioni Cursor reali

## Settimana 2: [TBD]
Spazio per prossime scoperte...

## Settimana 3: Knowledge base RAG, chunker e hardening (24 aprile 2026)

Pivot: Soli Prof non è più solo un tutor, ma anche una knowledge base RAG personale accessibile via API anche da Soli Agent. Focus oggi: consolidare qualità retrieval + UX admin + robustezza produzione.

### 🎯 Obiettivi
- ✅ Pulizia architetturale (rimuovere lib/rag/ vecchio post-migrazione)
- ✅ Chunker più fine per liste markdown (pattern contextual retrieval)
- ✅ Ridurre hallucination su query generiche
- ✅ Ridurre rumore visivo nei badge sources
- ✅ Fix bug rendering marker SSE
- ✅ Fix bug admin "Re-ingest Tutto"

### 📝 Cosa è stato fatto

#### Pulizia architetturale
- Rimosso `lib/rag/` vecchio (7 file morti post-migrazione a `lib/rag-service`) — `8e7d00b`
- `tsconfig.tsbuildinfo` rimosso dal tracking git (era committato per errore) — `8e7d00b`
- `.gitignore` ripulito dai duplicati — `17b7cab`

#### Chunker contextual retrieval
- Split bullet list markdown con soglie: >=3 item e ogni item >=50 char
- Preambolo della sezione padre incluso come prefisso in ogni chunk split
- Pattern ispirato a "Contextual Retrieval" di Anthropic (sett 2024)
- Edge case coperti: bullet multi-paragrafo, liste miste ordered+unordered, bullet >maxChars splittati da splitByParagraphs
- 36 test automatici (+8 nuovi)
- Script dry-run su 12 repo prima del re-ingest reale
- Risultato: 98→231 chunk ai_logs, 143→259 chunk agents_md (ratio 2.36x/1.81x)
- Implementazione chunker — `16ddc42`

#### Retrieval, prompt, SSE e admin
- Regola anti-forcing per domande generiche — `6c3c4fa`
- Soglia similarity asimmetrica context vs sources — `a6a0dea`
- Parser sources SSE a buffer accumulativo — `1c1d180`
- Re-ingest "Tutto": entrambi i corpus distinti in UI — `c754f6e`

---

## Fix UI: Bottone Invia — Label centrata

### 🎯 Problema riportato
Il bottone "Invia" nella chat aveva spacing corretto (`px-6 py-3`) ma la **label del testo non era centrata verticalmente**.

### ✅ Soluzione implementata

**File**: `components/chat-view.tsx` — bottone submit

**Prima**:
```jsx
<button
  type="submit"
  disabled={loading || !input.trim()}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors sd-min-touch-target"
  aria-label={loading ? "Invio in corso" : "Invia messaggio"}
>
  {loading ? "..." : "Invia"}
</button>
```

**Dopo**:
```jsx
<button
  type="submit"
  disabled={loading || !input.trim()}
  className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors sd-min-touch-target"
  aria-label={loading ? "Invio in corso" : "Invia messaggio"}
>
  {loading ? "..." : "Invia"}
</button>
```

### 🔧 Cosa è cambiato
- Aggiunto **`flex items-center justify-center`** al className
- Questa combinazione Tailwind centra il contenuto **sia verticalmente che orizzontalmente** usando flexbox

### 📚 Lezione appresa
**Flexbox per bottoni con testo**:
- `flex` — attiva flexbox su bottone
- `items-center` — allinea verticalmente (asse cross)
- `justify-center` — allinea orizzontalmente (asse main)

Questo pattern è **standard** per bottoni con testo/icone e **elimina dipendenze** da line-height ereditato o baseline font diversi.

### 📝 Documentazione
- Documentazione completa in **`docs/UI_COMPONENTS.md`**
- AI_LOG.md aggiornato con questa fix nella **Fase 7**
- Pattern applicabile a tutti i bottoni del progetto

---

## Settimana 4: Pulizia RAG, chunker contestuale e hardening chat/admin (24 aprile 2026)

### 🎯 Obiettivi
- ✅ Pulizia architetturale (rimuovere lib/rag/ vecchio post-migrazione)
- ✅ Chunker più fine per liste markdown (pattern contextual retrieval)
- ✅ Ridurre hallucination su query generiche
- ✅ Ridurre rumore visivo nei badge sources
- ✅ Fix bug rendering marker SSE nella chat
- ✅ Fix bug admin "Re-ingest Tutto"

### 📝 Cosa è stato fatto

#### Pulizia architetturale
- Rimosso `lib/rag/` vecchio (7 file morti post-migrazione a `lib/rag-service`)
- `tsconfig.tsbuildinfo` rimosso dal tracking git
- `.gitignore` ripulito dai duplicati

#### Chunker contextual retrieval
- Split bullet list markdown con soglie: >=3 item e ogni item >=50 char
- Preambolo della sezione padre incluso come prefisso in ogni chunk split
- Pattern ispirato a "Contextual Retrieval" di Anthropic (sett 2024)
- Edge case: bullet multi-paragrafo, liste miste ordered+unordered, bullet >maxChars splittati
- 36 test (+8 nuovi)
- Risultato: 98→231 chunk ai_logs, 143→259 chunk agents_md

#### System prompt anti-forcing
- Bug: il tutor inventava API come "chainProvider" su domande generiche tipo "cos'è una monade"
- Aggiunta sezione "QUANDO NON FORZARE IL CONTESTO" in `lib/prompts.ts`
- Distingue query specifiche ai progetti (USA contesto obbligatoriamente) vs generiche (contesto opzionale)

#### Modo B — threshold similarity asimmetrico
- Bug: query generiche mostravano 25+ badge di chunk con similarity marginale
- Due soglie distinte in RAG_CONFIG:
  - `similarityThresholdForContext=0.20` (LLM vede materiale per inferenza)
  - `similarityThresholdForSources=0.40` (UI mostra solo badge ad alta confidenza)

#### Fix parser SSE `__SOURCES__`
- Bug: il marker `__SOURCES__<json>__END_SOURCES__` appariva come testo grezzo nella chat su risposte con molte fonti
- Causa: parser frontend usava regex sul singolo chunk, marker arrivava spezzato tra chunk SSE
- Fix: buffer accumulativo cross-chunk

#### Fix admin Re-ingest Tutto
- Bug: UI mostrava solo l'ultimo corpus processato (agents_md)
- Causa: hook trattava eventi SSE come stream unificato, mentre backend emette 2 cicli
- Fix: introduzione di CorpusRun + `corpusRuns[]`; UI con sezione per corpus run

### 🧠 Lezioni tecniche cristallizzate
- Serverless costringe design stateless (cookie HMAC)
- Measure before optimize (validato con 5 query empiriche)
- Stream SSE: mai assumere atomicità dei pattern, buffer accumulativo come default
- Soglia asimmetrica: separare "cosa il LLM vede" da "cosa l'utente vede"

### 🔧 Debito tecnico dichiarato
- `/api/chat` oggi usa solo `ai_logs` senza RRF cross-corpus
- "Inferenza da assenza": il tutor dice "non vedo X in CI" se il chunk non è indicizzato
- `topK=25` hardcoded in `/api/chat`

### 🚀 Open per prossime sessioni
- Automazione ingest (GitHub Actions webhook + cron Vercel)
- Hybrid search BM25 + semantic
- Reranker Voyage
- Espansione corpus a workflows + `package.json` (risolve inferenza da assenza)

---

## Settimana 5: Architettura RAG matura — versioning, multi-corpus, hybrid retrieval e automazione (27 aprile 2026)

Sessione lunga (circa 11h30 di lavoro effettivo) dedicata a portare il sistema RAG da "funzionante ma fragile" a "architettura production-grade". L'obiettivo non era aggiungere feature visibili al tutor, ma costruire le fondamenta che renderanno il sistema scalabile per i prossimi mesi: capacità di indicizzare nuovi tipi di file senza riscrivere il chunker, fondere ranking da più sorgenti, attivare/disattivare strategie di retrieval via env var, e automatizzare la pipeline di re-ingest.

### 🎯 Obiettivi della giornata
- ✅ Versioning chunk per migrazione graduale senza TRUNCATE
- ✅ Refactor chunker in pattern Strategy (eliminare codice monolitico)
- ✅ Nuovo corpus `repo_configs` per indicizzare file di configurazione
- ✅ Reciprocal Rank Fusion (RRF) per fondere ranking da più corpus
- ✅ Voyage reranker opzionale per migliorare top-N (cross-encoder)
- ✅ Hybrid retrieval BM25 + semantic per query keyword-specifiche
- ✅ Webhook GitHub per re-ingest automatico ad ogni push
- ✅ Lazy init clients API (fix CI rosso da inizio sessione)
- ✅ Update Soli Agent per consumare il terzo corpus

### 📝 Cosa è stato fatto

#### Versioning chunk per migrazione graduale (Fase 1)
Ogni chunk in Supabase ora porta `chunker_version` (es. "markdown-v2.1") e `corpus_version` (es. "v1") nei metadata. Le RPC di retrieval filtrano per versione tramite parametro `target_corpus_version`. Significa che vecchi e nuovi chunk possono coesistere nella stessa tabella: nessun TRUNCATE, nessun downtime durante refactor del chunker. La migrazione è graduale per design.

Pattern utile per il futuro: ogni volta che il chunker cambierà output, basterà incrementare `CURRENT_CHUNKER_VERSION`, re-ingestare, e i nuovi chunk conviveranno con i vecchi finché non si decide la pulizia.

#### Strategy pattern per i chunker (Fase 2 + Fase 3)
Il vecchio `chunker.ts` era un file monolitico che gestiva solo markdown. Refactorato in architettura plugin:

```
lib/rag-service/chunkers/
├── types.ts                interface ChunkStrategy
├── markdown.ts             MarkdownChunkStrategy
├── package-json.ts         per package.json (estrae overview, deps, scripts)
├── tsconfig.ts             per tsconfig.json (con strip JSONC commenti)
├── github-workflow.ts      per .github/workflows/*.yml (libreria yaml)
├── prisma-schema.ts        per prisma/schema.prisma (state machine)
├── env-example.ts          per .env.example (split su separatori # ===)
├── generic-config.ts       fallback per next/vite/tailwind config
└── registry.ts             selectChunker(filename) → ChunkStrategy
```

Aggiungere un nuovo formato significa creare 1 file e registrarlo. Zero modifiche al core. Il pattern è `selectChunker(filename)` che ritorna la strategia giusta, ognuna con la sua `version`.

Il payoff di questo refactor è arrivato subito nella stessa giornata: dopo il refactor è bastato implementare 6 strategy (15-20 righe ciascuna) per supportare un intero nuovo corpus.

#### Nuovo corpus `repo_configs`
Terza tabella Supabase, terza RPC, 215 chunk indicizzati su 13 repo. Indicizza file di configurazione: `package.json`, `tsconfig.json`, `.github/workflows/*.yml`, `prisma/schema.prisma`, `.env.example`, e i vari `*.config.{ts,js}`. La differenza rispetto ai due corpus esistenti (`ai_logs` per AI_LOG.md, `agents_md` per AGENTS.md) è che ogni repo ha N file invece di uno solo: la pipeline di ingest è stata estesa per gestire glob patterns (`*.yml`) e fetchare directory tramite GitHub API.

Esempio di valore concreto: prima il tutor non sapeva quale Node version usavo, quale framework di test, quali workflow CI. Ora cita `.github/workflows/deploy.yml > jobs.build-and-deploy` con `NODE_VERSION: 22` quando glielo chiedi.

#### Reciprocal Rank Fusion cross-corpus (Fase 5)
Il tutor della chat di Soli Prof prima interrogava solo `ai_logs`. Ora interroga tutti e 3 i corpus in parallelo e fonde i ranking via RRF (Cormack et al. 2009, k=60). RRF fonde su rank position, non su score values: chunk presente in più corpus vince su chunk eccellente in uno solo. Riduce il bias verso il corpus più grande.

Verificato empiricamente che il tutor inizia a fare cross-reference: una domanda su CORS in casa-mia-be ora cita anche pattern correlati da soli-dm-be e snippet da `.env.example`, perché il chunk dedicato emerge in più corpus.

#### Voyage reranker opzionale
Aggiunto un secondo passaggio di re-ranking dopo RRF, attivabile via env `VOYAGE_RERANK_ENABLED=true`. Voyage rerank API è un cross-encoder che valuta query+document insieme — più potente del bi-encoder usato per gli embedding, perché vede la query nel contesto di ogni chunk specifico. Atteso +10-15% accuracy sulla rilevanza top-N, costo ~$0.02 per 1k chiamate, latency aggiunta 50-100ms con `rerank-2-lite`.

Il toggle è dormiente in produzione: il codice è pronto, ma `VOYAGE_RERANK_ENABLED=false` di default. Lo attiverò in una sessione dedicata per misurare il delta di qualità con calma.

#### Hybrid retrieval BM25 + semantic
Aggiunta una colonna `tsvector` generata su Supabase con indice GIN, e tre nuove RPC `match_rag_*_text` che usano `ts_rank` per text search keyword-based. La nuova `queryCorpusHybrid` interroga in parallelo embedding cosine e BM25, fonde i due ranking via RRF interno, e ritorna i chunk più rilevanti. Toggle via `RAG_HYBRID_ENABLED=true`.

Il caso d'uso lampante è la query "Come ho gestito il CORS in casa-mia-be?". L'embedding bi-encoder per quella frase ranka chunk casa-mia-be sotto soglia 0.30 (perché parole come "Come", "ho", "gestito" disturbano), mentre 4 chunk di soli-agent (che parlano di "AGENTS", "Cursor", "Node 22") finiscono in cima. Risultato: il tutor risponde "non trovo informazioni su casa-mia-be". BM25 invece trova letteralmente "CORS" e "casa-mia-be" e fa risalire il chunk giusto. Hybrid risolve esattamente questo trade-off.

Anche questo è dormiente di default. Pronto per attivazione ad-hoc.

#### Webhook GitHub per re-ingest automatico (Step 4)
Endpoint `POST /api/webhooks/github` con verifica HMAC-SHA256, parsing payload push, routing intelligente: se il push modifica `AI_LOG.md` triggera ingest selettivo del corpus `ai_logs` per quel solo repo (non tutti i 13 come faceva prima). Stesso per `AGENTS.md` e per i pattern di config files.

Per arrivarci ho dovuto refactorare `ingestCorpus` con un parametro opzionale `targetRepos: RepoTarget[]` che filtra il subset di repo da reingestare. Helper `filterTargetRepos` esportata, riusata sia da webhook che da test.

Setup webhook bulk sui 13 repo via script bash (idempotente). Latency end-to-end: GitHub push → re-ingest completato in Supabase in 5-7 secondi. Niente più click manuali su admin per re-ingestare.

#### Aggiornamento Soli Agent
Il tool `searchKnowledge` di Soli Agent è stato esteso per consumare il terzo corpus. Refactor della `reciprocalRankFusion` da signature fissa a 2 array a signature variadica per N corpus. Format output con tag emoji per distinguere i corpora (📜 AI_LOG, 🤖 AGENTS, ⚙️ CONFIG).

#### Bug fix collaterali (CI verde per la prima volta)
Tutti i deploy GitHub Actions di soli-prof fallivano da settimane con `ANTHROPIC_API_KEY environment variable is not set`. Il client Anthropic era istanziato a top-level di `lib/anthropic.ts`, e `next build` carica i moduli durante "collect page data" anche se l'env var non è disponibile. Vercel deployava comunque grazie alla GitHub integration nativa, ma il workflow GitHub Actions restava sempre rosso (10+ deploy falliti).

Fix in due parti:
1. **Lazy init**: `getAnthropicClient()` con cache singleton, errore esplicito solo al primo uso. Pattern già usato in `lib/rag-service/store.ts` per Supabase, replicato.
2. **Workflow CI semplificato**: rimosso lo step "Deploy to Vercel" (Vercel deploya già da solo via GitHub integration). Workflow rinominato da "Deploy to Vercel" a "CI", aggiunto trigger `pull_request`, aggiunto step `npm test`. Ora il workflow è puro CI gate.

Risultato: primo CI verde in settimane.

### 🧪 Misure quantitative

| Metrica | Inizio sessione | Fine sessione |
|---|---|---|
| Test automatici | 49 | 128 |
| Corpus indicizzati | 2 (ai_logs, agents_md) | 3 (+ repo_configs) |
| Chunk in Supabase | ~660 v1 + ~838 NULL pre-versioning | 952 v1 puliti |
| Strategy chunker | 1 (markdown only) | 7 |
| Repo monitorati | 13 | 13 (+ webhook automation) |
| CI pipeline status | Rossa da settimane | Verde |
| Deploy GitHub Actions falliti aperti | 10+ | 0 |

### 🧠 Lezioni tecniche cristallizzate

**Versioning come strategia di migrazione**: aggiungere una colonna `corpus_version` nullable + filtro RPC permette di refactorare il chunker senza downtime. Il pattern è generalizzabile a qualsiasi schema dove il "produttore" cambia ma i "consumer" sono tanti — vecchi e nuovi dati coesistono finché non si fa cleanup esplicito.

**Strategy pattern paga subito**: refactor "speculativo" del chunker monolitico è stato giustificato nella stessa giornata. Aggiungere un nuovo chunker (es. `prisma-schema.ts`) costa 30 minuti totali se l'architettura è plugin, costerebbe ore di rischio in un file monolitico.

**RRF k=60 è uno standard**: dal paper Cormack et al. 2009. Non parametrizzarlo — RRF è auto-bilanciante e tutorato di letteratura. Usato sia per fondere semantic+BM25 (interno), sia per fondere N corpus (esterno). Due livelli di RRF coesistono senza interferenze.

**Embedding bi-encoder ha limiti su query naturali**: la stessa frase "Come ho gestito il CORS in casa-mia-be?" produce un embedding diverso da "CORS multi-origine" (similarity 0.27 vs 0.41 sullo stesso chunk). BM25 risolve perché lavora su match lessicale, non semantico. Hybrid è la risposta strutturale.

**Fire-and-forget non funziona su Vercel serverless**: la function viene terminata non appena l'handler ritorna 200 OK. Il `Promise` fire-and-forget viene killato prima ancora del primo I/O. Su Vercel l'ingest dopo webhook deve essere `await`. Il trade-off (webhook risponde in 5-15s invece di immediatamente) è accettabile, GitHub timeout è 10s.

**Lazy init come pattern obbligatorio per Next.js API routes**: nessun client API (`new Anthropic`, `new OpenAI`, `createSupabaseClient`) deve essere istanziato a top-level di un modulo. Next.js carica i moduli durante "collect page data" del build, anche se l'env var manca. Top-level instantiation = build break su CI dove env non è disponibile.

**Threshold filtering asimmetrico**: filtrare i badge UI (`similarityThresholdForSources=0.30`) in modo più stretto del context LLM (`similarityThresholdForContext=0.20`) elimina rumore visivo senza ridurre la capacità inferenziale del modello. Il tutor "vede" più materiale di quanto mostri all'utente.

**Quando rigeneri un PAT, aggiorna tutti i posti dove è usato**: ho perso 30 minuti in produzione perché lo stesso PAT era settato in tre posti (script setup-webhooks, env Vercel, GitHub Actions). Lezione: usare PAT diversi per usi diversi (least privilege), o tenere una nota dei posti dove ogni token è settato.

### 🐛 Debito tecnico dichiarato

- **`topK=25` hardcoded** in `/api/chat` (potrebbe stare in `RAG_CONFIG`)
- **RPC vecchie convivono come overload Postgres** (`CREATE OR REPLACE FUNCTION` non sostituisce su firma diversa, crea overload — DROP esplicito da fare)
- **Hybrid e Reranker dormienti**: codice in produzione ma toggle off. Misurazione qualitativa rimandata a sessione dedicata
- **Filtro threshold sources è bottleneck del RRF cross-corpus**: chunk con similarity 0.20-0.30 escono dalla pool prima ancora di concorrere via RRF. Da valutare se cambiare policy
- **Export `targetRepos` lato HTTP**: l'API `/api/rag/ingest` non legge `targetRepos` dal body (lo fa solo il webhook internamente). Da esporre se serve ingest selettivo via curl
- **AGENTS.md cita ancora `anthropic.messages.create`** invece del pattern lazy `getAnthropicClient()`. Solo documentazione, no impatto runtime

### 🚀 Open per prossime sessioni

- **A/B test reranker e hybrid in produzione**: attivare via env, raccogliere 10-20 query rappresentative, valutare delta qualità rispetto a baseline semantic-only
- **Eval framework strutturato**: oggi le valutazioni sono empiriche (curl + occhio). Costruire un dataset di 30-50 query con ground truth e calcolare metriche (recall@k, NDCG)
- **Pulizia chunk NULL** (opzionale): la migration ha lasciato 838 chunk con `corpus_version=NULL` orfani. Ignorati dalle RPC ma occupano spazio. `DELETE FROM rag_* WHERE corpus_version IS NULL` quando serve
- **Migrazione `lib/rag-service` su soli-platform monorepo**: estrarre come microservizio Docker. Il volume di codice giustifica un package proprio
- **Auth team per Soli Prof**: Supabase Auth con whitelist email per condividere il tutor con team selezionati

### 🎯 Cosa ho imparato di me come ingegnere oggi

Sono arrivato a 11h+ in una sola giornata di lavoro, e nelle ultime 2-3 ore ho introdotto bug più frequentemente. Esempio concreto: un falso allarme su una "regressione" delle sources che si è rivelato essere un limite noto del retrieval semantico per quel phrasing specifico — 30 minuti di diagnostica panicata su un comportamento atteso. Lezione: **quando vedo un bug che mi sembra non avere senso, spesso non è un bug**. Prima di lanciarmi in fix bisogna verificare con dati che il comportamento sia davvero anomalo.

Lavorare con Cursor su sessioni lunghe richiede disciplina: verificare il workspace prima di ogni prompt (mi è capitato di dare prompt per soli-prof quando Cursor era aperto su soli-agent), preferire dependency injection a `vi.spyOn` per evitare problemi di mocking ESM, lasciare che Cursor faccia diagnosi prima di proporre fix.

E sul versioning vs migrazione "tutto-o-niente": investire 20 minuti in più per rendere una modifica gradual-migrate-friendly costa molto meno del downtime se qualcosa va storto. Vale per schema DB, vale per refactor di moduli, vale per chunker che cambiano output.


---

## Note generali

- **Editor**: VS Code + Cursor per agenti AI
- **Linguaggio apprendimento**: Italiano (per coherenza con tutor)
- **Versioning**: Semantic versioning su release (vedi GitHub Releases)
- **Feedback**: Ogni settimana aggiorna questo file e il README con nuove scoperte