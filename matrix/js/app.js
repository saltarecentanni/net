/**
 * TIESSE Matrix Network - Application Core
 * Version: 4.1.006
 * 
 * Bug Fixes (3.6.036):
 * - SECURITY: Use crypto.getRandomValues() for secure ID generation (replaces Math.random())
 * - RELIABILITY: serverSave() now returns Promise for proper async handling
 * - RELIABILITY: Array bounds validation before direct index access
 * - RELIABILITY: localStorage data validation after JSON.parse()
 * - CLEANUP: Removed deprecated _isExternal field from all devices
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
 * │ port.name       │ prefix+pad2 │ eth01, GbE02, SFP01, WAN01    │
 * │ conn.fromPort   │ prefix+pad2 │ eth01 (matches port.name)      │
 * │ conn.toPort     │ prefix+pad2 │ eth24 (matches port.name)      │
 * │ conn.type       │ lowercase   │ lan, wan, trunk, wallport      │
 * │ conn.status     │ lowercase   │ active, disabled               │
 * │ conn.cableMarker│ UPPERCASE   │ AB-01, L3-DMZ                  │
 * │ cableColor      │ #RRGGBB     │ #3b82f6                        │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * This normalization is enforced in:
 * - normalizePortName() - port name padding (eth1→eth01)
 * - normalizeDataCase() - all fields on load
 * - saveDevice() - client-side normalization on save
 * - saveConnection() - client-side normalization on save
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
// SECURE ID GENERATION - Crypto API with fallback
// ============================================================================

/**
 * Generate a cryptographically secure random ID
 * @param {string} prefix - Prefix for the ID (e.g., 'c-' for connections, 'user_')
 * @param {number} length - Number of random bytes (default: 8)
 * @returns {string} - Secure unique ID
 */
function generateSecureId(prefix, length) {
    prefix = prefix || '';
    length = length || 8;
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        var bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        var hex = Array.from(bytes).map(function(b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
        return prefix + Date.now().toString(36) + '-' + hex;
    }
    
    // Fallback for older browsers (less secure but functional)
    Debug.warn('crypto.getRandomValues not available, using fallback');
    var random = '';
    for (var i = 0; i < length * 2; i++) {
        random += Math.floor(Math.random() * 16).toString(16);
    }
    return prefix + Date.now().toString(36) + '-' + random;
}

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
var SUPPORTED_VERSIONS = ['4.1.006', '4.1.001', '4.1.000', '4.0.000', '3.6.037', '3.6.036', '3.6.035', '3.6.032', '3.6.031', '3.6.030', '3.6.029', '3.6.028', '3.6.026', '3.6.024', '3.6.022', '3.5.050', '3.5.049', '3.5.048', '3.5.047', '3.5.045', '3.5.044', '3.5.043', '3.5.042', '3.5.041', '3.5.040', '3.5.037', '3.5.036', '3.5.035', '3.5.034', '3.5.030', '3.5.029', '3.5.014', '3.5.011', '3.5.009', '3.5.008', '3.5.005', '3.5.001', '3.4.5', '3.4.2', '3.4.1', '3.4.0', '3.3.1', '3.3.0', '3.2.2', '3.2.1', '3.2.0', '3.1.3'];
var CURRENT_VERSION = '4.1.006';

// ============================================================================
// DEVICE PREFIX SYSTEM (v4.0.000)
// Standard prefixes prepended to device names for universal identification.
// Each prefix maps to a device type and includes an English tooltip.
// Users can add custom prefixes via appState.customPrefixes[].
// ============================================================================
var DEVICE_PREFIXES = [
    { code: 'MOD',    type: 'modem',       labelIt: 'Modem / Fibra',             tooltip: 'Modem or fiber optic terminal (ONT/ONU) — ISP entry point' },
    { code: 'FW',     type: 'firewall',    labelIt: 'Firewall',                  tooltip: 'Network security appliance (Firewall / UTM)' },
    { code: 'RT',     type: 'router',      labelIt: 'Router',                    tooltip: 'Main infrastructure router' },
    { code: 'RTW',    type: 'router_wifi', labelIt: 'Router Wi-Fi',              tooltip: 'Router with built-in wireless capability' },
    { code: 'SW',     type: 'switch',      labelIt: 'Switch',                    tooltip: 'Network switch (L2/L3) — cable patching hub' },
    { code: 'AP',     type: 'wifi',        labelIt: 'Access Point',              tooltip: 'Wireless access point (Wi-Fi antenna)' },
    { code: 'POE',    type: 'poe',         labelIt: 'PoE Injector/Switch',       tooltip: 'Power over Ethernet — powers devices via network cable' },
    { code: 'SRV',    type: 'server',      labelIt: 'Server',                    tooltip: 'Server (application, database, AD, VM host, etc.)' },
    { code: 'NAS',    type: 'nas',         labelIt: 'NAS / Archiviazione',       tooltip: 'Network Attached Storage — backup and file sharing' },
    { code: 'UPS',    type: 'ups',         labelIt: 'UPS / Nobreak',             tooltip: 'Uninterruptible Power Supply — battery backup for rack' },
    { code: 'IP-PHO', type: 'ip_phone',    labelIt: 'Telefono IP',               tooltip: 'IP Phone / VoIP telephone' },
    { code: 'PRN',    type: 'printer',     labelIt: 'Stampante',                 tooltip: 'Network printer or multifunction device' },
    { code: 'CAM',    type: 'camera',      labelIt: 'Telecamera IP',             tooltip: 'IP security camera (CCTV / surveillance)' },
    { code: 'DVR',    type: 'dvr',         labelIt: 'DVR / NVR',                 tooltip: 'Digital/Network Video Recorder — records camera feeds' },
    { code: 'IOT',    type: 'iot',         labelIt: 'Dispositivo IoT',           tooltip: 'IoT device — sensors, smart TV, intelligent devices' },
    { code: 'TST',    type: 'tst',         labelIt: 'Bancada Test',              tooltip: 'Test bench — reserved ports for maintenance or lab' },
    { code: 'GEN',    type: 'others',      labelIt: 'Generico',                  tooltip: 'Generic device or guest/visitor port' },
    { code: 'PC',     type: 'pc',          labelIt: 'PC / Desktop',              tooltip: 'Personal computer or workstation' },
    { code: 'TAB',    type: 'tablet',      labelIt: 'Tablet',                    tooltip: 'Tablet device' },
    { code: 'PP',     type: 'patch',       labelIt: 'Patch Panel',               tooltip: 'Patch panel — cable management and distribution' },
    { code: 'WJ',     type: 'walljack',    labelIt: 'Presa a Muro',             tooltip: 'Wall jack — RJ45 network outlet on wall' },
    { code: 'ISP',    type: 'isp',         labelIt: 'ISP / Provider',            tooltip: 'Internet Service Provider equipment (modem, ONT)' },
    { code: 'TV',     type: 'tv',          labelIt: 'TV / Display',              tooltip: 'Television, display or monitor' },
    { code: 'HUB',    type: 'hub',         labelIt: 'Hub',                       tooltip: 'Network hub (legacy unmanaged device)' }
];

/**
 * Get the default prefix code for a device type
 * @param {string} type - Device type (e.g., 'switch', 'router')
 * @returns {string} Prefix code (e.g., 'SW', 'RT') or '' if not found
 */
function getDefaultPrefix(type) {
    if (!type) return '';
    var t = type.toLowerCase();
    for (var i = 0; i < DEVICE_PREFIXES.length; i++) {
        if (DEVICE_PREFIXES[i].type === t) return DEVICE_PREFIXES[i].code;
    }
    // Check custom prefixes
    var custom = (appState && appState.customPrefixes) || [];
    for (var j = 0; j < custom.length; j++) {
        if (custom[j].type === t) return custom[j].code;
    }
    return '';
}

/**
 * Get prefix info object by code
 * @param {string} code - Prefix code (e.g., 'SW', 'RT')
 * @returns {Object|null} Prefix info or null
 */
function getPrefixInfo(code) {
    if (!code) return null;
    var c = code.toUpperCase();
    for (var i = 0; i < DEVICE_PREFIXES.length; i++) {
        if (DEVICE_PREFIXES[i].code === c) return DEVICE_PREFIXES[i];
    }
    var custom = (appState && appState.customPrefixes) || [];
    for (var j = 0; j < custom.length; j++) {
        if (custom[j].code === c) return custom[j];
    }
    return null;
}

/**
 * Get all available prefixes (built-in + custom)
 * @returns {Array} Combined prefix list
 */
function getAllPrefixes() {
    var custom = (appState && appState.customPrefixes) || [];
    return DEVICE_PREFIXES.concat(custom);
}

/**
 * Get the display name for a device with prefix prepended
 * Usage: getDeviceDisplayName(device) → "SW Dlink-1024", "SRV SAP-01"
 * This is THE standard function for displaying device names everywhere.
 * @param {Object} device - Device object
 * @returns {string} Formatted display name with prefix
 */
function getDeviceDisplayName(device) {
    if (!device) return '';
    var prefix = device.prefix || getDefaultPrefix(device.type);
    var name = device.name || '';
    if (prefix) {
        // Avoid double prefix: if name already starts with the prefix, skip
        if (name.toUpperCase().indexOf(prefix.toUpperCase() + ' ') === 0) {
            return name;
        }
        return prefix + ' ' + name;
    }
    return name;
}

/**
 * Get just the raw name without prefix (for editing)
 * @param {Object} device - Device object
 * @returns {string} Raw name without prefix
 */
function getDeviceRawName(device) {
    if (!device) return '';
    var prefix = device.prefix || getDefaultPrefix(device.type);
    var name = device.name || '';
    if (prefix && name.toUpperCase().indexOf(prefix.toUpperCase() + ' ') === 0) {
        return name.substring(prefix.length + 1);
    }
    return name;
}

// ============================================================================
// GROUP SYSTEM (v4.0.000)
// Groups are organizational units within locations: racks, zones, areas, etc.
// Each group belongs to exactly one location and has a unique uppercase CODE.
// Devices reference groups via device.rackId = group.code (backward compatible).
// ============================================================================

/**
 * Get a group entity by its code (UPPERCASE)
 * @param {string} code - Group code (e.g., "RACK-NETWORK-01")
 * @returns {Object|null} Group object or null
 */
function getGroupByCode(code) {
    if (!code) return null;
    var upperCode = code.toUpperCase();
    for (var i = 0; i < appState.groups.length; i++) {
        if (appState.groups[i].code === upperCode) return appState.groups[i];
    }
    return null;
}

/**
 * Get a group entity by its ID
 * @param {string} id - Group ID (e.g., "grp-0001")
 * @returns {Object|null} Group object or null
 */
function getGroupById(id) {
    if (!id) return null;
    for (var i = 0; i < appState.groups.length; i++) {
        if (appState.groups[i].id === id) return appState.groups[i];
    }
    return null;
}

/**
 * Get groups filtered by location name, sorted by order then code
 * @param {string} locationName - Location name filter (empty = all groups)
 * @returns {Array} Sorted array of group objects
 */
function getGroupsForLocation(locationName) {
    var groups = appState.groups || [];
    if (!locationName) return groups.slice().sort(groupSortFn);
    
    // Find location entity to get its ID
    var loc = null;
    for (var i = 0; i < appState.locations.length; i++) {
        if (appState.locations[i].name === locationName) {
            loc = appState.locations[i];
            break;
        }
    }
    if (!loc) return [];
    
    return groups.filter(function(g) {
        return g.locationId === loc.id;
    }).sort(groupSortFn);
}

/**
 * Standard group sort: by order (numeric), then by code (alpha)
 */
function groupSortFn(a, b) {
    var orderDiff = (a.order || 0) - (b.order || 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.code || '').localeCompare(b.code || '');
}

/**
 * Generate next group ID (grp-0001, grp-0002, ...)
 * @returns {string} New unique group ID
 */
function generateGroupId() {
    var id = 'grp-' + String(appState.nextGroupId || 1).padStart(4, '0');
    appState.nextGroupId = (appState.nextGroupId || 1) + 1;
    return id;
}

/**
 * Create a new group entity with defaults
 * @param {Object} opts - Group options {code, name, locationId, isRack, description}
 * @returns {Object} New group entity (NOT yet added to appState)
 */
function createGroupEntity(opts) {
    var code = (opts.code || '').toUpperCase().trim();
    return {
        id: generateGroupId(),
        code: code,
        name: opts.name || code,
        locationId: opts.locationId || '',
        isRack: opts.isRack !== undefined ? opts.isRack : (code.indexOf('RACK') !== -1 || code.indexOf('RCK') !== -1),
        rackUnits: opts.rackUnits || (opts.isRack ? 42 : 0),
        color: opts.color || '',
        order: opts.order || (appState.groups.length + 1),
        description: opts.description || ''
    };
}

/**
 * Get the display label for a group: "CODE — Name" (or just CODE if same)
 * @param {string} codeOrId - Group code or ID
 * @returns {string} Display label
 */
function getGroupDisplayLabel(codeOrId) {
    if (!codeOrId) return '';
    var group = getGroupByCode(codeOrId) || getGroupById(codeOrId);
    if (!group) return codeOrId; // Fallback to raw value
    if (group.name && group.name !== group.code) {
        return group.code + ' — ' + group.name;
    }
    return group.code;
}

/**
 * Get the color for a group. Uses group.color if set, otherwise falls back
 * to the dynamic rackColorMap system for backward compatibility.
 * @param {string} code - Group code
 * @returns {string} CSS color value
 */
function getGroupColor(code) {
    if (!code) return 'var(--color-secondary)';
    var group = getGroupByCode(code);
    if (group && group.color) return group.color;
    // Fallback to legacy rackColorMap
    return getRackColor(code);
}

/**
 * Migrate existing rackId values to group entities.
 * Called during data load — only runs if groups array is empty.
 * Creates one group per unique rackId found in devices.
 */
function migrateToGroupSystem() {
    // Skip if groups already exist
    if (appState.groups && appState.groups.length > 0) return false;
    
    appState.groups = [];
    var seenCodes = {};
    var orderCounter = 1;
    
    // Sort devices by location then rackId for consistent ordering
    var sortedDevices = appState.devices.slice().sort(function(a, b) {
        var locA = (a.location || '').localeCompare(b.location || '');
        if (locA !== 0) return locA;
        return (a.rackId || '').localeCompare(b.rackId || '');
    });
    
    for (var i = 0; i < sortedDevices.length; i++) {
        var d = sortedDevices[i];
        var code = (d.rackId || '').toUpperCase();
        if (!code || seenCodes[code]) continue;
        
        // Find location entity for this device
        var locId = '';
        if (d.location) {
            for (var j = 0; j < appState.locations.length; j++) {
                if (appState.locations[j].name === d.location) {
                    locId = appState.locations[j].id;
                    break;
                }
            }
        }
        
        var group = createGroupEntity({
            code: code,
            name: code,
            locationId: locId,
            isRack: code.indexOf('RACK') !== -1 || code.indexOf('RCK') !== -1,
            order: orderCounter++
        });
        
        appState.groups.push(group);
        seenCodes[code] = group.id;
    }
    
    if (appState.groups.length > 0) {
        Debug.log('Migration: Created ' + appState.groups.length + ' groups from rackId values');
        return true;
    }
    return false;
}

/**
 * Update the device form Group select dropdown
 * Shows groups filtered by currently selected location. If no location
 * selected, shows all groups. Preserves current selection if still valid.
 * @param {string} [selectedCode] - Code to pre-select
 */
function updateGroupSelect(selectedCode) {
    var sel = document.getElementById('deviceGroup');
    if (!sel) return;
    
    var locationName = '';
    var locSel = document.getElementById('deviceLocation');
    if (locSel) locationName = locSel.value;
    
    var groups = locationName ? getGroupsForLocation(locationName) : (appState.groups || []).slice().sort(groupSortFn);
    
    var currentVal = selectedCode || sel.value;
    var html = '<option value="">Select Group...</option>';
    
    // Group by type: Racks first, then Non-rack groups
    var racks = groups.filter(function(g) { return g.isRack; });
    var nonRacks = groups.filter(function(g) { return !g.isRack; });
    
    if (racks.length > 0) {
        html += '<optgroup label="🗂️ Rack">';
        for (var i = 0; i < racks.length; i++) {
            var g = racks[i];
            var label = g.code;
            if (g.name && g.name !== g.code) label += ' — ' + g.name;
            var selected = (currentVal === g.code) ? ' selected' : '';
            html += '<option value="' + escapeHtml(g.code) + '"' + selected + '>' + escapeHtml(label) + '</option>';
        }
        html += '</optgroup>';
    }
    if (nonRacks.length > 0) {
        html += '<optgroup label="📂 Groups">';
        for (var i = 0; i < nonRacks.length; i++) {
            var g = nonRacks[i];
            var label = g.code;
            if (g.name && g.name !== g.code) label += ' — ' + g.name;
            var selected = (currentVal === g.code) ? ' selected' : '';
            html += '<option value="' + escapeHtml(g.code) + '"' + selected + '>' + escapeHtml(label) + '</option>';
        }
        html += '</optgroup>';
    }
    
    sel.innerHTML = html;
    
    // Also update the connection form group dropdowns
    if (typeof updateFromGroups === 'function') updateFromGroups();
    if (typeof updateToGroups === 'function') updateToGroups();
}

/**
 * Called when device form Location changes — refresh group select to show
 * only groups belonging to that location.
 */
function onDeviceLocationChange() {
    updateGroupSelect();
}

/**
 * Quick-add a new group from the device form (SweetAlert2 dialog)
 * Defaults locationId to the currently selected location.
 */
function quickAddGroup() {
    // Smart: inherit location from device form automatically
    var locSel = document.getElementById('deviceLocation');
    var currentLocId = '';
    var currentLocName = '';
    if (locSel && locSel.value) {
        var selOpt = locSel.options[locSel.selectedIndex];
        currentLocName = selOpt ? selOpt.textContent : locSel.value;
        for (var i = 0; i < appState.locations.length; i++) {
            if (appState.locations[i].name === locSel.value || appState.locations[i].code === locSel.value) {
                currentLocId = appState.locations[i].id;
                currentLocName = appState.locations[i].code + ' - ' + appState.locations[i].name;
                break;
            }
        }
    }
    
    // Build location section: if known, show read-only badge; otherwise show dropdown
    var locationHtml = '';
    if (currentLocId) {
        locationHtml = '<div style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;display:flex;align-items:center;gap:6px">' +
            '<span style="font-size:13px">📍</span>' +
            '<span style="font-size:12px;font-weight:600;color:#166534">' + escapeHtml(currentLocName) + '</span>' +
            '<input type="hidden" id="swal-group-location" value="' + currentLocId + '">' +
            '</div>';
    } else {
        var locOptions = '<option value="">📍 Select location...</option>';
        (appState.locations || []).forEach(function(loc) {
            locOptions += '<option value="' + loc.id + '">' + loc.code + ' - ' + escapeHtml(loc.name) + '</option>';
        });
        locationHtml = '<div><label class="block text-xs font-semibold text-slate-600 mb-1">📍 Location</label>' +
            '<select id="swal-group-location" class="swal2-input !text-sm" style="margin:0;width:100%;box-sizing:border-box;border:2px solid #94a3b8;border-radius:0.5rem;background:#f8fafc;font-weight:600;color:#334155">' + locOptions + '</select></div>';
    }
    
    Swal.fire({
        title: '➕ New Group',
        html:
            '<div class="text-left text-sm space-y-3">' +
            locationHtml +
            '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg"><label class="flex items-center gap-3 cursor-pointer">' +
            '<input type="checkbox" id="swal-group-israck" class="w-5 h-5 rounded border-slate-400 text-blue-600">' +
            '<span class="text-sm font-semibold text-slate-700">Is this Group a physical Rack?</span></label></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Group Name *</label>' +
            '<input id="swal-group-code" class="swal2-input !text-sm !font-mono !font-bold !uppercase" maxlength="40" placeholder="e.g. RACK-NETWORK-01" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Description</label>' +
            '<input id="swal-group-name" class="swal2-input !text-sm" maxlength="80" placeholder="e.g. Main Network Rack" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '<div id="swal-rack-units-row" style="display:none"><label class="block text-xs font-semibold text-slate-600 mb-1">Rack Units (U)</label>' +
            '<input type="number" id="swal-group-units" class="swal2-input !text-sm" value="42" min="1" max="48" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '</div>',
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
        focusConfirm: false,
        didOpen: function() {
            var cb = document.getElementById('swal-group-israck');
            var unitRow = document.getElementById('swal-rack-units-row');
            cb.addEventListener('change', function() {
                unitRow.style.display = cb.checked ? '' : 'none';
            });
        },
        preConfirm: function() {
            var code = (document.getElementById('swal-group-code').value || '').trim().toUpperCase();
            var name = (document.getElementById('swal-group-name').value || '').trim();
            var locationId = document.getElementById('swal-group-location').value;
            var isRack = document.getElementById('swal-group-israck').checked;
            var rackUnits = parseInt(document.getElementById('swal-group-units').value, 10) || 42;
            
            if (!code || code.length < 2) {
                Swal.showValidationMessage('Name must be at least 2 characters');
                return false;
            }
            if (getGroupByCode(code)) {
                Swal.showValidationMessage('Group "' + code + '" already exists');
                return false;
            }
            return { code: code, name: name || code, locationId: locationId, isRack: isRack, rackUnits: isRack ? rackUnits : 0 };
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            var newGroup = createGroupEntity(result.value);
            appState.groups.push(newGroup);
            updateGroupSelect(newGroup.code);
            var sel = document.getElementById('deviceGroup');
            if (sel) sel.value = newGroup.code;
            serverSave();
            Toast.success('Group "' + newGroup.code + '" created');
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('add', 'group', newGroup.code + (newGroup.name !== newGroup.code ? ' (' + newGroup.name + ')' : ''));
            }
        }
    });
}

