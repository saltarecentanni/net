# 📋 Sistema de Naming Padronizado - v4.1.006

## Visão Geral

O **Tiesse Matrix Network v4.1.006** implementa um sistema inteligente e consistente de naming para dispositivos de rede, garantindo:

- ✅ **Identificação visual única** - Prefixo em VIOLETA, Nome em PRETO
- ✅ **Auto-preenchimento inteligente** - Quando você escolhe o tipo, o hostname é auto-preenchido
- ✅ **Padronização em todo o sistema** - Aplicado em listas, tabelas, topologia, floorplan
- ✅ **Fácil parsing** - Nome facilmente separável do prefixo

---

## 🎯 Como Funciona

### 1. **Padrão de Naming**

Todos os dispositivos seguem o padrão:

```
PREFIX - CustomName
```

**Exemplos:**
- `PoE - Building A`
- `SW - Core-01` 
- `FW - Main Gateway`
- `SRV - Database-Primary`
- `RT - WAN-Gateway`

### 2. **Auto-Fill ao Adicionar Dispositivo**

**Antes (v4.1.005):**
- Usuário seleciona tipo → nada acontece
- Usuário digita manualmente o hostname

**Depois (v4.1.006):**
- Usuário seleciona tipo (ex: **PoE**) ↓
- Campo hostname auto-preenche com: `PoE - ` ↓
- Cursor posicionado para o usuário completar o nome ↓
- Usuário digita: `PoE - Building A` ✓

```javascript
// Fluxo no formulário:
1. Escolher tipo: "PoE" dropdown
2. onDeviceTypeChange() é acionado
3. deviceName.value = "PoE - "
4. Cursor movido para posição final
```

### 3. **Renderização Visual - Live Preview no Formulário**

Enquanto você preenche o formulário, uma **preview visual** mostra exatamente como o dispositivo será exibido:

```
📟 Hostname:
┌──────────────────────────────┐
│ POE - Main Building          │  ← Input do usuário
└──────────────────────────────┘

┌──────────────────────────────────┐
│ POE - Main Building              │  ← Preview (violet + black)
└──────────────────────────────────┘
```

**Como funciona:**
1. Usuário seleciona tipo → Input auto-preenche com "PREFIX - "
2. Usuário digita o nome customizado
3. Preview atualiza em TEMPO REAL mostrando:
   - Prefixo em **violeta (text-purple-600)**
   - Hyphen em **violeta**
   - Nome customizado em **preto (text-slate-900)**
4. Usuário vê exatamente como ficará em todo o sistema

**Exemplo:**
```
Seleciona: "PoE" → Input: "PoE - " → Digita: "PoE - Building A"
Preview mostra:
┌────────────────────────────────────┐
│ PoE - Building A                   │  (PoE violeta, "- Building A" preto)
└────────────────────────────────────┘
```

**Funciona com:**
- ✅ Todos os 24 prefixos built-in
- ✅ Prefixos customizados via Type Manager
- ✅ Atualiza ao digitar e ao mudar tipo
- ✅ Previne erros de naming antes de salvar

---

### 4. **Renderização Visual - Padronização em TODO o Sistema**

**POR TIPO:**
- **Prefixo (violet text-purple-600):** Identificador device type
- **Nome (black text-slate-800):** Texto customizável do usuário

**EXEMPLO HTML RENDERIZADO:**

```html
<span class="text-purple-600 font-bold">PoE</span> Building A
```

**Aplicado em:**
- ✓ Painel de Devices (Device List) — `getDeviceDisplayNameHtml()`
- ✓ Matriz de Conexões — `getDeviceDisplayNameHtml()`
- ✓ Topologia SVG — Nome + Prefix (texto)  
- ✓ Floorplan — Etiquetas de device
- ✓ Search/Filter — Display inteligente
- ✓ Tooltips — Info completa

---

## 🛠️ Stack Técnico

### Funções Principais

| Função | Propósito | Retorna |
|--------|----------|---------|
| `getDefaultPrefix(type)` | Obtém prefixo padrão do tipo | String (ex: "PoE") |
| `getDeviceDisplayName(device)` | Nome completo com prefixo | String (ex: "PoE Building A") |
| `getDeviceDisplayNameHtml(device)` | HTML formatado com cor | HTML (prefixo em violeta) |
| `getDeviceRawName(device)` | Apenas nome sem prefixo | String (ex: "Building A") |
| `onDeviceTypeChange()` | Handler de mudança de tipo | void (efeito: auto-fill) |
| `updateDeviceNamePreview()` | Atualiza preview visual em tempo real | void (efeito: atualiza preview) |

### Estrutura de Dados

```javascript
// Device object
{
  id: 1,
  name: "PoE - Building A",      // Concatenado: PREFIX + " - " + CustomName
  prefix: "PoE",                  // Extraído automaticamente
  type: "poe",                    // Tipo device (lowercase)
  ...
}
```

