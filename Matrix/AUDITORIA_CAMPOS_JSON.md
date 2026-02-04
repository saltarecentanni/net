# 🔍 AUDITORIA MINUCIOSA: JSON vs FORMULÁRIOS

## 📊 ANÁLISE ESTRUTURAL

### DISPOSITIVOS (Device Object)

#### Campos encontrados no JSON:
```json
{
  "id": 1,                          ✓
  "rackId": "RACK-NETWORK-01",      ✓
  "rack": "RACK-NETWORK-01",        ⚠️ DUPLICADO
  "order": 1,                       ✓
  "isRear": false,                  ⚠️ DUPLICADO
  "rear": false,                    ⚠️ DUPLICADO
  "name": "...",                    ✓
  "brandModel": "...",              ✓
  "type": "router_wifi",            ✓
  "status": "active",               ✓
  "location": "Sala Server",        ✓
  "addresses": [...],               ✓
  "links": [...],                   ✓
  "service": "...",                 ✓
  "ports": [...],                   ✓
  "notes": "",                      ✓
  "_isExternal": false              ⚠️ CAMPO INTERNO
}
```

#### Verificação de Campos no Código:

**✅ CAMPOS USADOS (encontrados no código e formulários):**
- `id` → Identificador único
- `name` → Campo obrigatório no formulário
- `type` → Dropdown de tipo de dispositivo
- `status` → Dropdown (active/disabled)
- `location` → Dropdown de locação
- `brandModel` → Campo texto opcional
- `service` → Campo texto ("DHCP, DNS, Gateway")
- `notes` → Campo texto opcional
- `rackId` → Para gerenciamento de rack
- `order` → Ordem no rack
- `isRear` / `rear` → Checkbox "Device is rear"
- `addresses` → Array de IPs/VLANs
- `links` → Array de links (SSH, RDP, VNC, Telnet)
- `ports` → Array de portas

---

### 🚨 PROBLEMAS ENCONTRADOS

#### PROBLEMA 1: Campos Duplicados
```
❌ "rack" e "rackId" - AMBOS EXISTEM E SÃO IDÊNTICOS
❌ "isRear" e "rear" - AMBOS EXISTEM E SÃO IDÊNTICOS
```

**Impacto:** Redundância, confusão, consumo de espaço desnecessário

**Recomendação:** Manter apenas um:
- Usar `rackId` (mais descritivo)
- Usar `isRear` (padrão camelCase)

#### PROBLEMA 2: Campo Interno Exposto
```
❌ "_isExternal" - Campo interno (começa com _)
   Não aparece em nenhum formulário
   Usado apenas em lógica interna
```

**Impacto:** Potencial confusão sobre dados salvos

---

### CONEXÕES (Connection Object)

#### Campos encontrados no JSON:
```json
{
  "from": 2,                    ✓ ID do dispositivo origem
  "fromPort": "eth00",          ✓ Porta na origem
  "to": 10,                     ✓ ID do dispositivo destino
  "toPort": "eth15",            ✓ Porta no destino
  "externalDest": "",           ⚠️ Para conexões externas
  "isWallJack": false,          ✓ É saída na parede
  "type": "lan",                ✓ Tipo de conexão
  "color": "#3b82f6",           ✓ Cor da conexão
  "status": "active",           ✓ Status
  "cableMarker": "A2",          ✓ Marcador do cabo
  "cableColor": "#3b82f6",      ⚠️ DUPLICADO COM color
  "notes": ""                   ✓ Notas
}
```

#### 🚨 PROBLEMA: Campo Duplicado
```
❌ "color" e "cableColor" - AMBOS EXISTEM E SÃO IDÊNTICOS
```

**Impacto:** Redundância, risco de inconsistência

**Recomendação:** Manter apenas `color` (mais genérico)

---

### LOCAÇÕES (Location Object)

#### Campos encontrados no JSON:
```json
{
  "id": "loc-00",               ✓
  "siteId": "main",             ✓ Referência ao site
  "code": "00",                 ✓
  "name": "Sala Server",        ✓
  "type": "mapped",             ⚠️ Não visto em formulário
  "roomRef": "0",               ⚠️ Referência a sala
  "color": "#7c3aed"            ✓
}
```

**Status:** ✓ Sem problemas maiores

---

### SALAS (Room Object)

#### Campos encontrados no JSON:
```json
{
  "id": "1",                    ✓
  "name": "1",                  ⚠️ ID é nome da sala
  "nickname": "Amministrazione",✓ Nome real
  "type": "office",             ✓
  "area": 154806,               ✓ Área em pixels²
  "capacity": 10,               ⚠️ Capacidade (não visto em UI)
  "description": "1 - Mapeado", ✓
  "color": "rgba(...)",         ✓
  "polygon": [...],             ✓ Coordenadas do polígono
  "devices": [],                ✓ Array de dispositivos na sala
  "notes": "",                  ✓
  "floor": 0                    ✓ Andar
}
```

