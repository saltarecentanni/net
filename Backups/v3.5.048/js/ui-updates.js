/**
 * TIESSE Matrix Network - UI Update Functions
 * Version: 3.5.044
 * 
 * Contains UI rendering functions:
 * - Device list (cards and table views)
 * - Connection matrix (SVG-based for better export quality)
 * - Connections table
 * - Excel export
 * - Improved print styles
 * - Device and Connection filters
 * - XSS protection with escapeHtml (v3.1.3)
 * - Debounced filter inputs (v3.1.3)
 * - CSS Variables integration (v3.3.0)
 * - SVG Matrix with viewBox zoom/pan (v3.4.0)
 * - Debug mode support (v3.4.5)
 */

'use strict';

// Debug logger fallback (defined in app.js)
if (typeof Debug === 'undefined') {
    var Debug = {
        log: function() {},
        warn: function() {},
        error: function() {}
    };
}

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
    
    // Get unique locations using LocationFilter helper (with codes)
    var locationsWithCode = [];
    if (typeof LocationFilter !== 'undefined' && LocationFilter.getLocationsForFilter) {
        locationsWithCode = LocationFilter.getLocationsForFilter();
    } else {
        // Fallback: collect from devices
        var seen = {};
        var idx = 1;
        for (var i = 0; i < appState.devices.length; i++) {
            var loc = appState.devices[i].location;
            if (loc && !seen[loc]) {
                seen[loc] = true;
                locationsWithCode.push({
                    value: loc,
                    display: String(idx).padStart(2, '0') + ' - ' + loc,
                    code: idx
                });
                idx++;
            }
        }
        locationsWithCode.sort(function(a, b) { return a.code - b.code; });
    }
    
    // Get unique groups and types
    var sources = [];
    var types = [];
    var selectedLocation = appState.deviceFilters.location || '';
    
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        // Only add groups from devices in the selected location (smart filtering)
        if (d.rackId && sources.indexOf(d.rackId) === -1) {
            if (!selectedLocation || d.location === selectedLocation) {
                sources.push(d.rackId);
            }
        }
        // Only add types from devices in the selected location
        if (d.type && types.indexOf(d.type) === -1) {
            if (!selectedLocation || d.location === selectedLocation) {
                types.push(d.type);
            }
        }
    }
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
    html += '<span class="text-xs font-semibold text-slate-600">Filters:</span>';
    
    // Location filter (first, with purple styling) - using optgroups like Actions menu
    var mappedLocsDevices = [], customLocsDevices = [];
    locationsWithCode.forEach(function(loc) {
        if (loc.type === 'mapped') mappedLocsDevices.push(loc);
        else customLocsDevices.push(loc);
    });
    html += '<select id="filterDeviceLocation" onchange="updateDeviceFilter(\'location\', this.value)" class="px-2 py-1 text-xs border-2 border-purple-400 rounded-lg bg-white font-semibold text-slate-800">';
    html += '<option value="">All Locations</option>';
    if (mappedLocsDevices.length > 0) {
        html += '<optgroup label="📍 Mapped Locations" style="color:#334155;font-weight:600">';
        for (var ml = 0; ml < mappedLocsDevices.length; ml++) {
            var selectedML = appState.deviceFilters.location === mappedLocsDevices[ml].value ? ' selected' : '';
            html += '<option value="' + escapeHtml(mappedLocsDevices[ml].value) + '"' + selectedML + ' style="color:#1e293b">' + escapeHtml(mappedLocsDevices[ml].display) + '</option>';
        }
        html += '</optgroup>';
    }
    if (customLocsDevices.length > 0) {
        html += '<optgroup label="🪧 Custom Locations" style="color:#334155;font-weight:600">';
        for (var cl = 0; cl < customLocsDevices.length; cl++) {
            var selectedCL = appState.deviceFilters.location === customLocsDevices[cl].value ? ' selected' : '';
            html += '<option value="' + escapeHtml(customLocsDevices[cl].value) + '"' + selectedCL + ' style="color:#1e293b">' + escapeHtml(customLocsDevices[cl].display) + '</option>';
        }
        html += '</optgroup>';
    }
    html += '</select>';
    
    // Group filter (campo rackId - vedi nota in index.html)
    html += '<select id="filterDeviceSource" onchange="updateDeviceFilter(\'source\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white">';
    html += '<option value="">All Groups</option>';
    for (var s = 0; s < sources.length; s++) {
        var selected = appState.deviceFilters.source === sources[s] ? ' selected' : '';
        html += '<option value="' + escapeHtml(sources[s]) + '"' + selected + '>' + escapeHtml(sources[s]) + '</option>';
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
    html += '<span class="text-xs text-slate-500 ml-auto"><span class="text-red-500 font-bold">✗</span> disabled · <span class="text-amber-600 font-bold">↩</span> rear · <span class="text-orange-500 font-bold">⚠</span> not connected · <span class="text-cyan-500 font-bold">📶</span> wireless · <span class="text-blue-500 font-bold">🌐</span> link</span>';
    
    html += '</div>';
    
    // Warning for generic groups without location filter
    var genericGroups = ['standalone', 'endpoints', 'devices', 'altri', 'other', 'misc'];
    var sourceFilter = (appState.deviceFilters.source || '').toLowerCase();
    var locationFilter = appState.deviceFilters.location || '';
    
    if (sourceFilter && !locationFilter) {
        // Check if it's a generic group name
        var isGenericGroup = genericGroups.some(function(g) {
            return sourceFilter.indexOf(g) !== -1;
        });
        
        if (isGenericGroup) {
            // Count how many locations have this group
            var locationsWithGroup = {};
            for (var gi = 0; gi < appState.devices.length; gi++) {
                var gd = appState.devices[gi];
                if ((gd.rackId || '').toLowerCase().indexOf(sourceFilter) !== -1 && gd.location) {
                    locationsWithGroup[gd.location] = true;
                }
            }
            var locationCount = Object.keys(locationsWithGroup).length;
            
            if (locationCount > 1) {
                html += '<div class="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2 text-xs">';
                html += '<span class="text-amber-600 font-bold">⚠️</span>';
                html += '<span class="text-amber-700">Visualizzando "<strong>' + appState.deviceFilters.source + '</strong>" da <strong>' + locationCount + ' locations</strong> diverse. ';
                html += 'Filtra per <strong>Location</strong> per vedere solo una stanza.</span>';
                html += '</div>';
            }
        }
    }
    
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
        // WiFi devices don't require physical connections
        var isWirelessDevice = ['wifi', 'router_wifi', 'access_point'].indexOf(d.type) !== -1;
        var noConnectionsClass = (totalConnections === 0 && !isWirelessDevice) ? 'border-orange-400 border-2 bg-orange-50' : (totalConnections === 0 && isWirelessDevice) ? 'border-cyan-400 border-2 bg-cyan-50' : 'bg-white';
        var noConnectionsWarning = totalConnections === 0 ? (isWirelessDevice ? '<div class="text-xs mt-1 text-cyan-600 font-semibold">📶 Wireless</div>' : '<div class="text-xs mt-1 text-orange-600 font-semibold">⚠ No connections</div>') : '';

        var addressText = '';
        // Support both addresses[] array (new) and ip1-4 fields (legacy)
        var ipList = [];
        if (d.addresses && d.addresses.length > 0) {
            ipList = d.addresses.map(function(a) { return escapeHtml(a.network || a.ip || ''); }).filter(Boolean);
        } else {
            ipList = [d.ip1, d.ip2, d.ip3, d.ip4].filter(function(ip) { return ip && ip.trim(); }).map(function(ip) { return escapeHtml(ip); });
        }
        if (ipList.length > 0) {
            addressText = '<div class="text-xs mt-1 text-slate-600">IP: <strong>' + ipList.join('</strong>, <strong>') + '</strong></div>';
        }
        
        var locationText = '';
        if (d.location) {
            locationText = '<div class="text-xs mt-1 text-purple-600">📍 ' + escapeHtml(d.location) + '</div>';
        }
        
        var zoneText = '';
        if (d.zone) {
            var zoneLabel = escapeHtml(d.zone);
            if (d.zoneIP) zoneLabel += ' (' + escapeHtml(d.zoneIP) + ')';
            var zoneIcons = {
                'DMZ': '🛡️', 'Backbone': '🔗', 'LAN': '🏢', 'WAN': '🌐',
                'VLAN': '📊', 'VPN': '🔒', 'Cloud': '☁️', 'Guest': '👥',
                'IoT': '📡', 'Servers': '🖥️', 'Management': '⚙️', 'Voice': '📞', 'Storage': '💾'
            };
            var zoneIcon = zoneIcons[d.zone] || '🔲';
            zoneText = '<div class="text-xs mt-1 text-indigo-600">' + zoneIcon + ' ' + zoneLabel + '</div>';
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
            '<span class="inline-flex items-center gap-0.5"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' +
            ((d.isRear || d.rear) ? '<span class="text-[11px] font-bold text-amber-600" title="Rear/Back position">↩</span>' : '') + '</span>' +
            '<span class="text-xs px-1.5 py-0.5 rounded-full text-white ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="font-bold text-base text-slate-800 truncate">' + (disabled ? '<span class="text-red-500" title="Disabled">✗</span> ' : '') + d.name + '</div>' +
            brandModelText +
            '<div class="text-xs text-slate-400 uppercase">' + d.type + '</div>' +
            locationText +
            zoneText +
            addressText +
            '<div class="text-xs mt-1 text-slate-500">' + d.ports.length + ' ports (' + usedPorts + ' used) | ' + totalConnections + ' conn.</div>' +
            noConnectionsWarning +
            '</div>' +
            '<div class="flex flex-col gap-1 ml-2 edit-mode-only">' +
            '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-500 hover:text-green-700 text-sm p-1" title="Add Connection">➕</button>' +
            '<button onclick="copyDevice(' + d.id + ')" class="text-purple-500 hover:text-purple-700 text-sm p-1" title="Duplicate Device">📋</button>' +
            '<button onclick="editDevice(' + d.id + ')" class="text-blue-500 hover:text-blue-700 text-sm p-1" title="Edit Device">✎</button>' +
            '<button onclick="removeDevice(' + d.id + ')" class="text-red-500 hover:text-red-700 text-sm p-1" title="Delete Device">✕</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';
    cont.innerHTML = html;
    
    // Update edit-mode visibility after dynamic rendering
    if (typeof Auth !== 'undefined' && Auth.updateUI) {
        Auth.updateUI();
    }
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
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'location\')">Location' + sortIcon('location') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'rack\')">Group' + sortIcon('rack') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'order\')">Pos' + sortIcon('order') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'name\')">Device' + sortIcon('name') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'brandModel\')">Brand/Model' + sortIcon('brandModel') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'type\')">Type' + sortIcon('type') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'status\')">Status' + sortIcon('status') + '</th>';
    html += '<th class="p-2 text-left">IP/Network</th>';
    html += '<th class="p-2 text-left">Service</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'ports\')">Ports' + sortIcon('ports') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'connections\')">Conn' + sortIcon('connections') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'links\')">Links' + sortIcon('links') + '</th>';
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

        // WiFi devices don't require physical connections
        var isWirelessDevice = ['wifi', 'router_wifi', 'access_point'].indexOf(d.type) !== -1;

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
        var warningClass = (totalConnections === 0 && !isWirelessDevice) ? 'bg-orange-50' : (totalConnections === 0 && isWirelessDevice) ? 'bg-cyan-50' : rowClass;

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
        html += '<td class="p-2 text-center"><span class="inline-flex items-center justify-center gap-0.5" style="min-width:42px"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' + ((d.isRear || d.rear) ? '<span class="text-[10px] text-amber-600 font-bold" title="Rear/Back position">↩</span>' : '<span class="text-[10px] opacity-0">↩</span>') + '</span></td>';
        html += '<td class="p-2 font-semibold text-slate-800">' + (disabled ? '<span class="text-red-500" title="Disabled">✗</span> ' : '') + safeName + '</td>';
        html += '<td class="p-2 text-slate-600">' + (safeBrandModel || '-') + '</td>';
        html += '<td class="p-2 text-slate-500 uppercase">' + safeType + '</td>';
        html += '<td class="p-2 text-center">' + statusBadge + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + safeAddressText + '">' + (safeAddressText || '-') + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + safeService + '">' + (safeService || '-') + '</td>';
        html += '<td class="p-2 text-center"><span class="text-slate-700">' + d.ports.length + '</span> <span class="text-slate-400">(' + usedPorts + ')</span></td>';
        html += '<td class="p-2 text-center">' + (totalConnections === 0 ? (isWirelessDevice ? '<span class="text-cyan-600 font-semibold">📶</span>' : '<span class="text-orange-600 font-semibold">0 ⚠</span>') : '<span class="text-slate-700">' + totalConnections + '</span>') + '</td>';
        // Links column - shows label if defined, otherwise URL
        var linksHtml = (typeof DeviceLinks !== 'undefined' && d.links && d.links.length) ? DeviceLinks.renderLinks(d.links) : '-';
        html += '<td class="p-2 text-center">' + linksHtml + '</td>';
        html += '<td class="p-2 text-center whitespace-nowrap edit-mode-only">';
        html += '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-600 hover:text-green-900 text-xs mr-1" title="Add Connection">+Conn</button>';
        html += '<button onclick="copyDevice(' + d.id + ')" class="text-purple-600 hover:text-purple-900 text-xs mr-1" title="Duplicate Device">Copy</button>';
        html += '<button onclick="editDevice(' + d.id + ')" class="text-blue-600 hover:text-blue-900 text-xs mr-1">Edit</button>';
        html += '<button onclick="removeDevice(' + d.id + ')" class="text-red-600 hover:text-red-900 text-xs">Del</button>';
        html += '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    cont.innerHTML = html;
    
    // Update edit-mode visibility after dynamic rendering
    if (typeof Auth !== 'undefined' && Auth.updateUI) {
        Auth.updateUI();
    }
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
            case 'links':
                valA = a.links ? a.links.length : 0;
                valB = b.links ? b.links.length : 0;
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
// SVG MATRIX MODULE - Hybrid approach: Fixed headers + SVG content
// ============================================================================
var SVGMatrix = (function() {
    var container = null;
    var contentArea = null;
    var svg = null;
    var scale = 1;
    var minScale = 0.3;
    var maxScale = 2.0;
    var cellSize = 90;
    var headerWidth = 100;
    var headerHeight = 90;
    var isPanning = false;
    var panStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };
    
    // Colors from CSS variables (with fallbacks matching styles.css)
    var colors = {
        headerBg: 'var(--matrix-header-bg)',
        rowOdd: 'var(--matrix-row-odd)',
        rowEven: 'var(--color-bg-alt)',
        border: 'var(--color-border)'
    };
    
    function resolveColors() {
        var root = document.documentElement;
        var cs = getComputedStyle(root);
        colors.headerBg = cs.getPropertyValue('--matrix-header-bg').trim() || '#1e293b';
        colors.rowOdd = cs.getPropertyValue('--matrix-row-odd').trim() || '#f8fafc';
        colors.rowEven = cs.getPropertyValue('--color-bg-alt').trim() || '#f1f5f9';
        colors.border = cs.getPropertyValue('--color-border').trim() || '#cbd5e1';
    }
    
    // Track if global window listeners have been attached
    var windowListenersAttached = false;
    
    function init() {
        container = document.getElementById('matrixContainer');
        if (!container) return;
        
        // Attach window-level listeners only once (they handle pan globally)
        if (!windowListenersAttached) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            windowListenersAttached = true;
        }
    }
    
    function handleWheel(e) {
        e.preventDefault();
        
        var delta = e.deltaY > 0 ? 0.9 : 1.1;
        var newScale = Math.max(minScale, Math.min(maxScale, scale * delta));
        
        if (newScale !== scale) {
            scale = newScale;
            applyScale();
            updateZoomLabel();
        }
    }
    
    function handleMouseDown(e) {
        if (e.target.closest('.matrix-cell-clickable')) return;
        
        isPanning = true;
        panStart.x = e.clientX;
        panStart.y = e.clientY;
        panStart.scrollX = contentArea.scrollLeft;
        panStart.scrollY = contentArea.scrollTop;
        contentArea.style.cursor = 'grabbing';
        e.preventDefault();
    }
    
    function handleMouseMove(e) {
        if (!isPanning || !contentArea) return;
        
        var dx = e.clientX - panStart.x;
        var dy = e.clientY - panStart.y;
        
        contentArea.scrollLeft = panStart.scrollX - dx;
        contentArea.scrollTop = panStart.scrollY - dy;
    }
    
    function handleMouseUp() {
        if (isPanning && contentArea) {
            isPanning = false;
            contentArea.style.cursor = 'grab';
        }
    }
    
    function syncHeaders() {
        if (!contentArea) return;
        
        var colHeader = container.querySelector('.matrix-col-headers');
        var rowHeader = container.querySelector('.matrix-row-headers');
        
        if (colHeader) {
            colHeader.scrollLeft = contentArea.scrollLeft;
        }
        if (rowHeader) {
            rowHeader.scrollTop = contentArea.scrollTop;
        }
    }
    
    // Track currently highlighted elements
    var highlightedCol = null;
    var highlightedRow = null;
    var highlightedCell = null;
    
    // Highlight row and column headers when hovering over a cell
    function highlightMatrixHeaders(rowIdx, colIdx, cellElement) {
        if (!container) return;
        
        // Clear previous highlights first
        clearMatrixHeaderHighlight();
        
        var colHeaderInner = container.querySelector('.matrix-col-headers-inner');
        var rowHeaderInner = container.querySelector('.matrix-row-headers-inner');
        
        // Column header - fade to amber with glow
        if (colHeaderInner && colHeaderInner.children[colIdx]) {
            var colEl = colHeaderInner.children[colIdx];
            highlightedCol = colEl;
            // Save original styles
            colEl._originalBg = colEl.style.background;
            colEl._childColors = [];
            Array.from(colEl.children).forEach(function(child, i) {
                colEl._childColors[i] = child.style.color;
            });
            // Apply highlight with CSS variable colors
            colEl.style.transition = 'all 0.25s ease-out';
            colEl.style.background = 'linear-gradient(180deg, var(--color-warning) 0%, var(--color-warning-hover) 100%)';
            colEl.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.3)';
            colEl.style.zIndex = '20';
            Array.from(colEl.children).forEach(function(child) {
                child.style.transition = 'color 0.25s ease-out';
                child.style.color = 'var(--color-text)';
                child.style.textShadow = '0 1px 2px rgba(255,255,255,0.5)';
            });
        }
        
        // Row header - fade to amber with glow
        if (rowHeaderInner && rowHeaderInner.children[rowIdx]) {
            var rowEl = rowHeaderInner.children[rowIdx];
            highlightedRow = rowEl;
            // Save original styles
            rowEl._originalBg = rowEl.style.background;
            rowEl._childColors = [];
            Array.from(rowEl.children).forEach(function(child, i) {
                rowEl._childColors[i] = child.style.color;
            });
            // Apply highlight with CSS variable colors
            rowEl.style.transition = 'all 0.25s ease-out';
            rowEl.style.background = 'linear-gradient(90deg, var(--color-warning) 0%, var(--color-warning-hover) 100%)';
            rowEl.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.3)';
            rowEl.style.zIndex = '20';
            Array.from(rowEl.children).forEach(function(child) {
                child.style.transition = 'color 0.25s ease-out';
                child.style.color = 'var(--color-text)';
                child.style.textShadow = '0 1px 2px rgba(255,255,255,0.5)';
            });
        }
        
        // Cell effect - external glow + internal brightness + subtle pulse
        if (cellElement) {
            highlightedCell = cellElement;
            // Save original fill for inner glow effect
            cellElement._originalFill = cellElement.getAttribute('fill');
            
            // White border glow
            cellElement.setAttribute('stroke', 'var(--color-text-inverse)');
            cellElement.setAttribute('stroke-width', '3');
            
            // Combined filter: external glow + brightness boost
            cellElement.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 15px rgba(251,191,36,0.7)) brightness(1.15)';
            
            // Add inner highlight by adjusting the fill with overlay
            var currentFill = cellElement._originalFill || 'var(--color-info)';
            cellElement.setAttribute('fill', 'url(#cellGradientHover)');
            
            // Create hover gradient dynamically if needed
            var svg = cellElement.closest('svg');
            if (svg && !svg.querySelector('#cellGradientHover')) {
                var defs = svg.querySelector('defs');
                if (defs) {
                    var hoverGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                    hoverGradient.setAttribute('id', 'cellGradientHover');
                    hoverGradient.setAttribute('x1', '0%');
                    hoverGradient.setAttribute('y1', '0%');
                    hoverGradient.setAttribute('x2', '0%');
                    hoverGradient.setAttribute('y2', '100%');
                    hoverGradient.innerHTML = '<stop offset="0%" style="stop-color:rgba(255,255,255,0.4)"/>' +
                        '<stop offset="30%" style="stop-color:' + currentFill + '"/>' +
                        '<stop offset="70%" style="stop-color:' + currentFill + '"/>' +
                        '<stop offset="100%" style="stop-color:rgba(0,0,0,0.2)"/>';
                    defs.appendChild(hoverGradient);
                }
            }
            // Just use brightness since gradient is complex - simpler and works better
            cellElement.setAttribute('fill', currentFill);
        }
    }
    
    // Clear header highlights - only the tracked elements
    function clearMatrixHeaderHighlight() {
        // Restore column header
        if (highlightedCol) {
            highlightedCol.style.transition = 'all 0.3s ease-out';
            highlightedCol.style.background = highlightedCol._originalBg || '';
            highlightedCol.style.boxShadow = '';
            highlightedCol.style.zIndex = '';
            if (highlightedCol._childColors) {
                Array.from(highlightedCol.children).forEach(function(child, i) {
                    child.style.transition = 'color 0.3s ease-out';
                    child.style.color = highlightedCol._childColors[i] || '';
                    child.style.textShadow = '';
                });
            }
            highlightedCol = null;
        }
        
        // Restore row header
        if (highlightedRow) {
            highlightedRow.style.transition = 'all 0.3s ease-out';
            highlightedRow.style.background = highlightedRow._originalBg || '';
            highlightedRow.style.boxShadow = '';
            highlightedRow.style.zIndex = '';
            if (highlightedRow._childColors) {
                Array.from(highlightedRow.children).forEach(function(child, i) {
                    child.style.transition = 'color 0.3s ease-out';
                    child.style.color = highlightedRow._childColors[i] || '';
                    child.style.textShadow = '';
                });
            }
            highlightedRow = null;
        }
        
        // Restore cell
        if (highlightedCell) {
            highlightedCell.removeAttribute('stroke');
            highlightedCell.removeAttribute('stroke-width');
            highlightedCell.style.filter = '';
            // Restore original fill if saved
            if (highlightedCell._originalFill) {
                highlightedCell.setAttribute('fill', highlightedCell._originalFill);
            }
            highlightedCell = null;
        }
    }
    
    function applyScale() {
        // Get the wrapper that contains the entire grid (headers + content)
        var wrapper = container.querySelector('.matrix-wrapper');
        
        if (wrapper) {
            // Use CSS zoom to scale everything together - maintains alignment
            wrapper.style.zoom = scale;
        }
    }
    
    function updateZoomLabel() {
        var label = document.getElementById('matrixZoomLevel');
        if (label) {
            label.textContent = Math.round(scale * 100) + '%';
        }
    }
    
    function zoom(delta) {
        var factor = delta > 0 ? 1.1 : 0.9;
        scale = Math.max(minScale, Math.min(maxScale, scale * factor));
        applyScale();
        updateZoomLabel();
    }
    
    function resetZoom() {
        scale = 1;
        applyScale();
        updateZoomLabel();
        if (contentArea) {
            contentArea.scrollLeft = 0;
            contentArea.scrollTop = 0;
        }
    }
    
    function fit() {
        // Calculate scale to fit all content
        if (!contentArea) return;
        
        var contentWidth = contentArea.scrollWidth / scale;
        var contentHeight = contentArea.scrollHeight / scale;
        var containerWidth = contentArea.clientWidth;
        var containerHeight = contentArea.clientHeight;
        
        var scaleX = containerWidth / contentWidth;
        var scaleY = containerHeight / contentHeight;
        scale = Math.max(minScale, Math.min(maxScale, Math.min(scaleX, scaleY) * 0.95));
        
        applyScale();
        updateZoomLabel();
        contentArea.scrollLeft = 0;
        contentArea.scrollTop = 0;
    }
    
    function escapeXml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    function getRackColor(rackId) {
        if (typeof window.getRackColor === 'function') {
            return window.getRackColor(rackId);
        }
        // Using semantic color names that match CSS variables
        var rackColors = [
            'var(--color-primary)',    // Blue
            'var(--color-success)',    // Green
            'var(--color-accent)',     // Purple
            'var(--color-danger)',     // Red
            'var(--color-orange)',     // Orange
            'var(--conn-lag)',         // Cyan
            'var(--conn-management)',  // Pink
            'var(--color-info)'        // Indigo
        ];
        if (!rackId) return 'var(--color-secondary)';
        var hash = 0;
        for (var i = 0; i < rackId.length; i++) {
            hash = rackId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return rackColors[Math.abs(hash) % rackColors.length];
    }
    
    function getConnectionIndex(fromId, toId) {
        if (typeof window.getConnectionIndex === 'function') {
            return window.getConnectionIndex(fromId, toId);
        }
        for (var i = 0; i < appState.connections.length; i++) {
            var c = appState.connections[i];
            if ((c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)) {
                return i;
            }
        }
        return -1;
    }
    
    function render() {
        container = document.getElementById('matrixContainer');
        if (!container) return;
        
        resolveColors();
        scale = 1;
        
        if (appState.devices.length === 0) {
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400">' +
                '<div class="text-6xl mb-4">📡</div>' +
                '<div class="text-lg font-medium">No devices yet</div>' +
                '<div class="text-sm">Add devices in the Devices tab to see the connection matrix</div>' +
                '</div>';
            return;
        }
        
        var filteredDevices = getMatrixFilteredDevices();
        var sorted = getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc, filteredDevices);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400">' +
                '<div class="text-5xl mb-4">🔍</div>' +
                '<div class="text-lg font-medium">No devices match the current filters</div>' +
                '<div class="text-sm">Try adjusting filters above</div>' +
                '</div>';
            return;
        }
        
        var deviceCount = sorted.length;
        var filteredDeviceIds = {};
        sorted.forEach(function(d) { filteredDeviceIds[d.id] = true; });
        
        // Check for special columns
        var hasWallJack = false;
        var hasExternal = false;
        var wallJackConns = [];
        var externalConns = [];
        
        appState.connections.forEach(function(c, idx) {
            if (!filteredDeviceIds[c.from]) return;
            if (c.to === null || c.to === undefined) {
                if (c.isWallJack || c.type === 'wallport') {
                    hasWallJack = true;
                    wallJackConns.push({ conn: c, idx: idx });
                } else if (c.externalDest || c.type === 'wan' || c.type === 'external') {
                    hasExternal = true;
                    externalConns.push({ conn: c, idx: idx });
                }
            }
        });
        
        var extraCols = (hasWallJack ? 1 : 0) + (hasExternal ? 1 : 0);
        var totalCols = deviceCount + extraCols;
        var contentWidth = totalCols * cellSize;
        var contentHeight = deviceCount * cellSize;
        
        // Build hybrid structure: Corner + Col Headers + Row Headers + Content
        var html = '<div class="matrix-wrapper" style="display:grid;grid-template-columns:' + headerWidth + 'px 1fr;grid-template-rows:' + headerHeight + 'px 1fr;height:100%;overflow:hidden;">';
        
        // Corner cell (fixed)
        html += '<div class="matrix-corner" style="background:' + colors.headerBg + ';z-index:30;display:flex;align-items:center;justify-content:center;border-radius:8px 0 0 0;">' +
            '<div style="text-align:center;">' +
            '<div style="color:var(--color-info);font-size:10px;font-weight:bold;">TO →</div>' +
            '<div style="color:var(--color-warning);font-size:10px;font-weight:bold;">FROM ↓</div>' +
            '</div></div>';
        
        // Column headers (horizontal scroll synced with content)
        html += '<div class="matrix-col-headers" style="overflow:hidden;background:' + colors.headerBg + ';">' +
            '<div class="matrix-col-headers-inner" style="display:flex;width:' + contentWidth + 'px;height:' + headerHeight + 'px;">';
        
        for (var i = 0; i < sorted.length; i++) {
            var d = sorted[i];
            var rackColor = getRackColor(d.rackId);
            var posNum = String(d.order || 0).padStart(2, '0');
            var isDisabled = d.status === 'disabled';
            
            html += '<div style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:100%;background:' + colors.headerBg + ';border-left:3px solid ' + rackColor + ';display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;" title="' + escapeXml(d.name) + '">' +
                '<div style="font-size:8px;color:var(--matrix-col-location);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">' + escapeXml(d.location || '-') + '</div>' +
                '<div style="font-size:9px;font-weight:bold;color:' + (isDisabled ? 'var(--color-text-light)' : 'var(--color-text-inverse)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;' + (isDisabled ? 'text-decoration:line-through;' : '') + '">' + posNum + '-' + escapeXml(d.name) + '</div>' +
                '<div style="font-size:8px;font-weight:600;color:' + rackColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">' + escapeXml(d.rackId || '-') + '</div>' +
                '</div>';
        }
        
        // Special column headers
        if (hasWallJack) {
            html += '<div style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:100%;background:' + colors.headerBg + ';border-left:3px solid var(--color-warning-dark);display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<div style="font-size:20px;">🔌</div>' +
                '<div style="font-size:9px;font-weight:600;color:var(--color-primary-light);">Wall Jack</div>' +
                '</div>';
        }
        if (hasExternal) {
            html += '<div style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:100%;background:' + colors.headerBg + ';border-left:3px solid var(--color-danger);display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<div style="font-size:20px;">🌐</div>' +
                '<div style="font-size:9px;font-weight:600;color:var(--color-danger-light);">External</div>' +
                '</div>';
        }
        
        html += '</div></div>'; // end col headers
        
        // Row headers (vertical scroll synced with content)
        // Add +2px to height to ensure last row border is fully visible
        html += '<div class="matrix-row-headers" style="overflow:hidden;background:' + colors.rowOdd + ';">' +
            '<div class="matrix-row-headers-inner" style="width:' + headerWidth + 'px;height:' + (contentHeight + 2) + 'px;">';
        
        for (var r = 0; r < sorted.length; r++) {
            var row = sorted[r];
            var rowRackColor = getRackColor(row.rackId);
            var rowPosNum = String(row.order || 0).padStart(2, '0');
            var rowDisabled = row.status === 'disabled';
            var rowBg = r % 2 === 0 ? colors.rowOdd : colors.rowEven;
            
            html += '<div style="width:100%;height:' + cellSize + 'px;background:' + rowBg + ';border-left:3px solid ' + rowRackColor + ';border-bottom:1px solid ' + colors.border + ';display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;" title="' + escapeXml(row.name) + '">' +
                '<div style="font-size:8px;color:var(--matrix-row-location);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">' + escapeXml(row.location || '-') + '</div>' +
                '<div style="font-size:9px;font-weight:bold;color:' + (rowDisabled ? 'var(--color-text-light)' : 'var(--color-text)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;' + (rowDisabled ? 'text-decoration:line-through;' : '') + '">' + rowPosNum + '-' + escapeXml(row.name) + '</div>' +
                '<div style="font-size:8px;font-weight:600;color:' + rowRackColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">' + escapeXml(row.rackId || '-') + '</div>' +
                '</div>';
        }
        
        html += '</div></div>'; // end row headers
        
        // Content area (scrollable, contains SVG)
        // Add extra pixels to ensure last row/col borders and hover areas are fully visible
        var svgWidth = contentWidth + 2;
        var svgHeight = contentHeight + 2;
        html += '<div class="matrix-content" style="overflow:auto;cursor:grab;background:linear-gradient(135deg, var(--color-bg) 0%, var(--color-border) 100%);">' +
            '<div class="matrix-svg-content" style="width:' + svgWidth + 'px;height:' + svgHeight + 'px;">';
        
        // Build SVG for data cells - add extra space for borders
        html += '<svg id="svgMatrix" width="' + svgWidth + '" height="' + svgHeight + '" ' +
            'data-total-width="' + contentWidth + '" data-total-height="' + contentHeight + '" ' +
            'style="display:block;" xmlns="http://www.w3.org/2000/svg">';
        
        // Defs
        html += '<defs>' +
            '<pattern id="diagonalStripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
            '<rect width="3" height="6" fill="var(--color-text-lighter)"/><rect x="3" width="3" height="6" fill="var(--color-border)"/>' +
            '</pattern>' +
            // Gradient for connection cells - makes them look 3D
            '<linearGradient id="cellGradient" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/>' +
            '<stop offset="50%" style="stop-color:rgba(255,255,255,0)"/>' +
            '<stop offset="100%" style="stop-color:rgba(0,0,0,0.15)"/>' +
            '</linearGradient>' +
            // Inner glow filter for hover effect
            '<filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">' +
            '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>' +
            '<feOffset in="blur" dx="0" dy="0" result="offsetBlur"/>' +
            '<feFlood flood-color="white" flood-opacity="0.7" result="color"/>' +
            '<feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>' +
            '<feComposite in="shadow" in2="SourceGraphic" operator="over"/>' +
            '</filter>' +
            '</defs>';
        
        // Data cells
        for (var r = 0; r < sorted.length; r++) {
            var row = sorted[r];
            var y = r * cellSize;
            var rowBg = r % 2 === 0 ? colors.rowOdd : colors.rowEven;
            
            for (var c = 0; c < sorted.length; c++) {
                var col = sorted[c];
                var x = c * cellSize;
                
                if (row.id === col.id) {
                    // Diagonal
                    html += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="url(#diagonalStripes)" stroke="' + colors.border + '"/>';
                } else {
                    var connIdx = getConnectionIndex(row.id, col.id);
                    
                    // Cell background
                    html += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="' + rowBg + '" stroke="' + colors.border + '"/>';
                    
                    if (connIdx >= 0) {
                        var conn = appState.connections[connIdx];
                        var connColor = conn.color || (config.connColors ? config.connColors[conn.type] : null) || 'var(--color-info)';
                        var isConnDisabled = conn.status === 'disabled';
                        var portFrom = conn.from === row.id ? conn.fromPort : conn.toPort;
                        var portTo = conn.from === row.id ? conn.toPort : conn.fromPort;
                        var cableColor = conn.cableColor || 'var(--color-warning)';
                        
                        // Main cell background with rounded corners and shadow
                        html += '<rect class="matrix-cell-clickable" x="' + (x+4) + '" y="' + (y+4) + '" width="' + (cellSize-8) + '" height="' + (cellSize-8) + '" rx="6" fill="' + connColor + '"' + (isConnDisabled ? ' opacity="0.4"' : '') + ' style="cursor:pointer" data-conn-idx="' + connIdx + '" data-row="' + r + '" data-col="' + c + '"/>';
                        
                        // Overlay gradient for 3D effect
                        html += '<rect x="' + (x+4) + '" y="' + (y+4) + '" width="' + (cellSize-8) + '" height="' + (cellSize-8) + '" rx="6" fill="url(#cellGradient)" style="pointer-events:none"/>';
                        
                        // Top port (TO/COLUMN) - cyan tint to match column header position (top)
                        html += '<rect x="' + (x+12) + '" y="' + (y+12) + '" width="' + (cellSize-24) + '" height="18" rx="4" fill="rgba(34,211,238,0.35)" stroke="rgba(34,211,238,0.5)" stroke-width="1" style="pointer-events:none"/>';
                        html += '<text x="' + (x+cellSize/2) + '" y="' + (y+25) + '" fill="white" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle" style="pointer-events:none">' + escapeXml((portTo || '?').substring(0,8)) + '</text>';
                        
                        // Connection arrow/indicator
                        html += '<text x="' + (x+cellSize/2) + '" y="' + (y+43) + '" fill="rgba(255,255,255,0.7)" font-size="12" font-weight="bold" text-anchor="middle" style="pointer-events:none">⇅</text>';
                        
                        // Bottom port (FROM/ROW) - amber tint to match row header position (left side)
                        html += '<rect x="' + (x+12) + '" y="' + (y+48) + '" width="' + (cellSize-24) + '" height="18" rx="4" fill="rgba(251,191,36,0.35)" stroke="rgba(251,191,36,0.5)" stroke-width="1" style="pointer-events:none"/>';
                        html += '<text x="' + (x+cellSize/2) + '" y="' + (y+61) + '" fill="white" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle" style="pointer-events:none">' + escapeXml((portFrom || '?').substring(0,8)) + '</text>';
                        
                        // Cable marker - official pill style with black border (same as tooltip)
                        if (conn.cableMarker) {
                            var markerText = conn.cableMarker.toUpperCase().substring(0,4);
                            // Light colors need dark text: white, yellow, light colors
                            var isLightColor = cableColor === '#ffffff' || cableColor === '#eab308' || cableColor === 'var(--color-text-inverse)' || cableColor === '' || cableColor === 'var(--color-warning)';
                            var markerTextColor = isLightColor ? 'var(--color-text)' : 'var(--color-text-inverse)';
                            // Pill with rounded ends and black border - compact size
                            html += '<rect x="' + (x+cellSize/2-16) + '" y="' + (y+70) + '" width="32" height="14" rx="7" fill="' + cableColor + '" stroke="var(--color-text)" stroke-width="1.5" style="pointer-events:none"/>';
                            html += '<text x="' + (x+cellSize/2) + '" y="' + (y+80) + '" fill="' + markerTextColor + '" font-size="8" font-weight="bold" text-anchor="middle" style="pointer-events:none">' + escapeXml(markerText) + '</text>';
                        }
                    }
                }
            }
            
            // Wall Jack column
            if (hasWallJack) {
                var wjX = deviceCount * cellSize;
                var wjConn = null, wjConnIdx = -1;
                for (var wj = 0; wj < wallJackConns.length; wj++) {
                    if (wallJackConns[wj].conn.from === row.id) { wjConn = wallJackConns[wj].conn; wjConnIdx = wallJackConns[wj].idx; break; }
                }
                html += '<rect x="' + wjX + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="var(--color-primary-lightest)" stroke="var(--color-primary-light)"/>';
                if (wjConn) {
                    html += '<rect class="matrix-cell-clickable" x="' + (wjX+4) + '" y="' + (y+4) + '" width="' + (cellSize-8) + '" height="' + (cellSize-8) + '" rx="4" fill="var(--color-warning-dark)" style="cursor:pointer" data-conn-idx="' + wjConnIdx + '" data-row="' + r + '" data-col="' + deviceCount + '"/>';
                    html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+38) + '" fill="white" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle" style="pointer-events:none">' + escapeXml(wjConn.fromPort || '-') + '</text>';
                    html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+55) + '" fill="rgba(255,255,255,0.8)" font-size="11" font-family="monospace" text-anchor="middle" style="pointer-events:none">→' + escapeXml((wjConn.externalDest || 'WJ').substring(0,6)) + '</text>';
                }
            }
            
            // External column
            if (hasExternal) {
                var extX = deviceCount * cellSize + (hasWallJack ? cellSize : 0);
                var extConn = null, extConnIdx = -1;
                for (var ex = 0; ex < externalConns.length; ex++) {
                    if (externalConns[ex].conn.from === row.id) { extConn = externalConns[ex].conn; extConnIdx = externalConns[ex].idx; break; }
                }
                html += '<rect x="' + extX + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="var(--color-danger-lightest)" stroke="var(--color-danger-light)"/>';
                if (extConn) {
                    var extColIdx = deviceCount + (hasWallJack ? 1 : 0);
                    html += '<rect class="matrix-cell-clickable" x="' + (extX+4) + '" y="' + (y+4) + '" width="' + (cellSize-8) + '" height="' + (cellSize-8) + '" rx="4" fill="var(--color-danger)" style="cursor:pointer" data-conn-idx="' + extConnIdx + '" data-row="' + r + '" data-col="' + extColIdx + '"/>';
                    html += '<text x="' + (extX+cellSize/2) + '" y="' + (y+38) + '" fill="white" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle" style="pointer-events:none">' + escapeXml(extConn.fromPort || '-') + '</text>';
                    html += '<text x="' + (extX+cellSize/2) + '" y="' + (y+55) + '" fill="rgba(255,255,255,0.8)" font-size="11" font-family="monospace" text-anchor="middle" style="pointer-events:none">→' + escapeXml((extConn.externalDest || 'EXT').substring(0,6)) + '</text>';
                }
            }
        }
        
        // Draw explicit grid lines for all rows and columns to ensure borders are always visible
        // Horizontal lines (including top and bottom)
        for (var hl = 0; hl <= sorted.length; hl++) {
            var lineY = hl * cellSize;
            html += '<line x1="0" y1="' + lineY + '" x2="' + contentWidth + '" y2="' + lineY + '" stroke="' + colors.border + '" stroke-width="1"/>';
        }
        // Vertical lines (including left and right)
        for (var vl = 0; vl <= totalCols; vl++) {
            var lineX = vl * cellSize;
            html += '<line x1="' + lineX + '" y1="0" x2="' + lineX + '" y2="' + contentHeight + '" stroke="' + colors.border + '" stroke-width="1"/>';
        }
        
        html += '</svg></div></div>'; // end content
        html += '</div>'; // end wrapper
        
        container.innerHTML = html;
        svg = document.getElementById('svgMatrix');
        contentArea = container.querySelector('.matrix-content');
        
        // Setup click handlers
        var cells = container.querySelectorAll('.matrix-cell-clickable');
        cells.forEach(function(cell) {
            cell.addEventListener('click', function() {
                var connIdx = parseInt(this.dataset.connIdx);
                if (!isNaN(connIdx) && typeof editConnection === 'function') {
                    editConnection(connIdx);
                }
            });
            cell.addEventListener('mouseenter', function(e) {
                var connIdx = parseInt(this.dataset.connIdx);
                var rowIdx = parseInt(this.dataset.row);
                var colIdx = parseInt(this.dataset.col);
                if (!isNaN(connIdx)) showMatrixTooltip(e, connIdx);
                if (!isNaN(rowIdx) && !isNaN(colIdx)) highlightMatrixHeaders(rowIdx, colIdx, this);
            });
            cell.addEventListener('mouseleave', function() {
                hideMatrixTooltip();
                clearMatrixHeaderHighlight();
            });
        });
        
        // Re-attach event handlers EVERY render (since DOM is rebuilt)
        if (contentArea) {
            // Zoom on scroll
            contentArea.addEventListener('wheel', handleWheel, { passive: false });
            
            // Pan by dragging
            contentArea.addEventListener('mousedown', handleMouseDown);
            
            // Sync headers with scroll
            contentArea.addEventListener('scroll', syncHeaders);
            
            // Set initial cursor
            contentArea.style.cursor = 'grab';
        }
        
        // Ensure global window listeners are attached (only once)
        init();
        
        updateZoomLabel();
    }
    
    function exportPNG() {
        if (!container || !svg) {
            Toast.warning('No matrix to export');
            return;
        }
        
        Toast.info('Generating PNG... Please wait');
        
        // Build filename
        var parts = ['Matrix'];
        var fileParts = ['Tiesse-Matrix'];
        
        var locationFilter = document.getElementById('matrixLocationFilter');
        if (locationFilter && locationFilter.value) {
            parts.push(locationFilter.value);
            fileParts.push(locationFilter.value.toLowerCase().replace(/\s+/g, '-'));
        }
        
        var groupFilter = document.getElementById('matrixGroupFilter');
        if (groupFilter && groupFilter.value) {
            parts.push(groupFilter.value);
            fileParts.push(groupFilter.value.toLowerCase().replace(/\s+/g, '-'));
        }
        
        var now = new Date();
        var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        fileParts.push(dateStr);
        
        var title = parts.join(' - ') + ' - ' + dateStr;
        var filename = fileParts.join('_') + '.png';
        
        // Get the wrapper which contains everything
        var wrapper = container.querySelector('.matrix-wrapper');
        if (!wrapper) {
            Toast.error('Matrix wrapper not found');
            return;
        }
        
        // Store original zoom and reset temporarily
        var originalZoom = wrapper.style.zoom || '1';
        wrapper.style.zoom = '1';
        
        // Get sorted devices and calculate dimensions exactly like render()
        var filteredDevices = getMatrixFilteredDevices();
        var sorted = getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc, filteredDevices);
        var deviceCount = sorted.length;
        
        // Build device ID lookup
        var filteredDeviceIds = {};
        for (var fd = 0; fd < sorted.length; fd++) {
            filteredDeviceIds[sorted[fd].id] = true;
        }
        
        // Detect special columns (Wall Jack / External)
        var hasWallJack = false, hasExternal = false;
        appState.connections.forEach(function(c) {
            if (!filteredDeviceIds[c.from]) return;
            if (c.to === null || c.to === undefined) {
                if (c.isWallJack || c.type === 'wallport') hasWallJack = true;
                else if (c.externalDest || c.type === 'wan' || c.type === 'external') hasExternal = true;
            }
        });
        
        var extraCols = (hasWallJack ? 1 : 0) + (hasExternal ? 1 : 0);
        var totalCols = deviceCount + extraCols;
        
        // Calculate full dimensions
        var contentWidth = totalCols * cellSize;
        var contentHeight = deviceCount * cellSize;
        var fullWidth = headerWidth + contentWidth;
        var fullHeight = headerHeight + contentHeight;
        
        // Canvas settings
        var exportScale = 2;
        var titleHeight = 60;
        
        // Protect against browser canvas limits
        var maxCanvasSize = 16384;
        var canvasWidth = fullWidth * exportScale;
        var canvasHeight = (fullHeight + titleHeight) * exportScale;
        
        if (canvasWidth > maxCanvasSize || canvasHeight > maxCanvasSize) {
            var scaleDown = Math.min(maxCanvasSize / canvasWidth, maxCanvasSize / canvasHeight);
            canvasWidth = Math.floor(canvasWidth * scaleDown);
            canvasHeight = Math.floor(canvasHeight * scaleDown);
            exportScale = exportScale * scaleDown;
            Toast.info('Large matrix - adjusting resolution');
        }
        
        // Clone the SVG and prepare it for export
        var svgClone = svg.cloneNode(true);
        svgClone.setAttribute('width', contentWidth);
        svgClone.setAttribute('height', contentHeight);
        svgClone.removeAttribute('id');
        
        // Create a complete SVG document with headers
        var exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        exportSvg.setAttribute('width', fullWidth);
        exportSvg.setAttribute('height', fullHeight);
        
        // Add style definitions
        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = 'text, tspan { font-family: Arial, Helvetica, sans-serif; }';
        defs.appendChild(style);
        exportSvg.appendChild(defs);
        
        // Background
        var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', 'var(--color-bg)');
        exportSvg.appendChild(bg);
        
        // Helper function to create SVG elements
        function createSvgRect(x, y, w, h, fill, opts) {
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', w);
            rect.setAttribute('height', h);
            rect.setAttribute('fill', fill);
            if (opts) {
                if (opts.rx) rect.setAttribute('rx', opts.rx);
                if (opts.stroke) rect.setAttribute('stroke', opts.stroke);
            }
            return rect;
        }
        
        function createSvgText(x, y, text, fill, fontSize, opts) {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', x);
            t.setAttribute('y', y);
            t.setAttribute('fill', fill);
            t.setAttribute('font-size', fontSize);
            t.setAttribute('text-anchor', 'middle');
            if (opts) {
                if (opts.fontWeight) t.setAttribute('font-weight', opts.fontWeight);
                if (opts.textDecoration) t.setAttribute('text-decoration', opts.textDecoration);
            }
            t.textContent = text;
            return t;
        }
        
        // Corner cell
        exportSvg.appendChild(createSvgRect(0, 0, headerWidth, headerHeight, colors.headerBg, {rx: '8'}));
        exportSvg.appendChild(createSvgText(headerWidth/2, headerHeight/2 - 8, 'TO →', 'var(--color-info)', '10', {fontWeight: 'bold'}));
        exportSvg.appendChild(createSvgText(headerWidth/2, headerHeight/2 + 8, 'FROM ↓', 'var(--color-warning)', '10', {fontWeight: 'bold'}));
        
        // Column headers
        for (var i = 0; i < sorted.length; i++) {
            var d = sorted[i];
            var x = headerWidth + i * cellSize;
            var rackColor = getRackColor(d.rackId);
            var posNum = String(d.order || 0).padStart(2, '0');
            var isDisabled = d.status === 'disabled';
            var textColor = isDisabled ? 'var(--color-text-light)' : 'var(--color-text-inverse)';
            
            exportSvg.appendChild(createSvgRect(x, 0, cellSize, headerHeight, colors.headerBg));
            exportSvg.appendChild(createSvgRect(x, 0, 3, headerHeight, rackColor));
            exportSvg.appendChild(createSvgText(x + cellSize/2, 25, d.location || '-', 'var(--matrix-col-location)', '8'));
            
            var nameText = createSvgText(x + cellSize/2, 48, posNum + '-' + (d.name || '').substring(0,10), textColor, '9', {fontWeight: 'bold'});
            if (isDisabled) nameText.setAttribute('text-decoration', 'line-through');
            exportSvg.appendChild(nameText);
            
            exportSvg.appendChild(createSvgText(x + cellSize/2, 70, d.rackId || '-', rackColor, '8', {fontWeight: 'bold'}));
        }
        
        // Wall Jack header
        if (hasWallJack) {
            var wjX = headerWidth + deviceCount * cellSize;
            exportSvg.appendChild(createSvgRect(wjX, 0, cellSize, headerHeight, colors.headerBg));
            exportSvg.appendChild(createSvgRect(wjX, 0, 3, headerHeight, 'var(--color-warning-dark)'));
            exportSvg.appendChild(createSvgText(wjX + cellSize/2, 40, '🔌', 'var(--color-primary-light)', '20'));
            exportSvg.appendChild(createSvgText(wjX + cellSize/2, 65, 'Wall Jack', 'var(--color-primary-light)', '9', {fontWeight: '600'}));
        }
        
        // External header
        if (hasExternal) {
            var extX = headerWidth + deviceCount * cellSize + (hasWallJack ? cellSize : 0);
            exportSvg.appendChild(createSvgRect(extX, 0, cellSize, headerHeight, colors.headerBg));
            exportSvg.appendChild(createSvgRect(extX, 0, 3, headerHeight, 'var(--color-danger)'));
            exportSvg.appendChild(createSvgText(extX + cellSize/2, 40, '🌐', 'var(--color-danger-light)', '20'));
            exportSvg.appendChild(createSvgText(extX + cellSize/2, 65, 'ISP', 'var(--color-danger-light)', '9', {fontWeight: '600'}));
        }
        
        // Row headers
        for (var r = 0; r < sorted.length; r++) {
            var row = sorted[r];
            var y = headerHeight + r * cellSize;
            var rowRackColor = getRackColor(row.rackId);
            var rowPosNum = String(row.order || 0).padStart(2, '0');
            var rowBg = r % 2 === 0 ? colors.rowOdd : colors.rowEven;
            var rowDisabled = row.status === 'disabled';
            var rowTextColor = rowDisabled ? 'var(--color-text-light)' : 'var(--color-text)';
            
            exportSvg.appendChild(createSvgRect(0, y, headerWidth, cellSize, rowBg));
            exportSvg.appendChild(createSvgRect(0, y, 3, cellSize, rowRackColor));
            
            // Bottom border for row
            var rowBorder = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rowBorder.setAttribute('x1', 0);
            rowBorder.setAttribute('y1', y + cellSize);
            rowBorder.setAttribute('x2', fullWidth);
            rowBorder.setAttribute('y2', y + cellSize);
            rowBorder.setAttribute('stroke', colors.border);
            rowBorder.setAttribute('stroke-width', '1');
            exportSvg.appendChild(rowBorder);
            
            exportSvg.appendChild(createSvgText(headerWidth/2, y + 25, row.location || '-', 'var(--matrix-row-location)', '8'));
            
            var rowNameText = createSvgText(headerWidth/2, y + 48, rowPosNum + '-' + (row.name || '').substring(0,10), rowTextColor, '9', {fontWeight: 'bold'});
            if (rowDisabled) rowNameText.setAttribute('text-decoration', 'line-through');
            exportSvg.appendChild(rowNameText);
            
            exportSvg.appendChild(createSvgText(headerWidth/2, y + 70, row.rackId || '-', rowRackColor, '8', {fontWeight: 'bold'}));
        }
        
        // Add cloned SVG content (data cells) translated to correct position
        var contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        contentGroup.setAttribute('transform', 'translate(' + headerWidth + ',' + headerHeight + ')');
        
        // Transfer all children from cloned SVG
        while (svgClone.firstChild) {
            contentGroup.appendChild(svgClone.firstChild);
        }
        exportSvg.appendChild(contentGroup);
        
        // Serialize using XMLSerializer for proper Unicode handling
        var serializer = new XMLSerializer();
        var svgStr = serializer.serializeToString(exportSvg);
        
        // Create canvas and image
        var canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        var ctx = canvas.getContext('2d');
        
        var img = new Image();
        var drawWidth = canvasWidth;
        var drawHeight = canvasHeight - (titleHeight * exportScale);
        
        img.onload = function() {
            ctx.fillStyle = 'var(--color-bg)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw title
            ctx.fillStyle = 'var(--color-text)';
            ctx.font = 'bold ' + Math.round(22 * exportScale) + 'px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, Math.round(40 * exportScale));
            
            // Draw matrix
            ctx.drawImage(img, 0, Math.round(titleHeight * exportScale), drawWidth, drawHeight);
            
            try {
                var link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                wrapper.style.zoom = originalZoom;
                Toast.success('PNG exported: ' + filename);
            } catch (e) {
                wrapper.style.zoom = originalZoom;
                Toast.error('Export failed: ' + e.message);
            }
        };
        
        img.onerror = function(e) {
            wrapper.style.zoom = originalZoom;
            Debug.error('Image load error:', e);
            Toast.error('Export failed - could not render image');
        };
        
        // Use blob URL for better compatibility with Unicode
        try {
            var blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
            var url = URL.createObjectURL(blob);
            img.onload = function() {
                ctx.fillStyle = 'var(--color-bg)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'var(--color-text)';
                ctx.font = 'bold ' + Math.round(22 * exportScale) + 'px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(title, canvas.width / 2, Math.round(40 * exportScale));
                
                ctx.drawImage(img, 0, Math.round(titleHeight * exportScale), drawWidth, drawHeight);
                
                URL.revokeObjectURL(url);
                
                try {
                    var link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    wrapper.style.zoom = originalZoom;
                    Toast.success('PNG exported: ' + filename);
                } catch (e) {
                    wrapper.style.zoom = originalZoom;
                    Toast.error('Export failed: ' + e.message);
                }
            };
            img.src = url;
        } catch (e) {
            wrapper.style.zoom = originalZoom;
            Debug.error('SVG encoding error:', e);
            Toast.error('Export failed - encoding error');
        }
    }
    
    return {
        init: init,
        render: render,
        zoom: zoom,
        resetZoom: resetZoom,
        fit: fit,
        exportPNG: exportPNG
    };
})();

