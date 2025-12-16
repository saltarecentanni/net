/**
 * Tiesse Matrix Network - Application Core
 * Version: 2.4.0
 * 
 * Refactored with:
 * - Encapsulated state (appState)
 * - Toast notification system (replaces alert())
 * - Modular structure
 */

'use strict';

// ============================================================================
// GLOBAL STATE (Encapsulated)
// ============================================================================
var appState = {
    devices: [],
    connections: [],
    nextDeviceId: 1,
    connSort: { key: 'id', asc: true },
    matrixLimit: 12,
    matrixExpanded: false,
    rackColorMap: {}
};

// ============================================================================
// CONFIGURATION
// ============================================================================
var config = {
    connColors: {
        lan: '#3b82f6',
        wan: '#ef4444',
        dmz: '#f97316',
        trunk: '#22c55e',
        management: '#8b5cf6',
        backup: '#eab308',
        fiber: '#06b6d4',
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
        other: 'Other'
    },
    portTypes: [
        'Eth', 'GbE', 'SFP/SFP+', 'QSFP/QSFP+', 'TTY', 'MGMT', 'PoE',
        'Fiber', 'USB', 'RJ11', 'WAN', 'Eth/Wan', 'others'
    ],
    rackColors: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
        '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7',
        '#0ea5e9', '#d946ef', '#10b981', '#f59e0b', '#6366f1', '#78716c',
        '#dc2626', '#059669', '#7c3aed', '#db2777', '#0891b2', '#65a30d'
    ]
};

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
        fields = ['rackId', 'deviceOrder', 'deviceName', 'deviceBrandModel', 'deviceType', 'deviceStatus', 'deviceAddresses', 'deviceService', 'deviceNotes'];
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
                    return true;
                }
                return false;
            });
    }
    return tryUrl('data.php').catch(function() { return tryUrl('/data.php'); });
}

