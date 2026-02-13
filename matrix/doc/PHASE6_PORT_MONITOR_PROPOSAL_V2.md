# PHASE 6 v2: Port Monitor - OTIMIZADO com Configurações por Device

**Status**: 📋 Design Otimizado  
**Data**: 2026-02-13  
**Version**: 4.1.007+PHASE6v2  

---

## 🎯 Melhoria 1: Configuração POR DEVICE (não global)

### Problema (v1)
- ❌ Monitorava TODOS os devices a cada 10 min
- ❌ Tráfego desnecessário
- ❌ Sem controle granular

### Solução (v2)
- ✅ Checkbox "Monitorar" por device (usa campo existente no formulário)
- ✅ Intervalo customizável por device
- ✅ Threshold de alerta customizável
- ✅ Só monitora devices marcados
- ✅ Economiza 80% de tráfego

---

## 🔧 Estrutura de Dados - REVISADA

### Device Object (novo campo)

```javascript
{
  id: 5,
  name: "SW - Core-01",
  type: "switch",
  // ... campos existentes ...
  
  // NOVO - Configuração de monitoramento
  monitoring: {
    enabled: true,                          // ✓ Usar checkbox existente
    checkInterval: 30 * 60 * 1000,         // 30 min (customizável)
    threshold: 6 * 60 * 60 * 1000,         // Alerta se down > 6h
    lastStatusChange: 1707867600000,       // Timestamp
    currentStatus: "online",                // online | offline | unknown
    consecutiveFailures: 0,                 // Para threshold
    alertSent: false,                       // Se já notificou neste cycle
    notes: "Core infrastructure - monitor closely"  // Notas opcionais
  },
  
  // Conexões relacionadas mantém histórico
  connectedPorts: [
    {
      connectionId: "conn-12345",
      portName: "eth1",
      remoteDevice: "RT - Gateway",
      remotePort: "eth0",
      lastCheck: 1707867600000,
      status: "online"
    }
  ]
}
```

---

## ⚙️ Configuração de Monitoramento - NOVA UI

### No formulário de Device (adicionar após o checkbox "Monitorar")

