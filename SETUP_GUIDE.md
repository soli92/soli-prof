# 🔧 Setup Guide Completo — Soli Prof

Guida passo-passo per clonare, configurare e deployare **Soli Prof** in locale e in produzione.

## ✅ Prerequisiti

- **Node.js 22+** — Verifica con `node --version`
- **npm 10+** — Verifica con `npm --version`
- **Account GitHub** — Per generare il Personal Access Token (PAT)
- **Account Anthropic** — Per la chiave API Claude
- **Account Vercel** (opzionale, per deploy) — [vercel.com](https://vercel.com)

---

## 1️⃣ Preparazione: Token e chiavi

### A. GitHub Personal Access Token (PAT)

Necessario per installare `@soli92/solids` da GitHub Packages.

**Step:**
1. Vai su [github.com/settings/tokens](https://github.com/settings/tokens)
2. Clicca **"Generate new token (classic)"**
3. Riempi:
   - **Note**: "soli-prof npm install"
   - **Scopes**: Seleziona `read:packages`
   - **Expiration**: Scegli (es. 30 giorni, 90 giorni, no expiration)
4. Clicca **"Generate token"**
5. **Copia il valore** (appare una sola volta!)

Salva il token in un posto sicuro per il prossimo step.

### B. Anthropic API Key

Per il tutor personale Claude.

**Step:**
1. Vai su [console.anthropic.com](https://console.anthropic.com)
2. Login o registrati
3. Vai a **Settings → API Keys**
4. Clicca **"Create Key"**
5. Nomina la chiave (es. "soli-prof")
6. **Copia il valore** (appare una sola volta!)

Salva in un posto sicuro.

---

## 2️⃣ Clona il repo

```bash
git clone https://github.com/soli92/soli-prof
cd soli-prof
```

---

## 3️⃣ Configura NPM_TOKEN per GitHub Packages

**Prima** di `npm install`, esporta il GitHub PAT come variabile d'ambiente:

```bash
# Macros / Linux / WSL
export NPM_TOKEN=ghp_your_actual_token_here_no_quotes

# Windows PowerShell
$env:NPM_TOKEN = "ghp_your_actual_token_here_no_quotes"

# Windows CMD
set NPM_TOKEN=ghp_your_actual_token_here_no_quotes
```

**Verifica che è impostato:**
```bash
echo $NPM_TOKEN  # Deve stampare il token
```

---

## 4️⃣ Installa dipendenze

```bash
npm install
```

Se ricevi errore `401 Unauthorized` per `@soli92/solids`:
- Verifica di aver esportato `NPM_TOKEN` correttamente
- Verifica che il token ha scope `read:packages`
- Riprova: `npm install`

---

## 5️⃣ Configura variabili d'ambiente locale

```bash
# Copia il template
cp .env.example .env.local
```

Apri `.env.local` e aggiungi:

```env
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here_no_quotes
NPM_TOKEN=ghp_your_token_here_optional_if_already_exported
```

**Nota**: Se hai già esportato `NPM_TOKEN` nel terminal, puoi omettere da `.env.local`.

---

## 6️⃣ Avvia il dev server

```bash
npm run dev
```

Dovresti vedere:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

Apri [http://localhost:3000](http://localhost:3000) nel browser. 🎉

**Test:**
- Scrivi un messaggio nella chat
- Dovresti ricevere una risposta dal tutor personale

---

## 7️⃣ Build locale (test pre-deploy)

```bash
npm run build
```

Se il build passa senza errori, sei pronto per il deploy.

---

## 8️⃣ Deploy su Vercel (opzionale)

### Opzione A: Via web dashboard (consigliato)

1. Vai su [vercel.com](https://vercel.com)
2. Clicca **"Import Project"**
3. Seleziona **"Continue with GitHub"**
4. Cerca e seleziona `soli92/soli-prof`
5. Nella sezione **Environment Variables**, aggiungi:
   - `ANTHROPIC_API_KEY` = (la tua chiave)
   - `NPM_TOKEN` = (il tuo GitHub PAT, se usato privato)
6. Clicca **"Deploy"**

Vercel scaricherà la repo, farà build e deploierà. Riceverai un URL tipo `https://soli-prof.vercel.app` (oppure una preview URL temporanea).

### Opzione B: Via CLI

```bash
# Installa Vercel CLI globalmente
npm i -g vercel

# Login
vercel login

# Deploy a staging
vercel

# Deploy a production
vercel --prod
```

### Configurazione GitHub Actions (deploy automatico)

Una volta che il progetto è su Vercel, puoi configurare il deploy automatico:

1. Vai al repo GitHub → **Settings → Secrets and variables → Actions**
2. Aggiungi i seguenti secrets:
   - `VERCEL_TOKEN` → Token da [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` → Trovi nel dashboard Vercel o in `vercel.json`
   - `VERCEL_PROJECT_ID` → Idem
   - `ANTHROPIC_API_KEY` → La tua chiave
   - `NPM_TOKEN` → Il tuo GitHub PAT

3. Ogni push a `main` triggerera il workflow `.github/workflows/deploy.yml`

---

## 🔍 Troubleshooting

### ❌ npm install fallisce con "401 Unauthorized"

**Causa**: `NPM_TOKEN` non impostato correttamente.

**Soluzione**:
```bash
# Verifica token
echo $NPM_TOKEN  # Deve stampare il token

# Se vuoto, riesporta
export NPM_TOKEN=ghp_your_token

# Riprova
npm install
```

### ❌ "ANTHROPIC_API_KEY is required"

**Causa**: `.env.local` manca di `ANTHROPIC_API_KEY` o non trovato.

**Soluzione**:
```bash
# Verifica file esiste
ls -la .env.local

# Verifica contenuto
cat .env.local | grep ANTHROPIC_API_KEY

# Se assente, aggiungi manualmente
echo "ANTHROPIC_API_KEY=sk-ant-your_key" >> .env.local
```

### ❌ Dev server parte ma chat non risponde

**Causa**: API route fallisce o ANTHROPIC_API_KEY invalida.

**Soluzione**:
1. Verifica chiave API è corretta (niente spazi, caratteri strani)
2. Vai a [console.anthropic.com](https://console.anthropic.com) e ricrea una nuova chiave
3. Aggiorna `.env.local`
4. Riavvia dev server: `npm run dev`

### ❌ Build fallisce con "TypeScript errors"

**Causa**: Errori di tipo non corretti.

**Soluzione**:
```bash
# Type-check locale
npm run type-check

# Leggi errori e correggi
# Poi riprova build
npm run build
```

### ❌ Tailwind styling non appare

**Causa**: CSS non rigenerato.

**Soluzione**:
```bash
# Pulisci Next.js cache
rm -rf .next

# Ricompila
npm run build

# Riavvia dev
npm run dev
```

---

## 📱 Test su mobile

### PWA locale
```bash
# Dev server deve girare
npm run dev

# Apri http://localhost:3000 da smartphone
# Menu → Aggiungi a schermata home
```

### Deploy preview Vercel
Il link preview URL generato da Vercel è già mobile-responsive. Prova su un dispositivo reale o usa DevTools (F12 → Toggle device toolbar).

---

## 🎯 Checklist finale

Prima di considerare il setup "DONE":

- ✅ Node.js 22+ installato
- ✅ npm install senza errori
- ✅ `.env.local` creato con `ANTHROPIC_API_KEY`
- ✅ Dev server avviato (`npm run dev`)
- ✅ Chat funziona (ricevi risposta dal tutor)
- ✅ Build passa (`npm run build`)
- ✅ (Opzionale) Deploy Vercel configurato

Se tutti i punti sono ✅, sei pronto a:
- Fare feature request
- Modificare il sistema prompt
- Deployare su Vercel
- Iniziare la Settimana 2 di apprendimento AI!

---

## 🆘 Serve aiuto?

- **GitHub Issues**: [Apri una issue](https://github.com/soli92/soli-prof/issues)
- **README.md**: Documentazione generale
- **AGENTS.md**: Per info tecniche dettagliate
- **WEEKLY_LOG.md**: Per vedere il progresso

---

**Ultimo aggiornamento**: 22 Aprile 2024
