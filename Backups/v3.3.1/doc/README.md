# TIESSE Matrix Network

Applicazione web di gestione della rete per deploy in intranet aziendale.

**Versione:** 3.3.1  
**Data:** 30 Gennaio 2026

---

## 🆕 Novità della Versione 3.3.1

### 🐛 Bug Fixes - Matrix Mouse Hover
- **Fix Hover Ultima Colonna:** Celle Wall Jack e External ora evidenziano correttamente i rispettivi header in giallo
- **Standardizzazione Font:** Font uniformi (11px, monospace) in tutte le celle della matrice per migliore leggibilità

### Dettagli Tecnici
- Aggiunti attributi `data-row` e `data-col` alle celle speciali (Wall Jack, External)
- Font-size aggiornato da 9px/7px a 11px per consistenza visiva
- Nessun impatto su performance o compatibilità

---

## 🆕 Novità della Versione 3.2.0

### 🌐 Preparazione per Intranet Offline
- **Librerie Locali:** Tailwind CSS e XLSX.js ora servite localmente (`/assets/vendor/`)
- **Indipendenza da CDN:** Funzionamento garantito senza connessione internet
- **Pronto per Apache/Linux:** Testato per deploy su server Linux

### 🔒 Miglioramenti Concorrenza Multi-Utente
- **File Locking:** Implementato `LOCK_EX` per scrittura sicura
- **Temp File Univoco:** Usa `uniqid()` per evitare collisioni
- **Atomic Rename:** Operazione atomica per integrità dati

### 📊 Export Excel Migliorato
- **Dati Puliti:** Rimossi emoji dalle colonne (usato `[WJ]` e `[EXT]` invece)
- **Compatibilità:** Export funziona corretamente in ambiente offline

### 🔧 Correzioni Script
- **start-server.bat:** Corretto percorso (era `intranet/`, ora raiz)
- **PHP Fallback:** Tenta php locale, poi php nel PATH
- **IP Generico:** Rimosso IP hardcoded, usare proprio IP

### 📁 Nuova Struttura Assets
```
assets/
├── logoTiesse.png          # Logo aziendale
└── vendor/                 # Librerie locali (NUOVO)
    ├── tailwind.min.js     # Tailwind CSS v3.x
    └── xlsx.full.min.js    # SheetJS XLSX v0.18.5
```

### 🔮 Preparazione Futura
- **Data Access Layer:** Estrutura preparada para migração JSON → Database
- **Documentação:** Arquitetura documentada para facilitar manutenção

---

## 🆕 Novità delle Versioni Precedenti

### v3.1.23 - UI/UX Standardization
- Formulari Padronizzati con stile identico
- Icone Consistenti in tutte le label
- Colori Connection Form differenziati

### v3.1.20 - Cascading Connection Form
- Selezione a cascata: Location → Group → Device → Port
- Color picker con input hex personalizzato
- Filtri rapidi per gruppi nelle connessioni

### v3.1.8 - Code Cleanup & Verification
- Rimozione 183 linee di codice duplicato
- 28 test scenarios eseguiti con successo
- Validazione import/export al 100%

### v3.1.5 - Topology Position Persistence
- Posizioni dispositivi salvate in localStorage
- Fix WallJack Rack Filter

### v3.1.3 - Security & Performance
- Protezione XSS completa con escapeHtml()
- Filtri con debounce (250ms)
- Validazione import migliorata

---

## 🔐 Sistema di Autenticazione

L'applicazione ha un sistema di autenticazione:
- **Accesso Pubblico:** Visualizzazione, stampa ed esportazione
- **Accesso Autenticato:** Aggiungere, modificare, eliminare dispositivi e connessioni

### Credenziali Predefinite
- **Utente:** tiesse
- **Password:** tiesseadm