/**
 * Open the Group Manager modal (SweetAlert2)
 * Lists all groups organized by location, with CRUD operations.
 */
function openGroupManager() {
    // Check if a location is selected in the device form
    var locSel = document.getElementById('deviceLocation');
    var selectedLocation = locSel ? locSel.value : '';
    
    // Count devices per group (by rackId code)
    var groupCounts = {};
    appState.devices.forEach(function(d) {
        var code = (d.rackId || '').toUpperCase();
        if (code) groupCounts[code] = (groupCounts[code] || 0) + 1;
    });
    
    // Organize groups by location — filter by selected location if any
    var groupsByLocation = {};
    var unassigned = [];
    
    (appState.groups || []).forEach(function(g) {
        // If a location is selected, only show groups for that location
        if (selectedLocation) {
            if (g.locationId) {
                var loc = appState.locations.find(function(l) { return l.id === g.locationId; });
                var locName = loc ? loc.name : '';
                if (locName === selectedLocation || g.locationId === selectedLocation) {
                    if (!groupsByLocation[g.locationId]) groupsByLocation[g.locationId] = [];
                    groupsByLocation[g.locationId].push(g);
                }
            }
            // Skip unassigned groups when filtering by location
        } else {
            if (g.locationId) {
                if (!groupsByLocation[g.locationId]) groupsByLocation[g.locationId] = [];
                groupsByLocation[g.locationId].push(g);
            } else {
                unassigned.push(g);
            }
        }
    });
    
    // Build HTML
    var html = '<div style="text-align:left; max-height:450px; overflow-y:auto;">';
    
    // Groups by location
    var locationsWithGroups = Object.keys(groupsByLocation);
    locationsWithGroups.sort(function(a, b) {
        var locA = appState.locations.find(function(l) { return l.id === a; });
        var locB = appState.locations.find(function(l) { return l.id === b; });
        return parseInt((locA || {}).code || '99') - parseInt((locB || {}).code || '99');
    });
    
    if (locationsWithGroups.length === 0 && unassigned.length === 0) {
        if (selectedLocation) {
            html += '<p style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">No groups for this location.<br>Click <strong>➕ New Group</strong> to create one.</p>';
        } else {
            html += '<p style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">No groups defined.<br>Groups are created automatically from devices<br>or you can create them manually.</p>';
        }
    }
    
    locationsWithGroups.forEach(function(locId) {
        var loc = appState.locations.find(function(l) { return l.id === locId; });
        var locName = loc ? (loc.code + ' - ' + loc.name) : locId;
        var groups = groupsByLocation[locId].sort(groupSortFn);
        
        html += '<h4 style="margin:12px 0 6px; color:#334155; font-weight:bold; font-size:13px;">📍 ' + escapeHtml(locName) + '</h4>';
        html += '<div style="display:grid; gap:3px; margin-bottom:8px;">';
        
        groups.forEach(function(g) {
            var count = groupCounts[g.code] || 0;
            var icon = g.isRack ? '🗂️ ' : '📂 ';
            
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; background:#f8fafc; border-left:3px solid #cbd5e1; border-radius:4px;">';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            html += '<span style="font-size:12px; font-weight:bold; color:#334155;">' + icon + escapeHtml(g.code) + '</span>';
            if (g.name && g.name !== g.code) html += '<span style="font-size:11px; color:#6b7280;">' + escapeHtml(g.name) + '</span>';
            html += '</div>';
            html += '<div style="display:flex; align-items:center; gap:6px;">';
            html += '<span style="font-size:10px; color:#9ca3af;">' + count + ' dev</span>';
            html += '<button onclick="editGroup(\'' + g.id + '\')" style="padding:1px 6px; background:#e0e7ff; color:#4f46e5; border:none; border-radius:3px; font-size:10px; cursor:pointer;">✏️</button>';
            html += '<button onclick="deleteGroup(\'' + g.id + '\')" style="padding:1px 6px; background:#fee2e2; color:#dc2626; border:none; border-radius:3px; font-size:10px; cursor:pointer;">🗑️</button>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
    });
    
    // Unassigned groups
    if (unassigned.length > 0) {
        html += '<h4 style="margin:12px 0 6px; color:#9ca3af; font-weight:bold; font-size:13px;">⚠️ No Location</h4>';
        html += '<div style="display:grid; gap:3px; margin-bottom:8px;">';
        unassigned.forEach(function(g) {
            var count = groupCounts[g.code] || 0;
            var icon = g.isRack ? '🗂️ ' : '📂 ';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; background:#fffbeb; border-left:3px solid #cbd5e1; border-radius:4px;">';
            html += '<span style="font-size:12px; font-weight:bold; color:#334155;">' + icon + escapeHtml(g.code) + '</span>';
            html += '<div style="display:flex; align-items:center; gap:6px;">';
            html += '<span style="font-size:10px; color:#9ca3af;">' + count + ' dev</span>';
            html += '<button onclick="editGroup(\'' + g.id + '\')" style="padding:1px 6px; background:#fef3c7; color:#d97706; border:none; border-radius:3px; font-size:10px; cursor:pointer;">✏️</button>';
            html += '<button onclick="deleteGroup(\'' + g.id + '\')" style="padding:1px 6px; background:#fee2e2; color:#dc2626; border:none; border-radius:3px; font-size:10px; cursor:pointer;">🗑️</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    html += '</div>';
    
    Swal.fire({
        title: '🗂️ Group Manager',
        html: html,
        width: 560,
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: 'Close',
        cancelButtonText: '➕ New Group',
        confirmButtonColor: '#6b7280',
        cancelButtonColor: '#3b82f6',
    }).then(function(result) {
        if (result.dismiss === Swal.DismissReason.cancel) {
            // "New Group" button pressed
            quickAddGroupFromManager();
        }
    });
}

/**
 * Quick-add group from the Group Manager (reopens manager after creation)
 */
function quickAddGroupFromManager() {
    // Smart: check if device form has a location selected
    var locSel = document.getElementById('deviceLocation');
    var currentLocId = '';
    var currentLocName = '';
    if (locSel && locSel.value) {
        for (var i = 0; i < appState.locations.length; i++) {
            if (appState.locations[i].name === locSel.value || appState.locations[i].code === locSel.value) {
                currentLocId = appState.locations[i].id;
                currentLocName = appState.locations[i].code + ' - ' + appState.locations[i].name;
                break;
            }
        }
    }
    
    // Build location section: if context known, show badge; otherwise show dropdown
    var locationHtml = '';
    if (currentLocId) {
        locationHtml = '<div style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;display:flex;align-items:center;gap:6px">' +
            '<span style="font-size:13px">📍</span>' +
            '<span style="font-size:12px;font-weight:600;color:#166534">' + escapeHtml(currentLocName) + '</span>' +
            '<input type="hidden" id="swal-group-location" value="' + currentLocId + '">' +
            '</div>';
    } else {
        var locOptions = '<option value="">📍 Select location...</option>';
        (appState.locations || []).forEach(function(loc) {
            locOptions += '<option value="' + loc.id + '">' + loc.code + ' - ' + escapeHtml(loc.name) + '</option>';
        });
        locationHtml = '<div><label class="block text-xs font-semibold text-slate-600 mb-1">📍 Location</label>' +
            '<select id="swal-group-location" class="swal2-input !text-sm" style="margin:0;width:100%;box-sizing:border-box;border:2px solid #94a3b8;border-radius:0.5rem;background:#f8fafc;font-weight:600;color:#334155">' + locOptions + '</select></div>';
    }
    
    Swal.fire({
        title: '➕ New Group',
        html:
            '<div class="text-left text-sm space-y-3">' +
            locationHtml +
            '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg"><label class="flex items-center gap-3 cursor-pointer">' +
            '<input type="checkbox" id="swal-group-israck" class="w-5 h-5 rounded border-slate-400 text-blue-600">' +
            '<span class="text-sm font-semibold text-slate-700">Is this Group a physical Rack?</span></label></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Group Name *</label>' +
            '<input id="swal-group-code" class="swal2-input !text-sm !font-mono !font-bold !uppercase" maxlength="40" placeholder="e.g. RACK-NETWORK-01" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Description</label>' +
            '<input id="swal-group-name" class="swal2-input !text-sm" maxlength="80" placeholder="e.g. Main Network Rack" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '</div>',
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
        focusConfirm: false,
        preConfirm: function() {
            var code = (document.getElementById('swal-group-code').value || '').trim().toUpperCase();
            var name = (document.getElementById('swal-group-name').value || '').trim();
            var locationId = document.getElementById('swal-group-location').value;
            var isRack = document.getElementById('swal-group-israck').checked;
            
            if (!code || code.length < 2) {
                Swal.showValidationMessage('Name must be at least 2 characters');
                return false;
            }
            if (getGroupByCode(code)) {
                Swal.showValidationMessage('Group "' + code + '" already exists');
                return false;
            }
            return { code: code, name: name || code, locationId: locationId, isRack: isRack };
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            var newGroup = createGroupEntity(result.value);
            appState.groups.push(newGroup);
            updateGroupSelect(newGroup.code);
            serverSave();
            Toast.success('Group "' + newGroup.code + '" created');
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('add', 'group', newGroup.code);
            }
            openGroupManager();
        } else {
            openGroupManager();
        }
    });
}

/**
 * Edit an existing group (SweetAlert2 dialog)
 * @param {string} groupId - Group entity ID
 */
function editGroup(groupId) {
    var group = getGroupById(groupId);
    if (!group) return;
    
    var locOptions = '<option value="">📍 Select location...</option>';
    (appState.locations || []).forEach(function(loc) {
        var sel = (loc.id === group.locationId) ? ' selected' : '';
        locOptions += '<option value="' + loc.id + '"' + sel + '>' + loc.code + ' - ' + escapeHtml(loc.name) + '</option>';
    });
    
    Swal.fire({
        title: '✏️ Edit Group',
        html:
            '<div class="text-left text-sm space-y-3">' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">📍 Location</label>' +
            '<select id="swal-group-location" class="swal2-input !text-sm" style="margin:0;width:100%;box-sizing:border-box;border:2px solid #94a3b8;border-radius:0.5rem;background:#f8fafc;font-weight:600;color:#334155">' + locOptions + '</select></div>' +
            '<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg"><label class="flex items-center gap-3 cursor-pointer">' +
            '<input type="checkbox" id="swal-group-israck" class="w-5 h-5 rounded border-slate-400 text-blue-600"' + (group.isRack ? ' checked' : '') + '>' +
            '<span class="text-sm font-semibold text-slate-700">Is this Group a physical Rack?</span></label></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Group Name *</label>' +
            '<input id="swal-group-code" class="swal2-input !text-sm !font-mono !font-bold" value="' + escapeHtml(group.code) + '" maxlength="40" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1">Description</label>' +
            '<input id="swal-group-name" class="swal2-input !text-sm" value="' + escapeHtml(group.name) + '" maxlength="80" style="margin:0;width:100%;box-sizing:border-box"></div>' +
            '</div>',
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
        focusConfirm: false,
        preConfirm: function() {
            var code = (document.getElementById('swal-group-code').value || '').trim().toUpperCase();
            var name = (document.getElementById('swal-group-name').value || '').trim();
            var locationId = document.getElementById('swal-group-location').value;
            var isRack = document.getElementById('swal-group-israck').checked;
            
            if (!code || code.length < 2) {
                Swal.showValidationMessage('Code must be at least 2 characters');
                return false;
            }
            // Check uniqueness (exclude self)
            var existing = getGroupByCode(code);
            if (existing && existing.id !== groupId) {
                Swal.showValidationMessage('Group "' + code + '" already exists');
                return false;
            }
            return { code: code, name: name || code, locationId: locationId, isRack: isRack, description: name };
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            var oldCode = group.code;
            var newCode = result.value.code;
            
            // Update group entity
            group.code = newCode;
            group.name = result.value.name;
            group.locationId = result.value.locationId;
            group.isRack = result.value.isRack;
            group.description = result.value.description;
            
            // If code changed, update all devices that reference the old code
            if (oldCode !== newCode) {
                var updated = 0;
                appState.devices.forEach(function(d) {
                    if ((d.rackId || '').toUpperCase() === oldCode) {
                        d.rackId = newCode;
                        updated++;
                    }
                });
                if (updated > 0) {
                    Debug.log('Updated ' + updated + ' devices from group "' + oldCode + '" to "' + newCode + '"');
                }
                resetRackColors();
            }
            
            updateGroupSelect();
            serverSave();
            updateUI();
            Toast.success('Group "' + newCode + '" updated');
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('edit', 'group', newCode + (oldCode !== newCode ? ' (was ' + oldCode + ')' : ''));
            }
            // Reopen Group Manager
            openGroupManager();
        } else {
            openGroupManager();
        }
    });
}

/**
 * Delete a group — reassigns devices to empty rackId or prompts for target
 * @param {string} groupId - Group entity ID
 */
function deleteGroup(groupId) {
    var group = getGroupById(groupId);
    if (!group) return;
    
    // Count affected devices
    var affectedCount = 0;
    appState.devices.forEach(function(d) {
        if ((d.rackId || '').toUpperCase() === group.code) affectedCount++;
    });
    
    var warningMsg = affectedCount > 0
        ? '<p style="color:#dc2626; font-size:13px; margin-top:8px;">⚠️ <strong>' + affectedCount + ' devices</strong> are assigned to this group.<br>They will be set to no group.</p>'
        : '<p style="color:#22c55e; font-size:13px; margin-top:8px;">✅ No devices assigned to this group.</p>';
    
    Swal.fire({
        title: '🗑️ Delete Group',
        html: '<p style="font-size:14px;">Delete group <strong>' + escapeHtml(group.code) + '</strong>?</p>' + warningMsg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626'
    }).then(function(result) {
        if (result.isConfirmed) {
            // Remove group from array
            var idx = appState.groups.indexOf(group);
            if (idx !== -1) appState.groups.splice(idx, 1);
            
            // Clear rackId on affected devices
            if (affectedCount > 0) {
                appState.devices.forEach(function(d) {
                    if ((d.rackId || '').toUpperCase() === group.code) {
                        d.rackId = '';
                    }
                });
            }
            
            resetRackColors();
            updateGroupSelect();
            serverSave();
            updateUI();
            Toast.success('Group "' + group.code + '" deleted');
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('delete', 'group', group.code + ' (' + affectedCount + ' devices affected)');
            }
            // Reopen Group Manager
            openGroupManager();
        } else {
            openGroupManager();
        }
    });
}

/**
 * Valid enum values for schema validation
 * NOTE: These include both legacy values (active/disabled) and new values for backward compatibility
 */
var VALID_ENUMS = {
    deviceTypes: ['server', 'switch', 'router', 'firewall', 'workstation', 'laptop', 'phone', 'access_point', 'printer', 'storage', 'nas', 'pdu', 'camera', 'sensor', 'patch_panel', 'patch', 'wifi', 'isp', 'router_wifi', 'modem', 'hub', 'pc', 'ip_phone', 'ups', 'walljack', 'tv', 'display', 'monitor', 'others', 'other', 'tablet', 'wlc', 'poe', 'dvr', 'iot', 'tst', 'external'],
    deviceStatus: ['active', 'disabled', 'online', 'offline', 'maintenance', 'warning', 'error', 'retired'],
    connectionTypes: ['lan', 'wan', 'dmz', 'vlan', 'trunk', 'vpn', 'cloud', 'management', 'servers', 'iot', 'guest', 'voice', 'backup', 'fiber', 'test', 'other'],
    connectionStatus: ['active', 'disabled', 'inactive', 'maintenance', 'reserved', 'planned'],
    rackPositions: ['front', 'rear', 'standalone'],
    locationTypes: ['physical', 'virtual'],
    monitoringMethods: [] // Removed — monitoring is simple ON/OFF
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
    { value: 'Voice', label: '📞 Voice' },
    { value: 'Test', label: '🧪 Test' }
];

// ============================================================================
// GLOBAL STATE (Encapsulated)
// ============================================================================
/**
 * ============================================================================
 * CENTRAL APPLICATION STATE
 * ============================================================================
 * 
 * @typedef {Object} AppState
 * @property {Array<Device>} devices - All network devices
 * @property {Array<Connection>} connections - All device connections
 * @property {Array<Room>} rooms - Floor plan rooms (geometry for visualization)
 * @property {Array<Site>} sites - Company sites/branches
 * @property {Array<Location>} locations - All location entries (mapped + custom)
 * @property {number} nextDeviceId - Auto-increment ID for next device (starts at 1)
 * @property {number} nextLocationId - Auto-increment ID for custom locations (starts at 21)
 * @property {Array<SortConfig>} connSort - Multi-level sort config for connections
 * @property {SortConfig} deviceSort - Sort config for devices
 * @property {string} deviceView - Display mode: 'table' or 'grid'
 * @property {number} matrixLimit - Pagination limit (default 12)
 * @property {boolean} matrixExpanded - Expand all matrix rows
 * @property {Object<string, string>} rackColorMap - Custom colors per rack
 * @property {Object} deviceFilters - Active filter state for device list
 * @property {Object} connFilters - Active filter state for connection list
 * 
 * DATA SCHEMA VALIDATION:
 * - Device: { id, name, type, location, rackId, unit, vendor, model, status, notes, ports, ips, connectedTo }
 * - Connection: { id, from, fromPort, to, toPort, cable, type, status, dxLabel }
 * - Room: { id, name, svg, width, height }
 * - Location: { id, name, type: 'mapped'|'custom' }
 * - Group: { id, code, name, locationId, isRack, rackUnits, color, order, description }
 * 
 * SYNCHRONIZATION: appState is synced via saveToStorage() which updates BOTH:
 * 1. localStorage (for client-side persistence)
 * 2. server via data.php (for server-side backup)
 */
var appState = {
    devices: [],
    connections: [],
    rooms: [],           // Floor plan geometry only
    sites: [],           // Company sites/branches
    locations: [],       // All locations (physical + virtual)
    groups: [],          // Independent groups within locations (v4.0.000)
    nextDeviceId: 1,
    nextLocationId: 21,  // Custom locations start at 21
    nextGroupId: 1,      // Auto-increment group ID (v4.0.000)
    customPrefixes: [],   // User-defined device prefixes (v4.0.000)
    connSort: [{ key: 'id', asc: true }],  // Array for multi-level sorting (up to 3 levels)
    deviceSort: { key: 'rack', asc: true },
    deviceView: 'table',
    connViewMode: 'table',  // Default connections view mode
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
        wan: '#dc2626',       // Red-600 - vibrant red
        dmz: '#f97316',       // Orange-500 - vibrant orange
        trunk: '#22c55e',
        management: '#ec4899', // Pink-500 - vibrant pink
        backup: '#eab308',
        fiber: '#06b6d4',
        wallport: '#a855f7',  // Purple-500 - vibrant purple
        external: '#dc2626',  // Red-600 - vibrant red (same as WAN)
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
        external: 'External/ISP',
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
        appState.connFilters.source = '';    // Reset connection group filter too
        
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
            var toRack = toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest || 'ISP'));
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
            var destRack = toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest || 'ISP'));
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
    
    // Initialize Dashboard when tab is activated
    if (tabId === 'dashboard' && typeof Dashboard !== 'undefined') {
        Dashboard.refresh();
    }
    
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
    var groupedBtn = document.getElementById('deviceViewGrouped');
    var toggleBtn = document.getElementById('deviceExpandToggle');
    
    if (cardsBtn && tableBtn && groupedBtn) {
        // Reset all to inactive
        cardsBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
        tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
        groupedBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
        
        // Activate selected view
        if (view === 'cards') {
            cardsBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            if (toggleBtn) toggleBtn.style.display = 'none';
        } else if (view === 'table') {
            tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            if (toggleBtn) toggleBtn.style.display = 'none';
        } else if (view === 'grouped') {
            groupedBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            if (toggleBtn) toggleBtn.style.display = 'inline-block';
        }
    }
    updateDevicesList();
}

