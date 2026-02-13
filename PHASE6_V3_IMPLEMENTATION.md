# 🚀 PHASE 6 v3: Guia de Implementação Simples

**Data**: 2026-02-13  
**Tempo estimado**: 30 minutos  
**Complexidade**: ⬇️ MUITO SIMPLES

---

## 📋 O Que Fazer

### Passo 1: Copiar Arquivo JavaScript (2 min)
```
Arquivo: matrix/js/port-monitor-v3.js
✅ Já criado e pronto!
```

### Passo 2: Adicionar ao index.html (2 min)

No `matrix/index.html`, procure por `</body>` e adicione ANTES:

```html
<!-- Port Monitor v3 -->
<script src="js/port-monitor-v3.js"></script>
```

### Passo 3: Inicializar em app.js (2 min)

Abra `matrix/js/app.js` e procure por onde carregar os devices. Após isso, adicione:

```javascript
// Initialize Port Monitor
portMonitorV3.init();
console.log('✅ Port Monitor v3 started');
```

### Passo 4: Adicionar HTML do Formulário (10 min)

Essa é a parte que aparece quando você clica em um device para abrir o modal.

Procure no código onde está o modal de device (provavelmente em `deviceDetailsModal`) e adicione:

```html
<!-- ==================== MONITORAMENTO ==================== -->

<div class="border-t pt-4 mt-4">
  <h3 class="text-lg font-bold mb-3">📡 Monitoramento de Conexão</h3>
  
  <!-- Enable/Disable -->
  <label class="flex items-center gap-2 mb-4 cursor-pointer">
    <input  type="checkbox" 
            id="monitorDevice" 
            onchange="toggleMonitorOptions()"
            class="w-4 h-4" />
    <span class="font-bold">☑️ Monitorar este dispositivo</span>
  </label>
  
  <!-- Options (hidden by default) -->
  <div id="monitor-options" 
       style="display:none;" 
       class="pl-6 space-y-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
    
    <!-- Intervalo -->
    <div>
      <label class="font-semibold block mb-1">📡 Verificar a cada:</label>
      <select id="checkInterval" class="w-full p-2 border rounded text-sm">
        <option value="300000">5 minutos</option>
        <option value="600000" selected>10 minutos</option>
        <option value="1800000">30 minutos</option>
        <option value="3600000">1 hora</option>
        <option value="21600000">6 horas</option>
        <option value="86400000">24 horas</option>
      </select>
    </div>
    
    <!-- Threshold -->
    <div>
      <label class="font-semibold block mb-1">⚠️ Avisar se offline por:</label>
      <select id="alertThreshold" class="w-full p-2 border rounded text-sm">
        <option value="60000">1 minuto</option>
        <option value="300000">5 minutos</option>
        <option value="600000">10 minutos</option>
        <option value="1800000">30 minutos</option>
        <option value="3600000" selected>1 hora</option>
      </select>
      <small class="text-gray-600 block mt-1">
        Só alerta se ficar offline MAIS tempo que isso
      </small>
    </div>
    
    <!-- Scan Now Button -->
    <button type="button" 
            onclick="scanDeviceNow(currentDeviceId)" 
            class="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 text-sm">
      🔍 Scan Agora (devagar, sem travar rede)
    </button>
    
    <!-- Status -->
    <div class="p-2 bg-white rounded border text-xs">
      <div class="flex justify-between">
        <span class="font-semibold">Status Atual:</span>
        <span id="deviceStatusDisplay">⚪ Unknown</span>
      </div>
      <div class="flex justify-between">
        <span class="font-semibold">Último Check:</span>
        <span id="deviceLastCheckDisplay">Nunca</span>
      </div>
    </div>
  </div>
</div>

<!-- ==================== SCRIPTS ==================== -->

<script>
// Guardar ID do device atual para usar em funções
let currentDeviceId = null;

// Mostrar/ocultar opções de monitoramento
function toggleMonitorOptions() {
  const checkbox = document.getElementById('monitorDevice');
  const options = document.getElementById('monitor-options');
  
  if (checkbox.checked) {
    options.style.display = 'block';
  } else {
    options.style.display = 'none';
  }
}

// Scan device agora (lentamente)
async function scanDeviceNow(deviceId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Scaneando...';
  
  try {
    const result = await portMonitorV3.scanDeviceNow(deviceId);
    
    const status = result.status === 'online' ? '🟢 Online' : '🔴 Offline';
    
    Swal.fire({
      icon: result.status === 'online' ? 'success' : 'warning',
      title: '✅ Scan Completo',
      text: `${result.name}\n${status}`,
      toast: true,
      position: 'top-right',
      timer: 4000
    });
    
    // Atualizar display de status
    document.getElementById('deviceStatusDisplay').textContent = status;
    document.getElementById('deviceLastCheckDisplay').textContent = 
      new Date().toLocaleTimeString();
    
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: '❌ Erro',
      text: error.message,
      toast: true,
      position: 'top-right'
    });
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Scan Agora (devagar, sem travar rede)';
  }
}

// Atualizar display de status quando modal abre
function updateMonitoringDisplay(deviceId) {
  const device = appState.devices.find(d => d.id === deviceId);
  if (!device || !device.monitoring) return;
  
  // Checkbox
  document.getElementById('monitorDevice').checked = device.monitoring.enabled;
  
  // Selects
  document.getElementById('checkInterval').value = device.monitoring.checkInterval;
  document.getElementById('alertThreshold').value = device.monitoring.alertThreshold;
  
  // Status display
  const statusMap = {
    'online': '🟢 Online',
    'offline': '🔴 Offline',
    'unknown': '⚪ Desconhecido'
  };
  
  document.getElementById('deviceStatusDisplay').textContent = 
    statusMap[device.monitoring.currentStatus] || '⚪ Desconhecido';
  
  document.getElementById('deviceLastCheckDisplay').textContent = 
    device.monitoring.lastCheck > 0 
      ? new Date(device.monitoring.lastCheck).toLocaleTimeString()
      : 'Nunca';
  
  // Show/hide options
  toggleMonitorOptions();
}

// Salvar configurações quando fecha modal
function saveMonitoringConfig(deviceId) {
  const enabled = document.getElementById('monitorDevice').checked;
  const interval = parseInt(document.getElementById('checkInterval').value);
  const threshold = parseInt(document.getElementById('alertThreshold').value);
  
  portMonitorV3.setMonitoring(deviceId, enabled, {
    interval: interval,
    threshold: threshold
  });
  
  console.log(`✅ Monitoring config saved for device ${deviceId}`);
}
</script>
```