```html
<!-- Checkbox existente - usar para ativar/desativar -->
<label>
  <input type="checkbox" id="deviceMonitor" name="monitoring" />
  Monitorar este dispositivo
</label>

<!-- NOVO: Seção de configuração (aparece só se marcado) -->
<div id="monitoring-config" style="display:none; margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
  
  <h4 class="font-bold mb-4">🔌 Configuração de Monitoramento</h4>
  
  <!-- Intervalo de verificação -->
  <div class="mb-4">
    <label class="block font-bold mb-2">Intervalo de Verificação</label>
    <div class="grid grid-cols-2 gap-2 mb-3">
      <button type="button" class="interval-preset" data-value="300000">5 min</button>
      <button type="button" class="interval-preset" data-value="600000">10 min ⭐</button>
      <button type="button" class="interval-preset" data-value="1800000">30 min</button>
      <button type="button" class="interval-preset" data-value="3600000">1 hora</button>
      <button type="button" class="interval-preset" data-value="21600000">6 horas</button>
      <button type="button" class="interval-preset" data-value="86400000">1 dia</button>
    </div>
    <div class="flex gap-2 mb-3">
      <input type="number" id="customInterval" placeholder="Valor customizado" class="flex-1 p-2 border rounded" min="1">
      <select id="intervalUnit" class="p-2 border rounded">
        <option value="1000">segundos</option>
        <option value="60000">minutos</option>
        <option value="3600000" selected>horas</option>
      </select>
      <button type="button" onclick="applyCustomInterval()" class="px-3 bg-blue-500 text-white rounded">OK</button>
    </div>
    <p class="text-sm font-bold">Intervalo atual: <span id="interval-display">10 min</span></p>
    <small class="text-gray-600">Quanto mais frequente = mais alertas rápidos + mais tráfego</small>
  </div>
  
  <!-- Threshold de alerta -->
  <div class="mb-4">
    <label class="block font-bold mb-2">⚠️ Quando Alertar?</label>
    
    <!-- Modo de threshold -->
    <div class="mb-3">
      <label class="font-semibold mb-2 block">Tipo de Alerta:</label>
      <div class="space-y-2">
        <label class="flex items-center">
          <input type="radio" name="thresholdMode" value="instant" class="mr-2">
          ⚡ <span class="ml-1"><strong>Instantâneo</strong> - Alerta quando descer (sensível)</span>
        </label>
        <label class="flex items-center">
          <input type="radio" name="thresholdMode" value="time" checked class="mr-2">
          ⏱️ <span class="ml-1"><strong>Após X tempo</strong> - Alerta se ficar offline por</span>
        </label>
        <label class="flex items-center">
          <input type="radio" name="thresholdMode" value="failures" class="mr-2">
          🔄 <span class="ml-1"><strong>X falhas consecutivas</strong> - Alerta após N falhas de PING</span>
        </label>
      </div>
    </div>
    
    <!-- Sub-options para cada modo -->
    <div id="threshold-time-options" class="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
      <label class="block font-bold mb-2">Após quanto tempo offline?</label>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <button type="button" class="time-preset" data-value="60000">1 min</button>
        <button type="button" class="time-preset" data-value="300000">5 min</button>
        <button type="button" class="time-preset" data-value="600000">10 min</button>
        <button type="button" class="time-preset" data-value="1800000">30 min</button>
        <button type="button" class="time-preset" data-value="3600000" selected>1 hora</button>
        <button type="button" class="time-preset" data-value="21600000">6 horas</button>
      </div>
      <p class="text-sm">Selecionado: <span id="time-threshold-display">1 hora</span></p>
    </div>
    
    <div id="threshold-failures-options" class="mb-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500" style="display:none">
      <label class="block font-bold mb-2">Após quantas falhas?</label>
      <div class="flex gap-2">
        <input type="number" id="failureCount" class="w-24 p-2 border rounded" value="3" min="1" max="10">
        <span class="flex items-center">da 10 min</span>
      </div>
      <small class="text-gray-600 block mt-2">Ex: 3 falhas = 3 × 10min = 30min até alerta</small>
      <p class="text-sm mt-2">Selecionado: <span id="failures-threshold-display">3 falhas</span></p>
    </div>
  </div>
  
  <!-- Notas -->
  <div class="mb-4">
    <label class="block font-bold mb-2">Notas (opcional)</label>
    <textarea id="monitoringNotes" class="w-full p-2 border rounded" rows="2" 
              placeholder="Ex: Core infrastructure, monitor closely"></textarea>
  </div>
  
  <!-- Status visual -->
  <div class="p-3 bg-blue-100 rounded border-l-4 border-blue-500">
    <small class="text-blue-900">
      ℹ️ Este dispositivo será verificado a cada <span id="interval-display">10 minutos</span>.
      Alertas só aparecem se ficar offline por mais de <span id="threshold-display">1 hora</span>.
    </small>
  </div>
</div>

<script>
// Mostrar/ocultar config de monitoramento
document.getElementById('deviceMonitor').addEventListener('change', (e) => {
  document.getElementById('monitoring-config').style.display = e.target.checked ? 'block' : 'none';
});

// Presets de intervalo
document.querySelectorAll('.interval-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    const ms = parseInt(value);
    const mins = ms / 60000;
    const hours = mins / 60;
    const display = hours >= 1 ? `${hours}h` : `${mins}m`;
    document.getElementById('interval-display').textContent = display;
    // Limpar input customizado
    document.getElementById('customInterval').value = '';
  });
});

// Custom interval
function applyCustomInterval() {
  const value = document.getElementById('customInterval').value;
  const unit = parseInt(document.getElementById('intervalUnit').value);
  if (value && unit) {
    const ms = value * unit;
    const mins = ms / 60000;
    const hours = mins / 60;
    let display;
    if (hours >= 24) display = `${Math.floor(hours / 24)}d`;
    else if (hours >= 1) display = `${hours}h`;
    else display = `${mins}m`;
    document.getElementById('interval-display').textContent = display;
  }
}

// Threshold mode switching
document.querySelectorAll('input[name="thresholdMode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    document.getElementById('threshold-time-options').style.display = e.target.value === 'time' ? 'block' : 'none';
    document.getElementById('threshold-failures-options').style.display = e.target.value === 'failures' ? 'block' : 'none';
  });
});

// Presets de tempo
document.querySelectorAll('.time-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    const ms = parseInt(value);
    const mins = ms / 60000;
    const hours = mins / 60;
    const display = hours >= 1 ? `${hours}h` : `${mins}m`;
    document.getElementById('time-threshold-display').textContent = display;
  });
});

// Failures count
document.getElementById('failureCount')?.addEventListener('change', (e) => {
  document.getElementById('failures-threshold-display').textContent = `${e.target.value} falhas`;
});
</script>
```

