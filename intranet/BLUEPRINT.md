# TIESSE Matrix Network - Blueprint Técnico

**Versão:** 2.7.0  
**Data:** Dezembro 2025  
**Autor:** TIESSE

---

## 1. VISÃO GERAL

### 1.1 Descrição
Sistema web de gerenciamento de infraestrutura de rede para ambientes corporativos. Permite cadastrar dispositivos de rede, mapear conexões entre eles e visualizar a topologia em formato de matriz.

### 1.2 Objetivos
- Documentar a infraestrutura de rede de forma centralizada
- Visualizar conexões entre dispositivos em matriz
- Exportar dados para Excel/JSON para documentação
- Permitir acesso multi-usuário via rede local

---

## 2. ARQUITETURA

### 2.1 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend | HTML5 + Tailwind CSS | CDN |
| JavaScript | ES6 (Vanilla) | - |
| Backend | PHP | 7+ |
| Persistência | JSON file | - |
| Fallback | LocalStorage | - |
| Excel | SheetJS (XLSX) | 0.18.5 |

### 2.2 Estrutura de Arquivos

```
intranet/
├── index.html              # Página principal (417 linhas)
│                           # - HTML estrutural
│                           # - CSS inline (Tailwind)
│                           # - Meta tags de versão
│
├── data.php                # API REST (136 linhas)
│                           # - GET: retorna dados
│                           # - POST: salva dados com validação
│                           # - Escrita atômica (temp file)
│
├── server.js               # Servidor Node.js alternativo
│                           # - Sem dependências externas
│                           # - Porta 3000
│
├── js/
│   ├── app.js              # Lógica principal (~1156 linhas)
│   │                       # - Estado global (appState)
│   │                       # - CRUD dispositivos/conexões
│   │                       # - Persistência (localStorage + servidor)
│   │                       # - Toast notifications
│   │                       # - Import/Export JSON
│   │                       # - Funções de impressão
│   │
│   └── ui-updates.js       # Renderização UI (~535 linhas)
│                           # - Lista de dispositivos (cards)
│                           # - Matriz de conexões (85x70px)
│                           # - Tabela de conexões
│                           # - Export Excel
│                           # - Drag-to-scroll
│
└── data/
    └── network_manager.json  # Dados persistidos
```

---

## 3. MODELO DE DADOS

### 3.1 Estrutura Principal

```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
```

### 3.2 Objeto Device

```json
{
  "id": 1,                          // Inteiro positivo, auto-incremento
  "rackId": "RACK01",               // Identificador do rack
  "order": 1,                       // Posição no rack
  "name": "SW-CORE-01",             // Nome do dispositivo
  "brandModel": "Cisco Catalyst",   // Marca/modelo (opcional)
  "type": "switch",                 // Tipo: router|switch|patch|firewall|server|wifi|isp|router_wifi|others
  "status": "active",               // Status: active|disabled
  "addresses": [                    // Endereços (opcional)
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
- `rackId` - obrigatório
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
    connSort: {               // Ordenação da tabela
        key: 'id',
        asc: true
    },
    matrixLimit: 12,          // Limite de dispositivos na matriz
    matrixExpanded: false,    // Matriz expandida?
    rackColorMap: {}          // Cache de cores por rack
};
```

---

## 7. CONFIGURAÇÕES (config)

```javascript
var config = {
    connColors: {             // Cores por tipo de conexão
        lan: '#3b82f6',
        wan: '#ef4444',
        dmz: '#f97316',
        trunk: '#22c55e',
        management: '#8b5cf6',
        backup: '#eab308',
        fiber: '#06b6d4',
        other: '#6b7280'
    },
    connLabels: {...},        // Labels por tipo
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

**Projeto:** Tiesse Matrix Network  
**Versão:** 2.7.0  
**Repositório:** github.com/saltarecentanni/net

---

## 15. CHANGELOG

### v2.7.0 (Dezembro 2025)
- **Nova Aba Help:**
  - Guia completo passo a passo em inglês
  - Seções: Adding Devices, Creating Connections, Matrix, Edit/Delete, Export/Import
  - Explicação de cores e símbolos
  - FAQ com perguntas frequentes
  - Design responsivo e amigável

### v2.6.0 (Dezembro 2025)
- **Reorganização das Abas:**
  - Tab 1: Devices (mantido)
  - Tab 2: Active Connections (com formulário de conexões + lista)
  - Tab 3: Matrix (apenas matriz de conexões)
- Formulário de conexões movido para aba Active Connections
- Edit connection agora navega para aba Active Connections
- Links edit/delete funcionais em todas as abas
- Import/Export verificados e funcionais

### v2.5.2 (Dezembro 2025)
- **Matriz - Overhaul Visual:**
  - Headers horizontais: fundo escuro (#334155), borda colorida do rack
  - Headers verticais: fundo claro (#f1f5f9), borda colorida do rack
  - Número de posição em círculo (sem parênteses)
  - Portas estilizadas: portA (claro) ⟷ portB (escuro)
  - Cable ID usando createMarkerHtml() (consistente com Active Connections)
  - Células de conexão com sombra e bordas arredondadas
  - Controle de overflow para conteúdos extensos
- **Impressão corrigida:**
  - Badges de posição: fundo azul escuro (#1e40af) + texto branco
  - Portas claras: borda cinza + texto preto para visibilidade
  - Portas escuras: mantido fundo escuro + texto branco
  - Cable markers: borda preta garantida
  - Text-shadows removidos na impressão

### v2.5.1 (Dezembro 2025)
- Matriz visual melhorada:
  - Headers mostram: Rack (cor) + Nome + Posição (badge azul)
  - Células uniformes 85x70px
  - Fontes otimizadas (8px rack, 9px nome)
  - Badge com espaçamento adequado (margin-top: 5px, padding: 2px 6px)
- Correção de alinhamento entre headers e células
- Verificação de código (sem erros, sem duplicações)

### v2.5.0 (Dezembro 2025)
- Limpeza de arquivos desnecessários
- Documentação atualizada
- start-server.bat para Windows
- Validação robusta no import/export

### v2.4.0 (Dezembro 2025)
- Arquitetura modular (app.js + ui-updates.js)
- Sistema de Toast notifications
- Validação robusta no PHP
- Impressão melhorada
