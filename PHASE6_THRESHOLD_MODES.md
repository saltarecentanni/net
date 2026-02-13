# 🎯 PHASE 6 v2.1: Guia Completo de Threshold Modes

**Data**: 2026-02-13  
**Status**: ✅ Design + Implementação Completa

---

## 🔔 Os 3 Modos de Alerta Customizáveis

### Modo 1: ⚡ INSTANTÂNEO (0 delay)

**Quando usar**: Infraestrutura CRÍTICA que não pode ficar offline NEM UM SEGUNDO

**Lógica**:
```
Evento: Device vai offline
→ ⚡ ALERTA IMEDIATO (no próximo check)
```

**Exemplos**:
- Core switches
- Routers críticos
- Banco de dados principal
- VPN gateway

**Configuração**:
```javascript
device.monitoring = {
  enabled: true,
  checkInterval: 5 * 60 * 1000,        // 5 minutos
  thresholdMode: 'instant',            // ⚡ Sem delay
  notes: "Core path - critical"
}
```

**Resultado**:
```
14:00 → Device cai
14:01 → PING falha → ⚡ ALERTA (offline 1 minuto)
14:02 → Você já está ciente!
```

---

### Modo 2: 🕐 TEMPO (após X horas/minutos)

**Quando usar**: Servidores IMPORTANTES mas que podem ter GLITCHES de rede

**Lógica**:
```
Evento: Device vai offline
→ Esperando... expectando...
→ Após X minutos/horas → ⚠️ ALERTA
```

**Exemplos**:
- Servidores de banco de dados
- Servidores de aplicação
- Storages
- Servidores de backup

**Configuração**:
```javascript
device.monitoring = {
  enabled: true,
  checkInterval: 10 * 60 * 1000,       // 10 minutos
  thresholdMode: 'time',               // 🕐 Por tempo
  timeThreshold: 1 * 60 * 60 * 1000,   // 1 hora = alerta em 1h
  notes: "Database server"
}
```

**Resultado**:
```
14:00 → Device cai
14:10 → PING falha (1 falha) - SEM alerta ainda
14:20 → PING falha (2 falhas) - SEM alerta ainda
...
15:00 → PING falha + passou 1h → ⚠️ ALERTA!
15:10 → Você está ciente e pode investigar

Se é glitch (30 min):
14:00 → Device cai
14:30 → Device volta online
        ✅ RECUPERADO (foi offline 30 min, < 1h = SEM alerta)
```

**Presets Comuns**:
```
└─ 1 minuto   → Bem sensível, para mais checks
└─ 10 minutos → Padrão sensível
└─ 30 minutos → Moderado
└─ 1 hora     → Recomendado para DB
└─ 6 horas    → Relaxado, só para problemas sérios
└─ 24 horas   → Muito relaxado, problema persistente
```

---

### Modo 3: 🔄 FALHAS CONSECUTIVAS (após N falhas)

**Quando usar**: Quando você quer evitar FALSOS POSITIVOS mas quer detecção mais rápida

**Lógica**:
```
Evento: Device vai offline
→ 1ª falha (skip)
→ 2ª falha (skip)
→ 3ª falha → ⚠️ ALERTA (provável problema real)
```

**Exemplos**:
- Impressoras
- Switches secundários
- Servidores de desenvolvimento
- Dispositivos IoT

**Configuração**:
```javascript
device.monitoring = {
  enabled: true,
  checkInterval: 10 * 60 * 1000,       // 10 minutos
  thresholdMode: 'failures',           // 🔄 Por falhas
  failureThreshold: 3,                 // 3 falhas consecutivas
  notes: "Secondary switch"
}
```

**Resultado**:
```
14:00 → Device cai
14:10 → PING falha (1ª falha) - SEM alerta ainda
14:20 → PING falha (2ª falha) - SEM alerta ainda
14:30 → PING falha (3ª falha) → ⚠️ ALERTA! (offline ~30 min = 3 × 10 min)

Se é glitch (20 min):
14:00 → Device cai
14:10 → PING falha (1ª)
14:20 → Device volta online
        ✅ RECUPERADO (foi offline 20 min, só 2 falhas = SEM alerta)
```