// ============================================================================
// MATRIX UPDATE (Wrapper for SVGMatrix module)
// ============================================================================

// Matrix view state
var matrixFilters = {
    location: '',
    group: '',
    onlyConnected: true  // Default: only show devices with connections
};

// Matrix Filters - Topology Style
function updateMatrixFilters() {
    var locationSelect = document.getElementById('matrixLocationFilter');
    var groupSelect = document.getElementById('matrixGroupFilter');
    
    if (!locationSelect || !groupSelect) return;
    
    // Use LocationFilter helper for consistent display with codes
    var locationsWithCode = [];
    if (typeof LocationFilter !== 'undefined' && LocationFilter.getLocationsForFilter) {
        locationsWithCode = LocationFilter.getLocationsForFilter();
    } else {
        // Fallback: collect from devices
        var seen = {};
        var idx = 1;
        appState.devices.forEach(function(d) {
            if (d.location && d.location.trim()) {
                var loc = d.location.trim();
                if (!seen[loc]) {
                    seen[loc] = true;
                    locationsWithCode.push({
                        value: loc,
                        display: String(idx).padStart(2, '0') + ' - ' + loc,
                        code: idx
                    });
                    idx++;
                }
            }
        });
        locationsWithCode.sort(function(a, b) { return a.code - b.code; });
    }
    
    // Get unique groups
    var groups = {};
    appState.devices.forEach(function(d) {
        if (d.rackId && d.rackId.trim()) {
            // If location filter is active, only show groups from that location
            if (!matrixFilters.location || d.location === matrixFilters.location) {
                groups[d.rackId.trim()] = true;
            }
        }
    });
    
    // Update location dropdown with codes and optgroups like Actions menu
    var currentLocation = locationSelect.value;
    locationSelect.innerHTML = '<option value="">📍 All Locations</option>';
    
    // Separate mapped vs custom locations
    var mappedLocsMatrix = [], customLocsMatrix = [];
    locationsWithCode.forEach(function(loc) {
        if (loc.type === 'mapped') mappedLocsMatrix.push(loc);
        else customLocsMatrix.push(loc);
    });
    
    // Add mapped locations optgroup
    if (mappedLocsMatrix.length > 0) {
        var optgroup1 = document.createElement('optgroup');
        optgroup1.label = '📍 Mapped Locations';
        optgroup1.style.color = '#334155';
        optgroup1.style.fontWeight = '600';
        mappedLocsMatrix.forEach(function(loc) {
            var option = document.createElement('option');
            option.value = loc.value;
            option.textContent = loc.display;
            option.style.color = '#1e293b';
            if (loc.value === currentLocation) option.selected = true;
            optgroup1.appendChild(option);
        });
        locationSelect.appendChild(optgroup1);
    }
    
    // Add custom locations optgroup
    if (customLocsMatrix.length > 0) {
        var optgroup2 = document.createElement('optgroup');
        optgroup2.label = '🪧 Custom Locations';
        optgroup2.style.color = '#334155';
        optgroup2.style.fontWeight = '600';
        customLocsMatrix.forEach(function(loc) {
            var option = document.createElement('option');
            option.value = loc.value;
            option.textContent = loc.display;
            option.style.color = '#1e293b';
            if (loc.value === currentLocation) option.selected = true;
            optgroup2.appendChild(option);
        });
        locationSelect.appendChild(optgroup2);
    }
    
    // Update group dropdown
    var currentGroup = groupSelect.value;
    groupSelect.innerHTML = '<option value="">🗄️ All Groups</option>';
    Object.keys(groups).sort().forEach(function(grp) {
        var option = document.createElement('option');
        option.value = grp;
        option.textContent = grp;
        if (grp === currentGroup) option.selected = true;
        groupSelect.appendChild(option);
    });
}