function toggleAllDeviceGroups() {
    // Check if any device groups are currently expanded
    var isAnyExpanded = false;
    var elements = document.querySelectorAll('[id^="dev-group-"][id$="-content"]');
    for (var i = 0; i < elements.length; i++) {
        if (!elements[i].classList.contains('hidden')) {
            isAnyExpanded = true;
            break;
        }
    }
    // Toggle: if any expanded → collapse all, else expand all
    var toggleBtn = document.getElementById('deviceExpandToggle');
    if (isAnyExpanded) {
        collapseAllDeviceGroups();
        if (toggleBtn) toggleBtn.textContent = '▶';
    } else {
        expandAllDeviceGroups();
        if (toggleBtn) toggleBtn.textContent = '▼';
    }
}

function setConnectionsViewMode(mode) {
    appState.connViewMode = mode;
    var tableBtn = document.getElementById('btn-view-table');
    var groupedBtn = document.getElementById('btn-view-grouped');
    var toggleBtn = document.getElementById('connExpandToggle');
    
    if (tableBtn && groupedBtn) {
        if (mode === 'grouped') {
            tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
            groupedBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            if (toggleBtn) toggleBtn.style.display = 'inline-block';
        } else {
            tableBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white';
            groupedBtn.className = 'px-2 py-1 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300';
            if (toggleBtn) toggleBtn.style.display = 'none';
        }
    }
    window.updateConnectionsList();
}

