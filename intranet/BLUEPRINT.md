# TIESSE Matrix Network - Blueprint Tecnico

**Versione:** 2.9.5  
**Data:** Dicembre 2025  
**Autore:** TIESSE

---

## 1. PANORAMICA

### 1.1 Descrizione
Sistema web di gestione dell'infrastruttura di rete per ambienti aziendali. Permette di registrare dispositivi di rete, mappare connessioni tra loro e visualizzare la topologia in formato matrice.

### 1.2 Obiettivi
- Documentare l'infrastruttura di rete in modo centralizzato
- Visualizzare connessioni tra dispositivi in matrice
- Esportare dati in Excel/JSON per documentazione
- Permettere accesso multi-utente via rete locale

### 1.3 Novità v2.9.5
- **Campo Source:** Rinominato da "Rack ID" per supportare dispositivi sparsi
- **Order = 0:** Per dispositivi non montati in rack
- **Checkbox Rear:** Indica dispositivi nella parte posteriore del rack
- **Indicatori dropdown:** * = disabled, (R) = rear
- **Export Excel:** Nuova colonna Position (Front/Rear)
- **Help aggiornato:** Nuove FAQ su Order 0, Rear, indicatori

---

## 2. ARCHITETTURA

### 2.1 Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|------------|----------|
| Frontend | HTML5 + Tailwind CSS | CDN |
| JavaScript | ES6 (Vanilla) | - |
| Backend | PHP o Node.js | 7+ / 14+ |
| Persistenza | JSON file | - |
| Fallback | LocalStorage | - |
| Excel | SheetJS (XLSX) | 0.18.5 |

### 2.2 Struttura File

```
intranet/
├── index.html              # Pagina principale
│                           # - HTML strutturale
│                           # - CSS inline (Tailwind)
│                           # - Meta tag versione
│
├── data.php                # API REST
│                           # - GET: restituisce dati
│                           # - POST: salva dati con validazione
│                           # - Scrittura atomica (temp file)
│
├── server.js               # Server Node.js alternativo
│                           # - Senza dipendenze esterne
│                           # - Porta 3000
│
├── js/
│   ├── app.js              # Logica principale (~1400 righe)
│   │                       # - Stato globale (appState)
│   │                       # - CRUD dispositivi/connessioni
│   │                       # - Persistenza (localStorage + server)
│   │                       # - Toast notifications
│   │                       # - Import/Export JSON
│   │                       # - Funzione saveNow()
│   │                       # - Supporto Patch Panel (2 conn/porta)
│   │                       # - Funzioni di stampa migliorate
│   │
│   └── ui-updates.js       # Rendering UI (~824 righe)
│                           # - Lista dispositivi (cards/table)
│                           # - Matrice connessioni
│                           # - Tabella connessioni
│                           # - Export Excel
│                           # - Drag-to-scroll
│
└── data/
    └── network_manager.json  # Dati persistiti
```

---

## 3. MODELLO DATI

### 3.1 Struttura Principale

```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
```

### 3.2 Oggetto Device

```json
{
  "id": 1,                          // Intero positivo, auto-incremento
  "rackId": "RACK01",               // Source/Origem (rack, location, group)
  "order": 1,                       // Posizione nel rack (0 = dispositivo sparso)
  "isRear": false,                  // true = dispositivo nella parte posteriore
  "name": "SW-CORE-01",             // Nome del dispositivo
  "brandModel": "Cisco Catalyst",   // Marca/modello (opzionale)
  "type": "switch",                 // Tipo: router|switch|patch|firewall|server|wifi|isp|router_wifi|others
  "status": "active",               // Stato: active|disabled
  "addresses": [                    // Indirizzi (opzionale)
    {
      "network": "192.168.1.0/24",
      "ip": "192.168.1.1",
      "vlan": "10"
    }
  ],
  "service": "DHCP",                // Serviço (opcional)
  "ports": [                        // Array de portas
    {
      "name": "GbE1",
      "type": "GbE"
    }
  ],
  "notes": "Core switch"            // Observações (opcional)
}
```

