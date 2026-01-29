/**
 * TIESSE Matrix Network - Application Core
 * Version: 3.1.5
 * 
 * Features:
 * - Encapsulated state (appState)
 * - Toast notification system
 * - Manual "Save Now" button (auto-save disabled to prevent race conditions)
 * - Modular structure
 * - Robust import/export with validation
 * - Patch panel dual-connection support (front/back)
 * - Wall jack passthrough support (v3.1.3)
 */

'use strict';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Copy text to clipboard and show confirmation toast
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        Toast.success('📋 Copied: ' + text);
    }).catch(function(err) {
        // Fallback for older browsers
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            Toast.success('📋 Copied: ' + text);
        } catch (e) {
            Toast.error('Failed to copy');
        }
        document.body.removeChild(textarea);
    });
}

/**
 * Require authentication for edit operations
 * Shows login modal if not authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
function requireAuth() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
        return true;
    }
    if (typeof Auth !== 'undefined') {
        Auth.showLoginModal();
    } else {
        Toast.error('Authentication module not loaded. Please refresh the page.');
    }
    return false;
}

// ============================================================================
// GLOBAL STATE (Encapsulated)
// ============================================================================
var appState = {
    devices: [],
    connections: [],
    nextDeviceId: 1,
    connSort: [{ key: 'id', asc: true }],  // Array for multi-level sorting (up to 3 levels)
    deviceSort: { key: 'rack', asc: true },
    deviceView: 'table',
    matrixLimit: 12,
    matrixExpanded: false,
    rackColorMap: {},
    // Filters for Devices List
    deviceFilters: {
        location: '',
        source: '',
        name: '',
        type: '',
        status: '',
        hasConnections: ''  // '', 'yes', 'no'
    },
    // Filters for Connections List
    connFilters: {
        source: '',
        anyDevice: '',    // Search device in both From and To columns
        fromDevice: '',
        toDevice: '',
        destination: '',
        type: '',
        status: '',
        cable: '',
        normalizeView: false  // When true, shows bidirectional view (A→B and B→A)
    }
};

// ============================================================================
// CONFIGURATION
// ============================================================================
var config = {
    // autoSaveInterval removed - auto-save disabled to prevent race conditions
    connColors: {
        lan: '#3b82f6',
        wan: '#ef4444',
        dmz: '#f97316',
        trunk: '#22c55e',
        management: '#8b5cf6',
        backup: '#eab308',
        fiber: '#06b6d4',
        wallport: '#a78bfa',
        external: '#64748b',
        other: '#6b7280'
    },
    connLabels: {
        lan: 'LAN',
        wan: 'WAN/Internet',
        dmz: 'DMZ',
        trunk: 'Trunk/Uplink',
        management: 'Management',
        backup: 'Backup',
        fiber: 'Fiber Optic',
        wallport: 'Wall Jack',
        external: 'External',
        other: 'Other'
    },
    portTypes: [
        // Object format with value, label, icon, and category
        { value: 'eth', label: 'Eth/RJ45', icon: '🔌', category: 'copper' },
        { value: 'GbE', label: 'GbE 1G', icon: '🌐', category: 'copper' },
        { value: '2.5GbE', label: '2.5GbE', icon: '⚡', category: 'copper' },
        { value: '5GbE', label: '5GbE', icon: '⚡', category: 'copper' },
        { value: '10GbE', label: '10GbE-T', icon: '🚀', category: 'copper' },
        { value: 'PoE', label: 'PoE/PoE+', icon: '🔋', category: 'copper' },
        { value: 'SFP', label: 'SFP 1G', icon: '💎', category: 'fiber' },
        { value: 'SFP/SFP+', label: 'SFP+ 10G', icon: '💠', category: 'fiber' },
        { value: 'SFP28', label: 'SFP28 25G', icon: '💠', category: 'fiber' },
        { value: 'QSFP/QSFP+', label: 'QSFP+ 40G', icon: '🔷', category: 'fiber' },
        { value: 'QSFP28', label: 'QSFP28 100G', icon: '🔷', category: 'fiber' },
        { value: 'QSFP-DD', label: 'QSFP-DD 400G', icon: '💎', category: 'fiber' },
        { value: 'fiber', label: 'Fiber LC/SC', icon: '🔴', category: 'fiber' },
        { value: 'WAN', label: 'WAN', icon: '🌍', category: 'wan' },
        { value: 'eth/wan', label: 'ETH/WAN', icon: '🌐', category: 'wan' },
        { value: 'MGMT', label: 'MGMT', icon: '⚙️', category: 'management' },
        { value: 'TTY', label: 'Console/TTY', icon: '🖥️', category: 'management' },
        { value: 'USB', label: 'USB', icon: '🔗', category: 'management' },
        { value: 'USB-C', label: 'USB-C', icon: '🔗', category: 'management' },
        { value: 'RJ11', label: 'RJ11/Phone', icon: '📞', category: 'telecom' },
        { value: 'ISDN', label: 'ISDN BRI', icon: '📠', category: 'telecom' },
        { value: 'E1/T1', label: 'E1/T1', icon: '📡', category: 'telecom' },
        { value: 'serial', label: 'Serial RS232', icon: '📟', category: 'legacy' },
        { value: 'aux', label: 'AUX', icon: '🔧', category: 'legacy' },
        { value: 'others', label: 'Others', icon: '❓', category: 'other' }
    ],
    rackColors: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
        '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7',
        '#0ea5e9', '#d946ef', '#10b981', '#f59e0b', '#6366f1', '#78716c',
        '#dc2626', '#059669', '#7c3aed', '#db2777', '#0891b2', '#65a30d'
    ]
};

// ============================================================================
// DEVICE FILTERS
// ============================================================================

// Debounce timer for text input filters
var deviceFilterDebounceTimer = null;

/**
 * Update device filter and refresh the list
 * Uses debounce for text inputs to improve performance
 */
function updateDeviceFilter(filterKey, value, skipFilterBarRebuild) {
    appState.deviceFilters[filterKey] = value;
    
    // Sync location filter with global LocationFilter
    if (filterKey === 'location') {
        var globalFilter = document.getElementById('locationFilter');
        if (globalFilter && globalFilter.value !== value) {
            globalFilter.value = value;
        }
        // Update all views when location changes (like global filter does)
        if (typeof LocationFilter !== 'undefined') {
            LocationFilter.updateCounters();
        }
        if (typeof updateConnectionsList === 'function') updateConnectionsList();
        if (typeof updateMatrix === 'function') updateMatrix();
        if (typeof NetworkTopology !== 'undefined') NetworkTopology.render();
        if (typeof DrawioTopology !== 'undefined') DrawioTopology.render();
    }
    
    // Text inputs use debounce to avoid excessive re-renders
    var textFilters = ['name', 'source'];
    if (textFilters.indexOf(filterKey) >= 0) {
        if (deviceFilterDebounceTimer) {
            clearTimeout(deviceFilterDebounceTimer);
        }
        deviceFilterDebounceTimer = setTimeout(function() {
            updateDevicesListOnly();
            updateDeviceFilterCount();
            updateGlobalCounters();
        }, 250);
    } else {
        // Dropdowns and checkboxes update immediately
        updateDevicesListOnly();
        updateDeviceFilterCount();
        updateGlobalCounters();
    }
}

/**
 * Update device filter count display
 */
function updateDeviceFilterCount() {
    var filteredDevices = typeof getFilteredDevices === 'function' ? getFilteredDevices() : appState.devices;
    var totalDevices = appState.devices.length;
    var filteredCount = filteredDevices.length;
    var hasActiveFilters = appState.deviceFilters.location || appState.deviceFilters.source || appState.deviceFilters.name || 
                           appState.deviceFilters.type || appState.deviceFilters.status || 
                           appState.deviceFilters.hasConnections;
    
    var countEl = document.getElementById('deviceFilterCount');
    var clearBtn = document.getElementById('deviceFilterClearBtn');
    
    if (countEl) {
        if (hasActiveFilters) {
            countEl.textContent = 'Showing ' + filteredCount + ' of ' + totalDevices;
        } else {
            countEl.textContent = totalDevices + ' devices';
        }
    }
    if (clearBtn) {
        clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
    }
}

/**
 * Clear all device filters
 */
function clearDeviceFilters() {
    appState.deviceFilters = {
        location: '',
        source: '',
        name: '',
        type: '',
        status: '',
        hasConnections: ''
    };
    // Full rebuild including filter bar
    updateDevicesList();
    updateGlobalCounters();
}

/**
 * Get filtered devices based on current filters
 */
function getFilteredDevices() {
    var devices = appState.devices.slice();
    var filters = appState.deviceFilters;
    
    return devices.filter(function(d) {
        // Location filter
        if (filters.location && d.location !== filters.location) {
            return false;
        }
        // Source filter
        if (filters.source && (d.rackId || '').toLowerCase().indexOf(filters.source.toLowerCase()) === -1) {
            return false;
        }
        // Name filter
        if (filters.name && (d.name || '').toLowerCase().indexOf(filters.name.toLowerCase()) === -1) {
            return false;
        }
        // Type filter
        if (filters.type && d.type !== filters.type) {
            return false;
        }
        // Status filter
        if (filters.status && d.status !== filters.status) {
            return false;
        }
        // Has connections filter
        if (filters.hasConnections) {
            var connCount = 0;
            for (var ci = 0; ci < appState.connections.length; ci++) {
                if (appState.connections[ci].from === d.id || appState.connections[ci].to === d.id) {
                    connCount++;
                }
            }
            if (filters.hasConnections === 'yes' && connCount === 0) return false;
            if (filters.hasConnections === 'no' && connCount > 0) return false;
        }
        return true;
    });
}

// ============================================================================
// CONNECTION FILTERS
// ============================================================================

// Debounce timer for text input filters
var connFilterDebounceTimer = null;

/**
 * Update connection filter and refresh the list
 * Uses debounce for text inputs to improve performance
 */
function updateConnFilter(filterKey, value) {
    appState.connFilters[filterKey] = value;
    
    // Text inputs use debounce to avoid excessive re-renders
    var textFilters = ['anyDevice', 'fromDevice', 'toDevice', 'destination', 'cable'];
    if (textFilters.indexOf(filterKey) >= 0) {
        if (connFilterDebounceTimer) {
            clearTimeout(connFilterDebounceTimer);
        }
        connFilterDebounceTimer = setTimeout(function() {
            updateConnectionsListOnly();
            updateConnFilterCount();
            updateGlobalCounters();
        }, 250);
    } else {
        // Dropdowns and checkboxes update immediately
        updateConnectionsListOnly();
        updateConnFilterCount();
        updateGlobalCounters();
    }
}

/**
 * Toggle normalize view for connections (shows filtered device always in From column)
 */
function toggleConnNormalizeView() {
    appState.connFilters.normalizeView = !appState.connFilters.normalizeView;
    // Rebuild list to apply normalization
    updateConnectionsListOnly();
    // Update checkbox state
    var checkbox = document.getElementById('connNormalizeView');
    if (checkbox) {
        checkbox.checked = appState.connFilters.normalizeView;
    }
}