function serverSave() {
    function postUrl(url) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                devices: appState.devices,
                connections: appState.connections,
                nextDeviceId: appState.nextDeviceId
            })
        }).then(function(r) { return r.json(); });
    }
    postUrl('data.php').catch(function() { 
        postUrl('/data.php').catch(function(e) { 
            console.warn('Server save failed:', e);
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
    try {
        var editId = document.getElementById('deviceEditId').value;
        var rackId = document.getElementById('rackId').value.trim();
        var order = parseInt(document.getElementById('deviceOrder').value, 10) || 1;
        var name = document.getElementById('deviceName').value.trim();
        var brandModel = document.getElementById('deviceBrandModel').value.trim();
        var type = document.getElementById('deviceType').value;
        var status = document.getElementById('deviceStatus').value;
        var addressesText = document.getElementById('deviceAddresses').value.trim();
        var service = document.getElementById('deviceService').value.trim();
        var notes = document.getElementById('deviceNotes').value.trim();

        // Validation
        if (!rackId) {
            Toast.warning('Please enter Rack ID');
            document.getElementById('rackId').focus();
            return;
        }
        if (!name) {
            Toast.warning('Please enter Device Name');
            document.getElementById('deviceName').focus();
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

        var addresses = parseAddresses(addressesText);

        var deviceData = {
            id: editId ? parseInt(editId, 10) : appState.nextDeviceId++,
            rackId: rackId,
            order: order,
            name: name,
            brandModel: brandModel,
            type: type,
            status: status,
            addresses: addresses,
            service: service,
            ports: ports,
            notes: notes
        };

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
    document.getElementById('deviceOrder').value = '1';
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceBrandModel').value = '';
    document.getElementById('deviceType').value = 'router';
    document.getElementById('deviceStatus').value = 'active';
    document.getElementById('deviceAddresses').value = '';
    document.getElementById('deviceService').value = '';
    document.getElementById('deviceNotes').value = '';
    document.getElementById('portTypeQuantityContainer').innerHTML = '';
    document.getElementById('saveDeviceButton').textContent = 'Add Device';
    highlightEditFields('device', false);
}

function editDevice(id) {
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
    document.getElementById('rackId').value = d.rackId || '';
    document.getElementById('deviceOrder').value = d.order || 1;
    document.getElementById('deviceName').value = d.name || '';
    document.getElementById('deviceBrandModel').value = d.brandModel || '';
    document.getElementById('deviceType').value = d.type || 'router';
    document.getElementById('deviceStatus').value = d.status || 'active';
    document.getElementById('deviceAddresses').value = formatAddresses(d.addresses || []);
    document.getElementById('deviceService').value = d.service || '';
    document.getElementById('deviceNotes').value = d.notes || '';
    document.getElementById('saveDeviceButton').textContent = 'Update Device';

    autoResizeTextarea(document.getElementById('deviceAddresses'));
    autoResizeTextarea(document.getElementById('deviceNotes'));

    var container = document.getElementById('portTypeQuantityContainer');
    container.innerHTML = '';

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

    highlightEditFields('device', true);
    document.getElementById('rackId').scrollIntoView({ behavior: 'smooth' });
}

function removeDevice(id) {
    var deviceName = '';
    for (var i = 0; i < appState.devices.length; i++) {
        if (appState.devices[i].id === id) {
            deviceName = appState.devices[i].name;
            break;
        }
    }
    
    if (!confirm('Remove device "' + deviceName + '"? This will also remove all its connections.')) return;

    appState.devices = appState.devices.filter(function(d) { return d.id !== id; });
    appState.connections = appState.connections.filter(function(c) { return c.from !== id && c.to !== id; });
    
    clearDeviceForm();
    updateUI();
    Toast.success('Device "' + deviceName + '" removed');
}

function renderPortField(type, qty, startAtZero) {
    var options = '';
    for (var i = 0; i < config.portTypes.length; i++) {
        var t = config.portTypes[i];
        options += '<option value="' + t + '"' + (t === type ? ' selected' : '') + '>' + t + '</option>';
    }
    
    var checked = startAtZero ? ' checked' : '';
    return '<div class="port-type-row flex items-center gap-2 mb-2">' +
        '<select class="px-2 py-1 border border-slate-300 rounded text-sm">' + options + '</select>' +
        '<input type="number" min="0" max="999" value="' + qty + '" class="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center" placeholder="Qty">' +
        '<label class="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox"' + checked + ' class="rounded"> Start at 0</label>' +
        '<button type="button" onclick="removePortField(this)" class="text-red-500 hover:text-red-700 text-lg font-bold">×</button>' +
        '</div>';
}

function removePortField(btn) {
    var row = btn.closest('.port-type-row');
    if (row) row.remove();
}

function addPortTypeField() {
    var container = document.getElementById('portTypeQuantityContainer');
    container.insertAdjacentHTML('beforeend', renderPortField('Eth', 1, false));
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================
function saveConnection() {
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
        var cableColor = document.getElementById('cableColor').value;
        var notes = document.getElementById('connNotes').value.trim();

        var from = fromDeviceVal ? parseInt(fromDeviceVal, 10) : null;
        var to = (toDeviceVal && toDeviceVal !== 'external') ? parseInt(toDeviceVal, 10) : null;
        var isExternal = (toDeviceVal === 'external');

        // Validation
        if (!from) {
            Toast.warning('Please select source device');
            document.getElementById('fromDevice').focus();
            return;
        }

        if (isExternal && !externalDest) {
            Toast.warning('Please enter external destination name');
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

        // Check port usage
        var fromPortUsed = false;
        var toPortUsed = false;
        for (var j = 0; j < appState.connections.length; j++) {
            if (editIndex !== '' && j === parseInt(editIndex, 10)) continue;
            var c = appState.connections[j];
            if (from && fromPort && ((c.from === from && c.fromPort === fromPort) || (c.to === from && c.toPort === fromPort))) {
                fromPortUsed = true;
            }
            if (to && toPort && ((c.from === to && c.fromPort === toPort) || (c.to === to && c.toPort === toPort))) {
                toPortUsed = true;
            }
        }

        if (fromPortUsed) {
            Toast.error('Source port is already in use');
            return;
        }
        if (toPortUsed) {
            Toast.error('Destination port is already in use');
            return;
        }

        var connData = {
            from: from,
            fromPort: fromPort || '',
            to: to,
            toPort: isExternal ? '' : (toPort || ''),
            externalDest: isExternal ? externalDest : '',
            type: type,
            color: config.connColors[type],
            status: status,
            cableMarker: cableMarker,
            cableColor: cableColor,
            notes: notes
        };

        if (editIndex !== '') {
            appState.connections[parseInt(editIndex, 10)] = connData;
            Toast.success('Connection updated successfully');
        } else {
            appState.connections.push(connData);
            Toast.success('Connection added successfully');
        }

        clearConnectionForm();
        updateUI();
    } catch (e) {
        console.error('Error saving connection:', e);
        Toast.error('Error saving connection: ' + e.message);
    }
}

function editConnection(idx) {
    var c = appState.connections[idx];
    if (!c) return;

    switchTab('matrix');

    document.getElementById('connEditIndex').value = idx;
    document.getElementById('fromDevice').value = c.from;
    updateFromPorts(c.fromPort);
    
    if (c.externalDest) {
        document.getElementById('toDevice').value = 'external';
        document.getElementById('externalDest').value = c.externalDest;
        toggleExternalDest();
    } else {
        document.getElementById('toDevice').value = c.to;
        updateToPorts(c.toPort);
        toggleExternalDest();
    }
    
    document.getElementById('connType').value = c.type;
    document.getElementById('connStatus').value = c.status;
    document.getElementById('cableMarker').value = c.cableMarker || '';
    document.getElementById('cableColor').value = c.cableColor || '';
    document.getElementById('connNotes').value = c.notes || '';

    autoResizeTextarea(document.getElementById('connNotes'));

    document.getElementById('connectionFormTitle').textContent = 'Edit Connection';
    document.getElementById('saveConnectionButton').textContent = 'Update Connection';
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
    document.getElementById('fromDevice').value = '';
    document.getElementById('fromPort').innerHTML = '<option value="">Select source port</option>';
    document.getElementById('toDevice').value = '';
    document.getElementById('toPort').innerHTML = '<option value="">Select destination port</option>';
    document.getElementById('externalDest').value = '';
    toggleExternalDest();
    document.getElementById('connType').value = 'lan';
    document.getElementById('connStatus').value = 'active';
    document.getElementById('cableMarker').value = '';
    document.getElementById('cableColor').value = '';
    document.getElementById('connNotes').value = '';

    document.getElementById('connectionFormTitle').textContent = 'Add Connection';
    document.getElementById('saveConnectionButton').textContent = 'Add Connection';
    document.getElementById('cancelConnectionButton').classList.add('hidden');

    highlightEditFields('connection', false);
}

function removeConnection(idx) {
    if (!confirm('Remove this connection?')) return;
    appState.connections.splice(idx, 1);
    clearConnectionForm();
    updateUI();
    Toast.success('Connection removed');
}

function toggleExternalDest() {
    var toDevice = document.getElementById('toDevice').value;
    var toPortContainer = document.getElementById('toPortContainer');
    var externalDestContainer = document.getElementById('externalDestContainer');
    if (toDevice === 'external') {
        toPortContainer.classList.add('hidden');
        externalDestContainer.classList.remove('hidden');
    } else {
        toPortContainer.classList.remove('hidden');
        externalDestContainer.classList.add('hidden');
    }
}

function isPortUsed(deviceId, portName, excludeConnIdx) {
    for (var i = 0; i < appState.connections.length; i++) {
        if (typeof excludeConnIdx !== 'undefined' && i === excludeConnIdx) continue;
        var c = appState.connections[i];
        if ((c.from === deviceId && c.fromPort === portName) || (c.to === deviceId && c.toPort === portName)) {
            return true;
        }
    }
    return false;
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
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var label = p.name + ' ' + (used ? '(Used)' : '(Free)');
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
    sel.innerHTML = '<option value="">Select destination port</option>';
    if (d && d.ports) {
        var editIdx = document.getElementById('connEditIndex').value;
        var excludeIdx = editIdx !== '' ? parseInt(editIdx, 10) : undefined;
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var label = p.name + ' ' + (used ? '(Used)' : '(Free)');
            var selected = (selectedPort === p.name) ? 'selected' : '';
            sel.innerHTML += '<option value="' + p.name + '" ' + selected + '>' + label + '</option>';
        }
    }
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
    saveToStorage();
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
    var sorted = getSorted();
    var opts = '<option value="">Select device</option>';
    for (var i = 0; i < sorted.length; i++) {
        var d = sorted[i];
        var rackColor = getRackColor(d.rackId);
        opts += '<option value="' + d.id + '" style="color:' + rackColor + ';font-weight:bold;">[' + d.rackId + '][' + String(d.order).padStart(2, '0') + '] ' + d.name + '</option>';
    }
    document.getElementById('fromDevice').innerHTML = opts.replace('Select device', 'Select source');
    document.getElementById('toDevice').innerHTML = opts.replace('Select device', 'Select destination') + '<option value="external" style="color:#6b7280;font-style:italic;">📡 External (ISP, Fiber, WAN...)</option>';
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

function toggleConnSort(key) {
    if (appState.connSort.key === key) {
        appState.connSort.asc = !appState.connSort.asc;
    } else {
        appState.connSort.key = key;
        appState.connSort.asc = true;
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
    a.download = 'network_manager_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Toast.success('JSON exported successfully');
}

function importData(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            var data = JSON.parse(ev.target.result);
            if (data.devices && data.connections) {
                appState.devices = data.devices;
                appState.connections = data.connections;
                if (data.nextDeviceId && typeof data.nextDeviceId === 'number') {
                    appState.nextDeviceId = data.nextDeviceId;
                } else {
                    var maxId = 0;
                    for (var i = 0; i < appState.devices.length; i++) {
                        if (appState.devices[i].id > maxId) maxId = appState.devices[i].id;
                    }
                    appState.nextDeviceId = maxId + 1;
                }
                updateUI();
                Toast.success('Data imported successfully! (' + appState.devices.length + ' devices, ' + appState.connections.length + ' connections)');
            } else {
                Toast.error('Invalid JSON format. Expected "devices" and "connections" arrays.');
            }
        } catch (err) {
            console.error('Error importing data:', err);
            Toast.error('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function clearAll() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) return;
    appState.devices = [];
    appState.connections = [];
    appState.nextDeviceId = 1;
    clearConnectionForm();
    clearDeviceForm();
    updateUI();
    Toast.info('All data cleared');
}

// ============================================================================
// PRINT FUNCTIONS
// ============================================================================
function printMatrix() {
    var printArea = document.getElementById('matrixPrintArea');
    if (printArea) {
        var printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Connection Matrix</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print{.no-print{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style></head><body class="p-4">' + printArea.innerHTML + '</body></html>');
        printWindow.document.close();
        printWindow.print();
    }
}

function printConnections() {
    var printArea = document.getElementById('connectionsPrintArea');
    if (printArea) {
        var printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Active Connections</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print{.no-print,.print-hide-id{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style></head><body class="p-4">' + printArea.innerHTML + '</body></html>');
        printWindow.document.close();
        printWindow.print();
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function initApp() {
    serverLoad().then(function(ok) {
        if (!ok) loadFromStorage();
        updateUI();
        Toast.info('Tiesse Matrix Network loaded');
    }).catch(function() {
        loadFromStorage();
        updateUI();
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