// Filter handler functions - called from HTML onchange events
function filterMatrixByLocation() {
    var select = document.getElementById('matrixLocationFilter');
    matrixFilters.location = select ? select.value : '';
    
    // Reset group filter when location changes
    matrixFilters.group = '';
    var groupSelect = document.getElementById('matrixGroupFilter');
    if (groupSelect) groupSelect.value = '';
    
    updateMatrixFilters();
    updateMatrix();
}

function filterMatrixByGroup() {
    var select = document.getElementById('matrixGroupFilter');
    matrixFilters.group = select ? select.value : '';
    updateMatrix();
}

function toggleMatrixOnlyConnected() {
    var checkbox = document.getElementById('matrixOnlyConnected');
    matrixFilters.onlyConnected = checkbox ? checkbox.checked : true;
    updateMatrix();
}

// Zoom wrapper functions - delegate to SVGMatrix module
function zoomMatrix(delta) {
    if (typeof SVGMatrix !== 'undefined' && SVGMatrix.zoom) {
        SVGMatrix.zoom(delta);
    }
}

function resetMatrixZoom() {
    if (typeof SVGMatrix !== 'undefined' && SVGMatrix.resetZoom) {
        SVGMatrix.resetZoom();
    }
}

function fitMatrixView() {
    if (typeof SVGMatrix !== 'undefined' && SVGMatrix.fit) {
        SVGMatrix.fit();
    }
}

