/**
 * Tiesse Matrix Network - UI Update Functions
 * Version: 1.9.9
 * 
 * Contains UI rendering functions:
 * - Device list (cards and table views)
 * - Connection matrix
 * - Connections table
 * - Excel export
 * - Improved print styles
 */

'use strict';

// ============================================================================
// DEVICES LIST UPDATE (Cards and Table Views)
// ============================================================================
function updateDevicesList() {
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

function updateDevicesListCards(cont) {
    var sorted = getSorted();
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
        if (d.addresses && d.addresses.length > 0) {
            var allAddrs = [];
            for (var k = 0; k < d.addresses.length; k++) {
                var a = d.addresses[k];
                if (a.network) allAddrs.push('<strong>' + a.network + '</strong>');
                if (a.ip) allAddrs.push('<strong>' + a.ip + '</strong>');
            }
            var vlanText = '';
            for (var m = 0; m < d.addresses.length; m++) {
                if (d.addresses[m].vlan) {
                    vlanText = ' | VLAN <strong>' + d.addresses[m].vlan + '</strong>';
                    break;
                }
            }
            if (allAddrs.length > 0) {
                addressText = '<div class="text-xs mt-1 text-slate-600">IP: ' + allAddrs.join(', ') + vlanText + '</div>';
            }
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
            (d.isRear ? '<span class="px-1 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-700">R</span>' : '') +
            '<span class="text-xs px-1.5 py-0.5 rounded-full text-white ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="font-bold text-base text-slate-800 truncate">' + d.name + '</div>' +
            brandModelText +
            '<div class="text-xs text-slate-400 uppercase">' + d.type + '</div>' +
            addressText +
            '<div class="text-xs mt-1 text-slate-500">' + d.ports.length + ' ports (' + usedPorts + ' used) | ' + totalConnections + ' conn.</div>' +
            noConnectionsWarning +
            '</div>' +
            '<div class="flex flex-col gap-1 ml-2">' +
            '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-500 hover:text-green-700 text-sm p-1" title="Add Connection">&#x2795;</button>' +
            '<button onclick="editDevice(' + d.id + ')" class="text-blue-500 hover:text-blue-700 text-sm p-1" title="Edit Device">&#9998;</button>' +
            '<button onclick="removeDevice(' + d.id + ')" class="text-red-500 hover:text-red-700 text-sm p-1" title="Delete Device">&times;</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';
    cont.innerHTML = html;
}

function updateDevicesListTable(cont) {
    var sorted = getDevicesSortedBy(appState.deviceSort.key, appState.deviceSort.asc);
    
    var sortIcon = function(key) {
        if (appState.deviceSort.key === key) {
            return appState.deviceSort.asc ? ' ▲' : ' ▼';
        }
        return ' ↕';
    };

    var html = '<table class="w-full text-xs border-collapse">';
    html += '<thead><tr class="bg-slate-700 text-white">';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'rack\')">Source' + sortIcon('rack') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'order\')">Pos.' + sortIcon('order') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'name\')">Device Name' + sortIcon('name') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'brandModel\')">Brand/Model' + sortIcon('brandModel') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'type\')">Type' + sortIcon('type') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'status\')">Status' + sortIcon('status') + '</th>';
    html += '<th class="p-2 text-left">IP/Network</th>';
    html += '<th class="p-2 text-left">Service</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'ports\')">Ports' + sortIcon('ports') + '</th>';
    html += '<th class="p-2 text-center cursor-pointer hover:bg-slate-600" onclick="toggleDeviceSort(\'connections\')">Connections' + sortIcon('connections') + '</th>';
    html += '<th class="p-2 text-center">Actions</th>';
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
        if (d.addresses && d.addresses.length > 0) {
            var allAddrs = [];
            for (var k = 0; k < d.addresses.length; k++) {
                var a = d.addresses[k];
                if (a.network) allAddrs.push(a.network);
                if (a.ip) allAddrs.push(a.ip);
            }
            addressText = allAddrs.join(', ');
        }

        var rowClass = i % 2 === 0 ? 'bg-white' : 'bg-slate-50';
        var warningClass = totalConnections === 0 ? 'bg-orange-50' : rowClass;

        html += '<tr class="' + warningClass + ' hover:bg-blue-50 border-b border-slate-200">';
        html += '<td class="p-2"><span class="px-1.5 py-0.5 rounded text-xs font-semibold" style="background-color:' + rackColor + '20;color:' + rackColor + '">' + (d.rackId || '').toUpperCase() + '</span></td>';
        html += '<td class="p-2 text-center"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' + (d.isRear ? '<span class="text-[9px] text-amber-600 font-bold ml-0.5">R</span>' : '') + '</td>';
        html += '<td class="p-2 font-semibold text-slate-800">' + d.name + '</td>';
        html += '<td class="p-2 text-slate-600">' + (d.brandModel || '-') + '</td>';
        html += '<td class="p-2 text-slate-500 uppercase">' + d.type + '</td>';
        html += '<td class="p-2 text-center">' + statusBadge + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + addressText + '">' + (addressText || '-') + '</td>';
        html += '<td class="p-2 text-slate-600 max-w-xs truncate" title="' + (d.service || '') + '">' + (d.service || '-') + '</td>';
        html += '<td class="p-2 text-center"><span class="text-slate-700">' + d.ports.length + '</span> <span class="text-slate-400">(' + usedPorts + ')</span></td>';
        html += '<td class="p-2 text-center">' + (totalConnections === 0 ? '<span class="text-orange-600 font-semibold">0 ⚠</span>' : '<span class="text-slate-700">' + totalConnections + '</span>') + '</td>';
        html += '<td class="p-2 text-center whitespace-nowrap">';
        html += '<button onclick="addConnectionFromDevice(' + d.id + ')" class="text-green-600 hover:text-green-900 text-xs mr-1" title="Add Connection">+Conn</button>';
        html += '<button onclick="editDevice(' + d.id + ')" class="text-blue-600 hover:text-blue-900 text-xs mr-1">Edit</button>';
        html += '<button onclick="removeDevice(' + d.id + ')" class="text-red-600 hover:text-red-900 text-xs">Del</button>';
        html += '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    cont.innerHTML = html;
}

function getDevicesSortedBy(key, asc) {
    var devices = appState.devices.slice();
    
    devices.sort(function(a, b) {
        var valA, valB;
        
        switch(key) {
            case 'rack':
                valA = (a.rackId || '').toLowerCase();
                valB = (b.rackId || '').toLowerCase();
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
                valA = (a.rackId || '').toLowerCase();
                valB = (b.rackId || '').toLowerCase();
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

function setMatrixView(mode) {
    matrixViewMode = mode;
    var compactBtn = document.getElementById('matrixViewCompact');
    var detailedBtn = document.getElementById('matrixViewDetailed');
    if (compactBtn && detailedBtn) {
        if (mode === 'compact') {
            compactBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-white text-slate-700 shadow-sm';
            detailedBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md text-slate-600 hover:bg-slate-100';
        } else {
            compactBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md text-slate-600 hover:bg-slate-100';
            detailedBtn.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-white text-slate-700 shadow-sm';
        }
    }
    updateMatrix();
}

function toggleMatrixLegend() {
    matrixLegendVisible = !matrixLegendVisible;
    var legend = document.getElementById('matrixLegend');
    var icon = document.getElementById('legendToggleIcon');
    if (legend) {
        legend.style.display = matrixLegendVisible ? 'flex' : 'none';
    }
    if (icon) {
        icon.textContent = matrixLegendVisible ? '▼' : '▶';
    }
}

function updateMatrixStats() {
    var statsContainer = document.getElementById('matrixStats');
    if (!statsContainer) return;
    
    var totalDevices = appState.devices.length;
    var totalConnections = appState.connections.length;
    var activeConnections = 0;
    var disabledConnections = 0;
    var connectionsByType = {};
    var racks = {};
    
    for (var i = 0; i < appState.connections.length; i++) {
        var conn = appState.connections[i];
        if (conn.status === 'active') activeConnections++;
        else disabledConnections++;
        
        var type = conn.type || 'other';
        connectionsByType[type] = (connectionsByType[type] || 0) + 1;
    }
    
    for (var j = 0; j < appState.devices.length; j++) {
        var rack = appState.devices[j].rackId || 'Unassigned';
        racks[rack] = (racks[rack] || 0) + 1;
    }
    
    var html = '';
    html += '<div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white">' +
        '<div class="text-2xl font-bold">' + totalDevices + '</div>' +
        '<div class="text-xs opacity-80">Devices</div></div>';
    
    html += '<div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">' +
        '<div class="text-2xl font-bold">' + totalConnections + '</div>' +
        '<div class="text-xs opacity-80">Connections</div></div>';
    
    html += '<div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white">' +
        '<div class="text-2xl font-bold">' + activeConnections + '</div>' +
        '<div class="text-xs opacity-80">Active</div></div>';
    
    html += '<div class="bg-gradient-to-br from-red-400 to-red-500 rounded-lg p-3 text-white">' +
        '<div class="text-2xl font-bold">' + disabledConnections + '</div>' +
        '<div class="text-xs opacity-80">Disabled</div></div>';
    
    html += '<div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white">' +
        '<div class="text-2xl font-bold">' + Object.keys(racks).length + '</div>' +
        '<div class="text-xs opacity-80">Racks/Sources</div></div>';
    
    // Most common connection type
    var topType = 'N/A';
    var topCount = 0;
    for (var t in connectionsByType) {
        if (connectionsByType[t] > topCount) {
            topCount = connectionsByType[t];
            topType = config.connLabels[t] || t;
        }
    }
    html += '<div class="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-3 text-white">' +
        '<div class="text-lg font-bold truncate">' + topType + '</div>' +
        '<div class="text-xs opacity-80">Most Used (' + topCount + ')</div></div>';
    
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
    
    var fromName = fromDevice ? fromDevice.name : 'Unknown';
    var toName = toDevice ? toDevice.name : (conn.externalDest || 'External');
    var typeName = config.connLabels[conn.type] || conn.type;
    var connColor = conn.color || config.connColors[conn.type] || '#6b7280';
    
    var html = '<div class="font-bold text-sm mb-2" style="color:' + connColor + '">' + typeName + '</div>';
    html += '<div class="space-y-1">';
    html += '<div><span class="text-slate-400">From:</span> ' + fromName + ' <span class="text-blue-300">[' + (conn.fromPort || '-') + ']</span></div>';
    html += '<div><span class="text-slate-400">To:</span> ' + toName + ' <span class="text-blue-300">[' + (conn.toPort || '-') + ']</span></div>';
    if (conn.cableMarker) {
        html += '<div><span class="text-slate-400">Cable:</span> ' + conn.cableMarker + '</div>';
    }
    if (conn.notes) {
        html += '<div class="text-slate-300 italic mt-1 text-[10px]">' + conn.notes + '</div>';
    }
    html += '</div>';
    html += '<div class="text-[10px] text-slate-400 mt-2 border-t border-slate-600 pt-1">Click to edit</div>';
    
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
    
    // Update stats
    updateMatrixStats();
    
    if (appState.devices.length === 0) {
        cont.innerHTML = '<div class="flex flex-col items-center justify-center py-16 text-slate-400">' +
            '<div class="text-6xl mb-4">📡</div>' +
            '<div class="text-lg font-medium">No devices yet</div>' +
            '<div class="text-sm">Add devices in the Devices tab to see the connection matrix</div>' +
            '</div>';
        return;
    }

    var sorted = getSorted();
    var isCompact = matrixViewMode === 'compact';
    var cellSize = isCompact ? 60 : 90;
    var cellHeight = isCompact ? 50 : 75;
    
    // Check for special connections
    var hasWallJackConnections = false;
    var hasExternalConnections = false;
    var wallJackConnections = [];
    var externalConnections = [];
    
    for (var sc = 0; sc < appState.connections.length; sc++) {
        var sconn = appState.connections[sc];
        if (sconn.to === null || sconn.to === undefined) {
            if (sconn.isWallJack || sconn.type === 'wallport') {
                hasWallJackConnections = true;
                wallJackConnections.push({ conn: sconn, idx: sc });
            } else if (sconn.externalDest || sconn.type === 'wan' || sconn.type === 'external') {
                hasExternalConnections = true;
                externalConnections.push({ conn: sconn, idx: sc });
            }
        }
    }

    var html = '<table id="matrixTable" class="border-collapse" style="border-spacing:0;">';
    
    // HEADER ROW
    html += '<thead><tr>';
    
    // Corner cell with summary
    html += '<th class="sticky left-0 z-20 p-2 text-center align-middle" style="min-width:' + (cellSize + 20) + 'px;background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border:none;border-radius:8px 0 0 0;">' +
        '<div class="text-white font-bold text-xs">MATRIX</div>' +
        '<div class="text-slate-400 text-[10px]">' + sorted.length + ' devices</div>' +
        '</th>';

    // Column headers (destination devices)
    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var rackColor = getRackColor(d.rackId);
        var posNum = String(d.order || 0).padStart(2, '0');
        var isDisabled = d.status === 'disabled';
        
        html += '<th class="p-1 text-center align-middle relative group" style="min-width:' + cellSize + 'px;width:' + cellSize + 'px;background-color:#1e293b;border-left:3px solid ' + rackColor + ';">' +
            '<div class="flex flex-col items-center justify-center h-full py-1">' +
            // Position badge
            '<span class="inline-flex items-center justify-center w-5 h-5 text-[9px] font-bold rounded-full mb-1" style="background-color:' + rackColor + '22;color:' + rackColor + ';border:1px solid ' + rackColor + ';">' + posNum + '</span>' +
            // Device name
            '<div class="text-[9px] font-semibold text-white leading-tight text-center max-w-full px-0.5" style="word-break:break-word;' + (isDisabled ? 'opacity:0.5;' : '') + '" title="' + d.name + '">' + 
            (d.name.length > 10 ? d.name.substring(0,9) + '…' : d.name) + 
            '</div>' +
            // Rack name
            '<div class="text-[8px] font-medium mt-0.5" style="color:' + rackColor + ';">' + (d.rackId || '').toUpperCase() + '</div>' +
            '</div></th>';
    }
    
    // Special columns
    if (hasWallJackConnections) {
        html += '<th class="p-1 text-center align-middle" style="min-width:' + cellSize + 'px;width:' + cellSize + 'px;background-color:#1e293b;border-left:3px solid #a78bfa;">' +
            '<div class="flex flex-col items-center justify-center py-1">' +
            '<span class="text-xl">🔌</span>' +
            '<div class="text-[9px] font-semibold text-white">Wall Jack</div>' +
            '</div></th>';
    }
    if (hasExternalConnections) {
        html += '<th class="p-1 text-center align-middle" style="min-width:' + cellSize + 'px;width:' + cellSize + 'px;background-color:#1e293b;border-left:3px solid #ef4444;">' +
            '<div class="flex flex-col items-center justify-center py-1">' +
            '<span class="text-xl">🌐</span>' +
            '<div class="text-[9px] font-semibold text-white">External</div>' +
            '</div></th>';
    }
    
    html += '</tr></thead><tbody>';

    // DATA ROWS
    for (var r = 0; r < sorted.length; r++) {
        var row = sorted[r];
        var rowRackColor = getRackColor(row.rackId);
        var rowPosNum = String(row.order || 0).padStart(2, '0');
        var rowDisabled = row.status === 'disabled';
        var rowBg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        html += '<tr>';
        
        // Row header (source device)
        html += '<td class="sticky left-0 z-10 p-1 text-center align-middle" style="min-width:' + (cellSize + 20) + 'px;background-color:#f1f5f9;border-top:2px solid ' + rowRackColor + ';border-bottom:1px solid #e2e8f0;">' +
            '<div class="flex items-center gap-2 px-1">' +
            '<span class="inline-flex items-center justify-center w-5 h-5 text-[9px] font-bold rounded-full flex-shrink-0" style="background-color:' + rowRackColor + '22;color:' + rowRackColor + ';border:1px solid ' + rowRackColor + ';">' + rowPosNum + '</span>' +
            '<div class="text-left flex-1 min-w-0">' +
            '<div class="text-[10px] font-bold text-slate-800 truncate' + (rowDisabled ? ' opacity-50' : '') + '" title="' + row.name + '">' + row.name + '</div>' +
            '<div class="text-[8px] font-medium" style="color:' + rowRackColor + ';">' + (row.rackId || '').toUpperCase() + '</div>' +
            '</div></div></td>';

        // Data cells
        for (var c = 0; c < sorted.length; c++) {
            var col = sorted[c];
            var connIdx = getConnectionIndex(row.id, col.id);

            if (row.id === col.id) {
                // Diagonal - self reference
                html += '<td class="p-0 align-middle" style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background:repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 4px,#e2e8f0 4px,#e2e8f0 8px);border:1px solid #e2e8f0;">' +
                    '<div class="w-full h-full flex items-center justify-center text-slate-300 text-lg">—</div></td>';
            } else if (connIdx >= 0) {
                // Connection exists
                var conn = appState.connections[connIdx];
                var connColor = conn.color || config.connColors[conn.type] || '#6b7280';
                var isConnDisabled = conn.status === 'disabled';
                
                // Determine ports
                var portA = conn.from === row.id ? conn.fromPort : conn.toPort;
                var portB = conn.from === row.id ? conn.toPort : conn.fromPort;
                
                if (isCompact) {
                    // Compact view - just colored cell with type indicator
                    html += '<td class="p-0 align-middle cursor-pointer transition-all hover:scale-105 hover:z-10" ' +
                        'style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:' + rowBg + ';border:1px solid #e2e8f0;padding:3px;" ' +
                        'onclick="editConnection(' + connIdx + ')" ' +
                        'onmouseenter="showMatrixTooltip(event,' + connIdx + ')" ' +
                        'onmouseleave="hideMatrixTooltip()">' +
                        '<div class="w-full h-full rounded-lg flex flex-col items-center justify-center shadow-md transition-shadow hover:shadow-lg' + (isConnDisabled ? ' opacity-50' : '') + '" style="background-color:' + connColor + ';">' +
                        '<div class="text-[10px] font-bold text-white uppercase">' + (conn.type || '').substring(0,3) + '</div>' +
                        (conn.cableMarker ? '<div class="text-[8px] text-white/80 font-medium mt-0.5">' + conn.cableMarker + '</div>' : '') +
                        '</div></td>';
                } else {
                    // Detailed view - full info
                    var markerHtml = conn.cableMarker ? '<div class="mt-1">' + createMarkerHtml(conn.cableMarker, conn.cableColor || '#ffffff', true) + '</div>' : '';
                    
                    html += '<td class="p-0 align-middle cursor-pointer transition-all hover:scale-105 hover:z-10" ' +
                        'style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:' + rowBg + ';border:1px solid #e2e8f0;padding:3px;" ' +
                        'onclick="editConnection(' + connIdx + ')" ' +
                        'onmouseenter="showMatrixTooltip(event,' + connIdx + ')" ' +
                        'onmouseleave="hideMatrixTooltip()">' +
                        '<div class="w-full h-full rounded-lg flex flex-col items-center justify-center shadow-md p-1' + (isConnDisabled ? ' opacity-50' : '') + '" style="background-color:' + connColor + ';">' +
                        '<div class="text-[9px] font-bold text-white">' + (config.connLabels[conn.type] || conn.type || 'N/A').substring(0,6) + '</div>' +
                        '<div class="flex items-center gap-1 mt-1">' +
                        '<span class="text-[8px] px-1 py-0.5 bg-white/20 rounded text-white font-mono">' + (portA || '-') + '</span>' +
                        '<span class="text-[10px] text-white/70">↔</span>' +
                        '<span class="text-[8px] px-1 py-0.5 bg-black/20 rounded text-white font-mono">' + (portB || '-') + '</span>' +
                        '</div>' +
                        markerHtml +
                        '</div></td>';
                }
            } else {
                // No connection - empty cell
                html += '<td class="p-0 align-middle" style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:' + rowBg + ';border:1px solid #e2e8f0;"></td>';
            }
        }
        
        // Wall Jack column
        if (hasWallJackConnections) {
            var wjConn = null;
            var wjConnIdx = -1;
            for (var wj = 0; wj < wallJackConnections.length; wj++) {
                if (wallJackConnections[wj].conn.from === row.id) {
                    wjConn = wallJackConnections[wj].conn;
                    wjConnIdx = wallJackConnections[wj].idx;
                    break;
                }
            }
            if (wjConn) {
                html += '<td class="p-0 align-middle cursor-pointer transition-all hover:scale-105" ' +
                    'style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:#faf5ff;border:1px solid #e9d5ff;padding:3px;" ' +
                    'onclick="editConnection(' + wjConnIdx + ')">' +
                    '<div class="w-full h-full rounded-lg flex flex-col items-center justify-center shadow-md" style="background-color:#a78bfa;">' +
                    '<div class="text-[9px] font-bold text-white">' + (wjConn.fromPort || '-') + '</div>' +
                    '<div class="text-[8px] text-white/80 truncate max-w-full px-1">→ ' + (wjConn.externalDest || 'WJ') + '</div>' +
                    '</div></td>';
            } else {
                html += '<td class="p-0 align-middle" style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:#faf5ff;border:1px solid #e9d5ff;"></td>';
            }
        }
        
        // External column
        if (hasExternalConnections) {
            var extConn = null;
            var extConnIdx = -1;
            for (var ex = 0; ex < externalConnections.length; ex++) {
                if (externalConnections[ex].conn.from === row.id) {
                    extConn = externalConnections[ex].conn;
                    extConnIdx = externalConnections[ex].idx;
                    break;
                }
            }
            if (extConn) {
                html += '<td class="p-0 align-middle cursor-pointer transition-all hover:scale-105" ' +
                    'style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:#fef2f2;border:1px solid #fecaca;padding:3px;" ' +
                    'onclick="editConnection(' + extConnIdx + ')">' +
                    '<div class="w-full h-full rounded-lg flex flex-col items-center justify-center shadow-md" style="background-color:#ef4444;">' +
                    '<div class="text-[9px] font-bold text-white">' + (extConn.fromPort || '-') + '</div>' +
                    '<div class="text-[8px] text-white/80 truncate max-w-full px-1">→ ' + (extConn.externalDest || 'EXT') + '</div>' +
                    '</div></td>';
            } else {
                html += '<td class="p-0 align-middle" style="width:' + cellSize + 'px;min-width:' + cellSize + 'px;height:' + cellHeight + 'px;background-color:#fef2f2;border:1px solid #fecaca;"></td>';
            }
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    cont.innerHTML = html;
}

// ============================================================================
// CONNECTIONS LIST UPDATE (Full table with all columns and styling)
// ============================================================================
function updateConnectionsList() {
    var cont = document.getElementById('connectionsListContainer');
    var countEl = document.getElementById('connectionsCount');
    
    if (countEl) countEl.textContent = appState.connections.length;

    if (appState.connections.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 text-sm">No connections yet</p>';
        return;
    }

    // Prepare sortable headers (key -> field)
    var headers = [
        { key: 'id', label: '#', printHide: true },
        { key: 'fromRack', label: 'Source' },
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

    var html = '<div class="overflow-x-auto"><table class="min-w-full divide-y text-xs"><thead class="bg-slate-50"><tr>';
    for (var h = 0; h < headers.length; h++) {
        var hdr = headers[h];
        var sortIndicator = '';
        var printClass = hdr.printHide ? ' print-hide-id' : (hdr.noPrint ? ' no-print' : '');
        if (hdr.key !== 'actions' && appState.connSort.key === hdr.key) {
            sortIndicator = appState.connSort.asc ? ' ▲' : ' ▼';
        }
        if (hdr.key === 'actions') {
            html += '<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase no-print">' + hdr.label + '</th>';
        } else {
            html += '<th onclick="toggleConnSort(\'' + hdr.key + '\')" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100' + printClass + '">' + hdr.label + sortIndicator + '</th>';
        }
    }
    html += '</tr></thead><tbody class="bg-white divide-y">';

    // Create a sortable copy of connections
    var sorted = appState.connections.slice();
    // capture original indexes to avoid relying on indexOf during comparisons
    var originalIndexMap = new Map();
    for (var oi = 0; oi < appState.connections.length; oi++) {
        originalIndexMap.set(appState.connections[oi], oi);
    }
    sorted.sort(function(a, b) {
        // helper to resolve values for comparison
        function valueFor(conn, key, idx) {
            var fromDevice = null, toDevice = null;
            for (var j = 0; j < appState.devices.length; j++) {
                if (appState.devices[j].id === conn.from) fromDevice = appState.devices[j];
                if (appState.devices[j].id === conn.to) toDevice = appState.devices[j];
            }
            switch (key) {
                case 'id': return idx + 1;
                case 'fromRack': return fromDevice ? (fromDevice.rackId || '') : '';
                case 'fromPos': return fromDevice ? (fromDevice.order || 0) : 0;
                case 'fromDevice': return fromDevice ? (fromDevice.name || '') : '';
                case 'fromPort': return conn.fromPort || '';
                case 'toPort': return conn.toPort || '';
                case 'toDevice': return toDevice ? (toDevice.name || '') : (conn.externalDest || '');
                case 'toPos': return toDevice ? (toDevice.order || 0) : 0;
                case 'toRack': return toDevice ? (toDevice.rackId || '') : (conn.isWallJack ? 'Wall Jack' : (conn.externalDest ? 'External' : ''));
                case 'type': return config.connLabels[conn.type] || (conn.type || '');
                case 'marker': return conn.cableMarker || '';
                case 'status': return conn.status || '';
                default: return '';
            }
        }

        var idxA = originalIndexMap.has(a) ? originalIndexMap.get(a) : appState.connections.indexOf(a);
        var idxB = originalIndexMap.has(b) ? originalIndexMap.get(b) : appState.connections.indexOf(b);
        var va = valueFor(a, appState.connSort.key, idxA);
        var vb = valueFor(b, appState.connSort.key, idxB);

        // numeric comparison when both are numbers
        var na = parseFloat(va);
        var nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) {
            var diff = appState.connSort.asc ? na - nb : nb - na;
            // Secondary sort by position when sorting by rack
            if (diff === 0 && (appState.connSort.key === 'fromRack' || appState.connSort.key === 'toRack')) {
                var posKey = appState.connSort.key === 'fromRack' ? 'fromPos' : 'toPos';
                var posA = valueFor(a, posKey, idxA);
                var posB = valueFor(b, posKey, idxB);
                return appState.connSort.asc ? posA - posB : posB - posA;
            }
            return diff;
        }

        va = (va || '').toString().toLowerCase();
        vb = (vb || '').toString().toLowerCase();
        if (va < vb) return appState.connSort.asc ? -1 : 1;
        if (va > vb) return appState.connSort.asc ? 1 : -1;
        // Secondary sort by position when primary values are equal (string comparison)
        if (appState.connSort.key === 'fromRack' || appState.connSort.key === 'toRack') {
            var posKey2 = appState.connSort.key === 'fromRack' ? 'fromPos' : 'toPos';
            var posA2 = valueFor(a, posKey2, idxA);
            var posB2 = valueFor(b, posKey2, idxB);
            return appState.connSort.asc ? posA2 - posB2 : posB2 - posA2;
        }
        return 0;
    });

    for (var i = 0; i < sorted.length; i++) {
        var c = sorted[i];
        var fromDevice = null;
        var toDevice = null;
        
        for (var j = 0; j < appState.devices.length; j++) {
            if (appState.devices[j].id === c.from) fromDevice = appState.devices[j];
            if (appState.devices[j].id === c.to) toDevice = appState.devices[j];
        }
        
        var disabled = c.status === 'disabled' || (fromDevice && fromDevice.status === 'disabled') || (toDevice && toDevice.status === 'disabled');
        var opacityClass = disabled ? 'opacity-50' : '';

        var markerHtml = createMarkerHtml(c.cableMarker, c.cableColor, false);

        var statusClass = disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
        var statusText = disabled ? 'Off' : 'On';

        var fromRackColor = getRackColor(fromDevice ? fromDevice.rackId : '');
        var toRackColor = getRackColor(toDevice ? toDevice.rackId : '');

        // Get IPs for source and destination devices
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
        }
        if (toDevice && toDevice.addresses && toDevice.addresses.length > 0) {
            var addrs2 = [];
            for (var ai2 = 0; ai2 < toDevice.addresses.length; ai2++) {
                var addr2 = toDevice.addresses[ai2];
                if (addr2.network) addrs2.push(addr2.network);
                if (addr2.ip && addr2.ip !== addr2.network) addrs2.push(addr2.ip);
            }
            toIPs = addrs2.join('<br>');
        }

        var rowBg = (i % 2 === 0) ? 'bg-white' : 'bg-slate-50';

        // Handle external destination and wall jack display
        var toDisplayName, toDisplayRack, toDisplayPos;
        if (toDevice) {
            toDisplayName = toDevice.name;
            toDisplayRack = toDevice.rackId;
            toDisplayPos = String(toDevice.order).padStart(2, '0');
        } else if (c.isWallJack) {
            toDisplayName = '🔌 ' + (c.externalDest || 'Wall Jack');
            toDisplayRack = 'Wall Jack';
            toDisplayPos = '-';
        } else if (c.externalDest) {
            toDisplayName = '📡 ' + c.externalDest;
            toDisplayRack = 'External';
            toDisplayPos = '-';
        } else {
            toDisplayName = 'N/A';
            toDisplayRack = 'N/A';
            toDisplayPos = 'N/A';
        }

        // Get the original index for edit/remove operations
        var origIdx = originalIndexMap.get(c);

        // Rear indicators
        var fromRearIndicator = (fromDevice && fromDevice.isRear) ? '<span class="text-[9px] text-amber-600 font-bold ml-0.5">R</span>' : '';
        var toRearIndicator = (toDevice && toDevice.isRear) ? '<span class="text-[9px] text-amber-600 font-bold ml-0.5">R</span>' : '';

        html += '<tr class="' + rowBg + ' ' + opacityClass + ' hover:bg-blue-50 border-b-2 border-slate-300">' +
            '<td class="px-3 py-2 align-top print-hide-id">' + (origIdx + 1) + '</td>' +
            '<td class="px-3 py-2 align-top font-bold" style="color:' + fromRackColor + '">' + (fromDevice ? fromDevice.rackId : 'N/A') + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + (fromDevice ? String(fromDevice.order).padStart(2, '0') : 'N/A') + '</span>' + fromRearIndicator + '</td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold">' + (fromDevice ? fromDevice.name : 'N/A') + '</div>' +
                (fromIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + fromIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + (c.fromPort || '-') + '</td>' +
            '<td class="px-1 py-2 align-top text-center"><span style="font-size:16px;font-weight:bold;">⟷</span></td>' +
            '<td class="px-3 py-2 align-top font-mono text-center">' + (c.toPort || '-') + '</td>' +
            '<td class="px-3 py-2 align-top">' +
                '<div class="font-semibold">' + toDisplayName + '</div>' +
                (toIPs ? '<div class="text-xs text-slate-600 font-mono mt-0.5">' + toIPs + '</div>' : '') +
            '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + toDisplayPos + '</span>' + toRearIndicator + '</td>' +
            '<td class="px-3 py-2 align-top font-bold" style="color:' + toRackColor + '">' + toDisplayRack + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full text-white" style="background-color:' + c.color + '">' + config.connLabels[c.type] + '</span></td>' +
            '<td class="px-3 py-2 align-top">' + markerHtml + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full ' + statusClass + '">' + statusText + '</span></td>' +
            '<td class="px-3 py-2 align-top text-xs italic text-slate-600">' + (c.notes || '') + '</td>' +
            '<td class="px-3 py-2 align-top text-center no-print">' +
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
            devData.push({
                'Source': d.rackId,
                'Order': d.order,
                'Position': d.isRear ? 'Rear' : 'Front',
                'Name': d.name,
                'Type/Brand': d.brandModel || '',
                'Category': d.type,
                'Status': d.status,
                'Addresses': formatAddresses(d.addresses),
                'Service': d.service || '',
                'Ports': d.ports.length,
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
                'Dst Device': toDevice ? toDevice.name : (c.isWallJack ? '🔌 ' + c.externalDest : (c.externalDest ? '📡 ' + c.externalDest : '')),
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

// Initialize drag-to-scroll when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragToScroll);
} else {
    initDragToScroll();
}
