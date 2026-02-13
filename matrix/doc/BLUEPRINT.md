# TIESSE Matrix Network — BLUEPRINT v4.1.006

> **Data**: 2026-02-13  
> **Versione**: 4.1.006  
> **Stato**: Production Ready  
> **Autore**: Generato da audit forense completo del codice sorgente  

---

## 1. OVERVIEW

**Tiesse Matrix Network** è un'applicazione web **single-page** per la documentazione e gestione visuale dell'infrastruttura di rete aziendale. Progettata per uso **interno/intranet** di Tiesse S.P.A.

### Cosa fa
- **Inventario dispositivi**: CRUD completo per 25+ tipi di dispositivi di rete
- **Gestione connessioni**: mappa cablaggi tra porte, patch panel, wall jack
- **Topologia visuale**: SVG interattivo con 4 layout (forza, gerarchico, circolare, griglia)
- **Floor Plan**: mappa fisica su planimetria con stanze interattive
- **Dashboard**: statistiche, grafici, ricerca intelligente multi-campo
- **Matrice connessioni**: vista SVG + HTML ibrida con zoom/pan
- **Export**: Excel (5 fogli XLSX), JSON, PNG della topologia
- **Accesso remoto**: integrazione Apache Guacamole (SSH, RDP, VNC, Telnet)

### Stack tecnologico
| Layer | Tecnologia |
|-------|-----------|
| Frontend | Vanilla JS (ES5/ES6 misto), Tailwind CSS, Chart.js, SweetAlert2, SheetJS |
| Backend primario | **Node.js** (`server.js` — 911 righe) |
| Backend legacy | **PHP/Apache** (`data.php`, `api/*.php`) |
| Dati | File JSON (`data/network_manager.json`) |
| Autenticazione | bcrypt hash, sessioni in-memory (Node) o PHP session |
| Sicurezza | CSRF tokens, rate limiting, edit lock, timing-safe comparison |
| Dipendenze | bcrypt, bcryptjs (npm) — **ZERO CDN esterni** |

---

## 2. ARCHITETTURA

### 2.1 Diagramma componenti

```
┌────────────────────────────────────────────────────────┐
│                     BROWSER (SPA)                       │
├────────────┬──────────┬───────────┬────────────────────┤
│  index.html │  CSS     │  10 JS   │  4 vendor libs     │
│  (4810 ln)  │ styles   │  modules │  (tailwind, chart, │
│             │ (477 ln) │          │   xlsx, sweetalert) │
├─────────────┴──────────┴──────────┴────────────────────┤
│               HTTP API (REST-like)                      │
├─────────────────────┬──────────────────────────────────┤
│   Node.js server    │     PHP/Apache (legacy)          │
│   server.js         │     data.php + api/*.php         │
│   Port 3000         │     Port 80/443                  │
├─────────────────────┴──────────────────────────────────┤
│               FILE SYSTEM                               │
│   data/network_manager.json (dati principali)          │
│   data/online_users.json   (presenze)                  │
│   data/edit.lock           (lock editing)              │
│   .env                     (configurazione)            │
└────────────────────────────────────────────────────────┘
```

### 2.2 Moduli JavaScript (ordine di caricamento)

```
1. editlock.js    (244 ln)  — Lock concorrenza multi-utente
2. auth.js        (307 ln)  — Autenticazione, CSRF, UI mode toggle
3. app.js         (6430 ln) — CORE: state, CRUD, persistence, import/export
4. ui-updates.js  (3310 ln) — Rendering: liste, tabelle, matrix, filtri, Excel
5. recovery.js    (48 ln)   — Nuclear recovery (clear storage)
6. features.js    (4924 ln) — Topology SVG, logs, filtri, links, draw.io export
7. floorplan.js   (1352 ln) — Floor plan SVG interattivo
8. json-validator.js (300 ln) — Validazione import JSON
9. dashboard.js   (1211 ln) — Charts, ricerca intelligente
10. device-detail.js (1137 ln) — Modale dettaglio device con porte RJ45
11. icons.js      (277 ln)  — SVG icon system (MI.i())
```

**Totale frontend**: ~19,540 righe JavaScript

### 2.3 API Endpoints

#### Node.js (`server.js`)

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| GET | `/data` | No | Leggi tutti i dati (devices, connections, rooms, etc.) |
| POST | `/data` | Sì + CSRF | Salva dati (con backup automatico) |
| POST | `/api/auth` | No | Login (bcrypt verify + rate limit) |
| GET | `/api/auth?check` | No | Verifica sessione |
| POST | `/api/auth?logout` | Sì | Logout (rilascio lock) |
| GET/POST | `/api/editlock` | No | Gestione edit lock (acquire/release/heartbeat) |
| * | `/api/guacamole/*` | Sì | Proxy verso Apache Guacamole |
| GET | `/*` | No | Static file serving |