function toggleAllConnGroups() {
    // Check if any connection groups are currently expanded
    var isAnyExpanded = false;
    var elements = document.querySelectorAll('[id^="conn-group-"][id$="-content"]');
    for (var i = 0; i < elements.length; i++) {
        if (!elements[i].classList.contains('hidden')) {
            isAnyExpanded = true;
            break;
        }
    }
    // Toggle: if any expanded → collapse all, else expand all
    var toggleBtn = document.getElementById('connExpandToggle');
    if (isAnyExpanded) {
        collapseAllConnGroups();
        if (toggleBtn) toggleBtn.textContent = '▶';
    } else {
        expandAllConnGroups();
        if (toggleBtn) toggleBtn.textContent = '▼';
    }
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
        localStorage.setItem('networkGroups', JSON.stringify(appState.groups || []));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        localStorage.setItem('nextLocationId', String(appState.nextLocationId || 21));
        localStorage.setItem('nextGroupId', String(appState.nextGroupId || 1));
        localStorage.setItem('customPrefixes', JSON.stringify(appState.customPrefixes || []));
        localStorage.setItem('lastModified', new Date().toISOString().split('T')[0]);
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
        localStorage.setItem('networkGroups', JSON.stringify(appState.groups || []));
        localStorage.setItem('nextDeviceId', String(appState.nextDeviceId));
        localStorage.setItem('nextLocationId', String(appState.nextLocationId || 21));
        localStorage.setItem('nextGroupId', String(appState.nextGroupId || 1));
        localStorage.setItem('customPrefixes', JSON.stringify(appState.customPrefixes || []));
        localStorage.setItem('lastModified', new Date().toISOString().split('T')[0]);
        showSyncIndicator('saved', '✓ Saved!');
        updateGlobalCounters();
        serverSave();
        Toast.success('Data saved successfully!');
    } catch (e) {
        Debug.error('Error saving:', e);
        Toast.error('Error saving: ' + e.message);
    }
}

/**
 * Normalize port name to standard format:
 * - eth ports: lowercase prefix + 2-digit zero-padded number (eth01, eth02...)
 * - Acronym prefixes (GbE, SFP, WAN, MGMT, TTY, RJ11, USB, QSFP, PoE, ISDN):
 *   keep original case + 2-digit zero-padded number
 * - Special ports (wan, console, usb without number): keep as-is
 * @param {string} name - Port name to normalize
 * @returns {string} Normalized port name
 */
function normalizePortName(name) {
    if (!name) return name;
    var m = name.match(/^(eth)(\d+)$/);
    if (m) {
        return m[1] + String(parseInt(m[2], 10)).padStart(2, '0');
    }
    return name;
}

/**
 * Normalize data case to prevent case-sensitivity issues
 * - rackId: UPPERCASE
 * - type: lowercase
 * - status: lowercase
 * - port names: padded (eth01 not eth1)
 * - connection fromPort/toPort: padded to match device ports
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
        // Normalize port names (eth1 → eth01)
        if (d.ports && d.ports.length > 0) {
            for (var j = 0; j < d.ports.length; j++) {
                var newName = normalizePortName(d.ports[j].name);
                if (newName !== d.ports[j].name) {
                    d.ports[j].name = newName;
                    normalized = true;
                }
            }
        }
        
        // Auto-populate prefix from type if not set (v4.0.000 migration)
        if (!d.prefix && d.type) {
            var autoPrefix = getDefaultPrefix(d.type);
            if (autoPrefix) {
                d.prefix = autoPrefix;
                normalized = true;
            }
        }
        
        // Normalize MAC address to uppercase colon-separated (v4.0.000)
        if (d.macAddress) {
            // Remove any separators and convert to uppercase
            var rawMac = d.macAddress.replace(/[:\-.\s]/g, '').toUpperCase();
            if (rawMac.length === 12 && /^[0-9A-F]{12}$/.test(rawMac)) {
                var normalizedMac = rawMac.match(/.{2}/g).join(':');
                if (normalizedMac !== d.macAddress) {
                    d.macAddress = normalizedMac;
                    normalized = true;
                }
            }
        }
        
        // Ensure boolean fields have proper types (v4.0.000 migration)
        if (typeof d.isDhcp === 'string') {
            d.isDhcp = d.isDhcp === 'true';
            normalized = true;
        }
        if (typeof d.monitoringEnabled === 'string') {
            d.monitoringEnabled = d.monitoringEnabled === 'true';
            normalized = true;
        }
    }
    
    // Normalize connection port references
    for (var k = 0; k < appState.connections.length; k++) {
        var c = appState.connections[k];
        if (c.fromPort) {
            var normFrom = normalizePortName(c.fromPort);
            if (normFrom !== c.fromPort) {
                c.fromPort = normFrom;
                normalized = true;
            }
        }
        if (c.toPort) {
            var normTo = normalizePortName(c.toPort);
            if (normTo !== c.toPort) {
                c.toPort = normTo;
                normalized = true;
            }
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
                    appState.groups = data.groups || [];
                    appState.customPrefixes = data.customPrefixes || [];
                    appState.nextDeviceId = data.nextDeviceId || 1;
                    appState.nextLocationId = data.nextLocationId || 21;
                    appState.nextGroupId = data.nextGroupId || 1;
                    
                    // Sort locations by code to ensure 00 comes before 01
                    if (appState.locations.length > 0) {
                        appState.locations.sort(function(a, b) {
                            return parseInt(a.code) - parseInt(b.code);
                        });
                    }
                    
                    // Normalize data (uppercase rackId, etc.)
                    normalizeDataCase();
                    
                    // Ensure default physical locations/rooms always exist
                    ensureDefaultLocationsAndRooms();
                    
                    // Auto-migrate if needed
                    migrateToNewLocationSystem();
                    migrateToGroupSystem();
                    
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
    // FIXED: Return Promise so callers can await/chain the result
    var payload = JSON.stringify({
        _header: {
            application: 'Tiesse Matrix Network',
            developer: 'Rafael Russo',
            date: new Date().toISOString().slice(0, 10),
            version: CURRENT_VERSION
        },
        devices: appState.devices,
        connections: appState.connections,
        rooms: appState.rooms || [],
        sites: appState.sites || [],
        locations: appState.locations || [],
        groups: appState.groups || [],
        nextDeviceId: appState.nextDeviceId,
        nextLocationId: appState.nextLocationId || 21,
        nextGroupId: appState.nextGroupId || 1
    });
    
    function postUrl(url) {
        // Get CSRF token from Auth module if available
        var headers = { 'Content-Type': 'application/json' };
        if (typeof Auth !== 'undefined' && Auth.getCSRFToken()) {
            headers['X-CSRF-Token'] = Auth.getCSRFToken();
        }
        
        return fetch(url, {
            method: 'POST',
            headers: headers,
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
                // Check for CSRF error
                if (data.code === 'CSRF_INVALID' || r.status === 403) {
                    var csrfError = new Error('CSRF token invalid - please login again');
                    csrfError.csrfInvalid = true;
                    throw csrfError;
                }
                if (!r.ok) throw new Error('HTTP ' + r.status);
                if (data.error) throw new Error(data.error);
                return data;
            });
        });
    }
    
    // Try server endpoints in order: data.php (Apache), then relative paths
    // Use relative paths to work in any subdirectory
    // FIXED: Return the Promise chain
    return postUrl('data.php')
        .then(function(data) {
            showSyncIndicator('saved', '✓ Server');
            Debug.log('Server save OK: data.php');
            return { success: true, endpoint: 'data.php' };
        })
        .catch(function(err1) {
            // Check if auth required
            if (err1.authRequired) {
                showSyncIndicator('error', '🔒 Login required');
                if (typeof Auth !== 'undefined') {
                    Auth.showLoginModal();
                }
                return { success: false, error: 'AUTH_REQUIRED' };
            }
            Debug.log('data.php failed:', err1.message, '- trying ./data.php');
            return postUrl('./data.php')
                .then(function(data) {
                    showSyncIndicator('saved', '✓ Server');
                    Debug.log('Server save OK: ./data.php');
                    return { success: true, endpoint: './data.php' };
                })
                .catch(function(err2) {
                    // Check if auth required
                    if (err2.authRequired) {
                        showSyncIndicator('error', '🔒 Login required');
                        if (typeof Auth !== 'undefined') {
                            Auth.showLoginModal();
                        }
                        return { success: false, error: 'AUTH_REQUIRED' };
                    }
                    // All endpoints failed - data is in localStorage only
                    Debug.warn('All server endpoints failed. Data saved to localStorage only.');
                    Debug.warn('Errors:', err1.message, err2.message);
                    showSyncIndicator('error', '⚠ Local only');
                    return { success: false, error: 'SERVER_UNREACHABLE', localOnly: true };
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
        var g = localStorage.getItem('networkGroups');
        var n = localStorage.getItem('nextDeviceId');
        var nl = localStorage.getItem('nextLocationId');
        var ng = localStorage.getItem('nextGroupId');
        
        // FIXED: Validate parsed data is an array before assigning
        if (d) {
            var parsed = JSON.parse(d);
            if (Array.isArray(parsed)) appState.devices = parsed;
        }
        if (c) {
            var parsed = JSON.parse(c);
            if (Array.isArray(parsed)) appState.connections = parsed;
        }
        if (r) {
            var parsed = JSON.parse(r);
            if (Array.isArray(parsed)) appState.rooms = parsed;
        }
        if (s) {
            var parsed = JSON.parse(s);
            if (Array.isArray(parsed)) appState.sites = parsed;
        }
        if (l) {
            var parsed = JSON.parse(l);
            if (Array.isArray(parsed)) appState.locations = parsed;
        }
        if (g) {
            var parsed = JSON.parse(g);
            if (Array.isArray(parsed)) appState.groups = parsed;
        }
        if (n) appState.nextDeviceId = parseInt(n, 10) || 1;
        if (nl) appState.nextLocationId = parseInt(nl, 10) || 21;
        if (ng) appState.nextGroupId = parseInt(ng, 10) || 1;
        
        // Load custom prefixes (v4.0.000)
        var cp = localStorage.getItem('customPrefixes');
        if (cp) {
            var parsed = JSON.parse(cp);
            if (Array.isArray(parsed)) appState.customPrefixes = parsed;
        }
        
        // Normalize data case after loading
        normalizeDataCase();
        
        // Ensure default physical locations/rooms always exist
        ensureDefaultLocationsAndRooms();
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
        // Read group from select, sync to hidden rackId field
        var groupSelect = document.getElementById('deviceGroup');
        var rackId = groupSelect ? groupSelect.value.trim() : '';
        // Sync hidden rackId for backward compatibility
        var hiddenRackId = document.getElementById('rackId');
        if (hiddenRackId) hiddenRackId.value = rackId;
        var orderVal = document.getElementById('deviceOrder').value;
        var order = orderVal === '' ? 1 : parseInt(orderVal, 10);
        var isRear = document.getElementById('deviceRear').checked;
        var name = document.getElementById('deviceName').value.trim();
        var brandModel = document.getElementById('deviceBrandModel').value.trim();
        var type = document.getElementById('deviceType').value;
        var prefix = document.getElementById('devicePrefix') ? document.getElementById('devicePrefix').value : '';
        var status = document.getElementById('deviceStatus').value;
        var service = document.getElementById('deviceService').value.trim();
        var notes = document.getElementById('deviceNotes').value.trim();
        
        // Extended identity fields (v4.0.000)
        var serialNumber = document.getElementById('deviceSerialNumber') ? document.getElementById('deviceSerialNumber').value.trim() : '';
        var assetTag = document.getElementById('deviceAssetTag') ? document.getElementById('deviceAssetTag').value.trim() : '';
        var macAddress = document.getElementById('deviceMacAddress') ? document.getElementById('deviceMacAddress').value.trim().toUpperCase() : '';
        
        // Network fields (v4.0.000)
        var isDhcp = document.getElementById('deviceDhcp') ? document.getElementById('deviceDhcp').checked : false;
        
        // Monitoring field (v4.0.000) — simple ON/OFF
        var monitoringEnabled = document.getElementById('deviceMonitoringEnabled') ? document.getElementById('deviceMonitoringEnabled').checked : false;
        
        // New fields: location, IPs (dynamic), links
        var location = document.getElementById('deviceLocation') ? document.getElementById('deviceLocation').value.trim() : '';
        
        // Get dynamic IP addresses (zone removed from device form — belongs in connections)
        var addresses = [];
        var ipContainer = document.getElementById('deviceIPContainer');
        if (ipContainer) {
            var ipRows = ipContainer.querySelectorAll('.ip-row');
            ipRows.forEach(function(row) {
                var ipField = row.querySelector('.ip-field');
                var ipValue = ipField ? ipField.value.trim() : '';
                if (ipValue) {
                    // Strip /mask from IP if user typed it — mask goes in separate field
                    var cleanIp = ipValue.indexOf('/') !== -1 ? ipValue.split('/')[0] : ipValue;
                    addresses.push({ network: cleanIp, ip: '', vlan: null, zone: '' });
                }
            });
        }
        
        // Get optional Gateway and Mask fields
        var gateway = document.getElementById('deviceGateway') ? document.getElementById('deviceGateway').value.trim() : '';
        var mask = document.getElementById('deviceMask') ? document.getElementById('deviceMask').value.trim() : '';
        
        var links = typeof DeviceLinks !== 'undefined' ? DeviceLinks.getLinks('deviceLinksContainer') : [];

        // Validation
        if (!rackId) {
            Toast.warning('Select a Group');
            if (groupSelect) groupSelect.focus();
            return;
        }
        if (!name) {
            Toast.warning('Enter device Hostname');
            document.getElementById('deviceName').focus();
            return;
        }
        if (!location) {
            Toast.warning('Select a Location');
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
        
        // Auto-derive prefix from type (unified type/sigla system)
        prefix = getDefaultPrefix(type);

        var deviceData = {
            id: editId ? parseInt(editId, 10) : appState.nextDeviceId++,
            rackId: rackId,
            order: order,
            isRear: isRear,
            name: name,
            prefix: prefix,
            brandModel: brandModel,
            type: type,
            serialNumber: serialNumber,
            assetTag: assetTag,
            macAddress: macAddress,
            status: status,
            location: location,
            isDhcp: isDhcp,
            addresses: addresses, // Dynamic IP array with zones
            gateway: gateway,     // Optional gateway (user-defined, no assumptions)
            mask: mask,           // Optional mask (/24 or 255.255.255.0)
            ports: ports,         // Generated from port-type form rows
            links: links,         // External reference links
            monitoringEnabled: monitoringEnabled,
            service: service,
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
    // Reset group select
    var groupSelect = document.getElementById('deviceGroup');
    if (groupSelect) groupSelect.value = '';
    // Reset hidden rackId
    document.getElementById('rackId').value = '';
    document.getElementById('deviceOrder').value = '00';
    document.getElementById('deviceRear').checked = false;
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceBrandModel').value = '';
    document.getElementById('deviceType').value = 'router';
    document.getElementById('deviceStatus').value = 'active';
    document.getElementById('deviceService').value = '';
    document.getElementById('deviceNotes').value = '';
    
    // Reset prefix (auto-derived from type)
    if (document.getElementById('devicePrefix')) document.getElementById('devicePrefix').value = getDefaultPrefix('router');
    
    document.getElementById('portTypeQuantityContainer').innerHTML = '';
    
    // Clear new fields
    if (document.getElementById('deviceLocation')) document.getElementById('deviceLocation').value = '';
    
    // Reset IP container to one empty field
    var ipContainer = document.getElementById('deviceIPContainer');
    if (ipContainer) {
        ipContainer.innerHTML = createIPFieldHTML('', '');
    }
    
    // Clear gateway and mask fields
    if (document.getElementById('deviceGateway')) document.getElementById('deviceGateway').value = '';
    if (document.getElementById('deviceMask')) document.getElementById('deviceMask').value = '';
    
    // Clear extended identity fields (v4.0.000) — hostname merged into name
    if (document.getElementById('deviceSerialNumber')) document.getElementById('deviceSerialNumber').value = '';
    if (document.getElementById('deviceAssetTag')) document.getElementById('deviceAssetTag').value = '';
    if (document.getElementById('deviceMacAddress')) document.getElementById('deviceMacAddress').value = '';
    
    // Clear DHCP field (v4.0.000) — DNS removed
    if (document.getElementById('deviceDhcp')) document.getElementById('deviceDhcp').checked = false;
    toggleDhcpFields();
    
    // Clear monitoring field (v4.0.000) — simple ON/OFF
    if (document.getElementById('deviceMonitoringEnabled')) document.getElementById('deviceMonitoringEnabled').checked = false;
    
    if (document.getElementById('deviceLinksContainer')) document.getElementById('deviceLinksContainer').innerHTML = '';
    
    document.getElementById('saveDeviceButton').textContent = '+ Add';
    var formTitle = document.getElementById('deviceFormTitle');
    if (formTitle) formTitle.textContent = '+ Add Device';
    document.getElementById('cancelDeviceButton').classList.add('hidden');
    highlightEditFields('device', false);
}

// ============================================================================
// DEVICE TOGGLE HELPERS (v4.0.000)
// ============================================================================

/**
 * Toggle IP/Gateway/Mask fields based on DHCP checkbox.
 * When DHCP is enabled, fields are disabled and dimmed (not editable).
 */
