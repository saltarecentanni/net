# TIESSE Matrix Network

**Versione**: 4.1.006  
**Ultimo Aggiornamento**: 13 febbraio 2026  
**Stato**: ✅ Production Ready (Audited)

---

## Panoramica

TIESSE Matrix Network è un'applicazione web per la documentazione e gestione visuale dell'infrastruttura di rete aziendale, sviluppata per uso interno/intranet di Tiesse S.P.A.

### Caratteristiche principali
- 📱 **119 dispositivi** di rete inventariati (25 tipi supportati)
- ⚡ **93 connessioni** mappate (cablaggi, trunk, WallJack, etc.)
- 🗺️ Topologia di rete interattiva SVG con 4 layout
- 📊 Matrice connessioni visuale con zoom/pan
- 🏢 Floor Plan su planimetria reale con 22 stanze
- 🪧 Dashboard con grafici e ricerca intelligente multi-campo
- 📊 Export Excel (5 fogli), JSON, PNG
- 🔐 Autenticazione con bcrypt, CSRF, edit lock multi-utente
- 🖥️ Integrazione Apache Guacamole (SSH, RDP, VNC, Telnet)
- 📦 **100% Offline** — nessuna dipendenza CDN esterna

---

## Avvio rapido

### Prerequisiti
- Node.js 14+ 
- Browser moderno (Chrome, Firefox, Safari, Edge)

### Installazione
```bash
cd matrix
npm install
cp .env.example .env    # Personalizzare credenziali!
node server.js
```

### Accesso
```
http://localhost:3000
```

**Credenziali default**: `tiesse` / `tiesse` — **Cambiare in produzione!**

---

## Struttura del progetto

```
matrix/
├── index.html           # SPA principale
├── server.js            # Server Node.js
├── data.php             # API PHP legacy
├── js/                  # 10 moduli JavaScript (~19.500 righe)
├── css/styles.css       # Stili custom
├── api/                 # API (auth, editlock, guacamole)
├── config/              # Configurazione (config.php, json-schema)
├── assets/vendor/       # Tailwind, Chart.js, SheetJS, SweetAlert2
├── data/                # Dati JSON principali
├── scripts/             # Script manutenzione e deploy
├── tests/               # Test runner
├── backup/              # Infrastruttura backup
└── doc/                 # Documentazione
    ├── BLUEPRINT.md     # Architettura completa del sistema
    ├── CHANGELOG.md     # Registro modifiche
    ├── README.md        # Doc tecnica (data model, API)
    └── archive/         # Docs storiche (v3 + sessioni v4)
```

---

## Documentazione

| Documento | Descrizione |
|-----------|-------------|
| [doc/BLUEPRINT.md](doc/BLUEPRINT.md) | Architettura completa, data model, API, sicurezza |
| [doc/CHANGELOG.md](doc/CHANGELOG.md) | Storico versioni e modifiche |
| [doc/README.md](doc/README.md) | Documentazione tecnica dettagliata |
| [doc/QUICK_START_PHASES.md](doc/QUICK_START_PHASES.md) | Guida utente rapida |
| [doc/AUDIT_FINAL_2026-02-12.md](doc/AUDIT_FINAL_2026-02-12.md) | Report audit finale |

---

## Statistiche correnti

| Metrica | Valore |
|---------|--------|
| Dispositivi | 119 |
| Connessioni | 93 |
| Locations | 10+ |
| Gruppi | 24 |
| Stanze (floor plan) | 22 |
| Tipi dispositivo | 25 built-in + custom |

---

## Sicurezza

- Autenticazione bcrypt con CSRF token
- Rate limiting (Node.js + PHP) con backoff esponenziale
- Edit lock esclusivo con heartbeat
- Sessioni HttpOnly + SameSite=Strict
- Backup automatico prima di ogni salvataggio
- Checksum SHA-256 per integrità dati
- Content-Security-Policy headers

---

## Manutenzione

```bash
# Eseguire audit completo
cd matrix
bash tests/run-all-tests.sh

# Audit dati JSON
node scripts/audit-json.js

# Audit codice
node scripts/audit-code.js

# Avvio in debug
DEBUG_MODE=true node server.js
```

---

## Licenza

Proprietario — TIESSE S.p.A. Tutti i diritti riservati.  
⚠️ **Confidenziale — Solo per uso interno**

---

*Ultima verifica: 2026-02-13 | Prossima auditoria suggerita: 2026-03-13*
