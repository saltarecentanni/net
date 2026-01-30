# 🏢 Estrutura de Dados das Salas (Rooms)

## Estrutura Completa de uma Sala

Cada sala no Floor Plan possui a seguinte estrutura de dados:

```json
{
  "id": "room-001",                    // ID único da sala (formato: room-XXX)
  "name": "Server Room",               // Nome da sala
  "type": "server",                    // Tipo de sala (ver tipos abaixo)
  "area": 25,                          // Área em m² (opcional)
  "capacity": 8,                       // Capacidade de dispositivos
  "description": "Sala de servidores principal com racks e equipamentos de rede",
  "color": "rgba(239,68,68,0.15)",    // Cor da sala no SVG (semi-transparente)
  "polygon": [                         // Coordenadas do polígono da sala no SVG
    {"x": 50, "y": 50},
    {"x": 150, "y": 50},
    {"x": 150, "y": 150},
    {"x": 50, "y": 150}
  ],
  "devices": [1, 2, 3, 4, 5],         // Array de IDs dos dispositivos nesta sala
  "notes": "Temperatura controlada, acesso restrito",
  "floor": 0                           // Andar da sala (0=térreo, 1=primeiro, etc)
}
```

## Tipos de Salas (Room Types)

| Tipo | Descrição | Cor Padrão |
|------|-----------|------------|
| `server` | Sala de servidores | Vermelho (`rgba(239,68,68,0.15)`) |
| `office` | Escritório | Azul (`rgba(59,130,246,0.15)`) |
| `storage` | Almoxarifado | Verde (`rgba(34,197,94,0.15)`) |
| `meeting` | Sala de reunião | Roxo (`rgba(168,85,247,0.15)`) |
| `production` | Área de produção | Laranja (`rgba(249,115,22,0.15)`) |
| `datacenter` | Data Center | Vermelho escuro (`rgba(185,28,28,0.15)`) |
| `network` | Sala de rede | Ciano (`rgba(6,182,212,0.15)`) |
| `other` | Outro | Cinza (`rgba(107,114,128,0.15)`) |

## Exemplo: Sala Server (Sala 0)

### Dados JSON
```json
{
  "id": "room-001",
  "name": "Server Room",
  "type": "server",
  "area": 25,
  "capacity": 8,
  "description": "Sala de servidores principal com racks e equipamentos de rede",
  "color": "rgba(239,68,68,0.15)",
  "polygon": [
    {"x": 50, "y": 50},
    {"x": 150, "y": 50},
    {"x": 150, "y": 150},
    {"x": 50, "y": 150}
  ],
  "devices": [1, 2, 3, 4, 5],
  "notes": "Temperatura controlada, acesso restrito",
  "floor": 0
}
```

### Como as Informações Aparecem

#### Na Lista de Salas:
```
📍 Server Room
   Tipo: server
   Dispositivos: 5
```

#### No Painel de Informações (ao clicar na sala):
```
═══════════════════════════════════════
🏢 Server Room
═══════════════════════════════════════

📌 Tipo: server
📏 Área: 25 m²
👥 Capacidade: 8 dispositivos
📝 Descrição: Sala de servidores principal 
              com racks e equipamentos de rede
🔢 Andar: Térreo (0)

───────────────────────────────────────
💻 Dispositivos nesta Sala (5):
───────────────────────────────────────
• Tiesse-Wifi (Router WiFi)
• Switch-Core-01 (Switch)
• Firewall-01 (Firewall)
• Server-DB-01 (Server)
• Switch-Access-02 (Switch)

───────────────────────────────────────
📋 Notas:
───────────────────────────────────────
Temperatura controlada, acesso restrito
```

#### No SVG (Planta Baixa):
- Polígono vermelho semi-transparente sobreposto na área da sala
- Label "Server Room" no centro
- Ícone 💻 com número "5" indicando quantidade de dispositivos
- Efeito hover: destaque amarelo ao passar o mouse
- Click: seleciona e exibe informações no painel lateral

## Como Obter as Coordenadas do Polígono

Para definir o polígono de uma sala na planta SVG:

1. **Abra a planta**: Visualize o arquivo `assets/plant.svg` ou use a aba Floor Plan
2. **Identifique a sala**: Localize visualmente os limites da sala
3. **Determine os pontos**: Anote as coordenadas X,Y dos vértices do polígono
   - O SVG tem viewBox `0 0 735 599` (largura x altura)
   - Coordenadas começam no canto superior esquerdo (0,0)
4. **Lista os pontos**: Crie o array `polygon` com os pontos em sequência (sentido horário ou anti-horário)

### Exemplo: Sala Retangular
```
Canto superior esquerdo:  x=100, y=50
Canto superior direito:   x=200, y=50
Canto inferior direito:   x=200, y=150
Canto inferior esquerdo:  x=100, y=150

Polígono:
[
  {"x": 100, "y": 50},
  {"x": 200, "y": 50},
  {"x": 200, "y": 150},
  {"x": 100, "y": 150}
]
```

