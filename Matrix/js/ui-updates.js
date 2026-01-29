/**
 * TIESSE Matrix Network - UI Update Functions
 * Version: 3.1.5
 * 
 * Contains UI rendering functions:
 * - Device list (cards and table views)
 * - Connection matrix
 * - Connections table
 * - Excel export
 * - Improved print styles
 * - Device and Connection filters
 * - XSS protection with escapeHtml (v3.1.3)
 * - Debounced filter inputs (v3.1.3)
 */

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
// DEVICES LIST UPDATE (Cards and Table Views)
// ============================================================================
function updateDevicesList() {
    var cont = document.getElementById('devicesListContainer');
    if (!cont) return;
    
    // Update filter bar (full rebuild)
    updateDeviceFilterBar();
    
    if (appState.devices.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices added yet</p>';
        return;
    }

    if (appState.deviceView === 'table') {
        updateDevicesListTable(cont);
    } else {
        updateDevicesListCards(cont);
    }
}

/**
 * Update only the devices list content (not the filter bar)
 * Used when filtering to keep input focus
 */
function updateDevicesListOnly() {
    var cont = document.getElementById('devicesListContainer');
    if (!cont) return;
    
    if (appState.devices.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices added yet</p>';
        return;
    }

    if (appState.deviceView === 'table') {
        updateDevicesListTable(cont);
    } else {
        updateDevicesListCards(cont);
    }
}

/**
 * Render the filter bar for devices
 */
function updateDeviceFilterBar() {
    var filterBar = document.getElementById('deviceFilterBar');
    if (!filterBar) return;
    
    // Get unique locations, sources and types for dropdowns
    var locations = [];
    var sources = [];
    var types = [];
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        if (d.location && locations.indexOf(d.location) === -1) locations.push(d.location);
        if (d.rackId && sources.indexOf(d.rackId) === -1) sources.push(d.rackId);
        if (d.type && types.indexOf(d.type) === -1) types.push(d.type);
    }
    locations.sort();
    sources.sort();
    types.sort();
    
    // Calculate filtered count
    var filteredDevices = typeof getFilteredDevices === 'function' ? getFilteredDevices() : appState.devices;
    var totalDevices = appState.devices.length;
    var filteredCount = filteredDevices.length;
    var hasActiveFilters = appState.deviceFilters.location || appState.deviceFilters.source || appState.deviceFilters.name || 
                           appState.deviceFilters.type || appState.deviceFilters.status || 
                           appState.deviceFilters.hasConnections;
    
    var html = '<div class="flex flex-wrap items-center gap-2 p-3 bg-slate-100 rounded-lg mb-3">';
    html += '<span class="text-xs font-semibold text-slate-600">🔍 Filters:</span>';
    
    // Location filter (first, with purple styling)
    html += '<select id="filterDeviceLocation" onchange="updateDeviceFilter(\'location\', this.value)" class="px-2 py-1 text-xs border-2 border-purple-400 rounded-lg bg-white font-semibold">';
    html += '<option value="">📍 All Locations</option>';
    for (var l = 0; l < locations.length; l++) {
        var selectedL = appState.deviceFilters.location === locations[l] ? ' selected' : '';
        html += '<option value="' + locations[l] + '"' + selectedL + '>' + locations[l] + '</option>';
    }
    html += '</select>';
    
    // Group filter (campo rackId - vedi nota in index.html)
    html += '<select id="filterDeviceSource" onchange="updateDeviceFilter(\'source\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Groups</option>';
    for (var s = 0; s < sources.length; s++) {
        var selected = appState.deviceFilters.source === sources[s] ? ' selected' : '';
        html += '<option value="' + sources[s] + '"' + selected + '>' + sources[s] + '</option>';
    }
    html += '</select>';
    
    // Name search filter (simple text input)
    html += '<input type="text" id="filterDeviceName" placeholder="Search name..." value="' + (appState.deviceFilters.name || '') + '" oninput="updateDeviceFilter(\'name\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-28">';
    
    // Type filter
    html += '<select id="filterDeviceType" onchange="updateDeviceFilter(\'type\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Types</option>';
    for (var t = 0; t < types.length; t++) {
        var selectedT = appState.deviceFilters.type === types[t] ? ' selected' : '';
        html += '<option value="' + types[t] + '"' + selectedT + '>' + types[t].charAt(0).toUpperCase() + types[t].slice(1) + '</option>';
    }
    html += '</select>';
    
    // Status filter
    html += '<select id="filterDeviceStatus" onchange="updateDeviceFilter(\'status\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Status</option>';
    html += '<option value="active"' + (appState.deviceFilters.status === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="disabled"' + (appState.deviceFilters.status === 'disabled' ? ' selected' : '') + '>Disabled</option>';
    html += '</select>';
    
    // Connections filter
    html += '<select id="filterDeviceConnections" onchange="updateDeviceFilter(\'hasConnections\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">Connections</option>';
    html += '<option value="yes"' + (appState.deviceFilters.hasConnections === 'yes' ? ' selected' : '') + '>With conn.</option>';
    html += '<option value="no"' + (appState.deviceFilters.hasConnections === 'no' ? ' selected' : '') + '>No conn.</option>';
    html += '</select>';
    
    // Clear filters button (with ID for dynamic updates)
    html += '<button id="deviceFilterClearBtn" onclick="clearDeviceFilters()" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200" style="display:' + (hasActiveFilters ? 'inline-block' : 'none') + '">✕ Clear</button>';
    
    // Count display (with ID for dynamic updates)
    if (hasActiveFilters) {
        html += '<span id="deviceFilterCount" class="text-xs text-slate-500 ml-2">Showing ' + filteredCount + ' of ' + totalDevices + '</span>';
    } else {
        html += '<span id="deviceFilterCount" class="text-xs text-slate-500 ml-2">' + totalDevices + ' devices</span>';
    }
    
    // Legend
    html += '<span class="text-xs text-slate-500 ml-auto"><span class="text-red-500 font-bold">✗</span> disabled · <span class="text-amber-600 font-bold">↩</span> rear</span>';
    
    html += '</div>';
    filterBar.innerHTML = html;
}