### Prefixos Padrões Disponíveis

```javascript
// Mapeamento Type → Prefix (alguns exemplos)
{
  'router': 'RT',
  'switch': 'SW', 
  'firewall': 'FW',
  'server': 'SRV',
  'poe': 'PoE',
  'wifi': 'AP',
  'patch': 'PP',
  'walljack': 'WJ',
  ...
}

// Usuários podem adicionar custom prefixes:
appState.customPrefixes = [
  { type: 'custom_type', code: 'CUSTOM' }
]
```

---

## 👁️ Exemplos Visuais

### Painel de Devices
```
┌─────────────────────────────────┐
│ SW - Core-01                    │  ← PoE em VIOLETA, "- Building A" em PRETO
│ [Rack Zone 1 - Pos 01] [Active] │
│ HPE Aruba 2930F                 │
│ 48 ports (24 used) | 12 conn.   │
└─────────────────────────────────┘
```

### Matriz de Conexões
```
FROM                TO
┌─────────────────┬──────────────┐
│ PoE Building A  │ SW Core-01   │  ← Prefixos côr violeta
│ eth1            │ eth24        │
│ eth2            │ eth23        │
└─────────────────┴──────────────┘
```

### Topologia/Floorplan
```
[Rack] ─── SW-Core-01 ───┬─── PoE-BuildingA
                         │
                         └─── FW-MainGateway
```

---

## 🎮 Usando na Prática

### Adicionar Novo Dispositivo

```
1. Clique "+ Add Device"
2. Escolha Type: "PoE" (dropdown)
   → Hostname auto-preenche: "PoE - "
3. Completa o nome: "PoE - Building A"
4. Preenche Brand/Model, Ports, etc
5. Clique "+ Add"
```

**Resultado:**
- Device salvo com `name: "PoE - Building A"`
- Exibido em todo o sistema com prefixo violeta

### Editar Nome Existente

```
1. Clique no device (Device Detail)
2. Edite o Hostname
3. Se mudar tipo, hostname pode ser re-preenchido
4. Salve
```

---

## 🔧 Desenvolvimento

### Para Desenvolvedores - Onde Renderizar Devices

**SEMPRE use `getDeviceDisplayNameHtml(device)` quando renderizar HTML:**

```javascript
// ❌ ERRADO - sem formatação
html += '<div>' + device.name + '</div>';

// ✅ CORRETO - com cores padronizadas
html += '<div>' + getDeviceDisplayNameHtml(device) + '</div>';
```

**Para lógica/tooltips, use `getDeviceDisplayName(device)`:**

```javascript
// Para texto simples em atributos
title="Device: " + getDeviceDisplayName(device)

// Para comparação/busca
if (getDeviceDisplayName(device).includes(query)) { ... }

// Para nome sem prefixo
var customName = getDeviceRawName(device);
```

### Adicionando Novo Prefixo Customizado

```javascript
// Via UI - Type Manager (ao vivo)
openTypeManager()  // SweetAlert2 dialog

// Via código
appState.customPrefixes.push({
  type: 'custom_new_type',
  code: 'NEWP',
  labelIt: 'Meu Tipo Custom'
});
```

---

## 📊 Compatibilidade & Novidades

**v4.1.006 - Novidades:**
- ✨ **Live Preview Visual** — Veja em tempo real como o prefixo e nome aparecem
- ✨ **Auto-fill Inteligente** — Hostname pré-preenchido ao escolher tipo
- ✨ **Custom Types** — Type Manager para adicionar tipos customizados com prefixos
- ✨ **XSS Protection** — HTML escapado para máxima segurança

**Compatibilidade:**
- ✅ Backward compatible com v4.1.001 e anteriores
- ✅ Import/Export preserva nomes completos
- ✅ Migração automática ao carregar dados antigos
- ✅ Funciona com tipos custom adicionados via Type Manager

---

## 🚀 Benefícios

| Benefício | Antes | Depois |
|-----------|-------|--------|
| **Identificação Rápida** | Memorizar tipos | Cores + código visual |
| **Entrada de Dados** | Digitar manualmente | Auto-preenche inteligente |
| **Consistência** | Nomes aleatórios | Padrão universal |
| **Busca/Filter** | Confuso | Prefixo bem separado |
| **Relatórios** | Difícil parsing | Nome estruturado |

---

## 📝 Notas

- Quando você muda o tipo, o prefixo NÃO muda automaticamente o name já salvo (safety)
- Prefixo violeta é aplicado apenas na exibição HTML, não muda os dados
- O sistema suporta mudança de prefixo via Type Manager sem perder dados
- Sempre use `getDeviceDisplayName*` functions - nunca concatene manualmente

---

**Desenvolvido por:** Rafael Russo  
**Versão:** 4.1.006  
**Data:** 13 February 2026
