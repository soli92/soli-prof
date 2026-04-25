# 🎨 Componenti UI — Soli Prof

Documentazione dei componenti React e pattern UI usati nel progetto.

## Bottone Invia (Submit Button)

**File**: `components/chat-view.tsx`

### Struttura

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

### Design Pattern

#### Layout: Flexbox Centrato
- **`flex`** + **`items-center`** + **`justify-center`** — centra il testo verticalmente e orizzontalmente all'interno del bottone
- **Perché**: garantisce allineamento perfetto della label indipendentemente dal font-size o line-height ereditato
- **Alternative evitate**: `line-height` puro (dipendente dal font), `transform translate` (complesso)

#### Spaziatura
- **`px-6 py-3`** — padding interno ampio per leggibilità
- **`sd-min-touch-target`** — classe SoliDS che assicura **area minima tattile** 44x44px per accessibilità mobile

#### Colori
- **Default**: `bg-blue-600` (primary color)
- **Hover**: `hover:bg-blue-700` (tono più scuro)
- **Disabled**: `disabled:bg-gray-400` (grigio inerte), `disabled:cursor-not-allowed` (feedback visivo)

#### Stato
- **Testo dinamico**: `{loading ? "..." : "Invia"}`
- **Disabilitato quando**:
  - `loading === true` (richiesta in corso)
  - `input.trim()` è vuoto (validazione client)

#### Accessibilità
- **`aria-label`** dinamico che comunica il contesto al lettore di schermo
  - "Invio in corso" quando loading
  - "Invia messaggio" quando pronto

### Fix Cronologia

| Versione | Issue | Soluzione |
|----------|-------|-----------|
| v1 | Spacing del bottone non proporzionato | Aggiunto `px-6 py-3` |
| v2 | Label non centrata verticalmente | Aggiunto `flex items-center justify-center` |

### Best Practice

✅ **Fare**:
- Usare `flex` per layout interno dei bottoni quando contengono testo + icone
- Combinare `items-center` + `justify-center` per allineamento bidimensionale
- Mantenere `sd-min-touch-target` per accessibilità mobile
- Dinamicizzare `aria-label` in base allo stato

❌ **Evitare**:
- Line-height puro per centratura verticale (font-dependent)
- Padding asimmetrico senza ragione (confonde utente)
- Disabilitare bottone senza feedback visivo (colore + cursor)

---

## Bubble Messaggio (MessageBubble)

**File**: `components/message-bubble.tsx`

### Struttura

Componente che renderizza singolo messaggio in chat.

```jsx
interface Props {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: Props) {
  // ...
}
```

### Design per Ruolo

- **User**: align right, background light blue
- **Assistant**: align left, background gray light

---

## Indicatore Elaborazione (ProcessingIndicator)

**File**: `components/processing-indicator.tsx`

### Fase

```typescript
type ProcessingPhase = "searching" | "writing";
```

### Comportamento

- **`searching`** (RAG retrieval): animazione spin, testo "Ricerca contesto..."
- **`writing`** (streaming): puntini animati, testo "Generazione risposta..."

---

## Pannello Admin (IngestPanel)

**File**: `components/admin/ingest-panel.tsx`

### Funzionalità

- Selezionatore corpus (all / ai_logs / agents_md)
- Bottone start ingest con autenticazione cookie
- Progress bar per corpus
- Log real-time da SSE

---

## SoliDS Integration

Tutti i componenti usano **`@soli92/solids ^1.7.0`** come preset Tailwind:

```javascript
// tailwind.config.ts
export default {
  presets: [require("@soli92/solids/config")],
  // ...
}
```

### Token disponibili

- **Colori**: `--sd-color-*` (primary, success, error, ecc.)
- **Spacing**: `--sd-space-*` (xs, sm, md, lg, xl)
- **Typography**: `--sd-font-*` (size, weight)
- **Border radius**: `--sd-radius-*`

### Font

Font caricati in `app/layout.tsx`:
- **Inter** (body, default)
- **DM Sans** (display/heading)
- **JetBrains Mono** (code/technical)

---

## Pattern di Responsive Design

```css
/* Mobile first */
.container {
  @apply px-4 py-2;
}

/* Tablet+Desktop */
@screen sm {
  .container {
    @apply px-6 py-4;
  }
}
```

---

## Performance e Accessibilità

### Layout Shift Prevention

Componenti dinamici come `ProcessingIndicator` usano **min-height** stabile:

```jsx
<div className="flex justify-start mb-2 ml-1 min-h-[36px]">
  {processingPhase != null && <ProcessingIndicator ... />}
</div>
```

**Perché**: evita che il layout "saltelli" quando l'indicatore appare/scompare.

### Streaming Text Rendering

Chat rendering streaming usa `requestAnimationFrame` per transizioni di fase:

```javascript
if (typeof window !== "undefined") {
  window.requestAnimationFrame(() => {
    // Aggiorna fase da "searching" a "writing"
  });
}
```

**Perché**: decouples DOM updates da network chunks; UX più fluida.

---

## Testing

Componenti testati con **Vitest**:
- Unit test su logica (`use-ingest-stream.test.ts`)
- Snapshot test su rendering (da aggiungere)
- E2E su Vercel deployment (osservazione manuale per ora)

```bash
npm test
```

---

## Roadmap Componenti

- [ ] Dialog modale per conferme
- [ ] Toast notifications per feedback
- [ ] Skeleton loader per placeholder
- [ ] Syntax highlighter per code blocks nella chat
- [ ] Temi light/dark picker nel header

