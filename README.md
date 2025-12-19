# Tiesse Matrix Network

Sistema web di gestione dell'infrastruttura di rete per ambienti aziendali.

**Versione attuale:** 2.9.5

## 📋 Panoramica

**Tiesse Matrix Network** è un'applicazione web per gestire dispositivi di rete, connessioni e rack. Offre visualizzazione a matrice, esportazione dati e interfaccia moderna.

## 🚀 Funzionalità

### Dispositivi
- Registrazione completa (nome, source, tipo, stato, descrizione)
- Campo **Source**: identifica rack, location o gruppo
- Campo **Order**: posizione nel rack (0 = dispositivo sparso)
- Checkbox **Rear**: indica se il dispositivo è nella parte posteriore
- Gestione porte per dispositivo
- 24 colori automatici per source
- Vista Cards e Tabella

### Connessioni
- Registrazione connessioni tra dispositivi
- Tipi: LAN, WAN, Trunk, DMZ, Management, Fiber, Wall Jack, External
- Stato: Attivo, Disabilitato
- ID cavo, colore, note
- **Patch Panel: supporto doppia connessione (fronte/retro)**
- Ordinamento per qualsiasi colonna

### Matrice Visuale
- Visualizzazione a griglia colorata per rack
- Clic per modificare connessione
- Colonne speciali per Wall Jack ed External

### Stampa & Esportazione
- 📊 Esporta in Excel (XLSX)
- 📄 Esporta/Importa JSON
- 🖨️ Stampa Matrice
- 🖨️ Stampa Lista Connessioni
- 💾 **Pulsante "Salva Ora" per salvataggio manuale**

## 🛠️ Tecnologie

| Componente | Tecnologia |
|------------|------------|
| Frontend | HTML5, Tailwind CSS (CDN) |
| JavaScript | ES6, Modulare (app.js + ui-updates.js) |
| Backend | PHP 7+ o Node.js |
| Persistenza | LocalStorage + Server |
| Excel | SheetJS (XLSX 0.18.5) |

## 📁 Struttura Progetto

```
Tiesse-network-manager/        # Cartella radice
├── start-server.bat           # ⭐ Doppio clic per avviare
├── php/                       # PHP estratto qui
└── intranet/
    ├── index.html             # Pagina principale
    ├── data.php               # API di persistenza
    ├── server.js              # Server Node.js (alternativo)
    ├── BLUEPRINT.md           # Documentazione tecnica
    ├── README.md              # Guida al deploy
    ├── js/
    │   ├── app.js             # Logica principale
    │   └── ui-updates.js      # Rendering UI
    └── data/
        └── network_manager.json  # Dati persistiti
```

## 📦 Installazione

### Opzione 1: Windows (Consigliato) ⭐

1. Scarica PHP: https://windows.php.net/download/ (VS16 x64 Non Thread Safe)
2. Estrai nella cartella `php/` dentro `Tiesse-network-manager/`
3. **Doppio clic su `start-server.bat`**
4. Accedi a: http://localhost:8080/ o http://TUO-IP:8080/

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

## 🔒 Sicurezza

- ✅ Validazione struttura JSON
- ✅ Validazione campi obbligatori
- ✅ Messaggi di errore dettagliati
- ✅ Fallback su LocalStorage

## 📌 Changelog

### v2.9.4 (Dicembre 2025)
- ✨ **Nuovo pulsante "Salva Ora":** Salva manualmente tutti i dati in qualsiasi momento
- ✨ **Patch Panel doppia connessione:** Le porte dei patch panel possono avere 2 connessioni (fronte e retro)
  - Esempio: Wall jack → Porta 19 (retro) e Porta 19 → Switch porta 33 (fronte)
  - Indicatori visivi: (Libera), (1/2 - disponibile), (2/2 - completa)
- 🌍 **Guida utente in italiano:** Sezione Help completamente tradotta
- 🖨️ **Stampa migliorata:** Colori preservati, allineamento corretto
- 📚 Documentazione completamente aggiornata

### v2.9.3 (Dicembre 2025)
- Correzione critica: endpoint di salvataggio corretto per Node.js

### v2.9.1 (Dicembre 2025)
- Wall Jack come Destinazione Speciale
- Validazioni Complete (20 test)
- Import/Export 100% funzionale

### v2.8.0 (Dicembre 2025)
- Toggle Cards/Table view per dispositivi
- Ordinamento in tutte le colonne
- Avviso visivo per device senza connessioni

### v2.7.0 (Dicembre 2025)
- Nuova scheda Help con guida completa

### v2.6.0 (Dicembre 2025)
- Riorganizzazione schede UI
- Import/Export verificati e funzionali

## 📄 Licenza

Progetto interno TIESSE.