/**
 * Update connection filter count display
 * Shows real connection count + line count when bidirectional mode is ON
 */
function updateConnFilterCount() {
    var filteredItems = typeof getFilteredConnections === 'function' ? getFilteredConnections() : [];
    var totalConnections = appState.connections.length;
    var lineCount = filteredItems.length;
    var isBidirectional = appState.connFilters.normalizeView;
    
    // Count real connections (not mirrored duplicates)
    var realCount = 0;
    for (var i = 0; i < filteredItems.length; i++) {
        if (!filteredItems[i]._isMirrored) realCount++;
    }
    
    var hasActiveFilters = appState.connFilters.source || appState.connFilters.anyDevice ||
                           appState.connFilters.fromDevice || appState.connFilters.toDevice || 
                           appState.connFilters.destination || appState.connFilters.type || 
                           appState.connFilters.status || appState.connFilters.cable;
    
    var countEl = document.getElementById('connFilterCount');
    var clearBtn = document.getElementById('connFilterClearBtn');
    
    if (countEl) {
        if (hasActiveFilters) {
            if (isBidirectional && lineCount !== realCount) {
                countEl.textContent = realCount + ' conn. (' + lineCount + ' lines) of ' + totalConnections;
            } else {
                countEl.textContent = 'Showing ' + realCount + ' of ' + totalConnections;
            }
        } else {
            if (isBidirectional) {
                countEl.textContent = totalConnections + ' conn. (' + lineCount + ' lines)';
            } else {
                countEl.textContent = totalConnections + ' connections';
            }
        }
    }
    if (clearBtn) {
        clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
    }

    // Update connStats
    var connDeviceStatsEl = document.getElementById('connDeviceStats');
    var connConnectionStatsEl = document.getElementById('connConnectionStats');
    if (connDeviceStatsEl && connConnectionStatsEl) {
        if (appState.connFilters.source) {
            // Count devices and connections in the filtered rack
            var rackDevices = appState.devices.filter(function(d) {
                return (d.rackId || '').toLowerCase().indexOf(appState.connFilters.source.toLowerCase()) !== -1;
            });
            var rackConnections = appState.connections.filter(function(c) {
                var fromDevice = appState.devices.find(function(d) { return d.id === c.from; });
                var toDevice = appState.devices.find(function(d) { return d.id === c.to; });
                var fromRack = fromDevice ? (fromDevice.rackId || '') : '';
                var toRack = toDevice ? (toDevice.rackId || '') : '';
                return fromRack.toLowerCase().indexOf(appState.connFilters.source.toLowerCase()) !== -1 ||
                       toRack.toLowerCase().indexOf(appState.connFilters.source.toLowerCase()) !== -1;
            });
            connDeviceStatsEl.textContent = rackDevices.length;
            connConnectionStatsEl.textContent = rackConnections.length;
        } else {
            connDeviceStatsEl.textContent = appState.devices.length;
            connConnectionStatsEl.textContent = totalConnections;
        }
    }
}

/**
 * Clear all connection filters (bidirectional mode OFF by default)
 */
function clearConnFilters() {
    appState.connFilters = {
        source: '',
        anyDevice: '',
        fromDevice: '',
        toDevice: '',
        destination: '',
        type: '',
        status: '',
        cable: '',
        normalizeView: false  // Bidirectional mode off by default
    };
    // Full rebuild including filter bar
    updateConnectionsList();
    updateGlobalCounters();
}

/**
 * Filter connections by a specific device name (used from devices table click)
 * Scrolls to connections section and sets the anyDevice filter
 */
function filterConnectionsByDevice(deviceName) {
    // Clear other filters and set only the device filter (keep current normalizeView state)
    var currentNormalize = appState.connFilters.normalizeView || false;
    appState.connFilters = {
        source: '',
        anyDevice: deviceName,
        fromDevice: '',
        toDevice: '',
        destination: '',
        type: '',
        status: '',
        cable: '',
        normalizeView: currentNormalize  // Preserve current swap state
    };
    // Full rebuild to show the filter
    updateConnectionsList();
    updateGlobalCounters();
    
    // Scroll to connections section
    var connSection = document.getElementById('connectionsListContainer');
    if (connSection) {
        connSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Creates bidirectional view: each device-to-device connection appears twice
 * Original: A→B and Mirrored: B→A (with visual indicator)
 * External/WallJack connections are NOT mirrored
 */
function getBidirectionalConnections() {
    var connections = appState.connections;
    var result = [];
    
    for (var i = 0; i < connections.length; i++) {
        var conn = connections[i];
        
        // Add original connection
        result.push({
            _original: conn,
            _originalIndex: i,
            _isMirrored: false
        });
        
        // Add mirrored connection (only for device-to-device, not external/walljack)
        if (conn.to && !conn.isWallJack && !conn.externalDest) {
            result.push({
                _original: conn,
                _originalIndex: i,
                _isMirrored: true,
                // Swapped values for display
                from: conn.to,
                fromPort: conn.toPort,
                to: conn.from,
                toPort: conn.fromPort
            });
        }
    }
    
    return result;
}

/**
 * Get connection property - handles normal, mirrored, and auto-inverted connections
 */
function getConnProp(item, prop) {
    // For mirrored or auto-inverted items, use the swapped values for from/to/ports
    if ((item._isMirrored || item._autoInverted) && (prop === 'from' || prop === 'fromPort' || prop === 'to' || prop === 'toPort')) {
        return item[prop]; // Use swapped value
    }
    return item._original[prop];
}

/**
 * Get filtered connections based on current filters
 * When bidirectional mode is ON, returns duplicated connections
 */
function getFilteredConnections() {
    var filters = appState.connFilters;
    var locationFilter = appState.deviceFilters.location; // Global location filter
    
    // Get base connections (bidirectional or normal)
    var items;
    if (filters.normalizeView) {
        items = getBidirectionalConnections();
    } else {
        // Wrap normal connections in same structure for consistency
        items = [];
        for (var i = 0; i < appState.connections.length; i++) {
            items.push({
                _original: appState.connections[i],
                _originalIndex: i,
                _isMirrored: false,
                _autoInverted: false  // Flag for auto-inversion based on filter
            });
        }
    }
    
    // Pre-build device lookup and location device IDs
    var deviceById = {};
    var locationDeviceIds = {};
    for (var d = 0; d < appState.devices.length; d++) {
        var dev = appState.devices[d];
        deviceById[dev.id] = dev;
        if (locationFilter && dev.location === locationFilter) {
            locationDeviceIds[dev.id] = true;
        }
    }
    
    // Filter and potentially auto-invert connections
    var result = [];
    for (var idx = 0; idx < items.length; idx++) {
        var item = items[idx];
        var c = item._original;
        var fromId = getConnProp(item, 'from');
        var toId = getConnProp(item, 'to');
        
        // Location filter - connection must have at least one device in the location
        if (locationFilter) {
            if (!locationDeviceIds[fromId] && !locationDeviceIds[toId]) {
                continue;
            }
        }
        
        var fromDevice = deviceById[fromId] || null;
        var toDevice = deviceById[toId] || null;
        
        // Source/Rack filter - searches in BOTH from and to device's rack
        // Auto-inverts the display if the searched rack is in destination
        if (filters.source) {
            var fromRack = fromDevice ? (fromDevice.rackId || '') : '';
            var toRack = toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest || 'External'));
            var searchTerm = filters.source.toLowerCase();
            var foundInSource = fromRack.toLowerCase().indexOf(searchTerm) !== -1;
            var foundInDest = toRack.toLowerCase().indexOf(searchTerm) !== -1;
            
            if (!foundInSource && !foundInDest) {
                continue; // Not found in either - skip
            }
            
            // Auto-invert: if found in destination but NOT in source, show inverted
            // This ensures the searched rack always appears as SOURCE
            if (!foundInSource && foundInDest && !filters.normalizeView) {
                item = {
                    _original: c,
                    _originalIndex: item._originalIndex,
                    _isMirrored: false,
                    _autoInverted: true,  // Mark as auto-inverted for display
                    // Swapped from/to for display
                    from: c.to,
                    to: c.from,
                    fromPort: c.toPort,
                    toPort: c.fromPort
                };
            }
        }
        
        // Re-get device info in case item was inverted
        fromId = getConnProp(item, 'from');
        toId = getConnProp(item, 'to');
        fromDevice = deviceById[fromId] || null;
        toDevice = deviceById[toId] || null;
        
        // Any Device filter (searches in BOTH From and To columns)
        if (filters.anyDevice) {
            var fromName = fromDevice ? (fromDevice.name || '') : '';
            var toName = toDevice ? (toDevice.name || '') : (c.externalDest || '');
            var anySearchTerm = filters.anyDevice.toLowerCase();
            var foundInFrom = fromName.toLowerCase().indexOf(anySearchTerm) !== -1;
            var foundInTo = toName.toLowerCase().indexOf(anySearchTerm) !== -1;
            if (!foundInFrom && !foundInTo) {
                continue;
            }
        }
        
        // From Device filter
        if (filters.fromDevice) {
            var fromName2 = fromDevice ? (fromDevice.name || '') : '';
            if (fromName2.toLowerCase().indexOf(filters.fromDevice.toLowerCase()) === -1) {
                continue;
            }
        }
        
        // To Device filter
        if (filters.toDevice) {
            var toName2 = toDevice ? (toDevice.name || '') : (c.externalDest || '');
            if (toName2.toLowerCase().indexOf(filters.toDevice.toLowerCase()) === -1) {
                continue;
            }
        }
        
        // Destination filter (to device's rack or external)
        if (filters.destination) {
            var destRack = toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest || 'External'));
            if (destRack.toLowerCase().indexOf(filters.destination.toLowerCase()) === -1) {
                continue;
            }
        }
        
        // Type filter
        if (filters.type && c.type !== filters.type) {
            continue;
        }
        
        // Status filter
        if (filters.status && c.status !== filters.status) {
            continue;
        }
        
        // Cable filter
        if (filters.cable) {
            var cableMarker = c.cableMarker || '';
            if (cableMarker.toLowerCase().indexOf(filters.cable.toLowerCase()) === -1) {
                continue;
            }
        }
        
        // Passed all filters - add to result
        result.push(item);
    }
    
    return result;
}

/**
 * Clear connection sorting
 */
function clearConnSort() {
    appState.connSort = [{ key: 'id', asc: true }];
    updateConnectionsList();
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================
var Toast = (function() {
    var container = null;
    
    function init() {
        if (container) return;
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px;';
        document.body.appendChild(container);
    }
    
    function show(message, type, duration) {
        init();
        type = type || 'info';
        duration = duration || 3000;
        
        var colors = {
            success: { bg: '#22c55e', icon: '✓' },
            error: { bg: '#ef4444', icon: '✕' },
            warning: { bg: '#f59e0b', icon: '⚠' },
            info: { bg: '#3b82f6', icon: 'ℹ' }
        };
        
        var c = colors[type] || colors.info;
        
        var toast = document.createElement('div');
        toast.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;background:' + c.bg + ';color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;animation:slideIn 0.3s ease;cursor:pointer;';
        toast.innerHTML = '<span style="font-size:18px;">' + c.icon + '</span><span>' + message + '</span>';
        
        toast.onclick = function() {
            removeToast(toast);
        };
        
        container.appendChild(toast);
        
        setTimeout(function() {
            removeToast(toast);
        }, duration);
        
        return toast;
    }
    
    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 280);
    }
    
    // Add CSS animations
    function addStyles() {
        var style = document.createElement('style');
        style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
        document.head.appendChild(style);
    }
    
    // Initialize styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addStyles);
    } else {
        addStyles();
    }
    
    return {
        success: function(msg, duration) { return show(msg, 'success', duration); },
        error: function(msg, duration) { return show(msg, 'error', duration || 5000); },
        warning: function(msg, duration) { return show(msg, 'warning', duration || 4000); },
        info: function(msg, duration) { return show(msg, 'info', duration); }
    };
})();

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================
// UI HELPERS
// ============================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('content-' + tabId).classList.add('active');
}