**Cálculo de Tempo Real**:
```
Tempo até alerta = failureThreshold × checkInterval

Exemplos:
├─ 3 falhas × 10 min = 30 minutos até alerta
├─ 2 falhas × 5 min = 10 minutos até alerta
├─ 5 falhas × 30 min = 150 minutos até alerta
└─ 2 falhas × 1 hora = 2 horas até alerta
```

---

## 📊 Comparação dos 3 Modos

| Modo | Delay | Falsos Positivos | Detecção | Melhor Para |
|------|-------|------------------|----------|------------|
| ⚡ Instantâneo | 0 min | ⬆️⬆️ Altos | ⚡ Imediata | Crítico |
| 🕐 Tempo | 1h (custom) | ⬆️ Médios | 🟡 Moderada | DB/App |
| 🔄 Falhas | ~30 min | ⬇️ Baixos | 🟢 Boa | Backup/IoT |

---

## 🎯 Matriz de Decisão

### Pergunta 1: Quanto tempo pode ficar offline?
```
A. ZERO - não pode nem um segundo violar SLA
   → ⚡ INSTANTÂNEO

B. Alguns minutos - mas preciso evitar alarmes falsos
   → 🔄 FALHAS (2-3 falhas × intervalo curto)

C. Alguns minutos/horas - desde que ninguém reclame
   → 🕐 TEMPO (30 min a 6h)

D. Não é crítico, só avisar se tiver problema sério
   → 🕐 TEMPO (6-24h) ou 🔄 FALHAS (5+ falhas)
```

### Pergunta 2: Qual é a sua rede?
```
A. Rede muito instável, muitos glitches
   → 🔄 FALHAS ou 🕐 TEMPO (threshold maior)
   → Evita alarmes falsos

B. Rede estável, raramente tem glitches
   → ⚡ INSTANTÂNEO ou 🕐 TEMPO (threshold menor)
   → Detecção mais rápida

C. Não tenho certeza
   → 🕐 TEMPO (1h) é safest bet
```

---

## 🔧 Exemplos de Configuração Real

### Exemplo 1: Core Switch (CRÍTICO)
```javascript
{
  id: 1,
  name: "SW - Core-01",
  type: "switch",
  monitoring: {
    enabled: true,
    checkInterval: 5 * 60 * 1000,      // 5 minutos
    thresholdMode: 'instant',          // ⚡ Sem delay
    notes: "CRÍTICO - path crítico"
  }
}
```
**Uso**: Alerta em ~5 minutos + instantâneo  
**Tráfego**: ~5.8 MB/dia (mais frequente, mas crítico)

---

### Exemplo 2: Database Server (IMPORTANTE)
```javascript
{
  id: 25,
  name: "SRV - Database",
  type: "server",
  monitoring: {
    enabled: true,
    checkInterval: 10 * 60 * 1000,       // 10 minutos
    thresholdMode: 'time',              // 🕐 Por tempo
    timeThreshold: 1 * 60 * 60 * 1000,   // 1 hora
    notes: "Database - alerta se > 1h"
  }
}
```
**Uso**: Alerta se ficar offline > 1 hora  
**Tráfego**: ~2.16 MB/dia  
**Falsos Positivos**: Reduzidos (pode ser glitch de rede)

---

### Exemplo 3: Backup Server (SECUNDÁRIO)
```javascript
{
  id: 35,
  name: "SRV - Backup",
  type: "server",
  monitoring: {
    enabled: true,
    checkInterval: 10 * 60 * 1000,       // 10 minutos
    thresholdMode: 'failures',          // 🔄 Por falhas
    failureThreshold: 3,                // 3 falhas = ~30 min
    notes: "Backup - alerta se 3+ falhas"
  }
}
```
**Uso**: Alerta após ~30 minutos de falhas  
**Tráfego**: ~2.16 MB/dia  
**Falsos Positivos**: Muito reduzidos

---

