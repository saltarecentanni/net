/**
 * TIESSE Matrix Network - Application Core
 * Version: 3.5.040
 * 
 * Features:
 * - Encapsulated state (appState)
 * - Toast notification system
 * - Manual "Save Now" button (auto-save disabled to prevent race conditions)
 * - Modular structure
 * - Robust import/export with validation
 * - Patch panel dual-connection support (front/back)
 * - Wall jack passthrough support (v3.1.3)
 * - Refactored Matrix page with Topology-style layout (v3.2.0)
 * - Improved sticky headers and zoom (v3.2.1)
 * - CSS Variables + Tailwind architecture (v3.3.0)
 * - Security improvements: rate limiting, env vars (v3.4.1)
 * - Reliability improvements: async save, checksum, validation (v3.4.2)
 * - SHA-256 cryptographic integrity, mandatory version validation, auto rollback (v3.4.5)
 * - Online users tracking with real-time indicator (v3.5.001)
 * - New Location System with Sites and Persistent Locations (v3.5.006)
 * - Professional Data Normalization Standard (v3.5.015)
 * - CENTRALIZED DATA UTILITIES: standardDeviceSort, NETWORK_ZONES (v3.5.035)
 * 
 * DATA NORMALIZATION STANDARD:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ FIELD           │ FORMAT      │ EXAMPLE                        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ rackId          │ UPPERCASE   │ RACK-NETWORK-01, SWITCH-AREA   │
 * │ location        │ As entered  │ Sala Server, ICT, Q.A.         │
 * │ device.type     │ lowercase   │ switch, router_wifi, patch     │
 * │ device.status   │ lowercase   │ active, disabled               │
 * │ conn.type       │ lowercase   │ lan, wan, trunk, wallport      │
 * │ conn.status     │ lowercase   │ active, disabled               │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * This normalization is enforced in:
 * - saveDevice() - client-side normalization
 * - saveConnection() - client-side normalization
 * - data.php - server-side normalization (double protection)
 */

'use strict';

// ============================================================================
// DEBUG MODE - Set to false in production
// ============================================================================
var DEBUG_MODE = false; // Change to true for debugging

/**
 * Debug logger - only logs if DEBUG_MODE is enabled
 */
var Debug = {
    log: function() { if (DEBUG_MODE) console.log.apply(console, arguments); },
    warn: function() { if (DEBUG_MODE) console.warn.apply(console, arguments); },
    error: function() { if (DEBUG_MODE) console.error.apply(console, arguments); }
};

// ============================================================================
// DATA INTEGRITY - SHA-256 CHECKSUM & VALIDATION
// ============================================================================

/**
 * Compute SHA-256 hash of a string using Web Crypto API
 * Falls back to simple hash if crypto.subtle not available (HTTP context)
 * @param {string} message - The string to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
async function sha256(message) {
    // Check if Web Crypto API is available (requires HTTPS or localhost)
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
        try {
            var encoder = new TextEncoder();
            var data = encoder.encode(message);
            var hashBuffer = await crypto.subtle.digest('SHA-256', data);
            var hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        } catch (e) {
            Debug.warn('SHA-256 failed, using fallback hash:', e.message);
        }
    }
    // Fallback: simple but reliable hash for HTTP contexts
    // This is less secure but allows the app to work over HTTP
    Debug.warn('Web Crypto API not available (HTTP context). Using fallback hash.');
    var hash = 0;
    for (var i = 0; i < message.length; i++) {
        var char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Return as hex string with prefix to identify fallback hash
    return 'fb-' + Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Supported versions for import (current + backward compatible)
 */
var SUPPORTED_VERSIONS = ['3.5.040', '3.5.037', '3.5.036', '3.5.035', '3.5.034', '3.5.030', '3.5.029', '3.5.014', '3.5.011', '3.5.009', '3.5.008', '3.5.005', '3.5.001', '3.4.5', '3.4.2', '3.4.1', '3.4.0', '3.3.1', '3.3.0', '3.2.2', '3.2.1', '3.2.0', '3.1.3'];
var CURRENT_VERSION = '3.5.040';

/**
 * Valid enum values for schema validation
 * NOTE: These include both legacy values (active/disabled) and new values for backward compatibility
 */
var VALID_ENUMS = {
    deviceTypes: ['server', 'switch', 'router', 'firewall', 'workstation', 'laptop', 'phone', 'access_point', 'printer', 'storage', 'nas', 'pdu', 'camera', 'sensor', 'patch_panel', 'patch', 'wifi', 'isp', 'router_wifi', 'modem', 'hub', 'pc', 'ip_phone', 'ups', 'walljack', 'tv', 'display', 'monitor', 'others', 'other'],
    deviceStatus: ['active', 'disabled', 'online', 'offline', 'maintenance', 'warning', 'error'],
    connectionTypes: ['lan', 'wan', 'dmz', 'trunk', 'management', 'backup', 'fiber', 'wallport', 'walljack', 'external', 'other', 'LAN', 'WAN', 'DMZ', 'Trunk', 'Management', 'Backup', 'Fiber', 'Wall Jack', 'External'],
    connectionStatus: ['active', 'disabled', 'inactive', 'maintenance', 'reserved', 'planned']
};

/**
 * Validate a complete device object against schema
 * RELAXED validation - only checks essential structure, not enum values
 * This allows backward compatibility with older data formats
 * @param {Object} device - Device to validate
 * @param {number} index - Device index for error messages
 * @returns {Object} - {valid: boolean, error: string|null}
 */
function validateDeviceSchema(device, index) {
    // Only check if essential fields exist - don't validate values
    if (!device || typeof device !== 'object') {
        return {valid: false, error: 'Device #' + index + ': must be an object'};
    }
    if (device.id === undefined || device.id === null) {
        return {valid: false, error: 'Device #' + index + ': id is required'};
    }
    if (!device.name || typeof device.name !== 'string') {
        return {valid: false, error: 'Device #' + index + ': name is required'};
    }
    // All other fields are optional or have defaults - don't block import
    return {valid: true, error: null};
}

/**
 * Validate a complete connection object against schema
 * RELAXED validation - only checks essential structure
 * @param {Object} conn - Connection to validate
 * @param {number} index - Connection index for error messages
 * @param {Array} deviceIds - Array of valid device IDs (not used in relaxed mode)
 * @returns {Object} - {valid: boolean, error: string|null}
 */
function validateConnectionSchema(conn, index, deviceIds) {
    if (!conn || typeof conn !== 'object') {
        return {valid: false, error: 'Connection #' + index + ': must be an object'};
    }
    if (conn.from === undefined || conn.from === null) {
        return {valid: false, error: 'Connection #' + index + ': from is required'};
    }
    // All other fields are optional - don't block import
    return {valid: true, error: null};
}

/**
 * Validate a room object against schema
 * RELAXED validation - only checks essential structure
 * @param {Object} room - Room to validate
 * @param {number} index - Room index for error messages
 * @returns {Object} - {valid: boolean, error: string|null}
 */
function validateRoomSchema(room, index) {
    if (!room || typeof room !== 'object') {
        return {valid: false, error: 'Room #' + index + ': must be an object'};
    }
    // Rooms can have various structures - don't block
    return {valid: true, error: null};
}

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
// CENTRALIZED DATA UTILITIES
// Standard sorting and filtering functions for consistency across all views
// ============================================================================

/**
 * Standard device sort function - ALWAYS use this for consistent ordering
 * Sorts by: rackId (string) -> order (numeric, 0 first)
 * @param {Object} a - First device
 * @param {Object} b - Second device
 * @returns {number} - Sort comparison result
 */
function standardDeviceSort(a, b) {
    // Primary: rackId alphabetical
    var rackA = (a.rackId || '').toUpperCase();
    var rackB = (b.rackId || '').toUpperCase();
    if (rackA < rackB) return -1;
    if (rackA > rackB) return 1;
    // Secondary: order numeric (0/00 comes first)
    var orderA = parseInt(a.order, 10) || 0;
    var orderB = parseInt(b.order, 10) || 0;
    return orderA - orderB;
}

/**
 * Get devices sorted by standard order (rackId + order)
 * @param {Array} devices - Optional array of devices (uses appState.devices if not provided)
 * @returns {Array} - Sorted copy of devices array
 */
function getDevicesSorted(devices) {
    var arr = devices || appState.devices || [];
    return arr.slice().sort(standardDeviceSort);
}

/**
 * Filter devices by location and/or group, then sort
 * @param {string} location - Location filter (optional)
 * @param {string} group - Group/rackId filter (optional)
 * @returns {Array} - Filtered and sorted devices
 */
function getDevicesFiltered(location, group) {
    var devices = appState.devices || [];
    var filtered = devices.filter(function(d) {
        var deviceLoc = d.location || 'No Location';
        // Match if no filter, exact match, or partial match (for "XX - Name" vs "Name")
        var matchLoc = !location || location === '' || 
                       deviceLoc === location || 
                       deviceLoc.indexOf(location) !== -1 ||
                       location.indexOf(deviceLoc) !== -1;
        var matchGroup = !group || group === '' || d.rackId === group;
        return matchLoc && matchGroup;
    });
    return filtered.sort(standardDeviceSort);
}

/**
 * Network Zone options - SINGLE SOURCE OF TRUTH
 * Used by all IP field dropdowns across the application
 */
var NETWORK_ZONES = [
    { value: '', label: '-- Zone --' },
    { value: 'LAN', label: '🏢 LAN' },
    { value: 'WAN', label: '🌐 WAN' },
    { value: 'DMZ', label: '🛡️ DMZ' },
    { value: 'VLAN', label: '📊 VLAN' },
    { value: 'Backbone', label: '🔗 Backbone' },
    { value: 'VPN', label: '🔒 VPN' },
    { value: 'Cloud', label: '☁️ Cloud' },
    { value: 'Guest', label: '👥 Guest' },
    { value: 'IoT', label: '📡 IoT' },
    { value: 'Servers', label: '🖥️ Servers' },
    { value: 'Management', label: '⚙️ Mgmt' },
    { value: 'Voice', label: '📞 Voice' }
];

