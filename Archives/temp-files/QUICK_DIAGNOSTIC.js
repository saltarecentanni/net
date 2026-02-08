/**
 * QUICK DIAGNOSTICS - Esegui nel browser console
 * Copia questo intero file nel console (F12) e premi Enter
 */

console.clear();
console.log('%c=== TIESSE MATRIX QUICK DIAGNOSTIC ===', 'color: #0066cc; font-size: 16px; font-weight: bold;');
console.log('');

// 1. Check appState
console.log('%c1. CHECK APPSTATE', 'color: #ff6600; font-weight: bold;');
if (typeof appState !== 'undefined') {
    console.log('✓ appState exists');
    console.log('  - devices: ' + (appState.devices ? appState.devices.length + ' items' : 'EMPTY'));
    console.log('  - connections: ' + (appState.connections ? appState.connections.length + ' items' : 'EMPTY'));
    console.log('  - rooms: ' + (appState.rooms ? appState.rooms.length + ' items' : 'EMPTY'));
} else {
    console.error('✗ appState NOT defined!');
}
console.log('');

// 2. Check containers
console.log('%c2. CHECK CONTAINERS', 'color: #ff6600; font-weight: bold;');
var containers = {
    'devicesListContainer': document.getElementById('devicesListContainer'),
    'connectionsListContainer': document.getElementById('connectionsListContainer'),
    'content-devices': document.getElementById('content-devices'),
    'content-matrix': document.getElementById('content-matrix'),
    'content-active': document.getElementById('content-active')
};

for (var key in containers) {
    if (containers[key]) {
        console.log('✓ ' + key + ' found');
        console.log('  - display: ' + window.getComputedStyle(containers[key]).display);
        console.log('  - innerHTML length: ' + (containers[key].innerHTML ? containers[key].innerHTML.length + ' chars' : '0 chars'));
    } else {
        console.error('✗ ' + key + ' NOT found!');
    }
}
console.log('');

// 3. Check tab visibility
console.log('%c3. CHECK TAB VISIBILITY', 'color: #ff6600; font-weight: bold;');
var tabs = document.querySelectorAll('.tab-content');
console.log('Total tabs: ' + tabs.length);
tabs.forEach(function(tab, i) {
    var isActive = tab.classList.contains('active');
    var display = window.getComputedStyle(tab).display;
    console.log((i+1) + '. ' + tab.id + ' - active:' + isActive + ' display:' + display);
});
console.log('');

// 4. Check updateUI function
console.log('%c4. CHECK FUNCTIONS', 'color: #ff6600; font-weight: bold;');
console.log('updateUI: ' + (typeof updateUI === 'function' ? '✓ exists' : '✗ missing'));
console.log('updateDevicesList: ' + (typeof updateDevicesList === 'function' ? '✓ exists' : '✗ missing'));
console.log('updateConnectionsList: ' + (typeof updateConnectionsList === 'function' ? '✓ exists' : '✗ missing'));
console.log('renderMatrix: ' + (typeof renderMatrix === 'function' ? '✓ exists' : '✗ missing'));
console.log('');

// 5. Manual test - try render devices
console.log('%c5. MANUAL RENDER TEST', 'color: #ff6600; font-weight: bold;');
try {
    if (typeof updateDevicesList === 'function') {
        console.log('Attempting to call updateDevicesList()...');
        updateDevicesList();
        var container = document.getElementById('devicesListContainer');
        if (container && container.innerHTML.length > 0) {
            console.log('✓ Device list rendered! Content: ' + container.innerHTML.substring(0, 100) + '...');
        } else {
            console.error('✗ Device list container empty after updateDevicesList()');
        }
    }
} catch (e) {
    console.error('✗ Error calling updateDevicesList: ' + e.message);
}
console.log('');

// 6. Check errors
console.log('%c6. CONSOLE ERRORS', 'color: #ff6600; font-weight: bold;');
console.log('Check browser console (F12) for red error messages');
console.log('If you see red errors above, they are the problem!');
console.log('');

// 7. Try manual switchTab
console.log('%c7. MANUAL TAB SWITCH TEST', 'color: #ff6600; font-weight: bold;');
try {
    console.log('Switching to devices tab manually...');
    switchTab('devices');
    console.log('✓ switchTab("devices") executed');
    var content = document.getElementById('content-devices');
    if (content && content.classList.contains('active')) {
        console.log('✓ content-devices now has active class');
    } else {
        console.log('✗ content-devices does NOT have active class!');
    }
} catch (e) {
    console.error('✗ Error calling switchTab: ' + e.message);
}

console.log('');
console.log('%c=== DIAGNOSTIC COMPLETE ===', 'color: #0066cc; font-size: 14px;');
