# PHASE 6: Port Monitor - Proposta de Implementação

**Status**: 📋 Design Phase  
**Data**: 2026-02-13  
**Version**: 4.1.007  

---

## 🎯 Objetivo

Monitorar a **conectividade de portas** dos dispositivos cadastrados em tempo real, detectando quando uma porta fica offline (tipo cabo desconectado ou falha de rede), similar ao Uptime Kuma mas para portas de rede específicas.

---

## 📊 Arquitetura Proposta

### Níveis de Implementação

```
FASE A (SIMPLES - 1 semana)
├── Monitoramento por Ping (ICMP)
├── Detecção de online/offline
├── Alertas básicos no modal
└── Log de mudanças

FASE B (MÉDIO - 2 semanas)
├── Suporte a SNMP (portas de switch)
├── Configuração por device
├── Dashboard de status
└── Relatórios de uptime

FASE C (COMPLETO - 3+ semanas)
├── Alertas via email/webhook
├── Integração LibreNMS (opcional)
├── Histórico de eventos
└── SLA tracking
```

---

## 🔧 FASE A: Simple Port Monitor (RECOMENDADO - Começar por aqui)

### Conceito

```
Device "SW - Core-01" with IP: 192.168.1.10
├── Port eth1 (conectado a RT Gateway)
│   ├── Ping IP a cada 10 min → online/offline
│   ├── Status: 🟢 Online (verde)
│   └── Last check: agora
├── Port eth2 (conectado a SW Secondary)
│   ├── Ping IP a cada 10 min → online/offline
│   ├── Status: 🟢 Online
│   └── Last check: agora
└── Port eth5 (SFP fibra)
    ├── Ping IP a cada 10 min
    ├── Status: 🔴 Offline (ALERTA!)
    └── Desconectado há: 2 horas 15 min
```

### Como Funciona

```
CICLO A CADA 10 MINUTOS:

1. Node.js background job inicia
   ↓
2. Lê lista de conexões do appState.connections
   ↓
3. Para cada conexão com ambos endpoints:
   from: Device A (IP: 192.168.1.10)
   to:   Device B (IP: 192.168.1.20)
   ↓
4. Tenta PING to 192.168.1.10 + PING to 192.168.1.20
   ↓
5. Compara com status anterior:
   - Se passou de ONLINE → OFFLINE: ⚠️ ALERTA
   - Se passou de OFFLINE → ONLINE: ✅ RECOVERED
   - Se mantém: atualiza last_check
   ↓
6. Salva resultado em memory + localStorage
   ↓
7. Atualiza UI em tempo real (green/red badges)
```

### Estrutura de Dados

```javascript
// Novo objeto: appState.portMonitor
{
  lastScan: Date,
  scanInterval: 10 * 60 * 1000,  // 10 minutos
  
  portStatus: {
    "conn-12345": {
      from: { id: 5, name: "SW - Core-01", ip: "192.168.1.10" },
      to: { id: 8, name: "RT - Gateway", ip: "192.168.1.20" },
      
      status: "online",           // online | offline | unknown
      lastCheck: 1707867600000,   // timestamp
      lastStatusChange: 1707867500000,
      downTime: 0,                // ms offline
      alertSent: false,           // se já notificou
      
      // Histórico (últimos 7 dias)
      history: [
        { timestamp: ..., status: "online" },
        { timestamp: ..., status: "offline" },
        ...
      ]
    },
    // ... mais conexões
  }
}
```

### Métodos de Detecção (em ordem de preferência)

#### 1. **PING (ICMP)** — Recomendado para FASE A
```
✅ Pros:
- Funciona sem configuração extra
- Rápido (< 1s por device)
- Não precisa SNMP/credenciais
- Standard em qualquer rede

❌ Cons:
- Alguns firewalls bloqueiam ICMP
- Não distingue "porta desconectada" de "toda rede down"
- Menos preciso que SNMP

Implementação:
node -e "require('child_process').exec('ping -c 1 192.168.1.10', (err) => {if(!err) offline=false})"
```

#### 2. **ARP Lookup** — Complementar ao PING
```
Verificar se MAC address da porta responde em ARP
- Se responde: porto está conectado
- Se não responde: porto pode estar desconectado

Implementação:
ip neigh show | grep 192.168.1.10
```