Per cambiare la password, modifica il file config/config.php e genera un nuovo hash:
\`\`\`bash
php -r "echo password_hash('nuova_password', PASSWORD_DEFAULT);"
\`\`\`

---

## 📁 Struttura dei File

\`\`\`
Matrix/
├── index.html              # Pagina principale (v3.2.0, ~1364 righe)
├── server.js               # Server Node.js (v3.2.0, ~251 righe)
├── data.php                # API REST (PHP alternativo)
├── start-server.bat        # Avvio rapido Windows (corretto)
├── deploy.sh               # Script deploy Linux
│
├── api/
│   └── auth.php            # API autenticazione
│
├── assets/
│   ├── logoTiesse.png      # Logo aziendale
│   └── vendor/             # Librerie locali (offline)
│       ├── tailwind.min.js # Tailwind CSS
│       └── xlsx.full.min.js # SheetJS XLSX
│
├── config/
│   └── config.php          # Configurazione (credenziali, paths)
│
├── data/
│   └── network_manager.json  # Dati persistenti (devices, connections)
│
├── doc/
│   ├── README.md           # Questa documentazione
│   └── BLUEPRINT.md        # Architettura tecnica dettagliata
│
└── js/
    ├── app.js              # Logica principale (v3.2.1, ~2821 righe)
    │                       # - CRUD devices/connections
    │                       # - Cascading selects
    │                       # - Toast notifications
    │                       # - Form validation
    │                       # - Export JSON / Import Data
    ├── ui-updates.js       # Rendering UI (v3.1.5, ~1719 righe)
    │                       # - Cards/Table views
    │                       # - Filter bars
    │                       # - XSS protection
    │                       # - Excel export
    ├── features.js         # Funzionalità estese (v3.1.5, ~3347 righe)
    │                       # - SVG Topology (Cisco icons)
    │                       # - Matrix view
    │                       # - Export Draw.io/Excel/JSON
    │                       # - Print functions
    │                       # - Activity Log
    └── auth.js             # Modulo autenticazione (v3.1.5, ~216 righe)
\`\`\`

---

## 🚀 Deploy

### Opzione 1: Node.js (Consigliato) ⭐

\`\`\`bash
cd Matrix
node server.js
\`\`\`

Accedi a: http://localhost:3000/

### Opzione 2: PHP

\`\`\`bash
cd Matrix
php -S 0.0.0.0:8080
\`\`\`

Accedi a: http://localhost:8080/

### Opzione 3: Apache (Produzione)

\`\`\`bash
# Copia i file
sudo cp -r Matrix/* /var/www/html/matrix/

# Imposta i permessi
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data
\`\`\`

---

## 📊 Funzionalità

### Tab Disponibili
| Tab | Icona | Descrizione |
|-----|-------|-------------|
| Devices | 📋 | Lista dispositivi (cards/table view) |
| Active Connections | ⚡ | Gestione connessioni con form cascading |
| Matrix | 🔀 | Matrice connessioni (compact/detailed) |
| Topology | 🗺️ | Mappa visuale SVG con icone Cisco |
| Logs | 📝 | Activity log con filtri |
| Help | ❓ | Guida integrata |

### Tipi di Dispositivo
| Tipo | Icona | Descrizione |
|------|-------|-------------|
| router | 📡 | Router |
| switch | 🔀 | Switch |
| patch | 📌 | Patch Panel |
| walljack | 🔌 | Wall Jack |
| firewall | 🛡️ | Firewall |
| server | 🖥️ | Server |
| wifi | 📶 | WiFi Access Point |
| isp | 🌐 | ISP/Provider |
| pc | 💻 | PC/Desktop |
| printer | 🖨️ | Stampante |
| nas | 🗄️ | NAS/Storage |
| camera | 📹 | IP Camera |
| ups | 🔋 | UPS |
| others | 📦 | Altri |

### Tipi di Connessione
| Tipo | Icona | Descrizione |
|------|-------|-------------|
| lan | ↔️ | LAN |
| wan | 🌐 | WAN/Internet |
| dmz | 🛡️ | DMZ |
| trunk | ⬆️ | Trunk/Uplink |
| management | ⚙️ | Management |
| backup | 💾 | Backup |
| fiber | 💡 | Fiber Optic |
| wallport | 🔌 | Wall Jack |
| external | 📡 | External |
| other | 📦 | Other |

---

## 🎯 Indicatori Visivi

| Indicatore | Significato | Colore |
|------------|-------------|--------|
| ✗ | Dispositivo/connessione disabilitato | Rosso |
| ↩ | Dispositivo nella parte posteriore (Rear) del rack | Ambra |
| ✕ | Pulsante chiudi/elimina | Rosso |

### Convenzione Numerazione Rack
- **FRONTE:** Dall'alto verso il basso (01, 02, 03, 04...)
- **RETRO (↩):** Dal basso verso l'alto (99, 98, 97, 96...)
- **00:** Dispositivo sparso/isolato (non in un rack)

---

## 💾 Formato Dati

### Dispositivo
\`\`\`json
{
  "id": 1,
  "name": "Router-GW",
  "type": "router",
  "location": "Sala Server",
  "rackId": "Rack1",
  "order": 1,
  "isRear": false,
  "status": "active",
  "brandModel": "Cisco ISR 4331",
  "service": "Gateway, NAT",
  "ips": ["192.168.1.1/24", "10.0.0.1/8"],
  "ports": [{"name": "Gi0/0", "type": "rj45"}],
  "links": ["https://192.168.1.1"],
  "notes": "Router principale"
}
\`\`\`

### Connessione
\`\`\`json
{
  "from": {"device": 1, "port": "Gi0/0"},
  "to": {"device": 2, "port": "Gi1/0/1"},
  "type": "trunk",
  "status": "active",
  "cableMarker": "A1",
  "color": "#3b82f6",
  "notes": "Uplink to core switch"
}
\`\`\`

---

## 🔧 Configurazione

### config/config.php
\`\`\`php
<?php
define('DATA_FILE', __DIR__ . '/../data/network_manager.json');
define('AUTH_USER', 'tiesse');
define('AUTH_PASS_HASH', '\$2y\$10\$...'); // password_hash('tiesseadm', PASSWORD_DEFAULT)
\`\`\`

---

## 📞 Supporto

Per assistenza tecnica contattare il reparto IT.

**© 2026 Tiesse S.P.A. - Tutti i diritti riservati**
