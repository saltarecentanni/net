#!/usr/bin/env node

/**
 * Complete Data Audit Script
 * Validates all data structures and connections
 * Reports all errors found
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║          MATRIX NETWORK - COMPLETE DATA AUDIT          ║');
console.log('║                    v3.5.047                            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Load data
const dataPath = path.join(__dirname, 'network_manager.json');
console.log('📂 Loading data from:', dataPath);

let data;
try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('✅ JSON parsed successfully\n');
} catch (err) {
    console.error('❌ JSON parse error:', err.message);
    process.exit(1);
}

// Initialize validators
const issues = [];
const warnings = [];
const info = [];

// ============================================================================
// 1. STRUCTURE VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('1️⃣  STRUCTURE VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

if (!data.devices) {
    issues.push('Missing "devices" array');
} else {
    console.log(`✅ devices: ${data.devices.length} items`);
}

if (!data.connections) {
    issues.push('Missing "connections" array');
} else {
    console.log(`✅ connections: ${data.connections.length} items`);
}

if (!data.rooms) {
    warnings.push('Missing "rooms" array (optional)');
} else {
    console.log(`✅ rooms: ${data.rooms.length} items`);
}

if (!data.locations) {
    warnings.push('Missing "locations" array (optional)');
} else {
    console.log(`✅ locations: ${data.locations.length} items`);
}

console.log();

// ============================================================================
// 2. DEVICE VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('2️⃣  DEVICE VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

const deviceIds = new Set();
const devicesByRack = {};

data.devices.forEach((device, idx) => {
    // Check required fields
    if (!device.id) {
        issues.push(`Device[${idx}]: missing "id"`);
        return;
    }
    
    deviceIds.add(device.id);
    
    if (!device.name) {
        issues.push(`Device[${idx}] (id=${device.id}): missing "name"`);
    }
    
    if (!device.rackId) {
        warnings.push(`Device[${idx}] (${device.name}): missing "rackId"`);
    } else {
        if (!devicesByRack[device.rackId]) {
            devicesByRack[device.rackId] = [];
        }
        devicesByRack[device.rackId].push(device.id);
    }
    
    // Check ports
    if (device.ports && Array.isArray(device.ports)) {
        device.ports.forEach((port, pidx) => {
            if (!port.name) {
                issues.push(`Device[${idx}] (${device.name}) Port[${pidx}]: missing "name"`);
            }
        });
    }
    
    // Check status
    if (device.status && !['active', 'disabled', 'offline', 'maintenance'].includes(device.status)) {
        warnings.push(`Device[${idx}] (${device.name}): unusual status "${device.status}"`);
    }
});

console.log(`✅ Validated ${data.devices.length} devices`);
console.log(`   - Unique IDs: ${deviceIds.size}`);
console.log(`   - Racks: ${Object.keys(devicesByRack).length}`);
console.log();

// ============================================================================
// 3. CONNECTION VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('3️⃣  CONNECTION VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

const connTypes = {};
const connStatuses = {};
const brokenConnections = [];

data.connections.forEach((conn, idx) => {
    // Check required fields
    if (conn.from && !deviceIds.has(conn.from)) {
        brokenConnections.push(`Connection[${idx}]: "from" device ${conn.from} not found`);
    }
    
    if (conn.to && !deviceIds.has(conn.to)) {
        brokenConnections.push(`Connection[${idx}]: "to" device ${conn.to} not found`);
    }
    
    // Check external/walljack
    if (!conn.from && !conn.externalDest) {
        issues.push(`Connection[${idx}]: missing both "from" and "externalDest"`);
    }
    
    if (!conn.to && !conn.externalDest && !conn.isWallJack) {
        warnings.push(`Connection[${idx}]: missing "to" device and "externalDest"`);
    }
    
    // Track types
    if (conn.type) {
        connTypes[conn.type] = (connTypes[conn.type] || 0) + 1;
    }
    
    // Track statuses
    if (conn.status) {
        connStatuses[conn.status] = (connStatuses[conn.status] || 0) + 1;
    }
    
    // Check for unusual types
    const validTypes = ['lan', 'wan', 'dmz', 'trunk', 'management', 'backup', 'fiber', 'wallport', 'walljack', 'external', 'other'];
    if (conn.type && !validTypes.includes(conn.type)) {
        warnings.push(`Connection[${idx}]: unusual type "${conn.type}"`);
    }
});

console.log(`✅ Validated ${data.connections.length} connections`);
console.log(`   - Types: ${Object.keys(connTypes).length}`);
Object.entries(connTypes).forEach(([type, count]) => {
    console.log(`     • ${type}: ${count}`);
});
console.log(`   - Statuses:`);
Object.entries(connStatuses).forEach(([status, count]) => {
    console.log(`     • ${status}: ${count}`);
});

if (brokenConnections.length > 0) {
    console.log(`\n⚠️  Broken connections found: ${brokenConnections.length}`);
    brokenConnections.forEach(msg => console.log(`   ${msg}`));
}
console.log();

// ============================================================================
// 4. ROOM VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('4️⃣  ROOM VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

if (data.rooms && data.rooms.length > 0) {
    const roomIds = new Set();
    
    data.rooms.forEach((room, idx) => {
        if (!room.id) {
            issues.push(`Room[${idx}]: missing "id"`);
        } else {
            roomIds.add(room.id);
        }
        
        if (!room.name) {
            warnings.push(`Room[${idx}]: missing "name"`);
        }
    });
    
    console.log(`✅ Validated ${data.rooms.length} rooms`);
    console.log(`   - Unique IDs: ${roomIds.size}`);
    console.log();
} else {
    console.log('⚠️  No rooms found\n');
}

// ============================================================================
// 5. LOCATION VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('5️⃣  LOCATION VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

if (data.locations && data.locations.length > 0) {
    const locationCodes = new Set();
    
    data.locations.forEach((loc, idx) => {
        if (!loc.code) {
            issues.push(`Location[${idx}]: missing "code"`);
        } else {
            if (locationCodes.has(loc.code)) {
                issues.push(`Location[${idx}]: duplicate code "${loc.code}"`);
            }
            locationCodes.add(loc.code);
        }
        
        if (!loc.name) {
            warnings.push(`Location[${idx}]: missing "name"`);
        }
    });
    
    console.log(`✅ Validated ${data.locations.length} locations`);
    console.log(`   - Unique codes: ${locationCodes.size}`);
    console.log();
} else {
    console.log('⚠️  No locations found\n');
}

// ============================================================================
// 6. CROSS-REFERENCE VALIDATION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('6️⃣  CROSS-REFERENCE VALIDATION');
console.log('═══════════════════════════════════════════════════════\n');

let crossRefIssues = 0;

data.connections.forEach((conn, idx) => {
    // Check wall jack room references
    if (conn.isWallJack && conn.roomId) {
        if (data.rooms && !data.rooms.find(r => String(r.id) === String(conn.roomId))) {
            issues.push(`Connection[${idx}]: WallJack references non-existent room "${conn.roomId}"`);
            crossRefIssues++;
        }
    }
    
    // Check device location references
    ['from', 'to'].forEach(field => {
        if (conn[field]) {
            const device = data.devices.find(d => d.id === conn[field]);
            if (device && device.location) {
                if (data.locations && !data.locations.find(l => l.code === device.location || l.name === device.location)) {
                    warnings.push(`Device ${device.name}: references unknown location "${device.location}"`);
                }
            }
        }
    });
});

console.log(`✅ Cross-references validated`);
if (crossRefIssues > 0) {
    console.log(`   ⚠️  ${crossRefIssues} issues found`);
}
console.log();

// ============================================================================
// 7. DATA INTEGRITY CHECKS
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('7️⃣  DATA INTEGRITY CHECKS');
console.log('═══════════════════════════════════════════════════════\n');

// Check for orphaned connections
let orphanedCount = 0;
data.connections.forEach((conn, idx) => {
    const hasValidFrom = conn.from && deviceIds.has(conn.from);
    const hasValidTo = conn.to && deviceIds.has(conn.to);
    const hasExternal = conn.externalDest || conn.isWallJack;
    
    if (!hasValidFrom && !hasExternal) {
        orphanedCount++;
    }
});

if (orphanedCount > 0) {
    warnings.push(`${orphanedCount} connections may be orphaned (no valid source)`);
}

// Check for duplicate connections
const connMap = new Map();
let duplicateCount = 0;
data.connections.forEach((conn, idx) => {
    const key = `${conn.from}:${conn.fromPort}→${conn.to}:${conn.toPort}`;
    if (connMap.has(key)) {
        duplicateCount++;
        issues.push(`Possible duplicate connection: ${key} at indices ${connMap.get(key)} and ${idx}`);
    } else {
        connMap.set(key, idx);
    }
});

console.log(`✅ Data integrity verified`);
if (orphanedCount > 0) {
    console.log(`   ⚠️  ${orphanedCount} potentially orphaned items`);
}
if (duplicateCount > 0) {
    console.log(`   ⚠️  ${duplicateCount} potential duplicates`);
}
console.log();

// ============================================================================
// 8. SUMMARY
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');

console.log(`Total Devices:     ${data.devices.length}`);
console.log(`Total Connections: ${data.connections.length}`);
console.log(`Total Rooms:       ${data.rooms ? data.rooms.length : 0}`);
console.log(`Total Locations:   ${data.locations ? data.locations.length : 0}`);
console.log();

console.log('🚨 CRITICAL ERRORS:', issues.length);
if (issues.length > 0) {
    issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
    });
    console.log();
}

console.log('⚠️  WARNINGS:', warnings.length);
if (warnings.length > 0) {
    warnings.forEach((warn, idx) => {
        console.log(`   ${idx + 1}. ${warn}`);
    });
    console.log();
}

// Final status
console.log('═══════════════════════════════════════════════════════');
if (issues.length === 0) {
    console.log('✅ ALL CRITICAL CHECKS PASSED');
} else {
    console.log('❌ CRITICAL ERRORS FOUND - DATA NEEDS REPAIR');
}

if (warnings.length > 0 && issues.length === 0) {
    console.log('⚠️  Some warnings found but data is structurally sound');
}

console.log('═══════════════════════════════════════════════════════\n');

process.exit(issues.length > 0 ? 1 : 0);