// Export Matrix PNG - wrapper for SVGMatrix module
function exportMatrixPNG() {
    if (typeof SVGMatrix !== 'undefined' && SVGMatrix.exportPNG) {
        SVGMatrix.exportPNG();
    } else {
        Toast.warning('Matrix not ready for export');
    }
}

// Helper function to get connection color by type
function getConnTypeColor(type) {
    var colors = {
        'ethernet': '#3b82f6',
        'fiber': '#22c55e',
        'serial': '#a855f7',
        'console': '#854d0e',
        'usb': '#ec4899',
        'wan': '#ef4444',
        'trunk': '#14b8a6',
        'crossover': '#f97316',
        'other': '#6b7280'
    };
    return colors[type] || '#3b82f6';
}

// Get filtered devices for matrix based on current filters
function getMatrixFilteredDevices() {
    var devices = appState.devices.slice();
    
    // Location filter
    if (matrixFilters.location) {
        devices = devices.filter(function(d) {
            return d.location === matrixFilters.location;
        });
    }
    
    // Group filter
    if (matrixFilters.group) {
        devices = devices.filter(function(d) {
            return d.rackId === matrixFilters.group;
        });
    }
    
    // Only connected filter
    if (matrixFilters.onlyConnected) {
        var connectedDeviceIds = {};
        appState.connections.forEach(function(c) {
            if (c.from) connectedDeviceIds[c.from] = true;
            if (c.to) connectedDeviceIds[c.to] = true;
        });
        
        devices = devices.filter(function(d) {
            return connectedDeviceIds[d.id] === true;
        });
    }
    
    return devices;
}