#### PHP (legacy — usato quando dietro Apache)

| File | Metodo | Auth | Descrizione |
|------|--------|------|-------------|
| `data.php` | GET | No | Stessi dati di Node.js /data |
| `data.php` | POST | Sì | Salva dati |
| `data.php?action=online` | GET | No | Online users tracking |
| `api/auth.php` | GET/POST | — | Login/logout/check |
| `api/editlock.php` | GET/POST | — | Edit lock |
| `api/guacamole.php` | * | Sì | Proxy Guacamole (cURL) |

---

## 3. DATA MODEL

### 3.1 Struttura principale (`network_manager.json`)

```json
{
  "version": "4.0.000",
  "lastUpdate": "2026-02-12T12:25:45Z",
  "checksum": "sha256-...",
  
  "devices": [],        // Array<Device>
  "connections": [],     // Array<Connection>
  "nextDeviceId": 120,   // Auto-increment
  
  "locations": [],       // Array<Location>
  "groups": [],          // Array<Group>
  "rooms": [],           // Array<Room>
  "sites": [],           // Array<Site>
  
  "customPrefixes": [],  // Array<DevicePrefix>
  "customTypes": [],     // Array<DeviceType>
  
  "config": {
    "connColors": {},     // type → #RRGGBB
    "connTypes": [],      // Tipi connessione ammessi
    "cableColors": []     // Colori cavo disponibili
  }
}
```

### 3.2 Device Object

```javascript
{
  id: Number,           // Auto-increment unique ID
  name: String,         // Nome dispositivo (senza prefisso)
  prefix: String,       // Prefisso tipo: "SW", "RT", "SRV", etc.
  type: String,         // Tipo lowercase: "switch", "router", "firewall", etc.
  status: String,       // "active", "disabled", "maintenance"
  location: String,     // Nome location: "Sala Server", "ICT Lab", etc.
  rackId: String,       // UPPERCASE group code: "RACK-NETWORK-01"
  order: String,        // Posizione rack "00"-"48" (front) o "99"-"51" (rear)
  isRear: Boolean,      // Dispositivo sul retro del rack
  
  ports: [{             // Array di porte fisiche
    name: String,       // "eth01", "GbE24", "SFP01", "WAN01", "Console01"
    type: String,       // "rj45", "sfp", "console", "wan"
  }],
  
  addresses: [{         // Array di indirizzi di rete
    type: String,       // "ipv4", "ipv6", "mac", "mgmt"
    value: String,      // "192.168.1.1", "AA:BB:CC:DD:EE:FF"
    label: String,      // Etichetta descrittiva
    vlan: Number        // VLAN ID opzionale
  }],
  
  links: [{             // Quick access links (protocolli)
    protocol: String,   // "http", "https", "ssh", "rdp", "vnc", "telnet"
    url: String,        // URL o indirizzo
    label: String       // Etichetta display
  }],
  
  notes: String,        // Note libere
  tags: [String],       // Tag per ricerca/filtro
}
```

### 3.3 Connection Object

```javascript
{
  id: String,           // Unique ID: "c-{timestamp}-{random}"  
  from: Number,         // Device ID sorgente
  fromPort: String,     // Nome porta sorgente: "eth01"
  to: Number|null,      // Device ID destinazione (null = WallJack endpoint)
  toPort: String,       // Nome porta destinazione: "GbE24"
  
  type: String,         // "lan", "wan", "trunk", "wallport", "fiber", "serial"
  status: String,       // "active", "disabled", "reserved", "maintenance"
  speed: String,        // "1Gbps", "10Gbps", "100Mbps"
  vlan: String,         // VLAN info: "100", "100,200,300"
  zone: String,         // Network zone: "LAN", "DMZ", "WAN", "MGMT"
  
  cableColor: String,   // Colore cavo: "#3b82f6"
  cableMarker: String,  // UPPERCASE: "AB-01", "L3-DMZ"
  
  notes: String,        // Note connessione
  
  // Campi opzionali
  flagged: Boolean,     // Connessione incompleta/da verificare
  flagReason: String,   // Motivo del flag
  isWallJack: Boolean,  // Connessione a presa a muro
  roomId: Number|String // Stanza associata (per floor plan)
}
```

### 3.4 Location Object