function setDeviceView(view) {
    appState.deviceView = view;
    var cardsBtn = document.getElementById('deviceViewCards');
    var tableBtn = document.getElementById('deviceViewTable');
    if (cardsBtn && tableBtn) {
        if (view === 'cards') {
            cardsBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
        } else {
            cardsBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
            tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
        }
    }
    updateDevicesList();
}

function toggleDeviceSort(key) {
    if (appState.deviceSort.key === key) {
        appState.deviceSort.asc = !appState.deviceSort.asc;
    } else {
        appState.deviceSort.key = key;
        appState.deviceSort.asc = true;
    }
    updateDevicesList();
}

function addConnectionFromDevice(deviceId) {
    switchTab('active');
    clearConnectionForm();
    document.getElementById('fromDevice').value = deviceId;
    updateFromPorts();
    highlightEditFields('connection', true);
    Toast.info('Select destination device and port');
}

function autoResizeTextarea(el) {
    if (!el) return;
    var lines = (el.value.match(/\n/g) || []).length + 1;
    var minRows = parseInt(el.getAttribute('rows') || '1', 10);
    var rows = Math.max(minRows, lines);
    el.rows = rows;
}

function highlightEditFields(formType, enable) {
    var fields = [];
    if (formType === 'connection') {
        fields = ['fromDevice', 'fromPort', 'toDevice', 'toPort', 'connType', 'connStatus', 'cableMarker', 'cableColor', 'connNotes'];
    } else if (formType === 'device') {
        fields = ['rackId', 'deviceOrder', 'deviceRear', 'deviceName', 'deviceBrandModel', 'deviceType', 'deviceStatus', 'deviceLocation', 'deviceIP1', 'deviceIP2', 'deviceIP3', 'deviceIP4', 'deviceService', 'deviceNotes'];
    }
    
    for (var i = 0; i < fields.length; i++) {
        var el = document.getElementById(fields[i]);
        if (el) {
            if (enable) {
                el.style.backgroundColor = '#f8fafc';
                el.style.borderColor = '#93c5fd';
            } else {
                el.style.backgroundColor = '';
                el.style.borderColor = '';
            }
        }
    }
}

function showSyncIndicator(type, message) {
    var indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    indicator.className = 'sync-indicator sync-' + type;
    indicator.textContent = message;
    indicator.style.display = 'block';
    
    setTimeout(function() {
        indicator.style.display = 'none';
    }, 2000);
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================
function saveToStorage() {
    try {
        localStorage.setItem('networkDevices', JSON.stringify(appState.devices));
        localStorage.setItem('networkConnections', JSON.stringify(appState.connections));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        showSyncIndicator('saved', '✓ Saved');
        serverSave();
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        Toast.error('Failed to save data locally');
    }
}

/**
 * Manual save function - triggered by "Salva Ora" button
 * Saves immediately to localStorage and server
 */
function saveNow() {
    try {
        localStorage.setItem('networkDevices', JSON.stringify(appState.devices));
        localStorage.setItem('networkConnections', JSON.stringify(appState.connections));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        showSyncIndicator('saved', '✓ Saved!');
        serverSave();
        Toast.success('Data saved successfully!');
    } catch (e) {
        console.error('Error saving:', e);
        Toast.error('Error saving: ' + e.message);
    }
}

function serverLoad() {
    function tryUrl(url) {
        return fetch(url)
            .then(function(r) { 
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json(); 
            })
            .then(function(data) {
                if (data.devices && data.connections) {
                    appState.devices = data.devices;
                    appState.connections = data.connections;
                    appState.nextDeviceId = data.nextDeviceId || 1;
                    console.log('Server load OK from:', url);
                    return true;
                }
                throw new Error('Invalid data structure');
            });
    }
    
    // FIXED: Proper promise chaining for fallback
    return tryUrl('data.php')
        .catch(function(err1) {
            console.log('data.php failed:', err1.message);
            return tryUrl('/data.php')
                .catch(function(err2) {
                    console.log('/data.php failed:', err2.message);
                    return tryUrl('/data')
                        .catch(function(err3) {
                            console.log('/data failed:', err3.message);
                            return tryUrl('data/network_manager.json')
                                .catch(function(err4) {
                                    console.log('data/network_manager.json failed:', err4.message);
                                    return tryUrl('/data/network_manager.json')
                                        .catch(function(err5) {
                                            console.warn('All server load endpoints failed');
                                            return false;
                                        });
                                });
                        });
                });
        });
}

function serverSave() {
    var payload = JSON.stringify({
        devices: appState.devices,
        connections: appState.connections,
        nextDeviceId: appState.nextDeviceId
    });
    
    function postUrl(url) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: payload
        }).then(function(r) {
            return r.json().then(function(data) {
                // Check for authentication required
                if (data.code === 'AUTH_REQUIRED' || r.status === 401) {
                    var authError = new Error('AUTH_REQUIRED');
                    authError.authRequired = true;
                    throw authError;
                }
                if (!r.ok) throw new Error('HTTP ' + r.status);
                if (data.error) throw new Error(data.error);
                return data;
            });
        });
    }
    
    // Try server endpoints in order: /data (Node.js), /data.php (fallback)
    // FIXED: Use correct endpoints that the Node.js server recognizes
    postUrl('/data')
        .then(function() {
            showSyncIndicator('saved', '✓ Server');
            console.log('Server save OK: /data');
        })
        .catch(function(err1) {
            // Check if auth required
            if (err1.authRequired) {
                showSyncIndicator('error', '🔒 Login required');
                if (typeof Auth !== 'undefined') {
                    Auth.showLoginModal();
                }
                return;
            }
            console.log('/data failed:', err1.message, '- trying /data.php');
            return postUrl('/data.php')
                .then(function() {
                    showSyncIndicator('saved', '✓ Server');
                    console.log('Server save OK: /data.php');
                })
                .catch(function(err2) {
                    // Check if auth required
                    if (err2.authRequired) {
                        showSyncIndicator('error', '🔒 Login required');
                        if (typeof Auth !== 'undefined') {
                            Auth.showLoginModal();
                        }
                        return;
                    }
                    // All endpoints failed - data is in localStorage only
                    console.warn('All server endpoints failed. Data saved to localStorage only.');
                    console.warn('Errors:', err1.message, err2.message);
                    showSyncIndicator('error', '⚠ Local only');
                });
        });
}

function loadFromStorage() {
    try {
        var d = localStorage.getItem('networkDevices');
        var c = localStorage.getItem('networkConnections');
        var n = localStorage.getItem('nextDeviceId');
        if (d) appState.devices = JSON.parse(d);
        if (c) appState.connections = JSON.parse(c);
        if (n) appState.nextDeviceId = parseInt(n, 10) || 1;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        Toast.error('Failed to load saved data');
    }
}

// ============================================================================
// RACK COLOR MANAGEMENT
// ============================================================================
function getRackColor(rackId) {
    if (!rackId) return '#64748b';
    if (!appState.rackColorMap[rackId]) {
        var idx = Object.keys(appState.rackColorMap).length % config.rackColors.length;
        appState.rackColorMap[rackId] = config.rackColors[idx];
    }
    return appState.rackColorMap[rackId];
}

function resetRackColors() {
    appState.rackColorMap = {};
    var racks = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var r = appState.devices[i].rackId;
        if (r && racks.indexOf(r) === -1) {
            racks.push(r);
        }
    }
    racks.sort();
    for (var j = 0; j < racks.length; j++) {
        appState.rackColorMap[racks[j]] = config.rackColors[j % config.rackColors.length];
    }
}

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================
function saveDevice() {
    // Require authentication for saving
    if (!requireAuth()) return;
    
    try {
        var editId = document.getElementById('deviceEditId').value;
        var rackId = document.getElementById('rackId').value.trim();
        var orderVal = document.getElementById('deviceOrder').value;
        var order = orderVal === '' ? 1 : parseInt(orderVal, 10);
        var isRear = document.getElementById('deviceRear').checked;
        var name = document.getElementById('deviceName').value.trim();
        var brandModel = document.getElementById('deviceBrandModel').value.trim();
        var type = document.getElementById('deviceType').value;
        var status = document.getElementById('deviceStatus').value;
        var service = document.getElementById('deviceService').value.trim();
        var notes = document.getElementById('deviceNotes').value.trim();
        
        // New fields: location, IPs (dynamic), links
        var location = document.getElementById('deviceLocation') ? document.getElementById('deviceLocation').value.trim() : '';
        
        // Get dynamic IP addresses
        var addresses = [];
        var ipContainer = document.getElementById('deviceIPContainer');
        if (ipContainer) {
            var ipFields = ipContainer.querySelectorAll('.ip-field');
            ipFields.forEach(function(field) {
                var value = field.value.trim();
                if (value) {
                    addresses.push({ network: value, ip: '', vlan: null });
                }
            });
        }
        
        var links = typeof DeviceLinks !== 'undefined' ? DeviceLinks.getLinks('deviceLinksContainer') : [];

        // Validation
        if (!rackId) {
            Toast.warning('Please enter Source');
            document.getElementById('rackId').focus();
            return;
        }
        if (!name) {
            Toast.warning('Please enter Device Name');
            document.getElementById('deviceName').focus();
            return;
        }
        if (!location) {
            Toast.warning('Please enter Location');
            document.getElementById('deviceLocation').focus();
            return;
        }

        // Parse ports
        var ports = [];
        var portRows = document.querySelectorAll('.port-type-row');
        portRows.forEach(function(row) {
            var typeSelect = row.querySelector('select');
            var qtyInput = row.querySelector('input[type="number"]');
            var zeroCheckbox = row.querySelector('input[type="checkbox"]');
            if (typeSelect && qtyInput) {
                var pType = typeSelect.value;
                var qty = parseInt(qtyInput.value, 10) || 0;
                var startAtZero = zeroCheckbox ? zeroCheckbox.checked : false;
                for (var k = 0; k < qty; k++) {
                    var portNum = startAtZero ? k : (k + 1);
                    var portName = pType + String(portNum).padStart(2, '0');
                    ports.push({ name: portName, type: pType, status: 'active' });
                }
            }
        });

        var deviceData = {
            id: editId ? parseInt(editId, 10) : appState.nextDeviceId++,
            rackId: rackId,
            rack: rackId, // alias for compatibility
            order: order,
            isRear: isRear,
            rear: isRear, // alias
            name: name,
            brandModel: brandModel,
            type: type,
            status: status,
            location: location,
            addresses: addresses, // Dynamic IP array
            links: links,
            service: service,
            ports: ports,
            notes: notes
        };

        var actionType = editId ? 'edit' : 'add';
        
        if (editId) {
            var idx = -1;
            for (var i = 0; i < appState.devices.length; i++) {
                if (appState.devices[i].id === parseInt(editId, 10)) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                appState.devices[idx] = deviceData;
                Toast.success('Device updated successfully');
            }
        } else {
            appState.devices.push(deviceData);
            Toast.success('Device added successfully');
        }
        
        // Log the action
        if (typeof ActivityLog !== 'undefined') {
            ActivityLog.add(actionType, 'device', name + ' (' + type + ')' + (location ? ' @ ' + location : ''));
        }

        clearDeviceForm();
        updateUI();
    } catch (e) {
        console.error('Error saving device:', e);
        Toast.error('Error saving device: ' + e.message);
    }
}