function updateMatrixStats() {
    var statsContainer = document.getElementById('matrixStats');
    if (!statsContainer) return;
    
    // Use filtered devices for stats
    var filteredDevices = getMatrixFilteredDevices();
    var totalDevices = filteredDevices.length;
    var totalAllDevices = appState.devices.length;
    
    // Get connections involving filtered devices
    var filteredDeviceIds = {};
    filteredDevices.forEach(function(d) { filteredDeviceIds[d.id] = true; });
    
    var filteredConnections = appState.connections.filter(function(c) {
        return filteredDeviceIds[c.from] || filteredDeviceIds[c.to];
    });
    
    var totalConnections = filteredConnections.length;
    var totalAllConnections = appState.connections.length;
    
    // Show filtered vs total if filters are active
    var isFiltered = matrixFilters.location || matrixFilters.group || matrixFilters.onlyConnected;
    var deviceLabel = isFiltered ? totalDevices + '/' + totalAllDevices : String(totalDevices);
    var connLabel = isFiltered ? totalConnections + '/' + totalAllConnections : String(totalConnections);
    
    // Simple stats: just devices and connections
    var html = '<div class="flex items-center gap-2 text-xs">';
    html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500 text-white font-semibold" title="Devices">📱 ' + deviceLabel + '</span>';
    html += '<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500 text-white font-semibold" title="Connections">⚡ ' + connLabel + '</span>';
    html += '</div>';
    
    statsContainer.innerHTML = html;
}

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
    
    var typeName = config.connLabels[conn.type] || conn.type;
    var connColor = conn.color || config.connColors[conn.type] || 'var(--color-secondary)';
    
    // Build horizontal tooltip with two columns - LARGER SIZE
    var html = '<div class="flex gap-6">';
    
    // LEFT COLUMN - FROM
    html += '<div class="flex-1 min-w-[180px]">';
    html += '<div class="text-sm text-amber-400 font-bold mb-2 border-b border-amber-400/30 pb-2">📤 FROM</div>';
    if (fromDevice) {
        html += '<div class="font-bold text-white text-base">' + fromDevice.name + '</div>';
        html += '<div class="text-sm text-slate-400 mt-2 leading-relaxed space-y-1">';
        html += '<div>📍 <span class="text-purple-300">' + (fromDevice.location || '-') + '</span></div>';
        html += '<div>🗄️ <span class="text-cyan-300">' + (fromDevice.rackId || '-') + '</span></div>';
        html += '<div>📊 <span class="text-slate-500">POS.</span> <span class="text-amber-300 font-bold">#' + (fromDevice.order || '-') + '</span></div>';
        if (fromDevice.product) html += '<div>📦 <span class="text-green-300">' + fromDevice.product + '</span></div>';
        html += '<div>🔌 <span class="text-amber-300 font-mono font-bold text-base">' + (conn.fromPort || '-') + '</span></div>';
        html += '</div>';
    }
    html += '</div>';
    
    // RIGHT COLUMN - TO
    html += '<div class="flex-1 min-w-[180px]">';
    html += '<div class="text-sm text-cyan-400 font-bold mb-2 border-b border-cyan-400/30 pb-2">📥 TO</div>';
    if (toDevice) {
        html += '<div class="font-bold text-white text-base">' + toDevice.name + '</div>';
        html += '<div class="text-sm text-slate-400 mt-2 leading-relaxed space-y-1">';
        html += '<div>📍 <span class="text-purple-300">' + (toDevice.location || '-') + '</span></div>';
        html += '<div>🗄️ <span class="text-cyan-300">' + (toDevice.rackId || '-') + '</span></div>';
        html += '<div>📊 <span class="text-slate-500">POS.</span> <span class="text-cyan-300 font-bold">#' + (toDevice.order || '-') + '</span></div>';
        if (toDevice.product) html += '<div>📦 <span class="text-green-300">' + toDevice.product + '</span></div>';
        html += '<div>🔌 <span class="text-cyan-300 font-mono font-bold text-base">' + (conn.toPort || '-') + '</span></div>';
        html += '</div>';
    } else {
        html += '<div class="font-bold text-white text-base">' + (conn.externalDest || 'ISP') + '</div>';
        html += '<div class="text-sm mt-1">🔌 <span class="text-blue-300 font-mono font-bold">' + (conn.toPort || '-') + '</span></div>';
    }
    html += '</div>';
    
    html += '</div>'; // end flex
    
    // Connection type and cable - bottom row
    html += '<div class="mt-3 pt-3 border-t border-slate-600 flex items-center justify-between">';
    html += '<div class="font-bold text-base" style="color:' + connColor + '">' + typeName + '</div>';
    if (conn.cableMarker) {
        html += '<div class="scale-110">' + createMarkerHtml(conn.cableMarker, conn.cableColor, false) + '</div>';
    }
    html += '</div>';
    
    if (conn.notes) {
        html += '<div class="text-xs text-slate-400 italic mt-2">📝 ' + conn.notes + '</div>';
    }
    
    html += '<div class="text-[10px] text-slate-500 mt-3 text-center">Click to edit</div>';
    
    tooltip.innerHTML = html;
    tooltip.classList.remove('hidden');
    tooltip.style.display = 'block';
    
    // Smart positioning - prevent tooltip from going off screen
    // Use clientX/Y for fixed positioning (relative to viewport)
    var tooltipRect = tooltip.getBoundingClientRect();
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    
    var posX = event.clientX + 15;
    var posY = event.clientY + 10;
    
    // Check right edge - show to the left of cursor
    if (posX + tooltipRect.width > viewportWidth - 10) {
        posX = event.clientX - tooltipRect.width - 15;
    }
    
    // Check bottom edge - show ABOVE cursor if near bottom
    if (posY + tooltipRect.height > viewportHeight - 10) {
        posY = event.clientY - tooltipRect.height - 15;
    }
    
    // Ensure minimum positions (don't go off screen)
    if (posX < 10) posX = 10;
    if (posY < 10) posY = 10;
    
    // Final safety check - ensure tooltip fits
    if (posX + tooltipRect.width > viewportWidth) {
        posX = viewportWidth - tooltipRect.width - 10;
    }
    if (posY + tooltipRect.height > viewportHeight) {
        posY = viewportHeight - tooltipRect.height - 10;
    }
    
    tooltip.style.left = posX + 'px';
    tooltip.style.top = posY + 'px';
}