### 3.3 Objeto Connection

```json
{
  "from": 1,                        // ID do dispositivo origem
  "fromPort": "GbE1",               // Porta origem
  "to": 2,                          // ID do dispositivo destino (ou null)
  "toPort": "GbE1",                 // Porta destino
  "externalDest": "ISP Router",     // Destino externo (se to=null)
  "type": "trunk",                  // Tipo: lan|wan|dmz|trunk|management|backup|fiber|other
  "status": "active",               // Status: active|disabled
  "cableMarker": "A1",              // Identificador do cabo (opcional)
  "cableColor": "#3b82f6",          // Cor do cabo (opcional)
  "notes": "Uplink"                 // Observações (opcional)
}
```

---

## 4. API REST (data.php)

### 4.1 GET /data.php

Retorna os dados do sistema.

**Response 200:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 5
}
```

**Response 500:**
```json
{"error": "Unable to read data file"}
```

### 4.2 POST /data.php

Salva os dados com validação completa.

**Request Body:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 5
}
```

**Response 200:**
```json
{"ok": true}
```

**Response 400 (erros de validação):**
```json
{"error": "Invalid device at index 2: missing required field 'name'"}
{"error": "Invalid connection at index 0: 'from' must be an integer"}
{"error": "Invalid data structure: missing or invalid 'devices' array"}
```

### 4.3 Validações no Servidor

#### Estrutura Principal:
- `devices` deve ser array
- `connections` deve ser array
- `nextDeviceId` deve ser inteiro

#### Cada Device:
- `id` - inteiro positivo obrigatório
- `rackId` - obrigatório (campo Source na UI)
- `name` - obrigatório
- `type` - obrigatório
- `status` - obrigatório
- `ports` - array obrigatório

#### Cada Connection:
- `from` - inteiro obrigatório
- `type` - string obrigatória
- `status` - string obrigatória

---

## 5. FUNÇÕES PRINCIPAIS

### 5.1 Persistência

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `saveToStorage()` | app.js | Salva no localStorage e chama serverSave() |
| `serverSave()` | app.js | POST para data.php (com fallbacks) |
| `serverLoad()` | app.js | GET de data.php ou JSON estático |
| `loadFromStorage()` | app.js | Carrega do localStorage |

### 5.2 Import/Export

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `exportJSON()` | app.js | Exporta dados para arquivo .json |
| `importData(e)` | app.js | Importa JSON com validação completa |
| `exportExcel()` | ui-updates.js | Exporta para .xlsx (3 abas) |

### 5.3 CRUD Dispositivos

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `saveDevice()` | app.js | Cria/atualiza dispositivo |
| `editDevice(id)` | app.js | Carrega dispositivo no formulário |
| `removeDevice(id)` | app.js | Remove dispositivo e conexões |
| `clearDeviceForm()` | app.js | Limpa formulário |

### 5.4 CRUD Conexões

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `saveConnection()` | app.js | Cria/atualiza conexão |
| `editConnection(idx)` | app.js | Carrega conexão no formulário |
| `removeConnection(idx)` | app.js | Remove conexão |
| `clearConnectionForm()` | app.js | Limpa formulário |

### 5.5 UI Updates

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `updateUI()` | app.js | Atualiza todos os componentes |
| `updateDevicesList()` | ui-updates.js | Renderiza cards de dispositivos |
| `updateMatrix()` | ui-updates.js | Renderiza matriz de conexões |
| `updateConnectionsList()` | ui-updates.js | Renderiza tabela de conexões |

### 5.6 Impressão

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `printDevice(id)` | app.js | Imprime ficha do dispositivo |
| `printConnections()` | app.js | Imprime tabela de conexões |
| `getPrintStyles()` | app.js | Retorna CSS para impressão |

---

## 6. ESTADO GLOBAL (appState)