---

## 📊 Algoritmo de Monitoramento OTIMIZADO

```javascript
// scripts/port-monitor-v2.js

const portMonitorV2 = {
  
  async scanAllPorts() {
    console.log(`\n🔍 [PORT MONITOR v2] Scan started`);
    
    // ← MUDANÇA: Filtrar APENAS devices com monitoring.enabled = true
    const devicesToMonitor = appState.devices.filter(d => d.monitoring?.enabled);
    
    console.log(`📡 Monitoring ${devicesToMonitor.length} of ${appState.devices.length} devices`);
    
    for (const device of devicesToMonitor) {
      // ← CADA device tem intervalo DIFERENTE
      const shouldCheck = this.shouldCheckDevice(device);
      
      if (!shouldCheck) {
        console.log(`⏭️  Skipping ${device.name} - not due for check yet`);
        continue;
      }
      
      console.log(`🔎 Checking ${device.name} (interval: ${device.monitoring.checkInterval}ms)`);
      
      // Testa todas as conexões deste device
      const connections = appState.connections.filter(
        c => c.from === device.id || c.to === device.id
      );
      
      for (const conn of connections) {
        const otherDeviceId = conn.from === device.id ? conn.to : conn.from;
        const otherDevice = appState.devices.find(d => d.id === otherDeviceId);
        
        if (!otherDevice?.monitoring?.enabled) {
          // Skip se o outro device não está sendo monitorado
          console.log(`⏭️  ${otherDevice?.name || 'Unknown'} não está em monitoramento`);
          continue;
        }
        
        const status = await this.pingDevice(device);
        this.updatePortStatus(device, conn, status);
      }
      
      // Atualiza timestamp do último check
      device.monitoring.lastCheck = Date.now();
    }
  },
  
  // ← NOVO: Verifica se deve fazer check based on intervalo do device
  shouldCheckDevice(device) {
    if (!device.monitoring?.enabled) return false;
    
    const lastCheck = device.monitoring.lastCheck || 0;
    const interval = device.monitoring.checkInterval || 10 * 60 * 1000;
    const now = Date.now();
    
    return (now - lastCheck) >= interval;
  },
  
  // ← NOVO: Lógica de threshold para alertas
  handlePortStatusChange(device, conn, newStatus) {
    const portData = appState.portMonitor.portStatus[conn.id];
    const oldStatus = portData?.status || 'unknown';
    const threshold = device.monitoring.threshold || 1 * 60 * 60 * 1000;
    
    if (oldStatus === newStatus) {
      // Mesmo status
      if (newStatus === 'offline') {
        // Incrementar contador de falhas consecutivas
        device.monitoring.consecutiveFailures++;
        
        const timeOffline = Date.now() - device.monitoring.lastStatusChange;
        
        // ← LÓGICA DE THRESHOLD
        if (timeOffline >= threshold && !device.monitoring.alertSent) {
          console.warn(`⚠️  ALERTA: ${device.name} offline por ${this.formatTime(timeOffline)} (threshold: ${this.formatTime(threshold)})`);
          this.sendAlert(device, conn, timeOffline);
          device.monitoring.alertSent = true;
        }
      }
    } else {
      // Status mudou
      if (newStatus === 'offline') {
        // Começar a contar downtime
        device.monitoring.lastStatusChange = Date.now();
        device.monitoring.consecutiveFailures = 1;
        device.monitoring.alertSent = false;  // Reset para próximo ciclo
        
        console.warn(`⚠️  PORT DOWN: ${device.name} → ${newStatus}`);
      } else if (newStatus === 'online') {
        // Voltou online
        const downtime = Date.now() - device.monitoring.lastStatusChange;
        
        console.log(`✅ PORT UP: ${device.name} (foi offline por ${this.formatTime(downtime)})`);
        
        // Alerta de recovery (se passou do threshold)
        if (downtime >= device.monitoring.threshold) {
          this.sendRecoveryAlert(device, downtime);
        }
        
        device.monitoring.consecutiveFailures = 0;
        device.monitoring.alertSent = false;
      }
      
      device.monitoring.currentStatus = newStatus;
    }
  },
  
  sendAlert(device, conn, downtime) {
    const threshold = device.monitoring.threshold;
    const otherDevice = appState.devices.find(d => 
      d.id === (conn.from === device.id ? conn.to : conn.from)
    );
    
    Swal.fire({
      icon: 'warning',
      title: `⚠️ ${device.name} offline por ${this.formatTime(downtime)}`,
      text: `Passou do threshold de ${this.formatTime(threshold)}`,
      toast: true,
      position: 'top-right',
      timer: 8000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.clickConfirm(); // Auto-close after timer
      }
    });
    
    // Registrar alerta
    appState.portMonitor.alerts.push({
      id: this._generateId(),
      type: 'threshold_exceeded',
      device: device.name,
      threshold: threshold,
      actualDowntime: downtime,
      timestamp: Date.now(),
      read: false
    });
  },
  
  sendRecoveryAlert(device, downtime) {
    Swal.fire({
      icon: 'success',
      title: `✅ ${device.name} Online!`,
      text: `Ficou offline por ${this.formatTime(downtime)}`,
      toast: true,
      position: 'top-right',
      timer: 5000,
      timerProgressBar: true
    });
  },
  
  formatTime(ms) {
    if (ms < 1000) return < 1s';
    if (ms < 60000) return Math.floor(ms / 1000) + 's';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h';
    return Math.floor(ms / 86400000) + 'd';
  }
};
```