### Passo 5: Conectar ao Modal (5 min)

Quando você **ABRE** um modal de device, chame:
```javascript
currentDeviceId = deviceId;
updateMonitoringDisplay(deviceId);
```

Quando você **FECHA** o modal, chame:
```javascript
saveMonitoringConfig(currentDeviceId);
```

---

## 💻 Código de Teste (Opcional)

Copie e cole no **Console do Browser** para testar:

```javascript
// Ver resumo
portMonitorV3.debug();

// Fazer scan manual de um device
await portMonitorV3.scanDeviceNow(1);
// ou
await portMonitorV3.scanAllNow();

// Ver todos os status
portMonitorV3.getAllStatus();

// Ver alertas recentes
portMonitorV3.getRecentAlerts();

// Ver overview
portMonitorV3.getOverview();
```

---

## 📊 Fluxo de UX

### 1. Device Modal Abre
```
→ updateMonitoringDisplay(deviceId) 
  → Carrega config do device
  → Mostra checkbox e opções
```

### 2. Usuário Marca "Monitorar"
```
→ toggleMonitorOptions() 
  → Mostra intervalo + threshold
```

### 3. Usuário Escolhe Intervalo e Threshold
```
→ Dropdown values salvos em HTML
```

### 4. Usuário Clica "🔍 Scan Agora"
```
→ scanDeviceNow(deviceId)
  → Chama portMonitorV3.scanDeviceNow()
  → Faz PING lentamente
  → Mostra resultado em toast
  → Atualiza display de status
```

### 5. Usuário Fecha Modal
```
→ saveMonitoringConfig(currentDeviceId)
  → Chama portMonitorV3.setMonitoring()
  → Salva config no device
```

### 6. Background Loop
```
A cada 60 segundos:
→ portMonitorV3.checkDueDevices()
  → Verifica quais devices precisam de check
  → Faz PING em cada um (com delay de 500ms)
  → Se offline > threshold → ALERTA
  → Se voltou online → ALERTA DE RECUPERAÇÃO
```

---

## 🔧 Browser Console - Comandos Úteis

```javascript
// Ver o que tá acontecendo
portMonitorV3.debug();

// Scan um device agora
await portMonitorV3.scanDeviceNow(1);

// Scan TODOS os devices
await portMonitorV3.scanAllNow();

// Ativar monitoramento para device 1
portMonitorV3.setMonitoring(1, true, {
  interval: 10 * 60 * 1000,      // 10 min
  threshold: 1 * 60 * 60 * 1000   // 1 hora
});

// Ver status de um device
portMonitorV3.getStatus(1);

// Ver todos os status
portMonitorV3.getAllStatus();

// Ver alertas
portMonitorV3.getRecentAlerts();

// Ver resumo geral
portMonitorV3.getOverview();
```

---

## ✅ Checklist de Implementação

- [ ] Copiar arquivo `matrix/js/port-monitor-v3.js`
- [ ] Adicionar `<script>` ao `index.html`
- [ ] Chamar `portMonitorV3.init()` em `app.js`
- [ ] Adicionar HTML do formulário ao modal
- [ ] Conectar `updateMonitoringDisplay()` quando modal abre
- [ ] Conectar `saveMonitoringConfig()` quando modal fecha
- [ ] Testar no console com `portMonitorV3.debug()`
- [ ] Testar "Scan Agora" button
- [ ] Testar alertas

---

## 🐛 Troubleshooting

**Problema**: "portMonitorV3 is not defined"  
**Solução**: Verifique se `<script src="js/port-monitor-v3.js"></script>` está no index.html

**Problema**: "scanDeviceNow is not a function"  
**Solução**: A função não está no escopo global. Mude para `portMonitorV3.scanDeviceNow()`

**Problema**: Rede travando durante scan  
**Solução**: Reduza `scanDelay` em port-monitor-v3.js se < 500ms, ou aumente para > 500ms

**Problema**: Alertas não aparecem  
**Solução**: Verifique se `Swal` está carregado (SweetAlert2)

---

## 🎯 Resumo

| Item | Complexidade | Tempo |
|------|-------------|-------|
| Copiar arquivo JS | ⬇️ Nada | 1 min |
| index.html | ⬇️ Nada | 1 min |
| app.js | ⬇️ Nada | 1 min |
| HTML Formulário | 🟡 Médio | 10 min |
| Conectar funções | 🟡 Médio | 10 min |
| Testar | 🟢 Fácil | 5 min |
| **TOTAL** | | **30 min** |

---

**Pronto para implementar?** 🚀