```javascript
{
  id: String,           // "loc-001"
  name: String,         // "Sala Server Principale"
  code: String,         // Codice breve
  address: String,      // Indirizzo fisico opzionale
  type: String          // "building", "floor", "room", "area"
}
```

### 3.5 Group Object

```javascript
{
  id: String,           // "grp-0001"
  code: String,         // UPPERCASE: "RACK-NETWORK-01"
  name: String,         // Nome descrittivo
  location: String,     // Location di appartenenza
  type: String,         // "rack", "zone", "area", "endpoint"
  order: Number,        // Ordine di visualizzazione
  icon: String,         // Emoji opzionale
  color: String         // Colore badge opzionale
}
```

### 3.6 Room Object (Floor Plan)

```javascript
{
  id: Number,           // ID stanza: 0, 1, 2, ...
  name: String,         // Nome interno: "room_0"
  nickname: String,     // Nome visualizzato: "Sala Server"
  color: String,        // Colore area: "#3b82f6"
  polygon: [            // Punti poligono SVG
    [x1, y1], [x2, y2], ...
  ],
  marker: {             // Posizione etichetta
    x: Number,
    y: Number
  }
}
```

---

## 4. NORMALIZZAZIONE DATI

Standard professionale applicato a tutti i dati:

| Campo | Formato | Esempio |
|-------|---------|---------|
| `rackId` | UPPERCASE | `RACK-NETWORK-01` |
| `device.type` | lowercase | `switch`, `router_wifi` |
| `device.status` | lowercase | `active`, `disabled` |
| `port.name` | prefix + pad2 | `eth01`, `GbE02`, `SFP01` |
| `conn.type` | lowercase | `lan`, `trunk`, `wallport` |
| `conn.status` | lowercase | `active`, `reserved` |
| `conn.cableMarker` | UPPERCASE | `AB-01`, `L3-DMZ` |
| `cableColor` | #RRGGBB | `#3b82f6` |

Normalizzazione applicata in 3 punti:
1. **Client-side**: `normalizeDataCase()` on load, `saveDevice()`/`saveConnection()` on save
2. **Server Node.js**: `normalizeSaveData()` on POST
3. **Server PHP**: `data.php` normalizza `rackId`, `type`, `status` on POST

---

## 5. TIPI DISPOSITIVO (25 tipi built-in)

| Prefisso | Tipo | Descrizione |
|----------|------|-------------|
| MOD | `modem` | Modem / Fibra ottica (ONT/ONU) |
| FW | `firewall` | Firewall / UTM |
| RT | `router` | Router infrastruttura |
| RTW | `router_wifi` | Router con Wi-Fi |
| SW | `switch` | Switch di rete (L2/L3) |
| AP | `wifi` | Access Point wireless |
| POE | `poe` | PoE Injector |
| SRV | `server` | Server |
| NAS | `nas` | NAS / Storage |
| UPS | `ups` | Gruppo di continuità |
| IP-PHO | `ip_phone` | Telefono IP |
| PRN | `printer` | Stampante di rete |
| CAM | `camera` | Telecamera IP |
| DVR | `dvr` | DVR / NVR |
| IOT | `iot` | Dispositivo IoT |
| TST | `tst` | Bancada Test |
| GEN | `others` | Generico |
| PC | `pc` | PC / Desktop |
| TAB | `tablet` | Tablet |
| PP | `patch` | Patch Panel |
| WJ | `walljack` | Presa a muro RJ45 |
| WJ-TEL | `walljack_tel` | Presa a muro RJ11 |
| ISP | `isp` | ISP / Provider |
| TV | `tv` | TV / Display |
| HUB | `hub` | Hub legacy |

I tipi personalizzati sono supportati via `appState.customPrefixes[]` e `appState.customTypes[]`.

---

## 6. ZONE DI RETE

Zone predefinite con colori e semantica:

| Zona | Colore | Descrizione |
|------|--------|-------------|
| LAN | Verde | Rete locale standard |
| WAN | Ambra | Connessione esterna / internet |
| DMZ | Rosso | Zona demilitarizzata |
| VLAN | Blu | Segmentazione virtuale |
| MGMT | Ciano | Rete di gestione |
| VoIP | Giallo | Telefonia IP |
| Guest | Arancione | Rete ospiti |
| IoT | Viola | Dispositivi IoT |
| Servers | Viola scuro | Rete server |
| Storage | Teal | Rete storage |
| Backup | Grigio | Rete backup |
| Test | Rosa | Ambiente di test |

---

## 7. SICUREZZA

