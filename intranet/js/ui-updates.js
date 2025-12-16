/**
 * Tiesse Matrix Network - UI Update Functions
 * Version: 2.4.0
 * 
 * Contains heavy UI rendering functions for matrix, devices, and connections lists
 */

'use strict';

// ============================================================================
// DEVICES LIST UPDATE (Card Style)
// ============================================================================
function updateDevicesList() {
    var container = document.getElementById('devicesListContainer');
    if (!container) return;

    var sorted = getSorted();
    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices added yet</p>';
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

        var serviceText = '';
        if (d.service) {
            serviceText = '<div class="text-xs mt-1 text-slate-500">🔧 ' + d.service + '</div>';
        }

        var notesText = '';
        if (d.notes) {
            notesText = '<div class="text-xs mt-1 text-slate-400 italic truncate">📝 ' + d.notes + '</div>';
        }

        html += '<div class="border rounded-lg p-2 hover:shadow-md transition-shadow ' + opacityClass + ' ' + noConnectionsClass + '">' +
            '<div class="flex justify-between items-start">' +
            '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 mb-1 flex-wrap">' +
            '<span class="text-xs font-semibold px-1.5 py-0.5 rounded uppercase" style="background-color:' + rackColor + '20;color:' + rackColor + '">' + (d.rackId || '').toUpperCase() + '</span>' +
            '<span class="text-xs text-slate-500">Pos.</span>' +
            '<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' +
            '<span class="text-xs px-1.5 py-0.5 rounded-full text-white ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="font-bold text-base text-slate-800 truncate">' + d.name + '</div>' +
            brandModelText +
            '<div class="text-xs text-slate-400 uppercase">' + d.type + '</div>' +
            addressText +
            serviceText +
            '<div class="text-xs mt-1 text-slate-500">📍 ' + d.ports.length + ' ports (' + usedPorts + ' used)</div>' +
            notesText +
            noConnectionsWarning +
            '</div>' +
            '<div class="flex flex-col gap-1 ml-2">' +
            '<button onclick="editDevice(' + d.id + ')" class="text-blue-500 hover:text-blue-700 text-lg p-1" title="Edit">✏️</button>' +
            '<button onclick="removeDevice(' + d.id + ')" class="text-red-500 hover:text-red-700 text-lg p-1" title="Delete">🗑️</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// ============================================================================
// MATRIX UPDATE
// ============================================================================
function updateMatrix() {
    var container = document.getElementById('matrixContainer');
    if (!container) return;

    var sorted = getSorted();
    if (sorted.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8">No devices to display. Add devices first.</div>';
        var btn = document.getElementById('toggleMatrixBtn');
        if (btn) btn.style.display = 'none';
        return;
    }

    var limit = appState.matrixExpanded ? sorted.length : Math.min(sorted.length, appState.matrixLimit);
    var displayDevices = sorted.slice(0, limit);
    var btn = document.getElementById('toggleMatrixBtn');
    if (btn) {
        btn.style.display = sorted.length > appState.matrixLimit ? 'inline-block' : 'none';
    }

    var html = '<div id="matrixPrintArea"><table class="w-full text-xs border-collapse"><thead><tr><th class="p-1 border border-slate-300 bg-slate-100 sticky left-0 z-10" style="min-width:120px;"></th>';

    for (var c = 0; c < displayDevices.length; c++) {
        var col = displayDevices[c];
        var rackColor = getRackColor(col.rackId);
        html += '<th class="p-1 border border-slate-300 bg-slate-100" style="min-width:90px;writing-mode:vertical-rl;text-orientation:mixed;height:100px;"><span style="color:' + rackColor + ';">' + (col.rackId || '') + '</span><br>' + col.name + '</th>';
    }
    html += '</tr></thead><tbody>';

    for (var r = 0; r < displayDevices.length; r++) {
        var row = displayDevices[r];
        var rowRackColor = getRackColor(row.rackId);
        html += '<tr><th class="p-1 border border-slate-300 bg-slate-100 text-left sticky left-0 z-10"><span style="color:' + rowRackColor + ';">[' + (row.rackId || '') + ']</span> ' + row.name + '</th>';

        for (var col2 = 0; col2 < displayDevices.length; col2++) {
            var colDev = displayDevices[col2];
            if (row.id === colDev.id) {
                html += '<td class="p-1 border border-slate-300 bg-slate-200 text-center">—</td>';
            } else {
                var connIdx = getConnectionIndex(row.id, colDev.id);
                if (connIdx >= 0) {
                    var conn = appState.connections[connIdx];
                    var cellColor = conn.color || config.connColors[conn.type] || '#6b7280';
                    var fromPort = conn.from === row.id ? conn.fromPort : conn.toPort;
                    var toPort = conn.from === row.id ? conn.toPort : conn.fromPort;
                    
                    var cellTitle = config.connLabels[conn.type] + ': ' + fromPort + ' ↔ ' + toPort;
                    var markerHtml = createMarkerHtml(conn.cableMarker, conn.cableColor, true);
                    
                    html += '<td class="p-1 border border-slate-300 text-center cursor-pointer hover:opacity-80" style="background-color:' + cellColor + '20;border-left:3px solid ' + cellColor + ';" title="' + cellTitle + '" onclick="editConnection(' + connIdx + ')">';
                    html += '<div class="text-xs" style="color:' + cellColor + ';">' + fromPort + '</div>';
                    html += '<div class="text-xs font-bold" style="color:' + cellColor + ';">↕</div>';
                    html += '<div class="text-xs" style="color:' + cellColor + ';">' + toPort + '</div>';
                    if (markerHtml) html += '<div class="mt-1">' + markerHtml + '</div>';
                    html += '</td>';
                } else {
                    html += '<td class="p-1 border border-slate-300 text-center text-slate-300">·</td>';
                }
            }
        }
        html += '</tr>';
    }

    html += '</tbody></table></div>';

    if (sorted.length > appState.matrixLimit && !appState.matrixExpanded) {
        html += '<div class="text-center text-slate-500 text-sm mt-2">Showing ' + limit + ' of ' + sorted.length + ' devices. Click "Show All" to see full matrix.</div>';
    }

    container.innerHTML = html;
}

// ============================================================================
// CONNECTIONS LIST UPDATE
// ============================================================================
function updateConnectionsList() {
    var container = document.getElementById('connectionsListContainer');
    if (!container) return;

    if (appState.connections.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8">No connections registered yet.</div>';
        return;
    }

    // Build connections with device info
    var conns = [];
    for (var i = 0; i < appState.connections.length; i++) {
        var c = appState.connections[i];
        var fromDev = null;
        var toDev = null;
        for (var j = 0; j < appState.devices.length; j++) {
            if (appState.devices[j].id === c.from) fromDev = appState.devices[j];
            if (appState.devices[j].id === c.to) toDev = appState.devices[j];
        }
        conns.push({
            index: i,
            conn: c,
            fromDev: fromDev,
            toDev: toDev,
            fromName: fromDev ? fromDev.name : '',
            toName: toDev ? toDev.name : (c.externalDest || ''),
            fromRack: fromDev ? fromDev.rackId : '',
            toRack: toDev ? toDev.rackId : ''
        });
    }

    // Sort
    var key = appState.connSort.key;
    var asc = appState.connSort.asc;
    conns.sort(function(a, b) {
        var va, vb;
        if (key === 'id') {
            va = a.index;
            vb = b.index;
        } else if (key === 'type') {
            va = a.conn.type;
            vb = b.conn.type;
        } else if (key === 'from') {
            va = a.fromName;
            vb = b.fromName;
        } else if (key === 'to') {
            va = a.toName;
            vb = b.toName;
        } else if (key === 'status') {
            va = a.conn.status;
            vb = b.conn.status;
        } else if (key === 'cable') {
            va = a.conn.cableMarker || '';
            vb = b.conn.cableMarker || '';
        } else {
            va = a.index;
            vb = b.index;
        }
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
    });

    var arrow = function(k) {
        if (appState.connSort.key !== k) return '';
        return appState.connSort.asc ? ' ▲' : ' ▼';
    };

    var html = '<div id="connectionsPrintArea"><table class="w-full text-sm"><thead><tr class="bg-slate-100">';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200 print-hide-id" onclick="toggleConnSort(\'id\')">#' + arrow('id') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200" onclick="toggleConnSort(\'type\')">Type' + arrow('type') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200" onclick="toggleConnSort(\'from\')">From' + arrow('from') + '</th>';
    html += '<th class="p-2 text-center">Port</th>';
    html += '<th class="p-2 text-center"></th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200" onclick="toggleConnSort(\'to\')">To' + arrow('to') + '</th>';
    html += '<th class="p-2 text-center">Port</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200" onclick="toggleConnSort(\'status\')">Status' + arrow('status') + '</th>';
    html += '<th class="p-2 text-left cursor-pointer hover:bg-slate-200" onclick="toggleConnSort(\'cable\')">Cable ID' + arrow('cable') + '</th>';
    html += '<th class="p-2 text-left">Notes</th>';
    html += '<th class="p-2 text-center no-print">Actions</th>';
    html += '</tr></thead><tbody>';

    for (var k = 0; k < conns.length; k++) {
        var item = conns[k];
        var c = item.conn;
        var typeColor = config.connColors[c.type] || '#6b7280';
        var statusColor = c.status === 'active' ? 'green' : (c.status === 'inactive' ? 'red' : 'slate');
        var fromRackColor = item.fromDev ? getRackColor(item.fromDev.rackId) : '#64748b';
        var toRackColor = item.toDev ? getRackColor(item.toDev.rackId) : '#64748b';
        var isExternal = !item.toDev && c.externalDest;
        
        var markerHtml = createMarkerHtml(c.cableMarker, c.cableColor, false);

        html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';
        html += '<td class="p-2 text-slate-400 print-hide-id">' + (item.index + 1) + '</td>';
        html += '<td class="p-2"><span class="px-2 py-1 rounded text-xs text-white" style="background-color:' + typeColor + ';">' + config.connLabels[c.type] + '</span></td>';
        html += '<td class="p-2 font-medium"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + fromRackColor + ';margin-right:6px;"></span>' + item.fromName + '</td>';
        html += '<td class="p-2 text-center text-xs text-slate-600">' + (c.fromPort || '') + '</td>';
        html += '<td class="p-2 text-center text-slate-400 font-bold">↔</td>';
        
        if (isExternal) {
            html += '<td class="p-2 font-medium text-slate-600"><span class="mr-1">📡</span>' + c.externalDest + '</td>';
            html += '<td class="p-2 text-center text-xs text-slate-400">—</td>';
        } else {
            html += '<td class="p-2 font-medium"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + toRackColor + ';margin-right:6px;"></span>' + item.toName + '</td>';
            html += '<td class="p-2 text-center text-xs text-slate-600">' + (c.toPort || '') + '</td>';
        }
        
        html += '<td class="p-2"><span class="px-2 py-1 rounded text-xs bg-' + statusColor + '-100 text-' + statusColor + '-700">' + c.status + '</span></td>';
        html += '<td class="p-2">' + markerHtml + '</td>';
        html += '<td class="p-2 text-xs text-slate-500">' + (c.notes || '') + '</td>';
        html += '<td class="p-2 text-center no-print">';
        html += '<div class="flex flex-col items-center gap-1">';
        html += '<button onclick="editConnection(' + item.index + ')" class="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>';
        html += '<button onclick="removeConnection(' + item.index + ')" class="text-red-500 hover:text-red-700 text-xs font-medium">Del</button>';
        html += '</div></td>';
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================
function exportExcel() {
    if (typeof XLSX === 'undefined') {
        Toast.error('XLSX library not loaded. Cannot export to Excel.');
        return;
    }

    var wb = XLSX.utils.book_new();
    
    // Devices sheet
    var devRows = [['Rack', 'Order', 'Name', 'Brand/Model', 'Type', 'Status', 'Addresses', 'Service', 'Ports', 'Notes']];
    var sorted = getSorted();
    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var addrs = '';
        if (d.addresses) {
            var parts = [];
            for (var j = 0; j < d.addresses.length; j++) {
                var a = d.addresses[j];
                var p = [];
                if (a.network) p.push(a.network);
                if (a.ip) p.push(a.ip);
                if (a.vlan) p.push('VLAN ' + a.vlan);
                if (p.length) parts.push(p.join(', '));
            }
            addrs = parts.join('; ');
        }
        var ports = d.ports ? d.ports.map(function(p) { return p.name; }).join(', ') : '';
        devRows.push([d.rackId || '', d.order || 1, d.name || '', d.brandModel || '', d.type || '', d.status || '', addrs, d.service || '', ports, d.notes || '']);
    }
    var ws1 = XLSX.utils.aoa_to_sheet(devRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Devices');

    // Connections sheet
    var connRows = [['Type', 'From Device', 'From Port', 'To Device', 'To Port', 'External Dest', 'Status', 'Cable ID', 'Cable Color', 'Notes']];
    for (var k = 0; k < appState.connections.length; k++) {
        var c = appState.connections[k];
        var fromDev = null;
        var toDev = null;
        for (var m = 0; m < appState.devices.length; m++) {
            if (appState.devices[m].id === c.from) fromDev = appState.devices[m];
            if (appState.devices[m].id === c.to) toDev = appState.devices[m];
        }
        connRows.push([
            c.type || '',
            fromDev ? fromDev.name : '',
            c.fromPort || '',
            toDev ? toDev.name : '',
            c.toPort || '',
            c.externalDest || '',
            c.status || '',
            c.cableMarker || '',
            c.cableColor || '',
            c.notes || ''
        ]);
    }
    var ws2 = XLSX.utils.aoa_to_sheet(connRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Connections');

    XLSX.writeFile(wb, 'network_manager_' + new Date().toISOString().slice(0,10) + '.xlsx');
    Toast.success('Excel exported successfully');
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