function hideMatrixTooltip() {
    var tooltip = document.getElementById('matrixTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.classList.add('hidden');
    }
}

function updateMatrix() {
    // Update filters dropdowns
    updateMatrixFilters();
    
    // Update stats
    updateMatrixStats();
    
    // Render SVG Matrix
    if (typeof SVGMatrix !== 'undefined') {
        SVGMatrix.render();
    }
}

// ============================================================================
// CONNECTION FILTERS BAR
// ============================================================================
function updateConnFilterBar() {
    var filterBar = document.getElementById('connFilterBar');
    if (!filterBar) return;
    
    // Get unique locations, sources and types for dropdowns
    var locations = [];
    var sources = [];
    var types = [];
    
    for (var i = 0; i < appState.devices.length; i++) {
        var d = appState.devices[i];
        if (d.location && locations.indexOf(d.location) === -1) locations.push(d.location);
        if (d.rackId && sources.indexOf(d.rackId) === -1) sources.push(d.rackId);
    }
    
    for (var ci = 0; ci < appState.connections.length; ci++) {
        var c = appState.connections[ci];
        if (c.type && types.indexOf(c.type) === -1) types.push(c.type);
    }
    
    locations.sort();
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
    
    var hasActiveFilters = appState.deviceFilters.location || appState.connFilters.source || appState.connFilters.anyDevice ||
                           appState.connFilters.fromDevice || appState.connFilters.toDevice || 
                           appState.connFilters.destination || appState.connFilters.type || 
                           appState.connFilters.status || appState.connFilters.cable;
    
    var html = '<div class="flex flex-wrap items-center gap-2 p-3 bg-slate-100 rounded-lg mb-3">';
    html += '<span class="text-xs font-semibold text-slate-600">Filters:</span>';
    
    // Location filter (first, with purple styling like in Devices tab) - using optgroups like Actions
    var locationsWithCode = typeof LocationFilter !== 'undefined' && LocationFilter.getLocationsForFilter ? LocationFilter.getLocationsForFilter() : [];
    var mappedLocs = [], customLocs = [];
    locationsWithCode.forEach(function(loc) {
        if (loc.type === 'mapped') mappedLocs.push(loc);
        else customLocs.push(loc);
    });
    html += '<select id="filterConnLocation" onchange="updateDeviceFilter(\'location\', this.value)" class="px-2 py-1 text-xs border-2 border-purple-400 rounded-lg bg-white font-semibold text-slate-800" title="Filter by Location">';
    html += '<option value="">All Locations</option>';
    if (mappedLocs.length > 0) {
        html += '<optgroup label="📍 Mapped Locations" style="color:#334155;font-weight:600">';
        for (var ml = 0; ml < mappedLocs.length; ml++) {
            var selectedML = appState.deviceFilters.location === mappedLocs[ml].value ? ' selected' : '';
            html += '<option value="' + mappedLocs[ml].value + '"' + selectedML + ' style="color:#1e293b">' + mappedLocs[ml].display + '</option>';
        }
        html += '</optgroup>';
    }
    if (customLocs.length > 0) {
        html += '<optgroup label="🪧 Custom Locations" style="color:#334155;font-weight:600">';
        for (var cl = 0; cl < customLocs.length; cl++) {
            var selectedCL = appState.deviceFilters.location === customLocs[cl].value ? ' selected' : '';
            html += '<option value="' + customLocs[cl].value + '"' + selectedCL + ' style="color:#1e293b">' + customLocs[cl].display + '</option>';
        }
        html += '</optgroup>';
    }
    html += '</select>';
    
    // Group filter - cerca in entrambi source e destination (campo rackId per compatibilità)
    html += '<select id="filterConnSource" onchange="updateConnFilter(\'source\', this.value)" class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white" title="Filter by Group (searches in Source and Destination)">';
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
    html += '<span class="text-xs text-blue-600 font-medium">Device:</span>';
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
    html += '<span class="text-xs text-slate-500 ml-auto"><span class="text-red-500 font-bold">✗</span> disabled · <span class="text-amber-600 font-bold">↩</span> rear · <span class="text-blue-600 font-bold">🔀</span> inverted</span>';
    
    html += '</div>';
    
    // Warning for WallJacks without room assignment (only for logged-in users)
    var isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn();
    if (isLoggedIn) {
        var unassignedWallJacks = 0;
        for (var wj = 0; wj < appState.connections.length; wj++) {
            var conn = appState.connections[wj];
            if (conn.isWallJack && (!conn.roomId || conn.roomId === null || conn.roomId === '')) {
                unassignedWallJacks++;
            }
        }
        
        if (unassignedWallJacks > 0) {
            html += '<div class="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2 text-xs">';
            html += '<span class="text-amber-600 font-bold">⚠️</span>';
            html += '<span class="text-amber-700"><strong>' + unassignedWallJacks + ' Wall Jack' + (unassignedWallJacks > 1 ? 's' : '') + '</strong> non associat' + (unassignedWallJacks > 1 ? 'i' : 'o') + ' a nessuna stanza. ';
            html += 'Modifica la connessione e seleziona la <strong>Room</strong> corrispondente.</span>';
            html += '</div>';
        }
    }
    
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
        { key: 'fromPos', label: 'Pos' },
        { key: 'fromDevice', label: 'From Device' },
        { key: 'fromPort', label: 'Src Port' },
        { key: 'arrow', label: '' },
        { key: 'toPort', label: 'Dst Port' },
        { key: 'toDevice', label: 'To Device' },
        { key: 'toPos', label: 'Pos' },
        { key: 'toRack', label: 'Destination' },
        { key: 'type', label: 'Type' },
        { key: 'marker', label: 'Cable' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' },
        { key: 'actions', label: 'Actions', noPrint: true }
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
                case 'toRack': return toDevice ? (toDevice.rackId || '') : (c.isWallJack ? 'Wall Jack' : (c.externalDest ? 'ISP' : ''));
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
        var isAutoInverted = item._autoInverted || false;
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
        var connColor = c.color || config.connColors[c.type] || 'var(--color-secondary)';

        var fromRackColor = getRackColor(fromDevice ? fromDevice.rackId : '');
        
        // For WallJack and External, use connection type color instead of gray
        var toRackColor;
        if (toDevice) {
            toRackColor = getRackColor(toDevice.rackId);
        } else if (c.isWallJack) {
            toRackColor = config.connColors['wallport'] || 'var(--conn-management)';
        } else if (c.externalDest) {
            toRackColor = config.connColors['external'] || 'var(--color-danger)';
        } else {
            toRackColor = 'var(--color-secondary)';
        }

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

        // Row styling: mirrored rows have red background
        var rowBg;
        if (isMirrored) {
            rowBg = 'bg-red-100';
        } else {
            rowBg = (i % 2 === 0) ? 'bg-white' : 'bg-slate-50';
        }
        
        // ID number: just add ⇄ for mirrored (no icon for auto-inverted)
        var idNumber = origIdx + 1;
        var idHtml;
        if (isMirrored) {
            idHtml = idNumber + ' <span class="text-red-600 text-base font-bold" title="Mirrored view (bidirectional)">⇄</span>';
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
            toDisplayRack = 'ISP';
            toDisplayPos = '-';
        } else {
            toDisplayName = 'N/A';
            toDisplayRack = 'N/A';
            toDisplayPos = 'N/A';
        }

        // Rear indicators - standardized icon (shown AFTER position number, like in Devices list)
        var fromRearIndicator = (fromDevice && (fromDevice.isRear || fromDevice.rear)) ? '<span class="text-[10px] text-amber-600 font-bold" title="Rear/Back position">↩</span>' : '<span class="text-[10px] opacity-0">↩</span>';
        var toRearIndicator = (toDevice && (toDevice.isRear || toDevice.rear)) ? '<span class="text-[10px] text-amber-600 font-bold" title="Rear/Back position">↩</span>' : '<span class="text-[10px] opacity-0">↩</span>';
        
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
            '<td class="px-3 py-2 align-top"><span class="inline-flex items-center justify-center gap-0.5" style="min-width:42px"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + (fromDevice ? String(fromDevice.order).padStart(2, '0') : 'N/A') + '</span>' + fromRearIndicator + '</span></td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold cursor-pointer hover:text-blue-600" onclick="filterConnectionsByDevice(\'' + fromDeviceNameEscaped + '\')">' + fromDisabledIndicator + escapeHtml(fromDevice ? fromDevice.name : 'N/A') + '</div>' +
                (fromIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + fromIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + escapeHtml(displayFromPort || '-') + '</td>' +
            '<td class="px-1 py-2 align-top text-center"><span style="font-size:18px;font-weight:bold;color:' + (isMirrored ? 'var(--color-danger-hover)' : 'var(--color-primary-hover)') + ';">⟷</span></td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + escapeHtml(displayToPort || '-') + '</td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold cursor-pointer hover:text-blue-600" onclick="filterConnectionsByDevice(\'' + toDeviceNameEscaped + '\')">' + toDisabledIndicator + toDisplayName + '</div>' +
                (toIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + toIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top"><span class="inline-flex items-center justify-center gap-0.5" style="min-width:42px"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + toDisplayPos + '</span>' + toRearIndicator + '</span></td>' +
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
    
    // Update edit-mode visibility after dynamic rendering
    if (typeof Auth !== 'undefined' && Auth.updateUI) {
        Auth.updateUI();
    }
}

// ============================================================================
// EXCEL EXPORT (Full implementation)
// ============================================================================
function exportExcel() {
    try {
        // ===== PRE-EXPORT VALIDATION =====
        if (typeof JSONValidatorFrontend !== 'undefined') {
            var excelValidationReport = JSONValidatorFrontend.validateBeforeExport(appState);
            if (excelValidationReport.critical.length > 0) {
                Toast.error('❌ Cannot export Excel - validation errors:\n' + excelValidationReport.critical.slice(0, 2).join('\n'));
                Debug.error('Excel export validation failed:', excelValidationReport.critical);
                return;
            }
        }
        
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
                'Dst Rack': toDevice ? toDevice.rackId : (c.isWallJack ? 'Wall Jack' : (c.externalDest ? 'ISP' : '')),
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

        // Add Rooms sheet
        var roomsData = [];
        var rooms = appState.rooms || [];
        if (rooms.length > 0) {
            for (var rm = 0; rm < rooms.length; rm++) {
                var room = rooms[rm];
                var deviceCount = 0;
                // Count devices in this room
                for (var di = 0; di < appState.devices.length; di++) {
                    if (deviceBelongsToRoom && deviceBelongsToRoom(appState.devices[di], room)) {
                        deviceCount++;
                    }
                }
                roomsData.push({
                    'ID': room.id,
                    'Name': room.name,
                    'Nickname': room.nickname || '',
                    'Width': room.width || '',
                    'Height': room.height || '',
                    'X': room.x || 0,
                    'Y': room.y || 0,
                    'Color': room.color || '',
                    'Devices': deviceCount,
                    'Notes': room.notes || ''
                });
            }
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roomsData), 'Rooms');
        } else {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{Message: 'No rooms configured'}]), 'Rooms');
        }

        // Add Locations sheet (v3.6.0)
        if (appState.locations && appState.locations.length > 0) {
            var locsData = [];
            for (var li = 0; li < appState.locations.length; li++) {
                var loc = appState.locations[li];
                var locDeviceCount = appState.devices.filter(function(d) { return d.location === loc.name; }).length;
                locsData.push({
                    'Code': loc.code,
                    'Name': loc.name,
                    'Type': loc.type,
                    'Site': loc.siteId || 'main',
                    'Room Ref': loc.roomRef || '',
                    'Devices': locDeviceCount
                });
            }
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(locsData), 'Locations');
        }

        XLSX.writeFile(wb, 'Tiesse-Matrix-Network_' + new Date().toISOString().slice(0,10) + '.xlsx');
        
        // Log the export
        if (typeof ActivityLog !== 'undefined') {
            var roomCount = (appState.rooms || []).length;
            ActivityLog.add('export', 'export', 'Exported Excel with ' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections, ' + roomCount + ' rooms');
        }
        
        Toast.success('Excel exported successfully!');

    } catch (e) {
        Debug.error('Error exporting Excel:', e);
        Toast.error('Error exporting Excel: ' + e.message);
    }
}

// Note: Drag-to-scroll and zoom are handled by SVGMatrix module (init function)