### 7.1 Autenticazione
- **Credenziali**: username + bcrypt hash in `.env`
- **Sessioni**: token 64 char (`crypto.randomBytes(32).hex`), timeout 8h
- **Cookie**: `HttpOnly`, `SameSite=Strict`, `Secure` (quando HTTPS)
- **Rate limiting (Node.js)**: 5 tentativi max, backoff esponenziale (15m → 4h)
- **Timing-safe**: confronto username e token con `crypto.timingSafeEqual()`

### 7.2 CSRF Protection
- Token generato al login, validato su ogni POST
- Header `X-CSRF-Token` richiesto

### 7.3 Edit Lock
- Un solo editor alla volta
- Heartbeat ogni 60s, timeout 5min
- Lock su filesystem (`data/edit.lock`)

### 7.4 Data Protection
- Backup automatico prima di ogni salvataggio (`.bak`)
- Checksum SHA-256 (con fallback per HTTP)
- Validazione struttura JSON pre/post salvataggio
- Size limit 50MB per richiesta POST
- `Content-Security-Policy` headers

### 7.5 XSS Prevention
- `escapeHtml()` su tutti gli input utente renderizzati
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

---

## 8. UI / TAB DELL'APPLICAZIONE

| # | Tab | Icona | Funzione |
|---|-----|-------|----------|
| 0 | Dashboard | 🪧 | Statistiche, grafici a ciambella, ricerca globale |
| 1 | Dispositivi | 📱 | CRUD dispositivi (vista card/tabella/raggruppata) |
| 2 | Connessioni | ⚡ | CRUD connessioni (tabella/raggruppata per device) |
| 3 | Topology | 🗺️ | SVG interattivo della rete con 4 layout |
| 4 | Matrix | 📊 | Matrice visuale connessioni SVG+HTML |
| 5 | Floor Plan | 🏢 | Planimetria interattiva con stanze e device |
| 6 | Help | ❓ | Documentazione inline (14 sezioni in italiano) |
| 7 | Logs | 📋 | Log attività (ultimi 200 eventi in localStorage) |

### Modalità
- **View Mode** (pubblico): visualizzazione, export, ricerca
- **Edit Mode** (autenticato): CRUD, import, clear, save

---

## 9. STRUTTURA FILE PROGETTO

```
matrix/
├── index.html              # SPA principale (4810 ln)
├── server.js               # Server Node.js (911 ln)
├── data.php                # API PHP legacy (293 ln)
├── package.json            # npm config
├── .env                    # Configurazione (NON committare)
├── .env.example            # Template configurazione
├── .gitignore              # Esclusioni git
│
├── js/                     # 10 moduli JavaScript
│   ├── app.js              # Core state + CRUD (6430 ln)
│   ├── ui-updates.js       # Rendering UI (3310 ln)
│   ├── features.js         # Topology + logs + links (4924 ln)
│   ├── floorplan.js        # Floor plan SVG (1352 ln)
│   ├── dashboard.js        # Dashboard + charts (1211 ln)
│   ├── device-detail.js    # Modale dettaglio (1137 ln)
│   ├── auth.js             # Autenticazione (307 ln)
│   ├── icons.js            # SVG icon system (277 ln)
│   ├── editlock.js         # Edit lock (244 ln)
│   ├── json-validator.js   # Validazione JSON (300 ln)
│   └── recovery.js         # Nuclear recovery (48 ln)
│
├── css/
│   └── styles.css          # Stili custom (477 ln)
│
├── api/                    # API PHP
│   ├── auth.php            # Login/logout (90 ln)
│   ├── editlock.php        # Edit lock (139 ln)
│   ├── guacamole.php       # Proxy Guacamole PHP (199 ln)
│   ├── guacamole.js        # Client Guacamole Node (308 ln)
│   └── guacamole-config.php # Config helper (30 ln)
│
├── config/
│   ├── config.php          # Config PHP (101 ln)
│   ├── guacamole.json      # Config Guacamole (57 ln)
│   └── json-schema.json    # JSON Schema dati (175 ln)
│
├── assets/
│   ├── planta.png          # Planimetria per floor plan
│   ├── logoTiesse.png      # Logo aziendale
│   └── vendor/             # Librerie locali (NO CDN)
│       ├── tailwind.min.js
│       ├── chart.min.js
│       ├── xlsx.full.min.js
│       └── sweetalert2.min.js
│
├── data/
│   ├── network_manager.json # DATI PRINCIPALI
│   ├── online_users.json    # Tracking presenze
│   └── edit.lock            # Lock editing
│
├── scripts/                # Script manutenzione
│   ├── audit-code.js       # Audit codice automatizzato
│   ├── audit-json.js       # Audit dati automatizzato
│   ├── deploy.sh           # Script deploy Apache
│   ├── install-guacamole.sh # Setup Guacamole Docker
│   └── update-version.sh   # Aggiornamento versione
│
├── tests/
│   └── run-all-tests.sh    # Test runner
│
├── backup/                 # Infrastruttura backup
│   ├── backup.sh
│   ├── backup.log
│   ├── crontab.txt
│   ├── weekly/
│   └── monthly/
│
└── doc/                    # Documentazione
    ├── README.md           # Doc tecnica principale
    ├── CHANGELOG.md        # Registro modifiche
    ├── AUDIT_FINAL_2026-02-12.md
    ├── QUICK_START_PHASES.md
    ├── icon-picker.html    # Tool selezione icone
    └── archive/            # Documentazione storica
        ├── v3/             # Docs versione 3.x
        └── v4-session/     # Report sessione v4
```

