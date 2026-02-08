/**
 * TIESSE Matrix Network - Comprehensive Diagnostic Script
 * Execute in browser console (F12 -> Console)
 * Copy and paste the entire content into the console and press Enter
 */

(function() {
    console.clear();
    console.log('╔═════════════════════════════════════════════════════════════╗');
    console.log('║         TIESSE MATRIX - TAB SYSTEM DIAGNOSTIC v2             ║');
    console.log('╚═════════════════════════════════════════════════════════════╝\n');

    // Diagnostic object to track all results
    var diagnostic = {
        passed: [],
        failed: [],
        warnings: [],
        info: []
    };

    // Helper function for logging
    function log(type, message) {
        var prefix = {
            pass: '✅',
            fail: '❌',
            warn: '⚠️ ',
            info: 'ℹ️ '
        }[type] || '•';
        
        console.log(prefix + ' ' + message);
        diagnostic[type + 's'].push(message);
    }

    // Helper to format values
    function format(val) {
        if (val === undefined) return 'undefined';
        if (val === null) return 'null';
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'object') return '[Object]';
        return String(val);
    }

    console.log('\n📋 ENVIRONMENT CHECK\n');
    
    // Check document ready state
    log('info', 'Document ready state: ' + document.readyState);
    
    // Check if scripts are loaded
    var scripts = document.querySelectorAll('script[src]');
    log('info', 'Total script tags found: ' + scripts.length);

    console.log('\n🔍 FUNCTION AVAILABILITY\n');

    var functions = [
        'switchTab',
        'initApp', 
        'updateUI',
        'loadJSON',
        'saveJSON',
        'updateGlobalCounters'
    ];

    functions.forEach(function(name) {
        if (typeof window[name] === 'function') {
            log('pass', 'Function available: ' + name + '()');
        } else {
            log('fail', 'Function NOT found: ' + name + '()');
        }
    });

    console.log('\n📦 MODULE AVAILABILITY\n');

    var modules = ['appState', 'config', 'Dashboard', 'FloorPlan', 'MI', 'AppColors', 'DashboardColors', 'Features', 'UIUpdates'];

    modules.forEach(function(name) {
        if (typeof window[name] === 'object') {
            log('pass', 'Module available: window.' + name);
            if (name === 'appState') {
                log('info', '  - devices: ' + (window[name].devices ? window[name].devices.length + ' items' : 'not loaded'));
                log('info', '  - connections: ' + (window[name].connections ? window[name].connections.length + ' items' : 'not loaded'));
                log('info', '  - rooms: ' + (window[name].rooms ? window[name].rooms.length + ' items' : 'not loaded'));
            }
        } else {
            log('fail', 'Module NOT found: window.' + name);
        }
    });

    console.log('\n🏷️ HTML ELEMENT CHECK\n');

    var elements = [
        { id: 'tab-dashboard', type: 'button', name: 'Dashboard tab button' },
        { id: 'tab-devices', type: 'button', name: 'Devices tab button' },
        { id: 'tab-active', type: 'button', name: 'Active tab button' },
        { id: 'tab-matrix', type: 'button', name: 'Matrix tab button' },
        { id: 'tab-floorplan', type: 'button', name: 'FloorPlan tab button' },
        { id: 'content-dashboard', type: 'div', name: 'Dashboard content' },
        { id: 'content-devices', type: 'div', name: 'Devices content' },
        { id: 'content-active', type: 'div', name: 'Active content' },
        { id: 'content-matrix', type: 'div', name: 'Matrix content' },
        { id: 'content-floorplan', type: 'div', name: 'FloorPlan content' },
        { id: 'devicesListContainer', type: 'div', name: 'Devices list container' },
        { id: 'connectionsListContainer', type: 'div', name: 'Connections list container' },
        { id: 'chartByType', type: 'canvas/div', name: 'Chart by type container' },
        { id: 'chartByStatus', type: 'canvas/div', name: 'Chart by status container' },
        { id: 'chartByRoom', type: 'canvas/div', name: 'Chart by room container' }
    ];

    var missingElements = [];
    elements.forEach(function(el) {
        var found = document.getElementById(el.id);
        if (found) {
            log('pass', 'Dom element found: #' + el.id + ' (' + el.name + ')');
        } else {
            log('fail', 'Dom element NOT found: #' + el.id + ' (' + el.name + ')');
            missingElements.push(el.id);
        }
    });

    console.log('\n🎨 CSS RULE CHECK\n');

    // Test CSS display: none rule
    var testDiv1 = document.createElement('div');
    testDiv1.className = 'tab-content';
    testDiv1.style.visibility = 'hidden'; // Hide from view but keep in DOM
    document.body.appendChild(testDiv1);
    var display1 = window.getComputedStyle(testDiv1).display;
    document.body.removeChild(testDiv1);
    
    if (display1 === 'none') {
        log('pass', 'CSS rule works: .tab-content { display: none; }');
    } else {
        log('fail', 'CSS rule NOT working: .tab-content expected display:none, got: ' + display1);
    }

    // Test CSS display: block rule
    var testDiv2 = document.createElement('div');
    testDiv2.className = 'tab-content active';
    testDiv2.style.visibility = 'hidden';
    document.body.appendChild(testDiv2);
    var display2 = window.getComputedStyle(testDiv2).display;
    document.body.removeChild(testDiv2);
    
    if (display2 === 'block') {
        log('pass', 'CSS rule works: .tab-content.active { display: block; }');
    } else {
        log('fail', 'CSS rule NOT working: .tab-content.active expected display:block, got: ' + display2);
    }

    console.log('\n🔌 TAB FUNCTIONALITY TEST\n');

    // Check initial state
    var initialDashboard = document.getElementById('content-dashboard');
    var initialDevices = document.getElementById('content-devices');
    
    if (initialDashboard && initialDashboard.classList.contains('active')) {
        log('pass', 'Initial state: Dashboard tab is active');
    } else {
        log('warn', 'Initial state: Dashboard tab is NOT marked as active');
    }

    // Test switchTab
    try {
        switchTab('devices');
        
        var devicesActive = document.getElementById('content-devices');
        var devicesBtn = document.getElementById('tab-devices');
        var dashboardNotActive = document.getElementById('content-dashboard');
        
        if (devicesActive && devicesActive.classList.contains('active')) {
            log('pass', 'switchTab(\'devices\') works: content-devices now has active class');
        } else {
            log('fail', 'switchTab(\'devices\') FAILED: content-devices does not have active class');
        }
        
        if (devicesBtn && devicesBtn.classList.contains('active')) {
            log('pass', 'switchTab(\'devices\') works: tab-devices button now has active class');
        } else {
            log('fail', 'switchTab(\'devices\') FAILED: tab-devices button does not have active class');
        }
        
        if (dashboardNotActive && !dashboardNotActive.classList.contains('active')) {
            log('pass', 'switchTab(\'devices\') works: content-dashboard no longer has active class');
        } else {
            log('warn', 'switchTab(\'devices\') ISSUE: content-dashboard still has active class');
        }
    } catch (e) {
        log('fail', 'switchTab() threw error: ' + e.message);
    }

    // Test switching back to dashboard
    try {
        switchTab('dashboard');
        var dashboardActive = document.getElementById('content-dashboard');
        var dashboardBtn = document.getElementById('tab-dashboard');
        
        if (dashboardActive && dashboardActive.classList.contains('active')) {
            log('pass', 'switchTab(\'dashboard\') works: switched back successfully');
        } else {
            log('fail', 'switchTab(\'dashboard\') FAILED: could not switch back');
        }
    } catch (e) {
        log('fail', 'switchTab(\'dashboard\') threw error: ' + e.message);
    }

    console.log('\n📊 DASHBOARD MODULE CHECK\n');

    if (typeof Dashboard === 'object' && typeof Dashboard.refresh === 'function') {
        log('pass', 'Dashboard module has refresh() method');
        try {
            Dashboard.refresh();
            log('pass', 'Dashboard.refresh() executed without error');
        } catch (e) {
            log('fail', 'Dashboard.refresh() threw error: ' + e.message);
        }
    } else {
        log('fail', 'Dashboard module missing or refresh() not a function');
    }

    console.log('\n🗺️  FLOORPLAN MODULE CHECK\n');

    if (typeof FloorPlan === 'object' && typeof FloorPlan.init === 'function') {
        log('pass', 'FloorPlan module has init() method');
    } else {
        log('fail', 'FloorPlan module missing or init() not a function');
    }

    console.log('\n🎯 BROWSER CONSOLE ERRORS\n');

    // Listen for errors
    var errorLog = [];
    window.addEventListener('error', function(event) {
        errorLog.push(event.filename + ': ' + event.message);
    });

    if (errorLog.length === 0) {
        log('pass', 'No JavaScript errors detected so far');
    } else {
        errorLog.forEach(function(err) {
            log('fail', 'Error: ' + err);
        });
    }

    console.log('\n=════════════════════════════════════════════════════════════\n');

    // Summary
    var totalTests = diagnostic.passed.length + diagnostic.failed.length;
    console.log('📈 SUMMARY');
    console.log('  ✅ Passed: ' + diagnostic.passed.length);
    console.log('  ❌ Failed: ' + diagnostic.failed.length);
    console.log('  ⚠️  Warnings: ' + diagnostic.warnings.length);
    console.log('  ℹ️  Info: ' + diagnostic.info.length);

    if (diagnostic.failed.length === 0) {
        console.log('\n🎉 All checks passed! The tab system should be working correctly.');
        console.log('   If you are still experiencing issues, try:');
        console.log('   1. Hard refresh the page: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
        console.log('   2. Clear browser cache');
        console.log('   3. Check browser developer tools Console for any errors');
    } else {
        console.log('\n⚠️  There are ' + diagnostic.failed.length + ' issue(s) that need to be fixed:');
        diagnostic.failed.forEach(function(fail, i) {
            console.log('   ' + (i + 1) + '. ' + fail);
        });
    }

    console.log('\n=════════════════════════════════════════════════════════════\n');
    
    // Make diagnostic object globally accessible
    window.DIAGNOSTIC_RESULTS = diagnostic;
    console.log('💾 Full results saved to window.DIAGNOSTIC_RESULTS');
    console.log('   You can access them in the console with: DIAGNOSTIC_RESULTS\n');
})();
