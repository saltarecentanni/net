#!/usr/bin/env node
/**
 * DATA INTEGRITY VALIDATOR
 * Comprehensive validation of matrix-network-data.json data structure
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.argv[2] || path.join(__dirname, 'data', 'matrix-network-data.json');

console.log('======================================================================');
console.log('DATA INTEGRITY VALIDATOR - Comprehensive Check');
console.log('======================================================================');
console.log(`📂 File: ${DATA_FILE}\n`);

let data;
try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(content);
    console.log('✅ JSON is valid\n');
} catch (error) {
    console.error('❌ CRITICAL: Invalid JSON format!');
    console.error(error.message);
    process.exit(1);
}

let errors = [];
let warnings = [];

// 1. REQUIRED FIELDS CHECK
console.log('🔍 VALIDATION 1: Required top-level fields');
const requiredFields = ['devices', 'connections', 'rooms', 'sites', 'locations', 'nextDeviceId', 'nextLocationId', 'version'];
requiredFields.forEach(field => {
    if (!data.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
    } else {
        console.log(`   ✅ ${field}: ${Array.isArray(data[field]) ? data[field].length + ' items' : data[field]}`);
    }
});
console.log();

// 2. DEVICE ID UNIQUENESS
console.log('🔍 VALIDATION 2: Device ID uniqueness');
const deviceIds = data.devices.map(d => d.id);
const duplicateIds = deviceIds.filter((id, index) => deviceIds.indexOf(id) !== index);
if (duplicateIds.length > 0) {
    errors.push(`Duplicate device IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    console.log(`   ❌ Found ${duplicateIds.length} duplicate IDs`);
} else {
    console.log(`   ✅ All ${deviceIds.length} device IDs are unique`);
}
console.log();

// 3. DEVICE REQUIRED FIELDS
console.log('🔍 VALIDATION 3: Device required fields');
let devicesWithMissingFields = 0;
data.devices.forEach((device, index) => {
    const required = ['id', 'name', 'type', 'status'];
    const missing = required.filter(f => !device.hasOwnProperty(f));
    if (missing.length > 0) {
        devicesWithMissingFields++;
        errors.push(`Device ${device.id || index}: missing fields: ${missing.join(', ')}`);
    }
});
if (devicesWithMissingFields === 0) {
    console.log(`   ✅ All ${data.devices.length} devices have required fields`);
} else {
    console.log(`   ❌ ${devicesWithMissingFields} devices missing required fields`);
}
console.log();

// 4. CONNECTION VALIDATION
console.log('🔍 VALIDATION 4: Connection integrity');
let invalidConnections = 0;
let externalConnections = 0;
let wallJackConnections = 0;
let deviceToDeviceConnections = 0;

data.connections.forEach((conn, index) => {
    if (!conn.from) {
        errors.push(`Connection ${index}: missing 'from' field`);
        invalidConnections++;
        return;
    }
    
    // Check if 'from' device exists
    const fromDevice = data.devices.find(d => d.id === conn.from);
    if (!fromDevice) {
        errors.push(`Connection ${index}: 'from' device ID ${conn.from} does not exist`);
        invalidConnections++;
    }
    
    // Check connection type
    if (conn.to !== undefined && conn.to !== null) {
        // Device-to-device connection
        deviceToDeviceConnections++;
        const toDevice = data.devices.find(d => d.id === conn.to);
        if (!toDevice) {
            errors.push(`Connection ${index}: 'to' device ID ${conn.to} does not exist`);
            invalidConnections++;
        }
    } else if (conn.externalDest) {
        if (conn.isWallJack) {
            wallJackConnections++;
        } else {
            externalConnections++;
            // Check if externalDest might be a device name (potential data corruption)
            const matchingDevice = data.devices.find(d => 
                d.name && (
                    d.name.toLowerCase() === conn.externalDest.toLowerCase() ||
                    d.name.toLowerCase().includes(conn.externalDest.toLowerCase()) ||
                    conn.externalDest.toLowerCase().includes(d.name.toLowerCase())
                )
            );
            if (matchingDevice) {
                warnings.push(`Connection ${index}: externalDest "${conn.externalDest}" matches device "${matchingDevice.name}" (ID: ${matchingDevice.id}) - should use 'to' field`);
            }
        }
    }
});

console.log(`   Device-to-Device: ${deviceToDeviceConnections}`);
console.log(`   External Destinations: ${externalConnections}`);
console.log(`   Wall Jacks: ${wallJackConnections}`);
if (invalidConnections === 0) {
    console.log(`   ✅ All ${data.connections.length} connections are structurally valid`);
} else {
    console.log(`   ❌ ${invalidConnections} invalid connections found`);
}
console.log();

// 5. ORPHANED CONNECTIONS
console.log('🔍 VALIDATION 5: Orphaned connections (referencing non-existent devices)');
let orphanedConnections = 0;
data.connections.forEach((conn, index) => {
    const fromExists = data.devices.some(d => d.id === conn.from);
    const toExists = conn.to ? data.devices.some(d => d.id === conn.to) : true;
    if (!fromExists || !toExists) {
        orphanedConnections++;
    }
});
if (orphanedConnections === 0) {
    console.log(`   ✅ No orphaned connections`);
} else {
    console.log(`   ❌ ${orphanedConnections} orphaned connections found`);
}
console.log();

// 6. LOCATION CODE UNIQUENESS
console.log('🔍 VALIDATION 6: Location code uniqueness');
const locationCodes = data.locations.map(l => l.code);
const duplicateLocations = locationCodes.filter((code, index) => locationCodes.indexOf(code) !== index);
if (duplicateLocations.length > 0) {
    errors.push(`Duplicate location codes: ${[...new Set(duplicateLocations)].join(', ')}`);
    console.log(`   ❌ Found ${duplicateLocations.length} duplicate location codes`);
} else {
    console.log(`   ✅ All ${locationCodes.length} location codes are unique`);
}
console.log();

// 7. VERSION & METADATA
console.log('🔍 VALIDATION 7: Metadata');
console.log(`   Version: ${data.version || 'N/A'}`);
console.log(`   Next Device ID: ${data.nextDeviceId}`);
console.log(`   Next Location ID: ${data.nextLocationId}`);
console.log(`   Exported At: ${data.exportedAt || 'N/A'}`);
console.log(`   Checksum: ${data.__checksum || 'N/A'}`);

// Check if nextDeviceId is higher than max device ID
const maxDeviceId = Math.max(...deviceIds);
if (data.nextDeviceId <= maxDeviceId) {
    warnings.push(`nextDeviceId (${data.nextDeviceId}) should be higher than max device ID (${maxDeviceId})`);
}
console.log();

// 8. SUMMARY
console.log('======================================================================');
console.log('VALIDATION SUMMARY');
console.log('======================================================================');
console.log(`✅ Validations passed: ${7 - errors.length}`);
console.log(`❌ Errors found: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log();

if (errors.length > 0) {
    console.log('🔴 ERRORS:');
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    console.log();
}

if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    console.log();
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 ALL VALIDATIONS PASSED! Data integrity is excellent.');
    console.log('======================================================================');
    process.exit(0);
} else if (errors.length === 0) {
    console.log('✅ No critical errors, but review warnings.');
    console.log('======================================================================');
    process.exit(0);
} else {
    console.log('❌ CRITICAL ERRORS FOUND! Fix these issues before using the data.');
    console.log('======================================================================');
    process.exit(1);
}