function clearDeviceForm() {
    document.getElementById('deviceEditId').value = '';
    document.getElementById('rackId').value = '';
    document.getElementById('deviceOrder').value = '00';
    document.getElementById('deviceRear').checked = false;
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceBrandModel').value = '';
    document.getElementById('deviceType').value = 'router';
    document.getElementById('deviceStatus').value = 'active';
    document.getElementById('deviceService').value = '';
    document.getElementById('deviceNotes').value = '';
    document.getElementById('portTypeQuantityContainer').innerHTML = '';
    
    // Clear new fields
    if (document.getElementById('deviceLocation')) document.getElementById('deviceLocation').value = '';
    
    // Reset IP container to one empty field
    var ipContainer = document.getElementById('deviceIPContainer');
    if (ipContainer) {
        ipContainer.innerHTML = '<input type="text" class="ip-field w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono" placeholder="192.168.1.1/24 or VLAN 10">';
    }
    
    if (document.getElementById('deviceLinksContainer')) document.getElementById('deviceLinksContainer').innerHTML = '';
    
    document.getElementById('saveDeviceButton').textContent = 'Add Device';
    document.getElementById('cancelDeviceButton').classList.add('hidden');
    highlightEditFields('device', false);
}

function editDevice(id) {
    // Require authentication for editing
    if (!requireAuth()) return;
    
    var d = null;
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            d = appState.devices[i];
            break;
        }
    }
    if (!d) return;

    switchTab('devices');

    document.getElementById('deviceEditId').value = d.id;
    document.getElementById('rackId').value = d.rackId || d.rack || '';
    document.getElementById('deviceOrder').value = String(d.order !== undefined ? d.order : 0).padStart(2, '0');
    document.getElementById('deviceRear').checked = d.isRear || d.rear || false;
    document.getElementById('deviceName').value = d.name || '';
    document.getElementById('deviceBrandModel').value = d.brandModel || '';
    document.getElementById('deviceType').value = d.type || 'router';
    document.getElementById('deviceStatus').value = d.status || 'active';
    document.getElementById('deviceService').value = d.service || '';
    document.getElementById('deviceNotes').value = d.notes || '';
    document.getElementById('saveDeviceButton').textContent = 'Update Device';

    // Fill new fields
    if (document.getElementById('deviceLocation')) {
        document.getElementById('deviceLocation').value = d.location || '';
    }
    
    // Fill IP addresses - supports both old (ip1-4) and new (addresses[]) formats
    var ipContainer = document.getElementById('deviceIPContainer');
    if (ipContainer) {
        ipContainer.innerHTML = '';
        var hasIPs = false;
        
        // Check for addresses[] array first (new/current format)
        if (d.addresses && d.addresses.length > 0) {
            d.addresses.forEach(function(addr) {
                var ipValue = addr.network || addr.ip || '';
                if (ipValue) {
                    hasIPs = true;
                    ipContainer.insertAdjacentHTML('beforeend', 
                        '<input type="text" class="ip-field w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono" value="' + escapeHtml(ipValue) + '" placeholder="192.168.1.1/24 or VLAN 10">');
                }
            });
        }
        // Fallback to old ip1-4 format for compatibility
        else if (d.ip1 || d.ip2 || d.ip3 || d.ip4) {
            [d.ip1, d.ip2, d.ip3, d.ip4].forEach(function(ip) {
                if (ip && ip.trim()) {
                    hasIPs = true;
                    ipContainer.insertAdjacentHTML('beforeend',
                        '<input type="text" class="ip-field w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono" value="' + escapeHtml(ip) + '" placeholder="192.168.1.1/24 or VLAN 10">');
                }
            });
        }
        
        // Add at least one empty field if no IPs
        if (!hasIPs) {
            ipContainer.innerHTML = '<input type="text" class="ip-field w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono" placeholder="192.168.1.1/24 or VLAN 10">';
        }
    }
    
    // Fill links
    if (typeof DeviceLinks !== 'undefined' && d.links) {
        DeviceLinks.setLinks('deviceLinksContainer', d.links);
    }

    var container = document.getElementById('portTypeQuantityContainer');
    container.innerHTML = '';

    if (d.ports && d.ports.length > 0) {
        var counts = {};
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            if (!counts[p.type]) {
                counts[p.type] = { qty: 0, startAtZero: false, firstPortNum: null };
            }
            var portNum = parseInt(p.name.replace(/\D/g, ''), 10);
            if (counts[p.type].firstPortNum === null || portNum < counts[p.type].firstPortNum) {
                counts[p.type].firstPortNum = portNum;
                counts[p.type].startAtZero = (portNum === 0);
            }
            counts[p.type].qty++;
        }

        var types = Object.keys(counts);
        for (var k = 0; k < types.length; k++) {
            var t = types[k];
            container.insertAdjacentHTML('beforeend', renderPortField(t, counts[t].qty, counts[t].startAtZero));
        }
    }

    highlightEditFields('device', true);
    
    // Show cancel button and update save button text
    document.getElementById('cancelDeviceButton').classList.remove('hidden');
    
    document.getElementById('rackId').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cancel device edit mode - resets form and hides cancel button
 */
function cancelDeviceEdit() {
    clearDeviceForm();
    document.getElementById('cancelDeviceButton').classList.add('hidden');
    Toast.info('Edit cancelled');
}

function removeDevice(id) {
    // Require authentication for deleting
    if (!requireAuth()) return;
    
    var deviceName = '';
    var deviceType = '';
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            deviceName = appState.devices[i].name;
            deviceType = appState.devices[i].type;
            break;
        }
    }
    
    if (!confirm('Remove device "' + deviceName + '"? This will also remove all its connections.')) return;

    appState.devices = appState.devices.filter(function(d) { return d.id !== id; });
    appState.connections = appState.connections.filter(function(c) { return c.from !== id && c.to !== id && c.fromDevice !== id && c.toDevice !== id; });
    
    // Log the action
    if (typeof ActivityLog !== 'undefined') {
        ActivityLog.add('delete', 'device', deviceName + ' (' + deviceType + ')');
    }
    
    clearDeviceForm();
    updateUI();
    Toast.success('Device "' + deviceName + '" removed');
}

function renderPortField(type, qty, startAtZero) {
    // Group port types by category
    var categories = {
        copper: { label: '🔌 Copper', types: [] },
        fiber: { label: '💎 Fiber/SFP', types: [] },
        wan: { label: '🌍 WAN', types: [] },
        management: { label: '⚙️ Management', types: [] },
        telecom: { label: '📞 Telecom', types: [] },
        legacy: { label: '📟 Legacy', types: [] },
        other: { label: '❓ Other', types: [] }
    };
    
    for (var i = 0; i < config.portTypes.length; i++) {
        var pt = config.portTypes[i];
        if (categories[pt.category]) {
            categories[pt.category].types.push(pt);
        }
    }
    
    var options = '';
    var catOrder = ['copper', 'fiber', 'wan', 'management', 'telecom', 'legacy', 'other'];
    for (var c = 0; c < catOrder.length; c++) {
        var cat = categories[catOrder[c]];
        if (cat.types.length > 0) {
            options += '<optgroup label="' + cat.label + '">';
            for (var j = 0; j < cat.types.length; j++) {
                var t = cat.types[j];
                var selected = (t.value === type || t.value.toLowerCase() === (type || '').toLowerCase()) ? ' selected' : '';
                options += '<option value="' + t.value + '"' + selected + '>' + t.icon + ' ' + t.label + '</option>';
            }
            options += '</optgroup>';
        }
    }
    
    var checked = startAtZero ? ' checked' : '';
    return '<div class="port-type-row flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">' +
        '<select class="px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white min-w-[140px]">' + options + '</select>' +
        '<div class="flex items-center gap-1">' +
        '<span class="text-xs text-slate-500">Qty:</span>' +
        '<input type="number" min="0" max="999" value="' + qty + '" class="w-14 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center font-semibold">' +
        '</div>' +
        '<label class="flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">' +
        '<input type="checkbox"' + checked + ' class="rounded border-slate-300 text-blue-600"> Start at 0</label>' +
        '<button type="button" onclick="removePortField(this)" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors">✕</button>' +
        '</div>';
}

function removePortField(btn) {
    var row = btn.closest('.port-type-row');
    if (row) row.remove();
}

function addPortTypeField() {
    var container = document.getElementById('portTypeQuantityContainer');
    container.insertAdjacentHTML('beforeend', renderPortField('eth', 1, false));
}

// Helper to get port type info by value
function getPortTypeInfo(value) {
    if (!value) return { value: 'others', label: 'Others', icon: '❓', category: 'other' };
    var normalizedValue = value.toLowerCase();
    for (var i = 0; i < config.portTypes.length; i++) {
        var pt = config.portTypes[i];
        if (pt.value === value || pt.value.toLowerCase() === normalizedValue) {
            return pt;
        }
    }
    // Legacy mapping for old data
    var legacyMap = {
        'eth': config.portTypes[0],
        'gbe': config.portTypes.find(function(p) { return p.value === 'GbE'; }),
        'poe': config.portTypes.find(function(p) { return p.value === 'PoE'; }),
        'fiber': config.portTypes.find(function(p) { return p.value === 'fiber'; }),
        'console': config.portTypes.find(function(p) { return p.value === 'TTY'; })
    };
    return legacyMap[normalizedValue] || { value: value, label: value, icon: '❓', category: 'other' };
}

// ============================================================================
// DEVICE ORDER FIELD MANAGEMENT
// ============================================================================

/**
 * Adjust device order value with circular behavior (00-99)
 * 00 = no position (loose items like network printers)
 * @param {number} delta - Amount to adjust (+1 or -1)
 */
function adjustDeviceOrder(delta) {
    var input = document.getElementById('deviceOrder');
    if (!input) return;
    
    var currentVal = parseInt(input.value) || 0;
    var newVal = currentVal + delta;
    
    // Circular behavior: 00 -> 99 when going down, 99 -> 00 when going up
    if (newVal < 0) {
        newVal = 99;
    } else if (newVal > 99) {
        newVal = 0;
    }
    
    // Format with leading zero
    input.value = String(newVal).padStart(2, '0');
}

