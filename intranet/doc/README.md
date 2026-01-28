# TIESSE Matrix Network

Applicazione web di gestione della rete per deploy in intranet aziendale.

**Versione:** 3.1.8  
**Data:** 28 Gennaio 2026

---

## 🆕 Novità della Versione 3.1.8

### 🧹 Code Cleanup & Verification
- **Rimozione Codice Ridondante:** Eliminati 183 linee di codice duplicato (vecchio sistema zoom/pan)
- **Semplificazione JS:** Rimossi 11 bottoni HTML ridondanti per import/export
- **Verifica Completa:** Comprehensive testing - 28 test scenarios eseguiti
- **Validazione Import/Export:** Confermata integrità dati al 100% (zero corruption)
- **Reverse Testing:** Confermata robustezza validazione con 9 error scenarios

### 🔒 Sicurezza Import/Export
- **9 Validazioni Strutturali:** Rigorous validation di devices, connections, nextDeviceId
- **Type Checking:** Controllo rigoroso dei tipi (number, string, array)
- **Required Fields:** Validazione di tutti i campi obbligatori
- **Backward Compatibility:** Auto-normalizzazione da campo "rack" a "rackId"
- **Persistenza 3-Layer:** localStorage + API + ActivityLog

### ✅ Quality Assurance
- **28 Test Cases:** Tutti passati al 100%
- **Zero Data Corruption:** Confermato in export/import cycle
- **Error Handling:** Messaggi di errore specifici per ogni scenario
- **Authentication:** Import protetto da login (edit-mode-only)
- **Accessibility:** Entrambi i bottoni (Export/Import) visibili e funzionali

---

## 🆕 Novità della Versione 3.1.5

### 🗺️ Topology Position Persistence
- **Posizioni Persistenti:** Le posizioni dei dispositivi personalizzate sono salvate in localStorage
- **Drag & Drop Memorizzato:** Spostare dispositivi persiste tra cambi di tab e ricaricamenti pagina
- **Reset Layout:** Cambiare layout resetta le posizioni (reset intenzionale)
- **UX Migliorata:** Nessuna perdita di arrangiamenti topologia navigando tra tab

### 🐛 Bug Fix
- **WallJack Rack Filter:** Corretto bug dove WallJack di altri rack apparivano filtrando per rack. Ora mostra solo WallJack dei dispositivi del rack filtrato (non esterni/connessi)

---

## 🆕 Novità della Versione 3.1.4

### 🧹 Code Quality
- **Rimozione Codice Duplicato:** Eliminata funzione `requireAuth()` duplicata
- **Rimozione Dead Code:** Rimossa utility `debounceFilter` non utilizzata  
- **Standardizzazione Messaggi:** Tutti i Toast ora in inglese per consistenza
- **Riduzione File Size:** Rimosse ~20 righe di codice ridondante

---

## 🆕 Novità della Versione 3.1.3

### 🔒 Sicurezza
- **Protezione XSS:** Sanitizzazione completa di tutti i contenuti HTML con `escapeHtml()`
- **Validazione Import Migliorata:** Controllo dei tipi di dati (number, string, array) durante l'import JSON
- **Fallback escapeHtml:** Funzione disponibile anche se app.js non è caricato (features.js, ui-updates.js)
- **requireAuth Robusto:** Fallback con messaggio se il modulo Auth non è disponibile

### ⚡ Performance
- **Filtri con Debounce:** I filtri di testo attendono 250ms prima di aggiornare la lista
- **Rendering Ottimizzato:** Riduzione degli aggiornamenti UI durante la digitazione

### 🐛 Bug Fix
- **c.color undefined:** Fallback a `config.connColors[type]` quando il colore della connessione non è definito
- **Versioni Sincronizzate:** Tutti i file JS ora mostrano versione 3.1.3

---

## 🆕 Versioni Precedenti

### v3.1.2 - Miglioramenti Legenda
- Conteggio Wall Jack dalle connessioni
- Stato Off/Disabled nella legenda
- Footer riepilogativo

### v3.0.3 - Correzioni Bug
- Fix visualizzazione Wall Jack nella Topologia
- Supporto connessioni esterne con icone distintive

### v3.0.2 - Correzioni Critiche
- Fix mutation dei dati di connessione
- Fix memory leak nel topology

### v3.0.1 - SVG Topology
- Topologia SVG con icone Cisco-style
- Export Draw.io funzionalità

### v3.0.0 - Major Release
- Campo Location/Department con filtro
- 4 Campi IP separati
- Link multipli per dispositivo
- Mappa di rete interattiva
- Log attività
- Sistema di autenticazione

---

## 🔐 Sistema di Autenticazione

L'applicazione ha un sistema de autenticazione:
- **Accesso Pubblico:** Visualizzazione, stampa ed esportazione
- **Accesso Autenticato:** Aggiungere, modificare, eliminare dispositivi e connessioni

### Credenziali Predefinite
- **Utente:** `tiesse`
- **Password:** `tiesseadm`