```javascript
var appState = {
    devices: [],              // Array de dispositivos
    connections: [],          // Array de conexões
    nextDeviceId: 1,          // Próximo ID disponível
    connSort: {               // Ordenação da tabela de conexões
        key: 'id',
        asc: true
    },
    deviceSort: {             // Ordenação da tabela de dispositivos
        key: 'rack',
        asc: true
    },
    deviceView: 'cards',      // View mode: 'cards' ou 'table'
    matrixLimit: 12,          // Limite de dispositivos na matriz
    matrixExpanded: false,    // Matriz expandida?
    rackColorMap: {}          // Cache de cores por rack
};
```

---

## 7. CONFIGURAÇÕES (config)

```javascript
var config = {
    // autoSaveInterval removed - manual save only (prevents race conditions)
    connColors: {             // Cores por tipo de conexão
        lan: '#3b82f6',       // Azul
        wan: '#ef4444',       // Vermelho
        dmz: '#f97316',       // Laranja
        trunk: '#22c55e',     // Verde
        management: '#8b5cf6',// Roxo
        backup: '#eab308',    // Amarelo
        fiber: '#06b6d4',     // Ciano
        wallport: '#a78bfa',  // Roxo claro (tomadas de parede)
        external: '#64748b',  // Cinza (conexões externas)
        other: '#6b7280'      // Cinza escuro
    },
    connLabels: {
        lan: 'LAN',
        wan: 'WAN/Internet',
        dmz: 'DMZ',
        trunk: 'Trunk/Uplink',
        management: 'Management',
        backup: 'Backup',
        fiber: 'Fiber Optic',
        wallport: 'Wall Jack',
        external: 'External',
        other: 'Other'
    },
    portTypes: [              // Tipos de porta disponíveis
        'Eth', 'GbE', 'SFP/SFP+', 'QSFP/QSFP+', 
        'TTY', 'MGMT', 'PoE', 'Fiber', 'USB', 
        'RJ11', 'WAN', 'Eth/Wan', 'others'
    ],
    rackColors: [...]         // 24 cores para racks
};
```

---

## 8. FLUXO DE DADOS

### 8.1 Inicialização
```
1. DOMContentLoaded
2. serverLoad() tenta carregar do servidor
   ├── data.php (PHP)
   ├── /data.php
   ├── /data (Node.js)
   ├── data/network_manager.json (estático)
   └── /data/network_manager.json
3. Se falhar: loadFromStorage() (localStorage)
4. updateUI()
```

### 8.2 Salvamento
```
1. Usuário edita dados
2. saveDevice() ou saveConnection()
3. saveToStorage()
   ├── localStorage.setItem()
   └── serverSave()
       ├── POST data.php
       ├── POST /data.php
       └── POST /data
4. updateUI()
```

### 8.3 Import JSON
```
1. Usuário seleciona arquivo
2. importData(e)
3. FileReader.readAsText()
4. JSON.parse()
5. Validação de estrutura
6. Validação de cada device
7. Validação de cada connection
8. appState atualizado
9. saveToStorage()
10. updateUI()
11. Toast.success()
```

### 8.4 Export JSON
```
1. Usuário clica "Export JSON"
2. exportJSON()
3. JSON.stringify(appState)
4. Blob + URL.createObjectURL()
5. Download automático
6. Toast.success()
```

### 8.5 Export Excel
```
1. Usuário clica "Export Excel"
2. exportExcel()
3. XLSX.utils.book_new()
4. Aba "Devices" - dados tabulares
5. Aba "Connections" - dados tabulares
6. Aba "Matrix" - matriz de conexões
7. XLSX.writeFile()
8. Toast.success()
```

---

## 9. SEGURANÇA

### 9.1 Validação no Cliente (importData)
- Estrutura JSON válida
- Arrays devices e connections existem
- Cada device tem campos obrigatórios
- Cada connection tem campos obrigatórios

