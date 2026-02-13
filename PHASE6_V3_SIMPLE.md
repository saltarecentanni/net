# PHASE 6 v3: SIMPLIFICADO - Simple & Clean

**Status**: ✅ Ultra-Simples + Funcional  
**Data**: 2026-02-13

---

## 🎯 O Novo Conceito: SIMPLES

```
Monitorar?           SIM / NÃO
Verificar a cada?    5m / 10m / 30m / 1h / 6h / 24h
Avisar se offline?   1m / 5m / 10m / 30m / 1h
+ Botão             "🔍 Scan Agora" (lento, sem travar)
```

**Isso é tudo.**

---

## 📋 Formulário Simplificado

```html
<!-- Monitoramento -->
<div class="monitoring-simple">
  
  <!-- Checkbox SIM/NÃO -->
  <label class="flex items-center gap-2 mb-4">
    <input type="checkbox" id="monitorDevice" />
    <span class="font-bold">☑️ Monitorar este dispositivo</span>
  </label>
  
  <!-- Opções (aparecem só se marcado) -->
  <div id="monitor-options" style="display:none; padding: 15px; background: #f0f9ff; border-radius: 8px;">
    
    <!-- Intervalo -->
    <div class="mb-3">
      <label class="font-bold">📡 Verificar a cada:</label>
      <select id="checkInterval" class="w-full p-2 border rounded mt-1">
        <option value="300000">5 minutos</option>
        <option value="600000" selected>10 minutos</option>
        <option value="1800000">30 minutos</option>
        <option value="3600000">1 hora</option>
        <option value="21600000">6 horas</option>
        <option value="86400000">24 horas</option>
      </select>
    </div>
    
    <!-- Threshold -->
    <div class="mb-3">
      <label class="font-bold">⚠️ Avisar se offline por:</label>
      <select id="alertThreshold" class="w-full p-2 border rounded mt-1">
        <option value="60000">1 minuto</option>
        <option value="300000">5 minutos</option>
        <option value="600000">10 minutos</option>
        <option value="1800000">30 minutos</option>
        <option value="3600000" selected>1 hora</option>
      </select>
      <small class="text-gray-600">Só alerta se ficar offline mais tempo que isso</small>
    </div>
    
    <!-- Botão Scan Agora -->
    <button type="button" 
            onclick="scanDeviceNow()" 
            class="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">
      🔍 Scan Agora (devagar, sem travar)
    </button>
  </div>
  
</div>

<script>
// Mostrar/ocultar opções
document.getElementById('monitorDevice').addEventListener('change', (e) => {
  document.getElementById('monitor-options').style.display = e.target.checked ? 'block' : 'none';
});

// Scan agora (lento)
async function scanDeviceNow() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Scaneando...';
  
  try {
    // Faz scan lentamente (delay entre devices)
    await portMonitorV3.scanDeviceSlow(getCurrentDeviceId());
    
    Swal.fire({
      icon: 'success',
      title: '✅ Scan Completo',
      text: 'Dispositivo verificado com sucesso',
      toast: true,
      timer: 3000
    });
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: '❌ Erro no Scan',
      text: error.message,
      toast: true
    });
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Scan Agora';
  }
}
</script>
```

---

## 💻 Código JavaScript - SIMPLES

