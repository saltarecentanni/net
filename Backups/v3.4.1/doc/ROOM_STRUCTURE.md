# 🏢 Room Data Structure (Struttura Dati Stanze)

**Version:** 3.4.0  
**Date:** February 1, 2026

---

## 1. Overview

Le stanze (rooms) nel Floor Plan permettono di:
- Mappare aree fisiche sulla pianta
- Associare dispositivi alle stanze
- Visualizzare statistiche per stanza
- Gestire nickname per identificazione facile

---

## 2. Struttura Dati Completa

### 2.1 Room Object

```json
{
  "id": "8",
  "name": "8",
  "nickname": "Sala Server",
  "type": "server",
  "area": 50,
  "capacity": 20,
  "description": "Sala server principale con rack e apparecchiature di rete",
  "color": "rgba(239,68,68,0.15)",
  "polygon": [
    {"x": 760, "y": 281},
    {"x": 1010, "y": 281},
    {"x": 1010, "y": 521},
    {"x": 760, "y": 521}
  ],
  "notes": "Temperatura controllata, accesso ristretto"
}
```

### 2.2 Campi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | string | ✅ | ID univoco della stanza |
| `name` | string | ✅ | Nome originale/numero |
| `nickname` | string | ❌ | Nome descrittivo (es. "Sala Server") |
| `type` | string | ❌ | Tipo di stanza (vedi sezione 3) |
| `area` | number | ❌ | Area in m² |
| `capacity` | number | ❌ | Capacità dispositivi |
| `description` | string | ❌ | Descrizione dettagliata |
| `color` | string | ❌ | Colore RGBA del poligono |
| `polygon` | array | ❌ | Coordinate vertici [{x,y}] |
| `notes` | string | ❌ | Note aggiuntive |

---

## 3. Tipi di Stanza

| Tipo | Label | Colore Default |
|------|-------|----------------|
| `server` | Sala Server | `rgba(239,68,68,0.15)` (rosso) |
| `office` | Ufficio | `rgba(59,130,246,0.15)` (blu) |
| `storage` | Magazzino | `rgba(34,197,94,0.15)` (verde) |
| `meeting` | Sala Riunioni | `rgba(168,85,247,0.15)` (viola) |
| `production` | Produzione | `rgba(249,115,22,0.15)` (arancio) |
| `datacenter` | Data Center | `rgba(185,28,28,0.15)` (rosso scuro) |
| `network` | Sala Rete | `rgba(6,182,212,0.15)` (ciano) |
| `other` | Altro | `rgba(107,114,128,0.15)` (grigio) |

---

## 4. Associazione Dispositivo-Stanza

### 4.1 Come Funziona

I dispositivi sono associati alle stanze tramite il campo `location`:

```
Device.location ←→ Room.nickname (o Room.name)
```

**Esempio:**
- Stanza: `{ id: "8", nickname: "Sala Server" }`
- Dispositivo: `{ location: "Sala Server" }` → Appartiene alla stanza

### 4.2 Funzione Helper

```javascript
function deviceBelongsToRoom(device, room) {
    if (!device || !device.location || !room) return false;
    var normalize = function(str) {
        return (str || '').toLowerCase().replace(/\s+/g, '');
    };
    var deviceLoc = normalize(device.location);
    var roomNickname = normalize(room.nickname || room.name || room.id);
    return deviceLoc === roomNickname;
}
```

**Caratteristiche:**
- Case-insensitive ("Sala Server" = "sala server")
- Ignora spazi extra ("Sala  Server" = "SalaServer")
- Fallback: nickname → name → id

### 4.3 Funzioni Utili

```javascript
// Conta dispositivi in una stanza
function countDevicesInRoom(room) {
    return appState.devices.filter(function(d) {
        return deviceBelongsToRoom(d, room);
    }).length;
}

// Ottieni tutti i dispositivi di una stanza
function getDevicesInRoom(room) {
    return appState.devices.filter(function(d) {
        return deviceBelongsToRoom(d, room);
    });
}
```

---

## 5. Sincronizzazione Nickname

Quando il nickname di una stanza viene modificato, tutti i dispositivi associati vengono aggiornati automaticamente:

```javascript
// Nel salvataggio del nickname
var oldNickname = room.nickname || room.name;
var newNickname = input.value.trim();

// Aggiorna location di tutti i dispositivi
appState.devices.forEach(function(device) {
    if (deviceBelongsToRoom(device, { nickname: oldNickname, name: room.name })) {
        device.location = newNickname;
    }
});

room.nickname = newNickname;
```

---

## 6. Modal Info Stanza

Quando si clicca su una stanza nel Floor Plan, appare un modal con:

### 6.1 Header
- Nome stanza (nickname o name)
- Badge tipo stanza

### 6.2 Statistiche
| Statistica | Descrizione |
|------------|-------------|
| 📊 Total Devices | Numero dispositivi nella stanza |
| 🔗 Connections | Numero connessioni dei dispositivi |
| 📦 Capacity | Capacità configurata |
| ⚠️ Errors | Dispositivi con problemi (se presenti) |
| 📍 Area | Area in m² |

