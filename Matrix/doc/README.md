# TIESSE Matrix Network

Applicazione web di gestione e documentazione della rete aziendale per deploy in intranet.

**Versione:** 3.5.010  
**Data:** 2 Febbraio 2026  
**Ambiente:** Ubuntu 24.04 LTS + Apache 2.4 + PHP 8.3

---

## 🆕 Novità della Versione 3.5.010

### 📶 WiFi AP senza Warning (v3.5.010)
| Feature | Descrizione |
|---------|-------------|
| **Dispositivi Wireless** | WiFi AP (`wifi`, `router_wifi`, `access_point`) non mostrano più ⚠ warning |
| **Icona Dedicata** | 📶 Wireless in cyan/turquese invece di ⚠ arancione |
| **Background** | Sfondo cyan chiaro per dispositivi wireless senza connessioni |
| **Legenda Aggiornata** | Nuova icona 📶 wireless nella legenda dispositivi |

### 🔧 Audit del Codice (v3.5.009-010)
| Fix | Descrizione |
|-----|-------------|
| **CURRENT_VERSION** | Corretto da 3.5.008 a 3.5.010 |
| **SUPPORTED_VERSIONS** | Aggiunte versioni 3.5.009 e 3.5.010 |
| **Cache Busters** | Aggiornati tutti i ?v= nel HTML |
| **Variabili Non Usate** | Rimossa variabile `algorithm` inutilizzata |
| **Moduli Inesistenti** | Corretto NetworkTopology → SVGTopology |
| **Metodi Errati** | Corretto Auth.isAuthenticated → Auth.isLoggedIn |
| **Console.log** | Sostituiti con Debug.log/warn/error in editlock.js e auth.js |

### 🗺️ Floor Plan Improvements (v3.5.007-008)
| Feature | Descrizione |
|---------|-------------|
| **Legenda Custom Locations** | Legenda a sinistra del Floor Plan con locations personalizzate |
| **Tooltips SVG** | Tooltip native SVG sulle stanze mappate (nome + conteggio dispositivi) |
| **Icona Custom Locations** | 🪧 (Placard) per Custom Locations, 📍 per Mapped Rooms |

### 📍 Sistema Locations Persistente (v3.5.005-008)
| Feature | Descrizione |
|---------|-------------|
| **appState.sites[]** | Array di siti aziendali (es. "Sede Ivrea") |
| **appState.locations[]** | Locations persistenti con id, code, name, type, roomRef |
| **Migrazione Automatica** | migrateToNewLocationSystem() converte dati esistenti |
| **Location Manager** | Gestione completa: crea, rinomina, elimina locations |
| **Export/Import** | Tutti i nuovi campi inclusi in export/import JSON |

---

## 🆕 Novità della Versione 3.5.001

### ✨ Indicatore Utenti Online
| Feature | Descrizione |
|---------|-------------|
| **Counter Real-time** | Visualizza numero utenti connessi al sistema |
| **Posizione** | Accanto al pulsante Activity Logs nell'header |
| **Formato** | Numerico con zero iniziale (01, 02, 03...) |
| **Tooltip** | Mostra breakdown: visualizzatori vs editori |
| **Colore Dinamico** | Verde = solo viewers, Ambra = editor presente |

### 🔧 Implementazione Tecnica
| Componente | Descrizione |
|------------|-------------|
| **Heartbeat** | Sistema ping ogni 30 secondi |
| **Tracking** | File JSON (online_users.json) |
| **Timeout** | Utenti inattivi rimossi dopo 60 secondi |
| **Session** | User ID unico per sessione browser |

---

## 📋 Changelog Versione 3.4.5

### 🔒 Correzioni Sicurezza (Critiche)
| Fix | Descrizione |
|-----|-------------|
| **XSS Protection Toast** | Cambiato innerHTML a textContent per prevenire XSS |
| **Contenuto Utente Sicuro** | Nomi dispositivi non più vulnerabili a script injection |
| **DOM Manipulation** | Toast usa creazione elementi DOM invece di HTML string |

