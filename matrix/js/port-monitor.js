/**
 * PORT MONITOR - PHASE 6 IMPLEMENTATION
 * Background job para monitorar conectividade de portas
 * 
 * Arquivo: js/port-monitor.js
 * Status: Template inicial (pode ser adaptado e melhorado)
 * 
 * COMO USAR:
 * 1. Copiar este arquivo para js/port-monitor.js
 * 2. Adicionar no index.html: <script src="js/port-monitor.js"></script>
 * 3. Chamar portMonitor.init() no app.js após carregar dados
 * 4. Acessar dados via appState.portMonitor
 */

const portMonitor = {
  // ============ CONFIG ============
  enabled: true,
  checkInterval: 10 * 60 * 1000,  // 10 minutos
  timeout: 5 * 1000,               // 5 segundos timeout per ping
  maxHistoryDays: 7,
  
  // ============ STATE ============
  isRunning: false,
  lastScan: null,
  scanInProgress: false,
  
  // ============ INIT ============
  init() {
    console.log('🔌 Port Monitor initialized');
    
    // Inicializa appState.portMonitor se não existir
    if (!appState.portMonitor) {
      appState.portMonitor = {
        enabled: true,
        portStatus: {},      // {connId: {status, lastCheck, history, ...}}
        alerts: [],          // Alertas recentes
        stats: {
          totalPorts: 0,
          onlinePorts: 0,
          offlinePorts: 0,
          unknownPorts: 0
        }
      };
    }
    
    // Começa monitoramento
    if (this.enabled) {
      this.startMonitoring();
      console.log(`✅ Port Monitor: scanning every ${this.checkInterval / 1000 / 60} minutes`);
    }
  },
  
  // ============ MONITORING ============
  startMonitoring() {
    // Executa primeira scan imediatamente
    this.scanAllPorts();
    
    // Depois repete a cada interval
    setInterval(() => {
      if (this.enabled && !this.scanInProgress) {
        this.scanAllPorts();
      }
    }, this.checkInterval);
  },
  
  // Verifica todas as conexões
  async scanAllPorts() {
    if (this.scanInProgress) return;
    this.scanInProgress = true;
    
    try {
      console.log(`\n🔍 [PORT MONITOR] Scan started at ${new Date().toLocaleTimeString()}`);
      const connections = appState.connections || [];
      
      for (const conn of connections) {
        // Pula se não tem ambos devices
        if (!conn.from || !conn.to || !conn.fromPort || !conn.toPort) continue;
        
        const device1 = this._getDevice(conn.from);
        const device2 = this._getDevice(conn.to);
        
        if (!device1 || !device2) continue;
        
        // Verifica conectividade
        await this.checkConnection(conn, device1, device2);
      }
      
      // Atualiza stats
      this._updateStats();
      this.lastScan = new Date();
      
      // Salva em localStorage
      this._saveToStorage();
      
      console.log(`✅ [PORT MONITOR] Scan completed. ${appState.portMonitor.stats.onlinePorts} online, ${appState.portMonitor.stats.offlinePorts} offline`);
    } catch (error) {
      console.error('❌ Port Monitor error:', error);
    } finally {
      this.scanInProgress = false;
    }
  },
  
  // Verifica uma conexão específica
  async checkConnection(conn, device1, device2) {
    const connId = conn.id;
    
    // Inicializa se não existe
    if (!appState.portMonitor.portStatus[connId]) {
      appState.portMonitor.portStatus[connId] = {
        from: { id: device1.id, name: device1.name, ip: device1.addresses?.ipv4 },
        to: { id: device2.id, name: device2.name, ip: device2.addresses?.ipv4 },
        fromPort: conn.fromPort,
        toPort: conn.toPort,
        status: 'unknown',
        lastCheck: null,
        lastStatusChange: null,
        downTime: 0,
        alertSent: false,
        history: []
      };
    }
    
    const portData = appState.portMonitor.portStatus[connId];
    const oldStatus = portData.status;
    
    // Obtém IPs
    const ip1 = device1.addresses?.ipv4;
    const ip2 = device2.addresses?.ipv4;
    
    if (!ip1 || !ip2) {
      portData.status = 'unknown';
      console.log(`  ⚪ ${device1.name}:${conn.fromPort} → ${device2.name}:${conn.toPort} - NO IP`);
      return;
    }
    
    // Faz ping em ambos os IPs
    const ping1 = await this.ping(ip1);
    const ping2 = await this.ping(ip2);
    
    // Determina status
    const newStatus = (ping1 && ping2) ? 'online' : 'offline';
    
    // Atualiza dados
    portData.status = newStatus;
    portData.lastCheck = Date.now();
    
    // Detecta mudança de estado
    if (oldStatus !== newStatus && oldStatus !== 'unknown') {
      portData.lastStatusChange = Date.now();
      
      if (newStatus === 'offline') {
        this._handlePortDown(connId, portData);
      } else if (newStatus === 'online') {
        this._handlePortRecovered(connId, portData);
      }
    }
    
    // Adiciona ao histórico
    portData.history.push({
      timestamp: Date.now(),
      status: newStatus,
      ping1,
      ping2
    });
    
    // Limpa histórico antigo (7 dias)
    const maxAge = this.maxHistoryDays * 24 * 60 * 60 * 1000;
    portData.history = portData.history.filter(h => (Date.now() - h.timestamp) < maxAge);
    
    // Log
    const icon = newStatus === 'online' ? '🟢' : '🔴';
    const detail = `${device1.name}:${conn.fromPort} → ${device2.name}:${conn.toPort}`;
    console.log(`  ${icon} ${detail} (${newStatus})`);
  },
  
  // ============ PING ============
  ping(ip) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), this.timeout);
      
      // Escolhe comando baseado no S.O.
      const cmd = process.platform === 'win32'
        ? `ping -n 1 -w ${this.timeout} ${ip}`
        : `ping -c 1 -W ${Math.floor(this.timeout / 1000)} ${ip}`;
      
      try {
        require('child_process').exec(cmd, (error) => {
          clearTimeout(timeout);
          resolve(!error);  // true se sucesso, false se erro
        });
      } catch (e) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  },
  
  // ============ ALERTS ============
  _handlePortDown(connId, portData) {
    console.warn(`⚠️  PORT DOWN: ${portData.from.name} → ${portData.to.name}`);
    
    // Registra alerta
    const alert = {
      id: this._generateId(),
      type: 'port_down',
      connId: connId,
      timestamp: Date.now(),
      devices: [portData.from.name, portData.to.name],
      ports: [`${portData.fromPort}`, `${portData.toPort}`],
      read: false
    };
    
    appState.portMonitor.alerts.push(alert);
    
    // Toast notification (se disponível)
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: '🔴 Port Down!',
        text: `${portData.from.name}:${portData.fromPort} → ${portData.to.name}:${portData.toPort}`,
        toast: true,
        position: 'bottom-right',
        timer: 5000,
        timerProgressBar: true
      });
    }
    
    // Nota: Email e webhooks podem ser adicionados na FASE B
  },
  
  _handlePortRecovered(connId, portData) {
    console.log(`✅  PORT RECOVERED: ${portData.from.name} → ${portData.to.name}`);
    
    // Calcula downtime
    if (portData.lastStatusChange) {
      const downtime = Date.now() - portData.lastStatusChange;
      portData.downTime = downtime;
    }
    
    // Registra alerta positivo
    const alert = {
      id: this._generateId(),
      type: 'port_recovered',
      connId: connId,
      timestamp: Date.now(),
      devices: [portData.from.name, portData.to.name],
      ports: [`${portData.fromPort}`, `${portData.toPort}`],
      downtime: portData.downTime,
      read: false
    };
    
    appState.portMonitor.alerts.push(alert);
    
    // Toast notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: '🟢 Port Recovered!',
        text: `${portData.from.name}:${portData.fromPort} was down for ${this._formatTime(portData.downTime)}`,
        toast: true,
        position: 'bottom-right',
        timer: 3000,
        timerProgressBar: true
      });
    }
  },
  
  // ============ STATS ============
  _updateStats() {
    const stats = {
      totalPorts: 0,
      onlinePorts: 0,
      offlinePorts: 0,
      unknownPorts: 0
    };
    
    for (const connId in appState.portMonitor.portStatus) {
      const port = appState.portMonitor.portStatus[connId];
      stats.totalPorts++;
      
      if (port.status === 'online') stats.onlinePorts++;
      else if (port.status === 'offline') stats.offlinePorts++;
      else stats.unknownPorts++;
    }
    
    appState.portMonitor.stats = stats;
    
    // Calcula uptime percentage
    if (stats.totalPorts > 0) {
      const uptime = (stats.onlinePorts / stats.totalPorts * 100).toFixed(2);
      appState.portMonitor.stats.uptime = uptime;
    }
  },
  
  // ============ STORAGE ============
  _saveToStorage() {
    try {
      localStorage.setItem('portMonitorData', JSON.stringify(appState.portMonitor));
    } catch (e) {
      // localStorage pode estar cheio ou desabilitado
      console.warn('Could not save to localStorage:', e);
    }
  },
  
  loadFromStorage() {
    try {
      const data = localStorage.getItem('portMonitorData');
      if (data) {
        appState.portMonitor = JSON.parse(data);
        console.log('✅ Loaded port monitor data from storage');
        return true;
      }
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
    }
    return false;
  },
  
  // ============ HELPERS ============
  _getDevice(deviceId) {
    return appState.devices?.find(d => d.id === deviceId);
  },
  
  _generateId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  _formatTime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  },
  
  // ============ PUBLIC API ============
  getPortStatus(connId) {
    return appState.portMonitor?.portStatus[connId];
  },
  
  getAllPortStatus() {
    return appState.portMonitor?.portStatus || {};
  },
  
  getAlerts() {
    return appState.portMonitor?.alerts || [];
  },
  
  getStats() {
    return appState.portMonitor?.stats || {};
  },
  
  dismissAlert(alertId) {
    const alert = appState.portMonitor.alerts.find(a => a.id === alertId);
    if (alert) alert.read = true;
  },
  
  // Enable/disable monitoramento
  toggle(enabled) {
    this.enabled = enabled;
    if (enabled && !this.isRunning) {
      this.startMonitoring();
    }
    console.log(`Port Monitor ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
};

// Inicializa quando o documento carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => portMonitor.init());
} else {
  portMonitor.init();
}
