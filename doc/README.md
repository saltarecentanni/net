# TIESSE Matrix Network

Applicazione web di gestione della rete per deploy in intranet aziendale.

**Versione:** 3.1.2  
**Data:** 28 Gennaio 2026

---

## 🆕 Novità della Versione 3.1.2

### Miglioramenti Legenda Topologia
- **🔌 Conteggio Wall Jack:** La legenda ora conta i Wall Jack virtuali dalle connessioni (isWallJack=true)
- **📴 Stato Off/Disabled:** La legenda mostra i dispositivi spenti con badge rosso e conteggio separato
- **📊 Footer Riepilogativo:** Mostra totale dispositivi, dispositivi off e conteggio wall jack

### Miglioramenti UI
- **🗺️ Icona Topology:** Cambiata da 🖧 a 🗺️ per migliore visibilità
- **🎯 Filtro Location Semplificato:** Rimossa icona duplicata e testo statistiche dalla barra Actions
- **📜 Tab Logs:** Rinominata da "Activity Logs" a "Logs"
- **📋 Pulsante Legend:** Aggiunto pulsante dedicato nella tab Topology

---

## 🆕 Versioni Precedenti

### v3.0.3 - Correzioni Bug
- Fix visualizzazione Wall Jack nella Topologia
- Supporto connessioni esterne con icone distintive
- Label dispositivi esterni con due righe

### v3.0.2 - Correzioni Critiche
- Fix mutation dei dati di connessione
- Fix memory leak nel topology
- Migliorata gestione errori

### v3.0.1 - SVG Topology
- Topologia SVG con icone Cisco-style
- Export Draw.io funzionalità
- Fix fallback connessioni

### v3.0.0 - Major Release
- Campo Location/Department con filtro
- 4 Campi IP separati (IP1-4 con maschera)
- Link multipli per dispositivo
- Mappa di rete interattiva
- Log attività (ultimi 200 cambiamenti)
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
├── index.html              # Pagina principale (v3.1.2, 1138 righe)
├── server.js               # Server Node.js (v3.1.2)
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
│   ├── app.js              # Logica principale (v3.0.0, 2330 righe)
│   ├── ui-updates.js       # Rendering UI (v3.0.1, 1378 righe)
│   ├── features.js         # Funzionalità estese (v3.1.2, 3181 righe)
│   │                       # - ActivityLog
│   │                       # - LocationFilter
│   │                       # - SVGTopology (icone Cisco)
│   │                       # - DrawioExport
│   │                       # - showTopologyLegend()
│   └── auth.js             # Modulo autenticazione (v3.0.3, 215 righe)
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
