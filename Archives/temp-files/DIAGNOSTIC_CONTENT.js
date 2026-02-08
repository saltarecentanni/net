/**
 * DIAGNOSTIC SCRIPT - Content & Visibility Issues
 * Executar no console do navegador na aba do Matrix Network
 */

(function() {
    console.log('='.repeat(70));
    console.log('TIESSE MATRIX NETWORK - DIAGNOSTIC REPORT');
    console.log('='.repeat(70));
    
    // =========================================================================
    // 1. CHECK APPSTATE
    // =========================================================================
    console.log('\n📊 1. APPSTATE DATA CHECK');
    console.log('-'.repeat(70));
    
    if (typeof appState === 'undefined') {
        console.error('❌ appState is undefined!');
    } else {
        console.log('✅ appState exists');
        console.log('   - Devices:', appState.devices?.length || 0);
        console.log('   - Connections:', appState.connections?.length || 0);
        console.log('   - Rooms:', appState.rooms?.length || 0);
        console.log('   - Locations:', appState.locations?.length || 0);
        console.log('   - Sites:', appState.sites?.length || 0);
    }
    
    // =========================================================================
    // 2. CHECK KEY DOM ELEMENTS
    // =========================================================================
    console.log('\n🔍 2. DOM ELEMENTS CHECK');
    console.log('-'.repeat(70));
    
    var elementsToCheck = [
        'devicesListContainer',
        'connectionsListContainer',
        'chartByType',
        'chartByStatus',
        'chartByRoom',
        'content-devices',
        'content-active',
        'content-dashboard',
        'content-matrix',
        'content-floorplan'
    ];
    
    var missingElements = [];
    elementsToCheck.forEach(function(elId) {
        var el = document.getElementById(elId);
        if (!el) {
            missingElements.push(elId);
            console.error('❌ Missing: #' + elId);
        } else {
            var isVisible = el.offsetParent !== null || el.clientHeight > 0 || el.clientWidth > 0;
            var display = window.getComputedStyle(el).display;
            console.log('✅ Found: #' + elId + ' (display: ' + display + ', visible: ' + isVisible + ')');
        }
    });
    
    // =========================================================================
    // 3. CHECK DEVICES LIST
    // =========================================================================
    console.log('\n📝 3. DEVICES LIST CONTENT CHECK');
    console.log('-'.repeat(70));
    
    var devListContainer = document.getElementById('devicesListContainer');
    if (devListContainer) {
        var deviceRows = devListContainer.querySelectorAll('tr, .device-row, .device-card, [class*="device"]');
        console.log('   - Rows/Cards found:', deviceRows.length);
        
        if (appState.devices && appState.devices.length > 0 && deviceRows.length === 0) {
            console.warn('⚠️  Data exists but not rendered!');
            console.log('   - appState.devices:', appState.devices.length);
            console.log('   - Rendered elements: 0');
        }
        
        // Check container content
        var hasText = devListContainer.innerText.trim().length > 20;
        console.log('   - Container has content:', hasText);
        console.log('   - Container innerHTML length:', devListContainer.innerHTML.length);
    }
    
    // =========================================================================
    // 4. CHECK CONNECTION LIST
    // =========================================================================
    console.log('\n🔗 4. CONNECTIONS LIST CONTENT CHECK');
    console.log('-'.repeat(70));
    
    var connListContainer = document.getElementById('connectionsListContainer');
    if (connListContainer) {
        var connRows = connListContainer.querySelectorAll('tr, .connection-row, [class*="connection"]');
        console.log('   - Rows found:', connRows.length);
        
        if (appState.connections && appState.connections.length > 0 && connRows.length === 0) {
            console.warn('⚠️  Data exists but not rendered!');
            console.log('   - appState.connections:', appState.connections.length);
            console.log('   - Rendered elements: 0');
        }
        
        var hasText = connListContainer.innerText.trim().length > 20;
        console.log('   - Container has content:', hasText);
        console.log('   - Container innerHTML length:', connListContainer.innerHTML.length);
    }
    
    // =========================================================================
    // 5. CHECK DASHBOARD CHARTS
    // =========================================================================
    console.log('\n📈 5. DASHBOARD CHARTS CHECK');
    console.log('-'.repeat(70));
    
    ['chartByType', 'chartByStatus', 'chartByRoom'].forEach(function(chartId) {
        var canvas = document.getElementById(chartId);
        if (canvas) {
            console.log('   Chart ' + chartId + ':');
            console.log('     - Element exists: ✅');
            console.log('     - Width: ' + canvas.width + 'px');
            console.log('     - Height: ' + canvas.height + 'px');
            
            // Check if Chart.js chart is initialized
            if (window.Chart && canvas.chart) {
                console.log('     - Chart.js instance: ✅');
            } else {
                console.warn('     - Chart.js instance: ❌');
            }
        }
    });
    
    // Check Dashboard module
    if (typeof Dashboard !== 'undefined') {
        console.log('   Dashboard module: ✅ loaded');
    } else {
        console.error('   Dashboard module: ❌ NOT loaded');
    }
    
    // =========================================================================
    // 6. CHECK COLOR MODULES
    // =========================================================================
    console.log('\n🎨 6. COLOR MODULES CHECK');
    console.log('-'.repeat(70));
    
    var colorModules = [
        'AppColors',
        'FeatureColors',
        'DeviceDetailColors',
        'UIColors',
        'FloorPlanColors',
        'DashboardColors'
    ];
    
    colorModules.forEach(function(moduleName) {
        var module = window[moduleName];
        if (module) {
            console.log('✅ ' + moduleName + ' loaded');
        } else {
            console.error('❌ ' + moduleName + ' NOT loaded');
        }
    });
    
    // =========================================================================
    // 7. CHECK CSS AND VISIBILITY
    // =========================================================================
    console.log('\n🎨 7. VISIBILITY & CSS CHECK');
    console.log('-'.repeat(70));
    
    // Check for display:none elements that should be visible
    var allElements = document.querySelectorAll('[id^="content-"]');
    allElements.forEach(function(el) {
        var display = window.getComputedStyle(el).display;
        var isActive = el.classList.contains('active');
        console.log('   ' + el.id + ':');
        console.log('     - Has "active" class: ' + (isActive ? '✅' : '❌'));
        console.log('     - Display style: ' + display);
        console.log('     - Content length: ' + el.innerHTML.length);
    });
    
    // =========================================================================
    // 8. SUMMARY AND RECOMMENDATIONS
    // =========================================================================
    console.log('\n'.repeat(1));
    console.log('='.repeat(70));
    console.log('SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(70));
    
    if (missingElements.length > 0) {
        console.warn('⚠️  Missing DOM elements (' + missingElements.length + '):');
        missingElements.forEach(function(el) {
            console.log('    - ' + el);
        });
    } else {
        console.log('✅ All key DOM elements present');
    }
    
    // Check if data loaded
    if (appState.devices && appState.devices.length === 0) {
        console.warn('⚠️  No devices loaded - data might not have been fetched');
    }
    
    // Check render functions
    if (typeof updateDevicesList === 'function') {
        console.log('✅ updateDevicesList() function available');
    } else {
        console.error('❌ updateDevicesList() function NOT available');
    }
    
    if (typeof updateConnectionsList === 'function') {
        console.log('✅ updateConnectionsList() function available');
    } else {
        console.error('❌ updateConnectionsList() function NOT available');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('END OF DIAGNOSTIC REPORT');
    console.log('='.repeat(70) + '\n');
    
    // Return object for further testing
    return {
        appState: appState,
        missingElements: missingElements,
        devListContainer: devListContainer,
        connListContainer: connListContainer
    };
})();