function toggleDhcpFields() {
    var dhcpCheckbox = document.getElementById('deviceDhcp');
    var ipContainer = document.getElementById('deviceIPContainer');
    var gatewayField = document.getElementById('deviceGateway');
    var maskField = document.getElementById('deviceMask');
    var addIpBtn = document.querySelector('[onclick="addIPField()"]');
    
    if (!dhcpCheckbox) return;
    
    var isDhcp = dhcpCheckbox.checked;
    var opacity = isDhcp ? '0.4' : '1';
    
    // Disable/enable IP fields
    if (ipContainer) {
        ipContainer.style.opacity = opacity;
        ipContainer.style.pointerEvents = isDhcp ? 'none' : 'auto';
        var ipFields = ipContainer.querySelectorAll('.ip-field');
        ipFields.forEach(function(f) { f.disabled = isDhcp; });
    }
    // Disable/enable Gateway
    if (gatewayField) {
        gatewayField.disabled = isDhcp;
        gatewayField.parentElement.style.opacity = opacity;
    }
    // Disable/enable Mask
    if (maskField) {
        maskField.disabled = isDhcp;
        maskField.parentElement.style.opacity = opacity;
    }
    // Disable/enable + IP button
    if (addIpBtn) {
        addIpBtn.disabled = isDhcp;
        addIpBtn.style.opacity = opacity;
        addIpBtn.style.pointerEvents = isDhcp ? 'none' : 'auto';
    }
}



// ============================================================================
// UNIFIED TYPE/SIGLA MANAGEMENT SYSTEM (v4.0.000)
// ============================================================================

/**
 * Called when device type dropdown changes — auto-updates hidden prefix field
 */
function onDeviceTypeChange() {
    var type = document.getElementById('deviceType').value;
    var prefixField = document.getElementById('devicePrefix');
    if (prefixField) {
        prefixField.value = getDefaultPrefix(type);
    }
}

/**
 * Populates the prefix select dropdown (kept for backward compatibility)
 * In the new unified system, prefix is auto-derived from type
 * @param {string} type - Device type to get default prefix for
 */
function populatePrefixSelect(type) {
    var sel = document.getElementById('devicePrefix');
    if (!sel) return;
    sel.value = getDefaultPrefix(type);
}

/**
 * Open Type/Sigla Manager dialog (SweetAlert2)
 * Shows all types with their sigla, allows creating custom types
 */
function openTypeManager() {
    if (typeof Swal === 'undefined') {
        Toast.error('SweetAlert2 non caricato');
        return;
    }
    
    var allPrefixes = getAllPrefixes();
    
    // Icon map for built-in types
    var typeIcons = {
        'router': '📡', 'switch': '🔀', 'patch': '📌', 'walljack': '🔌',
        'firewall': '🛡️', 'server': '🖥️', 'wifi': '📶',
        'isp': '🌐', 'router_wifi': '📶', 'modem': '📠', 'hub': '🔘',
        'poe': '⚡', 'pc': '💻', 'tablet': '📱',
        'ip_phone': '📞', 'printer': '🖨️', 'nas': '🗄️', 'camera': '📹',
        'dvr': '📼', 'ups': '🔋', 'iot': '🌡️', 'tst': '🧪',
        'tv': '📺', 'others': '📦'
    };
    
    // Build rows with same card style as Group Manager
    var rows = '';
    allPrefixes.forEach(function(p) {
        var isCustom = p.type && p.type.startsWith('custom_');
        var icon = isCustom ? '🔧' : (typeIcons[p.type] || '📦');
        var deleteBtn = isCustom 
            ? '<button onclick="deleteCustomType(\'' + p.code + '\')" style="padding:1px 6px;background:#fee2e2;color:#dc2626;border:none;border-radius:3px;font-size:10px;cursor:pointer;">🗑️</button>' 
            : '';
        rows += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:4px;">';
        rows += '<div style="display:flex;align-items:center;gap:8px;">';
        rows += '<span style="font-size:12px;">' + icon + '</span>';
        rows += '<span style="font-size:12px;font-weight:bold;color:#4f46e5;font-family:monospace;min-width:40px;">' + p.code + '</span>';
        rows += '<span style="font-size:11px;color:#334155;">' + (p.labelIt || p.tooltip || '') + '</span>';
        rows += '</div>';
        rows += '<div style="display:flex;align-items:center;gap:6px;">' + deleteBtn + '</div>';
        rows += '</div>';
    });
    
    var html = '<div style="text-align:left;">';
    html += '<div style="max-height:280px;overflow-y:auto;display:grid;gap:3px;margin-bottom:12px;">' + rows + '</div>';
    
    // New type form
    html += '<div style="border-top:1px solid #e2e8f0;padding-top:12px;">';
    html += '<h4 style="margin:0 0 8px;color:#334155;font-weight:bold;font-size:13px;">➕ New Type</h4>';
    html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 1.5fr;gap:8px;">';
    html += '<div><label style="display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:2px;">Acronym *</label>';
    html += '<input id="swal-type-code" maxlength="6" placeholder="PLX" style="width:100%;box-sizing:border-box;padding:6px 8px;border:2px solid #94a3b8;border-radius:6px;font-size:12px;font-family:monospace;font-weight:bold;text-transform:uppercase;background:#f8fafc;color:#334155"></div>';
    html += '<div><label style="display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:2px;">Description *</label>';
    html += '<input id="swal-type-label" maxlength="40" placeholder="PLC Controller" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;color:#334155"></div>';
    html += '<div><label style="display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:2px;">Label</label>';
    html += '<input id="swal-type-tooltip" maxlength="80" placeholder="Programmable Logic Controller" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;color:#334155"></div>';
    html += '</div></div></div>';
    
    Swal.fire({
        title: '🏷️ Type Manager',
        html: html,
        width: 560,
        showCancelButton: true,
        confirmButtonText: '➕ Create',
        cancelButtonText: 'Close',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        focusConfirm: false,
        preConfirm: function() {
            var code = document.getElementById('swal-type-code').value.trim().toUpperCase();
            var labelIt = document.getElementById('swal-type-label').value.trim();
            var tooltip = document.getElementById('swal-type-tooltip').value.trim();
            if (!code || code.length < 2) {
                Swal.showValidationMessage('Acronym must be at least 2 characters');
                return false;
            }
            if (!labelIt) {
                Swal.showValidationMessage('Please enter a description');
                return false;
            }
            if (getPrefixInfo(code)) {
                Swal.showValidationMessage('Acronym "' + code + '" already exists');
                return false;
            }
            return { code: code, labelIt: labelIt, tooltip: tooltip || labelIt, type: 'custom_' + code.toLowerCase() };
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            appState.customPrefixes.push(result.value);
            loadCustomTypesToSelect();
            // Select the newly created type
            var typeSelect = document.getElementById('deviceType');
            if (typeSelect) {
                var customVal = 'custom_' + result.value.code.toLowerCase();
                typeSelect.value = customVal;
                var prefixField = document.getElementById('devicePrefix');
                if (prefixField) prefixField.value = result.value.code;
            }
            serverSave();
            Toast.success('Type "' + result.value.code + ' — ' + result.value.labelIt + '" created');
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('add', 'prefix', result.value.code + ' (' + result.value.labelIt + ')');
            }
        }
    });
}