### 9.2 Validação no Servidor (data.php)
- JSON válido
- Estrutura correta
- Tipos de dados corretos
- Campos obrigatórios presentes

### 9.3 Escrita Segura
- Arquivo temporário (.tmp)
- rename() atômico
- Sem perda de dados em caso de falha

---

## 10. DEPLOY

### 10.1 Requisitos Mínimos
- Navegador moderno (Chrome 80+, Firefox 75+, Edge 80+)
- Servidor HTTP (para persistência compartilhada)
- PHP 7+ (ou Node.js)

### 10.2 PHP no Windows
```cmd
cd C:\caminho\para\intranet
C:\php\php.exe -S 0.0.0.0:8080
```

### 10.3 Node.js
```bash
cd intranet
node server.js
```

### 10.4 Servidor de Produção
```
Apache/Nginx com PHP-FPM
DocumentRoot -> /var/www/intranet/
Permissões: data/ writable pelo webserver
```

---

## 11. COMPATIBILIDADE

| Navegador | Versão Mínima | Testado |
|-----------|---------------|---------|
| Chrome | 80+ | ✅ |
| Firefox | 75+ | ✅ |
| Edge | 80+ | ✅ |
| Safari | 13+ | ✅ |
| IE | ❌ | Não suportado |

---

## 12. LIMITAÇÕES CONHECIDAS

1. **Sem autenticação** - Qualquer usuário na rede pode editar
2. **Sem histórico** - Alterações não são versionadas
3. **Concorrência** - Último a salvar sobrescreve
4. **Escala** - Testado com ~100 dispositivos e ~200 conexões

---

## 13. ROADMAP FUTURO

- [ ] Autenticação de usuários
- [ ] Histórico de alterações
- [ ] Lock otimista para concorrência
- [ ] Busca e filtros avançados
- [ ] Migração para ES6 modules
- [ ] Testes automatizados
- [ ] Containerização (Docker/K8s)

---

## 14. CONTATO

**Progetto:** Tiesse Matrix Network  
**Versione:** 2.9.5  
**Repository:** github.com/saltarecentanni/net

---

## 15. CHANGELOG

### v2.9.5 (Dicembre 2025)
- **Campo Source:**
  - Rinominato da "Rack ID" per maggiore flessibilità
  - Supporta rack, location, gruppi o dispositivi sparsi
- **Order = 0:**
  - Valore 0 indica dispositivo sparso/isolato
  - Non montato in un rack fisico
- **Checkbox Rear:**
  - Nuovo campo per indicare posizione posteriore
  - Badge REAR nei cards, (R) nelle tabelle
  - Esportato in Excel come colonna Position
- **Indicatori Dropdown:**
  - * = dispositivo disabilitato
  - (R) = dispositivo nella parte posteriore
  - Rimosso stile italico per disabled
- **Help Aggiornato:**
  - Nuove FAQ su Order 0, Rear, indicatori
  - Quick Start con avviso salvataggio manuale
- **Import/Export:**
  - Campo isRear opzionale (compatibile con dati esistenti)
  - Nuova colonna Position in Excel

### v2.9.4 (Dicembre 2025)
- **Pulsante "Salva Ora":**
  - Nuovo pulsante verde nella barra Azioni
  - Salvataggio manuale immediato su localStorage e server
  - Funzione `saveNow()` con feedback Toast
- **Patch Panel Doppia Connessione:**
  - Ogni porta del patch panel può avere 2 connessioni (fronte/retro)
  - Esempio: Wall jack → Porta 19 (retro) + Switch → Porta 19 (fronte)
  - Indicatori porta: (Libera), (1/2 - disponibile), (2/2 - completa)
  - Funzione `isPortUsed()` aggiornata con logica maxConnections
  - Funzione helper `getPortConnectionCount()`
- **Guida Utente in Italiano:**
  - Sezione Help completamente tradotta
  - Nuova sezione speciale "Patch Panel"
  - FAQ aggiornate con domanda su patch panel