### Exemplo: Sala em Forma de L
```
Ponto 1: x=50,  y=50
Ponto 2: x=150, y=50
Ponto 3: x=150, y=100
Ponto 4: x=100, y=100
Ponto 5: x=100, y=150
Ponto 6: x=50,  y=150

Polígono:
[
  {"x": 50, "y": 50},
  {"x": 150, "y": 50},
  {"x": 150, "y": 100},
  {"x": 100, "y": 100},
  {"x": 100, "y": 150},
  {"x": 50, "y": 150}
]
```

## Atribuindo Dispositivos às Salas

### Método 1: Edição Manual do JSON
Adicione o ID do dispositivo no array `devices`:
```json
"devices": [1, 2, 3, 4, 5]
```

### Método 2: Interface (Futuro)
- Modo de edição ativado
- Arrastar dispositivo da lista para a sala no SVG
- Click duplo no dispositivo para atribuir manualmente

## Integração com Dispositivos

Os IDs no array `devices` correspondem aos dispositivos em `network_manager.json`:

```json
{
  "devices": [
    {
      "id": 1,                          // ← Este ID
      "name": "Tiesse-Wifi",
      "type": "router_wifi",
      ...
    }
  ],
  "rooms": [
    {
      "id": "room-001",
      "devices": [1, 2, 3]              // ← Referência aqui
    }
  ]
}
```

## Estatísticas Calculadas

O sistema calcula automaticamente:
- **Total de Salas**: Quantidade de salas cadastradas
- **Dispositivos Atribuídos**: Soma de todos os dispositivos em todas as salas
- **Utilização**: Porcentagem de dispositivos atribuídos vs. total
- **Salas por Tipo**: Agrupamento por categoria

## Exemplo Completo: 3 Salas

```json
{
  "devices": [ /* ... dispositivos ... */ ],
  "connections": [ /* ... conexões ... */ ],
  "rooms": [
    {
      "id": "room-001",
      "name": "Server Room",
      "type": "server",
      "area": 25,
      "capacity": 8,
      "description": "Sala principal de servidores",
      "color": "rgba(239,68,68,0.15)",
      "polygon": [
        {"x": 50, "y": 50},
        {"x": 150, "y": 50},
        {"x": 150, "y": 150},
        {"x": 50, "y": 150}
      ],
      "devices": [1, 2, 3, 4, 5],
      "notes": "Temperatura controlada",
      "floor": 0
    },
    {
      "id": "room-002",
      "name": "Network Closet",
      "type": "network",
      "area": 12,
      "capacity": 5,
      "description": "Closet de rede com switches de acesso",
      "color": "rgba(6,182,212,0.15)",
      "polygon": [
        {"x": 200, "y": 50},
        {"x": 280, "y": 50},
        {"x": 280, "y": 120},
        {"x": 200, "y": 120}
      ],
      "devices": [10, 11, 12],
      "notes": "",
      "floor": 0
    },
    {
      "id": "room-003",
      "name": "Office 1",
      "type": "office",
      "area": 30,
      "capacity": 10,
      "description": "Escritório principal",
      "color": "rgba(59,130,246,0.15)",
      "polygon": [
        {"x": 300, "y": 50},
        {"x": 450, "y": 50},
        {"x": 450, "y": 200},
        {"x": 300, "y": 200}
      ],
      "devices": [20, 21, 22, 23, 24, 25],
      "notes": "6 estações de trabalho",
      "floor": 0
    }
  ]
}
```

## Funções Disponíveis no FloorPlan.js

### Carregar Salas
```javascript
FloorPlan.init(); // Carrega salas de appState.rooms
```

### Adicionar Sala
```javascript
// Via interface: botão "➕ Add Room"
// Ou programaticamente:
rooms.push({
  id: "room-" + Date.now(),
  name: "Nova Sala",
  type: "office",
  polygon: [],
  devices: []
});
```

### Editar Sala
```javascript
// Via interface: click no ícone ✏️ ao lado da sala
// Ou programaticamente:
var room = rooms.find(r => r.id === "room-001");
room.name = "Novo Nome";
room.devices.push(10); // Adiciona dispositivo ID 10
```

### Remover Sala
```javascript
// Via interface: botão "🗑️ Delete" no painel de informações
// Ou programaticamente:
rooms = rooms.filter(r => r.id !== "room-001");
```

### Salvar Alterações
```javascript
FloorPlan.saveRoomsData(); // Salva no appState e chama save()
```

## Validação de Dados

Campos obrigatórios:
- ✅ `id` (string, formato "room-XXX")
- ✅ `name` (string, não vazio)
- ✅ `type` (string, um dos tipos válidos)
- ✅ `polygon` (array de {x, y}, mínimo 3 pontos)

Campos opcionais:
- `area` (number)
- `capacity` (number)
- `description` (string)
- `color` (string, formato RGBA)
- `devices` (array de numbers)
- `notes` (string)
- `floor` (number, default: 0)

---

**Última atualização**: 30/01/2026  
**Versão**: 3.4.0  
**Autor**: TIESSE Matrix Network Team
