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

---

## Note generali

- **Editor**: VS Code + Cursor per agenti AI
- **Linguaggio apprendimento**: Italiano (per coherenza con tutor)
- **Versioning**: Semantic versioning su release (vedi GitHub Releases)
- **Feedback**: Ogni settimana aggiorna questo file e il README con nuove scoperte
