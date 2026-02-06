/**
 * TIESSE Matrix Network - Extended Features Module
 * Version: 3.6.022
 * 
 * Features:
 * - Activity Logs (last 200 changes)
 * - Location/Department filtering
 * - Network Topology visualization (SVG-based)
 * - Device Links management
 * - Filtered printing
 * - Orthogonal connection routing (Draw.io style)
 * - Smart label collision detection
 * - Wall Jack and External connection support
 * - Cable separation: Each cable has UNIQUE lane (no overlap ever)
 * - Compact Wall Jack icons and thin connection lines
 * - GLOBAL connection indexing by source device (v3.1.0)
 * - PNG export with title header (v3.1.3)
 * - CSS Variables integration (v3.3.0)
 * - Debug mode support (v3.4.5)
 * - 100% Offline: No external CDN dependencies (v3.4.5)
 */

// Debug logger fallback (defined in app.js)
if (typeof Debug === 'undefined') {
    var Debug = {
        log: function() {},
        warn: function() {},
        error: function() {}
    };
}
'use strict';

// Fallback escapeHtml if app.js not loaded yet
var escapeHtml = window.escapeHtml || function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// ============================================================================
// ACTIVITY LOGS SYSTEM
// ============================================================================
var ActivityLog = (function() {
    var MAX_LOGS = 200;
    var logs = [];
    
    function init() {
        loadLogs();
        renderLogs();
    }
    
    function loadLogs() {
        try {
            var stored = localStorage.getItem('activityLogs');
            if (stored) {
                logs = JSON.parse(stored);
            }
        } catch (e) {
            Debug.error('Error loading logs:', e);
            logs = [];
        }
    }
    
    function saveLogs() {
        try {
            localStorage.setItem('activityLogs', JSON.stringify(logs));
        } catch (e) {
            Debug.error('Error saving logs:', e);
        }
    }
    
    function add(action, type, details, user) {
        var entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: action,     // 'add', 'edit', 'delete', 'import', 'export', 'clear'
            type: type,         // 'device', 'connection', 'import', 'system'
            details: details,
            user: user || (typeof Auth !== 'undefined' && Auth.getUser() ? Auth.getUser() : 'anonymous')
        };
        
        logs.unshift(entry);
        
        // Keep only last MAX_LOGS
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }
        
        saveLogs();
        renderLogs();
    }
    
    function renderLogs() {
        var tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        var filter = document.getElementById('logFilter');
        var filterValue = filter ? filter.value : '';
        
        var filteredLogs = filterValue 
            ? logs.filter(function(log) { 
                if (filterValue === 'import') {
                    return log.type === 'import' || log.type === 'export';
                }
                return log.type === filterValue; 
            })
            : logs;
        
        if (filteredLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">No logs yet</td></tr>';
            return;
        }
        
        var html = filteredLogs.map(function(log) {
            var actionColors = {
                'add': 'bg-green-100 text-green-700',
                'edit': 'bg-blue-100 text-blue-700',
                'delete': 'bg-red-100 text-red-700',
                'import': 'bg-purple-100 text-purple-700',
                'export': 'bg-indigo-100 text-indigo-700',
                'clear': 'bg-orange-100 text-orange-700',
                'login': 'bg-cyan-100 text-cyan-700',
                'logout': 'bg-slate-200 text-slate-700'
            };
            var actionClass = actionColors[log.action] || 'bg-slate-100 text-slate-700';
            
            var date = new Date(log.timestamp);
            var formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            return '<tr class="hover:bg-slate-50">' +
                '<td class="px-3 py-2 text-xs text-slate-600">' + formatted + '</td>' +
                '<td class="px-3 py-2"><span class="px-2 py-0.5 rounded text-xs font-semibold ' + actionClass + '">' + log.action.toUpperCase() + '</span></td>' +
                '<td class="px-3 py-2 text-xs text-slate-600">' + log.type + '</td>' +
                '<td class="px-3 py-2 text-sm">' + escapeHtml(log.details) + '</td>' +
                '<td class="px-3 py-2 text-xs text-slate-500">' + escapeHtml(log.user) + '</td>' +
                '</tr>';
        }).join('');
        
        tbody.innerHTML = html;
    }
    
    function clear() {
        // Require authentication for clearing logs
        if (typeof requireAuth === 'function' && !requireAuth()) return;
        
        Swal.fire({
            title: 'Clear All Logs?',
            text: 'This will permanently delete all activity logs.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, clear all',
            cancelButtonText: 'Cancel'
        }).then(function(result) {
            if (result.isConfirmed) {
                logs = [];
                saveLogs();
                renderLogs();
                Toast.success('Logs cleared');
            }
        });
    }
    
    function exportLogs() {
        var data = JSON.stringify(logs, null, 2);
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Tiesse-Matrix-Logs_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Logs exported');
    }
    
    // Use global escapeHtml function from app.js
    
    return {
        init: init,
        add: add,
        render: renderLogs,
        clear: clear,
        export: exportLogs
    };
})();

// Global functions for HTML onclick
function filterLogs() { ActivityLog.render(); }
function clearLogs() { ActivityLog.clear(); }
function exportLogs() { ActivityLog.export(); }

// ============================================================================
// LOCATION/DEPARTMENT FILTER
// ============================================================================
var LocationFilter = (function() {
    var currentLocation = '';
    
    function init() {
        updateLocationList();
    }
    
    function updateLocationList() {
        var select = document.getElementById('locationFilter');
        var datalist = document.getElementById('locationList');
        if (!select || !appState) return;
        
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
            
            mappedLocs.sort(function(a, b) {
                return parseInt(a.code) - parseInt(b.code);
            });
            
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
                    code: String(room.id).padStart(2, '0'),
                    name: room.nickname || ('Room ' + room.id),
                    type: 'mapped'
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
                    code: String(idx),
                    name: locName,
                    type: 'custom'
                });
                idx++;
            });
        }
        
        // Update filter dropdown with grouped structure
        var currentValue = select.value;
        select.innerHTML = '<option value="">🌐 All Locations</option>';
        
        // Add mapped locations
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
        
        // Add custom locations
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
        
        select.value = currentValue;
        
        // Update datalist for device form
        if (datalist) {
            datalist.innerHTML = '';
            mappedLocs.concat(customLocs).forEach(function(loc) {
                var option = document.createElement('option');
                option.value = loc.name;
                datalist.appendChild(option);
            });
        }
        
        updateStats();
    }
    
    function updateStats() {
        // Stats display removed from UI - counters in buttons are sufficient
        // This function kept for compatibility but does nothing
    }
    
    function getFilteredDevices() {
        var location = document.getElementById('locationFilter');
        var filterValue = location ? location.value : '';
        
        if (!filterValue) return appState.devices;
        
        return appState.devices.filter(function(d) {
            return d.location === filterValue;
        });
    }
    
    function getFilteredConnections() {
        var location = document.getElementById('locationFilter');
        var filterValue = location ? location.value : '';
        
        if (!filterValue) return appState.connections;
        
        // Get device IDs in this location
        var deviceIds = {};
        appState.devices.forEach(function(d) {
            if (d.location === filterValue) {
                deviceIds[d.id] = true;
            }
        });
        
        // Filter connections where at least one device is in this location
        return appState.connections.filter(function(c) {
            return deviceIds[c.from] || deviceIds[c.to];
        });
    }
    
    function apply() {
        currentLocation = document.getElementById('locationFilter').value;
        updateStats();
        
        // Sync with device filter bar
        if (typeof appState !== 'undefined' && appState.deviceFilters) {
            appState.deviceFilters.location = currentLocation;
            var deviceLocationFilter = document.getElementById('filterDeviceLocation');
            if (deviceLocationFilter && deviceLocationFilter.value !== currentLocation) {
                deviceLocationFilter.value = currentLocation;
            }
        }
        
        // Update global counters to show filtered counts
        updateFilteredCounters();
        
        // Refresh all views
        if (typeof updateDevicesList === 'function') updateDevicesList();
        if (typeof updateConnectionsList === 'function') updateConnectionsList();
        if (typeof updateMatrix === 'function') updateMatrix();
        if (typeof SVGTopology !== 'undefined') SVGTopology.render();
    }
    
    function updateFilteredCounters() {
        var devicesCount = document.getElementById('totalDevicesCount');
        var connectionsCount = document.getElementById('totalConnectionsCount');
        var filteredDevices = getFilteredDevices();
        var filteredConnections = getFilteredConnections();
        
        if (devicesCount) {
            devicesCount.textContent = filteredDevices.length;
        }
        if (connectionsCount) {
            connectionsCount.textContent = filteredConnections.length;
        }
    }
    
    /**
     * Get location display name with code prefix (e.g., "01 - Sala Server")
     * Used for consistent display in all filters
     */
    function getLocationWithCode(locationName) {
        if (!locationName || !appState) return locationName;
        
        // Check in appState.locations
        if (appState.locations && appState.locations.length > 0) {
            for (var i = 0; i < appState.locations.length; i++) {
                if (appState.locations[i].name === locationName) {
                    return appState.locations[i].code + ' - ' + locationName;
                }
            }
        }
        
        // Check in rooms (fallback)
        if (appState.rooms && appState.rooms.length > 0) {
            for (var r = 0; r < appState.rooms.length; r++) {
                var room = appState.rooms[r];
                if (room.nickname === locationName || room.id === locationName) {
                    return String(room.id).padStart(2, '0') + ' - ' + locationName;
                }
            }
        }
        
        // No code found, return as-is
        return locationName;
    }
    
    /**
     * Get sorted locations with codes for filter dropdowns
     * Returns array of {value: 'name', display: '00 - name'}
     */
    function getLocationsForFilter() {
        var result = [];
        
        if (appState.locations && appState.locations.length > 0) {
            var mapped = [];
            var custom = [];
            
            appState.locations.forEach(function(loc) {
                var parsedCode = parseInt(loc.code, 10);
                var item = {
                    value: loc.name,
                    display: loc.code + ' - ' + loc.name,
                    code: isNaN(parsedCode) ? 999 : parsedCode,
                    type: loc.type
                };
                if (loc.type === 'mapped') {
                    mapped.push(item);
                } else {
                    custom.push(item);
                }
            });
            
            mapped.sort(function(a, b) { return a.code - b.code; });
            custom.sort(function(a, b) { return a.code - b.code; });
            
            result = mapped.concat(custom);
        } else {
            // Fallback: use unique locations from devices
            var seen = {};
            var idx = 1;
            appState.devices.forEach(function(d) {
                if (d.location && !seen[d.location]) {
                    seen[d.location] = true;
                    result.push({
                        value: d.location,
                        display: String(idx).padStart(2, '0') + ' - ' + d.location,
                        code: idx,
                        type: 'custom'
                    });
                    idx++;
                }
            });
            result.sort(function(a, b) { return a.display.localeCompare(b.display); });
        }
        
        return result;
    }
    
    return {
        init: init,
        update: updateLocationList,
        apply: apply,
        getFilteredDevices: getFilteredDevices,
        getFilteredConnections: getFilteredConnections,
        getCurrent: function() { return currentLocation; },
        updateCounters: updateFilteredCounters,
        getLocationWithCode: getLocationWithCode,
        getLocationsForFilter: getLocationsForFilter
    };
})();

// Global function for HTML
function filterByLocation() { LocationFilter.apply(); }