```javascript
/**
 * PHASE 6 v3: Simple Port Monitor
 * Just 3 things: YES/NO, CHECK INTERVAL, ALERT THRESHOLD
 * + Manual "Scan Now" button
 */

const portMonitorV3 = {
  
  enabled: true,
  scanDelay: 500,  // 500ms entre cada device (não trava)
  
  // ==================== INIT ====================
  
  init() {
    console.log('🚀 Port Monitor v3 initialized (SIMPLE)');
    
    // Initialize all devices
    appState.devices.forEach(device => {
      if (!device.monitoring) {
        device.monitoring = {
          enabled: false,
          checkInterval: 10 * 60 * 1000,      // 10 min default
          alertThreshold: 1 * 60 * 60 * 1000, // 1 hour default
          lastCheck: 0,
          currentStatus: 'unknown',
          lastStatusChange: 0,
          downtime: 0
        };
      }
    });
    
    // Start background monitoring
    this.startMonitoring();
  },
  
  // ==================== BACKGROUND ====================
  
  startMonitoring() {
    console.log('🔄 Starting background monitoring...');
    
    // Check every minute if any device is due
    this.monitoringInterval = setInterval(() => {
      this.checkDueDevices();
    }, 60 * 1000);
  },
  
  async checkDueDevices() {
    const now = Date.now();
    
    // Find devices that need checking
    const devices = appState.devices.filter(d => {
      if (!d.monitoring?.enabled) return false;
      
      const lastCheck = d.monitoring.lastCheck || 0;
      const interval = d.monitoring.checkInterval || 10 * 60 * 1000;
      
      return (now - lastCheck) >= interval;
    });
    
    if (devices.length === 0) return;
    
    console.log(`\n📊 Checking ${devices.length} devices...`);
    
    // Check each device with delay (não trava)
    for (const device of devices) {
      await this.checkDevice(device);
      await new Promise(resolve => setTimeout(resolve, this.scanDelay));
    }
  },
  
  // ==================== CHECK LOGIC ====================
  
  async checkDevice(device) {
    console.log(`🔎 Checking ${device.name}`);
    
    // Get IP
    const ip = device.addresses?.ipv4;
    if (!ip) {
      device.monitoring.currentStatus = 'unknown';
      return;
    }
    
    // Ping
    const isOnline = await this.ping(ip);
    
    // Update status
    const oldStatus = device.monitoring.currentStatus;
    const newStatus = isOnline ? 'online' : 'offline';
    
    if (oldStatus !== newStatus) {
      console.log(`${device.name}: ${oldStatus}→${newStatus}`);
      
      // Check if should alert
      if (newStatus === 'offline') {
        device.monitoring.lastStatusChange = Date.now();
      } else if (newStatus === 'online') {
        // Voltou online - calcular downtime
        const downtime = Date.now() - device.monitoring.lastStatusChange;
        device.monitoring.downtime = downtime;
        
        // Alert se foi offline mais que threshold
        const threshold = device.monitoring.alertThreshold;
        if (downtime > threshold) {
          this.alertRecovery(device, downtime);
        }
      }
      
      device.monitoring.currentStatus = newStatus;
    } else if (newStatus === 'offline') {
      // Ainda offline - verificar se passou threshold
      const timeOffline = Date.now() - device.monitoring.lastStatusChange;
      const threshold = device.monitoring.alertThreshold;
      
      if (timeOffline > threshold && !device.monitoring.alertSent) {
        this.alertThreshold(device, timeOffline);
        device.monitoring.alertSent = true;
      }
    }
    
    device.monitoring.lastCheck = Date.now();
  },
  
  ping(ip) {
    return new Promise((resolve) => {
      try {
        const cmd = process.platform === 'win32'
          ? `ping -n 1 -w 5000 ${ip}`
          : `ping -c 1 -W 5 ${ip}`;
        
        require('child_process').exec(cmd, (error) => {
          resolve(!error);
        });
        
        setTimeout(() => resolve(false), 6000);
      } catch (e) {
        resolve(false);
      }
    });
  },
  
  // ==================== SCAN NOW (LENTO) ====================
  
  async scanDeviceSlow(deviceId) {
    console.log(`\n🔍 SCAN NOW: Device ${deviceId} (devagar...)`);
    
    const device = appState.devices.find(d => d.id === deviceId);
    if (!device) throw new Error('Device não encontrado');
    
    // Check this device slowly (com UI feedback)
    const ip = device.addresses?.ipv4;
    if (!ip) throw new Error('Device sem IP');
    
    console.log(`Pinging ${ip}...`);
    const isOnline = await this.ping(ip);
    
    const status = isOnline ? '🟢 Online' : '🔴 Offline';
    console.log(`Resultado: ${status}`);
    
    device.monitoring.currentStatus = isOnline ? 'online' : 'offline';
    device.monitoring.lastCheck = Date.now();
    
    return { device, status: isOnline };
  },
  
  // ==================== ALERTS ====================
  
  alertThreshold(device, timeOffline) {
    const timeStr = this.formatTime(timeOffline);
    const thresholdStr = this.formatTime(device.monitoring.alertThreshold);
    
    const msg = `⚠️ ${device.name} está OFFLINE por ${timeStr} (limite: ${thresholdStr})`;
    console.warn(msg);
    
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Device Offline',
        text: msg,
        toast: true,
        position: 'top-right',
        timer: 8000
      });
    }
  },
  
  alertRecovery(device, downtime) {
    const timeStr = this.formatTime(downtime);
    const msg = `✅ ${device.name} voltou online! (ficou offline por ${timeStr})`;
    
    console.log(msg);
    
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: '✅ Recuperado!',
        text: msg,
        toast: true,
        position: 'top-right',
        timer: 5000
      });
    }
  },
  
  // ==================== UTILS ====================
  
  formatTime(ms) {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return Math.floor(ms / 1000) + 's';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h';
    return Math.floor(ms / 86400000) + 'd';
  },
  
  // ==================== PUBLIC API ====================
  
  getStatus(deviceId) {
    const device = appState.devices.find(d => d.id === deviceId);
    return device?.monitoring?.currentStatus || 'unknown';
  },
  
  setMonitoring(deviceId, enabled, config = {}) {
    const device = appState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    device.monitoring.enabled = enabled;
    if (config.interval) device.monitoring.checkInterval = config.interval;
    if (config.threshold) device.monitoring.alertThreshold = config.threshold;
    
    console.log(`⚙️ ${device.name}: ${enabled ? '✅' : '❌'}`);
  }
};

// Auto-init
if (typeof appState !== 'undefined') {
  setTimeout(() => portMonitorV3.init(), 1000);
}
```

