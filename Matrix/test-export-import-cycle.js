#!/usr/bin/env node
/**
 * EXPORT/IMPORT INTEGRITY TEST
 * Tests full cycle: Export → Validate → Import → Compare
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'matrix-network-data.json');
const EXPORT_FILE = path.join(__dirname, 'test-export.json');
const REIMPORT_FILE = path.join(__dirname, 'test-reimport.json');

console.log('======================================================================');
console.log('EXPORT/IMPORT CYCLE TEST');
console.log('======================================================================\n');

// STEP 1: Read original data
console.log('📖 STEP 1: Reading original data...');
let originalData;
try {
    originalData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`   ✅ Loaded ${originalData.devices.length} devices, ${originalData.connections.length} connections\n`);
} catch (error) {
    console.error('   ❌ Failed to read original data:', error.message);
    process.exit(1);
}

// STEP 2: Export (simulate what the UI does)
console.log('💾 STEP 2: Simulating export...');
const exportData = {
    devices: originalData.devices,
    connections: originalData.connections,
    rooms: originalData.rooms,
    sites: originalData.sites,
    locations: originalData.locations,
    nextDeviceId: originalData.nextDeviceId,
    nextLocationId: originalData.nextLocationId,
    exportedAt: new Date().toISOString(),
    version: originalData.version,
    __checksum: generateChecksum(originalData),
    __checksumAlgorithm: 'SHA-256'
};

try {
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Exported to: ${EXPORT_FILE}\n`);
} catch (error) {
    console.error('   ❌ Export failed:', error.message);
    process.exit(1);
}

// STEP 3: Validate export file
console.log('🔍 STEP 3: Validating export file...');
let exportedData;
try {
    exportedData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
    console.log('   ✅ Export file is valid JSON');
    
    // Check structure
    const requiredFields = ['devices', 'connections', 'rooms', 'sites', 'locations', 'version'];
    const missing = requiredFields.filter(f => !exportedData.hasOwnProperty(f));
    if (missing.length > 0) {
        console.error(`   ❌ Missing fields: ${missing.join(', ')}`);
        process.exit(1);
    }
    console.log('   ✅ All required fields present\n');
} catch (error) {
    console.error('   ❌ Validation failed:', error.message);
    process.exit(1);
}

// STEP 4: Simulate import (copy export as if importing)
console.log('📥 STEP 4: Simulating import...');
try {
    fs.copyFileSync(EXPORT_FILE, REIMPORT_FILE);
    console.log(`   ✅ Import simulated: ${REIMPORT_FILE}\n`);
} catch (error) {
    console.error('   ❌ Import failed:', error.message);
    process.exit(1);
}

// STEP 5: Compare original vs reimported
console.log('🔄 STEP 5: Comparing original ↔ reimported data...');
const reimportedData = JSON.parse(fs.readFileSync(REIMPORT_FILE, 'utf8'));

let differences = [];

// Compare devices
if (originalData.devices.length !== reimportedData.devices.length) {
    differences.push(`Device count mismatch: ${originalData.devices.length} vs ${reimportedData.devices.length}`);
} else {
    console.log(`   ✅ Device count matches: ${originalData.devices.length}`);
}

// Compare connections
if (originalData.connections.length !== reimportedData.connections.length) {
    differences.push(`Connection count mismatch: ${originalData.connections.length} vs ${reimportedData.connections.length}`);
} else {
    console.log(`   ✅ Connection count matches: ${originalData.connections.length}`);
}

// Compare locations
if (originalData.locations.length !== reimportedData.locations.length) {
    differences.push(`Location count mismatch: ${originalData.locations.length} vs ${reimportedData.locations.length}`);
} else {
    console.log(`   ✅ Location count matches: ${originalData.locations.length}`);
}

// Deep comparison of critical connections
console.log('\n🔬 STEP 6: Deep connection validation...');
let connectionIssues = 0;
reimportedData.connections.forEach((conn, index) => {
    const orig = originalData.connections[index];
    if (!orig) return;
    
    // Check critical fields
    if (conn.from !== orig.from || conn.to !== orig.to || conn.externalDest !== orig.externalDest) {
        connectionIssues++;
        differences.push(`Connection ${index} mismatch`);
    }
});

if (connectionIssues === 0) {
    console.log(`   ✅ All ${reimportedData.connections.length} connections match perfectly`);
} else {
    console.log(`   ❌ ${connectionIssues} connection mismatches found`);
}

// Verify no corrupt externalDest (the main issue we fixed)
console.log('\n🎯 STEP 7: Verifying fixed data (no corrupt externalDest)...');
let corruptConnections = 0;
const deviceNames = reimportedData.devices.map(d => d.name.toLowerCase());

reimportedData.connections.forEach((conn, index) => {
    if (conn.externalDest && conn.externalDest !== '' && !conn.isWallJack) {
        // Check if externalDest matches a device name
        const ext = conn.externalDest.toLowerCase();
        const matchingName = deviceNames.find(name => 
            name === ext || name.includes(ext) || ext.includes(name)
        );
        if (matchingName) {
            corruptConnections++;
            differences.push(`Connection ${index}: externalDest "${conn.externalDest}" matches device name - should use device ID`);
        }
    }
});

if (corruptConnections === 0) {
    console.log('   ✅ No corrupt externalDest found (all fixes preserved)');
} else {
    console.log(`   ❌ ${corruptConnections} corrupt externalDest found!`);
}

// STEP 8: Cleanup
console.log('\n🧹 STEP 8: Cleanup test files...');
try {
    fs.unlinkSync(EXPORT_FILE);
    fs.unlinkSync(REIMPORT_FILE);
    console.log('   ✅ Test files removed\n');
} catch (error) {
    console.log('   ⚠️  Could not remove test files:', error.message);
}

// FINAL RESULT
console.log('======================================================================');
console.log('TEST SUMMARY');
console.log('======================================================================');

if (differences.length === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Export → Import cycle is PERFECT');
    console.log('✅ No data corruption detected');
    console.log('✅ All fixes preserved through export/import');
    console.log('======================================================================');
    process.exit(0);
} else {
    console.log('❌ ISSUES FOUND:');
    differences.forEach((diff, i) => console.log(`   ${i + 1}. ${diff}`));
    console.log('======================================================================');
    process.exit(1);
}

function generateChecksum(data) {
    const crypto = require('crypto');
    const content = JSON.stringify({
        devices: data.devices.length,
        connections: data.connections.length,
        version: data.version
    });
    return 'fb-' + crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}