#### 3. **SNMP (futura - FASE B)**
```
OID para estado de porta (IF-MIB):
ifOperStatus.1.1 = up (1) | down (2)
ifInErrors.1.1 = contador de erros

Mais preciso, mas precisa:
- SNMP community string configurado
- Acesso SNMP liberado no switch
```

#### 4. **TCP Port Check** — Fallback
```
Tentar conexão TCP na porta SSH/admin (22, 80, 443)
Se conecta: dispositivo está online
Se não conecta: dispositivo/porta offline
```

---

## 📋 Implementação FASE A: Pseudocódigo

### 1. Background Monitor Script

```javascript
// scripts/port-monitor.js

const portMonitor = {
  enabled: true,
  interval: 10 * 60 * 1000,  // 10 minutos
  timeout: 5 * 1000,          // 5 segundos timeout
  
  // Levanta a cada X minutos
  async startMonitoring() {
    setInterval(() => this.scanPorts(), this.interval);
  },
  
  // Verifica todas as portas
  async scanPorts() {
    const connections = appState.connections || [];
    
    for (const conn of connections) {
      if (!conn.from || !conn.to) continue;  // skip se não tem device
      
      const device1 = getDeviceById(conn.from);
      const device2 = getDeviceById(conn.to);
      
      if (!device1?.addresses?.ipv4 || !device2?.addresses?.ipv4) continue;
      
      // Check ambos devices
      const status1 = await this.pingDevice(device1, conn.fromPort);
      const status2 = await this.pingDevice(device2, conn.toPort);
      
      // Determina status da porta
      const portStatus = (status1 === "online" && status2 === "online") 
        ? "online" 
        : "offline";
      
      // Compara com anterior
      this.updatePortStatus(conn.id, portStatus, device1, device2);
    }
    
    // Salva pra UI
    savePortMonitorData();
  },
  
  // Ping um device
  async pingDevice(device, portName) {
    const ip = device.addresses?.ipv4;
    if (!ip) return "unknown";
    
    return new Promise((resolve) => {
      const cmd = process.platform === 'win32' 
        ? `ping -n 1 -w 1000 ${ip}`
        : `ping -c 1 -W 1000 ${ip}`;
      
      require('child_process').exec(cmd, (error) => {
        resolve(error ? "offline" : "online");
      });
    });
  },
  
  // Atualiza status
  updatePortStatus(connId, newStatus, device1, device2) {
    const portData = appState.portMonitor.portStatus[connId];
    const oldStatus = portData?.status || "unknown";
    
    // Mudança de estado
    if (oldStatus !== newStatus) {
      portData.lastStatusChange = now();
      
      // Alerta?
      if (newStatus === "offline") {
        this.alertPortDown(connId, device1, device2);
      } else if (newStatus === "online") {
        this.alertPortRecovered(connId, device1, device2);
      }
    }
    
    // Atualiza dados
    portData.status = newStatus;
    portData.lastCheck = now();
    portData.history.push({ timestamp: now(), status: newStatus });
  },
  
  // Notifica usuário
  alertPortDown(connId, device1, device2) {
    console.warn(`⚠️ PORT DOWN: ${device1.name}:${device1.fromPort} → ${device2.name}:${device2.toPort}`);
    
    // Salva em log
    appState.portMonitor.alerts.push({
      type: "port_down",
      connId: connId,
      timestamp: now(),
      devices: [device1.name, device2.name],
      read: false
    });
  },
  
  alertPortRecovered(connId, device1, device2) {
    console.log(`✅ PORT RECOVERED: ${device1.name} → ${device2.name}`);
    
    appState.portMonitor.alerts.push({
      type: "port_recovered",
      connId: connId,
      timestamp: now(),
      devices: [device1.name, device2.name],
      read: false
    });
  }
};

// Inicia ao carregar
portMonitor.startMonitoring();
```

### 2. Frontend - Nova Tab "Port Monitor"