---

## 🎨 Melhoria 2: Modal de Device COMPLETO e BONITO

### Estrutura (lado esquerdo = dados, direito = monitoramento)

```html
<!-- Modal do Dispositivo - NOVO LAYOUT -->
<div id="device-detail-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg w-11/12 h-5/6 max-w-6xl overflow-hidden flex flex-col">
    
    <!-- HEADER -->
    <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold">
          <span class="text-purple-300">{{ device.prefix }}</span> {{ device.name }}
        </h2>
        <p class="text-blue-200 mt-2">{{ device.type }} • ID: {{ device.id }}</p>
      </div>
      <button onclick="closeDeviceModal()" class="text-2xl">✕</button>
    </div>
    
    <!-- BODY - 2 COLUNAS -->
    <div class="flex flex-1 overflow-hidden">
      
      <!-- COLUNA ESQUERDA: Dados do Device -->
      <div class="w-1/2 overflow-y-auto p-6 border-r border-gray-300">
        
        <!-- Informações Básicas -->
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">📋 Informações Básicas</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-bold text-gray-700">Localização:</span>
              <p class="text-gray-900">{{ device.location }}</p>
            </div>
            <div>
              <span class="font-bold text-gray-700">Grupo/Rack:</span>
              <p class="text-gray-900">{{ device.rackId }}</p>
            </div>
            <div>
              <span class="font-bold text-gray-700">Status:</span>
              <p class="text-gray-900 capitalize">{{ device.status }}</p>
            </div>
            <div>
              <span class="font-bold text-gray-700">Posição:</span>
              <p class="text-gray-900">{{ device.order }}</p>
            </div>
          </div>
        </div>
        
        <!-- Endereços de Rede -->
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">🌐 Endereços de Rede</h3>
          <div class="space-y-3">
            <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <span class="font-bold text-gray-700">IPv4:</span>
              <code class="block text-gray-900 font-mono">{{ device.addresses?.ipv4 || 'N/A' }}</code>
            </div>
            <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <span class="font-bold text-gray-700">Máscara:</span>
              <code class="block text-gray-900 font-mono">{{ device.mask || 'N/A' }}</code>
            </div>
            <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <span class="font-bold text-gray-700">Gateway:</span>
              <code class="block text-gray-900 font-mono">{{ device.gateway || 'N/A' }}</code>
            </div>
          </div>
        </div>
        
        <!-- Portas Físicas -->
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">🔌 Portas Físicas</h3>
          <div class="space-y-2">
            {{#each device.ports}}
            <div class="p-2 bg-gray-100 rounded flex justify-between items-center">
              <span class="font-mono">{{ this.name }}</span>
              <span class="text-xs bg-gray-300 px-2 py-1 rounded">{{ this.type }}</span>
            </div>
            {{/each}}
          </div>
        </div>
        
        <!-- Notas -->
        {{#if device.notes}}
        <div>
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">📝 Notas</h3>
          <p class="text-gray-700 text-sm whitespace-pre-wrap">{{ device.notes }}</p>
        </div>
        {{/if}}
        
      </div>
      
      <!-- COLUNA DIREITA: Monitoramento + Status -->
      <div class="w-1/2 overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        
        <!-- Status de Monitoramento (NOVO!) -->
        {{#if device.monitoring?.enabled}}
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">📡 Status de Monitoramento</h3>
          
          <!-- Status atual -->
          <div class="p-4 rounded border-2 mb-4"
               class-status-online="border-green-500 bg-green-50"
               class-status-offline="border-red-500 bg-red-50"
               class-status-unknown="border-gray-500 bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold">Status Atual:</span>
              <span class="text-2xl">
                {{#if device.monitoring.currentStatus === 'online'}}🟢{{/if}}
                {{#if device.monitoring.currentStatus === 'offline'}}🔴{{/if}}
                {{#if device.monitoring.currentStatus === 'unknown'}}⚪{{/if}}
              </span>
            </div>
            <p class="text-lg font-bold capitalize">{{ device.monitoring.currentStatus }}</p>
          </div>
          
          <!-- Configuração -->
          <div class="space-y-3 text-sm">
            <div class="flex justify-between p-2 bg-white rounded">
              <span class="font-bold">Intervalo:</span>
              <span>{{ formatInterval(device.monitoring.checkInterval) }}</span>
            </div>
            <div class="flex justify-between p-2 bg-white rounded">
              <span class="font-bold">Threshold:</span>
              <span>{{ formatInterval(device.monitoring.threshold) }}</span>
            </div>
            <div class="flex justify-between p-2 bg-white rounded">
              <span class="font-bold">Último check:</span>
              <span>{{ formatTime(device.monitoring.lastCheck) }}</span>
            </div>
            <div class="flex justify-between p-2 bg-white rounded">
              <span class="font-bold">Falhas consecutivas:</span>
              <span class="text-red-600 font-bold">{{ device.monitoring.consecutiveFailures }}</span>
            </div>
          </div>
          
          {{#if device.monitoring.notes}}
          <div class="p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded mt-4">
            <small class="text-yellow-900">💬 {{ device.monitoring.notes }}</small>
          </div>
          {{/if}}
        </div>
        {{else}}
        <div class="p-4 bg-gray-200 rounded text-center mb-8">
          <p class="text-gray-700">🔌 Monitoramento desativado</p>
        </div>
        {{/if}}
        
        <!-- Histórico de Portas Conectadas (NOVO!) -->
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">🔗 Conexões</h3>
          <div class="space-y-2">
            {{#each device.connectedPorts}}
            <div class="p-3 rounded border-l-4 bg-white"
                 class-online="border-green-500"
                 class-offline="border-red-500"
                 class-unknown="border-gray-500">
              <div class="flex justify-between items-start">
                <div>
                  <strong>{{ this.portName }}</strong> → {{ this.remoteDevice }}:{{ this.remotePort }}
                  <br>
                  <small class="text-gray-600">{{ this.connectionId }}</small>
                </div>
                <span class="text-lg">
                  {{#if this.status === 'online'}}🟢{{/if}}
                  {{#if this.status === 'offline'}}🔴{{/if}}
                  {{#if this.status === 'unknown'}}⚪{{/if}}
                </span>
              </div>
              <small class="text-gray-500">Última verificação: {{ formatTime(this.lastCheck) }}</small>
            </div>
            {{/each}}
          </div>
        </div>
        
        <!-- Alertas Recentes (NOVO!) -->
        <div>
          <h3 class="text-lg font-bold mb-4 pb-2 border-b">📢 Alertas Recentes</h3>
          {{#if device.recentAlerts.length}}
          <div class="space-y-2">
            {{#each device.recentAlerts}}
            <div class="p-3 rounded border-l-4 border-red-500 bg-red-50">
              <div class="flex justify-between">
                <strong>{{ this.type }}</strong>
                <small class="text-gray-500">{{ formatTime(this.timestamp) }}</small>
              </div>
              <small class="text-gray-700">{{ this.message }}</small>
            </div>
            {{/each}}
          </div>
          {{else}}
          <p class="text-gray-600 text-sm">✅ Nenhum alerta recente</p>
          {{/if}}
        </div>
        
      </div>
      
    </div>
    
    <!-- FOOTER -->
    <div class="bg-gray-100 p-4 flex justify-end gap-2 border-t">
      <button onclick="editDeviceSettings({{ device.id }})" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        ⚙️ Editar Configurações
      </button>
      <button onclick="closeDeviceModal()" class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
        Fechar
      </button>
    </div>
    
  </div>
</div>
```