### 🐛 Bug Fix (Critici)
| Fix | Descrizione |
|-----|-------------|
| **removeConnection()** | Codice eseguiva fuori dal callback .then() anche su cancel |
| **clearAll()** | Endpoint API errato e risposta non verificata correttamente |
| **floorplan.js** | Doppio return statement causava codice morto (setRooms inaccessibile) |

### ✅ Sistemi Verificati
| Sistema | Stato |
|---------|-------|
| **JSON Export** | ✅ SHA-256 checksum, struttura dati corretta |
| **JSON Import** | ✅ Validazione versione, verifica checksum, rollback |
| **Excel Export** | ✅ 4 fogli: Devices, Connections, Matrix, Rooms |
| **Form Validation** | ✅ Tutte le validazioni presenti e complete |
| **Error Handling** | ✅ Tutti i fetch hanno gestori .catch() |
| **PHP Backend** | ✅ password_hash, sessioni, file locking |
| **Auth Flow** | ✅ Conflitti lock gestiti correttamente |

---

## 🆕 Novità della Versione 3.4.3

### 🔒 Sistema Multi-Utente (Edit Lock)
| Funzionalità | Descrizione |
|--------------|-------------|
| **Lock di Modifica** | Solo un utente può modificare alla volta |
| **api/editlock.php** | API gestione lock server-side |
| **js/editlock.js** | Modulo client per gestione lock |
| **Timeout 5 minuti** | Lock si rilascia dopo inattività |
| **Heartbeat** | Mantiene lock attivo ogni 60 secondi |
| **Auto-release** | Lock rilasciato su logout o chiusura pagina |

### 💾 Backup Automatico
| Funzionalità | Descrizione |
|--------------|-------------|
| **backup/backup.sh** | Script backup con retention policy |
| **Backup Settimanale** | Domenica 02:00 - 4 settimane rotazionali |
| **Backup Mensile** | Giorno 1 03:00 - 12 mesi retention |
| **Integrazione Cron** | Configurazione automatica via crontab |

### 📚 Help Migliorato
| Miglioramento | Descrizione |
|---------------|-------------|
| **Sezione Multi-utente** | Spiegazione completa sistema lock |
| **Sezione Backup** | Documentazione backup automatico |
| **Immagine Floor Plan** | Spiegazione planta.png |
| **Esempi aggiornati** | Imola6 LX5272, Filiale Torino |

### 🔐 Sicurezza Potenziata
| Fix | Descrizione |
|-----|-------------|
| **No Password Hardcoded** | Rimosse password da codice sorgente |
| **Verifica via API** | Password verificata solo via auth.php |
| **File .env** | Credenziali in variabili ambiente |

### 📁 Files Modificati/Aggiunti
- `api/editlock.php` - **NEW** API lock multi-utente
- `js/editlock.js` - **NEW** Modulo client lock
- `js/auth.js` - Integrazione acquire/release lock
- `backup/backup.sh` - **NEW** Script backup automatico
- `index.html` - Help migliorato, sezioni nuove

---

## 🆕 Novità della Versione 3.4.2

### 🔒 Security Improvements
| Funzionalità | Descrizione |
|--------------|-------------|
| **Rate Limiting** | Max 5 tentativi login, blocco 15 minuti |
| **Environment Variables** | Supporto .env per credenziali |
| **Debug Mode** | console.* avvolti in DEBUG_MODE flag |
| **Input Validation** | maxlength su tutti i campi form |
| **Timing‑Safe Auth** | Confronto login con timingSafeEqual |
| **Session Cleanup** | Pulizia automatica sessioni scadute |
| **Async Save + Backup** | Salvataggio non bloccante con temp + .bak |
| **Export/Import Checksum** | Verifica integrità dati JSON (checksum semplice) |

### 🎨 UX Improvements
| Miglioramento | Descrizione |
|---------------|-------------|
| **SweetAlert2 Modals** | Sostituiti tutti confirm/alert nativi |
| **Better Error Messages** | Info sui tentativi rimanenti al login |
| **Toast Notifications** | Notifiche uniformi con Toast.* |

### 🔧 Code Quality
| Fix | Descrizione |
|-----|-------------|
| **Version Unification** | Tutti i file ora v3.4.2 |
| **Debug Logger** | Debug.log/warn/error wrappers |
| **.gitignore** | Previene commit di .env |
| **.env.example** | Template per configurazione |