```html
<!-- Tab 8: Port Monitor -->
<div class="tab-pane" id="port-monitor-tab">
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">🔌 Port Monitor</h1>
    
    <!-- Filtros -->
    <div class="mb-4 flex gap-2">
      <button onclick="filterPortStatus('all')" class="px-4 py-2 bg-blue-500 text-white rounded">
        All Ports
      </button>
      <button onclick="filterPortStatus('online')" class="px-4 py-2 bg-green-500 text-white rounded">
        🟢 Online
      </button>
      <button onclick="filterPortStatus('offline')" class="px-4 py-2 bg-red-500 text-white rounded">
        🔴 Offline
      </button>
    </div>
    
    <!-- Status de Portas -->
    <div id="port-list" class="space-y-2">
      <!-- Gerado dinamicamente -->
      <div class="flex items-center justify-between p-3 bg-gray-100 rounded border-l-4 border-green-500">
        <div>
          <strong>SW - Core-01</strong> eth1 → <strong>RT - Gateway</strong> eth0
          <br><small>192.168.1.10:eth1 ← → 192.168.1.20:eth0</small>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-green-600 font-bold">🟢 Online</span>
          <small class="text-gray-500">Last: just now</small>
        </div>
      </div>
      
      <div class="flex items-center justify-between p-3 bg-red-50 rounded border-l-4 border-red-500">
        <div>
          <strong>SRV - Database</strong> eth2 → <strong>NAS - Storage</strong> eth3
          <br><small>192.168.1.30:eth2 ← → 192.168.1.40:eth3</small>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-red-600 font-bold">🔴 Offline</span>
          <small class="text-gray-500">⏱️ 2h 15m DOWN</small>
          <button onclick="markPortIssue(this)" class="px-2 py-1 bg-yellow-500 text-white text-xs rounded">
            Mark Issue
          </button>
        </div>
      </div>
    </div>
    
    <!-- Alertas -->
    <h2 class="text-xl font-bold mt-8 mb-4">📢 Recent Alerts</h2>
    <div id="alert-list" class="space-y-2">
      <!-- Exemplo -->
      <div class="p-3 bg-red-100 border-l-4 border-red-500 rounded">
        <strong>⚠️ Port Down</strong> - 14:32
        <br>SW - Core-01 eth1 → RT - Gateway eth0
        <button onclick="dismissAlert(this)" class="float-right text-xs px-2 py-1 bg-red-500 text-white rounded">
          Dismiss
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3. Atualizar Modal de Device com Status

```javascript
// device-detail.js - Adicionar na modale:

function buildPortStatusInfo(device) {
  const connections = appState.connections.filter(
    c => c.from === device.id || c.to === device.id
  );
  
  let html = '<h4 class="font-bold mb-2">🔌 Connected Ports:</h4>';
  
  connections.forEach(conn => {
    const portData = appState.portMonitor.portStatus[conn.id];
    const status = portData?.status || "unknown";
    const color = status === "online" ? "🟢" : status === "offline" ? "🔴" : "⚪";
    
    const otherDevice = conn.from === device.id 
      ? getDeviceById(conn.to)
      : getDeviceById(conn.from);
    
    const port = conn.from === device.id ? conn.fromPort : conn.toPort;
    
    html += `
      <div class="flex justify-between items-center p-2 bg-gray-50 rounded border-l-4 
                  border-${status === 'online' ? 'green' : 'red'}-500">
        <span>${color} ${port} → ${otherDevice.name}</span>
        <small>${portData?.lastCheck ? formatTime(portData.lastCheck) : 'never'}</small>
      </div>
    `;
  });
  
  return html;
}
```

---

## ⚙️ Configuração Necessária

### 1. Enable/Disable no Settings

```javascript
// appState.config.portMonitor
{
  enabled: true,
  checkInterval: 10 * 60 * 1000,    // 10 min
  timeout: 5000,                     // 5 seg
  methods: {
    ping: true,                       // ✓
    snmp: false,                      // ← FASE B
    tcp: false,                       // ← FASE B
  },
  alerts: {
    desktop: true,                    // Toast notifications
    email: false,                     // ← FASE B
    webhook: null,                    // ← FASE B
  },
  retention: 7 * 24 * 60 * 60 * 1000 // Guardar 7 dias de histórico
}
```

### 2. Por Device: Ativar/Desativar Monitoramento

```javascript
// device.portMonitor
{
  enabled: true,
  method: "ping",          // "ping" | "snmp" | "tcp"
  snmpCommunity: "public", // ← para SNMP (FASE B)
  checkPorts: ["eth0", "eth1", "eth2"] // quais portas monitorar
}
```

---

## 📊 Métricas e Histórico

### Dados Armazenados

```javascript
portMonitor.portStatus[connId].history = [
  { timestamp: 1707867600000, status: "online" },
  { timestamp: 1707867660000, status: "online" },
  { timestamp: 1707868000000, status: "offline" },  // ← Mudança detectada
  { timestamp: 1707868060000, status: "offline" },
  { timestamp: 1707875000000, status: "online" },   // ← Recuperado
]