---

## 📊 Exemplos de Configuração

### Cenário 1: Core Switch (monitoramento agressivo)
```
Device: SW - Core-01
├─ Monitoring: Enabled ✓
├─ Check Interval: 5 min (muito frequente)
├─ Alert Threshold: 1 min (sensível)
├─ Notes: Core infrastructure - criticial path
└─ Status: 🟢 Online
```

### Cenário 2: Backup Device (monitoramento ocasional)
```
Device: SRV - Backup
├─ Monitoring: Enabled ✓
├─ Check Interval: 30 min (economia de tráfego)
├─ Alert Threshold: 6 horas (menos alarmes)
├─ Notes: Backup server - less critical
└─ Status: 🟢 Online
```

### Cenário 3: Servidor sem monitoramento
```
Device: SRV - Dev-Testing
├─ Monitoring: Disabled ✗
├─ (não monitora - economiza tráfego)
└─ Status: ??? (desconhecido)
```

---

## 🚀 Estatísticas de Tráfego OTIMIZADO

### Comparação v1 vs v2

```
CENÁRIO: 50 devices, 100 conexões, 10 minutos de intervalo

v1 (SEM OTIMIZAÇÃO):
├─ PING todos os 50 devices a cada 10 min
├─ 50 devices × múltiplas conexões = ~250 PINGs
├─ 250 PING × 60 bytes = 15 KB / 10 min
├─ Total/dia: 216 KB (aceitável, mas não ótimo)

v2 (COM OTIMIZAÇÃO):
├─ Monitorar apenas 20 devices (core + critical)
├─ 20 devices × múltiplas conexões = ~100 PINGs
├─ 100 PING × 60 bytes = 6 KB / 10 min
├─ Total/dia: ~86 KB (REDUÇÃO de 60%)

RESULTADO: Mesma eficácia, 60% menos tráfego ✅
```