function updateDevicesListCards(cont) {
    var sorted = typeof getFilteredDevices === 'function' ? getFilteredDevices() : getSorted();
    // Sort the filtered devices
    sorted = getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc, sorted);
    
    if (sorted.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices match the current filters</p>';
        return;
    }
    
    var html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">';
    
    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var usedPorts = 0;
        for (var j = 0; j < d.ports.length; j++) {
            if (isPortUsed(d.id, d.ports[j].name)) {
                usedPorts++;
            }
        }
        var disabled = d.status === 'disabled';
        var rackColor = getRackColor(d.rackId);
        var statusClass = disabled ? 'bg-red-500' : 'bg-green-500';
        var statusText = disabled ? 'OFF' : 'ON';
        var opacityClass = disabled ? 'opacity-50' : '';

        // Count total connections for this device
        var totalConnections = 0;
        for (var ci = 0; ci < appState.connections.length; ci++) {
            if (appState.connections[ci].from === d.id || appState.connections[ci].to === d.id) {
                totalConnections++;
            }
        }
        var noConnectionsClass = totalConnections === 0 ? 'border-orange-400 border-2 bg-orange-50' : 'bg-white';
        var noConnectionsWarning = totalConnections === 0 ? '<div class="text-xs mt-1 text-orange-600 font-semibold">⚠ No connections</div>' : '';

        var addressText = '';
        // Support both addresses[] array (new) and ip1-4 fields (legacy)
        var ipList = [];
        if (d.addresses && d.addresses.length > 0) {
            ipList = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean);
        } else {
            ipList = [d.ip1, d.ip2, d.ip3, d.ip4].filter(function(ip) { return ip && ip.trim(); });
        }
        if (ipList.length > 0) {
            addressText = '<div class="text-xs mt-1 text-slate-600">IP: <strong>' + ipList.join('</strong>, <strong>') + '</strong></div>';
        }
        
        var locationText = '';
        if (d.location) {
            locationText = '<div class="text-xs mt-1 text-purple-600">📍 ' + d.location + '</div>';
        }

        var brandModelText = '';
        if (d.brandModel) {
            brandModelText = '<div class="text-xs text-slate-500 truncate">' + d.brandModel + '</div>';
        }

        html += '<div class="border rounded-lg p-2 hover:shadow-md transition-shadow ' + opacityClass + ' ' + noConnectionsClass + '">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 mb-1 flex-wrap">' +
            '<span class="text-xs font-semibold px-1.5 py-0.5 rounded uppercase" style="background-color:' + rackColor + '20;color:' + rackColor + '">' + (d.rackId || '').toUpperCase() + '</span>' +
            '<span class="text-xs text-slate-500">Pos.</span>' +
            '<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' +
            ((d.isRear || d.rear) ? '<span class="text-[11px] font-bold text-amber-600" title="Rear/Back position">↩</span>' : '') +
            '<span class="text-xs px-1.5 py-0.5 rounded-full text-white ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="font-bold text-base text-slate-800 truncate">' + (disabled ? '<span class="text-red-500" title="Disabled">✗</span> ' : '') + d.name + '</div>' +
            brandModelText +
            '<div class="text-xs text-slate-400 uppercase">' + d.type + '</div>' +
            locationText +
            addressText +
            '<div class="text-xs mt-1 text-slate-500">' + d.ports.length + ' ports (' + usedPorts + ' used) | ' + totalConnections + ' conn.</div>' +
            noConnectionsWarning +
            '</div>' +
            '<div class="flex flex-col gap-1 ml-2 edit-mode-only">' +
            '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-500 hover:text-green-700 text-sm p-1" title="Add Connection">➕</button>' +
            '<button onclick="editDevice(' + d.id + ')" class="text-blue-500 hover:text-blue-700 text-sm p-1" title="Edit Device">✎</button>' +
            '<button onclick="removeDevice(' + d.id + ')" class="text-red-500 hover:text-red-700 text-sm p-1" title="Delete Device">✕</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';
    cont.innerHTML = html;
}

function updateDevicesListTable(cont) {
    var filteredDevices = typeof getFilteredDevices === 'function' ? getFilteredDevices() : appState.devices;
    var sorted = getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc, filteredDevices);
    
    if (sorted.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices match the current filters</p>';
        return;
    }
    
    var sortIcon = function(key) {
        if (appState.deviceSort.key === key) {
            return appState.deviceSort.asc ? ' ▲' : ' ▼';
        }
        return ' ↕';
    };

    var html = '<table class="w-full text-xs border-collapse">';
    html += '<thead><tr class="bg-slate-700 text-white">';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'location\')">📍 Location' + sortIcon('location') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'rack\')">Group' + sortIcon('rack') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'order\')">Pos.' + sortIcon('order') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'name\')">Device Name' + sortIcon('name') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'brandModel\')">Brand/Model' + sortIcon('brandModel') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'type\')">Type' + sortIcon('type') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'status\')">Status' + sortIcon('status') + '</th>';
    html += '<th class="p-2 text-left">IP/Network</th>';
    html += '<th class="p-2 text-left">Service</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'ports\')">Ports' + sortIcon('ports') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'connections\')">Conn.' + sortIcon('connections') + '</th>';
    html += '<th class="p-2 text-center">🔗 Links</th>';
    html += '<th class="p-2 text-center edit-mode-only">Actions</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var usedPorts = 0;
        for (var j = 0; j < d.ports.length; j++) {
            if (isPortUsed(d.id, d.ports[j].name)) {
                usedPorts++;
            }
        }

        var totalConnections = 0;
        for (var ci = 0; ci < appState.connections.length; ci++) {
            if (appState.connections[ci].from === d.id || appState.connections[ci].to === d.id) {
                totalConnections++;
            }
        }

        var rackColor = getRackColor(d.rackId);
        var disabled = d.status === 'disabled';
        var statusBadge = disabled 
            ? '<span class="px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-800">OFF</span>'
            : '<span class="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800">ON</span>';

        var addressText = '';
        // Support both addresses[] array (new) and ip1-4 fields (legacy)
        var ipList = [];
        if (d.addresses && d.addresses.length > 0) {
            ipList = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean);
        } else {
            ipList = [d.ip1, d.ip2, d.ip3, d.ip4].filter(function(ip) { return ip && ip.trim(); });
        }
        if (ipList.length > 0) {
            addressText = ipList.join(', ');
        }

        var rowClass = i % 2 === 0 ? 'bg-white' : 'bg-slate-50';
        var warningClass = totalConnections === 0 ? 'bg-orange-50' : rowClass;

        // Escape all user-provided content for XSS protection
        var safeLocation = escapeHtml(d.location || '');
        var safeRackId = escapeHtml(d.rackId || '');
        var safeName = escapeHtml(d.name || '');
        var safeBrandModel = escapeHtml(d.brandModel || '');
        var safeType = escapeHtml(d.type || '');
        var safeAddressText = escapeHtml(addressText || '');
        var safeService = escapeHtml(d.service || '');

        html += '<tr class="' + warningClass + ' hover:bg-blue-50 border-b border-slate-200">';
        html += '<td class="p-2 text-purple-700 font-semibold max-w-xs truncate" title="' + safeLocation + '">📍 ' + (safeLocation || '-') + '</td>';
        html += '<td class="p-2"><span class="px-1.5 py-0.5 rounded text-xs font-semibold" style="background-color:' + rackColor + '20;color:' + rackColor + '">' + safeRackId.toUpperCase() + '</span></td>';
        html += '<td class="p-2 text-center"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' + ((d.isRear || d.rear) ? '<span class="text-[10px] text-amber-600 font-bold ml-0.5" title="Rear/Back position">↩</span>' : '') + '</td>';
        html += '<td class="p-2 font-semibold text-slate-800">' + (disabled ? '<span class="text-red-500" title="Disabled">✗</span> ' : '') + safeName + '</td>';
        html += '<td class="p-2 text-slate-600">' + (safeBrandModel || '-') + '</td>';
        html += '<td class="p-2 text-slate-500 uppercase">' + safeType + '</td>';
        html += '<td class="p-2 text-center">' + statusBadge + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + safeAddressText + '">' + (safeAddressText || '-') + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + safeService + '">' + (safeService || '-') + '</td>';
        html += '<td class="p-2 text-center"><span class="text-slate-700">' + d.ports.length + '</span> <span class="text-slate-400">(' + usedPorts + ')</span></td>';
        html += '<td class="p-2 text-center">' + (totalConnections === 0 ? '<span class="text-orange-600 font-semibold">0 ⚠</span>' : '<span class="text-slate-700">' + totalConnections + '</span>') + '</td>';
        // Links column - shows label if defined, otherwise URL
        var linksHtml = (typeof DeviceLinks !== 'undefined' && d.links && d.links.length) ? DeviceLinks.renderLinks(d.links) : '-';
        html += '<td class="p-2 text-center">' + linksHtml + '</td>';
        html += '<td class="p-2 text-center whitespace-nowrap edit-mode-only">';
        html += '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-600 hover:text-green-900 text-xs mr-1" title="Add Connection">+Conn</button>';
        html += '<button onclick="editDevice(' + d.id + ')" class="text-blue-600 hover:text-blue-900 text-xs mr-1">Edit</button>';
        html += '<button onclick="removeDevice(' + d.id + ')" class="text-red-600 hover:text-red-900 text-xs">Del</button>';
        html += '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    cont.innerHTML = html;
}