**Status:** ✓ Sem problemas maiores

---

### SITES (Site Object)

#### Campos encontrados no JSON:
```json
{
  "id": "main",                 ✓
  "name": "Sede Ivrea",         ✓
  "isDefault": true             ✓
}
```

**Status:** ✓ Sem problemas

---

## 🎯 RESUMO EXECUTIVO

### ✅ CAMPOS VÁLIDOS E USADOS
- Dispositivos: 17/17 campos (com 2 duplicatas)
- Conexões: 11/11 campos (com 1 duplicata)
- Locações: 7/7 campos ✓
- Salas: 10/10 campos ✓
- Sites: 3/3 campos ✓

### ❌ PROBLEMAS ENCONTRADOS

| Problema | Tipo | Impacto | Severidade |
|----------|------|---------|-----------|
| device.rack (duplica rackId) | Redundância | Confusão, consumo extra | 🟡 MÉDIA |
| device.isRear + device.rear | Redundância | Confusão, inconsistência | 🟡 MÉDIA |
| device._isExternal | Interno exposto | Confusão | 🟢 BAIXA |
| connection.cableColor (duplica color) | Redundância | Risco de inconsistência | 🟡 MÉDIA |

### 🔧 RECOMENDAÇÕES

#### LIMPEZA RECOMENDADA:

1. **Remover do JSON (ou nunca salvar):**
   - `device.rack` (usar apenas `rackId`)
   - `device.rear` (usar apenas `isRear`)
   - `connection.cableColor` (usar apenas `color`)
   - `device._isExternal` (campo interno, não deve estar no JSON)

2. **Validar na Importação:**
   - Se encontrar duplicatas, usar versão "correta"
   - Descartar campos duplicados

3. **Sanitizar na Exportação:**
   - Não incluir campos duplicados em backups
   - Documentar campos esperados

---

## 📋 CHECKLIST DETALHADO

### Dispositivos
- [x] `id` - ID único do dispositivo
- [x] `name` - Nome do dispositivo (obrigatório)
- [x] `type` - Tipo (router, switch, server, etc.)
- [x] `status` - Estado (active, disabled)
- [x] `location` - Localização física
- [x] `brandModel` - Marca e modelo (opcional)
- [x] `service` - Serviço/Função (opcional)
- [x] `rackId` - ID do Rack (para organização)
- [x] `order` - Posição no rack
- [x] `isRear` - Se está na parte traseira do rack
- [x] `addresses` - IPs e VLANs
- [x] `links` - Links de acesso (SSH, RDP, etc.)
- [x] `ports` - Portas físicas do dispositivo
- [x] `notes` - Notas adicionais
- ❌ `rack` - DUPLICADO, REMOVER
- ❌ `rear` - DUPLICADO, REMOVER
- ❌ `_isExternal` - INTERNO, REMOVER

### Conexões
- [x] `from` - ID do dispositivo origem
- [x] `fromPort` - Porta na origem
- [x] `to` - ID do dispositivo destino
- [x] `toPort` - Porta no destino
- [x] `type` - Tipo de conexão (lan, wan, trunk, wallport)
- [x] `status` - Estado da conexão
- [x] `color` - Cor visual
- [x] `cableMarker` - Marcador/Etiqueta do cabo
- [x] `notes` - Notas
- [x] `isWallJack` - Se é saída para parede
- [x] `externalDest` - Destino externo (para conexões externas)
- ❌ `cableColor` - DUPLICADO, REMOVER

### Locações
- [x] `id` - ID único
- [x] `siteId` - Referência ao site
- [x] `code` - Código (00, 01, 02...)
- [x] `name` - Nome da locação
- [x] `type` - Tipo (mapped, etc.)
- [x] `color` - Cor visual
- [x] `roomRef` - Referência à sala

### Salas
- [x] `id` - ID da sala
- [x] `nickname` - Nome da sala (exibição)
- [x] `name` - Nome/ID da sala
- [x] `type` - Tipo (office, storage, etc.)
- [x] `description` - Descrição
- [x] `area` - Área em pixels²
- [x] `color` - Cor do polígono
- [x] `polygon` - Coordenadas do desenho
- [x] `devices` - Dispositivos na sala
- [x] `notes` - Notas
- [x] `floor` - Andar
- [ ] `capacity` - Capacidade (não usado em UI)

### Sites
- [x] `id` - ID único
- [x] `name` - Nome do site
- [x] `isDefault` - Se é o site padrão

---

## ✅ CONCLUSÃO

**Status:** JSON tem alguns campos redundantes, mas NENHUM campo "lixo" real.

**Achados:**
- ✓ Todos os campos têm propósito
- ✓ Estrutura bem pensada
- ❌ 3-4 campos duplicados (redundância)
- ⚠️  1 campo interno exposto (_isExternal)

**Ação Recomendada:** 
Limpar duplicatas na próxima oportunidade para reduzir confusão e consumo de espaço.

