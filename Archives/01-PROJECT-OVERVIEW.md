# 01. Visão Geral do Projeto

**Versão**: 4.1.006  
**Data**: 13 fevereiro 2026

---

## O que é TIESSE Matrix Network?

TIESSE Matrix Network é uma **aplicação web de documentação de infraestrutura de rede** desenvolvida internamente para Tiesse S.P.A. 

É uma ferramenta de **inventário e visualização de dispositivos de rede** com mapeamento completo de conexões, topologia interativa e floor plan.

---

## Features Principais

### 📱 Inventário de Dispositivos
- **119 dispositivos** catalogados  
- **25 tipos** buildIn + custom types via Type Manager
- Campos: hostname, IP, máscara, marca/modelo, localização, status
- Sistema de nomenclatura padronizado com **prefixos em roxo**

### 🔌 Gerenciamento de Conexões
- **93 conexões** mapeadas
- Tipos: LAN, WAN, Trunk, Wall Jack, externos
- Validação de ciclos e loops
- Cable markers para identificação

### 🗺️ Visualizações
- **Topologia SVG** - 4 layouts (força, hierárquico, circular, griglia)
- **Matrice de Conexões** - Vista tabelar + SVG com zoom
- **Floor Plan** - Mapa físico com 22 salas
- **Dashboard** - Graficos, estatísticas, busca inteligente

### 📊 Exportação
- Excel (5 sheets: devices, connections, groups, locations, sites)
- JSON (estrutura completa)
- PNG (topology, matrix, floor plan)
- CSV (custom)

### 🔐 Segurança
- Autenticação bcrypt
- CSRF token em todos os forms
- Edit lock exclusivo (prevent simultaneous edits)
- Rate limiting com backoff exponencial
- Backup automático antes de cada save

### 🌐 Integração
- Apache Guacamole (SSH, RDP, VNC, Telnet)
- Busca multi-campo
- Activity log com timestamp

---

## Tecnologia Stack

| Camada | Tecnologia |
|--------|----------|
| **Frontend** | HTML5 + Vanilla JavaScript (ES5) + Tailwind CSS v3 |
| **Backend** | Node.js + Express.js |
| **Database** | JSON file (no external DB) |
| **APIs** | RESTful (JSON payloads) |
| **Libs** | Chart.js, SweetAlert2, SheetJS, SVG.js |
| **Deploy** | Node.js server (intranet/localhost) |
| **Security** | bcrypt, crypto.SHA256, CSRF tokens |

---

## Estatísticas

```
📦 Código
├── JS:      19.500+ linhas (10 modulos)
├── HTML:    4.850 linhas
├── CSS:     Custom + Tailwind
└── Docs:    2.000+ linhas

📊 Dados
├── Dispositivos:   119
├── Conexões:       93  
├── Localizações:   22 protegidas
├── Grupos:         24
└── Custom Types:   Unlimited

⚡ Performance
├── Tempo de carregamento:  < 2s
├── Operações JSON:         Instantâneo
├── Busca multi-campo:      < 100ms
└── Export Excel:           < 5s
```

---

## Estrutura Pasta

```
matrix/
├── index.html              SPA principal
├── server.js               Node.js server
├── data.php                API PHP legacy
├── js/
│   ├── app.js              Core logic (~6500 linhas)
│   ├── ui-updates.js       UI rendering (~3400 linhas)
│   ├── features.js         Reports, Type Manager
│   ├── dashboard.js        Dashboard
│   ├── topology.js         Topology SVG
│   ├── matrix.js           Matrix view
│   ├── floorplan.js        Floor plan
│   ├── device-detail.js    Device page
│   ├── default-data.js     Protected locations
│   └── utils.js            Utilities
├── css/
│   └── styles.css          Custom styles
├── api/
│   ├── auth.php            Authentication
│   ├── editlock.php        Edit locks
│   └── guacamole.js        Guacamole integration
├── config/
│   └── config.php          Database config
├── assets/vendor/          Tailwind, Chart.js, etc
├── data/
│   └── network_manager.json Main data file
├── backup/                 Auto-backups
├── scripts/                Maintenance scripts
├── tests/                  Test suite
└── doc/
    └── [organized docs]    Documentation
```

---

## Fluxo de Dados

```
User Interface (index.html)
         ⬇️
  JavaScript (app.js)
         ⬇️
  API Calls (fetch)
         ⬇️
Node.js Server (server.js)
         ⬇️
network_manager.json (filesystem)
         ⬇️
Auto-backup + Lock file
```

---

## Versioning

```
4.1.006 (Current)
├── 4.1: Purple prefix badges
├── 4.0: Complete cleanup
└── 3.x: Legacy (archived)
```

---

## Próximos Passos (Roadmap)

- [ ] Validação de padrão de nomeação (regex)
- [ ] Template de nomes salvos
- [ ] Bulk device import
- [ ] Duplicate device detection
- [ ] Device history/audit log
- [ ] Performance metrics dashboard

---

Para mais detalhes técnicos, veja [03-ARCHITECTURE.md](03-ARCHITECTURE.md)