function getDevicesSortedBy(key, asc, devicesList) {
    var devices = (devicesList || appState.devices).slice();
    
    devices.sort(function(a, b) {
        var valA, valB;
        
        switch(key) {
            case 'rack':
                valA = (a.rackId || a.rack || '').toLowerCase();
                valB = (b.rackId || b.rack || '').toLowerCase();
                if (valA === valB) {
                    return (a.order || 0) - (b.order || 0);
                }
                break;
            case 'order':
                valA = a.order || 0;
                valB = b.order || 0;
                break;
            case 'name':
                valA = (a.name || '').toLowerCase();
                valB = (b.name || '').toLowerCase();
                break;
            case 'brandModel':
                valA = (a.brandModel || '').toLowerCase();
                valB = (b.brandModel || '').toLowerCase();
                break;
            case 'type':
                valA = (a.type || '').toLowerCase();
                valB = (b.type || '').toLowerCase();
                break;
            case 'status':
                valA = a.status || '';
                valB = b.status || '';
                break;
            case 'location':
                valA = (a.location || '').toLowerCase();
                valB = (b.location || '').toLowerCase();
                break;
            case 'ports':
                valA = a.ports ? a.ports.length : 0;
                valB = b.ports ? b.ports.length : 0;
                break;
            case 'connections':
                valA = 0;
                valB = 0;
                for (var i = 0; i < appState.connections.length; i++) {
                    if (appState.connections[i].from === a.id || appState.connections[i].to === a.id) valA++;
                    if (appState.connections[i].from === b.id || appState.connections[i].to === b.id) valB++;
                }
                break;
            default:
                valA = (a.rackId || a.rack || '').toLowerCase();
                valB = (b.rackId || b.rack || '').toLowerCase();
        }

        if (typeof valA === 'string') {
            if (asc) {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        } else {
            if (asc) {
                return valA - valB;
            } else {
                return valB - valA;
            }
        }
    });
    
    return devices;
}

// ============================================================================
// MATRIX UPDATE (Refactored - Clean, Modern Design)
// ============================================================================

// Matrix view state
var matrixViewMode = 'compact'; // 'compact' or 'detailed'
var matrixLegendVisible = true;

// Legacy functions removed - Matrix now follows Topology pattern with Location and Group filters
// Previous view modes (compact/detailed) removed in favor of simplified table design
// Previous stats and legend features removed - Matrix is now cleaner and more professional

function showMatrixTooltip(event, connIdx) {
    var tooltip = document.getElementById('matrixTooltip');
    if (!tooltip || connIdx < 0 || connIdx >= appState.connections.length) return;
    
    var conn = appState.connections[connIdx];
    var fromDevice = null;
    var toDevice = null;
    
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === conn.from) fromDevice = appState.devices[i];
        if (appState.devices[i].id === conn.to) toDevice = appState.devices[i];
    }
    
    var fromName = fromDevice ? fromDevice.name : 'Unknown';
    var toName = toDevice ? toDevice.name : (conn.externalDest || 'External');
    var typeName = config.connLabels[conn.type] || conn.type;
    var connColor = config.connColors[conn.type] || '#6b7280';
    
    // Enhanced tooltip with more details
    var html = '<div style="min-width: 200px;">';
    
    // Connection type header with color
    html += '<div style="font-size: 12px; font-weight: 700; color: white; background-color:' + connColor + '; padding: 6px 8px; border-radius: 4px 4px 0 0; margin: -8px -8px 8px -8px;">' + 
            typeName + '</div>';
    
    // FROM device
    html += '<div style="margin-bottom: 8px;">';
    html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">FROM</div>';
    html += '<div style="font-size: 11px; font-weight: 600; color: #1e293b;">' + fromName + '</div>';
    if (fromDevice && fromDevice.rackId) {
        html += '<div style="font-size: 10px; color: #64748b;">Rack: ' + fromDevice.rackId + (fromDevice.order ? ' • Pos: ' + fromDevice.order : '') + '</div>';
    }
    html += '<div style="font-size: 11px; color: #3b82f6; font-weight: 600; margin-top: 2px;">Port: ' + (conn.fromPort || '—') + '</div>';
    html += '</div>';
    
    // Arrow
    html += '<div style="text-align: center; color: #cbd5e1; font-size: 14px; margin: 4px 0;">↓</div>';
    
    // TO device
    html += '<div>';
    html += '<div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">TO</div>';
    html += '<div style="font-size: 11px; font-weight: 600; color: #1e293b;">' + toName + '</div>';
    if (toDevice && toDevice.rackId) {
        html += '<div style="font-size: 10px; color: #64748b;">Rack: ' + toDevice.rackId + (toDevice.order ? ' • Pos: ' + toDevice.order : '') + '</div>';
    }
    html += '<div style="font-size: 11px; color: #3b82f6; font-weight: 600; margin-top: 2px;">Port: ' + (conn.toPort || '—') + '</div>';
    html += '</div>';
    
    // Cable info if available
    if (conn.cableMarker || conn.notes) {
        html += '<div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px;">';
        if (conn.cableMarker) {
            html += '<div style="font-size: 10px; color: #64748b;">Cable: <span style="font-weight: 600; color: #1e293b;">' + conn.cableMarker + '</span></div>';
        }
        if (conn.notes) {
            html += '<div style="font-size: 10px; color: #64748b; margin-top: 2px;">' + conn.notes + '</div>';
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
}

function hideMatrixTooltip() {
    var tooltip = document.getElementById('matrixTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function updateMatrix() {
    var cont = document.getElementById('matrixContainer');
    if (!cont) return;
    
    // Get filtered devices based on location and group selections
    var filtered = getMatrixFilteredDevices();
    
    if (filtered.length === 0) {
        cont.innerHTML = '<div class="flex items-center justify-center py-16 text-slate-400">' +
            '<p>No devices in selected filters</p>' +
            '</div>';
        return;
    }

    var cellSize = 80;
    var cellHeight = 80;  // Quadrado: altura = largura
    
    // Build matrix HTML with square cells
    var html = '<div style="overflow-x: auto; cursor: grab;">';
    html += '<table class="border-collapse" style="border-spacing: 0; width: 100%; border: 1px solid #cbd5e1;">';
    
    // Header row
    html += '<thead><tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">';
    html += '<th style="padding: 8px; border-right: 1px solid #cbd5e1; min-width: 80px; text-align: center; font-size: 0.875rem; font-weight: 600;">' +
            '<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">' +
            '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<span style="font-size: 10px; color: #64748b;">FROM</span>' +
            '<div style="width: 20px; height: 20px; border-radius: 50%; background-color: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">↓</div>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<span style="font-size: 10px; color: #64748b;">TO</span>' +
            '<div style="width: 20px; height: 20px; border-radius: 50%; background-color: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">→</div>' +
            '</div>' +
            '</div>' +
            '</th>';
    
    for (var i = 0; i < filtered.length; i++) {
        var device = filtered[i];
        html += '<th style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: center; width: ' + cellSize + 'px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' +
                '<div title="' + device.name + '">' + device.name + '</div></th>';
    }
    
    html += '</tr></thead><tbody>';
    
    // Data rows
    for (var r = 0; r < filtered.length; r++) {
        var row = filtered[r];
        var rowBg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        html += '<tr style="background-color: ' + rowBg + '; border-bottom: 1px solid #cbd5e1;">';
        
        // First column with device name and IPs
        var deviceIPs = [];
        if (row.addresses && row.addresses.length > 0) {
            for (var a = 0; a < row.addresses.length; a++) {
                if (row.addresses[a].network) deviceIPs.push(row.addresses[a].network);
                if (row.addresses[a].ip && row.addresses[a].ip !== row.addresses[a].network) {
                    deviceIPs.push(row.addresses[a].ip);
                }
            }
        }
        
        html += '<td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; font-size: 0.75rem;">' +
                '<div style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">' + row.name + '</div>';
        
        if (deviceIPs.length > 0) {
            html += '<div style="font-size: 10px; color: #64748b; line-height: 1.3;">' + deviceIPs.join('<br>') + '</div>';
        }
        
        html += '</td>';
        
        for (var c = 0; c < filtered.length; c++) {
            var col = filtered[c];
            var cellContent = '';
            var cellBg = rowBg;
            var cellStyle = 'cursor: default;';
            
            if (row.id === col.id) {
                // Diagonal cells
                cellContent = '';
                cellBg = '#e2e8f0';
            } else {
                // Look for connection between these two devices
                var conn = null;
                var connIdx = -1;
                for (var ci = 0; ci < appState.connections.length; ci++) {
                    var c_conn = appState.connections[ci];
                    if ((c_conn.from === row.id && c_conn.to === col.id) ||
                        (c_conn.from === col.id && c_conn.to === row.id)) {
                        conn = c_conn;
                        connIdx = ci;
                        break;
                    }
                }
                
                if (conn) {
                    var connType = conn.type || 'unknown';
                    var fromPort = conn.from === row.id ? conn.fromPort : conn.toPort;
                    var toPort = conn.from === row.id ? conn.toPort : conn.fromPort;
                    var connColor = config.connColors[connType] || '#64748b';
                    var typeName = config.connLabels[connType] || connType;
                    
                    // Cell with square design showing connection type badge and ports
                    cellContent = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: ' + cellHeight + 'px; cursor: pointer;" ' +
                                  'onmouseenter="showMatrixTooltip(event, ' + connIdx + ')" ' +
                                  'onmouseleave="hideMatrixTooltip()" ' +
                                  'onclick="editConnection(' + connIdx + ')">' +
                                  
                                  // Connection type badge (bolinha redonda)
                                  '<div style="width: 32px; height: 32px; border-radius: 50%; background-color: ' + connColor + '; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: transform 0.2s;" ' +
                                  'onmouseenter="this.style.transform=\'scale(1.1)\';" onmouseleave="this.style.transform=\'scale(1)\';">' +
                                  '<span style="color: white; font-size: 11px; font-weight: 700; text-align: center;">' + typeName.substring(0, 3).toUpperCase() + '</span>' +
                                  '</div>' +
                                  
                                  // Source and destination ports side by side
                                  '<div style="display: flex; gap: 2px; font-size: 9px; font-weight: 600;">' +
                                  '<span style="background-color: ' + connColor + '; color: white; padding: 2px 4px; border-radius: 3px; opacity: 0.8;">' + (fromPort || '—') + '</span>' +
                                  '<span style="color: #94a3b8;">→</span>' +
                                  '<span style="background-color: ' + connColor + '; color: white; padding: 2px 4px; border-radius: 3px; opacity: 0.6;">' + (toPort || '—') + '</span>' +
                                  '</div>' +
                                  
                                  '</div>';
                    cellBg = '#ffffff';  // White background for connection cells
                    cellStyle = 'cursor: pointer;';
                }
            }
            
            html += '<td style="padding: 4px; border-right: 1px solid #cbd5e1; text-align: center; background-color: ' + cellBg + '; ' + cellStyle + '">' +
                    (cellContent || '<div style="height: ' + cellHeight + 'px; display: flex; align-items: center; justify-content: center;"></div>') +
                    '</td>';
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    cont.innerHTML = html;
    
    // Reinitialize drag-to-scroll on the container
    initDragToScroll();
}

// ============================================================================
// CONNECTION FILTERS BAR
// ============================================================================
function updateConnFilterBar() {
    var filterBar = document.getElementById('connFilterBar');
    if (!filterBar) return;
    
    // Get unique sources and types for dropdowns
    var sources = [];
    var types = [];
    
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        if (d.rackId && sources.indexOf(d.rackId) === -1) sources.push(d.rackId);
    }
    
    for (var ci = 0; ci < appState.connections.length; ci++) {
        var c = appState.connections[ci];
        if (c.type && types.indexOf(c.type) === -1) types.push(c.type);
    }
    
    sources.sort();
    types.sort();
    
    // Calculate counts - real connections vs display lines
    var filteredItems = typeof getFilteredConnections === 'function' ? getFilteredConnections() : [];
    var totalConnections = appState.connections.length;
    var lineCount = filteredItems.length;
    var isBidirectional = appState.connFilters.normalizeView;
    
    // Count real connections (not mirrored)
    var realCount = 0;
    for (var fc = 0; fc < filteredItems.length; fc++) {
        if (!filteredItems[fc]._isMirrored) realCount++;
    }
    
    var hasActiveFilters = appState.connFilters.source || appState.connFilters.anyDevice ||
                           appState.connFilters.fromDevice || appState.connFilters.toDevice || 
                           appState.connFilters.destination || appState.connFilters.type || 
                           appState.connFilters.status || appState.connFilters.cable;
    
    var html = '<div class="flex flex-wrap items-center gap-2 p-3 bg-slate-100 rounded-lg mb-3">';
    html += '<span class="text-xs font-semibold text-slate-600">🔍 Filters:</span>';
    
    // Group filter - cerca in entrambi source e destination (campo rackId per compatibilità)
    html += '<select id="filterConnSource" onchange="updateConnFilter(\'source\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white" title="Filtra per Group (cerca in Source e Destination)">';
    html += '<option value="">All Groups</option>';
    for (var s = 0; s < sources.length; s++) {
        var selected = appState.connFilters.source === sources[s] ? ' selected' : '';
        html += '<option value="' + sources[s] + '"' + selected + '>' + sources[s] + '</option>';
    }
    html += '</select>';
    
    // Separator
    html += '<span class="text-slate-300">|</span>';
    
    // ANY DEVICE filter (searches in BOTH From and To columns) - HIGHLIGHTED
    html += '<div class="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">';
    html += '<span class="text-xs text-blue-600 font-medium">📍 Device:</span>';
    html += '<input type="text" id="filterConnAnyDevice" placeholder="Search device..." value="' + (appState.connFilters.anyDevice || '') + '" oninput="updateConnFilter(\'anyDevice\', this.value)" class="px-2 py-1 text-xs border-0 bg-transparent w-28 focus:outline-none">';
    html += '</div>';
    
    // Bidirectional checkbox - shows each connection twice (A→B and B→A)
    html += '<label class="flex items-center gap-1 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-2 py-1" title="ON: Shows bidirectional view (A→B and B→A). Mirrored lines have red background.">';
    html += '<input type="checkbox" id="connNormalizeView" onchange="toggleConnNormalizeView()" ' + (appState.connFilters.normalizeView ? 'checked' : '') + ' class="w-3 h-3 accent-purple-600">';
    html += '<span class="text-xs text-purple-600 font-medium">⇄ Bidirectional</span>';
    html += '</label>';
    
    // Separator
    html += '<span class="text-slate-300">|</span>';
    
    // From Device search filter
    html += '<input type="text" id="filterConnFromDevice" placeholder="From..." value="' + (appState.connFilters.fromDevice || '') + '" oninput="updateConnFilter(\'fromDevice\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-20">';
    
    // To Device search filter
    html += '<input type="text" id="filterConnToDevice" placeholder="To..." value="' + (appState.connFilters.toDevice || '') + '" oninput="updateConnFilter(\'toDevice\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-20">';
    
    // Destination filter
    html += '<input type="text" id="filterConnDestination" placeholder="Dest..." value="' + (appState.connFilters.destination || '') + '" oninput="updateConnFilter(\'destination\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-20">';
    
    // Type filter
    html += '<select id="filterConnType" onchange="updateConnFilter(\'type\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Types</option>';
    for (var t = 0; t < types.length; t++) {
        var selectedT = appState.connFilters.type === types[t] ? ' selected' : '';
        var typeLabel = config.connLabels[types[t]] || types[t];
        html += '<option value="' + types[t] + '"' + selectedT + '>' + typeLabel + '</option>';
    }
    html += '</select>';
    
    // Status filter
    html += '<select id="filterConnStatus" onchange="updateConnFilter(\'status\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Status</option>';
    html += '<option value="active"' + (appState.connFilters.status === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="disabled"' + (appState.connFilters.status === 'disabled' ? ' selected' : '') + '>Disabled</option>';
    html += '</select>';
    
    // Cable filter
    html += '<input type="text" id="filterConnCable" placeholder="Cable ID..." value="' + (appState.connFilters.cable || '') + '" oninput="updateConnFilter(\'cable\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white w-20">';
    
    // Clear filters button (with ID for dynamic updates)
    html += '<button id="connFilterClearBtn" onclick="clearConnFilters()" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200" style="display:' + (hasActiveFilters ? 'inline-block' : 'none') + '">✕ Clear</button>';
    
    // Count display - show real connections + lines when bidirectional
    var countText;
    if (hasActiveFilters) {
        if (isBidirectional && lineCount !== realCount) {
            countText = realCount + ' conn. (' + lineCount + ' lines) of ' + totalConnections;
        } else {
            countText = 'Showing ' + realCount + ' of ' + totalConnections;
        }
    } else {
        if (isBidirectional) {
            countText = totalConnections + ' conn. (' + lineCount + ' lines)';
        } else {
            countText = totalConnections + ' connections';
        }
    }
    html += '<span id="connFilterCount" class="text-xs text-slate-500 ml-2">' + countText + '</span>';
    
    // Sort indicator inside filters (if more than default)
    var showClearSort = appState.connSort.length > 1 || (appState.connSort.length === 1 && appState.connSort[0].key !== 'id');
    if (showClearSort) {
        html += '<span class="text-slate-300 ml-2">|</span>';
        html += '<span class="text-xs text-slate-500 ml-2">Sort:</span>';
        for (var cs = 0; cs < appState.connSort.length; cs++) {
            var sortItem = appState.connSort[cs];
            var arrow = sortItem.asc ? '▲' : '▼';
            html += '<span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs ml-1">' + (cs + 1) + '.' + sortItem.key + ' ' + arrow + '</span>';
        }
        html += '<button onclick="clearConnSort()" class="text-red-500 hover:text-red-700 text-xs ml-1" title="Clear sorting">✕</button>';
    }
    
    // Legend
    html += '<span class="text-xs text-slate-500 ml-auto"><span class="text-red-500 font-bold">✗</span> disabled · <span class="text-amber-600 font-bold">↩</span> rear</span>';
    
    html += '</div>';
    filterBar.innerHTML = html;
}

// ============================================================================
// CONNECTIONS LIST UPDATE (Full table with all columns and styling)
// ============================================================================
function updateConnectionsList() {
    var cont = document.getElementById('connectionsListContainer');
    // Update filter bar (full rebuild)
    updateConnFilterBar();
    
    // Render connections table
    renderConnectionsTable(cont);
}

/**
 * Update only the connections list content (not the filter bar)
 * Used when filtering to keep input focus
 */
function updateConnectionsListOnly() {
    var cont = document.getElementById('connectionsListContainer');
    if (!cont) return;
    
    // Render connections table without touching filter bar
    renderConnectionsTable(cont);
}

/**
 * Render the connections table (shared by both update functions)
 * Supports bidirectional view: each connection can appear twice (original + mirrored)
 */
function renderConnectionsTable(cont) {
    if (!cont) return;
    
    // Get filtered connections (now returns items with _original, _originalIndex, _isMirrored)
    var filteredItems = typeof getFilteredConnections === 'function' ? getFilteredConnections() : [];

    if (appState.connections.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 text-sm">No connections yet</p>';
        return;
    }
    
    if (filteredItems.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 text-sm">No connections match the current filters</p>';
        return;
    }

    // Prepare sortable headers (nota: fromRack/toRack sono i campi rackId, label visuale "Group")
    var headers = [
        { key: 'id', label: '#', printHide: true },
        { key: 'fromRack', label: 'Group' },
        { key: 'fromPos', label: 'Pos.' },
        { key: 'fromDevice', label: 'From Device' },
        { key: 'fromPort', label: 'Src Port' },
        { key: 'arrow', label: '' },
        { key: 'toPort', label: 'Dst Port' },
        { key: 'toDevice', label: 'To Device' },
        { key: 'toPos', label: 'Pos.' },
        { key: 'toRack', label: 'Destination' },
        { key: 'type', label: 'Type' },
        { key: 'marker', label: 'Cable' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' },
        { key: 'actions', label: '', noPrint: true }
    ];

    var html = '';
    
    html += '<div class="overflow-x-auto"><table class="min-w-full divide-y text-xs"><thead class="bg-slate-50"><tr>';
    for (var h = 0; h < headers.length; h++) {
        var hdr = headers[h];
        var sortIndicator = '';
        var printClass = hdr.printHide ? ' print-hide-id' : (hdr.noPrint ? ' no-print' : '');
        
        // Check multi-level sorting for this column
        if (hdr.key !== 'actions' && hdr.key !== 'arrow') {
            for (var si = 0; si < appState.connSort.length; si++) {
                if (appState.connSort[si].key === hdr.key) {
                    var arrowSort = appState.connSort[si].asc ? '▲' : '▼';
                    var level = appState.connSort.length > 1 ? '<sub>' + (si + 1) + '</sub>' : '';
                    sortIndicator = ' ' + arrowSort + level;
                    break;
                }
            }
        }
        
        if (hdr.key === 'actions') {
            html += '<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase no-print edit-mode-only">' + hdr.label + '</th>';
        } else if (hdr.key === 'arrow') {
            html += '<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase' + printClass + '">' + hdr.label + '</th>';
        } else {
            html += '<th onclick="toggleConnSort(\'' + hdr.key + '\', event)" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100' + printClass + '" title="Click to sort, Shift+Click to add level">' + hdr.label + sortIndicator + '</th>';
        }
    }
    html += '</tr></thead><tbody class="bg-white divide-y">';

    // Sort items with multi-level support
    var sorted = filteredItems.slice();
    sorted.sort(function(a, b) {
        // Helper to get FROM device for sorting (respects mirrored state)
        function getFromDevice(item) {
            var fromId = item._isMirrored ? item.from : item._original.from;
            for (var j = 0; j < appState.devices.length; j++) {
                if (appState.devices[j].id === fromId) return appState.devices[j];
            }
            return null;
        }
        // Helper to get TO device for sorting
        function getToDevice(item) {
            var toId = item._isMirrored ? item.to : item._original.to;
            for (var j = 0; j < appState.devices.length; j++) {
                if (appState.devices[j].id === toId) return appState.devices[j];
            }
            return null;
        }
        
        function valueFor(item, key) {
            var c = item._original;
            var fromDevice = getFromDevice(item);
            var toDevice = getToDevice(item);
            var fromPort = item._isMirrored ? item.fromPort : c.fromPort;
            var toPort = item._isMirrored ? item.toPort : c.toPort;
            
            switch (key) {
                case 'id': return item._originalIndex + 1;
                case 'fromRack': return fromDevice ? (fromDevice.rackId || '') : '';
                case 'fromPos': return fromDevice ? (fromDevice.order || 0) : 0;
                case 'fromDevice': return fromDevice ? (fromDevice.name || '') : '';
                case 'fromPort': return fromPort || '';
                case 'toPort': return toPort || '';
                case 'toDevice': return toDevice ? (toDevice.name || '') : (c.externalDest || '');
                case 'toPos': return toDevice ? (toDevice.order || 0) : 0;
                case 'toRack': return toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest ? 'External' : ''));
                case 'type': return config.connLabels[c.type] || (c.type || '');
                case 'marker': return c.cableMarker || '';
                case 'status': return c.status || '';
                default: return '';
            }
        }

        // Compare function for a single sort level
        function compareSingle(valA, valB, asc) {
            var na = parseFloat(valA);
            var nb = parseFloat(valB);
            if (!isNaN(na) && !isNaN(nb)) {
                return asc ? na - nb : nb - na;
            }
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
            if (valA < valB) return asc ? -1 : 1;
            if (valA > valB) return asc ? 1 : -1;
            return 0;
        }
        
        // Multi-level sorting
        for (var lvl = 0; lvl < appState.connSort.length; lvl++) {
            var sortKey = appState.connSort[lvl].key;
            var sortAsc = appState.connSort[lvl].asc;
            var valA = valueFor(a, sortKey);
            var valB = valueFor(b, sortKey);
            var cmp = compareSingle(valA, valB, sortAsc);
            if (cmp !== 0) return cmp;
        }
        
        // Final fallback: keep original and mirrored together
        if (a._originalIndex !== b._originalIndex) {
            return a._originalIndex - b._originalIndex;
        }
        // Original before mirrored
        return a._isMirrored ? 1 : -1;
    });

    for (var i = 0; i < sorted.length; i++) {
        var item = sorted[i];
        var c = item._original;
        var isMirrored = item._isMirrored;
        var isAutoInverted = item._autoInverted;  // Auto-inverted due to filter search
        var origIdx = item._originalIndex;
        
        // Get FROM/TO based on whether this is mirrored or auto-inverted
        var fromId = (isMirrored || isAutoInverted) ? item.from : c.from;
        var toId = (isMirrored || isAutoInverted) ? item.to : c.to;
        var displayFromPort = (isMirrored || isAutoInverted) ? item.fromPort : c.fromPort;
        var displayToPort = (isMirrored || isAutoInverted) ? item.toPort : c.toPort;
        
        var fromDevice = null;
        var toDevice = null;
        for (var j = 0; j < appState.devices.length; j++) {
            if (appState.devices[j].id === fromId) fromDevice = appState.devices[j];
            if (appState.devices[j].id === toId) toDevice = appState.devices[j];
        }
        
        var disabled = c.status === 'disabled' || (fromDevice && fromDevice.status === 'disabled') || (toDevice && toDevice.status === 'disabled');
        var opacityClass = disabled ? 'opacity-50' : '';

        var markerHtml = createMarkerHtml(c.cableMarker, c.cableColor, false);

        var statusClass = disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
        var statusText = disabled ? 'Off' : 'On';

        // Connection color with fallback
        var connColor = c.color || config.connColors[c.type] || '#64748b';

        var fromRackColor = getRackColor(fromDevice ? fromDevice.rackId : '');
        var toRackColor = getRackColor(toDevice ? toDevice.rackId : '');

        // Get IPs
        var fromIPs = '';
        var toIPs = '';
        if (fromDevice && fromDevice.addresses && fromDevice.addresses.length > 0) {
            var addrs = [];
            for (var ai = 0; ai < fromDevice.addresses.length; ai++) {
                var addr = fromDevice.addresses[ai];
                if (addr.network) addrs.push(addr.network);
                if (addr.ip && addr.ip !== addr.network) addrs.push(addr.ip);
            }
            fromIPs = addrs.join('<br>');
        } else if (fromDevice && (fromDevice.ip1 || fromDevice.ip2 || fromDevice.ip3 || fromDevice.ip4)) {
            fromIPs = [fromDevice.ip1, fromDevice.ip2, fromDevice.ip3, fromDevice.ip4].filter(Boolean).join('<br>');
        }
        if (toDevice && toDevice.addresses && toDevice.addresses.length > 0) {
            var addrs2 = [];
            for (var ai2 = 0; ai2 < toDevice.addresses.length; ai2++) {
                var addr2 = toDevice.addresses[ai2];
                if (addr2.network) addrs2.push(addr2.network);
                if (addr2.ip && addr2.ip !== addr2.network) addrs2.push(addr2.ip);
            }
            toIPs = addrs2.join('<br>');
        } else if (toDevice && (toDevice.ip1 || toDevice.ip2 || toDevice.ip3 || toDevice.ip4)) {
            toIPs = [toDevice.ip1, toDevice.ip2, toDevice.ip3, toDevice.ip4].filter(Boolean).join('<br>');
        }

        // Row styling: mirrored rows have red background, auto-inverted have blue background
        var rowBg;
        if (isMirrored) {
            rowBg = 'bg-red-100';
        } else if (isAutoInverted) {
            rowBg = 'bg-blue-50';  // Light blue for auto-inverted (filter matched destination)
        } else {
            rowBg = (i % 2 === 0) ? 'bg-white' : 'bg-slate-50';
        }
        
        // ID number: same for both, just add ⇄ for mirrored (red and bigger) or ↩ for auto-inverted (blue)
        var idNumber = origIdx + 1;
        var idHtml;
        if (isMirrored) {
            idHtml = idNumber + ' <span class="text-red-600 text-base font-bold">⇄</span>';
        } else if (isAutoInverted) {
            idHtml = idNumber + ' <span class="text-blue-600 text-sm font-bold" title="View inverted to show filtered rack as source">↩</span>';
        } else {
            idHtml = String(idNumber);
        }

        // Handle external destination and wall jack display
        var toDisplayName, toDisplayRack, toDisplayPos;
        if (toDevice) {
            toDisplayName = escapeHtml(toDevice.name);
            toDisplayRack = escapeHtml(toDevice.rackId);
            toDisplayPos = String(toDevice.order).padStart(2, '0');
        } else if (c.isWallJack) {
            toDisplayName = '🔌 ' + escapeHtml(c.externalDest || 'Wall Jack');
            toDisplayRack = 'Wall Jack';
            toDisplayPos = '-';
        } else if (c.externalDest) {
            toDisplayName = '📡 ' + escapeHtml(c.externalDest);
            toDisplayRack = 'External';
            toDisplayPos = '-';
        } else {
            toDisplayName = 'N/A';
            toDisplayRack = 'N/A';
            toDisplayPos = 'N/A';
        }

        // Rear indicators - standardized icon
        var fromRearIndicator = (fromDevice && (fromDevice.isRear || fromDevice.rear)) ? '<span class="text-[10px] text-amber-600 font-bold ml-0.5" title="Rear/Back position">↩</span>' : '';
        var toRearIndicator = (toDevice && (toDevice.isRear || toDevice.rear)) ? '<span class="text-[10px] text-amber-600 font-bold ml-0.5" title="Rear/Back position">↩</span>' : '';
        
        // Disabled indicators - standardized icon
        var fromDisabledIndicator = (fromDevice && fromDevice.status === 'disabled') ? '<span class="text-red-500 mr-0.5" title="Disabled">✗</span>' : '';
        var toDisabledIndicator = (toDevice && toDevice.status === 'disabled') ? '<span class="text-red-500 mr-0.5" title="Disabled">✗</span>' : '';

        // Simple border - thinner for mirrored rows
        var borderClass = isMirrored ? 'border-b border-red-300' : 'border-b border-slate-200';

        // Escape device names for onclick handlers
        var fromDeviceNameEscaped = fromDevice ? escapeHtml(fromDevice.name).replace(/'/g, "\\'") : '';
        var toDeviceNameEscaped = toDevice ? escapeHtml(toDevice.name).replace(/'/g, "\\'") : '';

        html += '<tr class="' + rowBg + ' ' + opacityClass + ' hover:bg-blue-50 ' + borderClass + '">' +
            '<td class="px-3 py-2 align-top print-hide-id">' + idHtml + '</td>' +
            '<td class="px-3 py-2 align-top font-bold" style="color:' + fromRackColor + '">' + escapeHtml(fromDevice ? fromDevice.rackId : 'N/A') + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + (fromDevice ? String(fromDevice.order).padStart(2, '0') : 'N/A') + '</span>' + fromRearIndicator + '</td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold cursor-pointer hover:text-blue-600" onclick="filterConnectionsByDevice(\'' + fromDeviceNameEscaped + '\')">' + fromDisabledIndicator + escapeHtml(fromDevice ? fromDevice.name : 'N/A') + '</div>' +
                (fromIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + fromIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + escapeHtml(displayFromPort || '-') + '</td>' +
            '<td class="px-1 py-2 align-top text-center"><span style="font-size:18px;font-weight:bold;color:' + (isMirrored ? '#dc2626' : '#2563eb') + ';">⟷</span></td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + escapeHtml(displayToPort || '-') + '</td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold cursor-pointer hover:text-blue-600" onclick="filterConnectionsByDevice(\'' + toDeviceNameEscaped + '\')">' + toDisabledIndicator + toDisplayName + '</div>' +
                (toIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + toIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + toDisplayPos + '</span>' + toRearIndicator + '</td>' +
            '<td class="px-3 py-2 align-top font-bold" style="color:' + toRackColor + '">' + toDisplayRack + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full text-white" style="background-color:' + connColor + '">' + escapeHtml(config.connLabels[c.type] || c.type) + '</span></td>' +
            '<td class="px-3 py-2 align-top">' + markerHtml + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full ' + statusClass + '">' + statusText + '</span></td>' +
            '<td class="px-3 py-2 align-top text-xs italic text-slate-600">' + escapeHtml(c.notes || '') + '</td>' +
            '<td class="px-3 py-2 align-top text-center no-print edit-mode-only">' +
            '<div class="flex flex-col gap-1">' +
            '<button onclick="editConnection(' + origIdx + ')" class="text-blue-600 hover:text-blue-900 text-xs">Edit</button>' +
            '<button onclick="removeConnection(' + origIdx + ')" class="text-red-600 hover:text-red-900 text-xs">Del</button>' +
            '</div></td>' +
            '</tr>';
    }
    html += '</tbody></table></div>';
    cont.innerHTML = html;
}

// ============================================================================
// EXCEL EXPORT (Full implementation)
// ============================================================================
function exportExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            Toast.error('Excel library not loaded. Please check your internet connection.');
            return;
        }

        var wb = XLSX.utils.book_new();

        var devData = [];
        for (var i = 0; i < appState.devices.length; i++) {
            var d = appState.devices[i];
            // Support both addresses[] array (new) and ip1-4 fields (legacy)
            var ips = '';
            if (d.addresses && d.addresses.length > 0) {
                ips = d.addresses.map(function(a) { return a.network || a.ip || ''; }).filter(Boolean).join(', ');
            } else {
                ips = [d.ip1, d.ip2, d.ip3, d.ip4].filter(Boolean).join(', ');
            }
            devData.push({
                'Location': d.location || '',
                'Group': d.rackId || d.rack || '',
                'Order': d.order,
                'Position': (d.isRear || d.rear) ? 'Rear' : 'Front',
                'Name': d.name,
                'Type/Brand': d.brandModel || '',
                'Category': d.type,
                'Status': d.status,
                'IP Addresses': ips,
                'Service': d.service || '',
                'Ports': d.ports ? d.ports.length : 0,
                'Notes': d.notes || ''
            });
        }

        if (devData.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devData), 'Devices');
        } else {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{Message: 'No devices'}]), 'Devices');
        }

        var connData = [];
        for (var j = 0; j < appState.connections.length; j++) {
            var c = appState.connections[j];
            var fromDevice = null;
            var toDevice = null;
            for (var k = 0; k < appState.devices.length; k++) {
                if (appState.devices[k].id === c.from) fromDevice = appState.devices[k];
                if (appState.devices[k].id === c.to) toDevice = appState.devices[k];
            }
            connData.push({
                'ID': j + 1,
                'Src Rack': fromDevice ? fromDevice.rackId : '',
                'Src Pos': fromDevice ? fromDevice.order : '',
                'Src Device': fromDevice ? fromDevice.name : '',
                'Src Port': c.fromPort,
                'Dst Port': c.toPort,
                'Dst Device': toDevice ? toDevice.name : (c.isWallJack ? '[WJ] ' + c.externalDest : (c.externalDest ? '[EXT] ' + c.externalDest : '')),
                'Dst Pos': toDevice ? toDevice.order : '',
                'Dst Rack': toDevice ? toDevice.rackId : (c.isWallJack ? 'Wall Jack' : (c.externalDest ? 'External' : '')),
                'Type': config.connLabels[c.type],
                'Cable ID': c.cableMarker || '',
                'Cable Color': c.cableColor || '',
                'Status': c.status,
                'Notes': c.notes || ''
            });
        }

        if (connData.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(connData), 'Connections');
        } else {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{Message: 'No connections'}]), 'Connections');
        }

        var sorted = getSorted();
        if (sorted.length > 0) {
            var matrixHeader = ['Device'];
            for (var m = 0; m < sorted.length; m++) {
                var dev = sorted[m];
                matrixHeader.push('[' + dev.rackId + '-' + String(dev.order).padStart(2, '0') + '] ' + dev.name);
            }
            var matrixData = [matrixHeader];

            for (var r = 0; r < sorted.length; r++) {
                var row = sorted[r];
                var rowData = ['[' + row.rackId + '-' + String(row.order).padStart(2, '0') + '] ' + row.name];
                for (var col = 0; col < sorted.length; col++) {
                    var colDev = sorted[col];
                    if (row.id === colDev.id) {
                        rowData.push('-');
                    } else {
                        var connIdx = getConnectionIndex(row.id, colDev.id);
                        if (connIdx >= 0) {
                            var conn = appState.connections[connIdx];
                            var isSrc = conn.from === row.id;
                            var fromPort = isSrc ? conn.fromPort : conn.toPort;
                            var toPort = isSrc ? conn.toPort : conn.fromPort;
                            rowData.push(config.connLabels[conn.type] + ' (' + fromPort + ' <-> ' + toPort + ')');
                        } else {
                            rowData.push('');
                        }
                    }
                }
                matrixData.push(rowData);
            }
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrixData), 'Matrix');
        } else {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{Message: 'No devices for matrix'}]), 'Matrix');
        }

        XLSX.writeFile(wb, 'network_manager.xlsx');
        
        // Log the export
        if (typeof ActivityLog !== 'undefined') {
            ActivityLog.add('export', 'export', 'Exported Excel with ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections');
        }
        
        Toast.success('Excel exported successfully!');

    } catch (e) {
        console.error('Error exporting Excel:', e);
        Toast.error('Error exporting Excel: ' + e.message);
    }
}

