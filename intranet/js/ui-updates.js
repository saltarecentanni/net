/**
 * Tiesse Matrix Network - UI Update Functions
 * Version: 2.5.1
 * 
 * Contains UI rendering functions:
 * - Device list (cards)
 * - Connection matrix
 * - Connections table
 * - Excel export
 */

'use strict';

// ============================================================================
// DEVICES LIST UPDATE (Card Style with all effects)
// ============================================================================
function updateDevicesList() {
    var cont = document.getElementById('devicesListContainer');
    if (!cont) return;
    
    if (appState.devices.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 col-span-5 text-sm">No devices added yet</p>';
        return;
    }

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
            '<span class="text-xs text-slate-500">Rack Pos.</span>' +
            '<span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + String(d.order).padStart(2, '0') + '</span>' +
            '<span class="text-xs px-1.5 py-0.5 rounded-full text-white ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="font-bold text-base text-slate-800 truncate">' + d.name + '</div>' +
            brandModelText +
            '<div class="text-xs text-slate-400 uppercase">' + d.type + '</div>' +
            addressText +
            '<div class="text-xs mt-1 text-slate-500">' + d.ports.length + ' ports (' + usedPorts + ' used)</div>' +
            noConnectionsWarning +
            '</div>' +
            '<div class="flex flex-col gap-1 ml-2">' +
            '<button onclick="editDevice(' + d.id + ')" class="text-blue-500 hover:text-blue-700 text-sm p-1">&#9998;</button>' +
            '<button onclick="removeDevice(' + d.id + ')" class="text-red-500 hover:text-red-700 text-sm p-1">&times;</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';
    cont.innerHTML = html;
}

