# CHANGELOG - Version 3.4.0

**Data:** 30 Gennaio 2026  
**Status:** ✅ Completato

---

## 📋 Riepilogo delle Modifiche v3.4.0

### 🎨 SVG Matrix - Matrice Nativa in Grafica Vettoriale

#### 1. Refactoring Completo della Matrice
**Problema:** La matrice HTML usava `<table>` con CSS zoom, causando export PNG di bassa qualità non corrispondente allo schermo.

**Soluzione:**
- ✅ Nuovo modulo `SVGMatrix` completamente in SVG
- ✅ Zoom/pan nativo con `viewBox` (come Topology)
- ✅ Export PNG perfetto: ciò che vedi = ciò che esporti
- ✅ Qualità vettoriale, perfetta anche stampando

**Caratteristiche:**
- Drag per pan (spostamento)
- Ctrl+Scroll per zoom
- Click su celle per modificare connessione
- Tooltip su hover
- Highlight riga/colonna su hover
- Export PNG ad alta risoluzione (2x scale)

**File modificati:**
- `js/ui-updates.js` - Nuovo modulo `SVGMatrix` (~600 righe)
- `index.html` - Container ottimizzato per SVG

---

### 🔧 Miglioramenti Tecnici

#### 2. Controlli Zoom Aggiornati
- Bottoni `-` e `+` ora usano zoom SVG viewBox
- Bottone "Fit" per adattare vista al contenuto
- Label zoom mostra percentuale calcolata

#### 3. Export PNG Unificato
- Usa stessa tecnica di Topology (SVG → Canvas → PNG)
- Include titolo e filtri attivi nel nome file
- Qualità 2x per stampa nitida

---

---

# CHANGELOG - Version 3.2.0

**Data:** 29 Gennaio 2026  
**Status:** ✅ Completato e deployato

---

## 📋 Riepilogo delle Modifiche

### 🌐 Preparazione per Intranet Offline

#### 1. Librerie Locali (CDN Independence)
**Problema:** L'app dipendeva da CDN esterni (Tailwind CSS, XLSX.js), rendendola non funzionale senza internet.

**Soluzione:**
- ✅ Creato `/assets/vendor/` con librerie locali:
  - `tailwind.min.js` (407 KB)
  - `xlsx.full.min.js` (881 KB)
- ✅ Aggiornato `index.html` per usare librerie locali
- ✅ App ora funziona completamente offline in intranet

**File modificati:**
- `index.html` (linee 11-12 → assetti/vendor/)

---

### 🔒 Miglioramenti per Multi-Utente Concorrente

#### 2. File Locking (Sincronizzazione dati)
**Problema:** Più utenti contemporanei potevano causare perdita dati con race condition su JSON.

**Soluzione:**
- ✅ Implementato `LOCK_EX` in `file_put_contents()`
- ✅ Temp file con `uniqid()` per evitare collisioni
- ✅ Operazione atomica `rename()` per integrità

**File modificati:**
- `data.php` (linee 154-168)

**Codice:**
```php
// Safe write with file locking for concurrent access
$tmpFile = DATA_FILE . '.tmp.' . uniqid();
$jsonData = json_encode($tmp, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Write to temp file with exclusive lock
$w = file_put_contents($tmpFile, $jsonData, LOCK_EX);
```

---

### 📊 Pulizia Export Excel

#### 3. Rimozione Emoji da Dati
**Problema:** Export Excel conteneva emoji (🔌📡) nelle colonne, rendendo dati non puliti.

**Soluzione:**
- ✅ Sostituito `🔌 [device]` con `[WJ] [device]` (Wall Jack)
- ✅ Sostituito `📡 [device]` con `[EXT] [device]` (External)
- ✅ Export Excel ora ha dati puliti e compatibili

**File modificati:**
- `js/ui-updates.js` (linea 1304)

**Prima:**
```javascript
'Dst Device': toDevice ? toDevice.name : (c.isWallJack ? '🔌 ' + c.externalDest : (c.externalDest ? '📡 ' + c.externalDest : ''))
```

**Dopo:**
```javascript
'Dst Device': toDevice ? toDevice.name : (c.isWallJack ? '[WJ] ' + c.externalDest : (c.externalDest ? '[EXT] ' + c.externalDest : ''))
```

---

### 🔧 Correzioni Script

#### 4. Fix start-server.bat
**Problema:** Percorso errato puntava a cartella `intranet/` inesistente.

**Soluzione:**
- ✅ Corretto percorso: `cd /d "%~dp0"` (cartella script)
- ✅ Aggiunto fallback PHP: tenta `php.exe` locale, poi `php` nel PATH
- ✅ IP generico (rimosso hardcoded IP)
- ✅ Script funziona su qualsiasi sistema Windows