/**
 * Load custom types into the deviceType <select> dropdown.
 * Removes existing custom options first, then re-adds from appState.customPrefixes.
 * Uses 🔧 as default icon for custom types.
 */
function loadCustomTypesToSelect() {
    var typeSelect = document.getElementById('deviceType');
    if (!typeSelect) return;
    
    // Remove existing custom options
    var existing = typeSelect.querySelectorAll('option[data-custom]');
    existing.forEach(function(opt) { opt.remove(); });
    
    // Add custom prefixes
    (appState.customPrefixes || []).forEach(function(cp) {
        var opt = document.createElement('option');
        opt.value = cp.type || ('custom_' + cp.code.toLowerCase());
        opt.textContent = '🔧 ' + cp.code + ' \u2014 ' + (cp.labelIt || cp.tooltip || cp.code);
        opt.setAttribute('data-custom', 'true');
        typeSelect.appendChild(opt);
    });
}

/**
 * Delete a custom type/prefix
 */
function deleteCustomType(code) {
    if (!code) return;
    var idx = -1;
    for (var i = 0; i < appState.customPrefixes.length; i++) {
        if (appState.customPrefixes[i].code === code) { idx = i; break; }
    }
    if (idx >= 0) {
        appState.customPrefixes.splice(idx, 1);
        loadCustomTypesToSelect();
        serverSave();
        Toast.success('Type "' + code + '" deleted');
        openTypeManager(); // Re-open to refresh list
    }
}

/**
 * Legacy wrapper — calls openTypeManager()
 */
