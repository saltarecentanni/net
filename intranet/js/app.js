/**
 * Matrix Network - Application Core
 * Version: 1.9.9
 * 
 * Features:
 * - Encapsulated state (appState)
 * - Toast notification system
 * - Manual "Save Now" button (auto-save disabled to prevent race conditions)
 * - Modular structure
 * - Robust import/export with validation
 * - Patch panel dual-connection support (front/back)
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
    deviceSort: { key: 'rack', asc: true },
    deviceView: 'cards',
    matrixLimit: 12,
    matrixExpanded: false,
    rackColorMap: {}
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
        fields = ['rackId', 'deviceOrder', 'deviceRear', 'deviceName', 'deviceBrandModel', 'deviceType', 'deviceStatus', 'deviceAddresses', 'deviceService', 'deviceNotes'];
    }
    
    for (var i = 0; i < fields.length; i++) {
        var el = document.getElementById(fields[i]);
        if (el) {
            if (enable) {
                // Orange/amber border only - clean white background
                el.style.borderColor = '#f59e0b'; // amber-500
                el.style.borderWidth = '2px';
                el.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.15)';
            } else {
                el.style.borderColor = '';
                el.style.borderWidth = '';
                el.style.boxShadow = '';
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
        showSyncIndicator('saved', '✓ Salvato!');
        serverSave();
        Toast.success('Dati salvati con successo!');
    } catch (e) {
        console.error('Error saving:', e);
        Toast.error('Errore nel salvataggio: ' + e.message);
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
            body: payload
        }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(data) {
            if (data.error) throw new Error(data.error);
            return data;
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
            console.log('/data failed:', err1.message, '- trying /data.php');
            return postUrl('/data.php')
                .then(function() {
                    showSyncIndicator('saved', '✓ Server');
                    console.log('Server save OK: /data.php');
                })
                .catch(function(err2) {
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
        var addressesText = document.getElementById('deviceAddresses').value.trim();
        var service = document.getElementById('deviceService').value.trim();
        var notes = document.getElementById('deviceNotes').value.trim();

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
            isRear: isRear,
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
    document.getElementById('deviceRear').checked = false;
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceBrandModel').value = '';
    document.getElementById('deviceType').value = 'router';
    document.getElementById('deviceStatus').value = 'active';
    document.getElementById('deviceAddresses').value = '';
    document.getElementById('deviceService').value = '';
    document.getElementById('deviceNotes').value = '';
    document.getElementById('portTypeQuantityContainer').innerHTML = '';
    document.getElementById('saveDeviceButton').textContent = 'Add Device';
    var cancelBtn = document.getElementById('cancelDeviceButton');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    highlightEditFields('device', false);
}

/**
 * Cancel device edit - returns to add mode
 */