// ============================================================================
// DRAG-TO-SCROLL
// ============================================================================
function initDragToScroll() {
    var matrixContainer = document.getElementById('matrixContainer');
    if (!matrixContainer) return;
    
    var isDragging = false;
    var startX, startY, scrollLeft, scrollTop;
    var currentZoom = 1.0;

    // Zoom with mouse wheel (like Topology)
    matrixContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        var delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out / Zoom in
        var newZoom = currentZoom * delta;
        
        // Limit zoom range
        if (newZoom < 0.3) newZoom = 0.3;
        if (newZoom > 3.0) newZoom = 3.0;
        
        currentZoom = newZoom;
        
        var table = matrixContainer.querySelector('table');
        if (table) {
            table.style.transform = 'scale(' + currentZoom + ')';
            table.style.transformOrigin = 'top left';
        }
    }, { passive: false });

    // Drag to scroll (hand navigation)
    matrixContainer.addEventListener('mousedown', function(e) {
        if (e.target.closest('button, a, input, select, td[onclick]')) return;
        isDragging = true;
        matrixContainer.style.cursor = 'grabbing';
        matrixContainer.style.userSelect = 'none';
        startX = e.pageX - matrixContainer.offsetLeft;
        startY = e.pageY - matrixContainer.offsetTop;
        scrollLeft = matrixContainer.scrollLeft;
        scrollTop = matrixContainer.scrollTop;
    });

    matrixContainer.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        var x = e.pageX - matrixContainer.offsetLeft;
        var y = e.pageY - matrixContainer.offsetTop;
        var walkX = (x - startX) * 1.5;
        var walkY = (y - startY) * 1.5;
        matrixContainer.scrollLeft = scrollLeft - walkX;
        matrixContainer.scrollTop = scrollTop - walkY;
    });

    matrixContainer.addEventListener('mouseup', function() {
        isDragging = false;
        matrixContainer.style.cursor = 'grab';
        matrixContainer.style.userSelect = '';
    });

    matrixContainer.addEventListener('mouseleave', function() {
        isDragging = false;
        matrixContainer.style.cursor = 'grab';
        matrixContainer.style.userSelect = '';
    });

    matrixContainer.style.cursor = 'grab';
}

