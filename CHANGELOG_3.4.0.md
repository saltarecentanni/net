# CHANGELOG - Version 3.4.0

**Data:** 1 Febbraio 2026  
**Status:** ✅ Completato

---

## 📋 Riepilogo delle Modifiche v3.4.0

### 🏢 Floor Plan & Room Management

#### 1. Associazione Dispositivo-Stanza
**Funzionalità:** I dispositivi sono ora collegati alle stanze tramite il campo `location`.

**Implementazione:**
- ✅ Funzione `deviceBelongsToRoom(device, room)` - matching case-insensitive e normalizzato
- ✅ Funzione `countDevicesInRoom(room)` - conta dispositivi in una stanza
- ✅ Funzione `getDevicesInRoom(room)` - ottiene tutti i dispositivi di una stanza

**File modificato:** `js/app.js`

---

#### 2. Room Nickname con Sincronizzazione Dispositivi
**Funzionalità:** Quando il nickname di una stanza viene modificato, tutti i dispositivi associati vengono aggiornati automaticamente.

**Implementazione:**
- ✅ Input nickname editabile nel modal stanza
- ✅ Sincronizzazione automatica campo `location` dei dispositivi
- ✅ Salvataggio tramite `serverSave()` (corretto da `save()`)

**File modificato:** `js/floorplan.js`

---

#### 3. Modal Stanza Professionale
**Funzionalità:** Modal SweetAlert2 con design professionale per visualizzare info stanza.

**Caratteristiche:**
- ✅ Header con nome stanza e badge tipo
- ✅ Statistiche: Total Devices, Connections, Capacity, Errors, Area
- ✅ Lista dispositivi con icone SVG (`SVGTopology.getMiniIcon`)
- ✅ Badge stato per ogni dispositivo (Active/Disabled)
- ✅ Link dispositivi con icona esterna
- ✅ Info rack/position per ogni dispositivo
- ✅ Campo nickname editabile

**File modificato:** `js/floorplan.js` (funzione `showRoomInfo`)

---

### 🔧 Import/Export Critical Fixes

#### 4. Export JSON con Rooms
**Problema:** La funzione `exportJSON()` non includeva le stanze.

**Soluzione:**
```javascript
var data = JSON.stringify({
    devices: appState.devices,
    connections: appState.connections,
    rooms: appState.rooms || [],           // AGGIUNTO
    nextDeviceId: appState.nextDeviceId,
    exportedAt: new Date().toISOString(),  // AGGIUNTO
    version: '3.3.2'                       // AGGIUNTO
}, null, 2);
```

**File modificato:** `js/app.js` (linee ~2813-2840)

---

#### 5. Import JSON con Rooms
**Problema:** La funzione `importData()` non importava le stanze.

**Soluzione:**
- ✅ Validazione: `rooms` deve essere array (se presente)
- ✅ Validazione: ogni room deve avere `id` e `name`
- ✅ Import: `appState.rooms = data.rooms || []`
- ✅ Sincronizzazione: `FloorPlan.setRooms(appState.rooms)`

**File modificato:** `js/app.js` (linee ~2843-2962)

---

#### 6. Export Excel con Foglio Rooms
**Problema:** La funzione `exportExcel()` non includeva le stanze.

**Soluzione:**
- ✅ Nuovo foglio "Rooms" con colonne: ID, Name, Nickname, Width, Height, X, Y, Color, Devices, Notes
- ✅ Conteggio dispositivi per stanza usando `deviceBelongsToRoom`
- ✅ Gestione stanze vuote con messaggio "No rooms configured"

**File modificato:** `js/ui-updates.js` (linee ~2303-2340)

---

#### 7. Clear All con Rooms
**Problema:** La funzione `clearAll()` non includeva le stanze nel backup e non le puliva.

**Soluzione:**
- ✅ Backup include `rooms: appState.rooms || []`
- ✅ Prompt mostra conteggio stanze
- ✅ Clear: `appState.rooms = []`
- ✅ Sincronizzazione: `FloorPlan.setRooms([])`

**File modificato:** `js/app.js` (linee ~2988-3063)

---

#### 8. Save to Storage con Rooms
**Problema:** La funzione `saveToStorage()` non salvava le stanze nel localStorage.