function showCustomPrefixDialog() {
    openTypeManager();
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
    // Populate group select and set value
    updateGroupSelect(d.rackId || d.rack || '');
    var groupSelect = document.getElementById('deviceGroup');
    if (groupSelect) groupSelect.value = (d.rackId || d.rack || '').toUpperCase();
    // Sync hidden rackId for backward compat
    var hiddenRackId = document.getElementById('rackId');
    if (hiddenRackId) hiddenRackId.value = d.rackId || d.rack || '';
    document.getElementById('deviceOrder').value = String(d.order !== undefined ? d.order : 0).padStart(2, '0');
    document.getElementById('deviceRear').checked = d.isRear || d.rear || false;
    document.getElementById('deviceName').value = d.name || '';
    document.getElementById('deviceBrandModel').value = d.brandModel || '';
    document.getElementById('deviceType').value = d.type || 'router';
    document.getElementById('deviceStatus').value = d.status || 'active';
    
    // Auto-derive prefix from type (unified type/sigla system)
    if (document.getElementById('devicePrefix')) {
        document.getElementById('devicePrefix').value = d.prefix || getDefaultPrefix(d.type || 'router');
    }
    document.getElementById('deviceService').value = d.service || '';
    document.getElementById('deviceNotes').value = d.notes || '';
    
    document.getElementById('saveDeviceButton').textContent = '✏️ Update';
    var formTitle = document.getElementById('deviceFormTitle');
    if (formTitle) formTitle.textContent = '✏️ Edit Device';

    // Fill new fields
    if (document.getElementById('deviceLocation')) {
        document.getElementById('deviceLocation').value = d.location || '';
    }
    
    // Fill IP addresses - supports both old (ip1-4) and new (addresses[]) formats
    // Handles legacy IP/mask format (e.g. "10.10.100.145/24") — extracts mask to separate field
    var ipContainer = document.getElementById('deviceIPContainer');
    var extractedMask = '';
    if (ipContainer) {
        ipContainer.innerHTML = '';
        var hasIPs = false;
        
        // Check for addresses[] array first (new/current format)
        if (d.addresses && d.addresses.length > 0) {
            d.addresses.forEach(function(addr) {
                var ipValue = addr.network || addr.ip || '';
                var zoneValue = addr.zone || '';
                // Extract mask from IP if present (legacy format: "10.10.100.145/24")
                if (ipValue && ipValue.indexOf('/') !== -1 && !d.mask) {
                    var parts = ipValue.split('/');
                    if (!extractedMask) extractedMask = '/' + parts[1];
                    ipValue = parts[0];
                }
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
                    var ipClean = ip.trim();
                    // Extract mask from legacy IP format
                    if (ipClean.indexOf('/') !== -1 && !d.mask) {
                        var parts = ipClean.split('/');
                        if (!extractedMask) extractedMask = '/' + parts[1];
                        ipClean = parts[0];
                    }
                    hasIPs = true;
                    ipContainer.insertAdjacentHTML('beforeend', createIPFieldHTML(ipClean, ''));
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
    
    // Fill gateway and mask (optional fields)
    if (document.getElementById('deviceGateway')) {
        document.getElementById('deviceGateway').value = d.gateway || '';
    }
    if (document.getElementById('deviceMask')) {
        document.getElementById('deviceMask').value = d.mask || extractedMask || '';
    }
    
    // Fill extended identity fields (v4.0.000)
    // Note: hostname merged into main 'name' field — no separate deviceHostname
    if (document.getElementById('deviceSerialNumber')) {
        document.getElementById('deviceSerialNumber').value = d.serialNumber || '';
    }
    if (document.getElementById('deviceAssetTag')) {
        document.getElementById('deviceAssetTag').value = d.assetTag || '';
    }
    if (document.getElementById('deviceMacAddress')) {
        document.getElementById('deviceMacAddress').value = d.macAddress || '';
    }
    
    // Fill DHCP field (v4.0.000) — DNS removed from device form
    if (document.getElementById('deviceDhcp')) {
        document.getElementById('deviceDhcp').checked = d.isDhcp || false;
    }
    toggleDhcpFields();
    
    // Fill monitoring field (v4.0.000) — simple ON/OFF
    if (document.getElementById('deviceMonitoringEnabled')) {
        document.getElementById('deviceMonitoringEnabled').checked = d.monitoringEnabled || false;
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
    
    document.getElementById('deviceLocation').scrollIntoView({ behavior: 'smooth' });
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
        ActivityLog.add('copy', 'device', getDeviceDisplayName(newDevice) + ' from ' + getDeviceDisplayName(original));
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
            deviceName = getDeviceDisplayName(appState.devices[i]);
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
            appState.connections = appState.connections.filter(function(c) { return c.from !== id && c.to !== id; });
            
            if (typeof ActivityLog !== 'undefined') {
                ActivityLog.add('delete', 'device', deviceName + ' (' + deviceType + ')');
            }
            
            // Save to both localStorage and server
            saveToStorage();
            
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
    return '<div class="port-type-row flex items-center gap-1 mb-1 px-1.5 py-1 bg-slate-50 rounded border border-slate-200">' +
        '<select class="px-1 py-1 border border-slate-300 rounded text-xs bg-white min-w-[100px]">' + options + '</select>' +
        '<div class="flex items-center gap-0.5">' +
        '<span class="text-[10px] text-slate-500">Qty:</span>' +
        '<input type="number" min="0" max="999" value="' + qty + '" class="w-10 px-1 py-1 border border-slate-300 rounded text-xs text-center font-semibold">' +
        '</div>' +
        '<label class="flex items-center gap-0.5 text-[10px] text-slate-600 bg-white px-1.5 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">' +
        '<input type="checkbox"' + checked + ' class="w-3 h-3 rounded border-slate-300 text-blue-600"> Start at 0</label>' +
        '<button type="button" onclick="removePortField(this)" class="text-red-500 hover:text-red-700 hover:bg-red-50 px-1 rounded text-xs">✕</button>' +
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
    // Zone removed from device form (belongs in connections) — parameter kept for backward compat
    return '<div class="flex gap-1 items-center ip-row">' +
        '<input type="text" class="ip-field flex-1 px-2 py-1 border border-green-300 rounded text-xs font-mono bg-white" value="' + escapeHtml(ipValue) + '" placeholder="192.168.1.1">' +
        '<button type="button" onclick="removeIPField(this)" class="text-red-500 hover:text-red-700 font-bold px-1 text-xs">✕</button>' +
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
        var externalDest = document.getElementById('externalDest') ? document.getElementById('externalDest').value.trim() : '';
        var wallJackTypeEl = document.getElementById('wallJackType');
        var wallJackType = wallJackTypeEl ? wallJackTypeEl.value : 'rj45';
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
            var destType = isWallJack ? 'Wall Jack location (e.g., Room 101, Reception)' : 'ISP name';
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

        // Get roomId for Wall Jacks and Externals
        var roomId = null;
        if (isWallJack || isExternal) {
            var roomSelect = document.getElementById('wallJackRoomId');
            if (roomSelect && roomSelect.value) {
                roomId = roomSelect.value;
            }
        }

        // ================================================================
        // DATA NORMALIZATION - Professional Standard
        // type/status: lowercase | ports: padded | cableMarker: UPPERCASE
        // ================================================================
        type = type.toLowerCase();
        status = status.toLowerCase();
        fromPort = normalizePortName(fromPort);
        toPort = normalizePortName(toPort);

        // Generate unique ID: preserve existing on edit, create new on add
        // FIXED: Use crypto.getRandomValues() for secure, collision-resistant IDs
        var connId;
        if (editIndex !== '') {
            var existing = appState.connections[parseInt(editIndex, 10)];
            connId = (existing && existing.id) ? existing.id : generateSecureId('c-', 6);
        } else {
            connId = generateSecureId('c-', 6);
        }

        var connData = {
            id: connId,
            from: from,
            fromPort: fromPort || '',
            to: to,
            toPort: (isExternal || isWallJack) ? '' : (toPort || ''),
            externalDest: (isExternal || isWallJack) ? externalDest : '',
            isWallJack: isWallJack,
            wallJackType: isWallJack ? wallJackType : '',
            roomId: roomId,
            type: isWallJack ? 'wallport' : type,
            status: status,
            cableMarker: cableMarker,
            cableColor: cableColor,
            notes: notes
        };

        var actionType = editIndex !== '' ? 'edit' : 'add';
        var logDetails = (fromDevice ? getDeviceDisplayName(fromDevice) : 'Device ' + from) + ':' + (fromPort || '-') + ' → ' +
            (toDevice ? getDeviceDisplayName(toDevice) : (externalDest || 'Device ' + to)) + ':' + (toPort || '-');

        if (editIndex !== '') {
            // FIXED: Add bounds validation before array access
            var idx = parseInt(editIndex, 10);
            if (idx >= 0 && idx < appState.connections.length) {
                appState.connections[idx] = connData;
                Toast.success('Connection updated successfully');
            } else {
                Debug.error('Invalid connection index:', idx);
                Toast.error('Error: Connection not found');
                return;
            }
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
        var extDestEl = document.getElementById('externalDest');
        if (extDestEl) extDestEl.value = c.externalDest;
        toggleExternalDest();
        // Set wallJackType if available
        var wjTypeEl = document.getElementById('wallJackType');
        if (wjTypeEl) wjTypeEl.value = c.wallJackType || 'rj45';
        // Set the room after dropdown is populated
        if (c.roomId !== undefined && c.roomId !== null) {
            var wjRoomEl = document.getElementById('wallJackRoomId');
            if (wjRoomEl) wjRoomEl.value = c.roomId;
        }
    } else if (c.externalDest && !c.to) {
        document.getElementById('toLocation').value = '';
        updateToGroups();
        document.getElementById('toDevice').value = 'external';
        var extDestEl2 = document.getElementById('externalDest');
        if (extDestEl2) extDestEl2.value = c.externalDest;
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
    var externalDestEl = document.getElementById('externalDest');
    if (externalDestEl) externalDestEl.value = '';
    var wallJackRoomEl = document.getElementById('wallJackRoomId');
    if (wallJackRoomEl) wallJackRoomEl.value = '';
    var wallJackTypeEl = document.getElementById('wallJackType');
    if (wallJackTypeEl) wallJackTypeEl.value = 'rj45';
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
        var fromDevice = appState.devices.find(function(d) { return d.id === conn.from; });
        var toDevice = appState.devices.find(function(d) { return d.id === conn.to; });
        logDetails = (fromDevice ? getDeviceDisplayName(fromDevice) : 'Unknown') + ' → ' + (toDevice ? getDeviceDisplayName(toDevice) : conn.externalDest || 'Unknown');
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
            
            // Save to both localStorage and server
            saveToStorage();
            
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
    var wallJackTypeContainer = document.getElementById('wallJackTypeContainer');
    
    if (toDevice === 'external') {
        toPortContainer.classList.add('hidden');
        if (externalDestContainer) externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = '🌐 External Destination';
        if (externalDestInput) externalDestInput.placeholder = 'ISP, WAN, Cloud...';
        // Show Room for External too (same as WallJack)
        if (wallJackRoomContainer) {
            wallJackRoomContainer.classList.remove('hidden');
            populateWallJackRoomSelect();
        }
        // Hide WallJack type selector for External
        if (wallJackTypeContainer) wallJackTypeContainer.classList.add('hidden');
    } else if (toDevice === 'walljack') {
        toPortContainer.classList.add('hidden');
        if (externalDestContainer) externalDestContainer.classList.remove('hidden');
        if (externalDestLabel) externalDestLabel.textContent = '🔌 Wall Jack ID';
        if (externalDestInput) externalDestInput.placeholder = 'Z1, Z2, Z3...';
        if (wallJackRoomContainer) {
            wallJackRoomContainer.classList.remove('hidden');
            populateWallJackRoomSelect();
        }
        // Show WallJack type selector (RJ45/RJ11)
        if (wallJackTypeContainer) wallJackTypeContainer.classList.remove('hidden');
    } else {
        toPortContainer.classList.remove('hidden');
        if (externalDestContainer) externalDestContainer.classList.add('hidden');
        if (wallJackTypeContainer) wallJackTypeContainer.classList.add('hidden');
        if (wallJackRoomContainer) wallJackRoomContainer.classList.add('hidden');
    }
}

/**
 * Populate the Wall Jack room dropdown with available rooms
 * Using standard location format: "code - name"
 */
function populateWallJackRoomSelect() {
    var select = document.getElementById('wallJackRoomId');
    if (!select) return;
    
    var currentValue = select.value;
    select.innerHTML = '<option value="">📍 Select Location</option>';
    
    // Get rooms from appState (main data source)
    var rooms = appState.rooms || [];
    
    // Also try FloorPlan if available (fallback for backwards compatibility)
    if (rooms.length === 0 && typeof FloorPlan !== 'undefined' && FloorPlan.getRooms) {
        rooms = FloorPlan.getRooms() || [];
    }
    
    // Sort rooms by id
    if (rooms.length > 0) {
        rooms.sort(function(a, b) { 
            return parseInt(a.id) - parseInt(b.id); 
        });
        
        rooms.forEach(function(room) {
            var option = document.createElement('option');
            option.value = room.id;
            // Standard format: "code - name" (same as LocationFilter)
            var code = String(room.id).padStart(2, '0');
            var name = room.nickname || ('Room ' + room.id);
            option.textContent = code + ' - ' + name;
            select.appendChild(option);
        });
    }
    
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
 * Get unique groups (rackIds) optionally filtered by location.
 * Uses appState.groups entities if available, otherwise falls back to
 * scanning device rackId values directly.
 * Handles both "XX - Name" and plain "Name" location formats.
 */
function getGroupsByLocation(location) {
    var groups = [];
    
    // If we have group entities, use them (includes empty groups)
    if (appState.groups && appState.groups.length > 0) {
        if (!location || location === '') {
            // No filter — return all group codes
            for (var i = 0; i < appState.groups.length; i++) {
                groups.push(appState.groups[i].code);
            }
        } else {
            // Filter by location — find matching location entity
            var matchedLoc = null;
            for (var j = 0; j < appState.locations.length; j++) {
                var loc = appState.locations[j];
                if (loc.name === location || location.indexOf(loc.name) !== -1 || loc.name.indexOf(location) !== -1) {
                    matchedLoc = loc;
                    break;
                }
            }
            if (matchedLoc) {
                for (var k = 0; k < appState.groups.length; k++) {
                    if (appState.groups[k].locationId === matchedLoc.id) {
                        groups.push(appState.groups[k].code);
                    }
                }
            }
            // Also include groups from devices at this location (for backward compat)
            for (var m = 0; m < appState.devices.length; m++) {
                var d = appState.devices[m];
                var deviceLoc = d.location || 'No Location';
                var matches = deviceLoc === location || 
                              deviceLoc.indexOf(location) !== -1 ||
                              location.indexOf(deviceLoc) !== -1;
                if (matches && d.rackId && groups.indexOf(d.rackId) === -1) {
                    groups.push(d.rackId);
                }
            }
        }
    } else {
        // Fallback: scan device rackIds directly (legacy mode)
        for (var n = 0; n < appState.devices.length; n++) {
            var dev = appState.devices[n];
            var devLoc = dev.location || 'No Location';
            var locMatches = !location || location === '' || 
                          devLoc === location || 
                          devLoc.indexOf(location) !== -1 ||
                          location.indexOf(devLoc) !== -1;
            if (locMatches) {
                if (dev.rackId && groups.indexOf(dev.rackId) === -1) {
                    groups.push(dev.rackId);
                }
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
        opts += '<option value="' + d.id + '" style="' + statusStyle + '"' + selected + '>' + statusPrefix + '[' + String(d.order).padStart(2, '0') + '] ' + getDeviceDisplayName(d) + rearIndicator + '</option>';
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
        opts += '<option value="' + d.id + '" style="' + statusStyle + '"' + selected + '>' + statusPrefix + '[' + String(d.order).padStart(2, '0') + '] ' + getDeviceDisplayName(d) + rearIndicator + '</option>';
    }
    
    // Special destinations
    opts += '<option disabled style="font-size:10px;color:var(--color-text-muted);">── Special ──</option>';
    opts += '<option value="walljack" style="color:var(--color-accent-hover);font-weight:bold;">🔌 Wall Jack / Presa LAN</option>';
    opts += '<option value="external" style="color:var(--color-danger-hover);font-weight:bold;">📡 External/ISP</option>';
    
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
    sel.innerHTML = '<option value="">Select source port</option>';
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
                    label = icon + ' ' + escapeHtml(p.name) + ' (Free)';
                } else if (connCount === 1) {
                    label = icon + ' ' + escapeHtml(p.name) + ' (1/2 - available)';
                } else {
                    label = icon + ' ' + escapeHtml(p.name) + ' (2/2 - full)';
                }
            } else {
                label = icon + ' ' + escapeHtml(p.name) + ' ' + (used ? '(In use)' : '(Free)');
            }
            
            var selected = (selectedPort === p.name) ? 'selected' : '';
            sel.innerHTML += '<option value="' + escapeHtml(p.name) + '" ' + selected + '>' + label + '</option>';
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
    sel.innerHTML = '<option value="">Select destination port</option>';
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
                    label = icon + ' ' + escapeHtml(p.name) + ' (Free)';
                } else if (connCount === 1) {
                    label = icon + ' ' + escapeHtml(p.name) + ' (1/2 - available)';
                } else {
                    label = icon + ' ' + escapeHtml(p.name) + ' (2/2 - full)';
                }
            } else {
                label = icon + ' ' + escapeHtml(p.name) + ' ' + (used ? '(In use)' : '(Free)');
            }
            
            var selected = (selectedPort === p.name) ? 'selected' : '';
            sel.innerHTML += '<option value="' + escapeHtml(p.name) + '" ' + selected + '>' + label + '</option>';
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
    updateGroupSelect();
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
    
    // Update last modification date
    var lastUpdateDate = document.getElementById('lastUpdateDate');
    if (lastUpdateDate) {
        var lastModified = localStorage.getItem('lastModified') || new Date().toISOString().split('T')[0];
        // Convert YYYY-MM-DD to DD/MM/YYYY
        var parts = lastModified.split('-');
        var formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
        lastUpdateDate.textContent = formattedDate;
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
    
    // Note: Use "Manage Locations" button to add new locations
    // The "+ Add location" option has been removed to streamline the UI
    
    // Restore value if editing
    if (currentValue) {
        select.value = currentValue;
    }
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
    
    // Build HTML — same card pattern as Group Manager
    var html = '<div style="text-align:left; max-height:450px; overflow-y:auto;">';
    
    if (mappedLocs.length === 0 && customLocs.length === 0) {
        html += '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px;">No locations defined.<br>Use Floor Plan to create rooms<br>or add custom locations manually.</p>';
    }
    
    // Mapped Locations section
    if (mappedLocs.length > 0) {
        html += '<h4 style="margin:12px 0 6px;color:#334155;font-weight:bold;font-size:13px;">🏠 Mapped Locations</h4>';
        html += '<div style="display:grid;gap:3px;margin-bottom:8px;">';
        mappedLocs.forEach(function(loc) {
            var count = locationCounts[loc.name] || 0;
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#f8fafc;border-left:3px solid #a78bfa;border-radius:4px;">';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            html += '<span style="font-size:12px;font-weight:bold;color:#7c3aed;">' + loc.code + '</span>';
            html += '<span style="font-size:11px;color:#334155;">' + escapeHtml(loc.name) + '</span>';
            html += '</div>';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            html += '<span style="font-size:10px;color:#9ca3af;">' + count + ' dev</span>';
            html += '<button onclick="editMappedLocationName(\'' + loc.id + '\')" style="padding:1px 6px;background:#e0e7ff;color:#4f46e5;border:none;border-radius:3px;font-size:10px;cursor:pointer;">✏️</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    // Custom Locations section
    html += '<h4 style="margin:12px 0 6px;color:#334155;font-weight:bold;font-size:13px;">🪧 Custom Locations</h4>';
    if (customLocs.length > 0) {
        html += '<div style="display:grid;gap:3px;margin-bottom:8px;">';
        customLocs.forEach(function(loc) {
            var count = locationCounts[loc.name] || 0;
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#f8fafc;border-left:3px solid #fb923c;border-radius:4px;">';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            html += '<span style="font-size:12px;font-weight:bold;color:#ea580c;">' + loc.code + '</span>';
            html += '<span style="font-size:11px;color:#334155;">' + escapeHtml(loc.name) + '</span>';
            html += '</div>';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            html += '<span style="font-size:10px;color:#9ca3af;">' + count + ' dev</span>';
            html += '<button onclick="renameCustomLocation(\'' + loc.id + '\')" style="padding:1px 6px;background:#e0e7ff;color:#4f46e5;border:none;border-radius:3px;font-size:10px;cursor:pointer;">✏️</button>';
            html += '<button onclick="deleteCustomLocation(\'' + loc.id + '\')" style="padding:1px 6px;background:#fee2e2;color:#dc2626;border:none;border-radius:3px;font-size:10px;cursor:pointer;">🗑️</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    } else {
        html += '<p style="color:#9ca3af;font-size:12px;margin-bottom:8px;">No custom locations yet.</p>';
    }
    
    html += '</div>';
    
    Swal.fire({
        title: '📍 Location Manager',
        html: html,
        width: 560,
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: 'Close',
        cancelButtonText: '➕ New Location',
        confirmButtonColor: '#6b7280',
        cancelButtonColor: '#3b82f6',
    }).then(function(result) {
        if (result.dismiss === Swal.DismissReason.cancel) {
            addNewLocationFromManager();
        }
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
        // ===== PRE-EXPORT VALIDATION =====
        if (typeof JSONValidatorFrontend !== 'undefined') {
            var preExportReport = JSONValidatorFrontend.validateBeforeExport(appState);
            if (preExportReport.critical.length > 0) {
                Toast.error('❌ Cannot export - validation errors:\n' + preExportReport.critical.slice(0, 3).join('\n'));
                Debug.error('Export validation failed:', preExportReport.critical);
                return;
            }
        }
        
        var payload = {
            _header: {
                application: 'Tiesse Matrix Network',
                developer: 'Rafael Russo',
                date: new Date().toISOString().slice(0, 10),
                version: CURRENT_VERSION
            },
            devices: appState.devices,
            connections: appState.connections,
            rooms: appState.rooms || [],
            sites: appState.sites || [],
            locations: appState.locations || [],
            groups: appState.groups || [],
            customPrefixes: appState.customPrefixes || [],
            nextDeviceId: appState.nextDeviceId,
            nextLocationId: appState.nextLocationId || 21,
            nextGroupId: appState.nextGroupId || 1,
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
            groups: JSON.parse(JSON.stringify(appState.groups || [])),
            customPrefixes: JSON.parse(JSON.stringify(appState.customPrefixes || [])),
            nextDeviceId: appState.nextDeviceId,
            nextLocationId: appState.nextLocationId || 21,
            nextGroupId: appState.nextGroupId || 1
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
            
            // ===== INTELLIGENT JSON VALIDATION (Frontend System) =====
            if (typeof JSONValidatorFrontend !== 'undefined') {
                var validationReport = JSONValidatorFrontend.validateImportData(data);
                if (validationReport.critical.length > 0) {
                    Toast.error('❌ Import blocked by validation system:\n' + validationReport.critical.slice(0, 3).join('\n'));
                    Debug.error('Validation critical errors:', validationReport.critical);
                    return;
                }
                if (validationReport.deprecated.length > 0) {
                    Debug.warn('⚠️ Import contains deprecated fields:', validationReport.deprecated.slice(0, 3));
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
                appState.groups = data.groups || [];
                appState.customPrefixes = data.customPrefixes || [];
                
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
                
                // Set nextGroupId
                if (data.nextGroupId && typeof data.nextGroupId === 'number') {
                    appState.nextGroupId = data.nextGroupId;
                } else {
                    appState.nextGroupId = (appState.groups.length || 0) + 1;
                }
                
                // Run migration to ensure locations are properly set up
                migrateToNewLocationSystem();
                
                // Auto-migrate rackId values to group entities if needed
                migrateToGroupSystem();
                
                // Normalize imported data (rackId UPPER, type/status lower, port padding)
                normalizeDataCase();
                
                // Ensure default physical locations/rooms always exist after import
                ensureDefaultLocationsAndRooms();
                
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
                appState.groups = backupState.groups;
                appState.customPrefixes = backupState.customPrefixes;
                appState.nextDeviceId = backupState.nextDeviceId;
                appState.nextLocationId = backupState.nextLocationId;
                appState.nextGroupId = backupState.nextGroupId;
                
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
                _header: {
                    application: 'Tiesse Matrix Network',
                    developer: 'Rafael Russo',
                    date: new Date().toISOString().slice(0, 10),
                    version: CURRENT_VERSION
                },
                devices: appState.devices,
                connections: appState.connections,
                rooms: appState.rooms || [],
                sites: appState.sites || [],
                locations: appState.locations || [],
                groups: appState.groups || [],
                customPrefixes: appState.customPrefixes || {},
                nextDeviceId: appState.nextDeviceId,
                nextLocationId: appState.nextLocationId || 21,
                nextGroupId: appState.nextGroupId || 1,
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
                        fetch('data.php?action=verify_password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: passResult.value })
                        })
                        .then(function(response) { return response.json(); })
                        .then(function(data) {
                            if (data.valid) {
                                appState.devices = [];
                                appState.connections = [];
                                appState.groups = [];
                                appState.nextDeviceId = 1;
                                appState.nextGroupId = 1;
                                // Restore default physical locations, rooms and sites
                                appState.locations = getDefaultLocations();
                                appState.rooms = getDefaultRooms();
                                appState.sites = getDefaultSites();
                                appState.nextLocationId = 22;
                                saveToStorage();
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
        html += '<p style="font-size:10px;color:#64748b;margin-bottom:10px;">Total devices: ' + appState.devices.length + ' | Total connections: ' + appState.connections.length + '</p>';
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
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connections - Tiesse Network</title>';
        html += getPrintStyles();
        html += '<style>.print-hide-id { display: none !important; }</style>';
        html += '</head><body>';
        html += '<h2>⚡ Connections - ' + new Date().toLocaleDateString() + '</h2>';
        html += '<p style="font-size:10px;color:#64748b;margin-bottom:10px;">Total connections: ' + appState.connections.length + '</p>';
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

function printDevices() {
    // Get filtered devices to print
    var filteredDevices = typeof getFilteredDevices === 'function' ? getFilteredDevices() : appState.devices;
    var sorted = typeof getDevicesSortedBy === 'function' 
        ? getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc, filteredDevices)
        : filteredDevices;
    
    if (sorted.length === 0) {
        Toast.warning('No devices to print');
        return;
    }
    
    try {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devices List - Tiesse Network</title>';
        html += getPrintStyles();
        html += '<style>';
        html += 'table { font-size: 9px; }';
        html += 'th { background-color: #1e293b !important; color: white !important; padding: 6px 4px !important; }';
        html += 'td { padding: 4px !important; vertical-align: middle !important; }';
        html += '.status-on { background-color: #dcfce7 !important; color: #166534 !important; padding: 2px 6px; border-radius: 10px; }';
        html += '.status-off { background-color: #fee2e2 !important; color: #991b1b !important; padding: 2px 6px; border-radius: 10px; }';
        html += '.pos-badge { background-color: #dbeafe !important; color: #1e40af !important; padding: 2px 6px; border-radius: 10px; font-weight: bold; }';
        html += '.rack-badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }';
        html += '</style>';
        html += '</head><body>';
        
        // Header with filters info
        var filterInfo = [];
        if (appState.deviceFilters.location) filterInfo.push('Location: ' + appState.deviceFilters.location);
        if (appState.deviceFilters.source) filterInfo.push('Group: ' + appState.deviceFilters.source);
        if (appState.deviceFilters.type) filterInfo.push('Type: ' + appState.deviceFilters.type);
        if (appState.deviceFilters.status) filterInfo.push('Status: ' + appState.deviceFilters.status);
        
        html += '<h2>📋 Devices List - ' + new Date().toLocaleDateString() + '</h2>';
        if (filterInfo.length > 0) {
            html += '<p style="font-size:10px;color:#64748b;margin-bottom:5px;">Filters: ' + filterInfo.join(' | ') + '</p>';
        }
        html += '<p style="font-size:10px;color:#64748b;margin-bottom:10px;">Showing ' + sorted.length + ' of ' + appState.devices.length + ' devices</p>';
        
        // Build table
        html += '<table>';
        html += '<thead><tr>';
        html += '<th>Location</th>';
        html += '<th>Group</th>';
        html += '<th>Pos</th>';
        html += '<th>Device Name</th>';
        html += '<th>Brand/Model</th>';
        html += '<th>Type</th>';
        html += '<th>Status</th>';
        html += '<th>IP Addresses</th>';
        html += '<th>Service</th>';
        html += '<th>Ports</th>';
        html += '<th>Conn</th>';
        html += '</tr></thead><tbody>';
        
        for (var i = 0; i < sorted.length; i++) {
            var d = sorted[i];
            var disabled = d.status === 'disabled';
            
            // Count connections
            var totalConnections = 0;
            for (var ci = 0; ci < appState.connections.length; ci++) {
                if (appState.connections[ci].from === d.id || appState.connections[ci].to === d.id) {
                    totalConnections++;
                }
            }
            
            // Count used ports
            var usedPorts = 0;
            if (d.ports) {
                for (var pi = 0; pi < d.ports.length; pi++) {
                    if (typeof isPortUsed === 'function' && isPortUsed(d.id, d.ports[pi].name)) {
                        usedPorts++;
                    }
                }
            }
            
            // Get IPs
            var ipText = '';
            if (d.addresses && d.addresses.length > 0) {
                ipText = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean).join(', ');
            } else if (d.ip1 || d.ip2 || d.ip3 || d.ip4) {
                ipText = [d.ip1, d.ip2, d.ip3, d.ip4].filter(Boolean).join(', ');
            }
            
            var rackColor = typeof getRackColor === 'function' ? getRackColor(d.rackId) : '#64748b';
            var rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            html += '<tr style="background-color:' + rowBg + '">';
            html += '<td>' + escapeHtml(d.location || '-') + '</td>';
            html += '<td><span class="rack-badge" style="background-color:' + rackColor + '20;color:' + rackColor + '">' + escapeHtml(d.rackId || '-').toUpperCase() + '</span></td>';
            html += '<td style="text-align:center"><span class="pos-badge">' + String(d.order || 0).padStart(2, '0') + '</span>' + ((d.isRear || d.rear) ? ' ↩' : '') + '</td>';
            html += '<td style="font-weight:600">' + (disabled ? '✗ ' : '') + escapeHtml(getDeviceDisplayName(d) || '-') + '</td>';
            html += '<td>' + escapeHtml(d.brandModel || '-') + '</td>';
            html += '<td style="text-transform:uppercase">' + escapeHtml(d.type || '-') + '</td>';
            html += '<td style="text-align:center"><span class="' + (disabled ? 'status-off' : 'status-on') + '">' + (disabled ? 'OFF' : 'ON') + '</span></td>';
            html += '<td style="font-family:monospace;font-size:8px">' + escapeHtml(ipText || '-') + '</td>';
            html += '<td>' + escapeHtml(d.service || '-') + '</td>';
            html += '<td style="text-align:center">' + (d.ports ? d.ports.length : 0) + ' (' + usedPorts + ')</td>';
            html += '<td style="text-align:center">' + totalConnections + '</td>';
            html += '</tr>';
        }
        
        html += '</tbody></table>';
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
 * FIXED v3.6.022: Added proper cleanup to prevent memory leaks
 */
var OnlineTracker = (function() {
    var userId = null;
    var heartbeatInterval = null;
    var HEARTBEAT_INTERVAL = 30000; // 30 seconds
    var visibilityChangeListener = null;
    var beforeUnloadListener = null;

    function init() {
        // Get or create user ID
        userId = sessionStorage.getItem('matrixUserId');
        if (!userId) {
            // FIXED: Use secure ID generation instead of Math.random()
            userId = generateSecureId('user_', 8);
            sessionStorage.setItem('matrixUserId', userId);
        }
        
        // Initial heartbeat
        sendHeartbeat();
        
        // Start periodic heartbeat
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        
        // Send heartbeat on visibility change (store listener for cleanup)
        visibilityChangeListener = function() {
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        };
        document.addEventListener('visibilitychange', visibilityChangeListener);
        
        // Setup cleanup on page unload
        beforeUnloadListener = function() {
            cleanup();
        };
        window.addEventListener('beforeunload', beforeUnloadListener);
    }
    
    function cleanup() {
        // Clear heartbeat interval to prevent memory leak
        if (heartbeatInterval !== null) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        
        // Remove event listeners to prevent memory leak
        if (visibilityChangeListener !== null) {
            document.removeEventListener('visibilitychange', visibilityChangeListener);
            visibilityChangeListener = null;
        }
        if (beforeUnloadListener !== null) {
            window.removeEventListener('beforeunload', beforeUnloadListener);
            beforeUnloadListener = null;
        }
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
        getUserId: getUserId,
        cleanup: cleanup
    };
})();

// ============================================================================
// INITIALIZATION
// ============================================================================
function initApp() {
    // Initialize online users tracker
    OnlineTracker.init();
    
    // Initialize device prefix selector (v4.0.000)
    populatePrefixSelect('router');
    
    serverLoad().then(function(ok) {
        if (!ok) loadFromStorage();
        
        // Auto-migrate rackId values to group entities if needed (v4.0.000)
        migrateToGroupSystem();
        
        // Load custom types into select dropdown (v4.0.000)
        loadCustomTypesToSelect();
        
        // Initialize group select in device form
        updateGroupSelect();
        
        updateUI();
        updateGlobalCounters();
        // Auto-save disabled to prevent data loss with multiple sessions
        Toast.info('Tiesse Matrix Network loaded');
        
        // Debug: Check if filters are hiding devices
        debugFilterStatus();
    }).catch(function() {
        loadFromStorage();
        
        // Auto-migrate rackId values to group entities if needed (v4.0.000)
        migrateToGroupSystem();
        
        // Load custom types into select dropdown (v4.0.000)
        loadCustomTypesToSelect();
        
        // Initialize group select in device form
        updateGroupSelect();
        
        updateUI();
        updateGlobalCounters();
        // Auto-save disabled to prevent data loss with multiple sessions
        debugFilterStatus();
    });
}

/**
 * Debug function to detect and report filter status
 */
function debugFilterStatus() {
    var total = appState.devices.length;
    var filtered = typeof getFilteredDevices === 'function' ? getFilteredDevices().length : total;
    var hasActiveFilters = appState.deviceFilters.location || appState.deviceFilters.source || 
                          appState.deviceFilters.name || appState.deviceFilters.type || 
                          appState.deviceFilters.status || appState.deviceFilters.hasConnections;
    
    if (filtered < total) {
        console.warn('⚠️  FILTER DETECTED: Showing ' + filtered + ' of ' + total + ' devices');
        console.warn('    Active filters:', appState.deviceFilters);
        console.warn('    To clear filters, run: clearDeviceFilters(); updateUI();');
    }
}

// ============================================================================
// ROOM MAPPER - Communication with iframe
// ============================================================================
var RoomMapper = (function() {
    var pendingCallback = null;
    
    // Listen for messages from iframe
    window.addEventListener('message', function(e) {
        if (!e.data || !e.data.action) return;
        
        if (e.data.action === 'mapperReady') {
            Debug.log('Room Mapper iframe ready');
        }
        
        if (e.data.action === 'roomsLoaded') {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Rooms Loaded',
                    text: e.data.count + ' rooms loaded into mapper',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        }
        
        if (e.data.action === 'roomsData' && pendingCallback) {
            pendingCallback(e.data.rooms);
            pendingCallback = null;
        }
    });
    
    function loadCurrentRooms() {
        var iframe = document.getElementById('roomMapperFrame');
        if (!iframe || !iframe.contentWindow) {
            alert('Room Mapper not loaded');
            return;
        }
        
        // Get rooms from appState
        var rooms = appState.rooms || [];
        iframe.contentWindow.postMessage({ action: 'loadRooms', rooms: rooms }, '*');
    }
    
    function saveRooms() {
        var iframe = document.getElementById('roomMapperFrame');
        if (!iframe || !iframe.contentWindow) {
            alert('Room Mapper not loaded');
            return;
        }
        
        // Request rooms from iframe
        pendingCallback = function(rooms) {
            if (!rooms || rooms.length === 0) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'No Rooms',
                        text: 'No rooms to save. Draw some rooms first!'
                    });
                }
                return;
            }
            
            // Update appState
            appState.rooms = rooms;
            
            // Save to server
            if (typeof saveToStorage === 'function') {
                saveToStorage();
            }
            
            // Update FloorPlan if visible
            if (typeof FloorPlan !== 'undefined' && FloorPlan.refresh) {
                FloorPlan.refresh();
            }
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Rooms Saved',
                    html: '<b>' + rooms.length + '</b> rooms saved successfully!',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        };
        
        iframe.contentWindow.postMessage({ action: 'getRooms' }, '*');
    }
    
    return {
        loadCurrentRooms: loadCurrentRooms,
        saveRooms: saveRooms
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
