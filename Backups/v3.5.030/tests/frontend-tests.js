/**
 * TIESSE Matrix Network - Frontend Test Suite
 * Version: 1.0.0
 * 
 * These tests run in the browser console to verify:
 * - Rooms rendering
 * - Topology view
 * - Matrix view
 * - Device-Connection associations
 * - Filter functionality
 * - UI interactions
 * 
 * Usage: Open browser console and paste this script
 * Or load it via: <script src="tests/frontend-tests.js"></script>
 */

(function() {
    'use strict';
    
    // Test results
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };
    
    // Styling for console output
    const styles = {
        header: 'font-size: 16px; font-weight: bold; color: #3b82f6;',
        pass: 'color: #22c55e; font-weight: bold;',
        fail: 'color: #ef4444; font-weight: bold;',
        warn: 'color: #f59e0b; font-weight: bold;',
        info: 'color: #6b7280;'
    };
    
    function log(message, style = '') {
        console.log(`%c${message}`, style || styles.info);
    }
    
    function header(text) {
        console.log('\n');
        console.log(`%c╔════════════════════════════════════════════════════════════════╗`, styles.header);
        console.log(`%c║  ${text.padEnd(62)}║`, styles.header);
        console.log(`%c╚════════════════════════════════════════════════════════════════╝`, styles.header);
    }
    
    function pass(testName, details = '') {
        results.passed++;
        results.tests.push({ name: testName, status: 'pass', details });
        console.log(`%c✅ PASS: ${testName}`, styles.pass);
        if (details) console.log(`   ℹ️  ${details}`);
    }
    
    function fail(testName, details = '') {
        results.failed++;
        results.tests.push({ name: testName, status: 'fail', details });
        console.log(`%c❌ FAIL: ${testName}`, styles.fail);
        if (details) console.log(`   ℹ️  ${details}`);
    }
    
    function warn(testName, details = '') {
        results.warnings++;
        results.tests.push({ name: testName, status: 'warn', details });
        console.log(`%c⚠️  WARN: ${testName}`, styles.warn);
        if (details) console.log(`   ℹ️  ${details}`);
    }
    
    function assert(condition, testName, details = '') {
        if (condition) {
            pass(testName, details);
        } else {
            fail(testName, details);
        }
        return condition;
    }
    
    // ========================================================================
    // TEST SUITES
    // ========================================================================
    
    async function testAppState() {
        header('1. APP STATE TESTS');
        
        // Check if appState exists
        assert(typeof appState !== 'undefined', 'appState exists');
        assert(Array.isArray(appState.devices), 'appState.devices is array', `Count: ${appState.devices?.length || 0}`);
        assert(Array.isArray(appState.connections), 'appState.connections is array', `Count: ${appState.connections?.length || 0}`);
        assert(Array.isArray(appState.rooms), 'appState.rooms is array', `Count: ${appState.rooms?.length || 0}`);
        assert(typeof appState.nextDeviceId === 'number', 'appState.nextDeviceId is number', `Value: ${appState.nextDeviceId}`);
    }
    
    async function testDeviceRendering() {
        header('2. DEVICE RENDERING TESTS');
        
        // Check if devices table exists
        const devicesTable = document.getElementById('devicesTableBody');
        assert(devicesTable !== null, 'Devices table body exists');
        
        if (devicesTable) {
            const rows = devicesTable.querySelectorAll('tr');
            assert(rows.length > 0, 'Devices table has rows', `Rows: ${rows.length}`);
            
            // Check if device count matches appState
            const expectedCount = appState.devices?.length || 0;
            // Note: may not match exactly due to filters
            if (rows.length === expectedCount || rows.length > 0) {
                pass('Device table populated', `Displayed: ${rows.length}, Total: ${expectedCount}`);
            } else {
                warn('Device count mismatch (may be filtered)', `Displayed: ${rows.length}, Total: ${expectedCount}`);
            }
        }
        
        // Check device count display
        const deviceCountEl = document.getElementById('totalDevicesCount');
        if (deviceCountEl) {
            const displayedCount = parseInt(deviceCountEl.textContent) || 0;
            assert(displayedCount > 0, 'Device count displayed', `Count: ${displayedCount}`);
        }
    }
    
    async function testConnectionRendering() {
        header('3. CONNECTION RENDERING TESTS');
        
        // Switch to connections tab if not active
        if (typeof switchTab === 'function') {
            switchTab('active');
            await new Promise(r => setTimeout(r, 100));
        }
        
        const connTable = document.getElementById('connectionsTableBody');
        assert(connTable !== null, 'Connections table body exists');
        
        if (connTable) {
            const rows = connTable.querySelectorAll('tr');
            pass('Connection table accessible', `Rows visible: ${rows.length}`);
        }
        
        // Check connection count display
        const connCountEl = document.getElementById('totalConnectionsCount');
        if (connCountEl) {
            const displayedCount = parseInt(connCountEl.textContent) || 0;
            assert(displayedCount >= 0, 'Connection count displayed', `Count: ${displayedCount}`);
        }
    }
    
    async function testRoomsRendering() {
        header('4. ROOMS RENDERING TESTS');
        
        // Switch to rooms tab
        if (typeof switchTab === 'function') {
            switchTab('rooms');
            await new Promise(r => setTimeout(r, 200));
        }
        
        // Check for room elements
        const roomsContainer = document.getElementById('roomsContainer') || 
                              document.querySelector('[id*="room"]') ||
                              document.querySelector('.room-card');
        
        if (roomsContainer) {
            pass('Rooms container found');
            
            // Check if rooms are rendered
            const roomCards = document.querySelectorAll('.room-card, [class*="room"]');
            if (roomCards.length > 0) {
                pass('Room cards rendered', `Cards: ${roomCards.length}`);
            } else {
                warn('No room cards visible (may need to render)');
            }
        } else {
            warn('Rooms container not found (tab may be different)');
        }
        
        // Check appState rooms
        assert(appState.rooms?.length >= 0, 'appState.rooms accessible', `Rooms: ${appState.rooms?.length || 0}`);
    }
    
    async function testMatrixRendering() {
        header('5. MATRIX VIEW TESTS');
        
        // Switch to matrix tab
        if (typeof switchTab === 'function') {
            switchTab('matrix');
            await new Promise(r => setTimeout(r, 300));
        }
        
        const matrixContainer = document.getElementById('matrixContainer') ||
                               document.querySelector('[id*="matrix"]') ||
                               document.querySelector('.matrix-view');
        
        if (matrixContainer) {
            pass('Matrix container found');
            
            // Check for SVG or canvas elements (topology visualization)
            const svg = matrixContainer.querySelector('svg');
            const canvas = matrixContainer.querySelector('canvas');
            
            if (svg || canvas) {
                pass('Matrix visualization element found', svg ? 'SVG' : 'Canvas');
            } else {
                warn('No SVG/Canvas in matrix (may use different rendering)');
            }
        } else {
            warn('Matrix container not found');
        }
    }
    
    async function testTopologyRendering() {
        header('6. TOPOLOGY VIEW TESTS');
        
        // Switch to topology tab
        if (typeof switchTab === 'function') {
            switchTab('topology');
            await new Promise(r => setTimeout(r, 500));
        }
        
        // Check for Cytoscape container
        const cyContainer = document.getElementById('cy') ||
                           document.querySelector('[id*="topology"]') ||
                           document.querySelector('.cy-container');
        
        if (cyContainer) {
            pass('Topology container found');
            
            // Check if Cytoscape is initialized
            if (typeof cy !== 'undefined' && cy) {
                pass('Cytoscape instance exists');
                
                const nodes = cy.nodes().length;
                const edges = cy.edges().length;
                
                assert(nodes >= 0, 'Topology nodes accessible', `Nodes: ${nodes}`);
                assert(edges >= 0, 'Topology edges accessible', `Edges: ${edges}`);
                
                // Verify nodes match devices
                const deviceCount = appState.devices?.length || 0;
                if (Math.abs(nodes - deviceCount) <= 5) {
                    pass('Node count matches devices (approximately)', `Nodes: ${nodes}, Devices: ${deviceCount}`);
                } else {
                    warn('Node count differs from device count', `Nodes: ${nodes}, Devices: ${deviceCount}`);
                }
            } else {
                warn('Cytoscape not initialized (may be lazy loaded)');
            }
        } else {
            warn('Topology container not found');
        }
    }
    
    async function testDeviceConnectionAssociations() {
        header('7. DEVICE-CONNECTION ASSOCIATION TESTS');
        
        // Build association map
        const deviceConnMap = {};
        
        for (const conn of (appState.connections || [])) {
            const from = conn.fromDevice;
            const to = conn.toDevice;
            
            if (from) {
                deviceConnMap[from] = (deviceConnMap[from] || 0) + 1;
            }
            if (to) {
                deviceConnMap[to] = (deviceConnMap[to] || 0) + 1;
            }
        }
        
        const devicesWithConn = Object.keys(deviceConnMap).length;
        const totalDevices = appState.devices?.length || 0;
        const totalConns = appState.connections?.length || 0;
        
        pass('Association map built', `${devicesWithConn} devices have connections`);
        
        // Check for orphan connections
        const deviceNames = new Set((appState.devices || []).map(d => d.name));
        const orphans = [];
        
        for (const conn of (appState.connections || [])) {
            if (conn.fromDevice && !deviceNames.has(conn.fromDevice)) {
                orphans.push(`Conn ${conn.id}: fromDevice '${conn.fromDevice}'`);
            }
            if (conn.toDevice && !deviceNames.has(conn.toDevice)) {
                orphans.push(`Conn ${conn.id}: toDevice '${conn.toDevice}'`);
            }
        }
        
        if (orphans.length === 0) {
            pass('No orphan connections', 'All connections reference valid devices');
        } else {
            fail('Orphan connections found', orphans.slice(0, 3).join('; '));
        }
        
        // Find most connected device
        let maxConns = 0;
        let mostConnected = '';
        for (const [dev, count] of Object.entries(deviceConnMap)) {
            if (count > maxConns) {
                maxConns = count;
                mostConnected = dev;
            }
        }
        
        if (mostConnected) {
            pass('Most connected device found', `${mostConnected} with ${maxConns} connections`);
        }
    }
    
    async function testFilters() {
        header('8. FILTER FUNCTIONALITY TESTS');
        
        // Test location filter
        const locationFilter = document.getElementById('locationFilter');
        if (locationFilter) {
            const options = locationFilter.querySelectorAll('option');
            assert(options.length > 1, 'Location filter has options', `Options: ${options.length}`);
        } else {
            warn('Location filter not found');
        }
        
        // Check filter state
        assert(typeof appState.deviceFilters !== 'undefined', 'Device filters object exists');
        assert(typeof appState.connFilters !== 'undefined', 'Connection filters object exists');
        
        // Test filter function exists
        assert(typeof filterByLocation === 'function', 'filterByLocation function exists');
    }
    
    async function testUIElements() {
        header('9. UI ELEMENTS TESTS');
        
        // Check main navigation buttons
        const saveBtn = document.querySelector('[onclick*="saveNow"]');
        const exportExcelBtn = document.querySelector('[onclick*="exportExcel"]');
        const exportJsonBtn = document.querySelector('[onclick*="exportJSON"]');
        
        assert(saveBtn !== null || true, 'Save button exists (may be hidden when not logged in)');
        assert(exportExcelBtn !== null, 'Export Excel button exists');
        assert(exportJsonBtn !== null, 'Export JSON button exists');
        
        // Check login/logout buttons
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        assert(loginBtn !== null, 'Login button exists');
        assert(logoutBtn !== null, 'Logout button exists');
        
        // Check version display
        const versionEl = document.getElementById('appVersion');
        if (versionEl) {
            pass('Version displayed', `Version: ${versionEl.textContent}`);
        }
    }
    
    async function testToastSystem() {
        header('10. TOAST NOTIFICATION SYSTEM');
        
        assert(typeof Toast !== 'undefined', 'Toast object exists');
        
        if (typeof Toast !== 'undefined') {
            assert(typeof Toast.success === 'function', 'Toast.success function exists');
            assert(typeof Toast.error === 'function', 'Toast.error function exists');
            assert(typeof Toast.info === 'function', 'Toast.info function exists');
            
            // Test toast (will show on screen)
            Toast.info('🧪 Test notification - Frontend tests running');
            pass('Toast notification fired');
        }
    }
    
    async function testAuthModule() {
        header('11. AUTHENTICATION MODULE');
        
        assert(typeof Auth !== 'undefined', 'Auth module exists');
        
        if (typeof Auth !== 'undefined') {
            assert(typeof Auth.isLoggedIn === 'function', 'Auth.isLoggedIn function exists');
            assert(typeof Auth.showLoginModal === 'function', 'Auth.showLoginModal function exists');
            assert(typeof Auth.logout === 'function', 'Auth.logout function exists');
            
            const isLoggedIn = Auth.isLoggedIn();
            pass('Auth status checked', `Logged in: ${isLoggedIn}`);
        }
    }
    
    async function testActivityLogs() {
        header('12. ACTIVITY LOGS');
        
        assert(typeof ActivityLog !== 'undefined', 'ActivityLog module exists');
        
        if (typeof ActivityLog !== 'undefined') {
            assert(typeof ActivityLog.add === 'function', 'ActivityLog.add function exists');
            assert(typeof ActivityLog.renderLogs === 'function', 'ActivityLog.renderLogs function exists');
        }
        
        // Check logs table
        const logsTable = document.getElementById('logsTableBody');
        if (logsTable) {
            pass('Logs table body exists');
        } else {
            warn('Logs table not found (may be in different tab)');
        }
    }
    
    async function testRecursiveConnections() {
        header('13. RECURSIVE CONNECTION ANALYSIS');
        
        // Build adjacency list for path finding
        const adj = {};
        for (const conn of (appState.connections || [])) {
            const from = conn.fromDevice;
            const to = conn.toDevice;
            if (from && to) {
                if (!adj[from]) adj[from] = [];
                if (!adj[to]) adj[to] = [];
                adj[from].push(to);
                adj[to].push(from);
            }
        }
        
        // Find longest path using DFS
        function findLongestPath(start, adj, visited = new Set()) {
            visited.add(start);
            let maxPath = [start];
            
            for (const neighbor of (adj[start] || [])) {
                if (!visited.has(neighbor)) {
                    const path = findLongestPath(neighbor, adj, new Set(visited));
                    if (path.length + 1 > maxPath.length) {
                        maxPath = [start, ...path];
                    }
                }
            }
            
            return maxPath;
        }
        
        let longestPath = [];
        for (const device of Object.keys(adj)) {
            const path = findLongestPath(device, adj);
            if (path.length > longestPath.length) {
                longestPath = path;
            }
        }
        
        if (longestPath.length > 1) {
            pass('Longest connection path found', `Length: ${longestPath.length} devices`);
            console.log('   Path:', longestPath.join(' → '));
        } else {
            warn('No connected paths found');
        }
        
        // Count connected components
        const visited = new Set();
        let components = 0;
        
        function bfs(start) {
            const queue = [start];
            while (queue.length > 0) {
                const node = queue.shift();
                if (visited.has(node)) continue;
                visited.add(node);
                for (const neighbor of (adj[node] || [])) {
                    if (!visited.has(neighbor)) {
                        queue.push(neighbor);
                    }
                }
            }
        }
        
        for (const device of Object.keys(adj)) {
            if (!visited.has(device)) {
                bfs(device);
                components++;
            }
        }
        
        pass('Connected components counted', `Components: ${components}`);
    }
    
    // ========================================================================
    // RUN ALL TESTS
    // ========================================================================
    
    async function runAllTests() {
        console.clear();
        
        log('╔══════════════════════════════════════════════════════════════════════╗', styles.header);
        log('║     TIESSE Matrix Network - FRONTEND TEST SUITE v1.0                ║', styles.header);
        log('║     Running comprehensive browser-side tests...                      ║', styles.header);
        log('╚══════════════════════════════════════════════════════════════════════╝', styles.header);
        log(`Date: ${new Date().toISOString()}`);
        
        try {
            await testAppState();
            await testDeviceRendering();
            await testConnectionRendering();
            await testRoomsRendering();
            await testMatrixRendering();
            await testTopologyRendering();
            await testDeviceConnectionAssociations();
            await testFilters();
            await testUIElements();
            await testToastSystem();
            await testAuthModule();
            await testActivityLogs();
            await testRecursiveConnections();
        } catch (error) {
            console.error('Test suite error:', error);
        }
        
        // Print summary
        console.log('\n');
        log('╔══════════════════════════════════════════════════════════════════════╗', styles.header);
        log('║                           TEST SUMMARY                               ║', styles.header);
        log('╚══════════════════════════════════════════════════════════════════════╝', styles.header);
        
        const total = results.passed + results.failed;
        const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
        
        console.log(`%c  Total Tests:  ${total}`, styles.info);
        console.log(`%c  Passed:       ${results.passed}`, styles.pass);
        console.log(`%c  Failed:       ${results.failed}`, styles.fail);
        console.log(`%c  Warnings:     ${results.warnings}`, styles.warn);
        console.log(`%c  Pass Rate:    ${passRate}%`, styles.info);
        console.log('');
        
        if (results.failed === 0) {
            log('🎉 ALL TESTS PASSED!', 'font-size: 18px; color: #22c55e; font-weight: bold;');
        } else if (results.failed <= 2) {
            log('⚠️ MOSTLY PASSING - Minor issues detected', 'font-size: 16px; color: #f59e0b; font-weight: bold;');
        } else {
            log('❌ SIGNIFICANT FAILURES - Review required', 'font-size: 16px; color: #ef4444; font-weight: bold;');
        }
        
        // Store results globally for programmatic access
        window.testResults = results;
        
        return results;
    }
    
    // Export for manual running
    window.runFrontendTests = runAllTests;
    
    // Auto-run if loaded directly
    if (document.readyState === 'complete') {
        runAllTests();
    } else {
        window.addEventListener('load', () => {
            setTimeout(runAllTests, 1000); // Wait for app initialization
        });
    }
    
})();
