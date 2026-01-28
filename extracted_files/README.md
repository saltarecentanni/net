# 📐 MAPPATURA RETI TIESSE 2026 - Documentazione Completa

## 📋 Indice
1. [Panoramica](#panoramica)
2. [Struttura dei File](#struttura-dei-file)
3. [Come Usare](#come-usare)
4. [Fare Updates](#fare-updates)
5. [Aggiungere Links e Dati](#aggiungere-links-e-dati)
6. [Selezioni e Interazioni](#selezioni-e-interazioni)

---

## 🎯 Panoramica

Questo progetto renderizza una mappa completa di rete (mappatura) con 20 ambienti numerati (0-19).

**File principali:**
- `mappatura_reti_data.json` - Dati strutturati di tutta la mappa
- `MappaaturaReti.jsx` - Componente React che renderizza la mappa

---

## 📁 Struttura dei File

### `mappatura_reti_data.json`

```json
{
  "canvas": { width, height, viewBox },
  "colors": { ... },
  "borders": { top, bottom, left, right },
  "grid": { vertical_lines: [...] },
  "rooms": [
    {
      "id": 0,
      "name": "Sala 0",
      "description": "",
      "x": 210,
      "y": 155,
      "width": 155,
      "height": 130,
      "type": "regular|stairwell",
      "textX": 287,
      "textY": 220,
      "link": null,
      "selected": false
    },
    // ... 20 rooms totali (0-19)
  ],
  "walls": [ { id, type, points, color, thickness, curved } ],
  "stairs": [ { id, roomId, x, y, width, height, lineSpacing, colors } ],
  "markers": [ { x, y, type } ],
  "metadata": { version, lastUpdated, author, description }
}
```

---

## 🚀 Come Usare

### 1. **Setup React Project**

```bash
npm create vite@latest mappa-reti -- --template react
cd mappa-reti
npm install
```

### 2. **Aggiungere i File**

```
src/
  ├── components/
  │   └── MappaaturaReti.jsx
  ├── data/
  │   └── mappatura_reti_data.json
  └── App.jsx
```

### 3. **In App.jsx**

```javascript
import MappaaturaReti from './components/MappaaturaReti';

function App() {
  return (
    <div className="App">
      <MappaaturaReti />
    </div>
  );
}

export default App;
```

### 4. **Eseguire il Progetto**

```bash
npm run dev
```

---

## 📝 Fare Updates

### Aggiornare un Ambiente

Nel file `mappatura_reti_data.json`, trovare l'ambiente e modificare:

```json
{
  "id": 0,
  "name": "Sala 0",  // ← Cambiare il nome
  "description": "Descrizione nuova",  // ← Aggiungere descrizione
  "x": 210,  // ← Cambiare posizione X
  "y": 155,  // ← Cambiare posizione Y
  "width": 155,  // ← Cambiare larghezza
  "height": 130,  // ← Cambiare altezza
  "type": "regular",  // ← Tipo (regular, stairwell)
  "link": null,  // ← Aggiungere link (vedi sotto)
  "selected": false
}
```

### Aggiungere una Nuova Parete

```json
{
  "id": "wall_my_new_wall",
  "type": "path",
  "points": [
    { "x": 100, "y": 200 },
    { "x": 150, "y": 200 },
    { "x": 150, "y": 300 }
  ],
  "color": "#0000FF",
  "thickness": 3,
  "curved": true,
  "curveRadius": 12
}
```

### Cambiare un Colore

Nel JSON, sezione `"colors"`:

```json
"colors": {
  "wall_primary": "#0000FF",  // ← Blu
  "stair_pattern": "#FF00FF",  // ← Magenta
  "text": "#0000FF",  // ← Testo blu
  // ...
}
```

---

## 🔗 Aggiungere Links e Dati

### 1. **Aggiungere Link a un Ambiente**

```json
{
  "id": 5,
  "name": "Sala 5",
  "link": {
    "type": "internal|external",
    "url": "/dettagli/sala-5",
    "label": "Visualizza dettagli"
  }
}
```

### 2. **Gestire Link nel Componente React**

Nel file `MappaaturaReti.jsx`, aggiornare la funzione `renderRooms()`:

```javascript
// Aggiungere click handler per link
onClick={() => {
  setSelectedRoom(room);
  if (room.link?.url) {
    if (room.link.type === 'external') {
      window.open(room.link.url, '_blank');
    } else {
      // Navigazione interna (con React Router)
      navigate(room.link.url);
    }
  }
}}
```

### 3. **Aggiungere Metadata Personalizzati**

```json
{
  "id": 5,
  "name": "Sala 5",
  "metadata": {
    "responsabile": "Mario Rossi",
    "telefono": "0123456789",
    "email": "mario@example.com",
    "piano": 1,
    "area_mq": 45.5,
    "apparecchiature": [
      { "tipo": "Router", "modello": "Cisco 2900" },
      { "tipo": "Switch", "modello": "Dell PowerConnect" }
    ]
  }
}
```

---

## 🖱️ Selezioni e Interazioni

### Interazioni Disponibili

1. **Hover su Ambiente** - Sottolineatura leggera
2. **Click su Ambiente** - Apre pannello dettagli
3. **Scroll del Mouse** - Zoom in/out (0.5x a 3x)
4. **Reset Button** - Ritorna alla visualizzazione originale

### Estendere Interazioni

Nel componente, aggiungere nuovi stati:

```javascript
const [filters, setFilters] = useState([]);
const [viewMode, setViewMode] = useState('normal'); // normal, detailed, compact

// Filtrare ambienti per tipo
const filteredRooms = rooms.filter(room => 
  filters.length === 0 || filters.includes(room.type)
);

// Renderizzare diversamente in base a viewMode
const renderRooms = () => {
  return filteredRooms.map(room => (
    <g key={room.id}>
      {viewMode === 'normal' && <NormalView room={room} />}
      {viewMode === 'detailed' && <DetailedView room={room} />}
      {viewMode === 'compact' && <CompactView room={room} />}
    </g>
  ));
};
```

---

## 🎨 Personalizzare Colori

### Cambiare Tema Globalmente

```javascript
// Nel componente, passare tema come prop
const [theme, setTheme] = useState('light');

const themes = {
  light: {
    wall_primary: '#0000FF',
    background: '#FFFFFF',
    // ...
  },
  dark: {
    wall_primary: '#00FFFF',
    background: '#1a1a1a',
    // ...
  }
};

// Nel JSON, o nel componente:
const colors = themes[theme];
```

---

## 📊 Aggiungere Dati Dinamici

### Esempio: Stato degli Ambienti

```json
{
  "id": 5,
  "name": "Sala 5",
  "status": "active",  // active, inactive, maintenance
  "occupation": 45,  // percentuale occupazione
  "temperature": 22.5,
  "humidity": 55,
  "alerts": []
}
```

### Nel Componente

```javascript
const getRoomColor = (room) => {
  if (room.status === 'maintenance') return '#FF6B6B';
  if (room.status === 'inactive') return '#CCCCCC';
  return '#FFFFFF';
};

// In renderRooms()
<rect
  fill={getRoomColor(room)}
  // ...
/>
```

---

## 🔄 Workflow per Updates Futuri

### 1. **Update Dati**
- Modificare `mappatura_reti_data.json`
- Aggiungere/rimuovere rooms, walls, stairs

### 2. **Update Logica**
- Modificare `MappaaturaReti.jsx`
- Aggiungere nuovi handler di interazione
- Estendere componenti helper

### 3. **Test**
```bash
npm run dev
# Visualizzare in browser, verificare cambamenti
```

### 4. **Build per Produzione**
```bash
npm run build
```

---

## 💡 Tips Avanzati

### Export/Import Dati
```javascript
// Esportare configurazione
const exportData = () => {
  const dataStr = JSON.stringify(mapData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mappatura_reti_export.json';
  link.click();
};

// Importare configurazione
const importData = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imported = JSON.parse(e.target.result);
    setMapData(imported);
  };
  reader.readAsText(file);
};
```

### Versioning
```json
"metadata": {
  "version": "1.0.0",
  "history": [
    {
      "version": "1.0.0",
      "date": "2026-01-28",
      "changes": "Rilascio iniziale con 20 ambienti"
    },
    {
      "version": "1.1.0",
      "date": "2026-01-30",
      "changes": "Aggiunto supporto per metadata custom"
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Le Pareti Non Appaiono Curve
- Verificare `"curved": true` nel JSON
- Controllare `curveRadius` (di default 12)

### I Numeri Non Sono Centrati
- Aggiustare `textX` e `textY` per ogni ambiente
- Formula: `textX = x + width/2`, `textY = y + height/2`

### Performance Lenta
- Ridurre numero di linee di grid
- Usare `React.memo()` per subcomponenti
- Implementare virtualization per molti ambienti

---

## 📞 Support

Per domande o problemi:
1. Controllare il JSON per errori di sintassi
2. Verificare le coordinate X/Y
3. Console del browser (F12) per errori JavaScript
4. Assicurarsi che il file JSON sia importato correttamente

---

**Versione:** 1.0  
**Ultimo aggiornamento:** 28 Gennaio 2026  
**Autore:** TIESSE Mappatura Reti
