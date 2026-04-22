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
| **Styling** | Tailwind CSS 3.4 + `@soli92/solids` preset |
| **Backend** | Next.js API routes (streaming SSE) |
| **LLM** | Anthropic Claude Haiku 3.5 |
| **Deployment** | Vercel (automatico da `main`) |

### Repo GitHub
- **Owner**: soli92
- **Visibility**: Pubblica
- **Branch principale**: `main`
- **URL**: https://github.com/soli92/soli-prof
- **Docs**: README.md, WEEKLY_LOG.md, questo file

---

## Struttura directory

```
soli-prof/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts           # POST /api/chat — streaming SSE
│   ├── page.tsx                   # Pagina home
│   ├── layout.tsx                 # Root layout + metadati
│   └── globals.css                # Stili globali
├── components/
│   ├── chat-view.tsx              # Componente chat (state, logica, input)
│   └── message-bubble.tsx         # Visualizzazione messaggi
├── lib/
│   ├── anthropic.ts               # Client Anthropic (init, config)
│   └── prompts.ts                 # System prompt del tutor
├── public/                        # Assets statici (favicon, ecc.)
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions → Vercel (auto)
├── .env.example                   # Variabili d'ambiente template
├── .npmrc                         # NPM config (GitHub Packages auth)
├── .nvmrc                         # Node.js version (22)
├── package.json                   # Dipendenze, script
├── tsconfig.json                  # TypeScript config
├── tailwind.config.ts             # Tailwind + preset SoliDS
├── postcss.config.mjs             # PostCSS (Tailwind, autoprefixer)
├── next.config.ts                 # Next.js config
├── README.md                       # Documentazione progetto
├── WEEKLY_LOG.md                  # Log settimanale apprendimento
├── AGENTS.md                       # Questo file
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

## Variabili d'ambiente

### Richieste (produzione)
- `ANTHROPIC_API_KEY` — Chiave API da [console.anthropic.com](https://console.anthropic.com)
- `NPM_TOKEN` — GitHub PAT con scope `read:packages` (se installi `@soli92/solids`)

### Opzionali (dev)
- `VERCEL_TOKEN` — Per deploy da CLI (raramente usato)

### Setup locale

```bash
# Esporta token prima di npm install
export NPM_TOKEN=ghp_your_token

npm install
cp .env.example .env.local
# Scrivi ANTHROPIC_API_KEY in .env.local

npm run dev
```

### Setup Vercel

1. Vai a [vercel.com](https://vercel.com) → Project Settings
2. Environment Variables:
   - `ANTHROPIC_API_KEY` — (tutti gli ambienti)
   - `NPM_TOKEN` — se privato (tutti gli ambienti)
3. Deploy automatico su `main` push

---

## Componenti principali

### ChatView (`components/chat-view.tsx`)

**Responsabilità:**
- Gestione state messaggi (useState)
- Input form e submit handler
- Fetch POST /api/chat
- Streaming reader per accumulare risposta
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

## Testing (setup futuro)

Per ora non c'è test framework. Se aggiungerai test:

- Unit test: `lib/**/*.test.ts`
- Integration test: `app/api/**/*.test.ts`
- E2E test: Playwright in `e2e/`

Comandi suggeriti:
```bash
npm test              # Esegui tutti
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright
```

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
6. Deploy Vercel (con `VERCEL_TOKEN` + `ANTHROPIC_API_KEY` + `NPM_TOKEN` come secrets)

### Secrets da aggiungere

Vai a **repo → Settings → Secrets and variables → Actions**:

| Secret | Valore |
|--------|--------|
| `VERCEL_TOKEN` | Token da [Vercel → Settings → Tokens](https://vercel.com/account/tokens) |
| `ANTHROPIC_API_KEY` | Chiave API Anthropic |
| `NPM_TOKEN` | GitHub PAT con `read:packages` |

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
- **GitHub Packages**: https://docs.github.com/en/packages

---

## Contatti e supporto

- **Creatore**: [soli92](https://github.com/soli92)
- **Issue tracker**: [GitHub Issues](https://github.com/soli92/soli-prof/issues)
- **Discussioni**: [GitHub Discussions](https://github.com/soli92/soli-prof/discussions)

---

**Ultimo aggiornamento**: 22 Aprile 2024
**Versione progetto**: 0.1.0
**Status**: ✅ Setup completato, pronto per Settimana 2 (Prompt Engineering)