// ============================================================================
// GLOBAL STATE (Encapsulated)
// ============================================================================
var appState = {
    devices: [],
    connections: [],
    rooms: [],           // Floor plan geometry only
    sites: [],           // Company sites/branches
    locations: [],       // All locations (mapped + custom)
    nextDeviceId: 1,
    nextLocationId: 21,  // Custom locations start at 21
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

/**
 * Check if a device belongs to a room
 * Matches against room id, name, or nickname (case-insensitive, ignoring spaces)
 */
function deviceBelongsToRoom(device, room) {
    if (!device.location) return false;
    
    // Normalize function: lowercase + remove all spaces
    function normalize(str) {
        return (str || '').toLowerCase().replace(/\s+/g, '');
    }
    
    var locRaw = device.location;
    var locNorm = normalize(locRaw);
    
    // Exact matches first
    if (locRaw === room.id || locRaw === room.name || locRaw === room.nickname) {
        return true;
    }
    
    // Normalized matches (ignoring spaces and case)
    var roomIdNorm = normalize(room.id);
    var roomNameNorm = normalize(room.name);
    var roomNicknameNorm = normalize(room.nickname);
    
    // Match: "Ufficio12" == normalize("Ufficio 12") or "ufficio 12" == normalize("Ufficio12")
    if (locNorm === roomIdNorm || locNorm === roomNameNorm || locNorm === roomNicknameNorm) {
        return true;
    }
    
    // Also check if room nickname/name contains room id pattern
    // e.g., nickname "Ufficio 12" should match location "Ufficio12" or "ufficio12"
    
    return false;
}

/**
 * Get devices belonging to a room
 */
function getDevicesInRoom(room) {
    return appState.devices.filter(function(d) {
        return deviceBelongsToRoom(d, room);
    });
}

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
        
        // Reset dependent filters when location changes (smart cascading)
        appState.deviceFilters.source = '';  // Reset group filter
        appState.deviceFilters.type = '';    // Reset type filter
        
        // Rebuild the filter bar to show only relevant groups/types
        if (typeof updateDeviceFilterBar === 'function') {
            updateDeviceFilterBar();
        }
        
        // Update all views when location changes (like global filter does)
        if (typeof LocationFilter !== 'undefined') {
            LocationFilter.updateCounters();
        }
        if (typeof updateConnectionsList === 'function') updateConnectionsList();
        if (typeof updateMatrix === 'function') updateMatrix();
        if (typeof SVGTopology !== 'undefined') SVGTopology.render();
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
        // Source/Group filter - case-insensitive
        if (filters.source && (d.rackId || '').toUpperCase().indexOf(filters.source.toUpperCase()) === -1) {
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
            // Count devices and connections in the filtered rack (uppercase comparison)
            var filterUpper = appState.connFilters.source.toUpperCase();
            var rackDevices = appState.devices.filter(function(d) {
                return (d.rackId || '').toUpperCase().indexOf(filterUpper) !== -1;
            });
            var rackConnections = appState.connections.filter(function(c) {
                var fromDevice = appState.devices.find(function(d) { return d.id === c.from; });
                var toDevice = appState.devices.find(function(d) { return d.id === c.to; });
                var fromRack = fromDevice ? (fromDevice.rackId || '').toUpperCase() : '';
                var toRack = toDevice ? (toDevice.rackId || '').toUpperCase() : '';
                return fromRack.indexOf(filterUpper) !== -1 || toRack.indexOf(filterUpper) !== -1;
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
                    _autoInverted: true,
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
        
        // Uses CSS variables from styles.css
        var colors = {
            success: { bg: 'var(--color-success)', icon: '✓' },
            error: { bg: 'var(--color-danger)', icon: '✕' },
            warning: { bg: 'var(--color-warning)', icon: '⚠' },
            info: { bg: 'var(--color-primary)', icon: 'ℹ' }
        };
        
        var c = colors[type] || colors.info;
        
        var toast = document.createElement('div');
        toast.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;background:' + c.bg + ';color:white;border-radius:var(--radius-md);box-shadow:var(--shadow-lg);font-size:14px;animation:slideIn 0.3s ease;cursor:pointer;';
        
        // Create icon span
        var iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '18px';
        iconSpan.textContent = c.icon;
        toast.appendChild(iconSpan);
        
        // Create message span (using textContent for XSS safety)
        var msgSpan = document.createElement('span');
        msgSpan.textContent = message;
        toast.appendChild(msgSpan);
        
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
// UI HELPERS
// ============================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    var tabBtn = document.getElementById('tab-' + tabId);
    var tabContent = document.getElementById('content-' + tabId);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
    
    // Initialize Floor Plan when tab is activated
    if (tabId === 'floorplan' && typeof FloorPlan !== 'undefined') {
        FloorPlan.init();
    }
}

// Toggle Room Legend visibility
function toggleRoomLegend() {
    var content = document.getElementById('roomLegendContent');
    var toggle = document.getElementById('roomLegendToggle');
    if (!content || !toggle) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// Toggle Custom Locations Legend visibility
function toggleCustomLocationsLegend() {
    var content = document.getElementById('customLocationsContent');
    var toggle = document.getElementById('customLocationsToggle');
    if (!content || !toggle) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// Update Custom Locations Legend in Floor Plan
function updateCustomLocationsLegend() {
    var container = document.getElementById('customLocationsContent');
    if (!container) return;
    
    // Get custom locations (type === 'custom')
    var customLocs = (appState.locations || []).filter(function(loc) {
        return loc.type === 'custom';
    }).sort(function(a, b) {
        return parseInt(a.id) - parseInt(b.id);
    });
    
    if (customLocs.length === 0) {
        container.innerHTML = '<span style="font-size: 10px; color: var(--color-text-muted); font-style: italic;">No custom locations</span>';
        return;
    }
    
    var html = '';
    customLocs.forEach(function(loc) {
        // Count devices in this location
        var deviceCount = appState.devices.filter(function(d) {
            return d.location === loc.code;
        }).length;
        
        var label = loc.code + ' - ' + loc.name;
        var countBadge = deviceCount > 0 ? ' <span style="background: #059669; color: white; font-size: 9px; padding: 1px 4px; border-radius: 8px;">' + deviceCount + '</span>' : '';
        
        html += '<div style="font-size: 11px; padding: 2px 0; color: var(--color-text-light); white-space: nowrap;" title="' + loc.name + '">' + label + countBadge + '</div>';
    });
    
    container.innerHTML = html;
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

function highlightEditFields(formType, enable) {
    var fields = [];
    if (formType === 'connection') {
        fields = ['fromDevice', 'fromPort', 'toDevice', 'toPort', 'connType', 'connStatus', 'cableMarker', 'cableColor', 'connNotes'];
    } else if (formType === 'device') {
        fields = ['rackId', 'deviceOrder', 'deviceRear', 'deviceName', 'deviceBrandModel', 'deviceType', 'deviceStatus', 'deviceLocation', 'deviceService', 'deviceNotes'];
    }
    
    for (var i = 0; i < fields.length; i++) {
        var el = document.getElementById(fields[i]);
        if (el) {
            if (enable) {
                el.style.backgroundColor = 'var(--color-bg-alt)';
                el.style.borderColor = 'var(--color-primary-100)';
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
        localStorage.setItem('networkRooms', JSON.stringify(appState.rooms || []));
        localStorage.setItem('networkSites', JSON.stringify(appState.sites || []));
        localStorage.setItem('networkLocations', JSON.stringify(appState.locations || []));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        localStorage.setItem('nextLocationId', String(appState.nextLocationId || 21));
        showSyncIndicator('saved', '✓ Saved');
        serverSave();
    } catch (e) {
        Debug.error('Error saving to localStorage:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            Toast.error('Storage quota exceeded. Please export and clear old data.');
        } else {
            Toast.error('Failed to save data locally');
        }
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
        localStorage.setItem('networkRooms', JSON.stringify(appState.rooms || []));
        localStorage.setItem('networkSites', JSON.stringify(appState.sites || []));
        localStorage.setItem('networkLocations', JSON.stringify(appState.locations || []));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        localStorage.setItem('nextLocationId', String(appState.nextLocationId || 21));
        showSyncIndicator('saved', '✓ Saved!');
        serverSave();
        Toast.success('Data saved successfully!');
    } catch (e) {
        Debug.error('Error saving:', e);
        Toast.error('Error saving: ' + e.message);
    }
}

/**
 * Normalize data case to prevent case-sensitivity issues
 * - rackId: UPPERCASE
 * - type: lowercase
 * - status: lowercase
 */
function normalizeDataCase() {
    var normalized = false;
    
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        
        // Normalize rackId to UPPERCASE
        if (d.rackId && d.rackId !== d.rackId.toUpperCase()) {
            d.rackId = d.rackId.toUpperCase();
            normalized = true;
        }
        // Also normalize rack alias field
        if (d.rack && d.rack !== d.rack.toUpperCase()) {
            d.rack = d.rack.toUpperCase();
            normalized = true;
        }
        // Normalize type to lowercase
        if (d.type && d.type !== d.type.toLowerCase()) {
            d.type = d.type.toLowerCase();
            normalized = true;
        }
        // Normalize status to lowercase
        if (d.status && d.status !== d.status.toLowerCase()) {
            d.status = d.status.toLowerCase();
            normalized = true;
        }
    }
    
    if (normalized) {
        Debug.log('Data normalized (case corrections applied)');
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
                    appState.rooms = data.rooms || [];
                    appState.sites = data.sites || [];
                    appState.locations = data.locations || [];
                    appState.nextDeviceId = data.nextDeviceId || 1;
                    appState.nextLocationId = data.nextLocationId || 21;
                    
                    // Sort locations by code to ensure 00 comes before 01
                    if (appState.locations.length > 0) {
                        appState.locations.sort(function(a, b) {
                            return parseInt(a.code) - parseInt(b.code);
                        });
                    }
                    
                    // Normalize data (uppercase rackId, etc.)
                    normalizeDataCase();
                    
                    // Auto-migrate if needed
                    migrateToNewLocationSystem();
                    
                    Debug.log('Server load OK from:', url);
                    return true;
                }
                throw new Error('Invalid data structure');
            });
    }
    
    // Use relative paths to work in any subdirectory (e.g., /matrix/)
    return tryUrl('data.php')
        .catch(function(err1) {
            Debug.log('data.php failed:', err1.message);
            return tryUrl('./data.php')
                .catch(function(err2) {
                    Debug.log('./data.php failed:', err2.message);
                    return tryUrl('data/network_manager.json')
                        .catch(function(err3) {
                            Debug.log('data/network_manager.json failed:', err3.message);
                            return tryUrl('./data/network_manager.json')
                                .catch(function(err4) {
                                    Debug.warn('All server load endpoints failed');
                                    return false;
                                });
                        });
                });
        });
}

/**
 * Migrate data to new location system (v3.5.006)
 * - Creates default site if none exists
 * - Creates locations from rooms and device locations
 * - Updates device.location to use locationId
 */
function migrateToNewLocationSystem() {
    var needsSave = false;
    
    // Create default site if none exists
    if (!appState.sites || appState.sites.length === 0) {
        appState.sites = [{
            id: 'main',
            name: 'Sede Ivrea',
            isDefault: true
        }];
        needsSave = true;
        Debug.log('Migration: Created default site "Sede Ivrea"');
    }
    
    // Create locations from rooms if locations array is empty
    if (!appState.locations || appState.locations.length === 0) {
        appState.locations = [];
        
        // Create mapped locations from rooms (00-19)
        if (appState.rooms && appState.rooms.length > 0) {
            appState.rooms.forEach(function(room) {
                var code = String(room.id).padStart(2, '0');
                appState.locations.push({
                    id: 'loc-' + code,
                    siteId: 'main',
                    code: code,
                    name: room.nickname || ('Room ' + room.id),
                    type: 'mapped',
                    roomRef: room.id,
                    color: '#7c3aed'
                });
            });
            Debug.log('Migration: Created ' + appState.rooms.length + ' mapped locations from rooms');
        }
        
        // Collect custom locations from devices
        var customLocs = {};
        appState.devices.forEach(function(d) {
            if (d.location) {
                // Check if this is already a mapped location
                var isMapped = appState.locations.some(function(loc) {
                    return loc.name === d.location || loc.code === d.location || loc.roomRef === d.location;
                });
                if (!isMapped && !customLocs[d.location]) {
                    customLocs[d.location] = true;
                }
            }
        });
        
        // Create custom locations (21+)
        var customIndex = 21;
        Object.keys(customLocs).sort().forEach(function(locName) {
            var code = String(customIndex).padStart(2, '0');
            appState.locations.push({
                id: 'loc-' + code,
                siteId: 'main',
                code: code,
                name: locName,
                type: 'custom',
                roomRef: null,
                color: '#f97316'
            });
            customIndex++;
        });
        
        if (Object.keys(customLocs).length > 0) {
            Debug.log('Migration: Created ' + Object.keys(customLocs).length + ' custom locations');
        }
        
        // Sort locations by code to ensure 00 comes before 01
        appState.locations.sort(function(a, b) {
            return parseInt(a.code) - parseInt(b.code);
        });
        
        appState.nextLocationId = customIndex;
        needsSave = true;
    }
    
    // Migrate device.location to use consistent values
    // Keep location as name for backward compatibility, but ensure it matches a location
    appState.devices.forEach(function(d) {
        if (d.location) {
            // Find matching location
            var matchedLoc = appState.locations.find(function(loc) {
                return loc.name === d.location || 
                       loc.code === d.location || 
                       loc.roomRef === d.location ||
                       loc.id === d.location;
            });
            if (matchedLoc && d.location !== matchedLoc.name) {
                // Normalize to use location name
                d.location = matchedLoc.name;
                needsSave = true;
            }
        }
    });
    
    if (needsSave) {
        Debug.log('Migration: Saving migrated data');
        // Don't auto-save during load - let user trigger save
    }
}

function serverSave() {
    var payload = JSON.stringify({
        devices: appState.devices,
        connections: appState.connections,
        rooms: appState.rooms || [],
        sites: appState.sites || [],
        locations: appState.locations || [],
        nextDeviceId: appState.nextDeviceId,
        nextLocationId: appState.nextLocationId || 21
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
    
    // Try server endpoints in order: data.php (Apache), then relative paths
    // Use relative paths to work in any subdirectory
    postUrl('data.php')
        .then(function() {
            showSyncIndicator('saved', '✓ Server');
            Debug.log('Server save OK: data.php');
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
            Debug.log('data.php failed:', err1.message, '- trying ./data.php');
            return postUrl('./data.php')
                .then(function() {
                    showSyncIndicator('saved', '✓ Server');
                    Debug.log('Server save OK: ./data.php');
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
                    Debug.warn('All server endpoints failed. Data saved to localStorage only.');
                    Debug.warn('Errors:', err1.message, err2.message);
                    showSyncIndicator('error', '⚠ Local only');
                });
        });
}

function loadFromStorage() {
    try {
        var d = localStorage.getItem('networkDevices');
        var c = localStorage.getItem('networkConnections');
        var r = localStorage.getItem('networkRooms');
        var s = localStorage.getItem('networkSites');
        var l = localStorage.getItem('networkLocations');
        var n = localStorage.getItem('nextDeviceId');
        var nl = localStorage.getItem('nextLocationId');
        if (d) appState.devices = JSON.parse(d);
        if (c) appState.connections = JSON.parse(c);
        if (r) appState.rooms = JSON.parse(r);
        if (s) appState.sites = JSON.parse(s);
        if (l) appState.locations = JSON.parse(l);
        if (n) appState.nextDeviceId = parseInt(n, 10) || 1;
        if (nl) appState.nextLocationId = parseInt(nl, 10) || 21;
        
        // Normalize data case after loading
        normalizeDataCase();
    } catch (e) {
        Debug.error('Error loading from localStorage:', e);
        Toast.error('Failed to load saved data');
    }
}

// ============================================================================
// RACK COLOR MANAGEMENT
// ============================================================================
function getRackColor(rackId) {
    if (!rackId) return 'var(--color-secondary)';
    // Normalize to uppercase for consistent color mapping
    var normalizedRackId = rackId.toUpperCase();
    if (!appState.rackColorMap[normalizedRackId]) {
        var idx = Object.keys(appState.rackColorMap).length % config.rackColors.length;
        appState.rackColorMap[normalizedRackId] = config.rackColors[idx];
    }
    return appState.rackColorMap[normalizedRackId];
}

function resetRackColors() {
    appState.rackColorMap = {};
    var racks = [];
    for (var i = 0; i < appState.devices.length; i++) {
        // Normalize to uppercase
        var r = (appState.devices[i].rackId || '').toUpperCase();
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
        
        // Get dynamic IP addresses with network zones
        var addresses = [];
        var ipContainer = document.getElementById('deviceIPContainer');
        if (ipContainer) {
            var ipRows = ipContainer.querySelectorAll('.ip-row');
            ipRows.forEach(function(row) {
                var ipField = row.querySelector('.ip-field');
                var zoneSelect = row.querySelector('.ip-zone');
                var ipValue = ipField ? ipField.value.trim() : '';
                var zoneValue = zoneSelect ? zoneSelect.value : '';
                if (ipValue) {
                    addresses.push({ network: ipValue, ip: '', vlan: null, zone: zoneValue });
                }
            });
            // Handle legacy single input field (initial HTML)
            if (ipRows.length === 0) {
                var legacyFields = ipContainer.querySelectorAll('.ip-field');
                legacyFields.forEach(function(field) {
                    var value = field.value.trim();
                    if (value) {
                        addresses.push({ network: value, ip: '', vlan: null, zone: '' });
                    }
                });
            }
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

        // ================================================================
        // DATA NORMALIZATION - Professional Standard
        // rackId: UPPERCASE | type/status: lowercase | location: as-is
        // ================================================================
        rackId = rackId.toUpperCase();
        type = type.toLowerCase();
        status = status.toLowerCase();
        
        // Derive main zone from IP addresses (use first non-empty zone)
        var mainZone = '';
        for (var i = 0; i < addresses.length; i++) {
            if (addresses[i].zone) {
                mainZone = addresses[i].zone;
                break;
            }
        }
        
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
            addresses: addresses, // Dynamic IP array with zones
            links: links,
            service: service,
            zone: mainZone, // Derived from IP zones
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

        // Save to server immediately
        serverSave();
        
        clearDeviceForm();
        updateUI();
    } catch (e) {
        Debug.error('Error saving device:', e);
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
    
    // Reset IP container to one empty field with zone dropdown
    var ipContainer = document.getElementById('deviceIPContainer');
    if (ipContainer) {
        ipContainer.innerHTML = createIPFieldHTML('', '');
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
                var zoneValue = addr.zone || '';
                if (ipValue) {
                    hasIPs = true;
                    ipContainer.insertAdjacentHTML('beforeend', createIPFieldHTML(ipValue, zoneValue));
                }
            });
        }
        // Fallback to old ip1-4 format for compatibility
        else if (d.ip1 || d.ip2 || d.ip3 || d.ip4) {
            [d.ip1, d.ip2, d.ip3, d.ip4].forEach(function(ip) {
                if (ip && ip.trim()) {
                    hasIPs = true;
                    ipContainer.insertAdjacentHTML('beforeend', createIPFieldHTML(ip, ''));
                }
            });
        }
        
        // Add at least one empty field if no IPs
        if (!hasIPs) {
            ipContainer.innerHTML = createIPFieldHTML('', '');
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

/**
 * Copy/duplicate a device - creates a copy and opens form for editing
 * @param {string} id - Device ID to copy
 */
function copyDevice(id) {
    // Require authentication for copying
    if (!requireAuth()) return;
    
    var original = null;
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            original = appState.devices[i];
            break;
        }
    }
    if (!original) return;

    // Create a deep copy with new ID and modified name
    var newDevice = JSON.parse(JSON.stringify(original));
    newDevice.id = appState.nextDeviceId++;  // Use proper sequential ID
    newDevice.name = original.name + ' (Copy)';
    
    // Add to devices array
    appState.devices.push(newDevice);
    
    // Log activity
    if (typeof ActivityLog !== 'undefined') {
        ActivityLog.add('copy', 'device', newDevice.name + ' from ' + original.name);
    }
    
    // Save to server immediately
    serverSave();
    
    // Update UI
    updateUI();
    
    // Open the new device in edit mode
    editDevice(newDevice.id);
    
    Toast.success('📋 Device copied and saved! Edit the copy below.');
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
    
    Swal.fire({
        title: 'Remove Device?',
        html: 'Delete device <strong>"' + escapeHtml(deviceName) + '"</strong>?<br><br><small class="text-slate-500">This will also remove all its connections.</small>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    }).then(function(result) {
        if (result.isConfirmed) {
            appState.devices = appState.devices.filter(function(d) { return d.id !== id; });
            appState.connections = appState.connections.filter(function(c) { return c.from !== id && c.to !== id && c.fromDevice !== id && c.toDevice !== id; });
            
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('delete', 'device', deviceName + ' (' + deviceType + ')');
            }
            
            // Save to server immediately
            serverSave();
            
            clearDeviceForm();
            updateUI();
            Toast.success('Device "' + deviceName + '" removed');
        }
    });
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
    var num = parseInt(val, 10);
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
// Uses NETWORK_ZONES constant defined in Centralized Data Utilities section
// ============================================================================

function createIPFieldHTML(ipValue, zoneValue) {
    ipValue = ipValue || '';
    zoneValue = zoneValue || '';
    var options = NETWORK_ZONES.map(function(opt) {
        var selected = opt.value === zoneValue ? ' selected' : '';
        return '<option value="' + opt.value + '"' + selected + '>' + opt.label + '</option>';
    }).join('');
    
    return '<div class="flex gap-1 items-center ip-row">' +
        '<input type="text" class="ip-field flex-1 px-2 py-1 border border-green-300 rounded text-xs font-mono bg-white" value="' + escapeHtml(ipValue) + '" placeholder="192.168.1.1/24">' +
        '<select class="ip-zone px-1 py-1 border border-green-300 rounded text-xs bg-white" title="Network Zone">' + options + '</select>' +
        '<button type="button" onclick="removeIPField(this)" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>' +
        '</div>';
}

function addIPField() {
    var container = document.getElementById('deviceIPContainer');
    if (container) {
        container.insertAdjacentHTML('beforeend', createIPFieldHTML('', ''));
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
                Toast.error('Port already has 2 connections (front and rear)');
            } else {
                Toast.error('Source port already in use');
            }
            return;
        }
        
        if (to && toPort && isPortUsed(to, toPort, excludeIdx)) {
            var toDeviceType = toDevice ? toDevice.type : '';
            if (toDeviceType === 'patch' || toDeviceType === 'walljack') {
                Toast.error('Port already has 2 connections (front and rear)');
            } else {
                Toast.error('Destination port already in use');
            }
            return;
        }

        // Get roomId for Wall Jacks
        var roomId = null;
        if (isWallJack) {
            var roomSelect = document.getElementById('wallJackRoomId');
            if (roomSelect && roomSelect.value) {
                roomId = roomSelect.value;
            }
        }

        // ================================================================
        // DATA NORMALIZATION - Professional Standard
        // type/status: lowercase
        // ================================================================
        type = type.toLowerCase();
        status = status.toLowerCase();

        var connData = {
            from: from,
            fromPort: fromPort || '',
            to: to,
            toPort: (isExternal || isWallJack) ? '' : (toPort || ''),
            externalDest: (isExternal || isWallJack) ? externalDest : '',
            isWallJack: isWallJack,
            roomId: roomId,
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

        // Save to server immediately
        serverSave();

        clearConnectionForm();
        updateUI();
    } catch (e) {
        Debug.error('Error saving connection:', e);
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
        // Set the room after dropdown is populated
        if (c.roomId !== undefined && c.roomId !== null) {
            document.getElementById('wallJackRoomId').value = c.roomId;
        }
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
    document.getElementById('wallJackRoomId').value = '';
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
    
    var conn = appState.connections[idx];
    var logDetails = '';
    if (conn) {
        var fromDevice = appState.devices.find(function(d) { return d.id === conn.from || d.id === conn.fromDevice; });
        var toDevice = appState.devices.find(function(d) { return d.id === conn.to || d.id === conn.toDevice; });
        logDetails = (fromDevice ? fromDevice.name : 'Unknown') + ' → ' + (toDevice ? toDevice.name : conn.externalDest || 'Unknown');
    }
    
    Swal.fire({
        title: 'Remove Connection?',
        html: 'Delete connection <strong>' + escapeHtml(logDetails) + '</strong>?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    }).then(function(result) {
        if (result.isConfirmed) {
            appState.connections.splice(idx, 1);
            
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('delete', 'connection', logDetails);
            }
            
            // Save to server immediately
            serverSave();
            
            clearConnectionForm();
            updateUI();
            Toast.success('Connection removed');
        }
    });
}

function toggleExternalDest() {
    var toDevice = document.getElementById('toDevice').value;
    var toPortContainer = document.getElementById('toPortContainer');
    var externalDestContainer = document.getElementById('externalDestContainer');
    var externalDestLabel = document.getElementById('externalDestLabel');
    var externalDestInput = document.getElementById('externalDest');
    var wallJackRoomContainer = document.getElementById('wallJackRoomContainer');
    
    if (toDevice === 'external') {
        toPortContainer.classList.add('hidden');
        externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = '🌐 External Destination';
        if (externalDestInput) externalDestInput.placeholder = 'ISP Name, Fiber Provider...';
        if (wallJackRoomContainer) wallJackRoomContainer.classList.add('hidden');
    } else if (toDevice === 'walljack') {
        toPortContainer.classList.add('hidden');
        externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = '🔌 Wall Jack ID';
        if (externalDestInput) externalDestInput.placeholder = 'Z1, Z2, Z3...';
        if (wallJackRoomContainer) {
            wallJackRoomContainer.classList.remove('hidden');
            populateWallJackRoomSelect();
        }
    } else {
        toPortContainer.classList.remove('hidden');
        externalDestContainer.classList.add('hidden');
    }
}

/**
 * Populate the Wall Jack room dropdown with available rooms
 */
function populateWallJackRoomSelect() {
    var select = document.getElementById('wallJackRoomId');
    if (!select) return;
    
    var currentValue = select.value;
    select.innerHTML = '<option value="">(Not Assigned)</option>';
    
    // Get rooms from FloorPlan
    var rooms = [];
    if (typeof FloorPlan !== 'undefined' && FloorPlan.getRooms) {
        rooms = FloorPlan.getRooms();
    }
    
    // Sort rooms by id
    rooms.sort(function(a, b) { 
        return parseInt(a.id) - parseInt(b.id); 
    });
    
    rooms.forEach(function(room) {
        var option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.nickname 
            ? room.nickname + ' (Room ' + room.id + ')' 
            : 'Room ' + room.id;
        select.appendChild(option);
    });
    
    // Restore previous value
    if (currentValue) {
        select.value = currentValue;
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
 * Handles both "XX - Name" and plain "Name" formats
 */
function getGroupsByLocation(location) {
    var groups = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        var deviceLoc = d.location || 'No Location';
        // Match if no filter, or exact match, or device location contains the filter name
        var matches = !location || location === '' || 
                      deviceLoc === location || 
                      deviceLoc.indexOf(location) !== -1 ||
                      location.indexOf(deviceLoc) !== -1;
        if (matches) {
            if (groups.indexOf(d.rackId) === -1) {
                groups.push(d.rackId);
            }
        }
    }
    return groups.sort();
}

/**
 * Get devices filtered by location and group
 * Uses centralized getDevicesFiltered for consistency
 */
function getDevicesByLocationAndGroup(location, group) {
    return getDevicesFiltered(location, group);
}

/**
 * Initialize location dropdowns for connection form
 * Shows only locations that HAVE devices (with "XX - Name" format)
 */
function initConnectionFormLocations() {
    var fromLoc = document.getElementById('fromLocation');
    var toLoc = document.getElementById('toLocation');
    
    if (!fromLoc || !toLoc) return;
    
    // First, get unique location names from devices (only locations with data)
    var deviceLocations = {};
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        var locName = d.location || 'No Location';
        deviceLocations[locName] = true;
    }
    
    // Now build display list with "XX - Name" format for locations that have devices
    var locationsWithCode = [];
    
    // Try to match device locations with appState.locations for code
    for (var locName in deviceLocations) {
        if (deviceLocations.hasOwnProperty(locName)) {
            var matchedLoc = null;
            
            // Find matching location in appState.locations
            for (var j = 0; j < (appState.locations || []).length; j++) {
                var loc = appState.locations[j];
                if (loc.name === locName || locName.indexOf(loc.name) !== -1 || (loc.name && loc.name.indexOf(locName) !== -1)) {
                    matchedLoc = loc;
                    break;
                }
            }
            
            if (matchedLoc) {
                var parsedCode = parseInt(matchedLoc.code, 10);
                locationsWithCode.push({
                    value: locName,
                    display: (matchedLoc.code || '00') + ' - ' + matchedLoc.name,
                    code: isNaN(parsedCode) ? 999 : parsedCode
                });
            } else {
                // No match found, use location name as-is
                locationsWithCode.push({
                    value: locName,
                    display: locName,
                    code: 999
                });
            }
        }
    }
    
    // Sort by code
    locationsWithCode.sort(function(a, b) {
        return a.code - b.code;
    });
    
    var opts = '<option value="">All</option>';
    for (var i = 0; i < locationsWithCode.length; i++) {
        var loc = locationsWithCode[i];
        opts += '<option value="' + escapeHtml(loc.value) + '">' + escapeHtml(loc.display) + '</option>';
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
    opts += '<option disabled style="font-size:10px;color:var(--color-text-muted);">── Special ──</option>';
    opts += '<option value="walljack" style="color:var(--color-accent-hover);font-weight:bold;">🔌 Wall Jack / Presa LAN</option>';
    opts += '<option value="external" style="color:var(--color-danger-hover);font-weight:bold;">📡 External (ISP/WAN)</option>';
    
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

// getSorted now uses centralized standardDeviceSort for consistency
function getSorted() {
    return getDevicesSorted();
}

function updateUI() {
    resetRackColors();
    updateRackIdDatalist();
    updateLocationSelect();
    updateZoneDatalist();
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
    
    // Update Custom Locations legend in Floor Plan
    updateCustomLocationsLegend();
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

// Update zone datalist with existing zones from devices
function updateZoneDatalist() {
    var datalist = document.getElementById('zoneList');
    if (!datalist) return;
    
    // Default zones
    var defaultZones = [
        { value: 'DMZ', label: '🛡️ DMZ' },
        { value: 'Backbone', label: '🔗 Backbone' }
    ];
    
    // Collect unique zones from devices
    var existingZones = {};
    appState.devices.forEach(function(device) {
        if (device.zone && device.zone.trim()) {
            var zoneName = device.zone.trim();
            if (!existingZones[zoneName]) {
                existingZones[zoneName] = device.zoneIP || '';
            }
        }
    });
    
    // Build datalist HTML
    var html = '';
    
    // Add default zones first
    defaultZones.forEach(function(z) {
        html += '<option value="' + z.value + '">' + z.label + '</option>';
        delete existingZones[z.value]; // Remove if already in defaults
    });
    
    // Add custom zones from devices
    var customZones = Object.keys(existingZones).sort();
    customZones.forEach(function(zoneName) {
        var zoneIP = existingZones[zoneName];
        var label = zoneIP ? zoneName + ' (' + zoneIP + ')' : zoneName;
        html += '<option value="' + escapeHtml(zoneName) + '">📍 ' + escapeHtml(label) + '</option>';
    });
    
    datalist.innerHTML = html;
}

// Populate Location select with mapped rooms + existing locations
function updateLocationSelect() {
    var select = document.getElementById('deviceLocation');
    if (!select) return;
    
    // Keep current value if editing
    var currentValue = select.value;
    
    // Clear and add default option
    select.innerHTML = '<option value="">-- Select Location --</option>';
    
    // Get locations from appState.locations (new system)
    var mappedLocs = [];
    var customLocs = [];
    
    if (appState.locations && appState.locations.length > 0) {
        // Use new location system
        appState.locations.forEach(function(loc) {
            if (loc.type === 'mapped') {
                mappedLocs.push(loc);
            } else {
                customLocs.push(loc);
            }
        });
        
        // Sort mapped by code
        mappedLocs.sort(function(a, b) {
            return parseInt(a.code) - parseInt(b.code);
        });
        
        // Sort custom by code
        customLocs.sort(function(a, b) {
            return parseInt(a.code) - parseInt(b.code);
        });
    } else {
        // Fallback to old system (rooms + device locations)
        var rooms = (appState.rooms || []).slice().sort(function(a, b) {
            return parseInt(a.id) - parseInt(b.id);
        });
        
        rooms.forEach(function(room) {
            mappedLocs.push({
                id: 'loc-' + String(room.id).padStart(2, '0'),
                code: String(room.id).padStart(2, '0'),
                name: room.nickname || ('Room ' + room.id),
                type: 'mapped',
                roomRef: room.id
            });
        });
        
        // Collect custom from devices
        var seenLocs = {};
        appState.devices.forEach(function(d) {
            if (d.location && !seenLocs[d.location]) {
                var isRoom = rooms.some(function(room) {
                    return room.id === d.location || room.nickname === d.location;
                });
                if (!isRoom) {
                    seenLocs[d.location] = true;
                }
            }
        });
        
        var idx = 21;
        Object.keys(seenLocs).sort().forEach(function(locName) {
            customLocs.push({
                id: 'loc-' + idx,
                code: String(idx),
                name: locName,
                type: 'custom'
            });
            idx++;
        });
    }
    
    // Group: Mapped Locations (00-19)
    if (mappedLocs.length > 0) {
        var optgroup1 = document.createElement('optgroup');
        optgroup1.label = '📍 Mapped Locations';
        mappedLocs.forEach(function(loc) {
            var option = document.createElement('option');
            option.value = loc.name;
            option.textContent = loc.code + ' - ' + loc.name;
            optgroup1.appendChild(option);
        });
        select.appendChild(optgroup1);
    }
    
    // Group: Custom Locations (21+)
    if (customLocs.length > 0) {
        var optgroup2 = document.createElement('optgroup');
        optgroup2.label = '🪧 Custom Locations';
        customLocs.forEach(function(loc) {
            var option = document.createElement('option');
            option.value = loc.name;
            option.textContent = loc.code + ' - ' + loc.name;
            optgroup2.appendChild(option);
        });
        select.appendChild(optgroup2);
    }
    
    // Option to add new location
    var optionNew = document.createElement('option');
    optionNew.value = '__NEW__';
    optionNew.textContent = '➕ Add new location...';
    optionNew.style.fontStyle = 'italic';
    select.appendChild(optionNew);
    
    // Restore value if editing
    if (currentValue && currentValue !== '__NEW__') {
        select.value = currentValue;
    }
    
    // Event listener for new location
    select.onchange = function() {
        if (this.value === '__NEW__') {
            addNewCustomLocation(select, optionNew);
        }
    };
}

/**
 * Add a new custom location
 */
function addNewCustomLocation(select, optionNew) {
    var newLocName = prompt('Enter the new location name:');
    if (!newLocName || !newLocName.trim()) {
        select.value = '';
        return;
    }
    
    newLocName = newLocName.trim();
    
    // Check if location already exists
    var exists = appState.locations.some(function(loc) {
        return loc.name.toLowerCase() === newLocName.toLowerCase();
    });
    
    if (exists) {
        Toast.warning('Location "' + newLocName + '" already exists');
        select.value = '';
        return;
    }
    
    // Get next custom location code
    var nextCode = appState.nextLocationId || 21;
    
    // Create new location
    var newLoc = {
        id: 'loc-' + nextCode,
        siteId: 'main',
        code: String(nextCode).padStart(2, '0'),
        name: newLocName,
        type: 'custom',
        roomRef: null,
        color: '#f97316'
    };
    
    // Add to locations array
    appState.locations.push(newLoc);
    appState.nextLocationId = nextCode + 1;
    
    // Save to server immediately
    serverSave();
    
    // Update the dropdown
    var customOptgroup = select.querySelector('optgroup[label*="Custom Locations"]');
    if (!customOptgroup) {
        customOptgroup = document.createElement('optgroup');
        customOptgroup.label = '🪧 Custom Locations';
        select.insertBefore(customOptgroup, optionNew);
    }
    
    var newOption = document.createElement('option');
    newOption.value = newLocName;
    newOption.textContent = newLoc.code + ' - ' + newLocName;
    customOptgroup.appendChild(newOption);
    
    select.value = newLocName;
    
    Toast.success('Location "' + newLocName + '" created');
    
    // Update other location selects
    if (typeof LocationFilter !== 'undefined') {
        LocationFilter.update();
    }
}

// Location Manager - delete/rename locations with bulk device reassignment
function openLocationManager() {
    // Count devices per location
    var locationCounts = {};
    appState.devices.forEach(function(d) {
        if (d.location) {
            locationCounts[d.location] = (locationCounts[d.location] || 0) + 1;
        }
    });
    
    // Get locations from appState.locations (new system)
    var mappedLocs = [];
    var customLocs = [];
    
    if (appState.locations && appState.locations.length > 0) {
        appState.locations.forEach(function(loc) {
            if (loc.type === 'mapped') {
                mappedLocs.push(loc);
            } else {
                customLocs.push(loc);
            }
        });
        
        mappedLocs.sort(function(a, b) {
            return parseInt(a.code) - parseInt(b.code);
        });
        
        customLocs.sort(function(a, b) {
            return parseInt(a.code) - parseInt(b.code);
        });
    } else {
        // Fallback to old system
        var rooms = (appState.rooms || []).slice().sort(function(a, b) {
            return parseInt(a.id) - parseInt(b.id);
        });
        
        rooms.forEach(function(room) {
            mappedLocs.push({
                id: 'loc-' + String(room.id).padStart(2, '0'),
                code: String(room.id).padStart(2, '0'),
                name: room.nickname || ('Room ' + room.id),
                type: 'mapped',
                roomRef: room.id
            });
        });
    }
    
    // Build HTML content
    var html = '<div style="text-align:left; max-height: 400px; overflow-y: auto;">';
    
    // Mapped Locations section
    html += '<h4 style="margin-bottom:8px; color:#7c3aed; font-weight:bold;">📍 Mapped Locations</h4>';
    if (mappedLocs.length > 0) {
        html += '<div style="margin-bottom:16px; display:grid; gap:4px;">';
        mappedLocs.forEach(function(loc) {
            var count = locationCounts[loc.name] || 0;
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:#f3e8ff; border-radius:6px;">';
            html += '<span style="font-size:13px;"><strong style="color:#7c3aed;">' + loc.code + '</strong> - ' + loc.name + '</span>';
            html += '<div style="display:flex; align-items:center; gap:8px;">';
            html += '<span style="font-size:11px; color:#6b7280;">' + count + ' devices</span>';
            html += '<button onclick="editMappedLocationName(\'' + loc.id + '\')" style="padding:2px 8px; background:#ddd6fe; color:#7c3aed; border:none; border-radius:4px; font-size:11px; cursor:pointer;" title="Edit name">✏️ Edit</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    } else {
        html += '<p style="color:#9ca3af; font-size:12px; margin-bottom:16px;">No mapped locations. Use Floor Plan to create rooms.</p>';
    }
    
    // Custom Locations section with Add button
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
    html += '<h4 style="margin:0; color:#f97316; font-weight:bold;">🪧 Custom Locations</h4>';
    html += '<button onclick="addNewLocationFromManager()" style="padding:4px 10px; background:#f97316; color:white; border:none; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">➕ Add New</button>';
    html += '</div>';
    if (customLocs.length > 0) {
        html += '<div style="display:grid; gap:4px;">';
        customLocs.forEach(function(loc) {
            var count = locationCounts[loc.name] || 0;
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:#fff7ed; border-radius:6px;">';
            html += '<span style="font-size:13px;"><strong style="color:#f97316;">' + loc.code + '</strong> - ' + loc.name + '</span>';
            html += '<div style="display:flex; align-items:center; gap:8px;">';
            html += '<span style="font-size:11px; color:#6b7280;">' + count + ' devices</span>';
            html += '<button onclick="renameCustomLocation(\'' + loc.id + '\')" style="padding:2px 8px; background:#fef3c7; color:#d97706; border:none; border-radius:4px; font-size:11px; cursor:pointer;" title="Rename location">✏️ Rename</button>';
            html += '<button onclick="deleteCustomLocation(\'' + loc.id + '\')" style="padding:2px 8px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; font-size:11px; cursor:pointer;" title="Delete location">🗑️ Delete</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    } else {
        html += '<p style="color:#9ca3af; font-size:12px;">No custom locations yet. Click "Add New" to create one.</p>';
    }
    
    html += '</div>';
    
    Swal.fire({
        title: '📍 Location Manager',
        html: html,
        width: 500,
        showCloseButton: true,
        confirmButtonText: 'Close',
        confirmButtonColor: '#6b7280'
    });
}

/**
 * Add a new custom location from the Location Manager
 */
function addNewLocationFromManager() {
    Swal.fire({
        title: '➕ Add Custom Location',
        input: 'text',
        inputLabel: 'Location name (e.g. Warehouse, Data Center, External Office)',
        inputPlaceholder: 'Enter location name...',
        showCancelButton: true,
        confirmButtonText: 'Create',
        confirmButtonColor: '#f97316',
        cancelButtonText: 'Cancel',
        inputValidator: function(value) {
            if (!value || !value.trim()) {
                return 'Please enter a location name';
            }
            var exists = appState.locations.some(function(loc) {
                return loc.name.toLowerCase() === value.trim().toLowerCase();
            });
            if (exists) {
                return 'A location with this name already exists';
            }
            return null;
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            var newLocName = result.value.trim();
            var nextCode = appState.nextLocationId || 21;
            
            var newLoc = {
                id: 'loc-' + nextCode,
                siteId: 'main',
                code: String(nextCode).padStart(2, '0'),
                name: newLocName,
                type: 'custom',
                roomRef: null,
                color: '#f97316'
            };
            
            appState.locations.push(newLoc);
            appState.nextLocationId = nextCode + 1;
            
            serverSave();
            updateLocationSelect();
            
            if (typeof LocationFilter !== 'undefined') {
                LocationFilter.update();
            }
            
            Toast.success('Location "' + newLocName + '" created');
            
            // Reopen Location Manager to show the new location
            openLocationManager();
        }
    });
}

// Edit a mapped location name (syncs with room nickname)
function editMappedLocationName(locId) {
    var loc = appState.locations.find(function(l) { return l.id === locId; });
    if (!loc) return;
    
    var room = loc.roomRef ? appState.rooms.find(function(r) { return r.id === loc.roomRef; }) : null;
    
    Swal.fire({
        title: '✏️ Edit Location ' + loc.code,
        input: 'text',
        inputLabel: 'Location name (e.g. ADM, Server Room, Reception)',
        inputValue: loc.name || '',
        inputPlaceholder: 'Enter name...',
        showCancelButton: true,
        confirmButtonText: 'Save',
        confirmButtonColor: '#7c3aed',
        cancelButtonText: 'Cancel'
    }).then(function(result) {
        if (result.isConfirmed) {
            var newName = result.value.trim() || ('Room ' + loc.code);
            var oldName = loc.name;
            
            // Update location
            loc.name = newName;
            
            // Sync with room nickname if linked
            if (room) {
                room.nickname = newName;
            }
            
            // Update devices that used the old location name
            appState.devices.forEach(function(d) {
                if (d.location === oldName) {
                    d.location = newName;
                }
            });
            
            serverSave();
            updateLocationSelect();
            
            // Sync FloorPlan module if loaded
            if (typeof FloorPlan !== 'undefined' && FloorPlan.setRooms) {
                FloorPlan.setRooms(appState.rooms);
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Location ' + loc.code + ' is now "' + newName + '"',
                confirmButtonColor: '#22c55e',
                timer: 2000,
                showConfirmButton: false
            }).then(function() {
                openLocationManager();
            });
        }
    });
}

// Rename a custom location (by location ID)
function renameCustomLocation(locId) {
    // Require authentication
    if (!requireAuth()) return;
    
    var loc = appState.locations.find(function(l) { return l.id === locId; });
    if (!loc) {
        Toast.error('Location not found');
        return;
    }
    
    var oldName = loc.name;
    
    // Count affected devices
    var devicesInLocation = appState.devices.filter(function(d) {
        return d.location === oldName;
    });
    
    // Count affected connections
    var deviceIds = {};
    devicesInLocation.forEach(function(d) { deviceIds[d.id] = true; });
    var affectedConnections = appState.connections.filter(function(c) {
        return deviceIds[c.from] || deviceIds[c.to];
    });
    
    Swal.fire({
        title: '✏️ Rename Location ' + loc.code,
        html: '<div style="text-align:left;">' +
              '<p style="margin-bottom:12px;">Current name: <strong>"' + oldName + '"</strong></p>' +
              '<p style="margin-bottom:8px; font-size:12px; color:#6b7280;">📦 ' + devicesInLocation.length + ' devices in this location</p>' +
              '<p style="margin-bottom:12px; font-size:12px; color:#6b7280;">🔗 ' + affectedConnections.length + ' connections involving these devices</p>' +
              '<input type="text" id="swal-new-location-name" class="swal2-input" placeholder="New location name" value="' + oldName + '" style="width:100%; margin:0;">' +
              '</div>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '✏️ Rename',
        confirmButtonColor: '#d97706',
        cancelButtonText: 'Cancel',
        preConfirm: function() {
            var newName = document.getElementById('swal-new-location-name').value.trim();
            if (!newName) {
                Swal.showValidationMessage('Please enter a new name');
                return false;
            }
            if (newName === oldName) {
                Swal.showValidationMessage('New name must be different');
                return false;
            }
            // Check if name already exists
            var exists = appState.locations.some(function(l) {
                return l.id !== locId && l.name.toLowerCase() === newName.toLowerCase();
            });
            if (exists) {
                Swal.showValidationMessage('A location with this name already exists');
                return false;
            }
            return newName;
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            var newName = result.value;
            var renamedCount = 0;
            
            // Update the location object
            loc.name = newName;
            
            // Rename location in all devices
            appState.devices.forEach(function(d) {
                if (d.location === oldName) {
                    d.location = newName;
                    renamedCount++;
                }
            });
            
            // Log the action
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('edit', 'location', 'Renamed "' + oldName + '" to "' + newName + '" (' + renamedCount + ' devices)');
            }
            
            // Save and update UI
            serverSave();
            updateUI();
            updateLocationSelect();
            
            Swal.fire({
                icon: 'success',
                title: 'Location Renamed',
                html: '<p>Renamed <strong>"' + oldName + '"</strong> to <strong>"' + newName + '"</strong></p>' +
                      '<p style="font-size:12px; color:#6b7280; margin-top:8px;">Updated ' + renamedCount + ' devices</p>',
                confirmButtonColor: '#22c55e',
                timer: 2500,
                showConfirmButton: false
            }).then(function() {
                openLocationManager();
            });
        }
    });
}

// Delete a custom location (by location ID)
function deleteCustomLocation(locId) {
    // Require authentication
    if (!requireAuth()) return;
    
    var loc = appState.locations.find(function(l) { return l.id === locId; });
    if (!loc) {
        Toast.error('Location not found');
        return;
    }
    
    var locationName = loc.name;
    
    // Count devices in this location
    var devicesInLocation = appState.devices.filter(function(d) {
        return d.location === locationName;
    });
    
    // Build options for target location from appState.locations
    var mappedLocs = [];
    var customLocs = [];
    
    appState.locations.forEach(function(l) {
        if (l.id !== locId) {
            if (l.type === 'mapped') {
                mappedLocs.push(l);
            } else {
                customLocs.push(l);
            }
        }
    });
    
    mappedLocs.sort(function(a, b) { return parseInt(a.code) - parseInt(b.code); });
    customLocs.sort(function(a, b) { return parseInt(a.code) - parseInt(b.code); });
    
    var optionsHtml = '<option value="">-- Select new location --</option>';
    
    if (mappedLocs.length > 0) {
        optionsHtml += '<optgroup label="📍 Mapped Locations">';
        mappedLocs.forEach(function(l) {
            optionsHtml += '<option value="' + l.name + '">' + l.code + ' - ' + l.name + '</option>';
        });
        optionsHtml += '</optgroup>';
    }
    
    if (customLocs.length > 0) {
        optionsHtml += '<optgroup label="🪧 Custom Locations">';
        customLocs.forEach(function(l) {
            optionsHtml += '<option value="' + l.name + '">' + l.code + ' - ' + l.name + '</option>';
        });
        optionsHtml += '</optgroup>';
    }
    
    // Count connections involving devices in this location
    var deviceIds = {};
    devicesInLocation.forEach(function(d) { deviceIds[d.id] = true; });
    var affectedConnections = appState.connections.filter(function(c) {
        return deviceIds[c.from] || deviceIds[c.to];
    });
    
    // If no devices, allow direct deletion
    if (devicesInLocation.length === 0) {
        Swal.fire({
            title: '🗑️ Delete Location',
            html: '<p>Delete custom location <strong>"' + locationName + '"</strong>?</p>' +
                  '<p style="font-size:12px; color:#6b7280; margin-top:8px;">This location has no devices.</p>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '🗑️ Delete',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancel'
        }).then(function(result) {
            if (result.isConfirmed) {
                // Remove from locations array
                var idx = appState.locations.findIndex(function(l) { return l.id === locId; });
                if (idx >= 0) {
                    appState.locations.splice(idx, 1);
                }
                
                serverSave();
                updateLocationSelect();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Location Deleted',
                    text: 'Removed "' + locationName + '"',
                    confirmButtonColor: '#22c55e',
                    timer: 2000,
                    showConfirmButton: false
                }).then(function() {
                    openLocationManager();
                });
            }
        });
        return;
    }
    
    Swal.fire({
        title: '🗑️ Delete Location ' + loc.code,
        html: '<div style="text-align:left;">' +
              '<p style="margin-bottom:12px;">You are about to delete <strong>"' + locationName + '"</strong></p>' +
              '<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px; margin-bottom:12px;">' +
              '<p style="color:#dc2626; font-weight:bold; margin-bottom:8px;">⚠️ This will affect:</p>' +
              '<ul style="margin:0; padding-left:20px; font-size:13px; color:#991b1b;">' +
              '<li><strong>' + devicesInLocation.length + '</strong> devices will be moved</li>' +
              '<li><strong>' + affectedConnections.length + '</strong> connections involve these devices</li>' +
              '</ul>' +
              '</div>' +
              '<p style="margin-bottom:8px; font-weight:500;">Move devices to:</p>' +
              '<select id="swal-target-location" class="swal2-select" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:6px;">' + optionsHtml + '</select>' +
              '</div>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '🗑️ Delete & Move',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Cancel',
        preConfirm: function() {
            var targetLocation = document.getElementById('swal-target-location').value;
            if (!targetLocation) {
                Swal.showValidationMessage('Please select a target location');
                return false;
            }
            return targetLocation;
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            var targetLocation = result.value;
            var movedCount = 0;
            
            // Move all devices to new location
            appState.devices.forEach(function(d) {
                if (d.location === locationName) {
                    d.location = targetLocation;
                    movedCount++;
                }
            });
            
            // Remove from locations array
            var idx = appState.locations.findIndex(function(l) { return l.id === locId; });
            if (idx >= 0) {
                appState.locations.splice(idx, 1);
            }
            
            // Log the action
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('delete', 'location', 'Deleted "' + locationName + '", moved ' + movedCount + ' devices to "' + targetLocation + '"');
            }
            
            // Save and update UI
            serverSave();
            updateUI();
            updateLocationSelect();
            
            Swal.fire({
                icon: 'success',
                title: 'Location Deleted',
                html: '<p>Moved <strong>' + movedCount + '</strong> devices to <strong>"' + targetLocation + '"</strong></p>',
                confirmButtonColor: '#22c55e'
            }).then(function() {
                openLocationManager();
            });
        }
    });
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
// EXPORT/IMPORT - WITH SHA-256 INTEGRITY & ROLLBACK
// ============================================================================

/**
 * Export JSON with SHA-256 cryptographic checksum
 * Guarantees data integrity for import validation
 */
async function exportJSON() {
    try {
        var payload = {
            devices: appState.devices,
            connections: appState.connections,
            rooms: appState.rooms || [],
            sites: appState.sites || [],
            locations: appState.locations || [],
            nextDeviceId: appState.nextDeviceId,
            nextLocationId: appState.nextLocationId || 21,
            exportedAt: new Date().toISOString(),
            version: CURRENT_VERSION
        };
        
        // Generate SHA-256 cryptographic checksum
        var jsonForHash = JSON.stringify(payload);
        var checksum = await sha256(jsonForHash);
        
        payload.__checksum = checksum;
        payload.__checksumAlgorithm = 'SHA-256';
        
        var data = JSON.stringify(payload, null, 2);
        
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var filename = 'Tiesse-Matrix-Network_' + new Date().toISOString().slice(0,10) + '.json';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Log the export
        if (typeof ActivityLog !== 'undefined') {
            var roomCount = (appState.rooms || []).length;
            ActivityLog.add('export', 'export', 'Exported ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections, ' + roomCount + ' rooms to ' + filename + ' [SHA-256: ' + checksum.substring(0, 8) + '...]');
        }
        
        Toast.success('✅ JSON exported with SHA-256 integrity checksum');
    } catch (err) {
        Debug.error('Export error:', err);
        Toast.error('Export failed: ' + err.message);
    }
}

/**
 * Import JSON with SHA-256 verification, version validation, and automatic rollback
 */
function importData(e) {
    // Require authentication for importing
    if (!requireAuth()) {
        e.target.value = '';
        return;
    }
    
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = async function(ev) {
        // ===== ROLLBACK BACKUP =====
        // Save current state BEFORE any changes for automatic rollback
        var backupState = {
            devices: JSON.parse(JSON.stringify(appState.devices)),
            connections: JSON.parse(JSON.stringify(appState.connections)),
            rooms: JSON.parse(JSON.stringify(appState.rooms || [])),
            sites: JSON.parse(JSON.stringify(appState.sites || [])),
            locations: JSON.parse(JSON.stringify(appState.locations || [])),
            nextDeviceId: appState.nextDeviceId,
            nextLocationId: appState.nextLocationId || 21
        };
        
        try {
            var data = JSON.parse(ev.target.result);
            
            // ===== VERSION VALIDATION (MANDATORY) =====
            if (!data.version) {
                Toast.error('❌ Import rejected: missing version. File may be from an incompatible version.');
                return;
            }
            if (SUPPORTED_VERSIONS.indexOf(data.version) === -1) {
                Toast.error('❌ Import rejected: version ' + data.version + ' is not supported. Supported: ' + SUPPORTED_VERSIONS.join(', '));
                return;
            }
            
            // ===== SHA-256 CHECKSUM VERIFICATION =====
            if (data.__checksum && data.__checksumAlgorithm === 'SHA-256') {
                var expected = data.__checksum;
                delete data.__checksum;
                delete data.__checksumAlgorithm;
                
                var jsonForHash = JSON.stringify(data);
                var computed = await sha256(jsonForHash);
                
                // Handle fallback hash comparison (fb-XXXXXXXX format)
                var isFallbackExpected = expected.startsWith('fb-');
                var isFallbackComputed = computed.startsWith('fb-');
                
                // If either is fallback, compare only the fallback portion
                if (isFallbackExpected || isFallbackComputed) {
                    // Skip strict verification when hashes are from different algorithms
                    // This allows imports between HTTPS and HTTP environments
                    Debug.warn('Checksum verification skipped: mixed hash algorithms (HTTPS/HTTP)');
                } else if (computed !== expected) {
                    Toast.error('❌ INTEGRITY FAILURE: SHA-256 checksum mismatch. File is corrupted or tampered!');
                    Debug.error('Checksum mismatch - Expected:', expected, 'Computed:', computed);
                    return;
                } else {
                    Debug.log('✅ SHA-256 checksum verified successfully');
                }
            } else if (data.__checksum && data.__checksumAlgorithm === 'simple32bit') {
                // Legacy support for v3.4.2 initial exports
                var expected = data.__checksum;
                delete data.__checksum;
                delete data.__checksumAlgorithm;
                var jsonForHash = JSON.stringify(data);
                var hash = 0;
                for (var h = 0; h < jsonForHash.length; h++) {
                    var ch = jsonForHash.charCodeAt(h);
                    hash = ((hash << 5) - hash) + ch;
                    hash = hash & hash;
                }
                var computed = Math.abs(hash).toString(16).padStart(8, '0');
                if (computed !== expected) {
                    Toast.error('❌ INTEGRITY FAILURE: checksum mismatch. File may be corrupted.');
                    return;
                }
                Debug.log('✅ Legacy checksum verified (consider re-exporting for SHA-256)');
            } else {
                // No checksum - warn but allow for backward compatibility
                Debug.warn('⚠️ No checksum in file - integrity cannot be verified');
            }
            
            // ===== STRUCTURE VALIDATION =====
            if (!data.devices || !Array.isArray(data.devices)) {
                Toast.error('❌ Invalid JSON: missing or invalid "devices" array');
                return;
            }
            if (!data.connections || !Array.isArray(data.connections)) {
                Toast.error('❌ Invalid JSON: missing or invalid "connections" array');
                return;
            }
            
            // ===== COMPLETE SCHEMA VALIDATION =====
            // Collect all device IDs for reference validation
            var deviceIds = data.devices.map(function(d) { return d.id; });
            
            // Validate each device with complete schema
            for (var i = 0; i < data.devices.length; i++) {
                var d = data.devices[i];
                // Normalize rackId for compatibility first
                if (!d.rackId && d.rack) {
                    d.rackId = d.rack;
                }
                var deviceResult = validateDeviceSchema(d, i);
                if (!deviceResult.valid) {
                    Toast.error('❌ ' + deviceResult.error);
                    return;
                }
            }
            
            // Check for duplicate device IDs
            var uniqueIds = new Set(deviceIds);
            if (uniqueIds.size !== deviceIds.length) {
                Toast.error('❌ Invalid data: duplicate device IDs found');
                return;
            }
            
            // Validate each connection with reference validation
            for (var j = 0; j < data.connections.length; j++) {
                var c = data.connections[j];
                var connResult = validateConnectionSchema(c, j, deviceIds);
                if (!connResult.valid) {
                    Toast.error('❌ ' + connResult.error);
                    return;
                }
            }
            
            // Validate rooms if present
            if (data.rooms && !Array.isArray(data.rooms)) {
                Toast.error('❌ Invalid JSON: "rooms" must be an array');
                return;
            }
            
            // Validate each room with schema
            if (data.rooms && data.rooms.length > 0) {
                for (var r = 0; r < data.rooms.length; r++) {
                    var room = data.rooms[r];
                    var roomResult = validateRoomSchema(room, r);
                    if (!roomResult.valid) {
                        Toast.error('❌ ' + roomResult.error);
                        return;
                    }
                }
            }
            
            // ===== ALL VALIDATIONS PASSED - APPLY DATA =====
            Debug.log('✅ All validations passed, applying import...');
            
            try {
                appState.devices = data.devices;
                appState.connections = data.connections;
                appState.rooms = data.rooms || [];
                appState.sites = data.sites || [];
                appState.locations = data.locations || [];
                
                // Sort locations by code to ensure 00 comes before 01
                if (appState.locations.length > 0) {
                    appState.locations.sort(function(a, b) {
                        return parseInt(a.code) - parseInt(b.code);
                    });
                }
                
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
                
                // Set nextLocationId
                if (data.nextLocationId && typeof data.nextLocationId === 'number') {
                    appState.nextLocationId = data.nextLocationId;
                } else {
                    appState.nextLocationId = 21;
                }
                
                // Run migration to ensure locations are properly set up
                migrateToNewLocationSystem();
                
                // Sync rooms with FloorPlan module if available
                if (typeof FloorPlan !== 'undefined' && FloorPlan.setRooms) {
                    FloorPlan.setRooms(appState.rooms);
                }
                
                // Save to storage and server (synchronous save to localStorage + async server save)
                saveToStorage();
                updateUI();
                
                // Log the successful import
                if (typeof ActivityLog !== 'undefined') {
                    var roomCount = (appState.rooms || []).length;
                    var checksumInfo = data.__checksumAlgorithm ? ' [' + data.__checksumAlgorithm + ' verified]' : '';
                    ActivityLog.add('import', 'import', 'Imported ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections, ' + roomCount + ' rooms from ' + file.name + checksumInfo);
                }
                
                Toast.success('✅ Imported: ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections' + (appState.rooms.length ? ', ' + appState.rooms.length + ' rooms' : '') + ' (Verified)');
                
            } catch (applyErr) {
                // ===== AUTOMATIC ROLLBACK ON FAILURE =====
                Debug.error('Import apply failed, performing rollback:', applyErr);
                
                appState.devices = backupState.devices;
                appState.connections = backupState.connections;
                appState.rooms = backupState.rooms;
                appState.sites = backupState.sites;
                appState.locations = backupState.locations;
                appState.nextDeviceId = backupState.nextDeviceId;
                appState.nextLocationId = backupState.nextLocationId;
                
                updateUI();
                Toast.error('❌ Import failed during apply - data restored to previous state. Error: ' + applyErr.message);
            }
            
        } catch (err) {
            Debug.error('Error parsing/validating import:', err);
            Toast.error('❌ Import error: ' + err.message);
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
    
    // Step 1: Show mandatory backup dialog with SweetAlert2
    Swal.fire({
        title: '⚠️ Clear All Data',
        html: '<div class="text-left">' +
            '<p class="text-red-600 font-semibold mb-3">This action will DELETE all devices and connections.</p>' +
            '<p class="text-slate-600 mb-2"><strong>MANDATORY:</strong> You must download a backup first.</p>' +
            '<p class="text-sm text-slate-500">Click "Download Backup" to proceed.</p>' +
            '</div>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: '📥 Download Backup & Continue',
        cancelButtonText: 'Cancel'
    }).then(function(result) {
        if (result.isConfirmed) {
            // Step 2: Force backup download
            var data = {
                devices: appState.devices,
                connections: appState.connections,
                rooms: appState.rooms || [],
                sites: appState.sites || [],
                locations: appState.locations || [],
                nextDeviceId: appState.nextDeviceId,
                nextLocationId: appState.nextLocationId || 21,
                exportedAt: new Date().toISOString(),
                version: CURRENT_VERSION,
                preDeleteBackup: true
            };
            
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'Tiesse-Matrix-Network_backup_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Step 3: Confirm password
            setTimeout(function() {
                Swal.fire({
                    title: 'Confirm Delete',
                    html: '<p class="text-slate-600 mb-3">Enter admin password to confirm deletion:</p>',
                    input: 'password',
                    inputPlaceholder: 'Admin password',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Delete All Data',
                    inputValidator: function(value) {
                        if (!value) return 'Password required';
                    }
                }).then(function(passResult) {
                    if (passResult.isConfirmed && passResult.value) {
                        // Verify password via data.php API
                        var formData = new FormData();
                        formData.append('action', 'verify_password');
                        formData.append('password', passResult.value);
                        
                        fetch('data.php', {
                            method: 'POST',
                            body: formData
                        })
                        .then(function(response) { return response.json(); })
                        .then(function(data) {
                            if (data.valid) {
                                appState.devices = [];
                                appState.connections = [];
                                appState.locations = [];
                                appState.nextDeviceId = 1;
                                appState.nextLocationId = 21;
                                // Keep rooms and sites (floor plan structure)
                                serverSave();
                                updateUI();
                                updateLocationSelect();
                                Toast.success('All data cleared');
                                if (typeof ActivityLog !== 'undefined') {
                                    ActivityLog.add('clear', 'system', 'All data cleared by ' + (Auth.getUser() || 'admin'));
                                }
                            } else {
                                Toast.error('Invalid password');
                            }
                        })
                        .catch(function() {
                            Toast.error('Authentication error');
                        });
                    }
                });
            }, 500);
        }
    });
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
        html += '<p style="font-size:10px;color:var(--color-text-light);margin-bottom:10px;">Total devices: ' + appState.devices.length + ' | Total connections: ' + appState.connections.length + '</p>';
        html += printArea.innerHTML;
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 300);
    } catch (e) {
        Debug.error('Print error:', e);
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
        html += '<p style="font-size:10px;color:var(--color-text-light);margin-bottom:10px;">Total connections: ' + appState.connections.length + '</p>';
        html += printArea.innerHTML;
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 300);
    } catch (e) {
        Debug.error('Print error:', e);
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
// ONLINE USERS TRACKING
// ============================================================================

/**
 * Online Users Tracker - Tracks users viewing/editing the application
 */
var OnlineTracker = (function() {
    var userId = null;
    var heartbeatInterval = null;
    var HEARTBEAT_INTERVAL = 30000; // 30 seconds

    function init() {
        // Get or create user ID
        userId = sessionStorage.getItem('matrixUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
            sessionStorage.setItem('matrixUserId', userId);
        }
        
        // Initial heartbeat
        sendHeartbeat();
        
        // Start periodic heartbeat
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        
        // Send heartbeat on visibility change
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        });
        
        // Send final heartbeat on unload (best effort)
        window.addEventListener('beforeunload', function() {
            // Can't do much here as async requests may not complete
        });
    }

    function sendHeartbeat() {
        var isEditor = Auth && Auth.isLoggedIn && Auth.isLoggedIn();
        var url = 'data.php?action=online&userId=' + encodeURIComponent(userId) + '&isEditor=' + isEditor;
        
        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                updateDisplay(data);
            })
            .catch(function(err) {
                Debug.warn('Online tracker error:', err);
            });
    }

    function updateDisplay(data) {
        var countEl = document.getElementById('onlineUsersCount');
        var indicatorEl = document.getElementById('onlineUsersIndicator');
        
        if (!countEl || !indicatorEl) return;
        
        var total = data.online || 0;
        var viewers = data.viewers || 0;
        var editors = data.editors || 0;
        
        // Format number with leading zero if single digit
        countEl.textContent = total < 10 ? '0' + total : total;
        
        // Build tooltip - always show breakdown
        var tooltip = '👥 Utenti online: ' + total;
        tooltip += '\n👁️ Visualizzatori: ' + viewers;
        tooltip += '\n✏️ Utenti loggati: ' + editors;
        indicatorEl.title = tooltip;
        
        // Change color based on editors
        if (editors > 0) {
            indicatorEl.className = indicatorEl.className.replace(/bg-\w+-100/g, 'bg-amber-100').replace(/text-\w+-700/g, 'text-amber-700');
        } else {
            indicatorEl.className = indicatorEl.className.replace(/bg-\w+-100/g, 'bg-emerald-100').replace(/text-\w+-700/g, 'text-emerald-700');
        }
    }

    function getUserId() {
        return userId;
    }

    return {
        init: init,
        sendHeartbeat: sendHeartbeat,
        getUserId: getUserId
    };
})();

// ============================================================================
// INITIALIZATION
// ============================================================================
function initApp() {
    // Initialize online users tracker
    OnlineTracker.init();
    
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