### Exemplo 4: Secondary Switch
```javascript
{
  id: 45,
  name: "SW - Secondary-02",
  type: "switch",
  monitoring: {
    enabled: true,
    checkInterval: 30 * 60 * 1000,       // 30 minutos
    thresholdMode: 'failures',          // 🔄 Por falhas
    failureThreshold: 2,                // 2 falhas = ~1 hora
    notes: "Secondary - low priority"
  }
}
```
**Uso**: Alerta após ~1 hora de falhas  
**Tráfego**: ~0.72 MB/dia (muito economia!)  
**Falsos Positivos**: Praticamente zero

---

### Exemplo 5: IoT/Impressora (NÃO-CRÍTICO)
```javascript
{
  id: 55,
  name: "Printer-01",
  type: "printer",
  monitoring: {
    enabled: true,
    checkInterval: 24 * 60 * 60 * 1000,  // 1 dia
    thresholdMode: 'time',              // 🕐 Por tempo
    timeThreshold: 24 * 60 * 60 * 1000,  // 24 horas
    notes: "Impressora - alerta se 1+ dia"
  }
}
```
**Uso**: Alerta se ficar offline > 24h  
**Tráfego**: ~0.09 MB/dia (economia MÁXIMA)  
**Falsos Positivos**: Zero

---

## 📊 Estimativa de Tráfego por Modo

### Cenário: 50 devices, mix de confgs

```
10 × Core (5 min + instant)       = 5.8 MB/dia
15 × DB (10 min + 1h time)        = 3.2 MB/dia
15 × Backup (10 min + 3-fail)     = 3.2 MB/dia
10 × IoT (1 dia + 24h time)       = 0.9 MB/dia

TOTAL: ~13.1 MB/dia (vs 21.6 MB/dia sem otimização)
       ⬇️ 39% ECONOMIA
```

---

## 🚀 Como Implementar

### Passo 1: Definir o Modo no Formulário
```html
<div class="threshold-options">
  <label>
    <input type="radio" name="thresholdMode" value="instant">
    ⚡ Instantâneo (0 delay)
  </label>
  <label>
    <input type="radio" name="thresholdMode" value="time" checked>
    🕐 Após X tempo
  </label>
  <label>
    <input type="radio" name="thresholdMode" value="failures">
    🔄 Após X falhas
  </label>
</div>
```

### Passo 2: Mostrar Opções Contextuais
```javascript
document.querySelectorAll('input[name="thresholdMode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    // Mostrar/ocultar sub-options baseado na seleção
    showInstantOptions(e.target.value === 'instant');
    showTimeOptions(e.target.value === 'time');
    showFailuresOptions(e.target.value === 'failures');
  });
});
```

### Passo 3: Usar API
```javascript
// Configurar device com threshold por tempo
portMonitorV2.setDeviceMonitoring(5, true, {
  interval: 5 * 60 * 1000,
  thresholdMode: 'instant'
});

// Configurar device com threshold por tempo
portMonitorV2.setDeviceMonitoring(25, true, {
  interval: 10 * 60 * 1000,
  thresholdMode: 'time',
  timeThreshold: 1 * 60 * 60 * 1000
});

// Configurar device com threshold por falhas
portMonitorV2.setDeviceMonitoring(35, true, {
  interval: 10 * 60 * 1000,
  thresholdMode: 'failures',
  failureThreshold: 3
});
```

---

## ✅ Resumo

| Modo | Use Quando | Configuração | Tempo até Alerta |
|------|-----------|--------------|-----------------|
| ⚡ Instant | Crítico, zero tolerância | `thresholdMode: 'instant'` | ~0 min + next check |
| 🕐 Tempo | Importante, mas não urgente | `thresholdMode: 'time'`, `timeThreshold: 1h` | 1h (customizável) |
| 🔄 Falhas | Secundário, evitar falsos positivos | `thresholdMode: 'failures'`, `failureThreshold: 3` | ~30 min (customizável) |

---

**Está pronto para usar? Qual modo você prefere para cada tipo de device?** 🚀