**Soluzione:**
```javascript
localStorage.setItem('networkRooms', JSON.stringify(appState.rooms || []));
```

**File modificato:** `js/app.js` (linea ~941)

---

#### 9. FloorPlan.setRooms() API
**Funzionalità:** Nuova funzione per impostare le stanze esternamente (per import).

**Implementazione:**
```javascript
function setRooms(newRooms) {
    rooms = newRooms || [];
    if (typeof appState !== 'undefined') {
        appState.rooms = rooms;
    }
    if (container && container.querySelector('svg')) {
        renderRooms();
        updateStats();
    }
}

return {
    // ...
    setRooms: setRooms,
    getRooms: function() { return rooms; }
};
```

**File modificato:** `js/floorplan.js` (linee ~961-984)

---

### 🎨 UI/UX Improvements

#### 10. Topology Legend Modal
**Funzionalità:** Modal professionale per legenda tipi dispositivo.

**Caratteristiche:**
- ✅ Icone SVG da `SVGTopology.getMiniIcon`
- ✅ Grid layout responsive
- ✅ Design consistente con altri modal

**File modificato:** `js/features.js`

---

#### 11. Fix Tab Color Purple
**Problema:** Il colore `--color-primary-light` era stato cambiato in viola (#a78bfa).

**Soluzione:**
```css
--color-primary-light: #eff6ff;  /* Blu chiaro originale */
```

**File modificato:** `css/styles.css`

---

### 🐛 Bug Fixes

#### 12. Room Nickname Save
**Problema:** Il salvataggio del nickname chiamava `save()` che non esisteva.

**Soluzione:** Cambiato a `serverSave()`.

**File modificato:** `js/floorplan.js`

---

#### 13. Device Links Format
**Problema:** Il modal stanza cercava `device.link` e `device.link2` ma il formato attuale è `device.links[]`.

**Soluzione:** Cambiato per usare array `links`:
```javascript
if (device.links && device.links.length > 0) {
    device.links.forEach(function(link) {
        // ...
    });
}
```

**File modificato:** `js/floorplan.js`

---

#### 14. External Connections Normalization
**Problema:** 2 connessioni avevano `isWallJack: undefined` invece di `false`.

**Soluzione:** Normalizzato a `isWallJack: false` nel file JSON.

**File modificato:** `data/network_manager.json`

---

## 📊 Statistiche Finali

| Metrica | Valore |
|---------|--------|
| File modificati | 5 |
| Linee aggiunte | ~200 |
| Linee modificate | ~50 |
| Bug corretti | 6 |
| Nuove funzionalità | 4 |

---

## ✅ Test di Verifica (20/20 Passati)

1. ✅ Struttura JSON: devices array
2. ✅ Struttura JSON: connections array
3. ✅ Struttura JSON: rooms array
4. ✅ Struttura JSON: nextDeviceId
5. ✅ Validazione devices (81/81)
6. ✅ Validazione connections (89/89)
7. ✅ Validazione rooms (20/20)
8. ✅ exportJSON() include rooms
9. ✅ importData() importa rooms
10. ✅ clearAll() backup include rooms
11. ✅ clearAll() limpa rooms
12. ✅ exportExcel() include foglio Rooms
13. ✅ saveToStorage() salva rooms
14. ✅ serverSave() invia rooms
15. ✅ FloorPlan.setRooms() esiste
16. ✅ importData() sincronizza FloorPlan
17. ✅ clearAll() sincronizza FloorPlan
18. ✅ loadFromStorage() carica rooms
19. ✅ serverLoad() carica rooms
20. ✅ Validazione rooms nel import

---

## 📁 File Versioni

| File | Versione | Linee |
|------|----------|-------|
| app.js | 3.3.0 | 3259 |
| ui-updates.js | 3.4.0 | 2350 |
| features.js | 3.3.0 | 3416 |
| floorplan.js | 3.4.0 | 986 |
| auth.js | 3.1.5 | 215 |
| index.html | 3.4.0 | 1346 |
| styles.css | 3.3.0 | ~200 |

---

**© 2026 Tiesse S.P.A. - Tutti i diritti riservati**