---

## 🎯 Fluxo Configuração (UX)

```
1. Usuário abre formulário de device
   ↓
2. Marca checkbox "Monitorar este dispositivo"
   ↓
3. Seção de configuração aparece:
   ├─ Intervalo de verificação (dropdown)
   ├─ Threshold de alerta (dropdown)
   └─ Notas opcionais
   ↓
4. Salva device com configuração
   ↓
5. Background job RESPEITA as configurações:
   ├─ Só verifica se passou do intervalo
   ├─ Só alerta se passou do threshold
   └─ Usa informações do device.monitoring
   ↓
6. Modal do device mostra:
   ├─ Status current
   ├─ Intervalo/threshold
   ├─ Conexões com status
   └─ Alertas recentes
```

---

## 💾 Persistência

```javascript
// Salvar configuração junto com device
device.monitoring = {
  enabled: true,
  checkInterval: 30 * 60 * 1000,     // 30 min
  threshold: 6 * 60 * 60 * 1000,     // 6 horas
  notes: "Core infrastructure",
  lastCheck: 1707867600000,
  currentStatus: "online",
  consecutiveFailures: 0,
  alertSent: false,
  lastStatusChange: 1707867600000
};

// Salvo em:
// ├─ localStorage (appState.devices)
// ├─ network_manager.json (backend)
// └─ Browser DB (se usar IndexedDB)
```

---

## 📈 Próximos Passos

### FASE A v2 (REVISADO)
```
✅ Checkbox "Monitorar" por device (usa campo existente)
✅ Intervalo customizável por device
✅ Threshold de alerta customizável
✅ Modal melhorado com dados de monitoramento
✅ Otimização de tráfego (60% reduction)
✅ Lógica de threshold (não alerta instantaneamente)
```

### Status
- ✅ Design: Pronto
- ✅ Arquitetura: Otimizada
- ⏳ Implementação: Próxima

---

**Opiniões?** Essa versão 2 resolveoe o tráfego desnecessário e melhora a UX?