/**
 * Format device order to always have 2 digits (00-99)
 * 00 = no position (loose items)
 */
function formatDeviceOrder() {
    var input = document.getElementById('deviceOrder');
    if (!input) return;
    
    // Remove non-numeric characters
    var val = input.value.replace(/[^0-9]/g, '');
    
    // Parse and clamp to 0-99
    var num = parseInt(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 99) num = 99;
    
    // Only update if finished typing (on change) or if invalid
    if (val.length >= 2 || val === '' || num.toString() !== val) {
        input.value = String(num).padStart(2, '0');
    }
}

/**
 * Toggle order between 00 and 99 when Rear checkbox changes
 * Front devices: start at 00 (or low numbers)
 * Rear devices: start at 99 (or high numbers)
 */
function toggleRearOrder() {
    var rearCheckbox = document.getElementById('deviceRear');
    var orderInput = document.getElementById('deviceOrder');
    if (!rearCheckbox || !orderInput) return;
    
    var currentVal = parseInt(orderInput.value) || 0;
    
    if (rearCheckbox.checked) {
        // Switching to Rear: if 00, change to 99
        if (currentVal === 0) {
            orderInput.value = '99';
        }
    } else {
        // Switching to Front: if 99, change to 00
        if (currentVal === 99) {
            orderInput.value = '00';
        }
    }
}

// ============================================================================
// IP ADDRESS MANAGEMENT (DYNAMIC)
// ============================================================================
function addIPField() {
    var container = document.getElementById('deviceIPContainer');
    if (container) {
        container.insertAdjacentHTML('beforeend', 
            '<div class="flex gap-1 items-center">' +
            '<input type="text" class="ip-field flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono" placeholder="192.168.1.1/24 or VLAN 10">' +
            '<button type="button" onclick="removeIPField(this)" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>' +
            '</div>');
    }
}

function removeIPField(btn) {
    var row = btn.closest('div');
    var container = document.getElementById('deviceIPContainer');
    // Keep at least one IP field
    if (container && container.children.length > 1 && row) {
        row.remove();
    }
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================
function saveConnection() {
    // Require authentication for saving
    if (!requireAuth()) return;
    
    try {
        var editIndex = document.getElementById('connEditIndex').value;
        var fromDeviceVal = document.getElementById('fromDevice').value;
        var fromPort = document.getElementById('fromPort').value;
        var toDeviceVal = document.getElementById('toDevice').value;
        var toPort = document.getElementById('toPort').value;
        var externalDest = document.getElementById('externalDest').value.trim();
        var type = document.getElementById('connType').value;
        var status = document.getElementById('connStatus').value;
        var cableMarker = document.getElementById('cableMarker').value.trim().toUpperCase();
        var cableColor = getCableColorValue(); // Use helper to get color (handles custom)
        var notes = document.getElementById('connNotes').value.trim();

        var from = fromDeviceVal ? parseInt(fromDeviceVal, 10) : null;
        var isExternal = (toDeviceVal === 'external');
        var isWallJack = (toDeviceVal === 'walljack');
        var to = (toDeviceVal && !isExternal && !isWallJack) ? parseInt(toDeviceVal, 10) : null;

        // Validation
        if (!from) {
            Toast.warning('Please select source device');
            document.getElementById('fromDevice').focus();
            return;
        }

        // Must have either a destination device, wall jack, or external
        if (!to && !isExternal && !isWallJack) {
            Toast.warning('Please select destination device, Wall Jack, or External');
            document.getElementById('toDevice').focus();
            return;
        }

        if ((isExternal || isWallJack) && !externalDest) {
            var destType = isWallJack ? 'Wall Jack location (e.g., Room 101, Reception)' : 'external destination name';
            Toast.warning('Please enter ' + destType);
            document.getElementById('externalDest').focus();
            return;
        }
        
        var fromDevice = null;
        var toDevice = null;
        for (var i = 0; i < appState.devices.length; i++) {
            if (appState.devices[i].id === from) fromDevice = appState.devices[i];
            if (appState.devices[i].id === to) toDevice = appState.devices[i];
        }

        if (from) {
            var canSkipFromPort = fromDevice && (fromDevice.status === 'disabled' || fromDevice.type === 'isp' || fromDevice.type === 'others');
            if (!canSkipFromPort && !fromPort) {
                Toast.warning('Please select source port');
                document.getElementById('fromPort').focus();
                return;
            }
        }

        if (to && !isExternal) {
            var canSkipToPort = toDevice && (toDevice.status === 'disabled' || toDevice.type === 'isp' || toDevice.type === 'others');
            if (!canSkipToPort && !toPort) {
                Toast.warning('Please select destination port');
                document.getElementById('toPort').focus();
                return;
            }
        }

        if (from && to && from === to) {
            Toast.error('Source and destination cannot be the same device');
            return;
        }

        // Check port usage - using isPortUsed function which handles patch panel/walljack logic
        var excludeIdx = editIndex !== '' ? parseInt(editIndex, 10) : undefined;
        
        if (from && fromPort && isPortUsed(from, fromPort, excludeIdx)) {
            // Check if it's a patch panel or walljack that already has 2 connections
            var fromDeviceType = fromDevice ? fromDevice.type : '';
            if (fromDeviceType === 'patch' || fromDeviceType === 'walljack') {
                Toast.error('Porta già ha 2 connessioni (fronte e retro)');
            } else {
                Toast.error('Porta sorgente già in uso');
            }
            return;
        }
        
        if (to && toPort && isPortUsed(to, toPort, excludeIdx)) {
            var toDeviceType = toDevice ? toDevice.type : '';
            if (toDeviceType === 'patch' || toDeviceType === 'walljack') {
                Toast.error('Porta già ha 2 connessioni (fronte e retro)');
            } else {
                Toast.error('Porta destinazione già in uso');
            }
            return;
        }

        var connData = {
            from: from,
            fromPort: fromPort || '',
            to: to,
            toPort: (isExternal || isWallJack) ? '' : (toPort || ''),
            externalDest: (isExternal || isWallJack) ? externalDest : '',
            isWallJack: isWallJack,
            type: isWallJack ? 'wallport' : type,
            color: config.connColors[isWallJack ? 'wallport' : type],
            status: status,
            cableMarker: cableMarker,
            cableColor: cableColor,
            notes: notes
        };

        var actionType = editIndex !== '' ? 'edit' : 'add';
        var logDetails = (fromDevice ? fromDevice.name : 'Device ' + from) + ':' + (fromPort || '-') + ' → ' +
            (toDevice ? toDevice.name : (externalDest || 'Device ' + to)) + ':' + (toPort || '-');

        if (editIndex !== '') {
            appState.connections[parseInt(editIndex, 10)] = connData;
            Toast.success('Connection updated successfully');
        } else {
            appState.connections.push(connData);
            Toast.success('Connection added successfully');
        }
        
        // Log the action
        if (typeof ActivityLog !== 'undefined') {
            ActivityLog.add(actionType, 'connection', logDetails);
        }

        clearConnectionForm();
        updateUI();
    } catch (e) {
        console.error('Error saving connection:', e);
        Toast.error('Error saving connection: ' + e.message);
    }
}

function editConnection(idx) {
    // Require authentication for editing
    if (!requireAuth()) return;
    
    var c = appState.connections[idx];
    if (!c) return;

    switchTab('active');

    document.getElementById('connEditIndex').value = idx;
    
    // Get the source device to set location and group filters
    var fromDevice = null;
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === c.from) {
            fromDevice = appState.devices[i];
            break;
        }
    }
    
    if (fromDevice) {
        // Set location and group filters for source
        document.getElementById('fromLocation').value = fromDevice.location || '';
        updateFromGroups(fromDevice.rackId);
        document.getElementById('fromGroup').value = fromDevice.rackId;
        updateFromDevices(c.from);
        document.getElementById('fromDevice').value = c.from;
        updateFromPorts(c.fromPort);
    }
    
    if (c.isWallJack) {
        // Reset destination filters for special destination
        document.getElementById('toLocation').value = '';
        updateToGroups();
        document.getElementById('toDevice').value = 'walljack';
        document.getElementById('externalDest').value = c.externalDest;
        toggleExternalDest();
    } else if (c.externalDest && !c.to) {
        document.getElementById('toLocation').value = '';
        updateToGroups();
        document.getElementById('toDevice').value = 'external';
        document.getElementById('externalDest').value = c.externalDest;
        toggleExternalDest();
    } else {
        // Get the destination device to set location and group filters
        var toDevice = null;
        for (var j = 0; j < appState.devices.length; j++) {
            if (appState.devices[j].id === c.to) {
                toDevice = appState.devices[j];
                break;
            }
        }
        
        if (toDevice) {
            document.getElementById('toLocation').value = toDevice.location || '';
            updateToGroups(toDevice.rackId);
            document.getElementById('toGroup').value = toDevice.rackId;
            updateToDevices(c.to);
            document.getElementById('toDevice').value = c.to;
            updateToPorts(c.toPort);
        }
        toggleExternalDest();
    }
    
    document.getElementById('connType').value = c.type;
    document.getElementById('connStatus').value = c.status;
    document.getElementById('cableMarker').value = c.cableMarker || '';
    
    // Set cable color (handle custom colors)
    var colorSelect = document.getElementById('cableColor');
    var colorPicker = document.getElementById('cableColorPicker');
    var savedColor = c.cableColor || '';
    
    if (savedColor) {
        // Check if it's a predefined color
        var found = false;
        for (var i = 0; i < colorSelect.options.length; i++) {
            if (colorSelect.options[i].value.toLowerCase() === savedColor.toLowerCase()) {
                colorSelect.value = colorSelect.options[i].value;
                colorPicker.value = savedColor;
                found = true;
                break;
            }
        }
        if (!found) {
            // Custom color
            colorSelect.value = 'custom';
            colorPicker.value = savedColor;
        }
    } else {
        colorSelect.value = '';
        colorPicker.value = '#000000';
    }
    
    document.getElementById('connNotes').value = c.notes || '';

    document.getElementById('connectionFormTitle').textContent = 'Edit Connection';
    document.getElementById('saveConnectionButton').textContent = 'Update';
    document.getElementById('cancelConnectionButton').classList.remove('hidden');

    highlightEditFields('connection', true);

    setTimeout(function() {
        document.getElementById('connectionFormTitle').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function cancelConnectionEdit() {
    clearConnectionForm();
}

function clearConnectionForm() {
    document.getElementById('connEditIndex').value = '';
    
    // Reset cascading filters
    document.getElementById('fromLocation').value = '';
    document.getElementById('toLocation').value = '';
    updateFromGroups();
    updateToGroups();
    
    document.getElementById('fromDevice').value = '';
    document.getElementById('fromPort').innerHTML = '<option value="">Port</option>';
    document.getElementById('toDevice').value = '';
    document.getElementById('toPort').innerHTML = '<option value="">Port</option>';
    document.getElementById('externalDest').value = '';
    toggleExternalDest();
    document.getElementById('connType').value = 'lan';
    document.getElementById('connStatus').value = 'active';
    document.getElementById('cableMarker').value = '';
    document.getElementById('cableColor').value = '';
    document.getElementById('cableColorPicker').value = '#000000';
    document.getElementById('connNotes').value = '';

    document.getElementById('connectionFormTitle').textContent = 'Add Connection';
    document.getElementById('saveConnectionButton').textContent = '+ Add';
    document.getElementById('cancelConnectionButton').classList.add('hidden');

    highlightEditFields('connection', false);
}

/**
 * Sync color picker when dropdown changes
 */
function syncCableColorInput() {
    var select = document.getElementById('cableColor');
    var picker = document.getElementById('cableColorPicker');
    if (select.value === 'custom') {
        // Keep current picker value, user will choose
        picker.click();
    } else if (select.value) {
        picker.value = select.value;
    }
}

/**
 * Sync dropdown when color picker changes
 */
function syncCableColorFromPicker() {
    var picker = document.getElementById('cableColorPicker');
    var select = document.getElementById('cableColor');
    var color = picker.value;
    
    // Check if color matches any option
    var found = false;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value.toLowerCase() === color.toLowerCase()) {
            select.value = select.options[i].value;
            found = true;
            break;
        }
    }
    
    if (!found) {
        // Set to custom and store the value
        select.value = 'custom';
    }
}