### 6.3 Lista Dispositivi
Per ogni dispositivo:
- Icona SVG del tipo
- Nome dispositivo
- Badge stato (Active/Disabled)
- Link (se presenti)
- Info rack/position

### 6.4 Campo Nickname
- Input editabile
- Salvataggio con Enter o blur
- Sincronizza automaticamente i dispositivi

---

## 7. Floor Plan API

### 7.1 Inizializzazione

```javascript
FloorPlan.init();  // Carica stanze da appState.rooms
```

### 7.2 Gestione Stanze

```javascript
// Imposta stanze (per import)
FloorPlan.setRooms(newRoomsArray);

// Ottieni stanze
var rooms = FloorPlan.getRooms();

// Salva stanze
saveRoomsData();  // Interno, chiama serverSave()
```

### 7.3 Zoom e Navigazione

```javascript
FloorPlan.zoom(0.1);    // Zoom in
FloorPlan.zoom(-0.1);   // Zoom out
FloorPlan.resetZoom();  // Reset al default
```

### 7.4 Export

```javascript
FloorPlan.exportToPNG();  // Esporta come immagine PNG
```

---

## 8. Persistenza

### 8.1 Dove Viene Salvato

Le stanze sono salvate in `network_manager.json`:

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117
}
```

### 8.2 Flusso di Salvataggio

```
User modifica stanza
       ↓
saveRoomsData()
       ↓
appState.rooms = rooms
       ↓
serverSave()  →  POST /data
       ↓
network_manager.json aggiornato
```

### 8.3 Flusso di Caricamento

```
Page load
    ↓
serverLoad()  →  GET /data
    ↓
appState.rooms = data.rooms
    ↓
FloorPlan.init()
    ↓
renderRooms()
```

---

## 9. Import/Export

### 9.1 JSON Export

Le stanze sono incluse nell'export JSON:

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117,
  "exportedAt": "2026-02-01T12:00:00.000Z",
  "version": "3.3.2"
}
```

### 9.2 JSON Import

L'import valida le stanze:

```javascript
// Validazione
if (data.rooms && !Array.isArray(data.rooms)) {
    Toast.error('Invalid JSON: "rooms" must be an array');
    return;
}

// Validazione singola stanza
for (var r = 0; r < data.rooms.length; r++) {
    var room = data.rooms[r];
    if (!room.id || !room.name) {
        Toast.error('Invalid room at index ' + r);
        return;
    }
}

// Import
appState.rooms = data.rooms || [];

// Sincronizza FloorPlan
if (FloorPlan.setRooms) {
    FloorPlan.setRooms(appState.rooms);
}
```

### 9.3 Excel Export

Le stanze hanno un foglio dedicato:

| Colonna | Descrizione |
|---------|-------------|
| ID | ID univoco |
| Name | Nome originale |
| Nickname | Nome descrittivo |
| Width | Larghezza |
| Height | Altezza |
| X | Coordinata X |
| Y | Coordinata Y |
| Color | Colore RGBA |
| Devices | Numero dispositivi |
| Notes | Note |

---

## 10. Polygon (Poligono)

### 10.1 Formato

Array di punti {x, y} che definiscono i vertici:

```json
"polygon": [
  {"x": 760, "y": 281},
  {"x": 1010, "y": 281},
  {"x": 1010, "y": 521},
  {"x": 760, "y": 521}
]
```

### 10.2 Sistema di Coordinate

- Origine (0,0): angolo superiore sinistro
- X: cresce verso destra
- Y: cresce verso il basso
- ViewBox SVG: dipende dalla pianta

### 10.3 Tool di Mappatura

Usa `/draw-rooms-v2.html` per creare poligoni:
1. Carica la pianta
2. Clicca per aggiungere punti
3. Chiudi il poligono
4. Esporta le coordinate

---

## 11. Statistiche Attuali

| Statistica | Valore |
|------------|--------|
| Stanze totali | 20 |
| Dispositivi totali | 81 |
| Dispositivi in "Sala Server" | 75 |
| Dispositivi in "Ufficio12" | 6 |

### Stanze con Nickname

| ID | Nickname |
|----|----------|
| 1 | Amministrazione |
| 8 | Sala Server |
| ... | ... |

---

## 12. Esempi

### 12.1 Creare una Nuova Stanza

```javascript
var newRoom = {
    id: "new-" + Date.now(),
    name: "Nuova Stanza",
    nickname: "Sala Riunioni 1",
    type: "meeting",
    color: "rgba(168,85,247,0.15)",
    polygon: [],
    notes: ""
};
appState.rooms.push(newRoom);
saveRoomsData();
```

### 12.2 Modificare Nickname

```javascript
var room = appState.rooms.find(r => r.id === "8");
var oldNickname = room.nickname;

// Aggiorna dispositivi
appState.devices.forEach(function(d) {
    if (d.location === oldNickname) {
        d.location = "Nuovo Nome";
    }
});

room.nickname = "Nuovo Nome";
saveRoomsData();
```

### 12.3 Contare Dispositivi

```javascript
var room = appState.rooms.find(r => r.nickname === "Sala Server");
var count = countDevicesInRoom(room);
console.log("Dispositivi in Sala Server:", count);
```

---

**© 2026 Tiesse S.P.A. - Tutti i diritti riservati**