- **Stampa Migliorata:**
  - Stili CSS ottimizzati per stampa
  - Colori dei badge preservati
  - Allineamento tabelle corretto
  - Bordi e spaziature uniformi
- **Validazione Connessioni:**
  - Messaggi errore in italiano
  - Gestione speciale per porte patch panel

### v2.9.1 (Dicembre 2025)
- **Wall Jack come Destinazione Speciale:**
  - Nuova opzione "🔌 Wall Jack" nel dropdown destinazione
  - Opzioni speciali (Wall Jack, External) in grassetto con colori
  - Separatore visivo "Special Destinations"
  - Label dinamica: "Wall Jack Location" vs "External Destination"
  - Placeholder contestuale per ogni tipo
  - Flag `isWallJack` per identificazione corretta
- **Validazioni Complete (20 test):**
  - 10 verifiche dirette (sintassi, struttura, consistenza)
  - 10 verifiche inverse (API, persistenza, cicli)
  - Import/Export 100% funzionale
  - Salvataggio via rete verificato

### v2.9.0 (Dicembre 2025)
- **Manual Save Only:**
  - Auto-save rimosso per evitare conflitti tra sessioni multiple
  - Usa il pulsante "Salva Ora" per salvare manualmente
- **Nuovi Tipi di Connessione:**
  - `wallport` (Wall Jack) - per prese a muro/patch panel
  - `external` - per connessioni esterne (ISP, WAN)
- **Validazione Migliorata:**
  - Connessioni devono avere destinazione (device o external)
  - Dati corretti: connessioni esterne ora hanno `externalDest`
  - Promise chain corretta in `serverSave()`

### v2.8.0 (Dicembre 2025)
- **Lista Dispositivi Migliorata:**
  - Toggle Cards/Table view (pulsanti nell'header)
  - Visualizzazione tabella stile Excel
  - Ordinamento cliccabile su tutte le colonne
  - Indicatore direzione ▲ ▼ ↕ negli header
  - Pulsante "+Conn" per aggiungere connessione dal device
  - Pre-selezione automatica del device nel form connessioni
  - Conteggio connessioni visibile in entrambe le viste
  - Avviso visivo (arancione) per device senza connessioni
- **Nuove Funzioni JavaScript:**
  - `setDeviceView(view)` - alterna tra cards e table
  - `toggleDeviceSort(key)` - ordina per colonna
  - `addConnectionFromDevice(deviceId)` - naviga a connessioni con device pre-selezionato
  - `getDevicesSortedBy(key, asc)` - funzione ordinamento generica

### v2.7.0 (Dicembre 2025)
- **Nuova Tab Help:**
  - Guida completa passo-passo
  - Sezioni: Dispositivi, Connessioni, Matrice, Modifica/Elimina, Export/Import
  - Spiegazione colori e simboli
  - FAQ con domande frequenti

### v2.6.0 (Dicembre 2025)
- **Riorganizzazione Tab:**
  - Tab 1: Devices
  - Tab 2: Active Connections (con form connessioni + lista)
  - Tab 3: Matrix (solo matrice connessioni)

### v2.5.2 (Dicembre 2025)
- **Matrice - Overhaul Visivo:**
  - Header orizzontali: sfondo scuro, bordo colorato rack
  - Header verticali: sfondo chiaro, bordo colorato rack
  - Celle connessione con ombra e bordi arrotondati
- **Stampa corretta:**
  - Badge posizione: sfondo blu scuro + testo bianco
  - Text-shadow rimossi nella stampa

### v2.5.0 (Dicembre 2025)
- Pulizia file non necessari
- Documentazione aggiornata
- start-server.bat per Windows
- Validazione robusta in import/export

### v2.4.0 (Dicembre 2025)
- Architettura modulare (app.js + ui-updates.js)
- Sistema Toast notifications
- Validazione robusta in PHP
- Stampa migliorata