// Permite calcular:
- Uptime % (últimas 24h, 7d, 30d)
- Tempo total de downtime
- Horários comum de falha
- Dispositivos mais problemáticos
- SLA compliance (99%, 99.9%, etc)
```

---

## 🚨 Fluxo de Alertas

### Evento: Porta fica OFFLINE

```
1. Background scan detecta offline
   ↓
2. Registra em appState.portMonitor.alerts
   ↓
3. Push Toast Notification (desktop)
   ↓
4. Adiciona badge 🔴 na modale do device
   ↓
5. Tab "Port Monitor" marca como OFFLINE
   ↓
6. Log entry em // Logs tab
```

### Evento: Porta volta ONLINE

```
1. Background scan detecta recovery
   ↓
2. Toast "✅ Port Recovered"
   ↓
3. Remove badge 🔴
   ↓
4. Calcula downtime total
   ↓
5. Notificação de SLA impact (opcional)
```

---

## 🔄 Comparação com Alternativas

| Solução | Complexidade | Setup | Precisão | Recomendação |
|---------|-----------|-------|----------|---------------|
| **Ping Monitor** (nossa proposta) | 🟢 Baixa | 5 min | 80% | ✅ **COMECE AQUI** |
| **LibreNMS full** | 🔴 Muito alta | 2-3 dias | 95% | ❌ Overkill |
| **Uptime Kuma** | 🟡 Média | 1 dia | 85% | ⚠️ Integração extra |
| **SNMP direct** | 🟡 Média | 1-2 horas | 90% | ✅ Próximo passo |
| **Nagios/Zabbix** | 🔴 Muito alta | 3+ dias | 98% | ❌ Overkill |

---

## 🎯 Timeline Sugerido

### **SEMANA 1: FASE A** (Simple Ping Monitor)
- [ ] Implementar background job
- [ ] UI com status de portas
- [ ] Alertas Toast básicos
- [ ] Histórico em localStorage
- ⏱️ **Tempo**: 3-4 dias

### **SEMANA 2-3: FASE B** (Pro Features)
- [ ] Suporte a SNMP
- [ ] Dashboard com gráficos
- [ ] Alertas por email
- [ ] Relatórios de uptime
- ⏱️ **Tempo**: 5-7 dias

### **SEMANA 4+: FASE C** (Advanced)
- [ ] Integração LibreNMS (opcional)
- [ ] Escalabilidade (multi-site)
- [ ] SLA tracking
- [ ] Webhook integrations
- ⏱️ **Tempo**: aberto

---

## ❓ Perguntas & Respostas

**P: E se não consigo fazer ping (firewall bloqueou)?**
A: ImplementaMOS fallback para ARP lookup + TCP port check

**P: Quanto vai consumir de banda?**
A: Mínimo - ICMP ping é ~60 bytes, a cada 10 min = ~8.6 KB/dia por porta

**P: Preciso configurar SNMP?**
A: NÃO para FASE A. SNMP é FASE B - Ping funciona sem configuração.

**P: Como integrar com LibreNMS?**
A: Na FASE C, podemos exportar dados via HTTP POST para LibreNMS API

**P: E alertas por email?**
A: FASE B - Pode usar sendgrid ou nodemailer

**P: Funciona com VPN/sites remotos?**
A: Sim - Ping funciona em qualquer rede IP

---

## 📝 Próximas Etapas

1. **Validar arquitetura** - Você concorda com a abordagem Ping + background job?
2. **Definir intervalo** - Quer 5 min, 10 min ou 15 min entre scans?
3. **Alertas** - Toast notifications é suficiente ou quer email desde já?
4. **Data retention** - 7 dias de histórico é bom ou quer mais/menos?

---

**Status do Projeto**: v4.1.007 Production Ready  
**Próxima Fase**: PHASE 6 Port Monitor  
**Complexidade**: 🟢 Low (para FASE A)  
**ROI**: 🔥 Alto - Detecta falhas antes do usuário perceber  

---

**Quer que eu comece a implementar FASE A? 🚀**