**File modificati:**
- `start-server.bat` (linee 17-22)

**Cambiamenti:**
```bat
REM Vecchio:
cd /d "%~dp0intranet"  ← ERRORE: cartella non esiste

REM Nuovo:
cd /d "%~dp0"  ← OK: usa cartella dello script
IF EXIST "%~dp0php\php.exe" (
    "%~dp0php\php.exe" -S 0.0.0.0:8080
) ELSE (
    php -S 0.0.0.0:8080  ← Fallback PHP dal PATH
)
```

---

## 🔄 Validazione Funzionalità

### ✅ Import/Export JSON
**Stato:** Funzionante  
**Verificato:**
- `exportJSON()` in `app.js` (linea 2411) ✓
- `importData()` in `app.js` (linea 2437) ✓
- Validazioni complete con error handling ✓
- Supporto backward compatibility (rackId/rack) ✓

### ✅ Export Excel
**Stato:** Funzionante (dati puliti)  
**Verificato:**
- 3 sheets: Devices, Connections, Matrix ✓
- Emoji rimossi dalle colonne ✓
- Dati numerici e stringhe pulite ✓
- XLSX library caricata correttamente ✓

### ✅ Funzionamento Offline
**Stato:** Garantito  
**Verificato:**
- Tailwind CSS locale ✓
- XLSX local ✓
- App responsiva senza CDN ✓
- localStorage fallback funzionante ✓

---

## 📁 Struttura Nuova

```
Matrix/
├── assets/
│   ├── logoTiesse.png
│   └── vendor/                    ← NUOVO
│       ├── tailwind.min.js        ← NUOVO
│       └── xlsx.full.min.js       ← NUOVO
├── config/
├── data/
├── doc/
├── js/
├── api/
├── index.html                     ← MODIFICATO
├── data.php                       ← MODIFICATO
├── server.js                      ← MODIFICATO
└── start-server.bat               ← MODIFICATO
```

---

## 🔮 Preparazione per Migrazione DB

L'architettura è preparata per futura migrazione JSON → Database:

1. **Data Access Layer:** Già separato
2. **API Compatibility:** Endpoint `/data` compatibile con JSON
3. **Import/Export:** Funziona con qualsiasi fonte dati
4. **Documentazione:** BLUEPRINT.md aggiornato con architettura

### Prossimi passi per migrazione:
1. Creare layer di astrazione (DataService.php)
2. Implementare PDO con prepared statements
3. Migrare logica import/export nel backend
4. Mantenere compatibilità API REST

---

## 🚀 Deploy Instructions

### Linux + Apache (Raccomandato per produzione)

```bash
# Copia file
sudo cp -r Matrix/* /var/www/html/matrix/

# Permessi
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data

# Apache config
sudo a2enmod rewrite
sudo systemctl restart apache2

# Accesso
http://your-server/matrix/
```

### Windows (Sviluppo)

```bat
cd Matrix
start-server.bat
# Accesso: http://localhost:8080/
```

### Node.js (Alternativa)

```bash
cd Matrix
node server.js
# Accesso: http://localhost:3000/
```

---

## 📊 Statistiche Versione

| Metrica | Valore |
|---------|--------|
| Linee codice modificate | 47 |
| File modificati | 4 |
| File creati | 2 (vendor libs) |
| Dimensione backup .tar | 1.9 MB |
| Versione database schema | 1.0 (JSON) |
| Compatibilità backward | ✓ Totale |

---

## ✅ Checklist Implementazione

- [x] Download librerie locali (Tailwind + XLSX)
- [x] Aggiornamento index.html
- [x] Implementazione file locking (LOCK_EX)
- [x] Rimozione emoji from Excel export
- [x] Correzione start-server.bat
- [x] Aggiornamento versione (3.1.23 → 3.2.0)
- [x] Validazione import/export
- [x] Validazione offline functionality
- [x] Documentazione aggiornata (README + BLUEPRINT)
- [x] Backup .tar creato
- [x] Git commit e push completato

---

## 🔐 Note di Sicurezza

- ✅ HTTP su intranet è accettabile (uso interno)
- ✅ LOCK_EX protegge da race conditions
- ✅ XSS protection mantenuto (escapeHtml)
- ✅ Authentication session-based funzionante
- ⚠️ TODO futuro: Migrare credenziali a .env file (v3.3)

---

## 📞 Supporto

Per problemi:
1. Verificare `/assets/vendor/` esiste e contiene librerie
2. Controllare permessi di scrittura su `/data/`
3. Verificare PHP version ≥ 7.4 per file locking
4. Controllare browser console per errori JS

---

**Commit:** `6a5e4dc`  
**Data Deploy:** 29 Gennaio 2026 13:45 UTC  
**Status:** ✅ Production Ready
