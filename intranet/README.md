# TIESSE Intranet Web App

Applicazione web di gestione della rete per deploy in intranet aziendale.

**Versione:** 2.9.5

## 🚀 Deploy Rapido

### Opzione 1: Script Automatico (Consigliato) ⭐

1. Scarica PHP: https://windows.php.net/download/ (VS16 x64 Non Thread Safe)
2. Estrai nella cartella `php/` (accanto a `intranet/`)
3. **Doppio clic su `start-server.bat`**
4. Accedi a: http://localhost:8080/ o http://TUO-IP:8080/

Struttura prevista:
```
Tiesse-network-manager/
├── start-server.bat   ← Doppio clic qui
├── php/               ← PHP estratto qui
└── intranet/          ← File del sistema
```

### Opzione 2: PHP Manuale

```cmd
cd C:\percorso\verso\intranet
C:\php\php.exe -S 0.0.0.0:8080
```

### Opzione 3: Node.js

```bash
cd intranet
node server.js
```

Accedi a: http://localhost:3000/

## 📁 Struttura File

```
intranet/
├── index.html              # Pagina principale
├── data.php                # API PHP per persistenza
├── server.js               # Server Node.js (alternativo)
├── BLUEPRINT.md            # Documentazione tecnica completa
├── README.md               # Questo file
├── js/
│   ├── app.js              # Logica principale
│   └── ui-updates.js       # Rendering dell'interfaccia
└── data/
    └── network_manager.json  # Dati (creato automaticamente)
```

## 🔧 Requisiti

### Con PHP
- PHP 7+ (scarica ZIP, non serve installare)

### Con Node.js
- Node.js 14+

### Senza server
- Basta aprire `index.html` nel browser
- Dati salvati solo in localStorage

## 📡 API REST

### GET /data.php
Restituisce i dati:
```json
{"devices": [], "connections": [], "nextDeviceId": 1}
```

### POST /data.php
Salva i dati. Restituisce:
```json
{"ok": true}
```

## 💾 Persistenza

- Prova a salvare sul server (PHP o Node.js)
- Se fallisce, salva in localStorage
- Carica dal server o dal file JSON statico

## 🖥️ Compatibilità

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13+

## ✨ Funzionalità Principali

### Dispositivi
- Cadastro completo (nome, source, tipo, stato, descrizione)
- Campo **Source**: identifica rack, location o gruppo
- Campo **Order**: posizione nel rack (0 = dispositivo sparso)
- Checkbox **Rear**: indica se il dispositivo è nella parte posteriore
- Gestione porte per dispositivo
- 24 colori automatici per source
- Vista Cards e Tabella

#### Convenzione Numerazione Posizioni
| Posizione | Direzione | Numerazione |
|-----------|-----------|-------------|
| **FRONTE** | Alto → Basso | 01, 02, 03... |
| **RETRO (R)** | Basso → Alto | 99, 98, 97... |

### Connessioni
- Registrazione connessioni tra dispositivi
- Tipi: LAN, WAN, Trunk, DMZ, Management, Fiber, Wall Jack, External
- Stato: Attivo, Disabilitato
- ID cavo, colore, note
- **Patch Panel: supporto doppia connessione (fronte/retro)**

### Matrice Visuale
- Visualizzazione a griglia colorata per source
- Clic per modificare connessione
- Colonne speciali per Wall Jack ed External

### Stampa & Esportazione
- 📊 Esporta in Excel (XLSX) con colonna Position (Front/Rear)
- 📄 Esporta/Importa JSON
- 🖨️ Stampa Matrice
- 🖨️ Stampa Lista Connessioni
- 💾 **Pulsante "Salva Ora" per salvataggio manuale immediato**

## 📌 Changelog

### v2.9.5 (Dicembre 2025)
- ✨ **Campo Source**: rinominato da "Rack ID" per supportare dispositivi sparsi
- ✨ **Order = 0**: per dispositivi non montati in rack
- ✨ **Checkbox Rear**: indica dispositivi nella parte posteriore del rack
- ✨ **Indicatori visivi**: * = disabled, (R) = rear nelle liste dropdown
- 📄 **Export Excel migliorato**: nuova colonna Position (Front/Rear)
- 📚 Help completamente aggiornato con nuove FAQ
- ⚠️ Salvataggio solo manuale (evita conflitti tra sessioni)

### v2.9.4 (Dicembre 2025)
- ✨ **Nuovo pulsante "Salva Ora":** Salva manualmente tutti i dati in qualsiasi momento
- ✨ **Patch Panel doppia connessione:** Le porte dei patch panel possono avere 2 connessioni (fronte e retro)
  - Esempio: Wall jack → Porta 19 (retro) e Porta 19 → Switch porta 33 (fronte)
  - Indicatori visivi: (Libera), (1/2 - disponibile), (2/2 - completa)
- 🌍 **Guida utente in italiano:** Sezione Help completamente tradotta in italiano
- 🖨️ **Stampa migliorata:** Colori preservati, allineamento corretto, badge visibili
- 📚 Documentazione aggiornata

### v2.9.3 (Dicembre 2025)
- Correzione critica: endpoint di salvataggio corretto per Node.js

### v2.9.1 (Dicembre 2025)
- Wall Jack come Destinazione Speciale
- Validazioni Complete (20 test)
- Import/Export 100% funzionale
- Frontend agora usa `/data` como endpoint principal
- Servidor Node.js aceita múltiplas variações de endpoint
- Persistência de dados funcionando corretamente

### Versões anteriores
- v2.9.2 - Melhorias na matriz visual
- v2.5.1 - Headers com rack, nome, posição
