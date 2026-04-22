# Soli Prof — Weekly Log

Documentazione settimanale dello sviluppo di Soli Prof in pubblico.

## Settimana 1: Setup Iniziale e Primo Scaffold

**Data**: Aprile 2026

### Completato ✅
- [x] Scaffold progetto Next.js 16 con TypeScript
- [x] Integrazione design system @soli92/solids (GitHub Packages)
- [x] Configurazione Tailwind CSS con preset SoliDS
- [x] Struttura cartelle per estensione futura (lib/, components/)
- [x] Chat API route con streaming Anthropic Claude Haiku 4.5
- [x] Componente ChatView con SSE streaming
- [x] Setup environment variables e .npmrc per GitHub Packages
- [x] Deploy pronto per Vercel

### In Progress 🔄
- [ ] Integrazione test suite (tester sub-agent)
- [ ] GitHub Actions CI/CD básico
- [ ] Collegamento a Vercel

### To Do 📋
- [ ] Aggiungere memoria conversazionale persistente (Redis/Supabase)
- [ ] Tool use: ricerca web, esecuzione code sandbox
- [ ] RAG per documentazione AI engineering
- [ ] Tema scuro/chiaro con next-themes
- [ ] Mobile responsive improvements
- [ ] Analytics e tracking utilizzo
- [ ] Blog per documentare processo di apprendimento

### Note Tecniche
- Stack: Next.js 16, TypeScript, Tailwind + SoliDS, Anthropic SDK
- Model: Claude Haiku 4.5 (economico per iterazioni rapide)
- Chat: streaming SSE lato client React, niente persistenza locale ancora
- Design: minimale, focus su funzionalità core

### Link Utili
- Repo: https://github.com/soli92/soli-prof
- Live Demo: (da deployare su Vercel)
- Design System: https://github.com/soli92/solids
