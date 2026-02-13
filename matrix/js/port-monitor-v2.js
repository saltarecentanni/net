/**
 * PHASE 6 v2: Port Monitor - OPTIMIZED VERSION
 * 
 * Features:
 * - Per-device monitoring configuration
 * - Customizable check intervals
 * - Customizable alert thresholds
 * - Traffic optimization (only monitors enabled devices)
 * - Threshold-based alerts (don't alert immediately)
 * 
 * @version 2.0.0
 * @author Tiesse Matrix Team
 * @date 2026-02-13
 */

const portMonitorV2 = {
  
  // ==================== CONFIGURATION ====================
  
  enabled: true,
  globalTimeout: 5 * 1000,              // 5 seconds per PING
  lastScanTime: 0,
  scanQueue: [],                        // Devices to scan
  
  // ==================== INITIALIZATION ====================
  
  init() {
    console.log('🚀 [PORT MONITOR v2] Initializing...');
    
    // Initialize appState.portMonitor if not exists
    if (!appState.portMonitor) {
      appState.portMonitor = {
        portStatus: {},
        alerts: [],
        stats: {
          totalMonitored: 0,
          online: 0,
          offline: 0,
          unknown: 0,
          uptime: '99.9%'
        },
        version: '2.0.0'
      };
    }
    
    // Initialize device.monitoring for all devices
    appState.devices.forEach(device => {
      if (!device.monitoring) {
        device.monitoring = {
          enabled: false,
          checkInterval: 10 * 60 * 1000,      // Default: 10 min
          threshold: 1 * 60 * 60 * 1000,      // Default: 1 hour
          notes: '',
          lastCheck: 0,
          currentStatus: 'unknown',
          consecutiveFailures: 0,
          alertSent: false,
          lastStatusChange: 0
        };
      }
    });
    
    console.log('✅ Port Monitor v2 initialized');
    console.log(`📡 Devices to monitor: ${appState.devices.filter(d => d.monitoring?.enabled).length}`);
    
    this.startMonitoring();
  },
  
  // ==================== MAIN LOOP ====================
  
  startMonitoring() {
    console.log('🔄 Starting background monitoring loop...');
    
    // First scan immediately
    this.scan();
    
    // Then repeat at configurable intervals
    // Use shorter interval for scheduler, respect per-device intervals
    this.monitoringInterval = setInterval(() => {
      this.scan();
    }, 60 * 1000);  // Check every minute if any device is due
    
    console.log('✅ Monitoring loop started (checks every 60s)');
  },
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⛔ Monitoring loop stopped');
    }
  },
  
  // ==================== SCANNING LOGIC ====================
  
  async scan() {
    const now = Date.now();
    
    // Get devices that should be scanned right now
    const devicesToCheck = this.getDevicesDueForCheck();
    
    if (devicesToCheck.length === 0) {
      // No devices to check yet, just update UI
      this.updateMonitoringUI();
      return;
    }
    
    console.log(`\n📊 [SCAN] ${new Date(now).toLocaleTimeString()} - Checking ${devicesToCheck.length} devices`);
    
    // Scan all due devices in parallel
    const scanPromises = devicesToCheck.map(device => 
      this.scanDevice(device)
    );
    
    await Promise.all(scanPromises);
    
    // Update UI
    this.updateMonitoringUI();
  },
  
  /**
   * Get devices that are due for monitoring check
   * Based on their individual intervals
   */
  getDevicesDueForCheck() {
    const now = Date.now();
    
    return appState.devices.filter(device => {
      // Skip if monitoring disabled
      if (!device.monitoring?.enabled) {
        return false;
      }
      
      // Check if enough time has passed since last check
      const lastCheck = device.monitoring.lastCheck || 0;
      const interval = device.monitoring.checkInterval || 10 * 60 * 1000;
      
      return (now - lastCheck) >= interval;
    });
  },
  
  /**
   * Scan a single device
   * Tests all its connections
   */
  async scanDevice(device) {
    console.log(`  🔎 Scanning ${device.name} [${device.id}]`);
    
    try {
      // Get device IP
      const deviceIp = device.addresses?.ipv4;
      if (!deviceIp) {
        console.warn(`  ⚠️  No IP address for ${device.name}`);
        device.monitoring.currentStatus = 'unknown';
        device.monitoring.lastCheck = Date.now();
        return;
      }
      
      // Test connectivity
      const isOnline = await this.ping(deviceIp);
      
      console.log(`  ${isOnline ? '🟢' : '🔴'} ${device.name} → ${isOnline ? 'Online' : 'Offline'}`);
      
      // Find all connections for this device
      const connections = appState.connections.filter(
        conn => conn.from === device.id || conn.to === device.id
      );
      
      // Update status for each connection
      for (const conn of connections) {
        const otherDeviceId = conn.from === device.id ? conn.to : conn.from;
        const otherDevice = appState.devices.find(d => d.id === otherDeviceId);
        
        // Skip if other device not in monitoring
        if (!otherDevice?.monitoring?.enabled) {
          continue;
        }
        
        const newStatus = isOnline ? 'online' : 'offline';
        this.updatePortStatus(device, conn, newStatus);
      }
      
      // Update last check time
      device.monitoring.lastCheck = Date.now();
      
    } catch (error) {
      console.error(`  ❌ Error scanning ${device.name}:`, error);
      device.monitoring.currentStatus = 'unknown';
    }
  },
  
  /**
   * PING implementation (cross-platform)
   */
  async ping(ip) {
    return new Promise((resolve) => {
      try {
        const isWindows = process.platform === 'win32';
        const cmd = isWindows
          ? `ping -n 1 -w ${this.globalTimeout} ${ip}`
          : `ping -c 1 -W ${Math.floor(this.globalTimeout / 1000)} ${ip}`;
        
        require('child_process').exec(cmd, { timeout: this.globalTimeout + 1000 }, (error) => {
          resolve(!error);  // true = online, false = offline
        });
        
        // Timeout safety
        setTimeout(() => resolve(false), this.globalTimeout + 2000);
        
      } catch (error) {
        console.error('PING error:', error);
        resolve(false);
      }
    });
  },
  
  // ==================== STATUS MANAGEMENT ====================
  
  /**
   * Update port status and check thresholds
   */
  updatePortStatus(device, conn, newStatus) {
    const connId = conn.id;
    
    // Initialize port status if not exists
    if (!appState.portMonitor.portStatus[connId]) {
      appState.portMonitor.portStatus[connId] = {
        from: { id: conn.from, name: this.getDeviceName(conn.from), ip: this.getDeviceIp(conn.from) },
        to: { id: conn.to, name: this.getDeviceName(conn.to), ip: this.getDeviceIp(conn.to) },
        status: 'unknown',
        lastCheck: Date.now(),
        history: [],
        downTime: 0,
        consecutiveFailures: 0,
        firstFailTime: null
      };
    }
    
    const portData = appState.portMonitor.portStatus[connId];
    const oldStatus = portData.status;
    
    // Check threshold logic
    this.checkThreshold(device, conn, oldStatus, newStatus);
    
    // Update status
    if (oldStatus !== newStatus) {
      console.log(`    Status change: ${connId} ${oldStatus} → ${newStatus}`);
      
      portData.status = newStatus;
      portData.lastCheck = Date.now();
      
      // Update history
      portData.history.push({
        timestamp: Date.now(),
        status: newStatus
      });
      
      // Keep only last 24 hours of history
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      portData.history = portData.history.filter(h => h.timestamp > dayAgo);
      
      // Track timing
      if (newStatus === 'offline') {
        portData.firstFailTime = Date.now();
        device.monitoring.consecutiveFailures++;
      } else if (newStatus === 'online') {
        if (portData.firstFailTime) {
          portData.downTime = Date.now() - portData.firstFailTime;
        }
        device.monitoring.consecutiveFailures = 0;
      }
    } else {
      // Same status
      portData.lastCheck = Date.now();
      
      if (newStatus === 'offline') {
        device.monitoring.consecutiveFailures++;
      }
    }
  },
  
  /**
   * Check if alert threshold exceeded
   * key logic: only alert if OFFLINE time > threshold
   */
  checkThreshold(device, conn, oldStatus, newStatus) {
    const threshold = device.monitoring.threshold || 1 * 60 * 60 * 1000;
    const portData = appState.portMonitor.portStatus[conn.id];
    
    if (newStatus === 'offline') {
      if (oldStatus !== 'offline') {
        // Device just went offline - start timer
        portData.firstFailTime = Date.now();
        device.monitoring.alertSent = false;
      } else {
        // Already offline - check if passed threshold
        const timeOffline = Date.now() - (portData.firstFailTime || Date.now());
        
        if (timeOffline > threshold && !device.monitoring.alertSent) {
          this.sendThresholdAlert(device, conn, timeOffline, threshold);
          device.monitoring.alertSent = true;
        }
      }
    } else if (newStatus === 'online') {
      if (oldStatus === 'offline') {
        // Coming back online
        const timeOffline = Date.now() - (portData.firstFailTime || Date.now());
        
        // Only send recovery alert if was offline longer than threshold
        if (timeOffline > threshold) {
          this.sendRecoveryAlert(device, conn, timeOffline);
        }
        
        portData.firstFailTime = null;
        device.monitoring.alertSent = false;
      }
    }
  },
  
  // ==================== ALERTS ====================
  
  sendThresholdAlert(device, conn, timeOffline, threshold) {
    const minutes = Math.floor(timeOffline / 60000);
    const hours = Math.floor(minutes / 60);
    const timeStr = hours >= 1 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
    
    const message = `⚠️ ${device.name} offline por ${timeStr} (limite: ${this.formatTime(threshold)})`;
    
    console.warn(`\n🔴 ALERT: ${message}`);
    
    // Show toast notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Threshold Exceeded',
        text: message,
        toast: true,
        position: 'top-right',
        timer: 10000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
    
    // Register alert
    appState.portMonitor.alerts.push({
      id: this._generateId(),
      type: 'threshold_exceeded',
      severity: 'warning',
      device: device.name,
      connection: conn.id,
      threshold: threshold,
      actualDowntime: timeOffline,
      timestamp: Date.now(),
      message: message,
      read: false
    });
  },
  
  sendRecoveryAlert(device, conn, downtime) {
    const timeStr = this.formatTime(downtime);
    const message = `✅ ${device.name} Online! (ficou offline por ${timeStr})`;
    
    console.log(`\n🟢 RECOVERY: ${message}`);
    
    // Show toast notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: '✅ Recuperado',
        text: message,
        toast: true,
        position: 'top-right',
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
    
    // Register alert
    appState.portMonitor.alerts.push({
      id: this._generateId(),
      type: 'recovery',
      severity: 'info',
      device: device.name,
      connection: conn.id,
      downtime: downtime,
      timestamp: Date.now(),
      message: message,
      read: false
    });
  },
  
  // ==================== UI UPDATE ====================
  
  updateMonitoringUI() {
    // Calculate stats
    const allPorts = Object.values(appState.portMonitor.portStatus);
    const online = allPorts.filter(p => p.status === 'online').length;
    const offline = allPorts.filter(p => p.status === 'offline').length;
    const unknown = allPorts.filter(p => p.status === 'unknown').length;
    
    appState.portMonitor.stats = {
      totalMonitored: allPorts.length,
      online: online,
      offline: offline,
      unknown: unknown,
      uptime: online > 0 ? Math.round((online / allPorts.length) * 100) + '%' : '0%'
    };
    
    console.log(`📊 Stats: ${online}✅ ${offline}❌ ${unknown}❓`);
    
    // Send custom event to update UI
    document.dispatchEvent(new CustomEvent('portMonitorUpdated', {
      detail: appState.portMonitor
    }));
  },
  
  // ==================== PUBLIC API ====================
  
  /**
   * Get status of a specific connection
   */
  getPortStatus(connId) {
    return appState.portMonitor.portStatus[connId] || null;
  },
  
  /**
   * Get all port statuses
   */
  getAllPortStatus() {
    return appState.portMonitor.portStatus;
  },
  
  /**
   * Get monitoring statistics
   */
  getStats() {
    return appState.portMonitor.stats;
  },
  
  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return appState.portMonitor.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
  
  /**
   * Enable/disable monitoring for a device
   */
  setDeviceMonitoring(deviceId, enabled, config = {}) {
    const device = appState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    device.monitoring.enabled = enabled;
    
    if (config.interval) {
      device.monitoring.checkInterval = config.interval;
    }
    if (config.threshold) {
      device.monitoring.threshold = config.threshold;
    }
    if (config.notes) {
      device.monitoring.notes = config.notes;
    }
    
    console.log(`⚙️  Device ${device.name} monitoring: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
  },
  
  /**
   * Toggle monitoring on/off
   */
  toggle(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  },
  
  /**
   * Get monitoring status overview
   */
  getMonitoringOverview() {
    const monitoredDevices = appState.devices.filter(d => d.monitoring?.enabled);
    const alerts = appState.portMonitor.alerts;
    const recentAlerts = alerts.filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000);
    
    return {
      enabled: this.enabled,
      monitoredDevices: monitoredDevices.length,
      totalDevices: appState.devices.length,
      stats: appState.portMonitor.stats,
      recentAlerts: recentAlerts,
      nextCheckDevices: this.getDevicesDueForCheck()
    };
  },
  
  // ==================== UTILITIES ====================
  
  formatTime(ms) {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return Math.floor(ms / 1000) + 's';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h';
    return Math.floor(ms / 86400000) + 'd';
  },
  
  getDeviceName(deviceId) {
    const device = appState.devices.find(d => d.id === deviceId);
    return device?.name || 'Unknown';
  },
  
  getDeviceIp(deviceId) {
    const device = appState.devices.find(d => d.id === deviceId);
    return device?.addresses?.ipv4 || 'N/A';
  },
  
  _generateId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // ==================== CONSOLE HELPERS ====================
  
  /**
   * Debug: Show all monitored devices
   * Usage: portMonitorV2.debugDevices()
   */
  debugDevices() {
    console.table(
      appState.devices
        .filter(d => d.monitoring?.enabled)
        .map(d => ({
          ID: d.id,
          Name: d.name,
          IP: d.addresses?.ipv4,
          Interval: this.formatTime(d.monitoring.checkInterval),
          Threshold: this.formatTime(d.monitoring.threshold),
          Status: d.monitoring.currentStatus,
          'Last Check': new Date(d.monitoring.lastCheck).toLocaleTimeString()
        }))
    );
  },
  
  /**
   * Debug: Show all port statuses
   */
  debugPorts() {
    console.table(
      Object.entries(appState.portMonitor.portStatus).map(([id, data]) => ({
        'Conn ID': id,
        'From': data.from.name,
        'To': data.to.name,
        'Status': data.status,
        'Down Time': this.formatTime(data.downTime),
        'Last Check': new Date(data.lastCheck).toLocaleTimeString(),
        'History': data.history.length + ' entries'
      }))
    );
  },
  
  /**
   * Debug: Show recent alerts
   */
  debugAlerts() {
    console.table(
      appState.portMonitor.alerts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map(a => ({
          Type: a.type,
          Device: a.device,
          Severity: a.severity,
          Time: new Date(a.timestamp).toLocaleTimeString(),
          Message: a.message
        }))
    );
  },
  
  /**
   * Debug: Show monitoring overview
   */
  debugOverview() {
    const overview = this.getMonitoringOverview();
    console.log('═══════════════════════════════════════');
    console.log('📊 MONITORING OVERVIEW');
    console.log('═══════════════════════════════════════');
    console.log(`Status: ${overview.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Devices: ${overview.monitoredDevices} / ${overview.totalDevices} monitored`);
    console.log(`Stats: ${overview.stats.online}✅ ${overview.stats.offline}❌ ${overview.stats.unknown}❓`);
    console.log(`Uptime: ${overview.stats.uptime}`);
    console.log(`Recent Alerts: ${overview.recentAlerts.length}`);
    console.log(`Next Scan Due: ${overview.nextCheckDevices.length} devices`);
    console.log('═══════════════════════════════════════');
  }
};

// Auto-initialize when appState is ready
if (typeof window !== 'undefined' && typeof appState !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    portMonitorV2.init();
  });
}