/**
 * Get the actual cable color value (handles custom colors)
 */
function getCableColorValue() {
    var select = document.getElementById('cableColor');
    var picker = document.getElementById('cableColorPicker');
    if (select.value === 'custom') {
        return picker.value;
    }
    return select.value;
}

function removeConnection(idx) {
    // Require authentication for deleting
    if (!requireAuth()) return;
    
    if (!confirm('Remove this connection?')) return;
    
    var conn = appState.connections[idx];
    var logDetails = '';
    if (conn) {
        var fromDevice = appState.devices.find(function(d) { return d.id === conn.from || d.id === conn.fromDevice; });
        var toDevice = appState.devices.find(function(d) { return d.id === conn.to || d.id === conn.toDevice; });
        logDetails = (fromDevice ? fromDevice.name : 'Unknown') + ' → ' + (toDevice ? toDevice.name : conn.externalDest || 'Unknown');
    }
    
    appState.connections.splice(idx, 1);
    
    // Log the action
    if (typeof ActivityLog !== 'undefined') {
        ActivityLog.add('delete', 'connection', logDetails);
    }
    
    clearConnectionForm();
    updateUI();
    Toast.success('Connection removed');
}

function toggleExternalDest() {
    var toDevice = document.getElementById('toDevice').value;
    var toPortContainer = document.getElementById('toPortContainer');
    var externalDestContainer = document.getElementById('externalDestContainer');
    var externalDestLabel = document.querySelector('#externalDestContainer label');
    var externalDestInput = document.getElementById('externalDest');
    
    if (toDevice === 'external') {
        toPortContainer.classList.add('hidden');
        externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = 'External Destination';
        if (externalDestInput) externalDestInput.placeholder = 'ISP Name, Fiber Provider...';
    } else if (toDevice === 'walljack') {
        toPortContainer.classList.add('hidden');
        externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = 'Wall Jack Location';
        if (externalDestInput) externalDestInput.placeholder = 'Room 101, Reception, Office A...';
    } else {
        toPortContainer.classList.remove('hidden');
        externalDestContainer.classList.add('hidden');
    }
}

function isPortUsed(deviceId, portName, excludeConnIdx) {
    // Get device to check if it's a patch panel
    var device = null;
    for (var d = 0; d < appState.devices.length; d++) {
        if (appState.devices[d].id === deviceId) {
            device = appState.devices[d];
            break;
        }
    }
    
    // Patch panels and wall jacks can have 2 connections per port (front and back)
    // Example: Wall jack connects to patch panel port 19 (back)
    //          Switch connects to patch panel port 19 (front)
    // Wall jack example: Printer → Wall Jack port A → Patch Panel port 15
    var isPassthrough = device && (device.type === 'patch' || device.type === 'walljack');
    var maxConnections = isPassthrough ? 2 : 1;
    var connectionCount = 0;
    
    for (var i = 0; i < appState.connections.length; i++) {
        if (typeof excludeConnIdx !== 'undefined' && i === excludeConnIdx) continue;
        var c = appState.connections[i];
        if ((c.from === deviceId && c.fromPort === portName) || (c.to === deviceId && c.toPort === portName)) {
            connectionCount++;
        }
    }
    
    return connectionCount >= maxConnections;
}

// ============================================================================
// CASCADING SELECTION FOR CONNECTION FORM
// ============================================================================

/**
 * Get unique locations from all devices
 */
function getUniqueLocations() {
    var locations = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        var loc = d.location || 'No Location';
        if (locations.indexOf(loc) === -1) {
            locations.push(loc);
        }
    }
    return locations.sort();
}

/**
 * Get unique groups (rackIds) optionally filtered by location
 */
function getGroupsByLocation(location) {
    var groups = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        var deviceLoc = d.location || 'No Location';
        if (!location || location === '' || deviceLoc === location) {
            if (groups.indexOf(d.rackId) === -1) {
                groups.push(d.rackId);
            }
        }
    }
    return groups.sort();
}

/**
 * Get devices filtered by location and group
 */
function getDevicesByLocationAndGroup(location, group) {
    var devices = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        var deviceLoc = d.location || 'No Location';
        var matchLoc = !location || location === '' || deviceLoc === location;
        var matchGroup = !group || group === '' || d.rackId === group;
        if (matchLoc && matchGroup) {
            devices.push(d);
        }
    }
    // Sort by rackId then order
    return devices.sort(function(a, b) {
        if (a.rackId < b.rackId) return -1;
        if (a.rackId > b.rackId) return 1;
        return (a.order || 0) - (b.order || 0);
    });
}

/**
 * Initialize location dropdowns for connection form
 */
function initConnectionFormLocations() {
    var locations = getUniqueLocations();
    var fromLoc = document.getElementById('fromLocation');
    var toLoc = document.getElementById('toLocation');
    
    if (!fromLoc || !toLoc) return;
    
    var opts = '<option value="">All</option>';
    for (var i = 0; i < locations.length; i++) {
        opts += '<option value="' + locations[i] + '">' + locations[i] + '</option>';
    }
    
    fromLoc.innerHTML = opts;
    toLoc.innerHTML = opts;
    
    // Initialize cascading
    updateFromGroups();
    updateToGroups();
}

/**
 * Update Source Groups based on selected Location
 */
function updateFromGroups(selectedGroup) {
    var location = document.getElementById('fromLocation').value;
    var groups = getGroupsByLocation(location);
    var sel = document.getElementById('fromGroup');
    
    var opts = '<option value="">All</option>';
    for (var i = 0; i < groups.length; i++) {
        var selected = (selectedGroup === groups[i]) ? ' selected' : '';
        var color = getRackColor(groups[i]);
        opts += '<option value="' + groups[i] + '" style="color:' + color + ';font-weight:bold;"' + selected + '>' + groups[i] + '</option>';
    }
    sel.innerHTML = opts;
    
    updateFromDevices();
}

/**
 * Update Destination Groups based on selected Location
 */
function updateToGroups(selectedGroup) {
    var location = document.getElementById('toLocation').value;
    var groups = getGroupsByLocation(location);
    var sel = document.getElementById('toGroup');
    
    var opts = '<option value="">All</option>';
    for (var i = 0; i < groups.length; i++) {
        var selected = (selectedGroup === groups[i]) ? ' selected' : '';
        var color = getRackColor(groups[i]);
        opts += '<option value="' + groups[i] + '" style="color:' + color + ';font-weight:bold;"' + selected + '>' + groups[i] + '</option>';
    }
    sel.innerHTML = opts;
    
    updateToDevices();
}

/**
 * Update Source Devices based on selected Location and Group
 */
function updateFromDevices(selectedDeviceId) {
    var location = document.getElementById('fromLocation').value;
    var group = document.getElementById('fromGroup').value;
    var devices = getDevicesByLocationAndGroup(location, group);
    var sel = document.getElementById('fromDevice');
    
    var opts = '<option value="">Select...</option>';
    for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var rackColor = getRackColor(d.rackId);
        var statusPrefix = (d.status === 'disabled') ? '✗ ' : '';
        var rearIndicator = d.isRear ? ' ↩' : '';
        var selected = (selectedDeviceId && d.id === selectedDeviceId) ? ' selected' : '';
        var statusStyle = 'color:' + rackColor + ';font-weight:bold;';
        // Show only order and name (group already selected)
        opts += '<option value="' + d.id + '" style="' + statusStyle + '"' + selected + '>' + statusPrefix + '[' + String(d.order).padStart(2, '0') + '] ' + d.name + rearIndicator + '</option>';
    }
    sel.innerHTML = opts;
    
    // Reset port
    document.getElementById('fromPort').innerHTML = '<option value="">Port</option>';
    
    // If a device was pre-selected, update ports
    if (selectedDeviceId) {
        updateFromPorts();
    }
}

/**
 * Update Destination Devices based on selected Location and Group
 */
function updateToDevices(selectedDeviceId) {
    var location = document.getElementById('toLocation').value;
    var group = document.getElementById('toGroup').value;
    var devices = getDevicesByLocationAndGroup(location, group);
    var sel = document.getElementById('toDevice');
    
    var opts = '<option value="">Select...</option>';
    for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var rackColor = getRackColor(d.rackId);
        var statusPrefix = (d.status === 'disabled') ? '✗ ' : '';
        var rearIndicator = d.isRear ? ' ↩' : '';
        var selected = (selectedDeviceId && d.id === selectedDeviceId) ? ' selected' : '';
        var statusStyle = 'color:' + rackColor + ';font-weight:bold;';
        // Show only order and name (group already selected)
        opts += '<option value="' + d.id + '" style="' + statusStyle + '"' + selected + '>' + statusPrefix + '[' + String(d.order).padStart(2, '0') + '] ' + d.name + rearIndicator + '</option>';
    }
    
    // Special destinations
    opts += '<option disabled style="font-size:10px;color:#94a3b8;">── Special ──</option>';
    opts += '<option value="walljack" style="color:#7c3aed;font-weight:bold;">🔌 Wall Jack / Presa LAN</option>';
    opts += '<option value="external" style="color:#dc2626;font-weight:bold;">📡 External (ISP/WAN)</option>';
    
    sel.innerHTML = opts;
    
    // Reset port
    document.getElementById('toPort').innerHTML = '<option value="">Port</option>';
    
    // If a device was pre-selected, update ports
    if (selectedDeviceId) {
        updateToPorts();
        toggleExternalDest();
    }
}