// Matrix Export Function
function exportMatrixPNG() {
    var cont = document.getElementById('matrixContainer');
    if (!cont) return;
    
    // Get current filters for title
    var locationSelect = document.getElementById('matrixLocationFilter');
    var groupSelect = document.getElementById('matrixGroupFilter');
    var selectedLocation = locationSelect ? locationSelect.value : '';
    var selectedGroup = groupSelect ? groupSelect.value : '';
    
    // Create a canvas from the matrix table
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    var padding = 20;
    var titleHeight = 40;
    var dateHeight = 20;
    var tableContainer = cont.querySelector('table');
    
    if (!tableContainer) {
        alert('No matrix to export');
        return;
    }
    
    // Calculate dimensions
    var tableHeight = tableContainer.offsetHeight;
    var tableWidth = tableContainer.offsetWidth;
    var canvasWidth = tableWidth + (padding * 2);
    var canvasHeight = titleHeight + dateHeight + tableHeight + (padding * 3) + 20;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial, sans-serif';
    var filterInfo = 'Connection Matrix';
    if (selectedLocation) filterInfo += ' - Location: ' + selectedLocation;
    if (selectedGroup) filterInfo += ' - Group: ' + selectedGroup;
    ctx.fillText(filterInfo, padding, padding + 20);
    
    // Draw date and time
    var now = new Date();
    var dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Exported: ' + dateStr, padding, padding + 35);
    
    // Draw table using html2canvas approach - fallback to simple text
    // For now, we'll use a simple HTML to image approach using SVG
    var svg = document.createElement('svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', tableWidth);
    svg.setAttribute('height', tableHeight);
    
    // Convert table to canvas using serialization
    var tableSVG = tableToSVG(tableContainer, tableWidth, tableHeight);
    
    // Draw the SVG onto canvas
    var img = new Image();
    img.onload = function() {
        ctx.drawImage(img, padding, padding + titleHeight + dateHeight + 20);
        downloadCanvasPNG(canvas, filterInfo);
    };
    
    // Create SVG image source
    var svgData = new XMLSerializer().serializeToString(tableSVG);
    var svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(svgBlob);
    img.src = url;
}