function cancelDeviceEdit() {
    clearDeviceForm();
    Toast.info('Modifica annullata');
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
    document.getElementById('deviceOrder').value = d.order !== undefined ? d.order : 1;
    document.getElementById('deviceRear').checked = d.isRear || false;
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
    // Show cancel button when editing
    var cancelBtn = document.getElementById('cancelDeviceButton');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
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

        // Check port usage - using isPortUsed function which handles patch panel logic
        var excludeIdx = editIndex !== '' ? parseInt(editIndex, 10) : undefined;
        
        if (from && fromPort && isPortUsed(from, fromPort, excludeIdx)) {
            // Check if it's a patch panel that already has 2 connections
            var fromDeviceType = fromDevice ? fromDevice.type : '';
            if (fromDeviceType === 'patch') {
                Toast.error('Porta del patch panel già ha 2 connessioni (fronte e retro)');
            } else {
                Toast.error('Porta sorgente già in uso');
            }
            return;
        }
        
        if (to && toPort && isPortUsed(to, toPort, excludeIdx)) {
            var toDeviceType = toDevice ? toDevice.type : '';
            if (toDeviceType === 'patch') {
                Toast.error('Porta del patch panel già ha 2 connessioni (fronte e retro)');
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

    switchTab('active');

    document.getElementById('connEditIndex').value = idx;
    document.getElementById('fromDevice').value = c.from;
    updateFromPorts(c.fromPort);
    
    if (c.isWallJack) {
        document.getElementById('toDevice').value = 'walljack';
        document.getElementById('externalDest').value = c.externalDest;
        toggleExternalDest();
    } else if (c.externalDest && !c.to) {
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
    
    // Patch panels can have 2 connections per port (front and back)
    // Example: Wall jack connects to patch panel port 19 (back)
    //          Switch connects to patch panel port 19 (front)
    var isPatchPanel = device && device.type === 'patch';
    var maxConnections = isPatchPanel ? 2 : 1;
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
        var isPatchPanel = d.type === 'patch';
        
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var label;
            
            if (isPatchPanel) {
                // Count current connections for patch panel port
                var connCount = getPortConnectionCount(id, p.name, excludeIdx);
                if (connCount === 0) {
                    label = p.name + ' (Libera)';
                } else if (connCount === 1) {
                    label = p.name + ' (1/2 - disponibile)';
                } else {
                    label = p.name + ' (2/2 - completa)';
                }
            } else {
                label = p.name + ' ' + (used ? '(In uso)' : '(Libera)');
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
        var isPatchPanel = d.type === 'patch';
        
        for (var j = 0; j < d.ports.length; j++) {
            var p = d.ports[j];
            var used = isPortUsed(id, p.name, excludeIdx);
            var label;
            
            if (isPatchPanel) {
                var connCount = getPortConnectionCount(id, p.name, excludeIdx);
                if (connCount === 0) {
                    label = p.name + ' (Libera)';
                } else if (connCount === 1) {
                    label = p.name + ' (1/2 - disponibile)';
                } else {
                    label = p.name + ' (2/2 - completa)';
                }
            } else {
                label = p.name + ' ' + (used ? '(In uso)' : '(Libera)');
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
        var statusPrefix = (d.status === 'disabled') ? '* ' : '';
        var rearIndicator = d.isRear ? ' (R)' : '';
        var statusStyle = 'color:' + rackColor + ';font-weight:bold;';
        opts += '<option value="' + d.id + '" style="' + statusStyle + '">' + statusPrefix + '[' + d.rackId + '][' + String(d.order).padStart(2, '0') + '] ' + d.name + rearIndicator + '</option>';
    }
    // Special destinations: Wall Jack and External - highlighted in bold
    var specialOpts = '<option disabled style="font-size:10px;color:#94a3b8;">───── Special Destinations ─────</option>' +
        '<option value="walljack" style="color:#000000;font-weight:900;background-color:#f5f3ff;">🔌 Internal Wall Jack, Presa Lan, others conections</option>' +
        '<option value="external" style="color:#000000;font-weight:900;background-color:#fef2f2;">📡 External (ISP, Fiber, WAN)</option>';
    
    document.getElementById('fromDevice').innerHTML = opts.replace('Select device', 'Select source');
    document.getElementById('toDevice').innerHTML = opts.replace('Select device', 'Select destination') + specialOpts;
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
            
            // Validate structure
            if (!data.devices || !Array.isArray(data.devices)) {
                Toast.error('Invalid JSON: missing or invalid "devices" array');
                return;
            }
            if (!data.connections || !Array.isArray(data.connections)) {
                Toast.error('Invalid JSON: missing or invalid "connections" array');
                return;
            }
            
            // Validate each device has required fields
            for (var i = 0; i < data.devices.length; i++) {
                var d = data.devices[i];
                if (!d.id || !d.rackId || !d.name || !d.type || !d.status || !d.ports) {
                    Toast.error('Invalid device at index ' + i + ': missing required fields');
                    return;
                }
            }
            
            // Validate each connection has required fields
            for (var j = 0; j < data.connections.length; j++) {
                var c = data.connections[j];
                if (typeof c.from !== 'number' || !c.type || !c.status) {
                    Toast.error('Invalid connection at index ' + j + ': missing required fields');
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
// PRINT FUNCTIONS - Professional Reports
// ============================================================================
function getPrintStyles() {
    return '<style>' +
        /* Global print settings */
        '@media print {' +
        '  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
        '  .no-print { display: none !important; }' +
        '  @page { size: landscape; margin: 8mm; }' +
        '}' +
        /* Base styles */
        'body { font-family: "Segoe UI", Arial, sans-serif; padding: 15px; margin: 0; font-size: 10px; background: white; color: #1e293b; }' +
        /* Report header */
        '.report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 15px; }' +
        '.report-title { font-size: 18px; font-weight: bold; color: #1e293b; margin: 0; }' +
        '.report-subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }' +
        '.report-info { text-align: right; font-size: 9px; color: #64748b; }' +
        '.report-info strong { color: #1e293b; }' +
        /* Stats bar */
        '.stats-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }' +
        '.stat-item { background: #f1f5f9; border-radius: 6px; padding: 6px 10px; min-width: 70px; }' +
        '.stat-value { font-size: 16px; font-weight: bold; color: #1e40af; }' +
        '.stat-label { font-size: 8px; color: #64748b; text-transform: uppercase; }' +
        /* Table styles */
        'table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 10px; }' +
        'th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: middle; }' +
        'thead th { background: #1e293b !important; color: #ffffff !important; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }' +
        'tbody tr:nth-child(odd) { background-color: #ffffff; }' +
        'tbody tr:nth-child(even) { background-color: #f8fafc; }' +
        /* Typography */
        '.font-mono { font-family: "Consolas", "Courier New", monospace; }' +
        '.font-bold { font-weight: bold; }' +
        '.text-center { text-align: center; }' +
        '.text-muted { color: #94a3b8; }' +
        /* Badges */
        '.badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; }' +
        '.badge-success { background: #dcfce7 !important; color: #166534 !important; }' +
        '.badge-danger { background: #fee2e2 !important; color: #991b1b !important; }' +
        '.badge-primary { background: #dbeafe !important; color: #1e40af !important; }' +
        '.badge-position { background: #1e40af !important; color: white !important; padding: 2px 5px; border-radius: 8px; font-size: 8px; font-weight: bold; }' +
        /* Connection type colors - force colors */
        '.conn-lan, [class*="bg-blue-500"] { background: #3b82f6 !important; color: white !important; }' +
        '.conn-wan, [class*="bg-red-500"] { background: #ef4444 !important; color: white !important; }' +
        '.conn-trunk, [class*="bg-green-500"] { background: #22c55e !important; color: white !important; }' +
        '.conn-dmz, [class*="bg-orange-500"] { background: #f97316 !important; color: white !important; }' +
        '.conn-mgmt, [class*="bg-purple-500"] { background: #8b5cf6 !important; color: white !important; }' +
        '.conn-fiber, [class*="bg-cyan-500"] { background: #06b6d4 !important; color: white !important; }' +
        '.conn-backup, [class*="bg-yellow-500"] { background: #eab308 !important; color: #1e293b !important; }' +
        '.conn-wallport, [class*="bg-violet-400"] { background: #a78bfa !important; color: white !important; }' +
        '.conn-external, [class*="bg-slate-500"] { background: #64748b !important; color: white !important; }' +
        /* Cable marker */
        '.cable-marker { display: inline-block; padding: 1px 4px; border-radius: 6px; font-size: 8px; font-weight: bold; border: 1px solid; }' +
        /* Footer */
        '.report-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; text-align: center; }' +
        '.report-footer strong { color: #64748b; }' +
        /* Arrows */
        '.arrow { font-size: 12px; color: #3b82f6; }' +
        /* Hide print elements */
        '.no-print { display: none !important; }' +
        '.print-hide-id { display: none !important; }' +
        /* Matrix specific - CRITICAL */
        '.sticky-col, .sticky, [class*="sticky"] { position: static !important; left: auto !important; }' +
        '#matrixTable { width: auto !important; table-layout: fixed; border-collapse: collapse; }' +
        '#matrixTable th, #matrixTable td { border: 1px solid #94a3b8 !important; padding: 4px !important; min-width: 80px !important; max-width: 100px !important; height: 60px !important; vertical-align: top !important; font-size: 8px !important; overflow: hidden !important; }' +
        '#matrixTable th { background: #1e293b !important; color: white !important; text-align: center !important; font-weight: bold !important; height: auto !important; padding: 8px 4px !important; }' +
        '#matrixTable th:first-child { min-width: 100px !important; max-width: 120px !important; }' +
        /* Matrix cells with connections */
        '#matrixTable td > div { border-radius: 4px !important; padding: 3px !important; margin: 1px !important; font-size: 7px !important; }' +
        '#matrixTable td > div > div { font-size: 7px !important; line-height: 1.2 !important; }' +
        /* Preserve inline background colors */
        '[style*="background-color:#3b82f6"], [style*="background:#3b82f6"] { background-color: #3b82f6 !important; }' +
        '[style*="background-color:#ef4444"], [style*="background:#ef4444"] { background-color: #ef4444 !important; }' +
        '[style*="background-color:#22c55e"], [style*="background:#22c55e"] { background-color: #22c55e !important; }' +
        '[style*="background-color:#f97316"], [style*="background:#f97316"] { background-color: #f97316 !important; }' +
        '[style*="background-color:#8b5cf6"], [style*="background:#8b5cf6"] { background-color: #8b5cf6 !important; }' +
        '[style*="background-color:#06b6d4"], [style*="background:#06b6d4"] { background-color: #06b6d4 !important; }' +
        '[style*="background-color:#eab308"], [style*="background:#eab308"] { background-color: #eab308 !important; }' +
        '[style*="background-color:#a78bfa"], [style*="background:#a78bfa"] { background-color: #a78bfa !important; }' +
        '[style*="background-color:#64748b"], [style*="background:#64748b"] { background-color: #64748b !important; }' +
        /* External column highlight */
        '.bg-red-50 { background-color: #fef2f2 !important; }' +
        '</style>';
}

function getReportHeader(title, icon) {
    var now = new Date();
    var dateStr = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    return '<div class="report-header">' +
        '<div>' +
        '<h1 class="report-title">' + icon + ' ' + title + '</h1>' +
        '<div class="report-subtitle">Matrix Network - Documentazione Infrastruttura di Rete</div>' +
        '</div>' +
        '<div class="report-info">' +
        '<div><strong>Tiesse S.P.A.</strong></div>' +
        '<div>Data: ' + dateStr + ' - ' + timeStr + '</div>' +
        '<div>Dispositivi: ' + appState.devices.length + ' | Connessioni: ' + appState.connections.length + '</div>' +
        '</div>' +
        '</div>';
}

function getReportFooter() {
    return '<div class="report-footer">' +
        '<strong>© 2025 Tiesse S.P.A.</strong> — Tutti i diritti riservati<br>' +
        '⚠️ Documento riservato — Riproduzione vietata — Solo per uso interno aziendale' +
        '</div>';
}

function printMatrix() {
    var matrixTable = document.getElementById('matrixTable');
    if (!matrixTable) {
        Toast.error('Matrix not found');
        return;
    }
    
    try {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        // Count connections by type
        var connByType = {};
        for (var i = 0; i < appState.connections.length; i++) {
            var type = appState.connections[i].type || 'other';
            connByType[type] = (connByType[type] || 0) + 1;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Connessioni - Tiesse S.P.A.</title>';
        html += getPrintStyles();
        html += '</head><body>';
        html += getReportHeader('Matrice delle Connessioni', '🔗');
        
        // Stats bar
        html += '<div class="stats-bar">';
        html += '<div class="stat-item"><div class="stat-value">' + appState.devices.length + '</div><div class="stat-label">Dispositivi</div></div>';
        html += '<div class="stat-item"><div class="stat-value">' + appState.connections.length + '</div><div class="stat-label">Connessioni</div></div>';
        for (var t in connByType) {
            html += '<div class="stat-item"><div class="stat-value">' + connByType[t] + '</div><div class="stat-label">' + (config.connLabels[t] || t) + '</div></div>';
        }
        html += '</div>';
        
        html += '<div style="overflow-x:auto;">' + matrixTable.outerHTML + '</div>';
        html += getReportFooter();
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 500);
    } catch (e) {
        console.error('Print error:', e);
        Toast.error('Error printing: ' + e.message);
    }
}

function printConnections() {
    if (appState.connections.length === 0) {
        Toast.warning('Nessuna connessione da stampare');
        return;
    }
    
    try {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.error('Popup blocked. Please allow popups for this site.');
            return;
        }
        
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connessioni Attive - Tiesse S.P.A.</title>';
        html += getPrintStyles();
        html += '</head><body>';
        html += getReportHeader('Connessioni Attive', '⚡');
        
        // Count by status
        var activeCount = 0, disabledCount = 0;
        for (var s = 0; s < appState.connections.length; s++) {
            if (appState.connections[s].status === 'active') activeCount++;
            else disabledCount++;
        }
        
        // Stats bar
        html += '<div class="stats-bar">';
        html += '<div class="stat-item"><div class="stat-value">' + appState.connections.length + '</div><div class="stat-label">Totale</div></div>';
        html += '<div class="stat-item"><div class="stat-value" style="color:#22c55e">' + activeCount + '</div><div class="stat-label">Attive</div></div>';
        html += '<div class="stat-item"><div class="stat-value" style="color:#ef4444">' + disabledCount + '</div><div class="stat-label">Disabilitate</div></div>';
        html += '</div>';
        
        // Build table
        html += '<table>';
        html += '<thead><tr>';
        html += '<th style="width:30px">#</th>';
        html += '<th>Source</th>';
        html += '<th style="width:40px">Pos.</th>';
        html += '<th>Dispositivo Origine</th>';
        html += '<th style="width:70px">Porta Src</th>';
        html += '<th style="width:30px"></th>';
        html += '<th style="width:70px">Porta Dst</th>';
        html += '<th>Dispositivo Destinazione</th>';
        html += '<th style="width:40px">Pos.</th>';
        html += '<th>Destination</th>';
        html += '<th style="width:80px">Tipo</th>';
        html += '<th style="width:60px">Cavo</th>';
        html += '<th style="width:50px">Stato</th>';
        html += '<th>Note</th>';
        html += '</tr></thead><tbody>';
        
        for (var i = 0; i < appState.connections.length; i++) {
            var c = appState.connections[i];
            var fromDevice = null, toDevice = null;
            for (var j = 0; j < appState.devices.length; j++) {
                if (appState.devices[j].id === c.from) fromDevice = appState.devices[j];
                if (appState.devices[j].id === c.to) toDevice = appState.devices[j];
            }
            
            var fromRack = fromDevice ? fromDevice.rackId : '-';
            var fromPos = fromDevice ? String(fromDevice.order).padStart(2, '0') : '-';
            var fromName = fromDevice ? fromDevice.name : 'N/A';
            var toRack = toDevice ? toDevice.rackId : (c.isWallJack ? 'Wall Jack' : (c.externalDest ? 'External' : '-'));
            var toPos = toDevice ? String(toDevice.order).padStart(2, '0') : '-';
            var toName = toDevice ? toDevice.name : (c.isWallJack ? '🔌 ' + (c.externalDest || 'Wall Jack') : (c.externalDest ? '📡 ' + c.externalDest : 'N/A'));
            
            var statusBadge = c.status === 'active' 
                ? '<span class="badge badge-success">ON</span>' 
                : '<span class="badge badge-danger">OFF</span>';
            
            var typeBadge = '<span class="badge conn-' + c.type + '">' + (config.connLabels[c.type] || c.type) + '</span>';
            
            var cableHtml = '';
            if (c.cableMarker) {
                var cableColor = c.cableColor || '#6b7280';
                cableHtml = '<span class="cable-marker" style="background:' + cableColor + ';border-color:' + cableColor + ';color:' + (isLightColor(cableColor) ? '#000' : '#fff') + '">' + c.cableMarker + '</span>';
            }
            
            html += '<tr>';
            html += '<td class="text-center text-muted">' + (i + 1) + '</td>';
            html += '<td><strong style="color:' + getRackColor(fromRack) + '">' + fromRack + '</strong></td>';
            html += '<td class="text-center"><span class="badge-position">' + fromPos + '</span></td>';
            html += '<td><strong>' + fromName + '</strong></td>';
            html += '<td class="text-center font-mono">' + (c.fromPort || '-') + '</td>';
            html += '<td class="text-center arrow">⟷</td>';
            html += '<td class="text-center font-mono">' + (c.toPort || '-') + '</td>';
            html += '<td><strong>' + toName + '</strong></td>';
            html += '<td class="text-center"><span class="badge-position">' + toPos + '</span></td>';
            html += '<td><strong style="color:' + getRackColor(toRack) + '">' + toRack + '</strong></td>';
            html += '<td class="text-center">' + typeBadge + '</td>';
            html += '<td class="text-center">' + cableHtml + '</td>';
            html += '<td class="text-center">' + statusBadge + '</td>';
            html += '<td class="text-muted" style="font-size:9px;max-width:150px">' + (c.notes || '') + '</td>';
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        html += getReportFooter();
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(function() {
            printWindow.print();
        }, 500);
    } catch (e) {
        console.error('Print error:', e);
        Toast.error('Error printing: ' + e.message);
    }
}

// Helper to check if color is light (for contrast)
function isLightColor(color) {
    if (!color) return true;
    var hex = color.replace('#', '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    var brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
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
        Toast.info('Matrix Network loaded');
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