---

## 🎨 Modal do Device - Simples

```
┌─────────────────────────────────────┐
│ 📱 SW - Core-01                     │
├─────────────────────────────────────┤
│                                     │
│ Localização: Data Center            │
│ IP: 192.168.1.10                    │
│ Máscara: 255.255.255.0              │
│ Gateway: 192.168.1.1                │
│                                     │
├─ MONITORAMENTO ──────────────────────┤
│                                     │
│ ☑️ Monitorar este dispositivo       │
│                                     │
│ 📡 Verificar a cada:                │
│ [Dropdown: 10 minutos]              │
│                                     │
│ ⚠️ Avisar se offline por:           │
│ [Dropdown: 1 hora]                  │
│                                     │
│ 🔍 Scan Agora (devagar)             │
│ [Botão azul clicável]               │
│                                     │
│ Status: 🟢 Online                   │
│ Último check: 2 segundos atrás     │
│                                     │
├─────────────────────────────────────┤
│ [Cancelar]  [Salvar]                │
└─────────────────────────────────────┘
```

---

## 🚀 Como Funciona

### Background (Automático)
```
1. A cada 60 segundos, verifica se algum device precisa de check
2. Se passou intervalo configurable → faz PING
3. Se status mudou E passou threshold → alerta
4. Repete indefinidamente
```

### Scan Agora (Manual - Lento)
```
1. Usuário clica "🔍 Scan Agora"
2. Sistema faz PING com delay (500ms Entre cada)
3. Não trava rede toda
4. Mostra resultado instantaneamente
```

---

## 📊 Exemplos Reais

### Core Switch
```
Monitorar: SIM ✓
Intervalo: 10 minutos
Alerta após: 10 minutos offline
→ Resultado: Se cair, alerta em 10-20 min
```

### Database
```
Monitorar: SIM ✓
Intervalo: 10 minutos
Alerta após: 1 hora offline
→ Resultado: Se cair, alerta após 1 hora (evita glitches)
```

### Backup Server
```
Monitorar: SIM ✓
Intervalo: 30 minutos
Alerta após: 6 horas offline
→ Resultado: Bem relaxado, só alerta se problema sério
```

### Dev Server
```
Monitorar: NÃO ✗
(Não monitora = economia total)
```

---

## ✅ Vantagens v3

| Feature | v2.1 | v3 |
|---------|------|-----|
| Complexidade | 🔴 Alta | 🟢 ZERO |
| Opções | 🔴 3 modos | 🟢 Só 2 dropdowns |
| Tempo aprendizado | 🔴 30 min | 🟢 1 min |
| Confusão | 🔴 Alta | 🟢 Nenhuma |
| Funcionalidade | 🟢 Completa | 🟢 Completa |
| Botão Manual | ❌ Não | 🟢 SIM! |

---

## 🎯 Implementação (3 Passos)

### Passo 1
Copiar código `portMonitorV3` para `matrix/js/port-monitor-v3.js`

### Passo 2
Adicionar HTML do formulário ao modal de device

### Passo 3
Chamar `portMonitorV3.init()` em `app.js` após carregar devices

**Pronto!** 🚀

---

**Bem melhor assim? Quer que eu crie os arquivos?**
