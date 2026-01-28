# 🚀 QUICK START - MAPPATURA RETI TIESSE 2026

## ⚡ Setup Rapido (5 minuti)

### 1️⃣ Creare il Progetto React

```bash
npm create vite@latest mappa-reti -- --template react
cd mappa-reti
npm install
```

### 2️⃣ Copiare i File

```
Copia questi file nella cartella `src/`:
- MappaaturaReti.jsx (versione base)
  OU
- MappaaturaReti_Advanced.jsx (versione con API + features)
- mappatura_reti_data.json (nella cartella src/data/)
```

### 3️⃣ Aggiungere nel App.jsx

```javascript
import MappaaturaReti from './components/MappaaturaReti';
// Oppure per versione avanzata:
// import MappaaturaRetiAdvanced from './components/MappaaturaReti_Advanced';

function App() {
  return <MappaaturaReti />;
  // Oppure: <MappaaturaRetiAdvanced apiUrl="http://localhost:3000/api" />
}

export default App;
```

### 4️⃣ Eseguire

```bash
npm run dev
```

Apri http://localhost:5173

---

## 📊 File Structure Finale

```
mappa-reti/
├── src/
│   ├── components/
│   │   └── MappaaturaReti.jsx
│   ├── data/
│   │   └── mappatura_reti_data.json
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## ✨ Cosa Puoi Fare

### Versione BASE (MappaaturaReti.jsx)
✅ Visualizzare la mappa completa  
✅ Hover su ambienti  
✅ Selezionare ambienti  
✅ Zoom in/out  
✅ Visualizzare dettagli  

### Versione AVANZATA (MappaaturaReti_Advanced.jsx)
✅ Tutto della versione base +  
✅ Caricamento da API  
✅ Salvataggio su database  
✅ Undo/Redo  
✅ Ricerca e filtri  
✅ Export/Import JSON  
✅ Selezione multiple (Ctrl+Click)  
✅ Edit mode  
✅ Metadata personalizzati  

---

## 🔧 Modificare Dati (UPDATE)

### Cambiare Nome di un Ambiente

File: `src/data/mappatura_reti_data.json`

Trova:
```json
{
  "id": 5,
  "name": "Sala 5",  // ← Cambia questo
  ...
}
```

### Aggiungere Metadata Personalizzati

```json
{
  "id": 5,
  "name": "Sala 5",
  "metadata": {
    "responsabile": "Mario Rossi",
    "email": "mario@example.com",
    "telefono": "0123456789",
    "area_mq": 45.5,
    "piani": 1
  }
}
```

### Aggiungere Link

```json
{
  "id": 5,
  "name": "Sala 5",
  "link": {
    "type": "external",
    "url": "https://example.com/sala-5",
    "label": "Vai al dettaglio"
  }
}
```

---

## 🌐 Connettere con Backend

### Esempio con Express.js

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Caricare dati
app.get('/api/map', (req, res) => {
  const data = JSON.parse(fs.readFileSync('mappatura_reti_data.json'));
  res.json(data);
});

// Salvare dati
app.post('/api/map', (req, res) => {
  fs.writeFileSync('mappatura_reti_data.json', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on :3000'));
```

### Nel Component

```javascript
<MappaaturaRetiAdvanced apiUrl="http://localhost:3000/api" />
```

---

## 🎨 Cambiare Colori

Nel file JSON, sezione `colors`:

```json
"colors": {
  "wall_primary": "#0000FF",      // Pareti (blu)
  "stair_pattern": "#FF00FF",     // Scale (magenta)
  "text": "#0000FF",              // Testo (blu)
  "marker": "#FF00FF",            // Marcatori (magenta)
  "border_top": "#C41E3A",        // Bordo superiore (rosso)
  "border_bottom": "#008000",     // Bordo inferiore (verde)
  "grid_green": "#00AA00",        // Grid verde
  "grid_yellow": "#FFFF00"        // Grid giallo
}
```

---

## 🔍 Ricerca

Clicca in "Cerca..." e digita:
- Numero: `5` (trova ambiente 5)
- Nome: `Sala` (trova ambienti con "Sala" nel nome)
- Descrizione: `Stairwell` (ricerca anche nelle descrizioni)

---

## 💾 Export/Import Dati

### Export JSON
1. Clicca il bottone "📤 Export JSON"
2. Si salva automaticamente nel tuo computer

### Import JSON
1. Clicca "📂 Import"
2. Seleziona un file `.json` salvato precedentemente
3. I dati si caricano immediatamente

---

## 🎯 Selezionare Più Ambienti

1. Clicca su un ambiente
2. Tieni premuto `Ctrl` (o `Cmd` su Mac)
3. Clicca su altri ambienti
4. Risultato: tutti gli ambienti sono sottolineati in giallo

---

## 📝 Edit Mode

1. Clicca il bottone "✎ Edit"
2. Seleziona un ambiente
3. Modifica nome e descrizione nel pannello destro
4. Clicca "✓ Done" per salvare

---

## ⌛ Undo/Redo

- **Undo (↶)**: Torna all'azione precedente
- **Redo (↷)**: Torna all'azione successiva
- Max 50 azioni nella cronologia

---

## 🔗 Aggiungere Link Cliccabili

```json
{
  "id": 5,
  "link": {
    "type": "external",
    "url": "https://example.com",
    "label": "🔗 Dettagli"
  }
}
```

Nel componente avanzato, un pulsante verde apparirà con il link.

---

## 📱 Responsive Design

La mappa si adatta automaticamente:
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (in SVG viewBox)

Usa `zoom` e `pan` per navigare su schermi piccoli.

---

## 🐛 Problemi Comuni

### "La mappa non appare"
- ✅ Controlla che il JSON sia in `src/data/mappatura_reti_data.json`
- ✅ Verifica gli errori in console (F12)

### "I numeri non sono centrati"
- ✅ Aggiusta `textX` e `textY` nel JSON
- Formula: `textX = x + (width / 2)`, `textY = y + (height / 2)`

### "Non posso modificare i dati"
- ✅ Usa il componente Advanced, non il Basic
- ✅ Clicca "✎ Edit" prima

### "L'API non funziona"
- ✅ Controlla che il server sia in esecuzione
- ✅ Verifica `apiUrl` sia corretto
- ✅ Guarda errori in console

---

## 📈 Prossimi Step

1. **Connetti a Database**: Sostituisci file system con MongoDB/PostgreSQL
2. **Autenticazione**: Aggiungi login/logout
3. **Permessi**: Controllo accesso per ambiente
4. **Real-time**: Usa WebSockets per updates in tempo reale
5. **Mobile App**: Crea versione React Native

---

## 📞 Support

Consulta:
- `README.md` - Documentazione completa
- `mappatura_reti_data.json` - Struttura dati
- Componenti `.jsx` - Codice commentato

---

**Versione:** 1.0  
**Ultimo aggiornamento:** 28 Gennaio 2026