---

## 10. DATI CORRENTI (Feb 2026)

| Metrica | Valore |
|---------|--------|
| Dispositivi | 119 |
| Connessioni | 93 |
| Locations | 10+ |
| Gruppi | 24 |
| Stanze (floor plan) | 22 |
| Wall Jacks | 14 |
| External Devices | 4 |
| Tipi dispositivo usati | 15+ |

---

## 11. DEPLOYMENT

### 11.1 Node.js (raccomandato)
```bash
cd matrix
npm install
cp .env.example .env
# Modificare .env con password bcrypt personalizzata
node server.js
# → http://localhost:3000
```

### 11.2 PHP/Apache (legacy)
```bash
# Copiare matrix/ in DocumentRoot Apache
# Configurare .env con stesse credenziali
# Assicurarsi php-json e php-curl installati
# Apache deve servire index.html come default
```

### 11.3 Credenziali default
- **Username**: `tiesse`
- **Password**: `tiesse`
- ⚠️ **CAMBIARE IN PRODUZIONE** — Generare nuovo hash con:
  ```bash
  node -e "require('bcrypt').hash('NUOVA_PASSWORD', 10).then(console.log)"
  ```

---

## 12. PROBLEMI NOTI E DEBITO TECNICO

### 12.1 Inconsistenza versioni nei file
| Gruppo | Versione | File |
|--------|----------|------|
| Server | 4.1.006 | server.js |
| Frontend core | 4.0.000 | app.js, device-detail.js, index.html |
| Frontend moduli | 3.6.035 | features.js, ui-updates.js, dashboard.js, floorplan.js |
| API PHP | 3.6.035 | data.php, auth.php, editlock.php, config.php |
| API legacy | 3.6.003–3.6.022 | guacamole.js, guacamole.php |

### 12.2 Duplicazione codice
- `escapeHtml()`: 4 copie identiche in 4 file
- `formatLabel()`: 2 copie in 2 file
- `escapeXml()`: 2 copie in 2 file
- Logica topology SVG: ~1000 righe duplicate in features.js

### 12.3 Sicurezza
- `api/editlock.php` POST senza autenticazione
- `api/auth.php` senza rate limiting (Node.js lo ha)
- `api/guacamole.php` SSL disabilitato + CORS wildcard
- Credenziali Guacamole in chiaro in `config/guacamole.json`
- RoomMapper bypassa autenticazione in server.js

### 12.4 Manutenibilità
- 3500+ righe di Help inline in index.html
- Sessioni Node.js in-memory (perse al restart)
- Lingue miste nel codice: italiano, inglese, portoghese
- `var` vs `const/let` inconsistenti tra file
- Inline event handlers (`onclick="..."`) pervasivi nell'HTML

---

## 13. ROADMAP SUGGERITA

### Fase A — Consolidamento (priorità alta)
1. Unificare versioni a 4.1.006 in tutti i file
2. Estrarre funzioni duplicate in modulo condiviso (utils.js)
3. Aggiungere rate limiting a auth.php
4. Aggiungere autenticazione a editlock.php POST
5. Rimuovere bypass RoomMapper da server.js

### Fase B — Modernizzazione (priorità media)
1. Migrare da `var` a `const/let` uniformemente
2. Estrarre Help tab in file separato
3. Convertire inline event handlers a addEventListener
4. Sessioni persistenti (file-based o SQLite)
5. Test automatizzati frontend (playwright o simile)

### Fase C — Evoluzione (priorità bassa)
1. Separare features.js in moduli più piccoli
2. Implementare poligoni stanze nel Floor Plan
3. WebSocket per real-time collaboration
4. Service Worker per offline mode
5. Dark mode

---

*Blueprint generato da audit forense completo del codice sorgente — 2026-02-13*
