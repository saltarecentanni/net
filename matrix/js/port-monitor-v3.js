/**
 * PHASE 6 v3: Simple Port Monitor
 * 
 * KISS Principle: Keep It Simple, Stupid
 * 
 * Features:
 * - Enable/Disable monitoring (YES/NO)
 * - Check interval (5m-24h)
 * - Alert threshold (1m-1h)
 * - Manual "Scan Now" button (slow, doesn't freeze network)
 * 
 * @version 3.0.0
 * @date 2026-02-13
 */

window.portMonitorV3 = {
  
  // ==================== CONFIGURATION ====================
  
  enabled: true,
  scanDelay: 500,  // 500ms between each device scan (doesn't freeze network)
  
  // ==================== INITIALIZATION ====================
  
  init() {
    console.log('🚀 [PORT MONITOR v3] Simple initialization...');
    
    // Initialize monitoring config for all devices
    appState.devices.forEach(device => {
      if (!device.monitoring) {
        device.monitoring = {
          enabled: false,
          checkInterval: 10 * 60 * 1000,      // Default: 10 minutes
          alertThreshold: 1 * 60 * 60 * 1000, // Default: 1 hour
          lastCheck: 0,
          currentStatus: 'unknown',
          lastStatusChange: 0,
          downtime: 0,
          alertSent: false
        };
      }
    });
    
    // Initialize appState.portMonitor
    if (!appState.portMonitor) {
      appState.portMonitor = {
        status: {},
        alerts: []
      };
    }
    
    console.log(`✅ Initialized ${appState.devices.length} devices`);
    
    // Start background monitoring loop
    this.startMonitoring();
  },
  
  // ==================== MAIN LOOP ====================
  
  startMonitoring() {
    console.log('🔄 Starting background monitoring loop (every 60s)...');
    
    // Check every 60 seconds which devices are due for verification
    this.monitoringInterval = setInterval(() => {
      this.checkDueDevices();
    }, 60 * 1000);
    
    // Run first check immediately
    this.checkDueDevices();
  },
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⛔ Monitoring loop stopped');
    }
  },
  
  // ==================== CHECK LOGIC ====================
  
  async checkDueDevices() {
    const now = Date.now();
    
    // Get all enabled devices that are due for check
    const devices = appState.devices.filter(d => {
      if (!d.monitoring?.enabled) return false;
      
      const lastCheck = d.monitoring.lastCheck || 0;
      const interval = d.monitoring.checkInterval || 10 * 60 * 1000;
      
      return (now - lastCheck) >= interval;
    });
    
    if (devices.length === 0) {
      return;  // Nothing to do
    }
    
    console.log(`\n📊 [CHECK] ${new Date().toLocaleTimeString()} - Checking ${devices.length} device(s)`);
    
    // Check each device with small delay (prevents network freeze)
    for (const device of devices) {
      await this.checkDevice(device);
      
      // Small delay between devices
      if (devices.length > 1) {
        await new Promise(resolve => setTimeout(resolve, this.scanDelay));
      }
    }
    
    console.log('✅ Check cycle complete\n');
  },
  
  /**
   * Check a single device
   */
  async checkDevice(device) {
    try {
      // Get IP address
      const ip = device.addresses?.ipv4;
      if (!ip) {
        console.warn(`  ⚠️  ${device.name}: No IP address`);
        device.monitoring.currentStatus = 'unknown';
        device.monitoring.lastCheck = Date.now();
        return;
      }
      
      // Perform PING
      const isOnline = await this.ping(ip);
      
      // Determine new status
      const newStatus = isOnline ? 'online' : 'offline';
      const oldStatus = device.monitoring.currentStatus;
      
      // Log status change
      const icon = newStatus === 'online' ? '🟢' : '🔴';
      console.log(`  ${icon} ${device.name}: ${newStatus.toUpperCase()}`);
      
      // Handle status change
      if (newStatus !== oldStatus) {
        await this.handleStatusChange(device, oldStatus, newStatus);
      } else if (newStatus === 'offline') {
        // Still offline - check if passed threshold
        await this.checkOfflineThreshold(device);
      }
      
      // Update last check time
      device.monitoring.lastCheck = Date.now();
      device.monitoring.currentStatus = newStatus;
      
    } catch (error) {
      console.error(`  ❌ Error checking ${device.name}:`, error);
      device.monitoring.currentStatus = 'unknown';
    }
  },
  
  /**
   * Handle device going online/offline
   */
  async handleStatusChange(device, oldStatus, newStatus) {
    if (newStatus === 'offline') {
      // Just went offline - start timer
      device.monitoring.lastStatusChange = Date.now();
      device.monitoring.alertSent = false;
      console.log(`    ⏱️  Started offline timer`);
      
    } else if (newStatus === 'online') {
      // Came back online
      if (oldStatus === 'offline') {
        // Calculate downtime
        const downtime = Date.now() - device.monitoring.lastStatusChange;
        device.monitoring.downtime = downtime;
        
        console.log(`    ✅ Recovered after ${this.formatTime(downtime)}`);
        
        // Check if should send recovery alert
        const threshold = device.monitoring.alertThreshold;
        if (downtime > threshold) {
          // Was offline longer than threshold - send alert
          await this.sendAlert(device, 'recovery', downtime);
        }
        
        device.monitoring.alertSent = false;
      }
    }
  },
  
  /**
   * Check if offline time exceeded threshold
   */
  async checkOfflineThreshold(device) {
    const timeOffline = Date.now() - device.monitoring.lastStatusChange;
    const threshold = device.monitoring.alertThreshold;
    
    // If exceeded threshold and not yet alerted - send alert
    if (timeOffline > threshold && !device.monitoring.alertSent) {
      console.log(`    ⚠️  Exceeded threshold (${this.formatTime(timeOffline)} > ${this.formatTime(threshold)})`);
      
      await this.sendAlert(device, 'threshold', timeOffline);
      device.monitoring.alertSent = true;
    }
  },
  
  // ==================== PING ====================
  
  /**
   * Ping IP address (cross-platform)
   */
  ping(ip) {
    return new Promise((resolve) => {
      try {
        const isWindows = process.platform === 'win32';
        const timeout = 5000;  // 5 seconds
        
        const cmd = isWindows
          ? `ping -n 1 -w ${timeout} ${ip}`
          : `ping -c 1 -W 5 ${ip}`;
        
        require('child_process').exec(cmd, { timeout: timeout + 1000 }, (error) => {
          resolve(!error);  // true = online, false = offline
        });
        
        // Safety timeout
        setTimeout(() => resolve(false), timeout + 2000);
        
      } catch (error) {
        console.error('PING error:', error);
        resolve(false);
      }
    });
  },
  
  // ==================== ALERTS ====================
  
  /**
   * Send alert notification
   */
  async sendAlert(device, alertType, timeValue) {
    const timeStr = this.formatTime(timeValue);
    
    let message = '';
    let icon = 'warning';
    
    if (alertType === 'threshold') {
      const thresholdStr = this.formatTime(device.monitoring.alertThreshold);
      message = `⚠️ ${device.name} OFFLINE por ${timeStr} (limit: ${thresholdStr})`;
      icon = 'warning';
    } else if (alertType === 'recovery') {
      message = `✅ ${device.name} Back Online! (was offline for ${timeStr})`;
      icon = 'success';
    }
    
    console.log(`\n🔔 ALERT: ${message}\n`);
    
    // Show toast notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: icon,
        title: alertType === 'recovery' ? '✅ Recovered' : '⚠️ Alert',
        text: message,
        toast: true,
        position: 'top-right',
        timer: alertType === 'recovery' ? 5000 : 10000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
    
    // Store alert
    appState.portMonitor.alerts.push({
      id: this._generateId(),
      type: alertType,
      device: device.name,
      message: message,
      timestamp: Date.now(),
      timeValue: timeValue,
      read: false
    });
  },
  
  // ==================== MANUAL SCAN ====================
  
  /**
   * Manual scan - slowly without freezing network
   */
  async scanDeviceNow(deviceId) {
    const device = appState.devices.find(d => d.id === deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    console.log(`\n🔍 MANUAL SCAN: ${device.name}`);
    
    // Get IP
    const ip = device.addresses?.ipv4;
    if (!ip) {
      throw new Error('Device has no IP address');
    }
    
    // Perform PING
    console.log(`  Pinging ${ip}...`);
    const isOnline = await this.ping(ip);
    
    // Update device status
    device.monitoring.currentStatus = isOnline ? 'online' : 'offline';
    device.monitoring.lastCheck = Date.now();
    
    const status = isOnline ? '🟢 ONLINE' : '🔴 OFFLINE';
    console.log(`  Result: ${status}\n`);
    
    return {
      deviceId: device.id,
      name: device.name,
      ip: ip,
      status: isOnline ? 'online' : 'offline',
      timestamp: new Date()
    };
  },
  
  /**
   * Manual scan all monitored devices (slowly)
   */
  async scanAllNow() {
    const devices = appState.devices.filter(d => d.monitoring?.enabled);
    
    if (devices.length === 0) {
      throw new Error('No devices to monitor');
    }
    
    console.log(`\n🔍 MANUAL SCAN ALL: ${devices.length} device(s)`);
    
    const results = [];
    
    for (const device of devices) {
      try {
        const result = await this.scanDeviceNow(device.id);
        results.push(result);
        
        // Delay between devices
        if (devices.indexOf(device) < devices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.scanDelay));
        }
      } catch (error) {
        console.error(`Error scanning ${device.name}:`, error);
      }
    }
    
    return results;
  },
  
  // ==================== PUBLIC API ====================
  
  /**
   * Get device status
   */
  getStatus(deviceId) {
    const device = appState.devices.find(d => d.id === deviceId);
    return device?.monitoring?.currentStatus || 'unknown';
  },
  
  /**
   * Get all device statuses
   */
  getAllStatus() {
    return appState.devices
      .filter(d => d.monitoring?.enabled)
      .map(d => ({
        id: d.id,
        name: d.name,
        status: d.monitoring.currentStatus,
        lastCheck: d.monitoring.lastCheck,
        downtime: d.monitoring.downtime
      }));
  },
  
  /**
   * Enable/disable monitoring for device
   */
  setMonitoring(deviceId, enabled, config = {}) {
    const device = appState.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`Device ${deviceId} not found`);
      return;
    }
    
    device.monitoring.enabled = enabled;
    
    if (config.interval) {
      device.monitoring.checkInterval = config.interval;
    }
    if (config.threshold) {
      device.monitoring.alertThreshold = config.threshold;
    }
    
    const status = enabled ? '✅ Enabled' : '❌ Disabled';
    console.log(`⚙️  ${device.name}: ${status}`);
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
   * Get monitoring overview
   */
  getOverview() {
    const devices = appState.devices;
    const monitored = devices.filter(d => d.monitoring?.enabled);
    const online = monitored.filter(d => d.monitoring.currentStatus === 'online');
    const offline = monitored.filter(d => d.monitoring.currentStatus === 'offline');
    const unknown = monitored.filter(d => d.monitoring.currentStatus === 'unknown');
    
    return {
      total: devices.length,
      monitoring: monitored.length,
      online: online.length,
      offline: offline.length,
      unknown: unknown.length,
      uptime: online.length > 0 ? Math.round((online.length / monitored.length) * 100) + '%' : '0%'
    };
  },
  
  // ==================== UTILITIES ====================
  
  /**
   * Format milliseconds to human-readable time
   */
  formatTime(ms) {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return Math.floor(ms / 1000) + 's';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h';
    return Math.floor(ms / 86400000) + 'd';
  },
  
  _generateId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // ==================== DEBUG ====================
  
  /**
   * Debug: Show all monitored devices
   */
  debug() {
    console.log('═══════════════════════════════════════');
    console.log('📊 PORT MONITOR DEBUG');
    console.log('═══════════════════════════════════════');
    
    const overview = this.getOverview();
    console.log(`Total Devices: ${overview.total}`);
    console.log(`Monitored: ${overview.monitoring}`);
    console.log(`Online: ${overview.online} 🟢`);
    console.log(`Offline: ${overview.offline} 🔴`);
    console.log(`Unknown: ${overview.unknown} ⚪`);
    console.log(`Uptime: ${overview.uptime}`);
    
    console.log('\n📋 Monitored Devices:');
    appState.devices
      .filter(d => d.monitoring?.enabled)
      .forEach(d => {
        const status = d.monitoring.currentStatus === 'online' ? '🟢' : '🔴';
        const lastCheck = new Date(d.monitoring.lastCheck).toLocaleTimeString();
        console.log(`  ${status} ${d.name} - Last check: ${lastCheck}`);
      });
    
    console.log('\n🔔 Recent Alerts:');
    this.getRecentAlerts(5).forEach(a => {
      const time = new Date(a.timestamp).toLocaleTimeString();
      console.log(`  [${time}] ${a.type}: ${a.message}`);
    });
    
    console.log('═══════════════════════════════════════\n');
  }
};

// ==================== AUTO-INIT ====================

// Wait for appState to be ready
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Auto-init is now handled by app.js in initApp()
    // No need to initialize here as it would be redundant
    console.log('✅ portMonitorV3 ready for use');
  });
};
