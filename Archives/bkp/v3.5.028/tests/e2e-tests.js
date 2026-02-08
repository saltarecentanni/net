/**
 * TIESSE Matrix Network - End-to-End Test Suite
 * Version: 1.0.0
 * 
 * This script tests the complete data flow:
 * 1. Create devices and connections
 * 2. Verify associations
 * 3. Test rooms, matrix views
 * 4. Verify recursive connections
 * 5. Cleanup
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

function header(text) {
    log('\n╔' + '═'.repeat(66) + '╗', colors.blue);
    log('║  ' + text.padEnd(64) + '║', colors.blue);
    log('╚' + '═'.repeat(66) + '╝', colors.blue);
}

function pass(testName, details = '') {
    results.passed++;
    results.tests.push({ name: testName, status: 'pass' });
    log(`  ✅ PASS: ${testName}`, colors.green);
    if (details) log(`     ℹ️  ${details}`, colors.cyan);
}

function fail(testName, details = '') {
    results.failed++;
    results.tests.push({ name: testName, status: 'fail' });
    log(`  ❌ FAIL: ${testName}`, colors.red);
    if (details) log(`     ℹ️  ${details}`, colors.cyan);
}

// HTTP helper functions
function httpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                // Extract session cookie
                const setCookie = res.headers['set-cookie'];
                if (setCookie) {
                    const match = setCookie[0].match(/session=([^;]+)/);
                    if (match) {
                        sessionCookie = `session=${match[1]}`;
                    }
                }
                
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function get(path) {
    return httpRequest('GET', path);
}

async function post(path, data) {
    return httpRequest('POST', path, data);
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testServerHealth() {
    header('1. SERVER HEALTH CHECK');
    
    try {
        const res = await get('/');
        if (res.status === 200) {
            pass('Server is running', `HTTP ${res.status}`);
        } else {
            fail('Server check', `HTTP ${res.status}`);
        }
    } catch (err) {
        fail('Server check', err.message);
    }
}

async function testAuthentication() {
    header('2. AUTHENTICATION');
    
    // Test invalid login
    let res = await post('/api/auth.php?action=login', {
        username: 'invalid',
        password: 'wrong'
    });
    if (res.status === 401 || res.data.error) {
        pass('Invalid credentials rejected');
    } else {
        fail('Invalid credentials should be rejected');
    }
    
    // Test valid login
    res = await post('/api/auth.php?action=login', {
        username: 'tiesse',
        password: 'tiesseadm'
    });
    if (res.data.ok === true) {
        pass('Valid login successful');
    } else {
        fail('Valid login failed', JSON.stringify(res.data));
    }
    
    // Verify session
    res = await get('/api/auth.php?action=check');
    if (res.data.authenticated === true) {
        pass('Session verified');
    } else {
        fail('Session verification failed');
    }
}

async function testDataOperations() {
    header('3. DATA OPERATIONS');
    
    // Get initial data
    let res = await get('/data.php');
    if (res.status === 200 && res.data.devices) {
        pass('Data fetch successful', `Devices: ${res.data.devices.length}, Connections: ${res.data.connections?.length || 0}`);
    } else {
        fail('Data fetch failed');
        return;
    }
    
    const initialData = res.data;
    const initialDeviceCount = initialData.devices.length;
    const initialConnCount = (initialData.connections || []).length;
    
    // Create test network
    log('\n  Creating test network...', colors.yellow);
    
    const testDevices = [
        { name: 'E2E-CORE-SW1', type: 'switch', location: 'E2E Test', rack: 'RACK-E2E', ports: 48, status: 'active', ip: '10.99.1.1' },
        { name: 'E2E-DIST-SW1', type: 'switch', location: 'E2E Test', rack: 'RACK-E2E', ports: 24, status: 'active', ip: '10.99.1.2' },
        { name: 'E2E-DIST-SW2', type: 'switch', location: 'E2E Test', rack: 'RACK-E2E', ports: 24, status: 'active', ip: '10.99.1.3' },
        { name: 'E2E-ACCESS-SW1', type: 'switch', location: 'E2E Test', rack: 'RACK-E2E', ports: 48, status: 'active', ip: '10.99.1.4' },
        { name: 'E2E-ACCESS-SW2', type: 'switch', location: 'E2E Test', rack: 'RACK-E2E', ports: 48, status: 'active', ip: '10.99.1.5' },
        { name: 'E2E-ROUTER1', type: 'router', location: 'E2E Test', rack: 'RACK-E2E', ports: 8, status: 'active', ip: '10.99.1.254' },
        { name: 'E2E-FIREWALL1', type: 'firewall', location: 'E2E Test', rack: 'RACK-E2E', ports: 4, status: 'active', ip: '10.99.1.253' },
    ];
    
    // Add devices
    for (const dev of testDevices) {
        dev.id = initialData.nextDeviceId++;
        initialData.devices.push(dev);
    }
    
    // Create hierarchical connections (Core -> Distribution -> Access -> Router -> Firewall)
    const maxConnId = Math.max(...(initialData.connections || []).map(c => c.id || 0), 0);
    const testConnections = [
        { fromDevice: 'E2E-CORE-SW1', fromPort: 'Gi0/1', toDevice: 'E2E-DIST-SW1', toPort: 'Gi0/1', type: 'trunk' },
        { fromDevice: 'E2E-CORE-SW1', fromPort: 'Gi0/2', toDevice: 'E2E-DIST-SW2', toPort: 'Gi0/1', type: 'trunk' },
        { fromDevice: 'E2E-DIST-SW1', fromPort: 'Gi0/24', toDevice: 'E2E-ACCESS-SW1', toPort: 'Gi0/1', type: 'trunk' },
        { fromDevice: 'E2E-DIST-SW2', fromPort: 'Gi0/24', toDevice: 'E2E-ACCESS-SW2', toPort: 'Gi0/1', type: 'trunk' },
        { fromDevice: 'E2E-CORE-SW1', fromPort: 'Gi0/48', toDevice: 'E2E-ROUTER1', toPort: 'Gi0/0', type: 'lan' },
        { fromDevice: 'E2E-ROUTER1', fromPort: 'Gi0/1', toDevice: 'E2E-FIREWALL1', toPort: 'Eth0', type: 'wan' },
        // Cross-links for redundancy
        { fromDevice: 'E2E-DIST-SW1', fromPort: 'Gi0/2', toDevice: 'E2E-DIST-SW2', toPort: 'Gi0/2', type: 'trunk' },
    ];
    
    if (!initialData.connections) initialData.connections = [];
    
    testConnections.forEach((conn, i) => {
        conn.id = maxConnId + i + 1;
        conn.status = 'active';
        conn.cable = 'CAT6A';
        conn.notes = 'E2E Test Connection';
        initialData.connections.push(conn);
    });
    
    // Save data
    res = await post('/data.php', initialData);
    if (res.data.ok) {
        pass('Test network created', `+${testDevices.length} devices, +${testConnections.length} connections`);
    } else {
        fail('Failed to create test network', JSON.stringify(res.data));
    }
    
    // Verify data was saved
    res = await get('/data.php');
    const newDeviceCount = res.data.devices.length;
    const newConnCount = res.data.connections.length;
    
    if (newDeviceCount === initialDeviceCount + testDevices.length) {
        pass('Device count verified', `${newDeviceCount} total`);
    } else {
        fail('Device count mismatch', `Expected: ${initialDeviceCount + testDevices.length}, Got: ${newDeviceCount}`);
    }
    
    if (newConnCount === initialConnCount + testConnections.length) {
        pass('Connection count verified', `${newConnCount} total`);
    } else {
        fail('Connection count mismatch', `Expected: ${initialConnCount + testConnections.length}, Got: ${newConnCount}`);
    }
}

async function testAssociations() {
    header('4. DEVICE-CONNECTION ASSOCIATIONS');
    
    const res = await get('/data.php');
    const data = res.data;
    
    // Build device-connection map
    const deviceConnMap = {};
    for (const conn of data.connections) {
        if (conn.fromDevice) {
            deviceConnMap[conn.fromDevice] = (deviceConnMap[conn.fromDevice] || 0) + 1;
        }
        if (conn.toDevice) {
            deviceConnMap[conn.toDevice] = (deviceConnMap[conn.toDevice] || 0) + 1;
        }
    }
    
    // Check E2E-CORE-SW1 should have 4 connections (to 2 dist, 1 router, total 3 but counted as from)
    const coreConns = deviceConnMap['E2E-CORE-SW1'] || 0;
    if (coreConns >= 3) {
        pass('Core switch associations correct', `E2E-CORE-SW1 has ${coreConns} connections`);
    } else {
        fail('Core switch associations', `Expected >= 3, got ${coreConns}`);
    }
    
    // Check for orphan connections
    const deviceNames = new Set(data.devices.map(d => d.name));
    let orphans = 0;
    for (const conn of data.connections) {
        if (conn.fromDevice && !deviceNames.has(conn.fromDevice)) orphans++;
        if (conn.toDevice && !deviceNames.has(conn.toDevice)) orphans++;
    }
    
    if (orphans === 0) {
        pass('No orphan connections');
    } else {
        fail('Orphan connections found', `${orphans} orphans`);
    }
}

async function testRecursivePaths() {
    header('5. RECURSIVE PATH ANALYSIS');
    
    const res = await get('/data.php');
    const data = res.data;
    
    // Build adjacency list
    const adj = {};
    for (const conn of data.connections) {
        const from = conn.fromDevice;
        const to = conn.toDevice;
        if (from && to) {
            if (!adj[from]) adj[from] = [];
            if (!adj[to]) adj[to] = [];
            adj[from].push(to);
            adj[to].push(from);
        }
    }
    
    // BFS to find path from E2E-CORE-SW1 to E2E-FIREWALL1
    function findPath(start, end) {
        if (!adj[start]) return null;
        const visited = new Set([start]);
        const queue = [[start, [start]]];
        
        while (queue.length > 0) {
            const [node, path] = queue.shift();
            if (node === end) return path;
            
            for (const neighbor of (adj[node] || [])) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([neighbor, [...path, neighbor]]);
                }
            }
        }
        return null;
    }
    
    const path = findPath('E2E-CORE-SW1', 'E2E-FIREWALL1');
    if (path) {
        pass('Path from Core to Firewall found', `Length: ${path.length} hops`);
        log(`     Path: ${path.join(' → ')}`, colors.cyan);
    } else {
        fail('Path from Core to Firewall not found');
    }
    
    // Find all devices reachable from core
    function findReachable(start) {
        const visited = new Set();
        const queue = [start];
        while (queue.length > 0) {
            const node = queue.shift();
            if (visited.has(node)) continue;
            visited.add(node);
            for (const neighbor of (adj[node] || [])) {
                if (!visited.has(neighbor)) queue.push(neighbor);
            }
        }
        return visited;
    }
    
    const reachable = findReachable('E2E-CORE-SW1');
    const e2eDevices = data.devices.filter(d => d.name.startsWith('E2E-')).length;
    
    if (reachable.size >= e2eDevices) {
        pass('All E2E devices reachable from core', `${reachable.size} devices reachable`);
    } else {
        fail('Some E2E devices not reachable', `${reachable.size} of ${e2eDevices} reachable`);
    }
}

async function testRoomsAndLocations() {
    header('6. ROOMS AND LOCATIONS');
    
    const res = await get('/data.php');
    const data = res.data;
    
    // Check rooms structure
    if (data.rooms && data.rooms.length > 0) {
        pass('Rooms data exists', `${data.rooms.length} rooms`);
    } else {
        log('  ℹ️  No rooms defined (this is optional)', colors.yellow);
    }
    
    // Check locations
    const locations = new Set(data.devices.map(d => d.location).filter(Boolean));
    pass('Locations found', `${locations.size} unique locations`);
    
    // Check E2E Test location
    const e2eDevices = data.devices.filter(d => d.location === 'E2E Test').length;
    if (e2eDevices >= 7) {
        pass('E2E Test location has devices', `${e2eDevices} devices`);
    } else {
        fail('E2E Test location missing devices', `Expected 7, got ${e2eDevices}`);
    }
}

async function testDataIntegrity() {
    header('7. DATA INTEGRITY');
    
    const res = await get('/data.php');
    const data = res.data;
    
    // Check for duplicate device IDs
    const deviceIds = data.devices.map(d => d.id);
    const uniqueIds = new Set(deviceIds);
    if (deviceIds.length === uniqueIds.size) {
        pass('No duplicate device IDs');
    } else {
        fail('Duplicate device IDs found');
    }
    
    // Check for duplicate connection IDs
    const connIds = data.connections.map(c => c.id);
    const uniqueConnIds = new Set(connIds);
    if (connIds.length === uniqueConnIds.size) {
        pass('No duplicate connection IDs');
    } else {
        fail('Duplicate connection IDs found');
    }
    
    // Check nextDeviceId is valid
    const maxDeviceId = Math.max(...deviceIds);
    if (data.nextDeviceId > maxDeviceId) {
        pass('nextDeviceId is valid', `${data.nextDeviceId} > ${maxDeviceId}`);
    } else {
        fail('nextDeviceId conflict', `${data.nextDeviceId} <= ${maxDeviceId}`);
    }
}

async function testCleanup() {
    header('8. CLEANUP');
    
    const res = await get('/data.php');
    const data = res.data;
    
    // Remove E2E test data
    data.devices = data.devices.filter(d => !d.name.startsWith('E2E-'));
    data.connections = data.connections.filter(c => 
        !c.fromDevice?.startsWith('E2E-') && !c.toDevice?.startsWith('E2E-')
    );
    
    const saveRes = await post('/data.php', data);
    if (saveRes.data.ok) {
        pass('E2E test data cleaned up');
    } else {
        fail('Cleanup failed');
    }
    
    // Verify cleanup
    const verifyRes = await get('/data.php');
    const e2eRemaining = verifyRes.data.devices.filter(d => d.name.startsWith('E2E-')).length;
    if (e2eRemaining === 0) {
        pass('Cleanup verified', 'No E2E devices remaining');
    } else {
        fail('Cleanup incomplete', `${e2eRemaining} E2E devices remaining`);
    }
}

async function testLogout() {
    header('9. LOGOUT');
    
    const res = await post('/api/auth.php?action=logout', {});
    if (res.data.ok) {
        pass('Logout successful');
    } else {
        fail('Logout failed');
    }
    
    // Verify session is invalid
    const checkRes = await get('/api/auth.php?action=check');
    if (checkRes.data.authenticated === false) {
        pass('Session invalidated');
    } else {
        fail('Session still active after logout');
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.clear();
    
    log('╔══════════════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║     TIESSE Matrix Network - END-TO-END TEST SUITE v1.0              ║', colors.magenta);
    log('║     Testing complete data flow and associations                      ║', colors.magenta);
    log('╚══════════════════════════════════════════════════════════════════════╝', colors.magenta);
    log(`Date: ${new Date().toISOString()}`);
    log(`Server: ${BASE_URL}\n`);
    
    try {
        await testServerHealth();
        await testAuthentication();
        await testDataOperations();
        await testAssociations();
        await testRecursivePaths();
        await testRoomsAndLocations();
        await testDataIntegrity();
        await testCleanup();
        await testLogout();
    } catch (error) {
        log(`\n  💥 Test suite error: ${error.message}`, colors.red);
        console.error(error);
    }
    
    // Summary
    log('\n');
    log('╔══════════════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║                           TEST SUMMARY                               ║', colors.magenta);
    log('╚══════════════════════════════════════════════════════════════════════╝', colors.magenta);
    
    const total = results.passed + results.failed;
    const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
    
    log(`  Total Tests:  ${total}`, colors.reset);
    log(`  Passed:       ${results.passed}`, colors.green);
    log(`  Failed:       ${results.failed}`, colors.red);
    log(`  Pass Rate:    ${passRate}%\n`, colors.reset);
    
    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED!', colors.green);
        process.exit(0);
    } else {
        log('❌ SOME TESTS FAILED', colors.red);
        process.exit(1);
    }
}

main();