---

## 🆕 Novità della Versione 3.4.0

### 🏢 Gestione Floor Plan e Stanze
| Funzionalità | Descrizione |
|--------------|-------------|
| **Associazione Dispositivo-Stanza** | Dispositivi collegati alle stanze tramite campo location |
| **Nickname Stanze** | Nickname modificabili con sincronizzazione automatica dispositivi |
| **Modal Stanza Professionale** | Modal SweetAlert2 con lista dispositivi, icone, link |
| **Statistiche Stanza** | Conteggio dispositivi, stato connessioni per stanza |
| **Export Stanze** | Export JSON/Excel ora include dati delle stanze |

### 🔧 Correzioni Import/Export Critiche
| Correzione | Descrizione |
|------------|-------------|
| **exportJSON()** | Ora include `rooms`, `exportedAt`, `version` |
| **importData()** | Valida e importa stanze con sincronizzazione FloorPlan |
| **exportExcel()** | Nuovo foglio "Rooms" con tutti i dati delle stanze |
| **clearAll()** | Backup include stanze, clear sincronizza FloorPlan |
| **saveToStorage()** | Ora salva stanze nel localStorage |

### 🎨 Miglioramenti UI/UX
| Miglioramento | Descrizione |
|---------------|-------------|
| **CSS Variables** | Sistema colori standardizzato con variabili |
| **Legenda Topology** | Modal professionale con icone SVG |
| **Modal Stanza** | Lista dispositivi con icone, link, badge stato |
| **Colori Tab** | Corretto colore blu primary-light (#eff6ff) |

### 🐛 Bug Fixes
| Fix | Descrizione |
|-----|-------------|
| **Salvataggio Nickname Stanza** | Corretto `save()` → `serverSave()` |
| **Link Dispositivi** | Cambiato da `link/link2` a array `links[]` |
| **Connessioni Esterne** | Normalizzato `isWallJack: undefined` → `false` |
| **deviceBelongsToRoom()** | Matching case-insensitive, normalizzato spazi |

---

## 🆕 Novità delle Versioni Precedenti

### v3.3.0 - CSS Variables Architecture
- Variabili CSS centralizzate
- Integrazione Tailwind con variabili
- Preparazione per tema dark

### v3.2.0 - Preparazione Intranet Offline
- Librerie locali (Tailwind, XLSX)
- Indipendenza da CDN
- File locking per concorrenza

### v3.1.x - Cascading Forms & Security
- Form a cascata: Location → Group → Device → Port
- Protezione XSS completa
- Cleanup codice

---

## 🔐 Sistema di Autenticazione

L'applicazione ha un sistema di autenticazione:
- **Accesso Pubblico:** Visualizzazione, stampa, esportazione
- **Accesso Autenticato:** Aggiungere, modificare, eliminare, importare, cancellare tutto
- **Rate Limiting (v3.4.2):** Max 5 tentativi, blocco 15 minuti
- **Edit Lock (v3.4.3):** Solo un utente può modificare alla volta

### Credenziali Predefinite
- **Utente:** tiesse
- **Password:** Configurata in `config/config.php` o `.env`

### ⚠️ Configurazione Sicura (v3.4.3+)

**Raccomandato: Usa file .env**
```bash
# Copia il template
cp .env.example .env

# Modifica le credenziali
nano .env

# Contenuto .env:
AUTH_USERNAME=mio_utente
AUTH_PASSWORD=mia_password_sicura
DEBUG_MODE=false
```

**In alternativa: Variabili di ambiente**
```bash
export AUTH_USERNAME=mio_utente
export AUTH_PASSWORD=mia_password_sicura
node server.js
```

Per cambiare la password PHP, modifica il file `config/config.php`:
```bash
php -r "echo password_hash('nuova_password', PASSWORD_DEFAULT);"
```

---

## 📁 Struttura dei File

```
Matrix/
├── index.html              # Pagina principale
├── server.js               # Server Node.js
├── data.php                # API REST PHP
├── draw-rooms-v2.html      # Tool mappatura stanze
├── start-server.bat        # Avvio rapido Windows
├── deploy.sh               # Script deploy Linux
│
├── api/
│   ├── auth.php            # API autenticazione
│   └── editlock.php        # API lock multi-utente (v3.4.3)
│
├── assets/
│   ├── logoTiesse.png      # Logo aziendale
│   ├── planta.png          # Immagine planimetria Floor Plan
│   └── vendor/             # Librerie locali (offline)
│       ├── tailwind.min.js
│       └── xlsx.full.min.js
│
├── backup/                 # Sistema backup automatico (v3.4.3)
│   ├── backup.sh           # Script backup con retention
│   ├── weekly/             # Backup settimanali (4 max)
│   └── monthly/            # Backup mensili (12 max)
│
├── config/
│   └── config.php          # Configurazione
│
├── css/
│   └── styles.css          # CSS Variables
│
├── data/
│   ├── network_manager.json  # Dati (devices, connections, rooms)
│   └── edit.lock           # File lock (auto-generato)
│
├── doc/
│   ├── README.md           # Questa documentazione
│   ├── BLUEPRINT.md        # Architettura tecnica
│   └── ROOM_STRUCTURE.md   # Struttura dati stanze
│
└── js/
    ├── app.js              # Logica principale
    │                       # - CRUD devices/connections
    │                       # - Import/Export con rooms
    │                       # - Helper room-device
    │                       # - Toast notifications
    │
    ├── ui-updates.js       # Rendering UI
    │                       # - Lista devices (cards/table)
    │                       # - SVG Matrix con zoom/pan
    │                       # - Excel export (4 fogli)
    │
    ├── features.js         # Funzionalità estese
    │                       # - SVG Topology (icone Cisco)
    │                       # - Activity Log
    │                       # - Export Draw.io
    │
    ├── floorplan.js        # Modulo Floor Plan
    │                       # - Rendering stanze
    │                       # - Modal info stanza
    │                       # - Export PNG
    │
    ├── editlock.js         # Modulo Edit Lock (v3.4.3)
    │                       # - Acquire/release lock
    │                       # - Heartbeat keep-alive
    │                       # - Conflict detection
    │
    └── auth.js             # Modulo autenticazione
                            # - Login/logout
                            # - Integrazione EditLock
```
```

---

## 🚀 Deploy

### Opzione 1: Node.js (Consigliato) ⭐

```bash
cd Matrix
node server.js
```

Accedi a: http://localhost:3000/

### Opzione 2: PHP

```bash
cd Matrix
php -S 0.0.0.0:8080
```

Accedi a: http://localhost:8080/

### Opzione 3: Apache (Produzione)

```bash
# Copia i file
sudo cp -r Matrix/* /var/www/html/matrix/

# Imposta i permessi
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data
```

### Opzione 4: Windows

```batch
start-server.bat
```

---

## 📊 Funzionalità

### Tab Disponibili

| Tab | Icona | Descrizione |
|-----|-------|-------------|
| Devices | 📋 | Lista dispositivi (cards/table view) |
| Active Connections | ⚡ | Gestione connessioni con form cascading |
| Matrix | 🔀 | Matrice connessioni SVG (zoom/pan) |
| Topology | 🗺️ | Mappa visuale SVG con icone Cisco |
| Floor Plan | 🏢 | Gestione stanze e piazzamento dispositivi |
| Logs | 📝 | Activity log con filtri |
| Help | ❓ | Guida integrata |

### Tipi di Dispositivo

| Tipo | Descrizione |
|------|-------------|
| router | Router standard |
| router_wifi | Router con WiFi |
| switch | Switch di rete |
| patch | Patch Panel |
| walljack | Presa a muro |
| firewall | Firewall |
| server | Server |
| wifi | Access Point WiFi |
| isp | ISP/Provider |
| pc | PC/Desktop |
| printer | Stampante |
| nas | NAS/Storage |
| camera | Telecamera IP |
| ups | UPS |
| others | Altri |

### Tipi di Connessione

| Tipo | Descrizione | Colore |
|------|-------------|--------|
| lan | LAN | Blu |
| wan | WAN/Internet | Verde |
| dmz | DMZ | Ambra |
| trunk | Trunk/Uplink | Viola |
| management | Management | Ciano |
| backup | Backup | Grigio |
| fiber | Fibra Ottica | Rosa |
| wallport | Presa Muro | Lime |
| external | Esterno | Arancio |
| other | Altro | Grigio |

### Tipi di Stanza

| Tipo | Descrizione | Colore |
|------|-------------|--------|
| server | Sala Server | Rosso |
| office | Ufficio | Blu |
| storage | Magazzino | Verde |
| meeting | Sala Riunioni | Viola |
| production | Produzione | Arancio |
| datacenter | Data Center | Rosso scuro |
| network | Sala Rete | Ciano |
| other | Altro | Grigio |

---

## 💾 Formato Dati

### Dispositivo

```json
{
  "id": 1,
  "rackId": "Rack-Network-01",
  "order": 1,
  "isRear": false,
  "name": "Tiesse-Wifi",
  "brandModel": "Imola IPQ-GW-WIFI",
  "type": "router_wifi",
  "status": "active",
  "location": "Sala Server",
  "addresses": [
    { "network": "10.10.100.220", "ip": "", "vlan": null }
  ],
  "service": "ssid: TIESSE",
  "ports": [{ "name": "LAN1", "type": "eth", "status": "active" }],
  "links": [{ "label": "WebUI", "url": "http://10.10.100.220" }],
  "notes": "Router WiFi principale"
}
```

### Connessione

```json
{
  "from": 1,
  "to": 2,
  "fromPort": "LAN1",
  "toPort": "Gi0/1",
  "type": "lan",
  "status": "active",
  "cableMarker": "A001",
  "cableColor": "#3b82f6",
  "isWallJack": false,
  "externalDest": null,
  "notes": "Uplink to core switch"
}
```

### Stanza

```json
{
  "id": "8",
  "name": "8",
  "nickname": "Sala Server",
  "type": "server",
  "area": 50,
  "capacity": 20,
  "description": "Sala server principale",
  "color": "rgba(239,68,68,0.15)",
  "polygon": [
    {"x": 760, "y": 281},
    {"x": 1010, "y": 281},
    {"x": 1010, "y": 521},
    {"x": 760, "y": 521}
  ],
  "notes": "Temperatura controllata"
}
```

---

## 📤 Export

### JSON Export

Esporta tutti i dati in formato JSON:
- Devices (dispositivi)
- Connections (connessioni)
- Rooms (stanze)
- Metadata (version, exportedAt)

### Excel Export (4 Fogli)

| Foglio | Contenuto |
|--------|-----------|
| **Devices** | Tutti i dispositivi con dettagli |
| **Connections** | Tutte le connessioni |
| **Matrix** | Matrice connessioni |
| **Rooms** | Tutte le stanze con dispositivi |

### PNG Export

- Topology → Esporta mappa topologia
- Floor Plan → Esporta pianta piano

### Draw.io Export

Esporta topologia in formato Draw.io XML per editing.

---

## 🎯 Indicatori Visivi

| Indicatore | Significato |
|------------|-------------|
| ✗ | Dispositivo/connessione disabilitato |
| ↩ | Dispositivo nella parte posteriore (Rear) |
| 🟢 | Stato attivo |
| 🔴 | Stato disabilitato |

### Convenzione Numerazione Rack

- **FRONTE:** 01-98 (dall'alto verso il basso)
- **RETRO (↩):** 99-01 (dal basso verso l'alto)
- **00:** Dispositivo sparso (non in rack)

---

## 📊 Statistiche Attuali

| Entità | Quantità |
|--------|----------|
| Dispositivi | 81 |
| Connessioni | 89 |
| Stanze | 20 |
| Prossimo ID | 117 |

---

## 🔧 Configurazione

### config/config.php

```php
<?php
define('DATA_FILE', __DIR__ . '/../data/network_manager.json');
define('AUTH_USER', 'tiesse');
define('AUTH_PASS_HASH', '$2y$10$...'); // password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT)
define('SESSION_TIMEOUT', 3600); // 1 ora
```

---

## 📞 Supporto

Per assistenza tecnica contattare il reparto IT.

---

**© 2026 Tiesse S.P.A. - Tutti i diritti riservati**