// Update location icon - removed from UI, kept for compatibility
function updateLocationIcon() {
    // Icon display removed - select already has icon in option text
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Check if a color is light (needs dark background for contrast)
function isColorLight(color) {
    if (!color) return false;
    color = color.toLowerCase().trim();
    
    // Named light colors
    if (['white', 'yellow', 'lime', 'cyan', 'aqua', 'pink', 'beige', 'ivory', 'snow'].indexOf(color) >= 0) {
        return true;
    }
    
    // Handle hex colors
    var hex = color.replace('#', '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    
    // Luminance - anything above 180 average is "light"
    return (r + g + b) / 3 > 180;
}

// ============================================================================
// SVG TOPOLOGY VISUALIZATION (Cisco Network Icons)
// ============================================================================
var SVGTopology = (function() {
    var container = null;
    var svg = null;
    var currentLayout = 'auto';
    var devicePositions = {};
    var customPositions = {}; // User-dragged positions to persist
    var dragging = null;
    var isPanning = false;
    var panStart = { x: 0, y: 0, viewBoxX: 0, viewBoxY: 0 };
    var viewBox = { x: 0, y: 0, width: 1200, height: 600 };
    var scale = 1;
    var POSITIONS_KEY = 'networkTopologyPositions'; // localStorage key
    var iconTheme = window.SVG_TOPOLOGY_ICON_THEME || 'inline';
    var externalIconMap = {
        router: 'assets/icons/cisco/raw/ppt/media/image2890.png',
        router_wifi: 'assets/icons/cisco/raw/ppt/media/image4127.png',
        switch: 'assets/icons/cisco/raw/ppt/media/image3279.png',
        server: 'assets/icons/cisco/raw/ppt/media/image3049.png',
        firewall: 'assets/icons/cisco/raw/ppt/media/image1689.png',
        patch: 'assets/icons/cisco/raw/ppt/media/image29.png',
        isp: 'assets/icons/cisco/raw/ppt/media/image979.png',
        phone: 'assets/icons/cisco/raw/ppt/media/image2691.png',
        ups: 'assets/icons/cisco/raw/ppt/media/image1770.png',
        pdu: 'assets/icons/cisco/raw/ppt/media/image1770.png',
        pc: 'assets/icons/cisco/raw/ppt/media/image2153.png',
        database: 'assets/icons/cisco/raw/ppt/media/image1374.png',
        default: 'assets/icons/cisco/raw/ppt/media/image1770.png'
    };
    
    // Official Cisco Network Icons (SVG paths)
    var deviceIcons = {
        // Router - Vista frontal realista estilo rack 1U
        router: function(color) {
            return '<g transform="translate(0,12) scale(0.8)">' +
                // Chassi principal
                '<rect x="0" y="15" width="100" height="35" rx="2" fill="#2d3436"/>' +
                '<rect x="2" y="17" width="96" height="31" rx="1" fill="#636e72"/>' +
                // Portas Ethernet (RJ45)
                '<rect x="6" y="22" width="8" height="10" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="16" y="22" width="8" height="10" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="26" y="22" width="8" height="10" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="36" y="22" width="8" height="10" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                // Console e Management
                '<rect x="50" y="23" width="6" height="8" fill="#74b9ff" stroke="#0984e3" stroke-width="0.5"/>' +
                '<rect x="58" y="23" width="6" height="8" fill="#fdcb6e" stroke="#f39c12" stroke-width="0.5"/>' +
                // LEDs de status
                '<circle cx="72" cy="27" r="2" fill="#00b894"/>' +
                '<circle cx="78" cy="27" r="2" fill="#00b894"/>' +
                '<circle cx="84" cy="27" r="2" fill="#fdcb6e"/>' +
                // Ventilação
                '<rect x="70" y="34" width="24" height="10" fill="#2d3436" rx="1"/>' +
                '<line x1="73" y1="36" x2="73" y2="42" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="77" y1="36" x2="77" y2="42" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="81" y1="36" x2="81" y2="42" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="85" y1="36" x2="85" y2="42" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="89" y1="36" x2="89" y2="42" stroke="#636e72" stroke-width="1"/>' +
                // Orelhas de rack
                '<rect x="-4" y="14" width="4" height="37" fill="#2d3436"/>' +
                '<circle cx="-2" cy="20" r="1.5" fill="#636e72"/>' +
                '<circle cx="-2" cy="45" r="1.5" fill="#636e72"/>' +
                '<rect x="100" y="14" width="4" height="37" fill="#2d3436"/>' +
                '<circle cx="102" cy="20" r="1.5" fill="#636e72"/>' +
                '<circle cx="102" cy="45" r="1.5" fill="#636e72"/>' +
                '</g>';
        },
        // Switch - Vista frontal 24/48 portas
        switch: function(color) {
            return '<g transform="translate(0,12) scale(0.8)">' +
                // Chassi principal
                '<rect x="0" y="15" width="100" height="35" rx="2" fill="#2d3436"/>' +
                '<rect x="2" y="17" width="96" height="31" rx="1" fill="#1e272e"/>' +
                // Fileira superior de portas (12 portas)
                '<rect x="5" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="11" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="17" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="23" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="29" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="35" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="41" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="47" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="53" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="59" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="65" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="71" y="20" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                // Fileira inferior de portas (12 portas)
                '<rect x="5" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="11" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="17" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="23" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="29" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="35" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="41" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="47" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="53" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="59" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="65" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                '<rect x="71" y="28" width="5" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.3"/>' +
                // SFP ports
                '<rect x="80" y="21" width="7" height="5" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="88" y="21" width="7" height="5" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="80" y="28" width="7" height="5" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="88" y="28" width="7" height="5" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                // LEDs superiores
                '<circle cx="8" y="39" r="1.2" fill="#00b894"/>' +
                '<circle cx="14" y="39" r="1.2" fill="#00b894"/>' +
                '<circle cx="20" y="39" r="1.2" fill="#00b894"/>' +
                '<circle cx="26" y="39" r="1.2" fill="#00b894"/>' +
                '<circle cx="32" y="39" r="1.2" fill="#fdcb6e"/>' +
                '<circle cx="38" y="39" r="1.2" fill="#b2bec3"/>' +
                // Orelhas
                '<rect x="-4" y="14" width="4" height="37" fill="#2d3436"/>' +
                '<rect x="100" y="14" width="4" height="37" fill="#2d3436"/>' +
                '</g>';
        },
        // Patch Panel - Vista frontal 24 portas
        patch: function(color) {
            return '<g transform="translate(0,12) scale(0.8)">' +
                // Main chassis (typical light gray patch)
                '<rect x="0" y="18" width="100" height="28" rx="1" fill="#dfe6e9"/>' +
                '<rect x="1" y="19" width="98" height="26" fill="#b2bec3"/>' +
                // Fileira superior (12 portas keystone)
                '<rect x="4" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="12" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="20" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="28" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="36" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="44" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="52" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="60" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="68" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="76" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="84" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="92" y="21" width="6" height="8" rx="1" fill="#2d3436"/>' +
                // Fileira inferior (12 portas keystone)
                '<rect x="4" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="12" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="20" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="28" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="36" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="44" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="52" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="60" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="68" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="76" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="84" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                '<rect x="92" y="32" width="6" height="8" rx="1" fill="#2d3436"/>' +
                // Orelhas
                '<rect x="-4" y="17" width="4" height="30" fill="#636e72"/>' +
                '<rect x="100" y="17" width="4" height="30" fill="#636e72"/>' +
                '</g>';
        },
        // Firewall/ASA - Vista frontal
        firewall: function(color) {
            return '<g transform="translate(0,12) scale(0.8)">' +
                // Chassi principal (vermelho escuro)
                '<rect x="0" y="15" width="100" height="35" rx="2" fill="#c0392b"/>' +
                '<rect x="2" y="17" width="96" height="31" rx="1" fill="#e74c3c"/>' +
                // Port area (dark background)
                '<rect x="5" y="20" width="55" height="24" fill="#2d3436" rx="2"/>' +
                // Portas Ethernet
                '<rect x="8" y="23" width="7" height="8" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="17" y="23" width="7" height="8" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="26" y="23" width="7" height="8" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="35" y="23" width="7" height="8" fill="#1e272e" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="44" y="23" width="7" height="8" fill="#fdcb6e" stroke="#f39c12" stroke-width="0.5"/>' +
                // LEDs de status com labels
                '<rect x="8" y="34" width="7" height="6" fill="#00b894"/>' +
                '<rect x="17" y="34" width="7" height="6" fill="#00b894"/>' +
                '<rect x="26" y="34" width="7" height="6" fill="#fdcb6e"/>' +
                '<rect x="35" y="34" width="7" height="6" fill="#b2bec3"/>' +
                // Painel LCD/Display
                '<rect x="65" y="22" width="28" height="12" fill="#1e272e" rx="1"/>' +
                '<rect x="67" y="24" width="24" height="8" fill="#2d3436"/>' +
                // Botões
                '<circle cx="72" cy="40" r="3" fill="#636e72" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<circle cx="82" cy="40" r="3" fill="#636e72" stroke="#b2bec3" stroke-width="0.5"/>' +
                // Orelhas
                '<rect x="-4" y="14" width="4" height="37" fill="#922b21"/>' +
                '<rect x="100" y="14" width="4" height="37" fill="#922b21"/>' +
                '</g>';
        },
        // Server - Vista frontal rack 2U
        server: function(color) {
            return '<g transform="translate(-5,2) scale(0.85)">' +
                // Chassi do servidor rack 2U
                '<rect x="0" y="5" width="105" height="55" rx="2" fill="#2d3436"/>' +
                // Orelhas de rack (esquerda e direita)
                '<rect x="-6" y="4" width="7" height="57" fill="#636e72" rx="1"/>' +
                '<circle cx="-2.5" cy="12" r="2" fill="#2d3436"/>' +
                '<circle cx="-2.5" cy="53" r="2" fill="#2d3436"/>' +
                '<rect x="104" y="4" width="7" height="57" fill="#636e72" rx="1"/>' +
                '<circle cx="107.5" cy="12" r="2" fill="#2d3436"/>' +
                '<circle cx="107.5" cy="53" r="2" fill="#2d3436"/>' +
                // Drive bays frontais (hot-swap)
                '<rect x="5" y="10" width="18" height="22" fill="#1e272e" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<rect x="7" y="12" width="14" height="18" fill="#0c0c0c" rx="0.5"/>' +
                '<circle cx="14" cy="28" r="1.5" fill="#00b894"/>' +
                '<rect x="25" y="10" width="18" height="22" fill="#1e272e" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<rect x="27" y="12" width="14" height="18" fill="#0c0c0c" rx="0.5"/>' +
                '<circle cx="34" cy="28" r="1.5" fill="#00b894"/>' +
                '<rect x="45" y="10" width="18" height="22" fill="#1e272e" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<rect x="47" y="12" width="14" height="18" fill="#0c0c0c" rx="0.5"/>' +
                '<circle cx="54" cy="28" r="1.5" fill="#fdcb6e"/>' +
                '<rect x="65" y="10" width="18" height="22" fill="#1e272e" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<rect x="67" y="12" width="14" height="18" fill="#0c0c0c" rx="0.5"/>' +
                '<circle cx="74" cy="28" r="1.5" fill="#00b894"/>' +
                // Front panel - control area
                '<rect x="85" y="10" width="16" height="22" fill="#1e272e" rx="1"/>' +
                '<circle cx="93" cy="15" r="2.5" fill="#00b894"/>' +
                '<circle cx="93" cy="22" r="2.5" fill="#0984e3"/>' +
                '<rect x="88" y="26" width="10" height="4" fill="#636e72" rx="0.5"/>' +
                // Área inferior - DVD/portas USB
                '<rect x="5" y="36" width="28" height="18" fill="#1e272e" rx="1"/>' +
                '<rect x="8" y="39" width="22" height="12" fill="#0c0c0c" rx="0.5"/>' +
                '<line x1="19" y1="40" x2="19" y2="50" stroke="#636e72" stroke-width="0.5"/>' +
                // Portas USB frontais
                '<rect x="38" y="42" width="8" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5"/>' +
                '<rect x="48" y="42" width="8" height="6" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5"/>' +
                // Ventilação lateral
                '<rect x="60" y="38" width="40" height="14" fill="#1e272e" rx="1"/>' +
                '<line x1="65" y1="40" x2="65" y2="50" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="72" y1="40" x2="72" y2="50" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="79" y1="40" x2="79" y2="50" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="86" y1="40" x2="86" y2="50" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="93" y1="40" x2="93" y2="50" stroke="#636e72" stroke-width="1"/>' +
                // Label DELL/HP style
                '<rect x="35" y="56" width="35" height="3" fill="#0984e3" opacity="0.7" rx="0.5"/>' +
                '</g>';
        },
        // Wireless Access Point - Montagem teto
        wifi: function(color) {
            return '<g transform="translate(10,10) scale(0.75)">' +
                // Base circular (AP de teto)
                '<ellipse cx="40" cy="40" rx="38" ry="20" fill="#dfe6e9"/>' +
                '<ellipse cx="40" cy="38" rx="35" ry="18" fill="#b2bec3"/>' +
                '<ellipse cx="40" cy="36" rx="32" ry="16" fill="#636e72"/>' +
                // Centro com LEDs
                '<ellipse cx="40" cy="35" rx="15" ry="8" fill="#2d3436"/>' +
                '<circle cx="35" cy="34" r="2" fill="#00b894"/>' +
                '<circle cx="45" cy="34" r="2" fill="#0984e3"/>' +
                // Ondas de sinal
                '<path d="M15,20 Q40,5 65,20" stroke="#0984e3" stroke-width="2" fill="none" opacity="0.6"/>' +
                '<path d="M8,15 Q40,-2 72,15" stroke="#0984e3" stroke-width="2" fill="none" opacity="0.4"/>' +
                '<path d="M0,10 Q40,-10 80,10" stroke="#0984e3" stroke-width="2" fill="none" opacity="0.2"/>' +
                '</g>';
        },
        // ISP/Cloud/Internet
        isp: function(color) {
            return '<g transform="translate(0,5) scale(0.85)">' +
                // Nuvem estilizada (mais realista)
                '<ellipse cx="50" cy="35" rx="35" ry="20" fill="#74b9ff" opacity="0.9"/>' +
                '<ellipse cx="22" cy="40" rx="18" ry="12" fill="#74b9ff" opacity="0.85"/>' +
                '<ellipse cx="78" cy="40" rx="16" ry="11" fill="#74b9ff" opacity="0.85"/>' +
                '<ellipse cx="35" cy="25" rx="14" ry="10" fill="#74b9ff" opacity="0.8"/>' +
                '<ellipse cx="65" cy="26" rx="13" ry="9" fill="#74b9ff" opacity="0.8"/>' +
                '<ellipse cx="50" cy="22" rx="18" ry="10" fill="#74b9ff" opacity="0.75"/>' +
                // Globo/Internet símbolo
                '<circle cx="50" cy="38" r="12" fill="#fff" opacity="0.3"/>' +
                '<circle cx="50" cy="38" r="10" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>' +
                '<ellipse cx="50" cy="38" rx="10" ry="4" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>' +
                '<line x1="50" y1="28" x2="50" y2="48" stroke="#fff" stroke-width="1" opacity="0.5"/>' +
                '<line x1="40" y1="38" x2="60" y2="38" stroke="#fff" stroke-width="1" opacity="0.5"/>' +
                // Seta de conexão saindo
                '<path d="M50,52 L50,62" stroke="#636e72" stroke-width="3"/>' +
                '<polygon points="45,60 50,68 55,60" fill="#636e72"/>' +
                '</g>';
        },
        // Wireless Router - Com antenas
        router_wifi: function(color) {
            return '<g transform="translate(0,5) scale(0.8)">' +
                // Antenas
                '<rect x="15" y="2" width="3" height="18" fill="#2d3436" rx="1"/>' +
                '<rect x="12" y="0" width="9" height="4" fill="#2d3436" rx="1"/>' +
                '<rect x="82" y="2" width="3" height="18" fill="#2d3436" rx="1"/>' +
                '<rect x="79" y="0" width="9" height="4" fill="#2d3436" rx="1"/>' +
                // Chassi principal
                '<rect x="0" y="20" width="100" height="35" rx="3" fill="#2d3436"/>' +
                '<rect x="2" y="22" width="96" height="31" fill="#1e272e"/>' +
                // Portas
                '<rect x="6" y="28" width="8" height="10" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="16" y="28" width="8" height="10" fill="#fdcb6e" stroke="#f39c12" stroke-width="0.5"/>' +
                '<rect x="26" y="28" width="8" height="10" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="36" y="28" width="8" height="10" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="46" y="28" width="8" height="10" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                '<rect x="56" y="28" width="8" height="10" fill="#0c0c0c" stroke="#b2bec3" stroke-width="0.5"/>' +
                // LEDs
                '<circle cx="72" cy="33" r="2.5" fill="#00b894"/>' +
                '<circle cx="80" cy="33" r="2.5" fill="#0984e3"/>' +
                '<circle cx="88" cy="33" r="2.5" fill="#fdcb6e"/>' +
                // Botões/Reset
                '<circle cx="80" cy="46" r="3" fill="#636e72"/>' +
                '<rect x="88" y="43" width="6" height="6" fill="#636e72" rx="1"/>' +
                '</g>';
        },
        // Generic/Other Device
        others: function(color) {
            return '<g transform="translate(0,12) scale(0.8)">' +
                // Chassi genérico
                '<rect x="0" y="15" width="100" height="35" rx="2" fill="#636e72"/>' +
                '<rect x="2" y="17" width="96" height="31" fill="#b2bec3"/>' +
                // Portas genéricas
                '<rect x="8" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="22" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="36" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                // LEDs
                '<circle cx="60" cy="28" r="3" fill="#00b894"/>' +
                '<circle cx="70" cy="28" r="3" fill="#fdcb6e"/>' +
                // Ventilação
                '<rect x="80" y="20" width="14" height="16" fill="#636e72" rx="1"/>' +
                '<line x1="83" y1="22" x2="83" y2="34" stroke="#b2bec3" stroke-width="1"/>' +
                '<line x1="87" y1="22" x2="87" y2="34" stroke="#b2bec3" stroke-width="1"/>' +
                '<line x1="91" y1="22" x2="91" y2="34" stroke="#b2bec3" stroke-width="1"/>' +
                // Orelhas
                '<rect x="-4" y="14" width="4" height="37" fill="#636e72"/>' +
                '<rect x="100" y="14" width="4" height="37" fill="#636e72"/>' +
                '</g>';
        },
        // Desktop PC - Torre
        pc: function(color) {
            return '<g transform="translate(12,0) scale(0.85)">' +
                // Gabinete torre
                '<rect x="10" y="5" width="55" height="65" rx="3" fill="#2d3436"/>' +
                '<rect x="13" y="8" width="49" height="59" fill="#1e272e" rx="2"/>' +
                // Drive bay (DVD)
                '<rect x="16" y="12" width="40" height="8" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<circle cx="52" cy="16" r="1.5" fill="#00b894"/>' +
                // Área frontal
                '<rect x="16" y="24" width="40" height="35" fill="#2d3436" rx="1"/>' +
                // USB ports
                '<rect x="20" y="28" width="8" height="4" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5"/>' +
                '<rect x="30" y="28" width="8" height="4" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5"/>' +
                // Power button
                '<circle cx="36" cy="40" r="5" fill="#636e72" stroke="#b2bec3" stroke-width="1"/>' +
                '<circle cx="36" cy="40" r="3" fill="#00b894"/>' +
                // Ventilação inferior
                '<rect x="18" y="48" width="36" height="8" fill="#1e272e" rx="1"/>' +
                '<line x1="22" y1="50" x2="22" y2="54" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="28" y1="50" x2="28" y2="54" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="34" y1="50" x2="34" y2="54" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="40" y1="50" x2="40" y2="54" stroke="#636e72" stroke-width="1"/>' +
                '<line x1="46" y1="50" x2="46" y2="54" stroke="#636e72" stroke-width="1"/>' +
                '</g>';
        },
        // Laptop
        laptop: function(color) {
            return '<g transform="translate(5,8) scale(0.85)">' +
                // Tela
                '<rect x="10" y="5" width="65" height="40" rx="3" fill="#2d3436"/>' +
                '<rect x="13" y="8" width="59" height="34" fill="#1e272e" rx="1"/>' +
                '<rect x="15" y="10" width="55" height="30" fill="#3498db" rx="1"/>' +
                // Reflexo na tela
                '<rect x="16" y="11" width="20" height="10" fill="#fff" opacity="0.1" rx="1"/>' +
                // Webcam
                '<circle cx="42.5" cy="6" r="1.5" fill="#1e272e"/>' +
                '<circle cx="42.5" cy="6" r="0.8" fill="#e74c3c"/>' +
                // Base/Teclado
                '<path d="M5,48 L80,48 L85,60 L0,60 Z" fill="#2d3436"/>' +
                '<rect x="8" y="50" width="69" height="8" fill="#1e272e" rx="1"/>' +
                // Teclas
                '<rect x="10" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="16" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="22" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="28" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="34" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="40" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="46" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="52" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="58" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="64" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                '<rect x="70" y="51" width="4" height="2" fill="#636e72" rx="0.5"/>' +
                // Touchpad
                '<rect x="32" y="54" width="20" height="3" fill="#636e72" rx="1"/>' +
                '</g>';
        },
        // Tablet
        tablet: function(color) {
            return '<g transform="translate(15,5) scale(0.85)">' +
                // Corpo do tablet
                '<rect x="5" y="5" width="55" height="70" rx="5" fill="#2d3436"/>' +
                '<rect x="8" y="10" width="49" height="58" fill="#1e272e" rx="2"/>' +
                // Tela
                '<rect x="10" y="12" width="45" height="54" fill="#3498db" rx="1"/>' +
                // Reflexo
                '<rect x="11" y="13" width="15" height="20" fill="#fff" opacity="0.1" rx="1"/>' +
                // Câmera frontal
                '<circle cx="32.5" cy="7" r="1.5" fill="#1e272e"/>' +
                '<circle cx="32.5" cy="7" r="0.8" fill="#636e72"/>' +
                // Botão home
                '<circle cx="32.5" cy="71" r="2.5" fill="#1e272e" stroke="#636e72" stroke-width="0.5"/>' +
                '</g>';
        },
        // Celular/Smartphone
        phone: function(color) {
            return '<g transform="translate(25,5) scale(0.9)">' +
                // Corpo do celular
                '<rect x="5" y="2" width="35" height="70" rx="5" fill="#2d3436"/>' +
                '<rect x="7" y="8" width="31" height="56" fill="#1e272e" rx="2"/>' +
                // Tela
                '<rect x="8" y="10" width="29" height="52" fill="#3498db" rx="1"/>' +
                // Reflexo
                '<rect x="9" y="11" width="10" height="15" fill="#fff" opacity="0.1" rx="1"/>' +
                // Câmera e speaker
                '<rect x="15" y="4" width="15" height="2" fill="#1e272e" rx="1"/>' +
                '<circle cx="32" cy="5" r="2" fill="#1e272e"/>' +
                '<circle cx="32" cy="5" r="1" fill="#636e72"/>' +
                // Botão volume lateral
                '<rect x="2" y="18" width="2" height="8" fill="#636e72" rx="0.5"/>' +
                '<rect x="2" y="30" width="2" height="12" fill="#636e72" rx="0.5"/>' +
                '</g>';
        },
        // Telefone IP Cisco
        ip_phone: function(color) {
            return '<g transform="translate(8,5) scale(0.85)">' +
                // Base do telefone
                '<path d="M5,65 Q5,70 10,70 L70,70 Q75,70 75,65 L75,35 Q75,30 70,28 L10,28 Q5,30 5,35 Z" fill="#2d3436"/>' +
                // Tela
                '<rect x="12" y="8" width="56" height="18" rx="2" fill="#1e272e"/>' +
                '<rect x="14" y="10" width="52" height="14" fill="#2d3436"/>' +
                '<text x="40" y="20" text-anchor="middle" fill="#00b894" font-size="8" font-family="monospace">Cisco</text>' +
                // Botões de função
                '<rect x="12" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="22" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="32" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="42" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="52" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="62" y="32" width="8" height="5" rx="1" fill="#636e72"/>' +
                // Teclado numérico
                '<rect x="15" y="40" width="8" height="6" rx="1" fill="#b2bec3"/><text x="19" y="45" text-anchor="middle" fill="#2d3436" font-size="5">1</text>' +
                '<rect x="25" y="40" width="8" height="6" rx="1" fill="#b2bec3"/><text x="29" y="45" text-anchor="middle" fill="#2d3436" font-size="5">2</text>' +
                '<rect x="35" y="40" width="8" height="6" rx="1" fill="#b2bec3"/><text x="39" y="45" text-anchor="middle" fill="#2d3436" font-size="5">3</text>' +
                '<rect x="15" y="48" width="8" height="6" rx="1" fill="#b2bec3"/><text x="19" y="53" text-anchor="middle" fill="#2d3436" font-size="5">4</text>' +
                '<rect x="25" y="48" width="8" height="6" rx="1" fill="#b2bec3"/><text x="29" y="53" text-anchor="middle" fill="#2d3436" font-size="5">5</text>' +
                '<rect x="35" y="48" width="8" height="6" rx="1" fill="#b2bec3"/><text x="39" y="53" text-anchor="middle" fill="#2d3436" font-size="5">6</text>' +
                '<rect x="15" y="56" width="8" height="6" rx="1" fill="#b2bec3"/><text x="19" y="61" text-anchor="middle" fill="#2d3436" font-size="5">7</text>' +
                '<rect x="25" y="56" width="8" height="6" rx="1" fill="#b2bec3"/><text x="29" y="61" text-anchor="middle" fill="#2d3436" font-size="5">8</text>' +
                '<rect x="35" y="56" width="8" height="6" rx="1" fill="#b2bec3"/><text x="39" y="61" text-anchor="middle" fill="#2d3436" font-size="5">9</text>' +
                // Área de controle
                '<circle cx="58" cy="50" r="10" fill="#636e72" stroke="#b2bec3" stroke-width="1"/>' +
                '<circle cx="58" cy="50" r="4" fill="#2d3436"/>' +
                // Monofone
                '<path d="M50,3 Q45,3 45,8 L45,22 Q45,27 50,27 L55,27 Q60,27 60,22 L60,8 Q60,3 55,3 Z" fill="#2d3436" stroke="#1e272e" stroke-width="1"/>' +
                '</g>';
        },
        // Cloud/Nuvem
        cloud: function(color) {
            return '<g transform="translate(0,8) scale(0.85)">' +
                // Nuvem principal
                '<ellipse cx="50" cy="40" rx="38" ry="22" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                '<ellipse cx="22" cy="45" rx="18" ry="12" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                '<ellipse cx="78" cy="45" rx="16" ry="11" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                '<ellipse cx="35" cy="30" rx="14" ry="10" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                '<ellipse cx="65" cy="32" rx="13" ry="9" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                // Interior branco
                '<ellipse cx="50" cy="40" rx="35" ry="19" fill="#fff" opacity="0.5"/>' +
                // Símbolo de upload/download
                '<path d="M45,35 L50,28 L55,35 L52,35 L52,45 L48,45 L48,35 Z" fill="#3498db" opacity="0.8"/>' +
                '<path d="M45,50 L50,57 L55,50 L52,50 L52,45 L48,45 L48,50 Z" fill="#3498db" opacity="0.8"/>' +
                '</g>';
        },
        // DMZ - Zona Desmilitarizada
        dmz: function(color) {
            return '<g transform="translate(0,8) scale(0.8)">' +
                // Escudo/Shield
                '<path d="M50,5 L90,20 L90,50 Q90,70 50,80 Q10,70 10,50 L10,20 Z" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>' +
                '<path d="M50,10 L85,23 L85,48 Q85,65 50,74 Q15,65 15,48 L15,23 Z" fill="#fff" opacity="0.2"/>' +
                // DMZ text
                '<text x="50" y="38" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">DMZ</text>' +
                // Linhas de divisão
                '<line x1="30" y1="48" x2="70" y2="48" stroke="#fff" stroke-width="1" opacity="0.5"/>' +
                // Ícone de rede
                '<circle cx="35" cy="58" r="4" fill="#fff" opacity="0.7"/>' +
                '<circle cx="50" cy="58" r="4" fill="#fff" opacity="0.7"/>' +
                '<circle cx="65" cy="58" r="4" fill="#fff" opacity="0.7"/>' +
                '<line x1="35" y1="58" x2="50" y2="58" stroke="#fff" stroke-width="1" opacity="0.7"/>' +
                '<line x1="50" y1="58" x2="65" y2="58" stroke="#fff" stroke-width="1" opacity="0.7"/>' +
                '</g>';
        },
        // Backbone - Core de rede
        backbone: function(color) {
            return '<g transform="translate(5,10) scale(0.8)">' +
                // Chassi grande de core
                '<rect x="0" y="10" width="90" height="50" rx="3" fill="#1e272e"/>' +
                '<rect x="2" y="12" width="86" height="46" fill="#2d3436" rx="2"/>' +
                // Módulos de linha (line cards)
                '<rect x="5" y="15" width="25" height="18" fill="#0c0c0c" stroke="#00b894" stroke-width="1" rx="1"/>' +
                '<rect x="32" y="15" width="25" height="18" fill="#0c0c0c" stroke="#00b894" stroke-width="1" rx="1"/>' +
                '<rect x="59" y="15" width="25" height="18" fill="#0c0c0c" stroke="#00b894" stroke-width="1" rx="1"/>' +
                // LEDs nos módulos
                '<circle cx="10" cy="20" r="2" fill="#00b894"/><circle cx="18" cy="20" r="2" fill="#00b894"/><circle cx="26" cy="20" r="2" fill="#00b894"/>' +
                '<circle cx="37" cy="20" r="2" fill="#00b894"/><circle cx="45" cy="20" r="2" fill="#fdcb6e"/><circle cx="53" cy="20" r="2" fill="#00b894"/>' +
                '<circle cx="64" cy="20" r="2" fill="#00b894"/><circle cx="72" cy="20" r="2" fill="#00b894"/><circle cx="80" cy="20" r="2" fill="#00b894"/>' +
                // SFP/QSFP ports
                '<rect x="8" y="26" width="6" height="4" fill="#636e72"/><rect x="16" y="26" width="6" height="4" fill="#636e72"/><rect x="24" y="26" width="6" height="4" fill="#636e72"/>' +
                '<rect x="35" y="26" width="6" height="4" fill="#636e72"/><rect x="43" y="26" width="6" height="4" fill="#636e72"/><rect x="51" y="26" width="6" height="4" fill="#636e72"/>' +
                '<rect x="62" y="26" width="6" height="4" fill="#636e72"/><rect x="70" y="26" width="6" height="4" fill="#636e72"/><rect x="78" y="26" width="6" height="4" fill="#636e72"/>' +
                // Supervisor module
                '<rect x="5" y="38" width="80" height="16" fill="#1e272e" stroke="#0984e3" stroke-width="1" rx="1"/>' +
                '<rect x="10" y="42" width="30" height="8" fill="#0c0c0c" rx="1"/>' +
                '<text x="25" y="48" text-anchor="middle" fill="#0984e3" font-size="6" font-family="monospace">SUP</text>' +
                '<circle cx="55" cy="46" r="3" fill="#00b894"/>' +
                '<circle cx="65" cy="46" r="3" fill="#00b894"/>' +
                '<circle cx="75" cy="46" r="3" fill="#fdcb6e"/>' +
                '</g>';
        },
        // Impressora
        printer: function(color) {
            return '<g transform="translate(8,8) scale(0.85)">' +
                // Corpo principal
                '<rect x="5" y="25" width="75" height="35" rx="3" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="1"/>' +
                // Bandeja de papel superior
                '<path d="M10,25 L10,15 Q10,10 15,10 L70,10 Q75,10 75,15 L75,25" fill="#dfe6e9" stroke="#bdc3c7" stroke-width="1"/>' +
                // Papel na bandeja
                '<rect x="15" y="12" width="55" height="12" fill="#fff" stroke="#bdc3c7" stroke-width="0.5"/>' +
                // Abertura de saída
                '<rect x="15" y="27" width="55" height="4" fill="#2d3436" rx="1"/>' +
                // Papel saindo
                '<rect x="20" y="22" width="45" height="8" fill="#fff" stroke="#bdc3c7" stroke-width="0.5"/>' +
                // Painel de controle
                '<rect x="55" y="40" width="20" height="15" fill="#2d3436" rx="2"/>' +
                '<rect x="57" y="42" width="10" height="6" fill="#1e272e"/>' +
                '<circle cx="70" cy="50" r="3" fill="#00b894"/>' +
                // Botões
                '<circle cx="15" cy="45" r="4" fill="#3498db"/>' +
                '<rect x="25" y="42" width="20" height="6" fill="#bdc3c7" rx="1"/>' +
                // Bandeja inferior
                '<rect x="10" y="60" width="65" height="8" fill="#dfe6e9" stroke="#bdc3c7" stroke-width="1" rx="1"/>' +
                '</g>';
        },
        // Cartão de Ponto / Time Clock
        time_clock: function(color) {
            return '<g transform="translate(12,5) scale(0.85)">' +
                // Corpo do dispositivo
                '<rect x="5" y="5" width="55" height="65" rx="4" fill="#2d3436"/>' +
                '<rect x="8" y="8" width="49" height="59" fill="#1e272e" rx="2"/>' +
                // Tela
                '<rect x="12" y="12" width="41" height="20" fill="#0c0c0c" rx="2"/>' +
                '<text x="32.5" y="25" text-anchor="middle" fill="#00b894" font-size="10" font-family="monospace">08:45</text>' +
                // Leitor biométrico
                '<rect x="18" y="36" width="29" height="12" fill="#636e72" rx="2"/>' +
                '<ellipse cx="32.5" cy="42" rx="10" ry="4" fill="#2d3436" stroke="#00b894" stroke-width="1"/>' +
                // Teclado numérico
                '<rect x="15" y="52" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="25" y="52" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="35" y="52" width="8" height="5" rx="1" fill="#636e72"/>' +
                '<rect x="45" y="52" width="8" height="5" rx="1" fill="#00b894"/>' +
                // LED indicador
                '<circle cx="52" cy="10" r="2" fill="#e74c3c"/>' +
                '</g>';
        },
        // Hub
        hub: function(color) {
            return '<g transform="translate(0,15) scale(0.8)">' +
                // Chassi (mais simples que switch)
                '<rect x="0" y="15" width="100" height="30" rx="2" fill="#7f8c8d"/>' +
                '<rect x="2" y="17" width="96" height="26" fill="#95a5a6"/>' +
                // Portas (menos que switch)
                '<rect x="8" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="22" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="36" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="50" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="64" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                '<rect x="78" y="22" width="10" height="12" fill="#2d3436" rx="1"/>' +
                // LEDs collision/activity
                '<circle cx="12" cy="38" r="2" fill="#00b894"/>' +
                '<circle cx="26" cy="38" r="2" fill="#00b894"/>' +
                '<circle cx="40" cy="38" r="2" fill="#fdcb6e"/>' +
                '<circle cx="54" cy="38" r="2" fill="#e74c3c"/>' +
                '<circle cx="68" cy="38" r="2" fill="#00b894"/>' +
                '<circle cx="82" cy="38" r="2" fill="#b2bec3"/>' +
                // Label
                '<text x="92" y="36" text-anchor="middle" fill="#2d3436" font-size="6" font-weight="bold">HUB</text>' +
                '</g>';
        },
        // Monitor/Display
        monitor: function(color) {
            return '<g transform="translate(5,5) scale(0.85)">' +
                // Tela
                '<rect x="5" y="5" width="75" height="45" rx="3" fill="#2d3436"/>' +
                '<rect x="8" y="8" width="69" height="39" fill="#1e272e" rx="1"/>' +
                '<rect x="10" y="10" width="65" height="35" fill="#3498db" rx="1"/>' +
                // Reflexo
                '<rect x="11" y="11" width="25" height="15" fill="#fff" opacity="0.1" rx="1"/>' +
                // LED
                '<circle cx="42.5" cy="48" r="1.5" fill="#00b894"/>' +
                // Base
                '<rect x="35" y="52" width="15" height="8" fill="#2d3436"/>' +
                '<ellipse cx="42.5" cy="62" rx="20" ry="5" fill="#2d3436"/>' +
                '</g>';
        },
        // Camera de Segurança
        camera: function(color) {
            return '<g transform="translate(10,10) scale(0.85)">' +
                // Suporte de parede
                '<rect x="5" y="10" width="10" height="20" fill="#636e72" rx="1"/>' +
                // Braço
                '<rect x="15" y="15" width="25" height="8" fill="#636e72" rx="1"/>' +
                // Corpo da câmera
                '<ellipse cx="55" cy="20" rx="20" ry="12" fill="#2d3436"/>' +
                '<ellipse cx="55" cy="20" rx="17" ry="10" fill="#1e272e"/>' +
                // Lente
                '<circle cx="65" cy="20" r="8" fill="#0c0c0c" stroke="#636e72" stroke-width="1"/>' +
                '<circle cx="65" cy="20" r="5" fill="#2d3436"/>' +
                '<circle cx="65" cy="20" r="3" fill="#1e272e"/>' +
                '<circle cx="66" cy="19" r="1" fill="#fff" opacity="0.3"/>' +
                // LEDs IR
                '<circle cx="45" cy="15" r="1.5" fill="#e74c3c"/>' +
                '<circle cx="45" cy="20" r="1.5" fill="#e74c3c"/>' +
                '<circle cx="45" cy="25" r="1.5" fill="#e74c3c"/>' +
                // Base/Dome
                '<path d="M35,35 Q55,50 75,35" fill="none" stroke="#636e72" stroke-width="2"/>' +
                '</g>';
        },
        // NAS/Storage
        nas: function(color) {
            return '<g transform="translate(15,5) scale(0.85)">' +
                // Chassi
                '<rect x="5" y="5" width="55" height="65" rx="3" fill="#2d3436"/>' +
                '<rect x="8" y="8" width="49" height="59" fill="#1e272e" rx="2"/>' +
                // Drive bays
                '<rect x="12" y="12" width="41" height="12" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<circle cx="50" cy="18" r="2" fill="#00b894"/>' +
                '<rect x="12" y="26" width="41" height="12" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<circle cx="50" cy="32" r="2" fill="#00b894"/>' +
                '<rect x="12" y="40" width="41" height="12" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<circle cx="50" cy="46" r="2" fill="#fdcb6e"/>' +
                '<rect x="12" y="54" width="41" height="12" fill="#0c0c0c" stroke="#636e72" stroke-width="0.5" rx="1"/>' +
                '<circle cx="50" cy="60" r="2" fill="#00b894"/>' +
                // LEDs de status
                '<circle cx="15" cy="18" r="1.5" fill="#0984e3"/>' +
                '<circle cx="15" cy="32" r="1.5" fill="#0984e3"/>' +
                '<circle cx="15" cy="46" r="1.5" fill="#0984e3"/>' +
                '<circle cx="15" cy="60" r="1.5" fill="#0984e3"/>' +
                '</g>';
        },
        // UPS/No-Break
        ups: function(color) {
            return '<g transform="translate(8,5) scale(0.85)">' +
                // Chassi
                '<rect x="5" y="5" width="70" height="65" rx="3" fill="#2d3436"/>' +
                '<rect x="8" y="8" width="64" height="59" fill="#1e272e" rx="2"/>' +
                // Display
                '<rect x="15" y="12" width="50" height="18" fill="#0c0c0c" rx="2"/>' +
                '<text x="40" y="23" text-anchor="middle" fill="#00b894" font-size="8" font-family="monospace">100%</text>' +
                '<rect x="20" y="26" width="40" height="2" fill="#00b894" rx="1"/>' +
                // Tomadas
                '<rect x="15" y="35" width="15" height="10" fill="#636e72" rx="1"/>' +
                '<circle cx="20" cy="40" r="2" fill="#0c0c0c"/>' +
                '<circle cx="27" cy="40" r="2" fill="#0c0c0c"/>' +
                '<rect x="35" y="35" width="15" height="10" fill="#636e72" rx="1"/>' +
                '<circle cx="40" cy="40" r="2" fill="#0c0c0c"/>' +
                '<circle cx="47" cy="40" r="2" fill="#0c0c0c"/>' +
                '<rect x="55" y="35" width="15" height="10" fill="#636e72" rx="1"/>' +
                '<circle cx="60" cy="40" r="2" fill="#0c0c0c"/>' +
                '<circle cx="67" cy="40" r="2" fill="#0c0c0c"/>' +
                // Botão e LEDs
                '<circle cx="25" cy="55" r="5" fill="#636e72"/>' +
                '<circle cx="25" cy="55" r="3" fill="#00b894"/>' +
                '<circle cx="45" cy="55" r="3" fill="#00b894"/>' +
                '<circle cx="55" cy="55" r="3" fill="#fdcb6e"/>' +
                '</g>';
        },
        // TV / Display / Monitor
        tv: function(color) {
            return '<g transform="translate(5,5) scale(0.85)">' +
                // Moldura da TV
                '<rect x="5" y="5" width="80" height="50" rx="3" fill="#2d3436"/>' +
                '<rect x="8" y="8" width="74" height="44" rx="2" fill="#1e272e"/>' +
                // Tela
                '<rect x="10" y="10" width="70" height="40" rx="1" fill="#3498db"/>' +
                // Reflexo na tela
                '<rect x="12" y="12" width="25" height="15" fill="#fff" opacity="0.1" rx="1"/>' +
                // Base/Suporte
                '<rect x="35" y="56" width="20" height="4" fill="#2d3436" rx="1"/>' +
                '<rect x="30" y="60" width="30" height="6" fill="#2d3436" rx="2"/>' +
                // LED indicador
                '<circle cx="45" cy="52" r="2" fill="#00b894"/>' +
                // Logo marca
                '<rect x="40" y="54" width="10" height="2" fill="#636e72" rx="0.5"/>' +
                '</g>';
        },
        display: function(color) { return deviceIcons.tv(color); },
        monitor: function(color) { return deviceIcons.tv(color); },
        // Wall Jack / Tomada de Parede
        walljack: function(color) {
            return '<g transform="translate(15,5) scale(0.85)">' +
                // Placa da parede
                '<rect x="5" y="5" width="55" height="60" rx="3" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>' +
                // Moldura interna
                '<rect x="10" y="10" width="45" height="50" rx="2" fill="#dfe6e9"/>' +
                // Porta RJ45 superior
                '<rect x="18" y="15" width="30" height="18" rx="2" fill="#2d3436"/>' +
                '<rect x="21" y="18" width="24" height="12" fill="#0c0c0c" rx="1"/>' +
                // Pinos do conector
                '<rect x="23" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="26" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="29" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="32" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="35" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="38" y="20" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="41" y="20" width="2" height="6" fill="#c0a000"/>' +
                // Label da porta
                '<text x="33" y="37" text-anchor="middle" fill="#636e72" font-size="5" font-family="sans-serif">DATA</text>' +
                // Porta RJ45 inferior (opcional)
                '<rect x="18" y="42" width="30" height="18" rx="2" fill="#2d3436"/>' +
                '<rect x="21" y="45" width="24" height="12" fill="#0c0c0c" rx="1"/>' +
                // Pinos do conector inferior
                '<rect x="23" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="26" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="29" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="32" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="35" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="38" y="47" width="2" height="6" fill="#c0a000"/>' +
                '<rect x="41" y="47" width="2" height="6" fill="#c0a000"/>' +
                // Parafusos decorativos
                '<circle cx="12" cy="12" r="2" fill="#95a5a6"/>' +
                '<circle cx="53" cy="12" r="2" fill="#95a5a6"/>' +
                '<circle cx="12" cy="58" r="2" fill="#95a5a6"/>' +
                '<circle cx="53" cy="58" r="2" fill="#95a5a6"/>' +
                '</g>';
        },
        // External Connection (ISP, WAN, Cloud) - Generic globe icon
        external: function(color) {
            return '<g transform="translate(10,5) scale(0.9)">' +
                // Globe/World icon
                '<circle cx="35" cy="35" r="28" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="2"/>' +
                // Latitude lines
                '<ellipse cx="35" cy="35" rx="28" ry="12" fill="none" stroke="#0ea5e9" stroke-width="1"/>' +
                '<ellipse cx="35" cy="35" rx="28" ry="22" fill="none" stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="4,2"/>' +
                // Longitude lines
                '<ellipse cx="35" cy="35" rx="12" ry="28" fill="none" stroke="#0ea5e9" stroke-width="1"/>' +
                '<line x1="7" y1="35" x2="63" y2="35" stroke="#0ea5e9" stroke-width="1"/>' +
                '<line x1="35" y1="7" x2="35" y2="63" stroke="#0ea5e9" stroke-width="1"/>' +
                // Connection arrows
                '<path d="M55 20 L65 10 L60 18 L68 15" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>' +
                '<path d="M15 50 L5 60 L10 52 L2 55" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>' +
                '</g>';
        },
        // Modem DSL/Cable
        modem: function(color) {
            return '<g transform="translate(5,12) scale(0.85)">' +
                // Chassi principal
                '<rect x="5" y="10" width="80" height="35" rx="3" fill="#2d3436"/>' +
                '<rect x="8" y="13" width="74" height="29" rx="2" fill="#1e272e"/>' +
                // Painel frontal
                '<rect x="12" y="16" width="66" height="23" fill="#0c0c0c" rx="1"/>' +
                // LEDs de status
                '<circle cx="20" cy="23" r="2.5" fill="#00b894"/>' +
                '<text x="20" y="33" text-anchor="middle" fill="#636e72" font-size="4">PWR</text>' +
                '<circle cx="32" cy="23" r="2.5" fill="#00b894"/>' +
                '<text x="32" y="33" text-anchor="middle" fill="#636e72" font-size="4">DSL</text>' +
                '<circle cx="44" cy="23" r="2.5" fill="#0984e3"/>' +
                '<text x="44" y="33" text-anchor="middle" fill="#636e72" font-size="4">NET</text>' +
                '<circle cx="56" cy="23" r="2.5" fill="#fdcb6e"/>' +
                '<text x="56" y="33" text-anchor="middle" fill="#636e72" font-size="4">LAN</text>' +
                '<circle cx="68" cy="23" r="2.5" fill="#00b894"/>' +
                '<text x="68" y="33" text-anchor="middle" fill="#636e72" font-size="4">WiFi</text>' +
                // Ventilacao lateral
                '<rect x="72" y="17" width="4" height="20" fill="#2d3436" rx="0.5"/>' +
                '<line x1="74" y1="19" x2="74" y2="35" stroke="#636e72" stroke-width="0.5"/>' +
                '</g>';
        }
    };
    
    var typeColors = {
        router: '#2d3436',      // Dark gray (chassis)
        switch: '#1e272e',      // Black (switch chassis)
        patch: '#b2bec3',       // Light gray (patch panel)
        firewall: '#c0392b',    // Red (security)
        server: '#2d3436',      // Dark gray (server)
        wifi: '#636e72',        // Gray (AP)
        isp: '#74b9ff',         // Light blue (cloud)
        router_wifi: '#2d3436', // Dark gray
        pc: '#2d3436',          // Dark gray (desktop)
        laptop: '#2d3436',      // Dark gray
        tablet: '#2d3436',      // Dark gray
        phone: '#2d3436',       // Dark gray (smartphone)
        ip_phone: '#2d3436',    // Dark gray (Cisco phone)
        cloud: '#ecf0f1',       // Light gray (cloud)
        dmz: '#e74c3c',         // Red (security zone)
        backbone: '#1e272e',    // Black (core)
        printer: '#ecf0f1',     // Light gray
        time_clock: '#2d3436',  // Dark gray
        hub: '#7f8c8d',         // Gray
        monitor: '#2d3436',     // Dark gray
        camera: '#2d3436',      // Dark gray
        nas: '#2d3436',         // Dark gray (storage)
        ups: '#2d3436',         // Dark gray (power)
        walljack: '#ecf0f1',    // Light gray (wall plate)
        external: '#e0f2fe',    // Light blue (external/WAN)
        modem: '#2d3436',       // Dark gray (modem)
        tv: '#2d3436',          // Dark gray (TV)
        display: '#2d3436',     // Dark gray (display)
        others: '#636e72'       // Gray
    };
    
    // Labels for device types
    var typeLabels = {
        router: 'Router',
        switch: 'Switch',
        patch: 'Patch Panel',
        firewall: 'Firewall',
        server: 'Server',
        wifi: 'Wi-Fi AP',
        isp: 'ISP/WAN',
        router_wifi: 'Wi-Fi Router',
        pc: 'Desktop',
        laptop: 'Laptop',
        tablet: 'Tablet',
        phone: 'Phone',
        ip_phone: 'IP Phone',
        cloud: 'Cloud',
        dmz: 'DMZ',
        backbone: 'Backbone',
        printer: 'Printer',
        time_clock: 'Time Clock',
        hub: 'Hub',
        monitor: 'Monitor',
        camera: 'Camera',
        nas: 'NAS',
        ups: 'UPS',
        walljack: 'Wall Jack',
        modem: 'Modem',
        external: 'External',
        tv: 'TV/Display',
        display: 'Display',
        others: 'Other'
    };
    
    // Badge colors for device types
    var typeBadgeColors = {
        router: '#3498db',
        switch: '#2ecc71',
        patch: '#f39c12',
        firewall: '#e74c3c',
        server: '#9b59b6',
        wifi: '#1abc9c',
        isp: '#e67e22',
        router_wifi: '#16a085',
        pc: '#34495e',
        laptop: '#2c3e50',
        tablet: '#7f8c8d',
        phone: '#95a5a6',
        ip_phone: '#27ae60',
        cloud: '#3498db',
        dmz: '#c0392b',
        backbone: '#8e44ad',
        printer: '#f1c40f',
        time_clock: '#d35400',
        hub: '#7f8c8d',
        monitor: '#2980b9',
        camera: '#e74c3c',
        nas: '#9b59b6',
        ups: '#27ae60',
        walljack: '#7f8c8d',
        external: '#0ea5e9',
        modem: '#e67e22',
        tv: '#3498db',
        display: '#3498db',
        others: '#95a5a6'
    };
    
    function getTypeLabel(type) {
        return typeLabels[type] || typeLabels.others;
    }
    
    function getTypeBadgeColor(type) {
        return typeBadgeColors[type] || typeBadgeColors.others;
    }
    
    // Generate mini icon SVG for legend
    function getMiniIcon(type, size) {
        size = size || 20;
        var iconFn = deviceIcons[type] || deviceIcons.others;
        var iconSvg = iconFn(typeColors[type] || typeColors.others);
        return '<svg width="' + size + '" height="' + Math.round(size * 0.7) + '" viewBox="0 0 100 70" style="vertical-align:middle">' + iconSvg + '</svg>';
    }
    
    // Get large icon for modal
    function getLargeIcon(type, size) {
        size = size || 80;
        var iconFn = deviceIcons[type] || deviceIcons.others;
        var iconSvg = iconFn(typeColors[type] || typeColors.others);
        return '<svg width="' + size + '" height="' + Math.round(size * 0.7) + '" viewBox="0 0 100 70">' + iconSvg + '</svg>';
    }
    
    // Get all available device types (for legend modal)
    function getAllDeviceTypes() {
        return Object.keys(deviceIcons);
    }
    
    // Get type info for external use
    function getTypeInfo(type) {
        return {
            label: typeLabels[type] || type,
            color: typeColors[type] || typeColors.others,
            badgeColor: typeBadgeColors[type] || typeBadgeColors.others
        };
    }
    
    // Update topology stats display
    function updateTopologyStats(devices, connections) {
        var statsContainer = document.getElementById('topologyStats');
        if (!statsContainer) return;
        
        var totalDevices = devices.length;
        var totalConnections = connections.length;
        
        var html = '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500 text-white font-semibold text-xs" title="Devices">📱 ' + totalDevices + '</span>';
        html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500 text-white font-semibold text-xs" title="Connections">⚡ ' + totalConnections + '</span>';
        
        statsContainer.innerHTML = html;
    }
    
    // Update topology location filter dropdown
    function updateLocationFilter() {
        var select = document.getElementById('topologyLocationFilter');
        if (!select) return;
        
        // Use LocationFilter helper for consistent display with codes
        var locationsWithCode = [];
        if (typeof LocationFilter !== 'undefined' && LocationFilter.getLocationsForFilter) {
            locationsWithCode = LocationFilter.getLocationsForFilter();
        } else {
            // Fallback: collect from devices
            var seen = {};
            var idx = 1;
            appState.devices.forEach(function(d) {
                if (d.location && !seen[d.location]) {
                    seen[d.location] = true;
                    locationsWithCode.push({
                        value: d.location,
                        display: String(idx).padStart(2, '0') + ' - ' + d.location,
                        code: idx,
                        type: 'custom'
                    });
                    idx++;
                }
            });
            locationsWithCode.sort(function(a, b) { return a.code - b.code; });
        }
        
        var currentValue = select.value;
        select.innerHTML = '<option value="">📍 All Locations</option>';
        
        // Separate mapped vs custom locations
        var mappedLocs = [], customLocs = [];
        locationsWithCode.forEach(function(loc) {
            if (loc.type === 'mapped') mappedLocs.push(loc);
            else customLocs.push(loc);
        });
        
        // Add mapped locations optgroup
        if (mappedLocs.length > 0) {
            var optgroup1 = document.createElement('optgroup');
            optgroup1.label = '📍 Mapped Locations';
            optgroup1.style.color = '#334155';
            optgroup1.style.fontWeight = '600';
            mappedLocs.forEach(function(loc) {
                var option = document.createElement('option');
                option.value = loc.value;
                option.textContent = loc.display;
                option.style.color = '#1e293b';
                optgroup1.appendChild(option);
            });
            select.appendChild(optgroup1);
        }
        
        // Add custom locations optgroup
        if (customLocs.length > 0) {
            var optgroup2 = document.createElement('optgroup');
            optgroup2.label = '🪧 Custom Locations';
            optgroup2.style.color = '#334155';
            optgroup2.style.fontWeight = '600';
            customLocs.forEach(function(loc) {
                var option = document.createElement('option');
                option.value = loc.value;
                option.textContent = loc.display;
                option.style.color = '#1e293b';
                optgroup2.appendChild(option);
            });
            select.appendChild(optgroup2);
        }
        
        // Restore previous selection (topology filter is independent from global filter)
        if (currentValue) {
            for (var i = 0; i < locationsWithCode.length; i++) {
                if (locationsWithCode[i].value === currentValue) {
                    select.value = currentValue;
                    break;
                }
            }
        }
        
        // Update rack filter based on location
        updateRackFilter();
    }
    
    // Update topology rack filter dropdown based on selected location
    function updateRackFilter() {
        var rackSelect = document.getElementById('topologyRackFilter');
        if (!rackSelect) return;
        
        var locationSelect = document.getElementById('topologyLocationFilter');
        var selectedLocation = locationSelect ? locationSelect.value : '';
        
        var racks = {};
        appState.devices.forEach(function(d) {
            if (d.rackId) {
                // If location is selected, only show racks from that location
                if (!selectedLocation || d.location === selectedLocation) {
                    racks[d.rackId] = true;
                }
            }
        });
        
        var currentValue = rackSelect.value;
        var html = '<option value="">🗄️ Filter by Group</option>';
        Object.keys(racks).sort().forEach(function(rack) {
            html += '<option value="' + rack + '">' + rack + '</option>';
        });
        rackSelect.innerHTML = html;
        
        // Try to restore selection if still valid
        if (currentValue && racks[currentValue]) {
            rackSelect.value = currentValue;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // POSITION PERSISTENCE - Save/Load custom positions from localStorage
    // ═══════════════════════════════════════════════════════════════════
    
    function saveCustomPositions() {
        try {
            localStorage.setItem(POSITIONS_KEY, JSON.stringify(customPositions));
        } catch (e) {
            Debug.warn('Could not save topology positions:', e);
        }
    }
    
    function loadCustomPositions() {
        try {
            var saved = localStorage.getItem(POSITIONS_KEY);
            if (saved) {
                customPositions = JSON.parse(saved);
            }
        } catch (e) {
            Debug.warn('Could not load topology positions:', e);
            customPositions = {};
        }
    }
    
    function clearCustomPositions() {
        customPositions = {};
        try {
            localStorage.removeItem(POSITIONS_KEY);
        } catch (e) {
            // Ignore
        }
    }
    
    function init() {
        container = document.getElementById('drawioContainer');
        if (!container) return;
        
        // Load saved custom positions on init
        loadCustomPositions();
        
        updateLocationFilter();
        render();
        
        // Add mouse wheel zoom
        container.addEventListener('wheel', handleZoom, { passive: false });

        // Pan/hand drag on empty space
        container.style.cursor = 'grab';
        container.addEventListener('mousedown', startPan);
        document.addEventListener('mousemove', panMove);
        document.addEventListener('mouseup', endPan);
    }
    
    // Get filtered devices based on topology's own location and rack filters
    // Uses centralized sorting from app.js for consistent ordering
    function getTopologyFilteredDevices() {
        var topologyFilter = document.getElementById('topologyLocationFilter');
        var rackFilter = document.getElementById('topologyRackFilter');
        var location = topologyFilter ? topologyFilter.value : '';
        var rack = rackFilter ? rackFilter.value : '';
        
        var devices = appState.devices || [];
        
        // If rack is selected, show rack devices + connected devices
        if (rack) {
            var rackDevices = devices.filter(function(d) {
                return d.rackId === rack;
            });
            
            // Sort rack devices using centralized sort
            rackDevices = rackDevices.sort(standardDeviceSort);
            
            // Mark rack devices
            rackDevices.forEach(function(d) { d._isExternal = false; });
            
            // Get IDs of rack devices
            var rackDeviceIds = {};
            rackDevices.forEach(function(d) { rackDeviceIds[d.id] = true; });
            
            // Find connected devices from other racks
            var connectedIds = {};
            (appState.connections || []).forEach(function(c) {
                if (rackDeviceIds[c.from]) connectedIds[c.to] = true;
                if (rackDeviceIds[c.to]) connectedIds[c.from] = true;
            });
            
            // Include connected devices that are not in the rack (mark as external)
            var connectedDevices = devices.filter(function(d) {
                return connectedIds[d.id] && !rackDeviceIds[d.id];
            });
            connectedDevices.forEach(function(d) { d._isExternal = true; });
            
            // Sort connected devices too
            connectedDevices = connectedDevices.sort(standardDeviceSort);
            
            return rackDevices.concat(connectedDevices);
        }
        
        // Filter by location if selected (and no rack filter)
        if (location) {
            devices = devices.filter(function(d) {
                return d.location === location;
            });
        }
        
        // Clear external flags
        devices.forEach(function(d) { d._isExternal = false; });
        
        // Sort using centralized function
        return devices.slice().sort(standardDeviceSort);
    }
    
    // Get filtered connections based on topology's filters
    function getTopologyFilteredConnections() {
        var devices = getTopologyFilteredDevices();
        var deviceIds = {};
        var nonExternalDeviceIds = {}; // Only devices that belong to filtered rack/location
        devices.forEach(function(d) { 
            deviceIds[d.id] = true;
            if (!d._isExternal) {
                nonExternalDeviceIds[d.id] = true;
            }
        });
        
        // Show connections where:
        // 1. BOTH devices are visible (normal connections)
        // 2. OR source device is FROM THE FILTERED RACK (not external) AND has external destination (WallJack/External)
        return (appState.connections || []).filter(function(c) {
            // Normal connection: both devices visible
            if (deviceIds[c.from] && deviceIds[c.to]) return true;
            // External/WallJack connection: source must be from filtered rack (not external) and has externalDest
            if (nonExternalDeviceIds[c.from] && c.externalDest) return true;
            return false;
        });
    }
    
    function render() {
        if (!container) {
            container = document.getElementById('drawioContainer');
            if (!container) return;
        }
        
        // Update location filter options
        updateLocationFilter();
        
        var devices = getTopologyFilteredDevices();
        var connections = getTopologyFilteredConnections();
        
        // Update stats
        updateTopologyStats(devices, connections);
        
        if (devices.length === 0) {
            container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400">' +
                '<div class="text-center"><p class="text-5xl mb-3">📭</p>' +
                '<p class="font-semibold">No devices found</p>' +
                '<p class="text-sm">Select a location or add devices</p></div></div>';
            return;
        }
        
        // Calculate positions based on layout
        calculatePositions(devices, currentLayout);
        
        // Calculate viewBox based on device positions
        calculateViewBox(devices);
        
        // Build SVG
        var svgContent = buildSVG(devices, connections);
        container.innerHTML = svgContent;
        
        // Get SVG element and add event listeners
        svg = container.querySelector('svg');
        if (svg) {
            addDragListeners();
        }
    }
    
    function calculatePositions(devices, layout) {
        var width = 1200;
        var height = 600;
        var nodeWidth = 80;
        var nodeHeight = 70;
        var padding = 120;
        
        // Start fresh for layout calculation
        var calculatedPositions = {};
        
        if (layout === 'circle') {
            var centerX = width / 2;
            var centerY = height / 2;
            // Much larger radius for better spacing - scale with device count
            var baseRadius = Math.min(width, height) / 2;
            var radius = baseRadius + devices.length * 12; // Balanced spacing
            
            devices.forEach(function(d, i) {
                var angle = (2 * Math.PI * i) / devices.length - Math.PI / 2;
                calculatedPositions[d.id] = {
                    x: centerX + radius * Math.cos(angle) - nodeWidth / 2,
                    y: centerY + radius * Math.sin(angle) - nodeHeight / 2
                };
            });
        } else if (layout === 'grid') {
            // Professional grid layout with balanced spacing
            var cols = Math.ceil(Math.sqrt(devices.length));
            var cellWidth = 180;  // Balanced cell width
            var cellHeight = 160; // Balanced cell height
            
            devices.forEach(function(d, i) {
                var col = i % cols;
                var row = Math.floor(i / cols);
                calculatedPositions[d.id] = {
                    x: padding + col * cellWidth,
                    y: padding + row * cellHeight
                };
            });
        } else if (layout === 'hierarchical') {
            // Professional hierarchical layout - devices grouped by type in neat rows
            var typeOrder = [
                'isp', 'cloud',                                    // Layer 1: Internet/Cloud
                'router', 'backbone', 'dmz',                       // Layer 2: Core/Edge
                'firewall',                                         // Layer 3: Security
                'router_wifi', 'switch', 'hub',                    // Layer 4: Distribution
                'patch', 'walljack', 'wifi',                       // Layer 5: Access
                'server', 'nas', 'ups',                            // Layer 6: Infrastructure
                'pc', 'laptop', 'monitor',                         // Layer 7: Workstations
                'printer', 'camera', 'time_clock',                 // Layer 8: Peripherals
                'ip_phone', 'phone', 'tablet',                     // Layer 9: Mobile/VoIP
                'others'                                            // Layer 10: Others
            ];
            var byType = {};
            devices.forEach(function(d) {
                var t = d.type || 'others';
                if (!byType[t]) byType[t] = [];
                byType[t].push(d);
            });
            
            var y = padding;
            var rowHeight = 150; // Balanced row spacing
            var nodeSpacing = 160; // Balanced horizontal spacing
            
            typeOrder.forEach(function(type) {
                if (byType[type] && byType[type].length > 0) {
                    var rowDevices = byType[type];
                    var rowWidth = rowDevices.length * nodeSpacing;
                    var startX = Math.max(padding, (width - rowWidth) / 2 + nodeSpacing / 2 - nodeWidth / 2);
                    
                    rowDevices.forEach(function(d, i) {
                        calculatedPositions[d.id] = {
                            x: startX + i * nodeSpacing,
                            y: y
                        };
                    });
                    y += rowHeight;
                }
            });
        } else {
            // Auto layout - smart positioning based on connections
            var cols = Math.max(3, Math.ceil(Math.sqrt(devices.length)));
            var cellWidth = 180;  // Balanced spacing
            var cellHeight = 160; // Balanced spacing
            
            devices.forEach(function(d, i) {
                var col = i % cols;
                var row = Math.floor(i / cols);
                calculatedPositions[d.id] = {
                    x: padding + col * cellWidth,
                    y: padding + row * cellHeight
                };
            });
        }
        
        // Apply calculated positions, but preserve custom (user-dragged) positions
        devicePositions = {};
        devices.forEach(function(d) {
            if (customPositions[d.id]) {
                // Use saved custom position
                devicePositions[d.id] = customPositions[d.id];
            } else if (calculatedPositions[d.id]) {
                // Use calculated position
                devicePositions[d.id] = calculatedPositions[d.id];
            }
        });
    }
    
    function calculateViewBox(devices) {
        if (devices.length === 0) {
            viewBox = { x: 0, y: 0, width: 1200, height: 600 };
            return;
        }
        
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        devices.forEach(function(d) {
            var pos = devicePositions[d.id];
            if (pos) {
                minX = Math.min(minX, pos.x - 30);
                minY = Math.min(minY, pos.y - 20);
                maxX = Math.max(maxX, pos.x + 110);
                maxY = Math.max(maxY, pos.y + 100);
            }
        });
        
        var padding = 60;
        viewBox = {
            x: minX - padding,
            y: minY - padding,
            width: Math.max(maxX - minX + padding * 2, 400),
            height: Math.max(maxY - minY + padding * 2, 300)
        };
    }
    
    function buildSVG(devices, connections) {
        var vb = viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height;
        
        // Build device map for quick lookup
        var deviceMap = {};
        devices.forEach(function(d) { deviceMap[d.id] = d; });
        
        // ═══════════════════════════════════════════════════════════════════
        // CREATE VIRTUAL WALL JACK DEVICES from external connections
        // ═══════════════════════════════════════════════════════════════════
        var virtualWallJacks = [];
        var wallJackMap = {}; // Map externalDest to virtual device
        
        // Also create virtual devices for external destinations (WAN, ISP, Cloud, etc)
        var virtualExternals = [];
        var externalMap = {}; // Map externalDest to virtual external device
        
        connections.forEach(function(c) {
            // Only process external connections with isWallJack=true
            if (c.to || !c.externalDest || !c.isWallJack || !c.from || !devicePositions[c.from]) return;
            
            var wjKey = c.externalDest;
            if (!wallJackMap[wjKey]) {
                var from = devicePositions[c.from];
                var fromCX = from.x + 40;
                var fromCY = from.y + 35;
                
                // Calculate position for wall jack (away from connected device)
                var hashCode = 0;
                var hashStr = c.from + '-' + c.externalDest + '-' + c.fromPort;
                for (var hi = 0; hi < hashStr.length; hi++) {
                    hashCode = ((hashCode << 5) - hashCode + hashStr.charCodeAt(hi)) | 0;
                }
                var angle = (Math.abs(hashCode) % 360) * (Math.PI / 180);
                var distance = 140;
                
                var wjX = fromCX + Math.cos(angle) * distance - 40;
                var wjY = fromCY + Math.sin(angle) * distance - 35;
                
                var virtualId = 'wj_' + wjKey.replace(/[^a-zA-Z0-9]/g, '_');
                
                var virtualDevice = {
                    id: virtualId,
                    name: c.externalDest,
                    type: 'walljack',
                    _isVirtualWallJack: true,
                    _originalConnection: c
                };
                
                virtualWallJacks.push(virtualDevice);
                wallJackMap[wjKey] = virtualDevice;
                
                // Store position
                if (!devicePositions[virtualId]) {
                    devicePositions[virtualId] = { x: wjX, y: wjY };
                }
            }
        });
        
        // Create a map of existing device names (case-insensitive) to avoid duplicates
        // Use BOTH exact match and partial match (substring) to catch cases like:
        // externalDest="Firewall" but real device="Firewall Fortinet"
        var existingDeviceNames = {};
        var existingDeviceNamesList = []; // For partial matching
        devices.forEach(function(d) {
            if (d.name) {
                var nameLower = d.name.toLowerCase();
                existingDeviceNames[nameLower] = d.id;
                existingDeviceNamesList.push({ name: nameLower, id: d.id, originalName: d.name });
            }
        });
        
        // Helper function to check if externalDest matches any real device
        // Returns device ID if match found, null otherwise
        function findMatchingDevice(externalDest) {
            if (!externalDest) return null;
            var extLower = externalDest.toLowerCase().trim();
            
            // 1. Exact match
            if (existingDeviceNames[extLower]) {
                return existingDeviceNames[extLower];
            }
            
            // 2. Partial match - check if externalDest is contained in any device name
            // Example: externalDest="Firewall" matches device="Firewall Fortinet"
            for (var i = 0; i < existingDeviceNamesList.length; i++) {
                var dev = existingDeviceNamesList[i];
                if (dev.name.indexOf(extLower) !== -1 || extLower.indexOf(dev.name) !== -1) {
                    return dev.id;
                }
            }
            
            // 3. Word-based match - check if any word in externalDest matches device name
            // Example: externalDest="ISP Provider" matches device="ISP"
            // Include parentheses and brackets in split to handle names like "(BIG ONE)"
            var extWords = extLower.split(/[\s\-_\/\(\)\[\]]+/);
            for (var i = 0; i < existingDeviceNamesList.length; i++) {
                var dev = existingDeviceNamesList[i];
                var devWords = dev.name.split(/[\s\-_\/\(\)\[\]]+/);
                for (var j = 0; j < extWords.length; j++) {
                    for (var k = 0; k < devWords.length; k++) {
                        if (extWords[j] && devWords[k] && extWords[j].length > 2 && extWords[j] === devWords[k]) {
                            return dev.id;
                        }
                    }
                }
            }
            
            return null;
        }
        
        // Create virtual external nodes for non-WallJack external connections
        // Skip if a real device with the same name already exists
        connections.forEach(function(c) {
            if (c.to || !c.externalDest || c.isWallJack || !c.from || !devicePositions[c.from]) return;
            
            var extKey = c.externalDest;
            
            // Skip if a real device with this name already exists (exact or partial match)
            if (findMatchingDevice(extKey)) {
                return;
            }
            
            if (!externalMap[extKey]) {
                var from = devicePositions[c.from];
                var fromCX = from.x + 40;
                var fromCY = from.y + 35;
                
                // Calculate position for external node
                var hashCode = 0;
                var hashStr = c.from + '-' + c.externalDest;
                for (var hi = 0; hi < hashStr.length; hi++) {
                    hashCode = ((hashCode << 5) - hashCode + hashStr.charCodeAt(hi)) | 0;
                }
                var angle = (Math.abs(hashCode) % 360) * (Math.PI / 180);
                var distance = 100;
                
                var extX = fromCX + Math.cos(angle) * distance - 30;
                var extY = fromCY + Math.sin(angle) * distance - 10;
                
                var virtualId = 'ext_' + extKey.replace(/[^a-zA-Z0-9]/g, '_');
                
                var virtualDevice = {
                    id: virtualId,
                    name: c.externalDest,
                    type: 'external',
                    _isVirtualExternal: true,
                    _originalConnection: c
                };
                
                virtualExternals.push(virtualDevice);
                externalMap[extKey] = virtualDevice;
                
                // Use custom position if saved, otherwise use calculated
                if (customPositions[virtualId]) {
                    devicePositions[virtualId] = customPositions[virtualId];
                } else if (!devicePositions[virtualId]) {
                    devicePositions[virtualId] = { x: extX, y: extY };
                }
            }
        });
        
        var html = '<svg id="svgTopology" width="100%" height="100%" viewBox="' + vb + '" ' +
            'style="background: linear-gradient(135deg, var(--color-bg-alt) 0%, var(--color-border) 100%); cursor: grab;">' +
            '<defs>' +
            '<filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>' +
            '</filter>' +
            '<filter id="labelShadow" x="-50%" y="-50%" width="200%" height="200%">' +
            '<feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>' +
            '</filter>' +
            '</defs>';
        
        // Draw connections first (behind devices)
        html += '<g class="connections">';
        
        // Collect all label positions and device positions to avoid overlap
        var usedLabelPositions = [];
        
        // Store labels to render after devices
        var pendingLabels = [];
        
        // Add device positions as occupied areas
        devices.forEach(function(d) {
            var pos = devicePositions[d.id];
            if (pos) {
                usedLabelPositions.push({ x: pos.x + 40, y: pos.y + 45, width: 100, height: 100 });
            }
        });
        
        // Add virtual external node positions as occupied areas (BEFORE processing connections)
        // Now external uses same size as devices (90x100)
        virtualExternals.forEach(function(ext) {
            var pos = devicePositions[ext.id];
            if (pos) {
                // Same size as device nodes (90x100) - centered on icon
                usedLabelPositions.push({ x: pos.x + 40, y: pos.y + 45, width: 100, height: 100 });
            }
        });
        
        function isLabelOverlapping(x, y, width, height) {
            for (var i = 0; i < usedLabelPositions.length; i++) {
                var pos = usedLabelPositions[i];
                if (Math.abs(x - pos.x) < (width + pos.width) / 2 + 8 &&
                    Math.abs(y - pos.y) < (height + pos.height) / 2 + 5) {
                    return true;
                }
            }
            return false;
        }
        
        function findNonOverlappingPosition(baseX, baseY, width, height, offsetDir, maxAttempts) {
            var x = baseX, y = baseY;
            var attempts = 0;
            var step = 22;
            maxAttempts = maxAttempts || 12;
            while (isLabelOverlapping(x, y, width, height) && attempts < maxAttempts) {
                attempts++;
                if (offsetDir === 'vertical') {
                    y = baseY + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * step;
                } else if (offsetDir === 'horizontal') {
                    x = baseX + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * step;
                } else {
                    // Both directions
                    x = baseX + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * step * 0.7;
                    y = baseY + (attempts % 2 === 0 ? -1 : 1) * Math.ceil(attempts / 2) * step * 0.7;
                }
            }
            return { x: x, y: y };
        }
        
        // Function to determine if text should be light or dark based on background color
        function getContrastTextColor(hexColor) {
            // Default to white text for dark backgrounds
            if (!hexColor || hexColor === 'none') return '#ffffff';
            
            // Remove # if present
            var hex = hexColor.replace('#', '');
            
            // Handle short hex format
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            
            // Parse RGB values
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            
            // Calculate relative luminance (WCAG formula)
            var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Return black text for light backgrounds, white for dark
            return luminance > 0.5 ? '#000000' : '#ffffff';
        }
        
        // Function to darken a color for better readability on light backgrounds
        function darkenColor(hexColor, amount) {
            if (!hexColor) return '#1e293b';
            var hex = hexColor.replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            var r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
            var g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
            var b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
            return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // CONNECTION RENDERING - SIMPLE SYSTEM
        // Each connection gets a unique "connection dot" on each device
        // ═══════════════════════════════════════════════════════════════════
        
        // Step 1: Count ALL connections per device (source + destination)
        var deviceConnectionCount = {};
        var deviceConnectionIndex = {};
        
        // Count and index
        connections.forEach(function(c) {
            // Count FROM side
            if (c.from) {
                if (!deviceConnectionCount[c.from]) deviceConnectionCount[c.from] = 0;
                if (!deviceConnectionIndex[c.from]) deviceConnectionIndex[c.from] = {};
                var fromKey = 'from-' + (c.to || c.externalDest || 'ext');
                deviceConnectionIndex[c.from][fromKey] = deviceConnectionCount[c.from];
                deviceConnectionCount[c.from]++;
            }
            // Count TO side (only for internal connections)
            if (c.to) {
                if (!deviceConnectionCount[c.to]) deviceConnectionCount[c.to] = 0;
                if (!deviceConnectionIndex[c.to]) deviceConnectionIndex[c.to] = {};
                var toKey = 'to-' + c.from;
                deviceConnectionIndex[c.to][toKey] = deviceConnectionCount[c.to];
                deviceConnectionCount[c.to]++;
            }
        });
        
        // Function to get connection dot position around device
        function getConnectionDot(deviceId, connIdx, totalConns, deviceX, deviceY, targetX, targetY) {
            // Device center
            var cx = deviceX + 40;
            var cy = deviceY + 35;
            
            // Calculate angle to target
            var angle = Math.atan2(targetY - cy, targetX - cx);
            
            // Offset along the device edge based on connection index
            var spacing = 8;
            var offset = (connIdx - (totalConns - 1) / 2) * spacing;
            
            // Device radius
            var radius = 48;
            
            // Point on device border towards target
            var dotX = cx + Math.cos(angle) * radius;
            var dotY = cy + Math.sin(angle) * radius;
            
            // Add perpendicular offset for multiple cables
            var perpAngle = angle + Math.PI / 2;
            dotX += Math.cos(perpAngle) * offset;
            dotY += Math.sin(perpAngle) * offset;
            
            return { x: dotX, y: dotY };
        }
        
        // Step 2: Draw internal connections (device to device)
        connections.forEach(function(c) {
            if (!c.from || !c.to || !devicePositions[c.from] || !devicePositions[c.to]) return;
            
            var from = devicePositions[c.from];
            var to = devicePositions[c.to];
            
            var cableColor = c.cableColor || config.connColors[c.type] || '#64748b';
            var isDashed = c.status === 'disabled';
            var fromPort = c.fromPort || '';
            var toPort = c.toPort || '';
            var cableId = c.cableMarker || '';
            
            // Get unique connection dots
            var fromKey = 'from-' + c.to;
            var toKey = 'to-' + c.from;
            var fromIdx = deviceConnectionIndex[c.from][fromKey] || 0;
            var toIdx = deviceConnectionIndex[c.to][toKey] || 0;
            var fromTotal = deviceConnectionCount[c.from] || 1;
            var toTotal = deviceConnectionCount[c.to] || 1;
            
            // Get dot positions
            var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, to.x + 40, to.y + 35);
            var toDot = getConnectionDot(c.to, toIdx, toTotal, to.x, to.y, from.x + 40, from.y + 35);
            
            // Simple straight line connection
            var path = 'M' + fromDot.x + ',' + fromDot.y + ' L' + toDot.x + ',' + toDot.y;
            
            html += '<path d="' + path + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
            
            // Connection dots
            html += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
            html += '<circle cx="' + toDot.x + '" cy="' + toDot.y + '" r="3" fill="' + cableColor + '"/>';
            
            // Labels
            if (fromPort) {
                var l1x = fromDot.x + (toDot.x - fromDot.x) * 0.15;
                var l1y = fromDot.y + (toDot.y - fromDot.y) * 0.15;
                pendingLabels.push({ x: l1x, y: l1y, text: fromPort, color: cableColor, small: false, onLine: true });
            }
            if (toPort) {
                var l2x = toDot.x - (toDot.x - fromDot.x) * 0.15;
                var l2y = toDot.y - (toDot.y - fromDot.y) * 0.15;
                pendingLabels.push({ x: l2x, y: l2y, text: toPort, color: cableColor, small: false, onLine: true });
            }
            if (cableId) {
                var midX = (fromDot.x + toDot.x) / 2;
                var midY = (fromDot.y + toDot.y) / 2;
                pendingLabels.push({ x: midX, y: midY, text: cableId, color: cableColor, small: true, onLine: true });
            }
        });
        
        // Step 3: Draw external/Wall Jack connections
        connections.forEach(function(c) {
            if (c.to || !c.externalDest || !c.from || !devicePositions[c.from]) return;
            
            var from = devicePositions[c.from];
            var cableColor = c.cableColor || config.connColors[c.type] || '#64748b';
            var isDashed = c.status === 'disabled';
            var isWallJack = c.isWallJack === true;
            var fromPort = c.fromPort || '';
            var externalDest = c.externalDest || '';
            var cableId = c.cableMarker || '';
            
            var fromKey = 'from-' + externalDest;
            var fromIdx = deviceConnectionIndex[c.from][fromKey] || 0;
            var fromTotal = deviceConnectionCount[c.from] || 1;
            
            // Wall Jack connections
            if (isWallJack && wallJackMap[externalDest]) {
                var virtualId = wallJackMap[externalDest].id;
                var wjPos = devicePositions[virtualId];
                if (wjPos) {
                    // Wall Jack center (standard device size)
                    var wjCX = wjPos.x + 40;
                    var wjCY = wjPos.y + 35;
                    
                    // Get from dot
                    var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, wjCX, wjCY);
                    
                    // Simple line to Wall Jack
                    var path = 'M' + fromDot.x + ',' + fromDot.y + ' L' + wjCX + ',' + wjCY;
                    
                    html += '<path d="' + path + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                        'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                    
                    // Connection dots
                    html += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                    html += '<circle cx="' + wjCX + '" cy="' + wjCY + '" r="3" fill="' + cableColor + '"/>';
                    
                    // Labels
                    if (fromPort) {
                        var l1x = fromDot.x + (wjCX - fromDot.x) * 0.15;
                        var l1y = fromDot.y + (wjCY - fromDot.y) * 0.15;
                        pendingLabels.push({ x: l1x, y: l1y, text: fromPort, color: cableColor, small: false, onLine: true });
                    }
                    if (cableId) {
                        var midX = (fromDot.x + wjCX) / 2;
                        var midY = (fromDot.y + wjCY) / 2;
                        pendingLabels.push({ x: midX, y: midY, text: cableId, color: cableColor, small: true, onLine: true });
                    }
                    return;
                }
            }
            
            // Non-Wall Jack external: check if there's a real device with this name first (exact or partial match)
            var realDeviceId = findMatchingDevice(externalDest);
            if (realDeviceId && devicePositions[realDeviceId]) {
                // Connect to the real device instead of virtual node
                var realPos = devicePositions[realDeviceId];
                var realCX = realPos.x + 40;
                var realCY = realPos.y + 35;
                
                // Get from dot
                var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, realCX, realCY);
                
                // Line to real device
                html += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + realCX + ',' + realCY + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                    'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                
                // Connection dots
                html += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                html += '<circle cx="' + realCX + '" cy="' + realCY + '" r="3" fill="' + cableColor + '"/>';
                
                // Labels
                if (fromPort) {
                    var l1x = fromDot.x + (realCX - fromDot.x) * 0.15;
                    var l1y = fromDot.y + (realCY - fromDot.y) * 0.15;
                    pendingLabels.push({ x: l1x, y: l1y, text: fromPort, color: cableColor, small: false, onLine: true });
                }
                if (cableId) {
                    var midX = (fromDot.x + realCX) / 2;
                    var midY = (fromDot.y + realCY) / 2;
                    pendingLabels.push({ x: midX, y: midY, text: cableId, color: cableColor, small: true, onLine: true });
                }
                return;
            }
            
            // Otherwise, draw line to virtual external node
            if (externalMap[externalDest]) {
                var virtualId = externalMap[externalDest].id;
                var extPos = devicePositions[virtualId];
                if (extPos) {
                    // External node center (same as device: 40,35 from top-left)
                    var extCX = extPos.x + 40;
                    var extCY = extPos.y + 35;
                    
                    // Get from dot
                    var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, extCX, extCY);
                    
                    // Line to external node
                    html += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + extCX + ',' + extCY + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                        'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                    
                    // Connection dots
                    html += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                    html += '<circle cx="' + extCX + '" cy="' + extCY + '" r="3" fill="' + cableColor + '"/>';
                    
                    // Labels
                    if (fromPort) {
                        var l1x = fromDot.x + (extCX - fromDot.x) * 0.15;
                        var l1y = fromDot.y + (extCY - fromDot.y) * 0.15;
                        pendingLabels.push({ x: l1x, y: l1y, text: fromPort, color: cableColor, small: false, onLine: true });
                    }
                    if (cableId) {
                        var midX = (fromDot.x + extCX) / 2;
                        var midY = (fromDot.y + extCY) / 2;
                        pendingLabels.push({ x: midX, y: midY, text: cableId, color: cableColor, small: true, onLine: true });
                    }
                }
            }
        });
        
        html += '</g>';
        
        // ═══════════════════════════════════════════════════════════════════
        // NETWORK ZONES - Draw zone backgrounds before devices
        // Groups devices by zone and draws colored rectangles around them
        // ═══════════════════════════════════════════════════════════════════
        html += '<g class="network-zones">';
        
        // Collect devices by zone
        // Zone is calculated dynamically from addresses[].zone (not from d.zone in JSON)
        var zoneGroups = {};
        devices.forEach(function(d) {
            // Calculate zone dynamically from addresses
            var deviceZone = '';
            if (d.addresses && d.addresses.length > 0) {
                for (var i = 0; i < d.addresses.length; i++) {
                    if (d.addresses[i].zone && d.addresses[i].zone.trim()) {
                        deviceZone = d.addresses[i].zone.trim();
                        break;
                    }
                }
            }
            
            if (deviceZone && devicePositions[d.id]) {
                var zoneName = deviceZone;
                if (!zoneGroups[zoneName]) {
                    zoneGroups[zoneName] = {
                        name: zoneName,
                        devices: []
                    };
                }
                zoneGroups[zoneName].devices.push(d);
            }
        });
        
        // Zone colors
        var zoneColors = {
            'DMZ': { fill: '#fecaca', stroke: '#ef4444', text: '#b91c1c' },           // Red
            'Backbone': { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309' },      // Amber/Orange
            'LAN': { fill: '#bfdbfe', stroke: '#3b82f6', text: '#1e40af' },           // Blue
            'WAN': { fill: '#bbf7d0', stroke: '#22c55e', text: '#166534' },           // Green
            'Cloud': { fill: '#e0e7ff', stroke: '#6366f1', text: '#4338ca' },         // Indigo
            'Management': { fill: '#f3e8ff', stroke: '#a855f7', text: '#7e22ce' },    // Purple
            'VPN': { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' },           // Emerald (encrypted)
            'VLAN': { fill: '#cffafe', stroke: '#06b6d4', text: '#0e7490' },          // Cyan
            'Guest': { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' },         // Pink
            'IoT': { fill: '#fef9c3', stroke: '#eab308', text: '#a16207' },           // Yellow
            'Servers': { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },       // Blue dark
            'Voice': { fill: '#ede9fe', stroke: '#8b5cf6', text: '#5b21b6' },         // Violet
            'Storage': { fill: '#f1f5f9', stroke: '#475569', text: '#1e293b' }        // Slate
        };
        var defaultZoneColor = { fill: '#e2e8f0', stroke: '#64748b', text: '#334155' }; // Slate/Gray
        
        // Draw zone connections as thick lines between devices in same zone
        // This replaces the old rectangular zone backgrounds
        Object.keys(zoneGroups).forEach(function(zoneName) {
            var zone = zoneGroups[zoneName];
            var zc = zoneColors[zoneName] || defaultZoneColor;
            var zoneDevices = zone.devices;
            
            // Need at least 2 devices to draw zone connections
            if (zoneDevices.length < 2) {
                // Single device - just draw a small indicator badge on the device
                if (zoneDevices.length === 1) {
                    var singlePos = devicePositions[zoneDevices[0].id];
                    if (singlePos) {
                        var zoneIcons = {
                            'DMZ': '🛡️', 'Backbone': '🔗', 'LAN': '🏢', 'WAN': '🌐',
                            'VLAN': '📊', 'VPN': '🔒', 'Cloud': '☁️', 'Guest': '👥',
                            'IoT': '📡', 'Servers': '🖥️', 'Management': '⚙️', 'Voice': '📞', 'Storage': '💾'
                        };
                        var icon = zoneIcons[zoneName] || '🔲';
                        var badgeText = icon + ' ' + zoneName;
                        
                        var badgeWidth = badgeText.length * 5.5 + 8;
                        // Draw badge below device
                        html += '<rect x="' + (singlePos.x + 40 - badgeWidth/2) + '" y="' + (singlePos.y + 92) + '" ' +
                            'width="' + badgeWidth + '" height="14" rx="3" fill="' + zc.stroke + '" fill-opacity="0.85"/>';
                        html += '<text x="' + (singlePos.x + 40) + '" y="' + (singlePos.y + 102) + '" ' +
                            'text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">' + escapeHtml(badgeText) + '</text>';
                    }
                }
                return;
            }
            
            // Get device centers
            var deviceCenters = [];
            zoneDevices.forEach(function(d) {
                var pos = devicePositions[d.id];
                if (pos) {
                    deviceCenters.push({
                        id: d.id,
                        x: pos.x + 40, // Center of device (80px width / 2)
                        y: pos.y + 45  // Center of device (90px height / 2)
                    });
                }
            });
            
            // Skip if no devices have positions
            if (deviceCenters.length === 0) return;
            
            // Calculate centroid of all devices in zone
            var centroidX = 0, centroidY = 0;
            deviceCenters.forEach(function(dc) {
                centroidX += dc.x;
                centroidY += dc.y;
            });
            centroidX /= deviceCenters.length;
            centroidY /= deviceCenters.length;
            
            // Draw thick lines from each device to the centroid (star topology for zone)
            deviceCenters.forEach(function(dc) {
                html += '<line x1="' + dc.x + '" y1="' + dc.y + '" x2="' + centroidX + '" y2="' + centroidY + '" ' +
                    'stroke="' + zc.stroke + '" stroke-width="5" stroke-opacity="0.35" stroke-linecap="round"/>';
            });
            
            // Draw zone label at centroid
            var zoneIcons = {
                'DMZ': '🛡️', 'Backbone': '🔗', 'LAN': '🏢', 'WAN': '🌐',
                'VLAN': '📊', 'VPN': '🔒', 'Cloud': '☁️', 'Guest': '👥',
                'IoT': '📡', 'Servers': '🖥️', 'Management': '⚙️', 'Voice': '📞', 'Storage': '💾'
            };
            var zoneIcon = zoneIcons[zoneName] || '🔲';
            var labelText = zoneIcon + ' ' + zoneName;
            
            // Label background pill at centroid
            var labelWidth = labelText.length * 5.5 + 12;
            html += '<rect x="' + (centroidX - labelWidth/2) + '" y="' + (centroidY - 9) + '" ' +
                'width="' + labelWidth + '" height="18" rx="9" fill="' + zc.stroke + '" fill-opacity="0.9"/>';
            html += '<text x="' + centroidX + '" y="' + (centroidY + 4) + '" text-anchor="middle" ' +
                'fill="#fff" font-size="9" font-weight="bold">' + escapeHtml(labelText) + '</text>';
        });
        
        html += '</g>';
        
        // Draw devices
        html += '<g class="devices">';
        
        // First, draw virtual external nodes (draggable boxes)
        // ═══════════════════════════════════════════════════════════════════
        // RENDER VIRTUAL EXTERNAL DEVICES - SAME STYLE AS WALLJACKS
        // ═══════════════════════════════════════════════════════════════════
        virtualExternals.forEach(function(ext) {
            var pos = devicePositions[ext.id];
            if (!pos) return;
            
            var color = typeColors.external || '#e0f2fe';
            var iconFn = deviceIcons.external || deviceIcons.others;
            
            html += '<g class="device-node external-node" data-id="' + ext.id + '" transform="translate(' + pos.x + ',' + pos.y + ')" ' +
                'style="cursor: move;" filter="url(#dropShadow)">';
            
            // Same background as standard devices
            html += '<rect x="-5" y="-5" width="90" height="100" rx="8" fill="transparent" class="hover-bg"/>';
            
            // External icon
            html += '<g class="device-icon">' + iconFn(color) + '</g>';
            
            // External name
            var name = ext.name || 'External';
            html += '<text x="40" y="78" text-anchor="middle" fill="#1e293b" font-size="9" font-weight="600" ' +
                'style="paint-order: stroke; stroke: white; stroke-width: 3px;">' + escapeHtml(name) + '</text>';
            
            // Type label
            html += '<text x="40" y="90" text-anchor="middle" fill="#475569" font-size="8" font-weight="600" ' +
                'style="paint-order: stroke; stroke: white; stroke-width: 2px;">EXTERNAL</text>';
            
            html += '</g>';
        });
        
        devices.forEach(function(d) {
            var pos = devicePositions[d.id];
            if (!pos) return;
            
            var type = d.type || 'others';
            var color = typeColors[type] || typeColors.others;
            var iconFn = deviceIcons[type] || deviceIcons.others;
            var isExternal = d._isExternal === true;
            
            html += '<g class="device-node' + (isExternal ? ' external-device' : '') + '" data-id="' + d.id + '" transform="translate(' + pos.x + ',' + pos.y + ')" ' +
                'style="cursor: move;" filter="url(#dropShadow)">';
            
            // Background - dashed border for external devices
            if (isExternal) {
                html += '<rect x="-8" y="-8" width="96" height="106" rx="10" fill="#fff8e1" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3"/>';
            } else {
                html += '<rect x="-5" y="-5" width="90" height="100" rx="8" fill="transparent" class="hover-bg"/>';
            }
            
            // Device icon (external PNG or inline SVG)
            var iconPath = externalIconMap[type] || externalIconMap.default;
            if (iconTheme === 'cisco-png' && iconPath) {
                html += '<g class="device-icon"><image href="' + iconPath + '" x="0" y="0" width="80" height="70" preserveAspectRatio="xMidYMid meet"/></g>';
            } else {
                html += '<g class="device-icon">' + iconFn(color) + '</g>';
            }
            
            // Device name - full name without truncation
            var name = d.name || 'Unnamed';
            html += '<text x="40" y="78" text-anchor="middle" fill="#1e293b" font-size="9" font-weight="600" ' +
                'style="paint-order: stroke; stroke: white; stroke-width: 3px;">' + escapeHtml(name) + '</text>';
            
            // IP address (first one) - support both addresses[] and legacy ip1
            var ip = '';
            if (d.addresses && d.addresses.length > 0) {
                ip = d.addresses[0].network || d.addresses[0].ip || '';
            } else if (d.ip1) {
                ip = d.ip1;
            }
            if (ip) {
                html += '<text x="40" y="90" text-anchor="middle" fill="#475569" font-size="8" font-weight="500" ' +
                    'style="paint-order: stroke; stroke: white; stroke-width: 2px;">' + escapeHtml(ip) + '</text>';
            }
            
            // For external devices, show their rack/location with full context (2 lines)
            if (isExternal) {
                var hasLocation = d.location && d.location.trim();
                var hasRack = d.rackId && d.rackId.trim();
                
                if (hasLocation && hasRack) {
                    // Two lines: Location on top, Source/Rack below
                    var locWidth = Math.max(90, d.location.length * 6 + 20);
                    var rackWidth = Math.max(90, d.rackId.length * 6 + 20);
                    var maxWidth = Math.max(locWidth, rackWidth);
                    var labelX = 40 - maxWidth / 2;
                    
                    // Location line (top) - orange
                    html += '<rect x="' + labelX + '" y="-30" width="' + maxWidth + '" height="14" rx="3" fill="#f59e0b" opacity="0.95"/>';
                    html += '<text x="40" y="-20" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">' +
                        '📍 ' + escapeHtml(d.location) + '</text>';
                    
                    // Group line (below) - darker (campo rackId per compatibilità, label visuale "Group")
                    html += '<rect x="' + labelX + '" y="-15" width="' + maxWidth + '" height="13" rx="3" fill="#92400e" opacity="0.9"/>';
                    html += '<text x="40" y="-5" text-anchor="middle" fill="#fff" font-size="8" font-weight="600">' +
                        '🗄️ ' + escapeHtml(d.rackId) + '</text>';
                } else {
                    // Single line fallback
                    var extLabel = hasLocation ? d.location : (hasRack ? d.rackId : 'ISP');
                    var labelWidth = Math.max(90, extLabel.length * 6 + 20);
                    var labelX2 = 40 - labelWidth / 2;
                    html += '<rect x="' + labelX2 + '" y="-20" width="' + labelWidth + '" height="14" rx="3" fill="#f59e0b" opacity="0.95"/>';
                    html += '<text x="40" y="-10" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">' +
                        '↗ ' + escapeHtml(extLabel) + '</text>';
                }
            }
            
            html += '</g>';
        });
        html += '</g>';
        
        // ═══════════════════════════════════════════════════════════════════
        // RENDER VIRTUAL WALL JACK DEVICES - STANDARD STYLE
        // Same style as other devices; only text/icon differ
        // ═══════════════════════════════════════════════════════════════════
        if (virtualWallJacks.length > 0) {
            html += '<g class="walljack-devices">';
            virtualWallJacks.forEach(function(wj) {
                var pos = devicePositions[wj.id];
                if (!pos) return;
                
                var color = typeColors.walljack || '#ecf0f1';
                var iconFn = deviceIcons.walljack;
                
                html += '<g class="device-node walljack-node" data-id="' + wj.id + '" transform="translate(' + pos.x + ',' + pos.y + ')" ' +
                    'style="cursor: move;" filter="url(#dropShadow)">';
                
                // Same background as standard devices
                html += '<rect x="-5" y="-5" width="90" height="100" rx="8" fill="transparent" class="hover-bg"/>';
                
                // Wall Jack icon - slightly larger than before
                html += '<g class="device-icon">' + iconFn(color) + '</g>';
                
                // Wall Jack name
                var name = wj.name || 'Wall Jack';
                html += '<text x="40" y="78" text-anchor="middle" fill="#1e293b" font-size="9" font-weight="600" ' +
                    'style="paint-order: stroke; stroke: white; stroke-width: 3px;">' + escapeHtml(name) + '</text>';
                
                // Type label
                html += '<text x="40" y="90" text-anchor="middle" fill="#475569" font-size="8" font-weight="600" ' +
                    'style="paint-order: stroke; stroke: white; stroke-width: 2px;">WALL JACK</text>';
                
                html += '</g>';
            });
            html += '</g>';
        }
        
        // ─── Draw connection labels AFTER devices (so they appear on top) ───
        // Labels use collision detection to avoid overlapping devices
        html += '<g class="connection-labels">';
        pendingLabels.forEach(function(lbl) {
            var textColor = getContrastTextColor(lbl.color);
            var fontSize = lbl.small ? 8 : 9;
            var padding = 4;
            var textWidth = lbl.text.length * (lbl.small ? 5 : 6) + padding * 2;
            var textHeight = lbl.small ? 14 : 16;
            
            // Find non-overlapping position for this label
            var offsetDir = lbl.onLine ? 'both' : 'vertical';
            var finalPos = findNonOverlappingPosition(lbl.x, lbl.y, textWidth, textHeight, offsetDir, 16);
            
            var rectX = finalPos.x - textWidth/2;
            var rectY = finalPos.y - textHeight/2;
            
            // Register this label position to prevent other labels from overlapping
            usedLabelPositions.push({ x: finalPos.x, y: finalPos.y, width: textWidth + 4, height: textHeight + 4 });
            
            html += '<g class="conn-label">';
            html += '<rect x="' + rectX + '" y="' + rectY + '" ' +
                'width="' + textWidth + '" height="' + textHeight + '" rx="3" ' +
                'fill="' + lbl.color + '" stroke="' + darkenColor(lbl.color, 30) + '" stroke-width="0.5"/>';
            html += '<text x="' + finalPos.x + '" y="' + (finalPos.y + 3) + '" ' +
                'text-anchor="middle" fill="' + textColor + '" ' +
                'font-size="' + fontSize + '" font-weight="600" font-family="Consolas,monospace">' + 
                escapeHtml(lbl.text) + '</text>';
            html += '</g>';
        });
        html += '</g>';
        
        html += '</svg>';
        
        // Add CSS for hover effects
        html += '<style>' +
            '.device-node:hover .hover-bg { fill: rgba(59, 130, 246, 0.1); }' +
            '.device-node:hover { filter: url(#dropShadow) brightness(1.05); }' +
            '.external-device { opacity: 0.85; }' +
            '</style>';
        
        return html;
    }
    
    // Track document-level listeners for cleanup
    var documentListeners = {
        mousemove: null,
        touchmove: null,
        mouseup: null,
        touchend: null
    };
    
    // Track node listeners for cleanup (prevent memory leak)
    var nodeListenerCleanup = [];
    
    function removeDocumentListeners() {
        if (documentListeners.mousemove) {
            document.removeEventListener('mousemove', documentListeners.mousemove);
            documentListeners.mousemove = null;
        }
        if (documentListeners.touchmove) {
            document.removeEventListener('touchmove', documentListeners.touchmove);
            documentListeners.touchmove = null;
        }
        if (documentListeners.mouseup) {
            document.removeEventListener('mouseup', documentListeners.mouseup);
            documentListeners.mouseup = null;
        }
        if (documentListeners.touchend) {
            document.removeEventListener('touchend', documentListeners.touchend);
            documentListeners.touchend = null;
        }
        
        // Clean up node listeners
        nodeListenerCleanup.forEach(function(cleanup) {
            cleanup.node.removeEventListener('mousedown', cleanup.mousedown);
            cleanup.node.removeEventListener('touchstart', cleanup.touchstart);
        });
        nodeListenerCleanup = [];
    }
    
    function addDragListeners() {
        // Remove previous document listeners to prevent memory leak
        removeDocumentListeners();
        
        // Only select device nodes that have data-id (real devices, not labels or external boxes)
        var nodes = container.querySelectorAll('.device-node[data-id]');
        
        nodes.forEach(function(node) {
            // Store references for cleanup
            var cleanup = { node: node, mousedown: startDrag, touchstart: startDrag };
            nodeListenerCleanup.push(cleanup);
            
            node.addEventListener('mousedown', startDrag);
            node.addEventListener('touchstart', startDrag, { passive: false });
        });
        
        // Store references for cleanup
        documentListeners.mousemove = drag;
        documentListeners.touchmove = drag;
        documentListeners.mouseup = endDrag;
        documentListeners.touchend = endDrag;
        
        document.addEventListener('mousemove', documentListeners.mousemove);
        document.addEventListener('touchmove', documentListeners.touchmove, { passive: false });
        document.addEventListener('mouseup', documentListeners.mouseup);
        document.addEventListener('touchend', documentListeners.touchend);
    }
    
    function startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        var node = e.currentTarget;
        var deviceId = node.getAttribute('data-id');
        
        // Only drag if we have a valid device ID
        if (!deviceId) return;
        
        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Get current transform
        var transform = node.getAttribute('transform');
        var match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        var currentX = match ? parseFloat(match[1]) : 0;
        var currentY = match ? parseFloat(match[2]) : 0;
        
        // Convert screen coordinates to SVG coordinates
        var svgRect = svg.getBoundingClientRect();
        var svgX = (clientX - svgRect.left) / svgRect.width * viewBox.width + viewBox.x;
        var svgY = (clientY - svgRect.top) / svgRect.height * viewBox.height + viewBox.y;
        
        dragging = {
            node: node,
            deviceId: deviceId,
            offsetX: svgX - currentX,
            offsetY: svgY - currentY
        };
        
        node.style.cursor = 'grabbing';
        svg.style.cursor = 'grabbing';
    }

    function startPan(e) {
        if (e.button !== 0) return;
        if (dragging) return;
        if (e.target && e.target.closest && e.target.closest('.device-node')) return;
        if (!svg) return;

        isPanning = true;
        panStart.x = e.clientX;
        panStart.y = e.clientY;
        panStart.viewBoxX = viewBox.x;
        panStart.viewBoxY = viewBox.y;

        container.style.cursor = 'grabbing';
        svg.style.cursor = 'grabbing';
    }

    function panMove(e) {
        if (!isPanning || !svg) return;
        e.preventDefault();

        var rect = svg.getBoundingClientRect();
        var scaleX = viewBox.width / rect.width;
        var scaleY = viewBox.height / rect.height;

        var dx = (e.clientX - panStart.x) * scaleX;
        var dy = (e.clientY - panStart.y) * scaleY;

        viewBox.x = panStart.viewBoxX - dx;
        viewBox.y = panStart.viewBoxY - dy;

        svg.setAttribute('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height);
    }

    function endPan() {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = 'grab';
        if (svg) {
            svg.style.cursor = 'grab';
        }
    }
    
    function drag(e) {
        if (!dragging) return;
        e.preventDefault();
        
        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Convert screen coordinates to SVG coordinates
        var svgRect = svg.getBoundingClientRect();
        var svgX = (clientX - svgRect.left) / svgRect.width * viewBox.width + viewBox.x;
        var svgY = (clientY - svgRect.top) / svgRect.height * viewBox.height + viewBox.y;
        
        var newX = svgX - dragging.offsetX;
        var newY = svgY - dragging.offsetY;
        
        // Update node position
        dragging.node.setAttribute('transform', 'translate(' + newX + ',' + newY + ')');
        
        // Update stored position
        devicePositions[dragging.deviceId] = { x: newX, y: newY };
        
        // Mark this position as custom (user-dragged)
        customPositions[dragging.deviceId] = { x: newX, y: newY };
        
        // Update connections and zones
        updateConnections();
        updateZones();
    }
    
    function endDrag() {
        if (dragging) {
            // Save custom positions to localStorage when drag ends
            saveCustomPositions();
            
            dragging.node.style.cursor = 'move';
            svg.style.cursor = 'grab';
            dragging = null;
        }
    }
    
    function updateConnections() {
        var connections = getTopologyFilteredConnections();
        
        var connGroup = svg.querySelector('.connections');
        var labelGroup = svg.querySelector('.connection-labels');
        if (!connGroup || !svg) return;
        
        var connHtml = '';
        var labelHtml = '';
        
        // Collision detection for labels
        var usedLabelPositions = [];
        
        // Add device positions as occupied areas
        var devices = getTopologyFilteredDevices();
        devices.forEach(function(d) {
            var pos = devicePositions[d.id];
            if (pos) {
                usedLabelPositions.push({ x: pos.x + 40, y: pos.y + 45, width: 100, height: 100 });
            }
        });
        
        function isLabelOverlapping(x, y, width, height) {
            for (var i = 0; i < usedLabelPositions.length; i++) {
                var pos = usedLabelPositions[i];
                if (Math.abs(x - pos.x) < (width + pos.width) / 2 + 8 &&
                    Math.abs(y - pos.y) < (height + pos.height) / 2 + 5) {
                    return true;
                }
            }
            return false;
        }
        
        function findNonOverlappingPosition(baseX, baseY, width, height) {
            var x = baseX, y = baseY;
            var attempts = 0;
            var step = 22;
            while (isLabelOverlapping(x, y, width, height) && attempts < 16) {
                attempts++;
                x = baseX + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * step * 0.7;
                y = baseY + (attempts % 2 === 0 ? -1 : 1) * Math.ceil(attempts / 2) * step * 0.7;
            }
            return { x: x, y: y };
        }
        
        // Helper functions
        function getContrastTextColor(hexColor) {
            if (!hexColor || hexColor === 'none') return '#ffffff';
            var hex = hexColor.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.5 ? '#000000' : '#ffffff';
        }
        
        function darkenColor(hexColor, amount) {
            if (!hexColor) return '#1e293b';
            var hex = hexColor.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            var r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
            var g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
            var b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
            return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }
        
        function makeLabel(baseX, baseY, text, bgColor, isSmall) {
            if (!text) return '';
            var textColor = getContrastTextColor(bgColor);
            var fontSize = isSmall ? 8 : 9;
            var padding = 4;
            var textWidth = text.length * (isSmall ? 5 : 6) + padding * 2;
            var textHeight = isSmall ? 14 : 16;
            var pos = findNonOverlappingPosition(baseX, baseY, textWidth, textHeight);
            usedLabelPositions.push({ x: pos.x, y: pos.y, width: textWidth + 4, height: textHeight + 4 });
            return '<g class="conn-label">' +
                '<rect x="' + (pos.x - textWidth/2) + '" y="' + (pos.y - textHeight/2) + '" ' +
                'width="' + textWidth + '" height="' + textHeight + '" rx="3" ' +
                'fill="' + bgColor + '" stroke="' + darkenColor(bgColor, 30) + '" stroke-width="0.5"/>' +
                '<text x="' + pos.x + '" y="' + (pos.y + 3) + '" ' +
                'text-anchor="middle" fill="' + textColor + '" ' +
                'font-size="' + fontSize + '" font-weight="600" font-family="Consolas,monospace">' + 
                escapeHtml(text) + '</text></g>';
        }
        
        // Count connections per device
        var deviceConnectionCount = {};
        var deviceConnectionIndex = {};
        
        // Build device name map for findMatchingDevice (same as in render)
        var existingDeviceNames = {};
        var existingDeviceNamesList = [];
        devices.forEach(function(d) {
            if (d.name) {
                var nameLower = d.name.toLowerCase();
                existingDeviceNames[nameLower] = d.id;
                existingDeviceNamesList.push({ name: nameLower, id: d.id });
            }
        });
        
        // Helper to find matching real device for external connections
        function findMatchingDevice(externalDest) {
            if (!externalDest) return null;
            var extLower = externalDest.toLowerCase().trim();
            
            // 1. Exact match
            if (existingDeviceNames[extLower]) {
                return existingDeviceNames[extLower];
            }
            
            // 2. Partial match
            for (var i = 0; i < existingDeviceNamesList.length; i++) {
                var dev = existingDeviceNamesList[i];
                if (dev.name.indexOf(extLower) !== -1 || extLower.indexOf(dev.name) !== -1) {
                    return dev.id;
                }
            }
            
            // 3. Word-based match (include parentheses in split)
            var extWords = extLower.split(/[\s\-_\/\(\)\[\]]+/);
            for (var i = 0; i < existingDeviceNamesList.length; i++) {
                var dev = existingDeviceNamesList[i];
                var devWords = dev.name.split(/[\s\-_\/\(\)\[\]]+/);
                for (var j = 0; j < extWords.length; j++) {
                    for (var k = 0; k < devWords.length; k++) {
                        if (extWords[j] && devWords[k] && extWords[j].length > 2 && extWords[j] === devWords[k]) {
                            return dev.id;
                        }
                    }
                }
            }
            
            return null;
        }
        
        connections.forEach(function(c) {
            if (c.from) {
                if (!deviceConnectionCount[c.from]) deviceConnectionCount[c.from] = 0;
                if (!deviceConnectionIndex[c.from]) deviceConnectionIndex[c.from] = {};
                var fromKey = 'from-' + (c.to || c.externalDest || 'ext');
                deviceConnectionIndex[c.from][fromKey] = deviceConnectionCount[c.from];
                deviceConnectionCount[c.from]++;
            }
            if (c.to) {
                if (!deviceConnectionCount[c.to]) deviceConnectionCount[c.to] = 0;
                if (!deviceConnectionIndex[c.to]) deviceConnectionIndex[c.to] = {};
                var toKey = 'to-' + c.from;
                deviceConnectionIndex[c.to][toKey] = deviceConnectionCount[c.to];
                deviceConnectionCount[c.to]++;
            }
        });
        
        // Get connection dot position
        function getConnectionDot(deviceId, connIdx, totalConns, deviceX, deviceY, targetX, targetY) {
            var cx = deviceX + 40;
            var cy = deviceY + 35;
            var angle = Math.atan2(targetY - cy, targetX - cx);
            var spacing = 8;
            var offset = (connIdx - (totalConns - 1) / 2) * spacing;
            var radius = 48;
            var dotX = cx + Math.cos(angle) * radius;
            var dotY = cy + Math.sin(angle) * radius;
            var perpAngle = angle + Math.PI / 2;
            dotX += Math.cos(perpAngle) * offset;
            dotY += Math.sin(perpAngle) * offset;
            return { x: dotX, y: dotY };
        }
        
        // Draw internal connections
        connections.forEach(function(c) {
            if (!c.from || !c.to || !devicePositions[c.from] || !devicePositions[c.to]) return;
            
            var from = devicePositions[c.from];
            var to = devicePositions[c.to];
            var cableColor = c.cableColor || config.connColors[c.type] || '#64748b';
            var isDashed = c.status === 'disabled';
            var fromPort = c.fromPort || '';
            var toPort = c.toPort || '';
            var cableId = c.cableMarker || '';
            
            var fromKey = 'from-' + c.to;
            var toKey = 'to-' + c.from;
            var fromIdx = deviceConnectionIndex[c.from][fromKey] || 0;
            var toIdx = deviceConnectionIndex[c.to][toKey] || 0;
            var fromTotal = deviceConnectionCount[c.from] || 1;
            var toTotal = deviceConnectionCount[c.to] || 1;
            
            var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, to.x + 40, to.y + 35);
            var toDot = getConnectionDot(c.to, toIdx, toTotal, to.x, to.y, from.x + 40, from.y + 35);
            
            connHtml += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + toDot.x + ',' + toDot.y + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
            connHtml += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
            connHtml += '<circle cx="' + toDot.x + '" cy="' + toDot.y + '" r="3" fill="' + cableColor + '"/>';
            
            if (fromPort) {
                var l1x = fromDot.x + (toDot.x - fromDot.x) * 0.15;
                var l1y = fromDot.y + (toDot.y - fromDot.y) * 0.15;
                labelHtml += makeLabel(l1x, l1y, fromPort, cableColor, false);
            }
            if (toPort) {
                var l2x = toDot.x - (toDot.x - fromDot.x) * 0.15;
                var l2y = toDot.y - (toDot.y - fromDot.y) * 0.15;
                labelHtml += makeLabel(l2x, l2y, toPort, cableColor, false);
            }
            if (cableId) {
                labelHtml += makeLabel((fromDot.x + toDot.x) / 2, (fromDot.y + toDot.y) / 2, cableId, cableColor, true);
            }
        });
        
        // Draw external/Wall Jack connections
        connections.forEach(function(c) {
            if (c.to || !c.externalDest || !c.from || !devicePositions[c.from]) return;
            
            var from = devicePositions[c.from];
            var cableColor = c.cableColor || config.connColors[c.type] || '#64748b';
            var isDashed = c.status === 'disabled';
            var isWallJack = c.isWallJack === true;
            var fromPort = c.fromPort || '';
            var externalDest = c.externalDest || '';
            var cableId = c.cableMarker || '';
            
            var fromKey = 'from-' + externalDest;
            var fromIdx = deviceConnectionIndex[c.from][fromKey] || 0;
            var fromTotal = deviceConnectionCount[c.from] || 1;
            
            if (isWallJack) {
                var virtualId = 'wj_' + externalDest.replace(/[^a-zA-Z0-9]/g, '_');
                var wjPos = devicePositions[virtualId];
                if (wjPos) {
                    var wjCX = wjPos.x + 40;
                    var wjCY = wjPos.y + 35;
                    
                    var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, wjCX, wjCY);
                    
                    connHtml += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + wjCX + ',' + wjCY + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                        'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                    connHtml += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                    connHtml += '<circle cx="' + wjCX + '" cy="' + wjCY + '" r="3" fill="' + cableColor + '"/>';
                    
                    if (fromPort) {
                        var l1x = fromDot.x + (wjCX - fromDot.x) * 0.15;
                        var l1y = fromDot.y + (wjCY - fromDot.y) * 0.15;
                        labelHtml += makeLabel(l1x, l1y, fromPort, cableColor, false);
                    }
                    if (cableId) {
                        labelHtml += makeLabel((fromDot.x + wjCX) / 2, (fromDot.y + wjCY) / 2, cableId, cableColor, true);
                    }
                    return;
                }
            }
            
            // Non-Wall Jack external - first check if there's a real device match
            var realDeviceId = findMatchingDevice(externalDest);
            if (realDeviceId && devicePositions[realDeviceId]) {
                // Connect to the real device instead of virtual node
                var realPos = devicePositions[realDeviceId];
                var realCX = realPos.x + 40;
                var realCY = realPos.y + 35;
                
                var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, realCX, realCY);
                
                connHtml += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + realCX + ',' + realCY + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                    'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                connHtml += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                connHtml += '<circle cx="' + realCX + '" cy="' + realCY + '" r="3" fill="' + cableColor + '"/>';
                
                if (fromPort) {
                    var l1x = fromDot.x + (realCX - fromDot.x) * 0.15;
                    var l1y = fromDot.y + (realCY - fromDot.y) * 0.15;
                    labelHtml += makeLabel(l1x, l1y, fromPort, cableColor, false);
                }
                if (cableId) {
                    labelHtml += makeLabel((fromDot.x + realCX) / 2, (fromDot.y + realCY) / 2, cableId, cableColor, true);
                }
                return;
            }
            
            // Otherwise connect to virtual external device
            var virtualId = 'ext_' + externalDest.replace(/[^a-zA-Z0-9]/g, '_');
            var extPos = devicePositions[virtualId];
            if (extPos) {
                var extCX = extPos.x + 40;
                var extCY = extPos.y + 35;
                
                var fromDot = getConnectionDot(c.from, fromIdx, fromTotal, from.x, from.y, extCX, extCY);
                
                connHtml += '<path d="M' + fromDot.x + ',' + fromDot.y + ' L' + extCX + ',' + extCY + '" fill="none" stroke="' + cableColor + '" stroke-width="1.5" ' +
                    'stroke-linecap="round"' + (isDashed ? ' stroke-dasharray="6,3"' : '') + '/>';
                connHtml += '<circle cx="' + fromDot.x + '" cy="' + fromDot.y + '" r="3" fill="' + cableColor + '"/>';
                connHtml += '<circle cx="' + extCX + '" cy="' + extCY + '" r="3" fill="' + cableColor + '"/>';
                
                if (fromPort) {
                    var l1x = fromDot.x + (extCX - fromDot.x) * 0.15;
                    var l1y = fromDot.y + (extCY - fromDot.y) * 0.15;
                    labelHtml += makeLabel(l1x, l1y, fromPort, cableColor, false);
                }
                if (cableId) {
                    labelHtml += makeLabel((fromDot.x + extCX) / 2, (fromDot.y + extCY) / 2, cableId, cableColor, true);
                }
            }
        });
        
        connGroup.innerHTML = connHtml;
        if (labelGroup) {
            labelGroup.innerHTML = labelHtml;
        }
    }
    
    // Update zone backgrounds when devices are moved
    function updateZones() {
        var zoneGroup = svg ? svg.querySelector('.network-zones') : null;
        if (!zoneGroup) return;
        
        var devices = getTopologyFilteredDevices();
        
        // Collect devices by zone
        // Zone is calculated dynamically from addresses[].zone (not from d.zone in JSON)
        var zoneGroups = {};
        devices.forEach(function(d) {
            // Calculate zone dynamically from addresses
            var deviceZone = '';
            if (d.addresses && d.addresses.length > 0) {
                for (var i = 0; i < d.addresses.length; i++) {
                    if (d.addresses[i].zone && d.addresses[i].zone.trim()) {
                        deviceZone = d.addresses[i].zone.trim();
                        break;
                    }
                }
            }
            
            if (deviceZone && devicePositions[d.id]) {
                var zoneName = deviceZone;
                if (!zoneGroups[zoneName]) {
                    zoneGroups[zoneName] = {
                        name: zoneName,
                        devices: []
                    };
                }
                zoneGroups[zoneName].devices.push(d);
            }
        });
        
        // Zone colors
        var zoneColors = {
            'DMZ': { fill: '#fecaca', stroke: '#ef4444', text: '#b91c1c' },
            'Backbone': { fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309' },
            'LAN': { fill: '#bfdbfe', stroke: '#3b82f6', text: '#1e40af' },
            'WAN': { fill: '#bbf7d0', stroke: '#22c55e', text: '#166534' },
            'Cloud': { fill: '#e0e7ff', stroke: '#6366f1', text: '#4338ca' },
            'Management': { fill: '#f3e8ff', stroke: '#a855f7', text: '#7e22ce' },
            'VPN': { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' },
            'VLAN': { fill: '#cffafe', stroke: '#06b6d4', text: '#0e7490' },
            'Guest': { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' },
            'IoT': { fill: '#fef9c3', stroke: '#eab308', text: '#a16207' },
            'Servers': { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
            'Voice': { fill: '#ede9fe', stroke: '#8b5cf6', text: '#5b21b6' },
            'Storage': { fill: '#f1f5f9', stroke: '#475569', text: '#1e293b' }
        };
        var defaultZoneColor = { fill: '#e2e8f0', stroke: '#64748b', text: '#334155' };
        
        var html = '';
        Object.keys(zoneGroups).forEach(function(zoneName) {
            var zone = zoneGroups[zoneName];
            var zc = zoneColors[zoneName] || defaultZoneColor;
            var zoneDevices = zone.devices;
            
            // Need at least 2 devices to draw zone connections
            if (zoneDevices.length < 2) {
                // Single device - just draw a small indicator badge
                if (zoneDevices.length === 1) {
                    var singlePos = devicePositions[zoneDevices[0].id];
                    if (singlePos) {
                        var zoneIcons = {
                            'DMZ': '🛡️', 'Backbone': '🔗', 'LAN': '🏢', 'WAN': '🌐',
                            'VLAN': '📊', 'VPN': '🔒', 'Cloud': '☁️', 'Guest': '👥',
                            'IoT': '📡', 'Servers': '🖥️', 'Management': '⚙️', 'Voice': '📞', 'Storage': '💾'
                        };
                        var icon = zoneIcons[zoneName] || '🔲';
                        var badgeText = icon + ' ' + zoneName;
                        
                        var badgeWidth = badgeText.length * 5.5 + 8;
                        html += '<rect x="' + (singlePos.x + 40 - badgeWidth/2) + '" y="' + (singlePos.y + 92) + '" ' +
                            'width="' + badgeWidth + '" height="14" rx="3" fill="' + zc.stroke + '" fill-opacity="0.85"/>';
                        html += '<text x="' + (singlePos.x + 40) + '" y="' + (singlePos.y + 102) + '" ' +
                            'text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">' + escapeHtml(badgeText) + '</text>';
                    }
                }
                return;
            }
            
            // Get device centers
            var deviceCenters = [];
            zoneDevices.forEach(function(d) {
                var pos = devicePositions[d.id];
                if (pos) {
                    deviceCenters.push({
                        id: d.id,
                        x: pos.x + 40,
                        y: pos.y + 45
                    });
                }
            });
            
            // Skip if no devices have positions
            if (deviceCenters.length === 0) return;
            
            // Calculate centroid
            var centroidX = 0, centroidY = 0;
            deviceCenters.forEach(function(dc) {
                centroidX += dc.x;
                centroidY += dc.y;
            });
            centroidX /= deviceCenters.length;
            centroidY /= deviceCenters.length;
            
            // Draw thick lines from each device to centroid
            deviceCenters.forEach(function(dc) {
                html += '<line x1="' + dc.x + '" y1="' + dc.y + '" x2="' + centroidX + '" y2="' + centroidY + '" ' +
                    'stroke="' + zc.stroke + '" stroke-width="5" stroke-opacity="0.35" stroke-linecap="round"/>';
            });
            
            // Zone label at centroid
            var zoneIcons2 = {
                'DMZ': '🛡️', 'Backbone': '🔗', 'LAN': '🏢', 'WAN': '🌐',
                'VLAN': '📊', 'VPN': '🔒', 'Cloud': '☁️', 'Guest': '👥',
                'IoT': '📡', 'Servers': '🖥️', 'Management': '⚙️', 'Voice': '📞', 'Storage': '💾'
            };
            var zoneIcon = zoneIcons2[zoneName] || '🔲';
            var labelText = zoneIcon + ' ' + zoneName;
            
            var labelWidth = labelText.length * 5.5 + 12;
            html += '<rect x="' + (centroidX - labelWidth/2) + '" y="' + (centroidY - 9) + '" ' +
                'width="' + labelWidth + '" height="18" rx="9" fill="' + zc.stroke + '" fill-opacity="0.9"/>';
            html += '<text x="' + centroidX + '" y="' + (centroidY + 4) + '" text-anchor="middle" ' +
                'fill="#fff" font-size="9" font-weight="bold">' + escapeHtml(labelText) + '</text>';
        });
        
        zoneGroup.innerHTML = html;
    }

    function handleZoom(e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? 1.1 : 0.9;
        
        viewBox.width *= delta;
        viewBox.height *= delta;
        
        // Center zoom
        var rect = container.getBoundingClientRect();
        var mouseX = (e.clientX - rect.left) / rect.width;
        var mouseY = (e.clientY - rect.top) / rect.height;
        
        viewBox.x += viewBox.width * (1 - delta) * mouseX / delta;
        viewBox.y += viewBox.height * (1 - delta) * mouseY / delta;
        
        if (svg) {
            svg.setAttribute('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height);
        }
    }
    
    function updateLayout() {
        var select = document.getElementById('drawioLayout');
        currentLayout = select ? select.value : 'auto';
        
        // Clear custom positions when changing layout (reset to new layout)
        clearCustomPositions();
        
        render();
    }
    
    function fit() {
        var devices = getTopologyFilteredDevices();
        calculateViewBox(devices);
        
        // Add small extra padding
        var extraPadding = 40;
        viewBox.x -= extraPadding;
        viewBox.y -= extraPadding;
        viewBox.width += extraPadding * 2;
        viewBox.height += extraPadding * 2;
        
        if (svg) {
            svg.setAttribute('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height);
        }
    }
    
    // Generate export filename and title based on current filters
    function getExportInfo() {
        var parts = [];
        var fileParts = ['Tiesse-Matrix-Topology'];
        
        var locationFilter = document.getElementById('topologyLocationFilter');
        if (locationFilter && locationFilter.value) {
            parts.push(locationFilter.value);
            fileParts.push(locationFilter.value.toLowerCase().replace(/\s+/g, '-'));
        }
        
        var rackFilter = document.getElementById('topologyRackFilter');
        if (rackFilter && rackFilter.value) {
            parts.push(rackFilter.value);
            fileParts.push(rackFilter.value.toLowerCase().replace(/\s+/g, '-'));
        }
        
        var now = new Date();
        var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        parts.push(dateStr);
        fileParts.push(now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0'));
        
        return {
            title: parts.join(' • '),
            filename: fileParts.join('_') + '.png'
        };
    }
    
    function getExportFilename(extension) {
        var info = getExportInfo();
        return info.filename.replace('.png', '.' + extension);
    }
    
    function exportPNG() {
        if (!svg) {
            Toast.warning('No topology to export');
            return;
        }
        
        var viewBoxAttr = svg.getAttribute('viewBox');
        if (!viewBoxAttr) {
            Toast.warning('Click "Fit View" first, then export');
            return;
        }
        
        var bbox;
        try {
            bbox = svg.getBBox();
        } catch (e) {
            bbox = null;
        }
        
        var vbParts = viewBoxAttr.split(' ');
        var vbX = parseFloat(vbParts[0]) || 0;
        var vbY = parseFloat(vbParts[1]) || 0;
        var vbWidth = parseFloat(vbParts[2]) || 1920;
        var vbHeight = parseFloat(vbParts[3]) || 1080;
        
        var padding = 40;
        if (bbox && bbox.width && bbox.height) {
            vbX = bbox.x - padding;
            vbY = bbox.y - padding;
            vbWidth = bbox.width + padding * 2;
            vbHeight = bbox.height + padding * 2;
        }
        
        var scale = 2;
        var maxDim = 4096;
        var canvasWidth, canvasHeight;
        
        if (vbWidth > vbHeight) {
            canvasWidth = Math.min(vbWidth * scale, maxDim);
            canvasHeight = canvasWidth * (vbHeight / vbWidth);
        } else {
            canvasHeight = Math.min(vbHeight * scale, maxDim);
            canvasWidth = canvasHeight * (vbWidth / vbHeight);
        }
        
        canvasWidth = Math.max(canvasWidth, 1920);
        canvasHeight = Math.max(canvasHeight, 1080);
        
        var svgClone = svg.cloneNode(true);
        svgClone.setAttribute('width', canvasWidth);
        svgClone.setAttribute('height', canvasHeight);
        svgClone.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbWidth + ' ' + vbHeight);
        svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        var style = document.createElement('style');
        style.textContent = 'text, tspan { font-family: Arial, sans-serif; }';
        svgClone.insertBefore(style, svgClone.firstChild);
        
        var svgData = new XMLSerializer().serializeToString(svgClone);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        var exportInfo = getExportInfo();
        var filename = exportInfo.filename;
        var title = exportInfo.title;
        
        // Add header height for title
        var headerHeight = 60;
        canvas.height = canvasHeight + headerHeight;
        
        img.onload = function() {
            // Background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw title header
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 28px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, 40);
            
            // Draw topology below header
            ctx.drawImage(img, 0, headerHeight, canvasWidth, canvasHeight);
            
            var link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            Toast.success('PNG exported: ' + filename);
        };
        
        img.onerror = function() {
            Toast.error('Export failed. Click "Fit View" first.');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    // Use global escapeHtml function from app.js
    
    return {
        init: init,
        render: render,
        updateLayout: updateLayout,
        fit: fit,
        exportPNG: exportPNG,
        getMiniIcon: getMiniIcon,
        getLargeIcon: getLargeIcon,
        getAllDeviceTypes: getAllDeviceTypes,
        getTypeInfo: getTypeInfo,
        typeLabels: typeLabels,
        typeColors: typeColors,
        updateRackFilter: updateRackFilter
    };
})();

// Global functions for SVG Topology
function filterTopologyByLocation() { 
    // Update rack filter options based on new location
    SVGTopology.updateRackFilter();
    // Clear rack selection when location changes
    var rackFilter = document.getElementById('topologyRackFilter');
    if (rackFilter) rackFilter.value = '';
    SVGTopology.render(); 
}
function filterTopologyByRack() { SVGTopology.render(); }
function updateDrawioLayout() { SVGTopology.updateLayout(); }
function fitDrawioView() { SVGTopology.fit(); }
function exportDrawioPNG() { SVGTopology.exportPNG(); }

// Print Topology as PNG
function printTopology() {
    var svg = document.querySelector('#drawioContainer svg');
    if (!svg) {
        Toast.error('Topology not rendered yet');
        return;
    }
    
    try {
        // Clone SVG and prepare for printing
        var svgClone = svg.cloneNode(true);
        var bbox = svg.getBBox();
        
        // Set viewBox to include all content
        svgClone.setAttribute('viewBox', (bbox.x - 50) + ' ' + (bbox.y - 50) + ' ' + (bbox.width + 100) + ' ' + (bbox.height + 100));
        svgClone.setAttribute('width', Math.min(bbox.width + 100, 1200));
        svgClone.setAttribute('height', Math.min(bbox.height + 100, 800));
        
        var svgData = new XMLSerializer().serializeToString(svgClone);
        
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Network Topology - Tiesse Network</title>';
        html += '<style>';
        html += '@media print { @page { size: landscape; margin: 10mm; } }';
        html += 'body { font-family: Arial, sans-serif; padding: 20px; margin: 0; text-align: center; }';
        html += 'h2 { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1e293b; }';
        html += 'p { font-size: 10px; color: #64748b; margin-bottom: 20px; }';
        html += 'svg { max-width: 100%; height: auto; }';
        html += '</style>';
        html += '</head><body>';
        html += '<h2>🗺️ Network Topology - ' + new Date().toLocaleDateString() + '</h2>';
        html += '<p>Devices: ' + appState.devices.length + ' | Connections: ' + appState.connections.length + '</p>';
        html += svgData;
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 500);
    } catch (e) {
        Debug.error('Print topology error:', e);
        Toast.error('Error printing: ' + e.message);
    }
}

// Topology Legend Modal functions
function showTopologyLegend() {
    var modal = document.getElementById('legendModal');
    var content = document.getElementById('legendModalContent');
    if (!modal || !content) {
        Debug.error('Legend modal elements not found');
        return;
    }
    
    // Get all device types from SVGTopology
    var allTypes = [];
    try {
        allTypes = SVGTopology.getAllDeviceTypes();
    } catch(e) {
        Debug.error('Error getting device types:', e);
        allTypes = ['router', 'switch', 'patch', 'firewall', 'server', 'wifi', 'isp', 'router_wifi', 'modem', 'hub', 'pc', 'ip_phone', 'printer', 'nas', 'camera', 'ups', 'walljack', 'others'];
    }
    
    // Ensure walljack is in the list
    if (allTypes.indexOf('walljack') < 0) {
        allTypes.push('walljack');
    }
    
    // Count WallJacks from connections (they are virtual devices from connections with isWallJack=true)
    var wallJackCount = 0;
    if (typeof appState !== 'undefined' && appState.connections) {
        var wallJackSet = {};
        for (var w = 0; w < appState.connections.length; w++) {
            var conn = appState.connections[w];
            if (conn.isWallJack && conn.externalDest) {
                wallJackSet[conn.externalDest] = true;
            }
        }
        wallJackCount = Object.keys(wallJackSet).length;
    }
    
    // Count devices by type, status, and collect by location
    var typeCounts = {};
    var typeOffCounts = {};
    var locationCounts = {};
    var totalConnections = 0;
    
    if (typeof appState !== 'undefined') {
        if (appState.devices) {
            for (var d = 0; d < appState.devices.length; d++) {
                var dev = appState.devices[d];
                var t = dev.type || 'others';
                var isOff = dev.status === 'disabled' || dev.status === 'off';
                typeCounts[t] = (typeCounts[t] || 0) + 1;
                if (isOff) {
                    typeOffCounts[t] = (typeOffCounts[t] || 0) + 1;
                }
                if (dev.location) {
                    locationCounts[dev.location] = (locationCounts[dev.location] || 0) + 1;
                }
            }
        }
        if (appState.connections) {
            totalConnections = appState.connections.length;
        }
    }
    
    // Calculate totals
    var totalDevices = appState.devices ? appState.devices.length : 0;
    var totalOff = 0;
    var usedTypes = 0;
    var usedSet = {};
    if (appState.devices) {
        for (var m = 0; m < appState.devices.length; m++) {
            usedSet[appState.devices[m].type] = true;
            if (appState.devices[m].status === 'disabled' || appState.devices[m].status === 'off') {
                totalOff++;
            }
        }
        usedTypes = Object.keys(usedSet).length;
    }
    if (wallJackCount > 0) usedTypes++;
    
    // Build HTML - Summary cards at top
    var html = '';
    
    // Summary Stats Row (6 cards now including Wall Jacks)
    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px;">';
    
    // Total Devices
    html += '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#1d4ed8;">' + totalDevices + '</div>';
    html += '<div style="font-size:11px;color:#3b82f6;font-weight:600;">Total Devices</div>';
    html += '</div>';
    
    // Active Devices
    html += '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#166534;">' + (totalDevices - totalOff) + '</div>';
    html += '<div style="font-size:11px;color:#22c55e;font-weight:600;">Active</div>';
    html += '</div>';
    
    // Disabled Devices
    html += '<div style="background:linear-gradient(135deg,#fef2f2,#fecaca);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#dc2626;">' + totalOff + '</div>';
    html += '<div style="font-size:11px;color:#ef4444;font-weight:600;">Disabled</div>';
    html += '</div>';
    
    // Wall Jacks (dedicated card)
    html += '<div style="background:linear-gradient(135deg,#ecf0f1,#bdc3c7);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#2d3436;">' + wallJackCount + '</div>';
    html += '<div style="font-size:11px;color:#636e72;font-weight:600;">🔌 Wall Jacks</div>';
    html += '</div>';
    
    // Connections
    html += '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#b45309;">' + totalConnections + '</div>';
    html += '<div style="font-size:11px;color:#d97706;font-weight:600;">Connections</div>';
    html += '</div>';
    
    // Types in Use
    html += '<div style="background:linear-gradient(135deg,#f3e8ff,#e9d5ff);padding:16px;border-radius:12px;text-align:center;">';
    html += '<div style="font-size:28px;font-weight:700;color:#7c3aed;">' + usedTypes + '</div>';
    html += '<div style="font-size:11px;color:#8b5cf6;font-weight:600;">Types in Use</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Group types by category
    var categories = {
        '🔌 Network Infrastructure': ['router', 'switch', 'firewall', 'patch', 'hub', 'modem', 'backbone', 'walljack'],
        '📶 Wireless': ['wifi', 'router_wifi'],
        '🖥️ Servers & Storage': ['server', 'nas', 'cloud', 'dmz'],
        '💻 End Devices': ['pc', 'laptop', 'tablet', 'phone', 'ip_phone', 'printer', 'monitor'],
        '📹 Security & Monitoring': ['camera', 'time_clock'],
        '⚡ Power & ISP': ['ups', 'isp', 'others']
    };
    
    // Device Types Grid
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">';
    
    var categoryKeys = Object.keys(categories);
    for (var c = 0; c < categoryKeys.length; c++) {
        var category = categoryKeys[c];
        var types = categories[category];
        
        // Check if any type in this category exists
        var hasTypes = false;
        var categoryDeviceCount = 0;
        for (var i = 0; i < types.length; i++) {
            if (allTypes.indexOf(types[i]) >= 0) {
                hasTypes = true;
                var tc = (types[i] === 'walljack') ? wallJackCount : (typeCounts[types[i]] || 0);
                categoryDeviceCount += tc;
            }
        }
        if (!hasTypes) continue;
        
        html += '<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">';
        html += '<h3 style="font-weight:600;color:#334155;font-size:13px;">' + category + '</h3>';
        if (categoryDeviceCount > 0) {
            html += '<span style="background:#3b82f6;color:white;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">' + categoryDeviceCount + '</span>';
        }
        html += '</div>';
        html += '<div style="display:grid;gap:6px;">';
        
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            if (allTypes.indexOf(type) < 0) continue;
            
            var info = { label: type };
            try {
                info = SVGTopology.getTypeInfo(type);
            } catch(e) {}
            
            var icon = '';
            try {
                icon = SVGTopology.getMiniIcon(type, 36);
            } catch(e) {
                icon = '<span style="font-size:24px;">📦</span>';
            }
            
            // Get count - special handling for walljack
            var count = (type === 'walljack') ? wallJackCount : (typeCounts[type] || 0);
            var offCount = (type === 'walljack') ? 0 : (typeOffCounts[type] || 0);
            
            html += '<div style="display:flex;align-items:center;gap:10px;background:white;border-radius:8px;padding:8px 12px;border:1px solid #e2e8f0;">';
            html += '<div style="flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">' + icon + '</div>';
            html += '<div style="flex-grow:1;font-size:13px;font-weight:500;color:#475569;">' + (info.label || type) + '</div>';
            
            // Show count badges
            if (count > 0) {
                html += '<div style="display:flex;gap:4px;">';
                if (offCount > 0) {
                    var activeCount = count - offCount;
                    if (activeCount > 0) {
                        html += '<span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;">' + activeCount + '</span>';
                    }
                    html += '<span style="background:#fecaca;color:#dc2626;font-size:10px;font-weight:600;padding:3px 6px;border-radius:6px;">' + offCount + ' off</span>';
                } else {
                    html += '<span style="background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;">' + count + '</span>';
                }
                html += '</div>';
            } else {
                html += '<span style="color:#94a3b8;font-size:11px;">—</span>';
            }
            html += '</div>';
        }
        
        html += '</div></div>';
    }
    
    html += '</div>';
    
    // Locations summary (if multiple locations)
    var locationKeys = Object.keys(locationCounts);
    if (locationKeys.length > 1) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;">';
        html += '<h3 style="font-weight:600;color:#334155;font-size:14px;margin-bottom:12px;">📍 Devices by Location</h3>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        locationKeys.sort().forEach(function(loc) {
            html += '<span style="background:#f1f5f9;color:#475569;font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid #e2e8f0;">';
            html += '<strong>' + loc + '</strong>: ' + locationCounts[loc];
            html += '</span>';
        });
        html += '</div></div>';
    }
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeLegendModal(event) {
    var modal = document.getElementById('legendModal');
    if (!event || event.target === modal) {
        modal.classList.add('hidden');
    }
}

// Global helper functions for topology filtering
// Uses centralized standardDeviceSort from app.js for consistent ordering
function getTopologyFilteredDevices() {
    var topologyFilter = document.getElementById('topologyLocationFilter');
    var location = topologyFilter ? topologyFilter.value : '';
    
    var devices = appState.devices || [];
    
    if (location) {
        devices = devices.filter(function(d) {
            return d.location === location;
        });
    }
    
    // Sort using centralized function for consistent order (rackId + order)
    return devices.slice().sort(standardDeviceSort);
}

function getTopologyFilteredConnections() {
    var devices = getTopologyFilteredDevices();
    var deviceIds = {};
    devices.forEach(function(d) { deviceIds[d.id] = true; });
    
    return (appState.connections || []).filter(function(c) {
        return deviceIds[c.from] || deviceIds[c.to];
    });
}

// ============================================================================
// DRAW.IO NETWORK MAP EXPORT
// ============================================================================
var DrawioExport = (function() {
    
    /**
     * Export to Draw.io XML format with professional Cisco network icons
     */
    function exportDrawio() {
        var devices = getTopologyFilteredDevices();
        var connections = getTopologyFilteredConnections();
        
        if (devices.length === 0) {
            Toast.warning('No devices to export');
            return;
        }
        
        // Calculate positions in a grid layout
        var cols = Math.ceil(Math.sqrt(devices.length));
        var cellWidth = 250;  // Increased for Cisco icons
        var cellHeight = 200; // Increased for labels below
        var startX = 100;
        var startY = 100;
        
        var devicePositions = {};
        
        // Build cells XML
        var cellsXml = '';
        var cellId = 2; // 0 and 1 are reserved
        
        // Add devices as shapes with Cisco-style icons
        devices.forEach(function(d, idx) {
            var col = idx % cols;
            var row = Math.floor(idx / cols);
            var x = startX + col * cellWidth;
            var y = startY + row * cellHeight;
            
            devicePositions[d.id] = { x: x + 50, y: y + 40, id: cellId };
            
            // Get shape style based on device type
            var style = getDrawioStyle(d.type);
            var width = 100;  // Cisco icons need more space
            var height = 80;
            
            // Get IP addresses
            var ips = '';
            if (d.addresses && d.addresses.length > 0) {
                ips = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean).join('\\n');
            } else if (d.ip1 || d.ip2 || d.ip3 || d.ip4) {
                ips = [d.ip1, d.ip2, d.ip3, d.ip4].filter(Boolean).join('\\n');
            }
            
            var label = d.name + (ips ? '\\n' + ips : '');
            
            cellsXml += '<mxCell id="' + cellId + '" value="' + escapeXml(label) + '" ' +
                'style="' + style + '" vertex="1" parent="1">' +
                '<mxGeometry x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" as="geometry"/>' +
                '</mxCell>';
            
            // Add location label below device
            if (d.location) {
                cellId++;
                cellsXml += '<mxCell id="' + cellId + '" value="📍 ' + escapeXml(d.location) + '" ' +
                    'style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=top;fontSize=10;fontColor=#6b7280;" vertex="1" parent="1">' +
                    '<mxGeometry x="' + (x - 10) + '" y="' + (y + height + 5) + '" width="100" height="20" as="geometry"/>' +
                    '</mxCell>';
            }
            
            cellId++;
        });
        
        // Add connections as edges
        connections.forEach(function(c) {
            if (c.from && c.to && devicePositions[c.from] && devicePositions[c.to]) {
                var sourceId = devicePositions[c.from].id;
                var targetId = devicePositions[c.to].id;
                var color = config.connColors[c.type] || '#6b7280';
                var label = c.cableMarker || '';
                
                var edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;' +
                    'strokeColor=' + color + ';strokeWidth=2;';
                
                if (c.status === 'disabled') {
                    edgeStyle += 'dashed=1;';
                }
                
                cellsXml += '<mxCell id="' + cellId + '" value="' + escapeXml(label) + '" ' +
                    'style="' + edgeStyle + '" edge="1" parent="1" source="' + sourceId + '" target="' + targetId + '">' +
                    '<mxGeometry relative="1" as="geometry"/>' +
                    '</mxCell>';
                cellId++;
            }
        });
        
        // Build complete Draw.io XML
        var xml = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<mxfile host="app.diagrams.net" modified="' + new Date().toISOString() + '" ' +
            'agent="TIESSE Matrix Network" version="1.0" type="device">' +
            '<diagram name="Network Topology" id="network-topology">' +
            '<mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">' +
            '<root>' +
            '<mxCell id="0"/>' +
            '<mxCell id="1" parent="0"/>' +
            cellsXml +
            '</root>' +
            '</mxGraphModel>' +
            '</diagram>' +
            '</mxfile>';
        
        // Download the file
        var blob = new Blob([xml], { type: 'application/xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Tiesse-Matrix-Topology_' + new Date().toISOString().split('T')[0] + '.drawio';
        a.click();
        URL.revokeObjectURL(url);
        
        Toast.success('Exported to Draw.io! Open at diagrams.net');
    }
    
    function getDrawioStyle(type) {
        // Using mxGraph network shapes that provide better visual representation
        // These shapes are native to Draw.io and look more like network equipment
        var styles = {
            // Network Infrastructure
            router: 'shape=mxgraph.cisco.routers.router;html=1;pointerEvents=1;dashed=0;fillColor=#036897;strokeColor=#001933;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            switch: 'shape=mxgraph.cisco.switches.workgroup_switch;html=1;pointerEvents=1;dashed=0;fillColor=#29A352;strokeColor=#0D5E1C;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            patch: 'shape=mxgraph.rack.cisco.cisco_patch_panel_-_24_port;html=1;pointerEvents=1;dashed=0;fillColor=#EAB308;strokeColor=#9A6700;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            firewall: 'shape=mxgraph.cisco.security.firewall;html=1;pointerEvents=1;dashed=0;fillColor=#EF4444;strokeColor=#990000;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            hub: 'shape=mxgraph.cisco.hubs_and_gateways.hub;html=1;pointerEvents=1;dashed=0;fillColor=#7f8c8d;strokeColor=#34495e;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            modem: 'shape=mxgraph.cisco.modems_and_phones.modem;html=1;pointerEvents=1;dashed=0;fillColor=#14b8a6;strokeColor=#0d9488;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            backbone: 'shape=mxgraph.cisco.routers.router_with_firewall;html=1;pointerEvents=1;dashed=0;fillColor=#00b894;strokeColor=#007766;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Servers & Storage  
            server: 'shape=mxgraph.cisco.servers.standard_host;html=1;pointerEvents=1;dashed=0;fillColor=#8B5CF6;strokeColor=#5A287D;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            nas: 'shape=mxgraph.cisco.storage.storage_server;html=1;pointerEvents=1;dashed=0;fillColor=#6366f1;strokeColor=#3730a3;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            storage: 'shape=mxgraph.cisco.storage.storage_server;html=1;pointerEvents=1;dashed=0;fillColor=#10b981;strokeColor=#047857;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            cloud: 'shape=mxgraph.cisco.wan.cloud;html=1;pointerEvents=1;dashed=0;fillColor=#a78bfa;strokeColor=#7c3aed;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Wireless
            wifi: 'shape=mxgraph.cisco.wireless.wireless_access_point;html=1;pointerEvents=1;dashed=0;fillColor=#06B6D4;strokeColor=#0077B3;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            router_wifi: 'shape=mxgraph.cisco.wireless.wireless_router;html=1;pointerEvents=1;dashed=0;fillColor=#0EA5E9;strokeColor=#0066AA;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // WAN/External
            isp: 'shape=mxgraph.cisco.wan.cloud;html=1;pointerEvents=1;dashed=0;fillColor=#F97316;strokeColor=#C75000;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // End Devices
            pc: 'shape=mxgraph.cisco.computers_and_peripherals.pc;html=1;pointerEvents=1;dashed=0;fillColor=#6c5ce7;strokeColor=#4c3d9e;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            laptop: 'shape=mxgraph.cisco.computers_and_peripherals.laptop;html=1;pointerEvents=1;dashed=0;fillColor=#2d3436;strokeColor=#000000;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            printer: 'shape=mxgraph.cisco.computers_and_peripherals.printer;html=1;pointerEvents=1;dashed=0;fillColor=#a0aec0;strokeColor=#718096;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            phone: 'shape=mxgraph.cisco.modems_and_phones.phone;html=1;pointerEvents=1;dashed=0;fillColor=#f472b6;strokeColor=#be185d;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            ip_phone: 'shape=mxgraph.cisco.modems_and_phones.ip_phone;html=1;pointerEvents=1;dashed=0;fillColor=#a855f7;strokeColor=#7e22ce;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            tablet: 'shape=mxgraph.cisco.computers_and_peripherals.tablet;html=1;pointerEvents=1;dashed=0;fillColor=#ec4899;strokeColor=#db2777;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Monitoring & Security
            camera: 'shape=mxgraph.cisco.security.video_surveillance_camera;html=1;pointerEvents=1;dashed=0;fillColor=#f59e0b;strokeColor=#b45309;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            time_clock: 'shape=mxgraph.cisco.misc.access_point;html=1;pointerEvents=1;dashed=0;fillColor=#fb7185;strokeColor=#e11d48;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Power & Infrastructure
            ups: 'shape=mxgraph.cisco.misc.ups;html=1;pointerEvents=1;dashed=0;fillColor=#fbbf24;strokeColor=#d97706;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            walljack: 'shape=mxgraph.cisco.misc.connector;html=1;pointerEvents=1;dashed=0;fillColor=#94a3b8;strokeColor=#64748b;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Displays
            monitor: 'shape=mxgraph.cisco.computers_and_peripherals.monitor;html=1;pointerEvents=1;dashed=0;fillColor=#0ea5e9;strokeColor=#0284c7;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            tv: 'shape=mxgraph.cisco.computers_and_peripherals.monitor;html=1;pointerEvents=1;dashed=0;fillColor=#0ea5e9;strokeColor=#0284c7;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // DMZ (special)
            dmz: 'shape=mxgraph.cisco.security.network_security;html=1;pointerEvents=1;dashed=0;fillColor=#e74c3c;strokeColor=#c0392b;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;',
            
            // Default
            others: 'shape=mxgraph.cisco.misc.generic_device;html=1;pointerEvents=1;dashed=0;fillColor=#64748B;strokeColor=#334155;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;'
        };
        return styles[type] || styles.others;
    }
    
    function escapeXml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    
    return {
        export: exportDrawio
    };
})();

// Global function for HTML
function exportTopologyDrawio() { DrawioExport.export(); }

// ============================================================================
// DEVICE LINKS MANAGEMENT
// ============================================================================
var DeviceLinks = (function() {
    var linkTypes = [
        { value: 'https', label: 'HTTPS/Web', icon: '🌐' },
        { value: 'http', label: 'HTTP', icon: '🔗' },
        { value: 'ssh', label: 'SSH', icon: '💻' },
        { value: 'telnet', label: 'Telnet', icon: '📟' },
        { value: 'rdp', label: 'RDP', icon: '🖥️' },
        { value: 'vnc', label: 'VNC', icon: '📺' },
        { value: 'smb', label: 'SMB/Network Share', icon: '📁' },
        { value: 'nfs', label: 'NFS', icon: '📂' },
        { value: 'ftp', label: 'FTP/SFTP', icon: '📤' },
        { value: 'other', label: 'Other', icon: '🔗' }
    ];
    
    function addField(containerId) {
        var container = document.getElementById(containerId || 'deviceLinksContainer');
        if (!container) return;
        
        var idx = container.children.length;
        var div = document.createElement('div');
        div.className = 'flex gap-1 items-center';
        div.innerHTML = 
            '<select class="link-type w-24 px-1 py-1 border border-slate-300 rounded text-xs">' +
            linkTypes.map(function(t) {
                return '<option value="' + t.value + '">' + t.icon + ' ' + t.label + '</option>';
            }).join('') +
            '</select>' +
            '<input type="text" class="link-url flex-1 px-2 py-1 border border-slate-300 rounded text-xs" placeholder="URL or address">' +
            '<input type="text" class="link-label w-20 px-2 py-1 border border-slate-300 rounded text-xs" placeholder="Gestione" title="Gestione web, access SSH">' +
            '<button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 px-1">✕</button>';
        
        container.appendChild(div);
    }
    
    function getLinks(containerId) {
        var container = document.getElementById(containerId || 'deviceLinksContainer');
        if (!container) return [];
        
        var links = [];
        var rows = container.querySelectorAll('div');
        rows.forEach(function(row) {
            var type = row.querySelector('.link-type')?.value;
            var url = row.querySelector('.link-url')?.value?.trim();
            var label = row.querySelector('.link-label')?.value?.trim();
            
            if (url) {
                links.push({ type: type, url: url, label: label || '' });
            }
        });
        
        return links;
    }
    
    function setLinks(containerId, links) {
        var container = document.getElementById(containerId || 'deviceLinksContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!links || !links.length) return;
        
        links.forEach(function(link) {
            addField(containerId);
            var rows = container.querySelectorAll('div');
            var lastRow = rows[rows.length - 1];
            if (lastRow) {
                var typeSelect = lastRow.querySelector('.link-type');
                var urlInput = lastRow.querySelector('.link-url');
                var labelInput = lastRow.querySelector('.link-label');
                
                if (typeSelect) typeSelect.value = link.type || 'https';
                if (urlInput) urlInput.value = link.url || '';
                if (labelInput) labelInput.value = link.label || '';
            }
        });
    }
    
    function renderLinks(links) {
        if (!links || !links.length) return '';
        
        return links.map(function(link, idx) {
            var typeInfo = linkTypes.find(function(t) { return t.value === link.type; }) || linkTypes[linkTypes.length - 1];
            // If no label, use "Gestione" as default
            var displayLabel = link.label || 'Gestione';
            var safeUrl = escapeHtml(link.url);
            var safeLabel = escapeHtml(displayLabel);
            
            // Protocolos que abrem direto no navegador (HTTP, HTTPS, FTP)
            if (link.url.match(/^(https?|ftp):\/\//i) || link.url.match(/^\\\\/) || link.url.match(/^\//)) {
                return '<a href="' + safeUrl + '" target="_blank" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline" title="' + safeUrl + '">' +
                    typeInfo.icon + ' ' + safeLabel + '</a>';
            }
            
            // Protocolos especiais (SSH, RDP, VNC, Telnet) - tenta abrir nativo, fallback copia
            if (link.url.match(/^(ssh|rdp|vnc|smb|nfs|telnet):\/\//i) || link.type === 'ssh' || link.type === 'rdp' || link.type === 'vnc' || link.type === 'smb' || link.type === 'telnet' || link.type === 'nfs') {
                var protocolUrl = buildProtocolUrl(link.type, link.url);
                return '<a href="javascript:void(0)" data-protocol-url="' + escapeHtml(protocolUrl) + '" data-copy-url="' + safeUrl + '" onclick="openProtocolLink(this)" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" title="🔗 Click to open: ' + safeUrl + '">' +
                    typeInfo.icon + ' ' + safeLabel + '</a>';
            }
            
            return '<span class="inline-flex items-center gap-1 text-xs text-slate-600" title="' + safeUrl + '">' +
                typeInfo.icon + ' ' + safeLabel + '</span>';
        }).join(' ');
    }
    
    // Constrói URL com protocolo correto para abrir no sistema
    function buildProtocolUrl(type, url) {
        // Se já tem protocolo, retorna como está
        if (url.match(/^[a-z]+:\/\//i)) return url;
        
        // Adiciona protocolo baseado no tipo
        switch(type) {
            case 'ssh':
                // ssh://user@host ou ssh://host
                return 'ssh://' + url;
            case 'rdp':
                // Windows Remote Desktop - formato correto
                // Formato: rdp://full%20address=s:hostname:port
                var host = url.replace(/^rdp:\/\//i, '');
                return 'rdp://full%20address=s:' + encodeURIComponent(host);
            case 'vnc':
                return 'vnc://' + url;
            case 'telnet':
                return 'telnet://' + url;
            case 'smb':
                return 'smb://' + url;
            case 'nfs':
                return 'nfs://' + url;
            default:
                return url;
        }
    }
    
    function copyLinkUrl(element) {
        var url = element.getAttribute('data-copy-url');
        if (url && typeof copyToClipboard === 'function') {
            copyToClipboard(url);
        } else if (url) {
            // Fallback se copyToClipboard não existir
            try {
                navigator.clipboard.writeText(url).then(function() {
                    if (typeof Toast !== 'undefined') Toast.success('📋 Copied: ' + url);
                }).catch(function() {
                    fallbackCopy(url);
                });
            } catch(e) {
                fallbackCopy(url);
            }
        }
    }
    
    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            if (typeof Toast !== 'undefined') Toast.success('📋 Copied: ' + text);
        } catch (e) {
            if (typeof Toast !== 'undefined') Toast.error('Failed to copy');
            prompt('Copy this URL:', text);
        }
        document.body.removeChild(textarea);
    }
    
    // Use global escapeHtml function from app.js
    
    return {
        addField: addField,
        getLinks: getLinks,
        setLinks: setLinks,
        renderLinks: renderLinks,
        copyLinkUrl: copyLinkUrl,
        types: linkTypes
    };
})();

// Global function for HTML
function addLinkField() { DeviceLinks.addField('deviceLinksContainer'); }

// ============================================================================
// FILTERED PRINTING
// ============================================================================
function printFiltered() {
    var location = document.getElementById('locationFilter')?.value;
    var activeTab = document.querySelector('.tab-btn.active')?.id?.replace('tab-', '');
    
    var title = 'TIESSE Matrix Network';
    if (location) {
        title += ' - ' + location;
    }
    
    var content = '';
    
    if (activeTab === 'devices') {
        content = generateDevicesPrintContent(location);
    } else if (activeTab === 'active') {
        content = generateConnectionsPrintContent(location);
    } else if (activeTab === 'matrix') {
        // Use existing matrix print
        if (typeof printMatrix === 'function') {
            printMatrix();
            return;
        }
    } else {
        Toast.warning('Select Devices or Connections tab to print');
        return;
    }
    
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<!DOCTYPE html><html><head><title>' + title + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }');
    printWindow.document.write('h1 { font-size: 18px; margin-bottom: 5px; }');
    printWindow.document.write('h2 { font-size: 14px; color: #666; margin-bottom: 15px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 10px; }');
    printWindow.document.write('th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }');
    printWindow.document.write('th { background: #f0f0f0; font-weight: bold; }');
    printWindow.document.write('.disabled { color: #999; }');
    printWindow.document.write('@media print { body { margin: 0; } }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h1>' + title + '</h1>');
    printWindow.document.write('<h2>Generated: ' + new Date().toLocaleString() + '</h2>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function generateDevicesPrintContent(location) {
    var devices = location 
        ? appState.devices.filter(function(d) { return d.location === location; })
        : appState.devices;
    
    if (devices.length === 0) {
        return '<p>No devices found.</p>';
    }
    
    var html = '<table>';
    html += '<tr><th>Location</th><th>Rack</th><th>Pos</th><th>Device Name</th><th>Type</th><th>Brand/Model</th><th>IPs</th><th>Status</th></tr>';
    
    devices.forEach(function(d) {
        // Support both addresses[] array (new) and ip1-4 fields (legacy)
        var ips;
        if (d.addresses && d.addresses.length > 0) {
            ips = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean).join(', ') || '-';
        } else {
            ips = [d.ip1, d.ip2, d.ip3, d.ip4].filter(Boolean).join(', ') || '-';
        }
        var statusClass = d.status === 'disabled' ? ' class="disabled"' : '';
        
        html += '<tr' + statusClass + '>';
        html += '<td>' + (d.location || '-') + '</td>';
        html += '<td>' + (d.rackId || d.rack || '-') + '</td>';
        html += '<td>' + (d.order || 0) + ((d.isRear || d.rear) ? ' ↩' : '') + '</td>';
        html += '<td>' + (d.name || '-') + '</td>';
        html += '<td>' + (d.type || '-') + '</td>';
        html += '<td>' + (d.brandModel || '-') + '</td>';
        html += '<td style="font-family:monospace;font-size:10px;">' + ips + '</td>';
        html += '<td>' + (d.status || 'active') + '</td>';
        html += '</tr>';
    });
    
    html += '</table>';
    html += '<p style="margin-top:15px;color:#64748b;">Total: ' + devices.length + ' devices</p>';
    
    return html;
}

function generateConnectionsPrintContent(location) {
    var connections = location
        ? LocationFilter.getFilteredConnections()
        : appState.connections;
    
    if (connections.length === 0) {
        return '<p>No connections found.</p>';
    }
    
    var html = '<table>';
    html += '<tr><th>Cable ID</th><th>From Device</th><th>Port</th><th>To Device</th><th>Port</th><th>Type</th><th>Status</th></tr>';
    
    connections.forEach(function(c) {
        var fromDev = appState.devices.find(function(d) { return d.id === c.from; });
        var toDev = appState.devices.find(function(d) { return d.id === c.to; });
        var statusClass = c.status === 'disabled' ? ' class="disabled"' : '';
        
        html += '<tr' + statusClass + '>';
        html += '<td>' + (c.cableMarker || '-') + '</td>';
        html += '<td>' + (fromDev ? fromDev.name : 'Unknown') + '</td>';
        html += '<td>' + (c.fromPort || '-') + '</td>';
        html += '<td>' + (toDev ? toDev.name : c.externalDest || 'Unknown') + '</td>';
        html += '<td>' + (c.toPort || '-') + '</td>';
        html += '<td>' + (c.type || '-') + '</td>';
        html += '<td>' + (c.status || 'active') + '</td>';
        html += '</tr>';
    });
    
    html += '</table>';
    html += '<p style="margin-top:15px;color:#64748b;">Total: ' + connections.length + ' connections</p>';
    
    return html;
}

// ============================================================================
// INITIALIZATION
// ============================================================================
(function() {
    // Initialize on DOM ready
    function initExtendedFeatures() {
        ActivityLog.init();
        LocationFilter.init();
        SVGTopology.init();
        
        // Hook into tab switching to render topology when needed
        var origSwitchTab = window.switchTab;
        if (origSwitchTab) {
            window.switchTab = function(tabId) {
                origSwitchTab(tabId);
                if (tabId === 'drawio') {
                    setTimeout(function() {
                        SVGTopology.render();
                    }, 100);
                }
                if (tabId === 'logs') {
                    ActivityLog.render();
                }
            };
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtendedFeatures);
    } else {
        // Small delay to ensure app.js is loaded
        setTimeout(initExtendedFeatures, 100);
    }
})();

// =============================================================================
// PROTOCOL LINK HANDLERS - SSH, RDP, VNC, Telnet, SMB, NFS
// =============================================================================

/**
 * Copia texto para clipboard com feedback visual
 * @param {string} text - Texto a copiar
 * @param {boolean} showToast - Se deve mostrar Toast de confirmação
 * @returns {Promise<boolean>} - Se copiou com sucesso
 */
function copyTextToClipboard(text, showToast) {
    if (showToast === undefined) showToast = true;
    
    return new Promise(function(resolve) {
        // Método 1: Clipboard API (moderno)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('📋 Copied: ' + text);
                }
                resolve(true);
            }).catch(function() {
                // Fallback se Clipboard API falhar
                resolve(fallbackCopyText(text, showToast));
            });
        } else {
            // Método 2: Fallback para browsers antigos
            resolve(fallbackCopyText(text, showToast));
        }
    });
}

/**
 * Fallback para copiar texto (browsers antigos ou contexto inseguro)
 */
function fallbackCopyText(text, showToast) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    var success = false;
    try {
        success = document.execCommand('copy');
        if (success && showToast && typeof Toast !== 'undefined') {
            Toast.success('📋 Copied: ' + text);
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textarea);
    
    if (!success) {
        // Último recurso: prompt para copiar manualmente
        prompt('Copy this address manually:', text);
    }
    
    return success;
}

/**
 * Copia URL do link para clipboard (chamado via onclick)
 */
function copyLinkToClipboard(element) {
    var url = element.getAttribute('data-copy-url');
    if (url) {
        copyTextToClipboard(url, true);
    }
}

// Alias para compatibilidade
function fallbackCopyToClipboard(text) {
    return fallbackCopyText(text, true);
}

/**
 * Handler principal para links de protocolo (SSH, RDP, VNC, etc.)
 * Estratégia: SEMPRE copia primeiro, depois tenta abrir como bônus
 */
function openProtocolLink(element) {
    var protocolUrl = element.getAttribute('data-protocol-url');
    var copyUrl = element.getAttribute('data-copy-url');
    var linkType = detectLinkType(protocolUrl);
    
    if (!copyUrl) return;
    
    // PASSO 1: SEMPRE copiar primeiro (garantido)
    copyTextToClipboard(copyUrl, false).then(function(copied) {
        
        // PASSO 2: Tratamento específico por protocolo
        if (linkType === 'rdp') {
            // RDP: Oferece download de arquivo .rdp
            handleRdpLink(copyUrl, copied);
        } else if (linkType === 'ssh') {
            // SSH: Tenta abrir protocolo + copia
            handleSshLink(protocolUrl, copyUrl, copied);
        } else if (linkType === 'vnc') {
            // VNC: Tenta abrir protocolo
            handleVncLink(protocolUrl, copyUrl, copied);
        } else if (linkType === 'telnet') {
            // Telnet: Tenta abrir protocolo
            handleTelnetLink(protocolUrl, copyUrl, copied);
        } else {
            // Outros protocolos: tenta abrir
            handleGenericProtocol(protocolUrl, copyUrl, copied);
        }
    }).catch(function(error) {
        // Se clipboard falhar, ainda tenta abrir o protocolo
        if (linkType === 'rdp') {
            handleRdpLink(copyUrl, false);
        } else if (linkType === 'ssh') {
            handleSshLink(protocolUrl, copyUrl, false);
        } else if (linkType === 'vnc') {
            handleVncLink(protocolUrl, copyUrl, false);
        } else if (linkType === 'telnet') {
            handleTelnetLink(protocolUrl, copyUrl, false);
        } else {
            handleGenericProtocol(protocolUrl, copyUrl, false);
        }
    });
}

/**
 * Detecta tipo de link pelo protocolUrl
 */
function detectLinkType(url) {
    if (!url) return 'unknown';
    if (url.indexOf('rdp://') === 0 || url.indexOf('rdp:') === 0) return 'rdp';
    if (url.indexOf('ssh://') === 0 || url.indexOf('ssh:') === 0) return 'ssh';
    if (url.indexOf('vnc://') === 0 || url.indexOf('vnc:') === 0) return 'vnc';
    if (url.indexOf('telnet://') === 0 || url.indexOf('telnet:') === 0) return 'telnet';
    if (url.indexOf('smb://') === 0) return 'smb';
    if (url.indexOf('nfs://') === 0) return 'nfs';
    return 'unknown';
}

/**
 * Handler para RDP - oferece download de arquivo .rdp
 */
function handleRdpLink(address, copied) {
    var host = address;
    var port = 3389;
    
    // Extrai porta se especificada (formato host:porta)
    if (address.indexOf(':') !== -1) {
        var parts = address.split(':');
        host = parts[0];
        port = parseInt(parts[1]) || 3389;
    }
    
    // Conteúdo do arquivo .rdp
    var rdpContent = [
        'full address:s:' + host + ':' + port,
        'prompt for credentials:i:1',
        'administrative session:i:0',
        'screen mode id:i:2',
        'use multimon:i:0',
        'desktopwidth:i:1920',
        'desktopheight:i:1080',
        'session bpp:i:32',
        'compression:i:1',
        'keyboardhook:i:2',
        'audiocapturemode:i:0',
        'videoplaybackmode:i:1',
        'connection type:i:7',
        'networkautodetect:i:1',
        'bandwidthautodetect:i:1',
        'enableworkspacereconnect:i:0',
        'disable wallpaper:i:0',
        'allow font smoothing:i:1',
        'allow desktop composition:i:1',
        'redirectprinters:i:0',
        'redirectcomports:i:0',
        'redirectsmartcards:i:0',
        'redirectclipboard:i:1',
        'redirectposdevices:i:0',
        'autoreconnection enabled:i:1',
        'authentication level:i:2'
    ].join('\r\n');
    
    // Cria e baixa o arquivo
    var blob = new Blob([rdpContent], { type: 'application/x-rdp' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = host.replace(/[^a-zA-Z0-9.-]/g, '_') + '.rdp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof Toast !== 'undefined') {
        Toast.success('📥 RDP file downloaded!\n📋 Address copied: ' + address, 5000);
    }
}

/**
 * Handler para SSH - tenta abrir protocolo nativo + copia
 */
function handleSshLink(protocolUrl, address, copied) {
    try {
        // Tenta abrir via protocolo ssh://
        tryOpenProtocol(protocolUrl);
        
        if (typeof Toast !== 'undefined') {
            var msg = '🚀 Opening SSH: ' + address;
            msg += copied ? '\n📋 Address copied to clipboard' : '\n⚠️ Copy failed - address: ' + address;
            msg += '\n\nIf nothing opens, paste in your terminal';
            Toast.info(msg, 6000);
        }
    } catch (e) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('SSH: ' + address + '\n📋 ' + (copied ? 'Copied' : 'Copy failed') + '\n\nPaste in your terminal', 5000);
        }
    }
}

/**
 * Handler para VNC - tenta abrir protocolo nativo
 */
function handleVncLink(protocolUrl, address, copied) {
    try {
        // Tenta abrir via protocolo
        tryOpenProtocol(protocolUrl);
        
        if (typeof Toast !== 'undefined') {
            var msg = '🖥️ VNC: ' + address;
            msg += copied ? '\n📋 Address copied to clipboard' : '\n⚠️ Copy failed - address: ' + address;
            msg += '\n\nIf VNC viewer doesn\'t open, paste in your VNC client';
            Toast.info(msg, 6000);
        }
    } catch (e) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('VNC: ' + address + '\n📋 ' + (copied ? 'Copied' : 'Copy failed') + '\n\nPaste in your VNC client', 5000);
        }
    }
}

/**
 * Handler para Telnet - tenta abrir protocolo nativo + copia
 */
function handleTelnetLink(protocolUrl, address, copied) {
    try {
        // Tenta abrir via protocolo telnet://
        tryOpenProtocol(protocolUrl);
        
        if (typeof Toast !== 'undefined') {
            var msg = '📟 Opening Telnet: ' + address;
            msg += copied ? '\n📋 Address copied to clipboard' : '\n⚠️ Copy failed - address: ' + address;
            msg += '\n\nIf nothing opens, paste in your terminal';
            Toast.info(msg, 6000);
        }
    } catch (e) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Telnet: ' + address + '\n📋 ' + (copied ? 'Copied' : 'Copy failed') + '\n\nPaste in your terminal', 5000);
        }
    }
}

/**
 * Handler genérico para outros protocolos (SMB, NFS, etc.)
 */
function handleGenericProtocol(protocolUrl, address, copied) {
    tryOpenProtocol(protocolUrl);
    
    if (typeof Toast !== 'undefined') {
        Toast.info('📋 Address copied: ' + address + '\n\nTrying to open protocol handler...', 4000);
    }
}

/**
 * Tenta abrir protocolo usando iframe hidden
 * Não garante sucesso, mas é a melhor abordagem cross-browser
 */
function tryOpenProtocol(url) {
    try {
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'display:none;width:0;height:0;border:none;';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        // Remove após 3 segundos
        setTimeout(function() {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }, 3000);
        
        return true;
    } catch (e) {
        // Silent fail - protocol handlers are best-effort
        return false;
    }
}