// ============================================================================
// MATRIX UPDATE (Full styling with colors and effects)
// ============================================================================
function updateMatrix() {
    var cont = document.getElementById('matrixContainer');
    if (!cont) return;
    
    if (appState.devices.length === 0) {
        cont.innerHTML = '<p class="text-slate-400 text-center py-6 text-sm">Add devices to see the matrix</p>';
        return;
    }

    var sorted = getSorted();

    var html = '<table id="matrixTable" class="border-collapse text-xs"><thead><tr>';
    html += '<th class="p-2 sticky-col font-bold text-center whitespace-nowrap" style="border:1px solid #64748b;background-color:#334155;color:#ffffff;"><div style="font-size:11px;">Devices</div><div style="font-size:10px;color:#94a3b8;">Total ' + sorted.length + '</div></th>';

    // HEADER HORIZONTAL - Fundo ESCURO preenchido com cor do rack
    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var rackColor = getRackColor(d.rackId);
        var posNum = String(d.order || 0).padStart(2, '0');
        var rackName = (d.rackId || '').toUpperCase();
        html += '<th class="p-1 text-center" data-col="' + i + '" style="min-width:95px;width:95px;border:2px solid ' + rackColor + ';background-color:#334155;">' +
            '<div style="font-size:8px;font-weight:600;color:' + rackColor + ';line-height:1.4;">' + rackName + '</div>' +
            '<div style="font-size:9px;font-weight:700;color:#ffffff;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + d.name + '</div>' +
            '<span style="display:inline-flex;align-items:center;justify-content:center;margin-top:3px;width:20px;height:20px;font-size:9px;font-weight:700;border-radius:50%;background-color:#dbeafe;color:#1e40af;">' + posNum + '</span>' +
            '</th>';
    }
    html += '</tr></thead><tbody>';

    // ROWS
    for (var r = 0; r < sorted.length; r++) {
        var row = sorted[r];
        var rowRackColor = getRackColor(row.rackId);
        var rowPosNum = String(row.order || 0).padStart(2, '0');
        var rowRackName = (row.rackId || '').toUpperCase();
        
        // HEADER VERTICAL - Fundo CLARO preenchido com cor do rack
        html += '<tr data-row="' + r + '"><td class="p-1 sticky-col text-center" style="min-width:95px;width:95px;border:2px solid ' + rowRackColor + ';background-color:#f1f5f9;">' +
            '<div style="font-size:8px;font-weight:600;color:' + rowRackColor + ';line-height:1.4;">' + rowRackName + '</div>' +
            '<div style="font-size:9px;font-weight:700;color:#1e293b;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + row.name + '</div>' +
            '<span style="display:inline-flex;align-items:center;justify-content:center;margin-top:3px;width:20px;height:20px;font-size:9px;font-weight:700;border-radius:50%;background-color:#dbeafe;color:#1e40af;">' + rowPosNum + '</span>' +
            '</td>';

        for (var c = 0; c < sorted.length; c++) {
            var col = sorted[c];
            var colRackColor = getRackColor(col.rackId);
            var connIdx = getConnectionIndex(row.id, col.id);

            // DIAGONAL - Célula transparente/mínima
            if (row.id === col.id) {
                html += '<td class="matrix-cell" data-row="' + r + '" data-col="' + c + '" style="width:95px;min-width:95px;max-width:95px;height:75px;background:linear-gradient(135deg, #f1f5f9 50%, #e2e8f0 50%);border:1px solid #e2e8f0;"></td>';
            } else if (connIdx >= 0) {
                var conn = appState.connections[connIdx];
                var shortType = conn.type ? (conn.type.substring(0,3).toUpperCase()) : '';
                var cableColor = conn.cableColor || '#ffffff';
                
                // Determine port display based on which device is in row vs column
                // portA = vertical (row) = fundo claro, portB = horizontal (col) = fundo escuro
                var portA = '';
                var portB = '';
                if (conn.from === row.id) {
                    portA = conn.fromPort || '-';
                    portB = conn.toPort || '-';
                } else {
                    portA = conn.toPort || '-';
                    portB = conn.fromPort || '-';
                }
                
                // Cable marker usando createMarkerHtml (mesmo estilo do Active Connections)
                var markerHtml = conn.cableMarker ? '<div style="margin-top:3px;">' + createMarkerHtml(conn.cableMarker, cableColor, true) + '</div>' : '';
                
                html += '<td class="matrix-cell border p-0 text-center cursor-pointer hover:opacity-90" data-row="' + r + '" data-col="' + c + '" data-conn="' + connIdx + '" data-cable-color="' + cableColor + '" style="width:95px;min-width:95px;max-width:95px;height:75px;background-color:#f8fafc;padding:3px;" onclick="editConnection(' + connIdx + ')">' +
                    '<div style="background-color:' + conn.color + ';padding:4px 3px;border-radius:6px;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;box-shadow:0 2px 6px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.1);overflow:hidden;">' +
                    '<div style="font-size:9px;font-weight:700;color:#fff;text-shadow:1px 1px 1px rgba(0,0,0,0.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:85px;">' + shortType + '</div>' +
                    '<div style="font-weight:bold;white-space:nowrap;display:flex;justify-content:center;align-items:center;gap:2px;margin-top:2px;max-width:85px;">' +
                    '<span style="font-size:9px;color:#1e293b;background-color:#f1f5f9;padding:2px 4px;border-radius:6px;font-weight:700;max-width:35px;overflow:hidden;text-overflow:ellipsis;">' + portA + '</span>' +
                    '<span style="font-size:9px;color:#fde047;text-shadow:1px 1px 1px rgba(0,0,0,0.5);">⟷</span>' +
                    '<span style="font-size:9px;color:#ffffff;background-color:#334155;padding:2px 4px;border-radius:6px;font-weight:700;max-width:35px;overflow:hidden;text-overflow:ellipsis;">' + portB + '</span>' +
                    '</div>' +
                    markerHtml +
                    '</div>' +
                    '</td>';
            } else {
                html += '<td class="matrix-cell border p-1" data-row="' + r + '" data-col="' + c + '" style="width:95px;min-width:95px;max-width:95px;height:75px;background-color:#fff;border:1px solid #e2e8f0;"></td>';
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
        { key: 'id', label: 'ID', printHide: true },
        { key: 'fromRack', label: 'Src Rack' },
        { key: 'fromPos', label: 'Rack Pos.' },
        { key: 'fromDevice', label: 'Src Device' },
        { key: 'fromPort', label: 'Src Port' },
        { key: 'arrow', label: '' },
        { key: 'toPort', label: 'Dst Port' },
        { key: 'toDevice', label: 'Dst Device' },
        { key: 'toPos', label: 'Dst Pos.' },
        { key: 'toRack', label: 'Dst Rack' },
        { key: 'type', label: 'Type' },
        { key: 'marker', label: 'Cable ID' },
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
                case 'toRack': return toDevice ? (toDevice.rackId || '') : (conn.externalDest ? 'External' : '');
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
            return appState.connSort.asc ? na - nb : nb - na;
        }

        va = (va || '').toString().toLowerCase();
        vb = (vb || '').toString().toLowerCase();
        if (va < vb) return appState.connSort.asc ? -1 : 1;
        if (va > vb) return appState.connSort.asc ? 1 : -1;
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

        // Handle external destination display
        var toDisplayName = toDevice ? toDevice.name : (c.externalDest ? '📡 ' + c.externalDest : 'N/A');
        var toDisplayRack = toDevice ? toDevice.rackId : (c.externalDest ? 'External' : 'N/A');
        var toDisplayPos = toDevice ? String(toDevice.order).padStart(2, '0') : (c.externalDest ? '-' : 'N/A');

        // Get the original index for edit/remove operations
        var origIdx = originalIndexMap.get(c);

        html += '<tr class="' + rowBg + ' ' + opacityClass + ' hover:bg-blue-50 border-b-2 border-slate-300">' +
            '<td class="px-3 py-2 align-top print-hide-id">' + (origIdx + 1) + '</td>' +
            '<td class="px-3 py-2 align-top font-bold" style="color:' + fromRackColor + '">' + (fromDevice ? fromDevice.rackId : 'N/A') + '</td>' +
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + (fromDevice ? String(fromDevice.order).padStart(2, '0') : 'N/A') + '</span></td>' +
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
            '<td class="px-3 py-2 align-top"><span class="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + toDisplayPos + '</span></td>' +
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
                'Rack ID': d.rackId,
                'Order': d.order,
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
                'Dst Device': toDevice ? toDevice.name : (c.externalDest ? '📡 ' + c.externalDest : ''),
                'Dst Pos': toDevice ? toDevice.order : '',
                'Dst Rack': toDevice ? toDevice.rackId : (c.externalDest ? 'External' : ''),
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