function updateFromPorts(selectedPort) {
    var id = parseInt(document.getElementById('fromDevice').value, 10);
    var d = null;
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            d = appState.devices[i];
            break;
        }
    }
    var sel = document.getElementById('fromPort');
    sel.innerHTML = '<option value="">Seleziona porta sorgente</option>';
    if (d && d.ports) {
        var editIdx = document.getElementById('connEditIndex').value;
        var excludeIdx = editIdx !== '' ? parseInt(editIdx, 10) : undefined;
        var isPassthrough = d.type === 'patch' || d.type === 'walljack';
        
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var portInfo = getPortTypeInfo(p.type);
            var icon = portInfo.icon || '🔌';
            var label;
            
            if (isPassthrough) {
                // Count current connections for patch panel/walljack port
                var connCount = getPortConnectionCount(id, p.name, excludeIdx);
                if (connCount === 0) {
                    label = icon + ' ' + p.name + ' (Libera)';
                } else if (connCount === 1) {
                    label = icon + ' ' + p.name + ' (1/2 - disponibile)';
                } else {
                    label = icon + ' ' + p.name + ' (2/2 - completa)';
                }
            } else {
                label = icon + ' ' + p.name + ' ' + (used ? '(In uso)' : '(Libera)');
            }
            
            var selected = (selectedPort === p.name) ? 'selected' : '';
            sel.innerHTML += '<option value="' + p.name + '" ' + selected + '>' + label + '</option>';
        }
    }
}

function updateToPorts(selectedPort) {
    var id = parseInt(document.getElementById('toDevice').value, 10);
    var d = null;
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            d = appState.devices[i];
            break;
        }
    }
    var sel = document.getElementById('toPort');
    sel.innerHTML = '<option value="">Seleziona porta destinazione</option>';
    if (d && d.ports) {
        var editIdx = document.getElementById('connEditIndex').value;
        var excludeIdx = editIdx !== '' ? parseInt(editIdx, 10) : undefined;
        var isPassthrough = d.type === 'patch' || d.type === 'walljack';
        
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var portInfo = getPortTypeInfo(p.type);
            var icon = portInfo.icon || '🔌';
            var label;
            
            if (isPassthrough) {
                var connCount = getPortConnectionCount(id, p.name, excludeIdx);
                if (connCount === 0) {
                    label = icon + ' ' + p.name + ' (Libera)';
                } else if (connCount === 1) {
                    label = icon + ' ' + p.name + ' (1/2 - disponibile)';
                } else {
                    label = icon + ' ' + p.name + ' (2/2 - completa)';
                }
            } else {
                label = icon + ' ' + p.name + ' ' + (used ? '(In uso)' : '(Libera)');
            }
            
            var selected = (selectedPort === p.name) ? 'selected' : '';
            sel.innerHTML += '<option value="' + p.name + '" ' + selected + '>' + label + '</option>';
        }
    }
}

/**
 * Helper function to count connections on a specific port
 */
function getPortConnectionCount(deviceId, portName, excludeConnIdx) {
    var count = 0;
    for (var i = 0; i < appState.connections.length; i++) {
        if (typeof excludeConnIdx !== 'undefined' && i === excludeConnIdx) continue;
        var c = appState.connections[i];
        if ((c.from === deviceId && c.fromPort === portName) || (c.to === deviceId && c.toPort === portName)) {
            count++;
        }
    }
    return count;
}

// ============================================================================
// UI UPDATES
// ============================================================================
function getSorted() {
    return appState.devices.slice().sort(function(a, b) {
        if (a.rackId < b.rackId) return -1;
        if (a.rackId > b.rackId) return 1;
        return (a.order || 0) - (b.order || 0);
    });
}

function updateUI() {
    resetRackColors();
    updateRackIdDatalist();
    updateDevicesList();
    updateDeviceSelects();
    updateMatrix();
    updateConnectionsList();
    // REMOVED: saveToStorage() - was causing login modal to appear on page load
    // Data should only be saved manually via "Save Now" button or after explicit user actions
    
    // Update global counters in header
    updateGlobalCounters();
    
    // Update location filter dropdown
    if (typeof LocationFilter !== 'undefined') {
        LocationFilter.update();
    }
    
    // Update Matrix location and group filters
    if (typeof updateMatrixLocationFilter === 'function') {
        updateMatrixLocationFilter();
    }
}

function updateGlobalCounters() {
    // Legacy IDs for backwards compatibility
    var locationsCount = document.getElementById('totalLocationsCount');
    var devicesCount = document.getElementById('totalDevicesCount');
    var connectionsCount = document.getElementById('totalConnectionsCount');
    
    // Check if there's an active location filter
    var locationFilter = appState.deviceFilters.location;
    
    // Count unique locations (always from all devices)
    if (locationsCount) {
        var uniqueLocations = [];
        for (var i = 0; i < appState.devices.length; i++) {
            var loc = appState.devices[i].location;
            if (loc && uniqueLocations.indexOf(loc) === -1) {
                uniqueLocations.push(loc);
            }
        }
        locationsCount.textContent = uniqueLocations.length;
    }
    
    // Show filtered counts when location filter is active
    if (locationFilter) {
        var filteredDevices = getFilteredDevices();
        var filteredConnections = getFilteredConnections();
        if (devicesCount) {
            devicesCount.textContent = filteredDevices.length;
        }
        if (connectionsCount) {
            connectionsCount.textContent = filteredConnections.length;
        }
    } else {
        // No filter - show totals
        if (devicesCount) {
            devicesCount.textContent = appState.devices.length;
        }
        if (connectionsCount) {
            connectionsCount.textContent = appState.connections.length;
        }
    }
}

function updateRackIdDatalist() {
    var datalist = document.getElementById('rackIdList');
    if (!datalist) return;
    var racks = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var r = appState.devices[i].rackId;
        if (r && racks.indexOf(r) === -1) {
            racks.push(r);
        }
    }
    racks.sort();
    datalist.innerHTML = '';
    for (var j = 0; j < racks.length; j++) {
        datalist.innerHTML += '<option value="' + racks[j] + '">';
    }
}

function updateDeviceSelects() {
    // Initialize cascading location dropdowns
    initConnectionFormLocations();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function parseAddresses(text) {
    if (!text) return [];
    var lines = text.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var parts = line.split(',');
        var trimmedParts = [];
        for (var j = 0; j < parts.length; j++) {
            trimmedParts.push(parts[j].trim());
        }
        var hasContent = false;
        for (var k = 0; k < trimmedParts.length; k++) {
            if (trimmedParts[k]) {
                hasContent = true;
                break;
            }
        }
        if (hasContent) {
            result.push({
                network: trimmedParts[0] || '',
                ip: trimmedParts[1] || '',
                vlan: trimmedParts[2] ? parseInt(trimmedParts[2], 10) : null
            });
        }
    }
    return result;
}

function formatAddresses(addrs) {
    if (!addrs || addrs.length === 0) return '';
    var lines = [];
    for (var i = 0; i < addrs.length; i++) {
        var a = addrs[i];
        var parts = [];
        if (a.network) parts.push(a.network);
        if (a.ip) parts.push(a.ip);
        if (a.vlan) parts.push(String(a.vlan));
        if (parts.length > 0) {
            lines.push(parts.join(', '));
        }
    }
    return lines.join('\n');
}

function createMarkerHtml(marker, color, forMatrix) {
    if (!marker) return '';
    var markerBg = color || '#ffffff';
    var markerTextColor = (markerBg === '#ffffff' || markerBg === '' || markerBg === '#eab308') ? '#000000' : '#ffffff';
    var fontSize = forMatrix ? '9px' : '10px';
    var padding = forMatrix ? '2px 4px' : '2px 6px';
    var borderColor = '#000000';
    return '<span style="display:inline-flex;align-items:center;justify-content:center;padding:' + padding + ';border-radius:10px;background-color:' + markerBg + ';color:' + markerTextColor + ';font-weight:bold;font-size:' + fontSize + ';border:2px solid ' + borderColor + ';text-transform:uppercase;line-height:1;box-sizing:border-box;white-space:nowrap;">' + marker.toUpperCase() + '</span>';
}

function getConnectionIndex(rowId, colId) {
    for (var i = 0; i < appState.connections.length; i++) {
        var c = appState.connections[i];
        if ((c.from === rowId && c.to === colId) || (c.from === colId && c.to === rowId)) {
            return i;
        }
    }
    return -1;
}

function toggleMatrix() {
    appState.matrixExpanded = !appState.matrixExpanded;
    var btn = document.getElementById('toggleMatrixBtn');
    if (btn) btn.textContent = appState.matrixExpanded ? 'Show Summary' : 'Show All';
    updateMatrix();
}