function tableToSVG(table, width, height) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    
    var y = 0;
    var rows = table.querySelectorAll('tr');
    
    rows.forEach(function(row, rowIdx) {
        var x = 0;
        var cells = row.querySelectorAll('td, th');
        var cellHeight = 30;
        
        cells.forEach(function(cell, cellIdx) {
            var cellWidth = cell.offsetWidth;
            var bgColor = window.getComputedStyle(cell).backgroundColor || '#ffffff';
            var textColor = window.getComputedStyle(cell).color || '#000000';
            
            // Draw cell border
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', cellWidth);
            rect.setAttribute('height', cellHeight);
            rect.setAttribute('fill', bgColor);
            rect.setAttribute('stroke', '#cbd5e1');
            rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
            
            // Draw cell text
            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + 5);
            text.setAttribute('y', y + 18);
            text.setAttribute('font-size', '12');
            text.setAttribute('fill', textColor);
            text.setAttribute('font-family', 'Arial');
            var cellText = cell.textContent.trim();
            if (cellText.length > 15) cellText = cellText.substring(0, 12) + '...';
            text.textContent = cellText;
            svg.appendChild(text);
            
            x += cellWidth;
        });
        
        y += cellHeight;
    });
    
    return svg;
}

function downloadCanvasPNG(canvas, title) {
    // Get current date/time for filename
    var now = new Date();
    var filename = 'Matrix_' + 
                   now.getFullYear() + 
                   String(now.getMonth() + 1).padStart(2, '0') +
                   String(now.getDate()).padStart(2, '0') + '_' +
                   String(now.getHours()).padStart(2, '0') +
                   String(now.getMinutes()).padStart(2, '0') +
                   '.png';
    
    // Download PNG
    var link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Matrix Filter Functions (following Topology pattern)
function updateMatrixLocationFilter() {
    var select = document.getElementById('matrixLocationFilter');
    if (!select) return;
    
    var locations = {};
    if (appState.devices) {
        appState.devices.forEach(function(d) {
            if (d.location) locations[d.location] = true;
        });
    }
    
    var currentValue = select.value;
    var html = '<option value="">All Locations</option>';
    Object.keys(locations).sort().forEach(function(loc) {
        html += '<option value="' + loc + '">' + loc + '</option>';
    });
    select.innerHTML = html;
    
    if (currentValue) {
        select.value = currentValue;
    }
    
    updateMatrixGroupFilter();
}

function updateMatrixGroupFilter() {
    var groupSelect = document.getElementById('matrixGroupFilter');
    if (!groupSelect) return;
    
    var locationSelect = document.getElementById('matrixLocationFilter');
    var selectedLocation = locationSelect ? locationSelect.value : '';
    
    var groups = {};
    if (appState.devices) {
        appState.devices.forEach(function(d) {
            if (d.rackId) {
                if (!selectedLocation || d.location === selectedLocation) {
                    groups[d.rackId] = true;
                }
            }
        });
    }
    
    var currentValue = groupSelect.value;
    var html = '<option value="">Filter by Group</option>';
    Object.keys(groups).sort().forEach(function(group) {
        html += '<option value="' + group + '">' + group + '</option>';
    });
    groupSelect.innerHTML = html;
    
    if (currentValue) {
        groupSelect.value = currentValue;
    }
}

function filterMatrixByLocation() {
    updateMatrixGroupFilter();
    updateMatrix();
}

function filterMatrixByGroup() {
    updateMatrix();
}

function getMatrixFilteredDevices() {
    var locationSelect = document.getElementById('matrixLocationFilter');
    var groupSelect = document.getElementById('matrixGroupFilter');
    var selectedLocation = locationSelect ? locationSelect.value : '';
    var selectedGroup = groupSelect ? groupSelect.value : '';
    
    var filtered = [];
    if (appState.devices) {
        appState.devices.forEach(function(d) {
            var matchLocation = !selectedLocation || d.location === selectedLocation;
            var matchGroup = !selectedGroup || d.rackId === selectedGroup;
            if (matchLocation && matchGroup) {
                filtered.push(d);
            }
        });
    }
    
    return filtered.sort(function(a, b) {
        var aOrder = a.order || 0;
        var bOrder = b.order || 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.name || '').localeCompare(b.name || '');
    });
}

function getMatrixFilteredConnections(fromDevices) {
    var fromIds = {};
    fromDevices.forEach(function(d) { fromIds[d.id] = true; });
    
    var filtered = [];
    if (appState.connections) {
        appState.connections.forEach(function(c, idx) {
            if (fromIds[c.from] || fromIds[c.to]) {
                filtered.push({ conn: c, idx: idx });
            }
        });
    }
    
    return filtered;
}

// Initialize drag-to-scroll when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragToScroll);
} else {
    initDragToScroll();
}
