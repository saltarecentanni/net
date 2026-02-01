# TIESSE Matrix Network - Project Summary v3.4.0

**Data:** 1 Febbraio 2026  
**Status:** ✅ Production Ready

---

## 📋 Overview

TIESSE Matrix Network è un'applicazione web per la gestione dell'infrastruttura di rete aziendale, che permette di:
- Registrare dispositivi di rete
- Mappare connessioni tra dispositivi
- Visualizzare la topologia in formato matrice e grafico
- Gestire piante con stanze e posizionamento dispositivi
- Esportare dati in vari formati

---

## 📊 Statistiche Attuali

| Entità | Quantità |
|--------|----------|
| Dispositivi | 81 |
| Connessioni | 89 |
| Stanze | 20 |
| Prossimo ID | 117 |

---

## 🏗️ Architettura

### Stack Tecnologico

| Layer | Tecnologia |
|-------|------------|
| Frontend | HTML5 + Tailwind CSS |
| JavaScript | ES6 (Vanilla) |
| Icone | SVG Cisco-style |
| Modal | SweetAlert2 |
| Excel | SheetJS (XLSX) |
| Backend | Node.js / PHP |
| Persistenza | JSON file |

### Struttura File

```
Matrix/
├── index.html          # Pagina principale (~1346 righe)
├── server.js           # Server Node.js (~250 righe)
├── data.php            # API PHP
├── css/styles.css      # CSS Variables
├── js/
│   ├── app.js          # Logica principale (v3.3.0, ~3259 righe)
│   ├── ui-updates.js   # Rendering UI (v3.4.0, ~2350 righe)
│   ├── features.js     # Funzionalità estese (v3.3.0, ~3416 righe)
│   ├── floorplan.js    # Floor Plan (v3.4.0, ~986 righe)
│   └── auth.js         # Autenticazione (~215 righe)
└── data/
    └── network_manager.json
```

---

## 📑 Tab Disponibili

| Tab | Descrizione |
|-----|-------------|
| 📋 Devices | Gestione dispositivi (cards/table) |
| ⚡ Connections | Gestione connessioni |
| 🔀 Matrix | Matrice connessioni SVG |
| 🗺️ Topology | Mappa topologica |
| 🏢 Floor Plan | Gestione stanze |
| 📝 Logs | Activity log |
| ❓ Help | Guida |

---

## 🔧 Funzionalità Chiave

### Import/Export

| Formato | Contenuto |
|---------|-----------|
| JSON | devices, connections, rooms, version |
| Excel | 4 fogli: Devices, Connections, Matrix, Rooms |
| PNG | Topology, Floor Plan |
| Draw.io | Topologia esportabile |

### Room Management

- Associazione dispositivo-stanza via location
- Nickname stanze con sincronizzazione dispositivi
- Modal info stanza con statistiche
- Conteggio dispositivi per stanza

### Sicurezza

- Autenticazione session-based
- Credenziali: tiesse / tiesseadm
- Protezione XSS con escapeHtml()

---

## 📚 Documentazione

| File | Contenuto |
|------|-----------|
| [BLUEPRINT.md](Matrix/doc/BLUEPRINT.md) | Architettura tecnica |
| [README.md](Matrix/doc/README.md) | Guida utente |
| [ROOM_STRUCTURE.md](Matrix/doc/ROOM_STRUCTURE.md) | Struttura dati stanze |
| [CHANGELOG_3.4.0.md](CHANGELOG_3.4.0.md) | Modifiche v3.4.0 |
| [CHANGELOG_3.3.1.md](CHANGELOG_3.3.1.md) | Modifiche v3.3.1 |
| [CHANGELOG_3.2.0.md](CHANGELOG_3.2.0.md) | Modifiche v3.2.0 |

---

## 🚀 Deploy

### Node.js (Consigliato)
```bash
cd Matrix && node server.js
# http://localhost:3000/
```

### PHP
```bash
cd Matrix && php -S 0.0.0.0:8080
# http://localhost:8080/
```

### Windows
```batch
start-server.bat
```

---

## ✅ Test Verificati

- 20/20 test di integrità passati
- 11/11 endpoint runtime funzionanti
- Import/Export rooms completamente funzionale
- Sincronizzazione FloorPlan verificata

---

## 📝 Versioni

| Versione | Data | Highlights |
|----------|------|------------|
| 3.4.0 | 2026-02-01 | Room management, Import/Export rooms |
| 3.3.1 | 2026-01-30 | Matrix hover fix, font standardization |
| 3.3.0 | 2026-01-31 | CSS Variables architecture |
| 3.2.0 | 2026-01-29 | Offline/Intranet preparation |
| 3.1.x | 2026-01-27-28 | Cascading forms, security |
| 3.0.0 | 2026-01-26 | Initial release |

---

**© 2026 Tiesse S.P.A. - Tutti i diritti riservati**