function toggleConnSort(key, event) {
    // Multi-level sorting: Shift+Click adds a level, regular click resets
    var isShiftClick = event && event.shiftKey;
    
    if (isShiftClick && appState.connSort.length < 3) {
        // Check if this key is already in the sort
        var existingIndex = -1;
        for (var i = 0; i < appState.connSort.length; i++) {
            if (appState.connSort[i].key === key) {
                existingIndex = i;
                break;
            }
        }
        
        if (existingIndex >= 0) {
            // Toggle direction
            appState.connSort[existingIndex].asc = !appState.connSort[existingIndex].asc;
        } else {
            // Add new sort level
            appState.connSort.push({ key: key, asc: true });
        }
    } else {
        // Regular click: check if this is the primary sort
        if (appState.connSort.length === 1 && appState.connSort[0].key === key) {
            // Toggle direction
            appState.connSort[0].asc = !appState.connSort[0].asc;
        } else {
            // Reset to single sort on this column
            appState.connSort = [{ key: key, asc: true }];
        }
    }
    updateConnectionsList();
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================
function exportJSON() {
    var data = JSON.stringify({
        devices: appState.devices,
        connections: appState.connections,
        nextDeviceId: appState.nextDeviceId
    }, null, 2);
    
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var filename = 'network_manager_' + new Date().toISOString().slice(0,10) + '.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Log the export
    if (typeof ActivityLog !== 'undefined') {
        ActivityLog.add('export', 'export', 'Exported ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections to ' + filename);
    }
    
    Toast.success('JSON exported successfully');
}

function importData(e) {
    // Require authentication for importing
    if (!requireAuth()) {
        e.target.value = '';
        return;
    }
    
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            var data = JSON.parse(ev.target.result);
            
            // Validate structure
            if (!data.devices || !Array.isArray(data.devices)) {
                Toast.error('Invalid JSON: missing or invalid "devices" array');
                return;
            }
            if (!data.connections || !Array.isArray(data.connections)) {
                Toast.error('Invalid JSON: missing or invalid "connections" array');
                return;
            }
            
            // Validate each device has required fields and correct types
            for (var i = 0; i < data.devices.length; i++) {
                var d = data.devices[i];
                // Check required fields exist
                if (!d.id || (!d.rackId && !d.rack) || !d.name || !d.type || !d.status || !d.ports) {
                    Toast.error('Invalid device at index ' + i + ': missing required fields (id, rackId/rack, name, type, status, ports)');
                    return;
                }
                // Validate data types
                if (typeof d.id !== 'number') {
                    Toast.error('Invalid device at index ' + i + ': id must be a number');
                    return;
                }
                if (typeof d.name !== 'string') {
                    Toast.error('Invalid device at index ' + i + ': name must be a string');
                    return;
                }
                if (!Array.isArray(d.ports)) {
                    Toast.error('Invalid device at index ' + i + ': ports must be an array');
                    return;
                }
                // Normalize rackId for compatibility
                if (!d.rackId && d.rack) {
                    d.rackId = d.rack;
                }
            }
            
            // Validate each connection has required fields and correct types
            for (var j = 0; j < data.connections.length; j++) {
                var c = data.connections[j];
                if (typeof c.from !== 'number' || !c.type || !c.status) {
                    Toast.error('Invalid connection at index ' + j + ': missing required fields (from, type, status)');
                    return;
                }
                // Validate 'to' is number or null (for external connections)
                if (c.to !== null && c.to !== undefined && typeof c.to !== 'number') {
                    Toast.error('Invalid connection at index ' + j + ': to must be a number or null');
                    return;
                }
            }
            
            // All validations passed - import data
            appState.devices = data.devices;
            appState.connections = data.connections;
            
            // Calculate nextDeviceId
            if (data.nextDeviceId && typeof data.nextDeviceId === 'number') {
                appState.nextDeviceId = data.nextDeviceId;
            } else {
                var maxId = 0;
                for (var k = 0; k < appState.devices.length; k++) {
                    if (appState.devices[k].id > maxId) maxId = appState.devices[k].id;
                }
                appState.nextDeviceId = maxId + 1;
            }
            
            // Log the import
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('import', 'import', 'Imported ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections from ' + file.name);
            }
            
            // Save to storage and server
            saveToStorage();
            updateUI();
            Toast.success('Imported: ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections');
            
        } catch (err) {
            console.error('Error importing data:', err);
            Toast.error('Error importing: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

/**
 * Clear All with mandatory backup download and admin password confirmation
 */
function clearAll() {
    // Require authentication first
    if (!requireAuth()) return;
    
    // Step 1: Show mandatory backup dialog
    var backupConfirmed = confirm(
        '⚠️ CLEAR ALL DATA\n\n' +
        'This action will DELETE all devices and connections.\n\n' +
        'MANDATORY: You must download a backup first.\n\n' +
        'Click OK to download backup, then enter admin password.'
    );
    
    if (!backupConfirmed) {
        Toast.info('Clear all cancelled');
        return;
    }
    
    // Step 2: Force backup download
    var data = {
        devices: appState.devices,
        connections: appState.connections,
        nextDeviceId: appState.nextDeviceId,
        exportedAt: new Date().toISOString(),
        backupReason: 'Pre-Clear All Backup'
    };
    
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'matrix-backup-' + new Date().toISOString().slice(0, 10) + '-pre-clear.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Toast.info('Backup downloaded. Now enter admin password...');
    
    // Step 3: Ask for admin password
    setTimeout(function() {
        var password = prompt(
            'CONFIRM CLEAR ALL\n\n' +
            'Enter admin password to confirm deletion of ALL data:\n' +
            '(' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections)'
        );
        
        if (!password) {
            Toast.info('Clear all cancelled - no password entered');
            return;
        }
        
        // Verify password via PHP
        var formData = new FormData();
        formData.append('action', 'verify_password');
        formData.append('password', password);
        
        fetch('data.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.valid) {
                // Password correct - proceed with clear
                var deviceCount = appState.devices.length;
                var connCount = appState.connections.length;
                
                appState.devices = [];
                appState.connections = [];
                appState.nextDeviceId = 1;
                
                // Log the action
                if (typeof ActivityLog !== 'undefined') {
                    ActivityLog.add('clear', 'system', 'Cleared all data: ' + deviceCount + ' devices, ' + connCount + ' connections (backup downloaded)');
                }
                
                clearConnectionForm();
                clearDeviceForm();
                updateUI();
                Toast.success('All data cleared successfully');
            } else {
                Toast.error('Invalid admin password. Clear all cancelled.');
            }
        })
        .catch(function(err) {
            console.error('Password verification error:', err);
            Toast.error('Error verifying password. Clear all cancelled.');
        });
    }, 500);
}

// ============================================================================
// PRINT FUNCTIONS
// ============================================================================
function getPrintStyles() {
    return '<style>' +
        /* Global print settings */
        '@media print {' +
        '  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }' +
        '  .no-print, .print-hide-id { display: none !important; }' +
        '  @page { size: landscape; margin: 8mm; }' +
        '}' +
        /* Hide elements */
        '.no-print { display: none !important; }' +
        '.print-hide-id { display: none !important; }' +
        /* Body and headers */
        'body { font-family: Arial, sans-serif; padding: 12px; margin: 0; font-size: 11px; background: white; }' +
        'h2 { font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #1e293b; }' +
        /* Table base styles */
        'table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }' +
        'th, td { border: 1px solid #475569; padding: 5px 8px; text-align: left; vertical-align: middle; }' +
        'thead th { background-color: #1e293b !important; color: #ffffff !important; font-weight: bold; font-size: 9px; text-transform: uppercase; }' +
        'tbody tr:nth-child(odd) { background-color: #ffffff !important; }' +
        'tbody tr:nth-child(even) { background-color: #f1f5f9 !important; }' +
        /* Text utilities */
        '.font-mono { font-family: "Courier New", monospace; }' +
        '.font-bold { font-weight: bold; }' +
        '.font-semibold { font-weight: 600; }' +
        '.text-center { text-align: center; }' +
        '.text-xs { font-size: 9px; }' +
        '.text-slate-600 { color: #475569; }' +
        '.italic { font-style: italic; }' +
        /* Badge styles */
        '.rounded-full { border-radius: 9999px; display: inline-block; padding: 3px 8px; }' +
        '.bg-green-100 { background-color: #dcfce7 !important; color: #166534 !important; }' +
        '.bg-red-100 { background-color: #fee2e2 !important; color: #991b1b !important; }' +
        '.bg-blue-100 { background-color: #dbeafe !important; color: #1e40af !important; }' +
        '.text-green-800 { color: #166534 !important; }' +
        '.text-red-800 { color: #991b1b !important; }' +
        '.text-blue-800 { color: #1e40af !important; }' +
        /* Spacing */
        '.px-1, .px-1\\.5 { padding-left: 4px; padding-right: 4px; }' +
        '.py-0, .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }' +
        '.mt-0, .mt-0\\.5 { margin-top: 2px; }' +
        '.gap-1 { gap: 4px; }' +
        /* Flexbox */
        '.flex { display: flex; }' +
        '.flex-col { flex-direction: column; }' +
        '.align-top { vertical-align: top; }' +
        /* Matrix specific */
        '.sticky-col { position: static !important; }' +
        '.matrix-cell { min-width: 90px !important; width: 90px !important; max-width: 90px !important; height: 70px !important; padding: 3px !important; }' +
        /* Position badges - blue circles */
        'span[style*="border-radius: 50%"], span[style*="border-radius:50%"] { ' +
        '  background-color: #1e40af !important; color: #ffffff !important; ' +
        '  border: 2px solid #1e3a8a !important; font-weight: bold !important; ' +
        '}' +
        /* Port badges - light background */
        'span[style*="background-color:#f1f5f9"], span[style*="background-color: #f1f5f9"] { ' +
        '  background-color: #e2e8f0 !important; color: #1e293b !important; ' +
        '  border: 1px solid #475569 !important; font-weight: bold !important; ' +
        '}' +
        /* Port badges - dark background */
        'span[style*="background-color:#334155"], span[style*="background-color: #334155"] { ' +
        '  background-color: #1e293b !important; color: #ffffff !important; ' +
        '  border: 1px solid #0f172a !important; font-weight: bold !important; ' +
        '}' +
        /* Cable marker badges */
        'span[style*="border-radius: 10px"], span[style*="border-radius:10px"] { ' +
        '  border: 2px solid #000000 !important; font-weight: bold !important; ' +
        '}' +
        /* Connection type badges - preserve colors */
        'span[style*="background-color:#3b82f6"] { background-color: #3b82f6 !important; color: #ffffff !important; }' +
        'span[style*="background-color:#ef4444"] { background-color: #ef4444 !important; color: #ffffff !important; }' +
        'span[style*="background-color:#22c55e"] { background-color: #22c55e !important; color: #ffffff !important; }' +
        'span[style*="background-color:#f97316"] { background-color: #f97316 !important; color: #ffffff !important; }' +
        'span[style*="background-color:#8b5cf6"] { background-color: #8b5cf6 !important; color: #ffffff !important; }' +
        'span[style*="background-color:#eab308"] { background-color: #eab308 !important; color: #000000 !important; }' +
        'span[style*="background-color:#06b6d4"] { background-color: #06b6d4 !important; color: #ffffff !important; }' +
        'span[style*="background-color:#a78bfa"] { background-color: #a78bfa !important; color: #ffffff !important; }' +
        /* Remove text shadows for print */
        '[style*="text-shadow"] { text-shadow: none !important; }' +
        /* Matrix cell colors - preserve on print */
        'div[style*="background-color:"][style*="border-radius:6px"] { ' +
        '  box-shadow: none !important; border: 1px solid #475569 !important; ' +
        '}' +
        '</style>';
}

function printMatrix() {
    var printArea = document.getElementById('matrixContainer');
    if (!printArea) {
        Toast.error('Matrix not found');
        return;
    }
    
    try {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connection Matrix - Tiesse Network</title>';
        html += getPrintStyles();
        html += '</head><body>';
        html += '<h2>🔗 Connection Matrix - ' + new Date().toLocaleDateString() + '</h2>';
        html += '<p style="font-size:10px;color:#64748b;margin-bottom:10px;">Total devices: ' + appState.devices.length + ' | Total connections: ' + appState.connections.length + '</p>';
        html += printArea.innerHTML;
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 300);
    } catch (e) {
        console.error('Print error:', e);
        Toast.error('Error printing: ' + e.message);
    }
}

function printConnections() {
    var printArea = document.getElementById('connectionsListContainer');
    if (!printArea) {
        Toast.error('Connections list not found');
        return;
    }
    
    try {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Active Connections - Tiesse Network</title>';
        html += getPrintStyles();
        html += '<style>.print-hide-id { display: none !important; }</style>';
        html += '</head><body>';
        html += '<h2>⚡ Active Connections - ' + new Date().toLocaleDateString() + '</h2>';
        html += '<p style="font-size:10px;color:#64748b;margin-bottom:10px;">Total connections: ' + appState.connections.length + '</p>';
        html += printArea.innerHTML;
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 300);
    } catch (e) {
        console.error('Print error:', e);
        Toast.error('Error printing: ' + e.message);
    }
}

// ============================================================================
// AUTO-SAVE DISABLED - Risk of data loss with multiple sessions
// ============================================================================
// Auto-save was removed because when two browsers/tabs are open simultaneously,
// they compete with each other and overwrite data, causing information loss.
// Use the "Salva Ora" (Save Now) button for manual saves.
// Changes are NOT saved automatically - always click "Salva Ora" to persist data.

// ============================================================================
// INITIALIZATION
// ============================================================================
function initApp() {
    serverLoad().then(function(ok) {
        if (!ok) loadFromStorage();
        updateUI();
        // Auto-save disabled to prevent data loss with multiple sessions
        Toast.info('Tiesse Matrix Network loaded');
    }).catch(function() {
        loadFromStorage();
        updateUI();
        // Auto-save disabled to prevent data loss with multiple sessions
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