Per cambiare la password, modifica il file `config/config.php` e genera un nuovo hash:
```bash
php -r "echo password_hash('nuova_password', PASSWORD_DEFAULT);"
```

---

## 📁 Struttura dei File

```
intranet/
├── index.html              # Pagina principale (v3.1.3, 1138 righe)
├── server.js               # Server Node.js (v3.1.3)
├── data.php                # API REST (PHP alternativo)
├── start-server.bat        # Avvio rapido Windows
│
├── api/
│   └── auth.php            # API autenticazione
│
├── config/
│   └── config.php          # Configurazione
│
├── js/
│   ├── app.js              # Logica principale (v3.1.3, ~2400 righe)
│   │                       # - escapeHtml() con sanitizzazione
│   │                       # - requireAuth() con fallback
│   │                       # - Debounce nei filtri
│   │                       # - Validazione import migliorata
│   ├── ui-updates.js       # Rendering UI (v3.1.3, ~1400 righe)
│   │                       # - XSS protection completa
│   │                       # - c.color fallback
│   │                       # - escapeHtml fallback
│   ├── features.js         # Funzionalità estese (v3.1.3, ~3250 righe)
│   │                       # - ActivityLog
│   │                       # - LocationFilter
│   │                       # - SVGTopology (icone Cisco)
│   │                       # - DrawioExport
│   │                       # - PNG export con titolo
│   │                       # - escapeHtml fallback
│   └── auth.js             # Modulo autenticazione (v3.1.3)
│
└── data/
    └── network_manager.json  # Dati persistenti
```

---

## 🚀 Deploy

### Opzione 1: Node.js (Consigliato) ⭐

```bash
cd intranet
node server.js
```

Accedi a: http://localhost:3000/

### Opzione 2: PHP

```cmd
cd intranet
php -S 0.0.0.0:8080
```

Accedi a: http://localhost:8080/

### Opzione 3: Apache (Produzione)

```bash
# Copia i file
sudo cp -r intranet/* /var/www/html/matrix/

# Imposta i permessi
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data
```

---

## 📊 Funzionalità

### Tab Disponibili
| Tab | Icona | Descrizione |
|-----|-------|-------------|
| Devices | 📱 | Gestione dispositivi con form completo |
| Connections | ⚡ | Gestione connessioni tra dispositivi |
| Matrix | 🔗 | Matrice visuale delle connessioni |
| Topology | 🗺️ | Mappa topologica SVG con icone Cisco |
| Logs | 📜 | Log attività con filtri |
| Help | ❓ | Documentazione integrata |

### Gestione Dispositivi
- ✅ CRUD completo
- ✅ Location/Department con filtro globale
- ✅ 4 campi IP con supporto maschera
- ✅ Link multipli per documentazione
- ✅ 17+ tipi dispositivo con icone Cisco

### Gestione Connessioni
- ✅ Connessioni punto-punto
- ✅ Destinazioni esterne (ISP, WAN)
- ✅ Supporto Wall Jack (prese a muro)
- ✅ Marcatura cavi e colori
- ✅ 10 tipi di connessione

### Topologia SVG
- ✅ Icone Cisco-style per ogni tipo
- ✅ 4 layout: Auto, Circle, Grid, Hierarchical
- ✅ Filtro per Location e Source
- ✅ Legenda con conteggi e stato off
- ✅ Export PNG e Draw.io

### Export/Import
- ✅ Export JSON (backup completo)
- ✅ Import JSON (con validazione)
- ✅ Export Excel (3 fogli)
- ✅ Stampa filtrata per location

---

## 🔧 Configurazione

### Personalizzazione Colori Connessione
Modifica `config.connColors` in `js/app.js`:
```javascript
connColors: {
    lan: '#22c55e',      // Verde
    wan: '#3b82f6',      // Blu
    dmz: '#f97316',      // Arancione
    trunk: '#8b5cf6',    // Viola
    management: '#06b6d4', // Ciano
    ...
}
```

### Tipi Dispositivo Disponibili
| Tipo | Label | Categoria |
|------|-------|-----------|
| router | Router | Network Infrastructure |
| switch | Switch | Network Infrastructure |
| firewall | Firewall | Network Infrastructure |
| patch | Patch Panel | Network Infrastructure |
| walljack | Wall Jack | Network Infrastructure |
| wifi | WiFi AP | Wireless |
| router_wifi | Router WiFi | Wireless |
| server | Server | Servers & Storage |
| nas | NAS | Servers & Storage |
| pc | PC | End Devices |
| laptop | Laptop | End Devices |
| printer | Printer | End Devices |
| camera | Camera | Security |
| ups | UPS | Power |
| isp | ISP | Other |
| others | Others | Other |

---

## 📝 Note Tecniche

### Dipendenze CDN
- **Tailwind CSS** - https://cdn.tailwindcss.com
- **SheetJS (XLSX)** - https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/

### Compatibilità Browser
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### Persistenza Dati
1. **Server** (priorità) - POST a data.php o server.js
2. **LocalStorage** (fallback) - Backup locale automatico

---

## 📄 Licenza

Proprietà di Tiesse S.P.A. - Uso interno.
