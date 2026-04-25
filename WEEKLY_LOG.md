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

## Note generali

- **Editor**: VS Code + Cursor per agenti AI
- **Linguaggio apprendimento**: Italiano (per coherenza con tutor)
- **Versioning**: Semantic versioning su release (vedi GitHub Releases)
- **Feedback**: Ogni settimana aggiorna questo file e il README con nuove scoperte
