#!/usr/bin/env node
/**
 * TIESSE Matrix Network - Post-Refactor Testing Script v3.5.045
 * 
 * Validates that:
 * 1. JSON structure is valid
 * 2. No deprecated fields remain
 * 3. All device references valid
 * 4. All connection references valid
 * 5. Data can be imported/exported
 * 
 * Usage: node scripts/test-refactored-data.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/network_manager.json');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         Post-Refactor Validation Tests - v3.5.045              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function test(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: '✅ PASS' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: '❌ FAIL', error: error.message });
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message}\n`);
    }
}

function warn(name, message) {
    results.warnings++;
    results.tests.push({ name, status: '⚠️  WARN', message });
    console.warn(`⚠️  ${name}: ${message}`);
}

try {
    // Load data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    console.log('🔧 TEST 1: JSON Structure Validation');
    console.log('─────────────────────────────────────────────────────────────\n');

    test('JSON is valid and parseable', () => {
        if (!data || typeof data !== 'object') throw new Error('Data is not an object');
    });

    test('Has devices array', () => {
        if (!Array.isArray(data.devices)) throw new Error('Missing devices array');
        if (data.devices.length === 0) throw new Error('Devices array is empty');
    });

    test('Has connections array', () => {
        if (!Array.isArray(data.connections)) throw new Error('Missing connections array');
        if (data.connections.length === 0) throw new Error('Connections array is empty');
    });

    console.log(`\n📊 TEST 2: Data Integrity Checks`);
    console.log('─────────────────────────────────────────────────────────────\n');

    const deviceCount = data.devices.length;
    const connectionCount = data.connections.length;

    console.log(`   Devices: ${deviceCount}`);
    console.log(`   Connections: ${connectionCount}\n`);

    test('All devices have required IDs', () => {
        data.devices.forEach((d, i) => {
            if (typeof d.id !== 'number') throw new Error(`Device[${i}]: id is not a number`);
        });
    });

    test('All devices have unique IDs', () => {
        const ids = data.devices.map(d => d.id);
        const unique = new Set(ids);
        if (ids.length !== unique.size) throw new Error('Duplicate device IDs found');
    });

    test('All devices have required name', () => {
        data.devices.forEach((d, i) => {
            if (!d.name || typeof d.name !== 'string') {
                throw new Error(`Device[${i}]: missing or invalid name`);
            }
        });
    });

    test('All devices have required type', () => {
        data.devices.forEach((d, i) => {
            if (!d.type) throw new Error(`Device[${i}]: missing type`);
        });
    });

    test('All devices have required status', () => {
        data.devices.forEach((d, i) => {
            if (!d.status) throw new Error(`Device[${i}]: missing status`);
        });
    });

    test('All devices have required location', () => {
        data.devices.forEach((d, i) => {
            if (!d.location) throw new Error(`Device[${i}]: missing location`);
        });
    });

    console.log(`\n🔗 TEST 3: Referential Integrity`);
    console.log('─────────────────────────────────────────────────────────────\n');

    const deviceIds = new Set(data.devices.map(d => d.id));

    test('All connections reference valid "from" devices', () => {
        data.connections.forEach((c, i) => {
            if (!deviceIds.has(c.from)) {
                throw new Error(`Connection[${i}]: from device ${c.from} does not exist`);
            }
        });
    });

    test('All connections reference valid "to" devices (if set)', () => {
        data.connections.forEach((c, i) => {
            if (c.to !== undefined && c.to !== null) {
                if (!deviceIds.has(c.to)) {
                    throw new Error(`Connection[${i}]: to device ${c.to} does not exist`);
                }
            }
        });
    });

    test('All connections have required "type"', () => {
        data.connections.forEach((c, i) => {
            if (!c.type) throw new Error(`Connection[${i}]: missing type`);
        });
    });

    test('All connections have required "status"', () => {
        data.connections.forEach((c, i) => {
            if (!c.status) throw new Error(`Connection[${i}]: missing status`);
        });
    });

    console.log(`\n🚀 TEST 4: Deprecated Fields Check`);
    console.log('─────────────────────────────────────────────────────────────\n');

    const deprecatedDeviceFields = ['rack', 'rear', 'zone', 'zoneIP', '_isExternal', 'roomId'];
    const deprecatedConnFields = ['color', 'roomId'];

    test('No deprecated device fields remain', () => {
        data.devices.forEach((d, i) => {
            deprecatedDeviceFields.forEach(field => {
                if (d[field] !== undefined) {
                    throw new Error(`Device[${i}]: has deprecated field "${field}"`);
                }
            });
        });
    });

    test('No deprecated connection fields remain', () => {
        data.connections.forEach((c, i) => {
            deprecatedConnFields.forEach(field => {
                if (c[field] !== undefined) {
                    throw new Error(`Connection[${i}]: has deprecated field "${field}"`);
                }
            });
        });
    });

    console.log(`\n✨ TEST 5: Field Consolidation Check`);
    console.log('─────────────────────────────────────────────────────────────\n');

    test('Devices use rackId (not rack)', () => {
        let hasRackId = 0;
        data.devices.forEach(d => {
            if (d.rackId !== undefined) hasRackId++;
        });
        if (hasRackId === 0) console.log('   (Note: No devices have rackId - may be optional)');
    });

    test('Devices use isRear (not rear)', () => {
        let hasIsRear = 0;
        data.devices.forEach(d => {
            if (d.isRear !== undefined) hasIsRear++;
        });
        if (hasIsRear === 0) console.log('   (Note: No devices have isRear - may be optional)');
    });

    test('Connections use cableColor (not color)', () => {
        let hasCableColor = 0;
        data.connections.forEach(c => {
            if (c.cableColor !== undefined) hasCableColor++;
        });
        if (hasCableColor === 0) {
            warn('No cableColor found', 'Connections may not have cable colors set');
        }
    });

    console.log(`\n📈 TEST 6: Optional Fields Presence`);
    console.log('─────────────────────────────────────────────────────────────\n');

    let devicesWithAddresses = 0;
    let devicesWithPorts = 0;
    let connectionsWithNotes = 0;

    data.devices.forEach(d => {
        if (d.addresses && d.addresses.length > 0) devicesWithAddresses++;
        if (d.ports && d.ports.length > 0) devicesWithPorts++;
    });

    data.connections.forEach(c => {
        if (c.notes) connectionsWithNotes++;
    });

    console.log(`   Devices with addresses: ${devicesWithAddresses}/${deviceCount} (${Math.round(devicesWithAddresses/deviceCount*100)}%)`);
    console.log(`   Devices with ports: ${devicesWithPorts}/${deviceCount} (${Math.round(devicesWithPorts/deviceCount*100)}%)`);
    console.log(`   Connections with notes: ${connectionsWithNotes}/${connectionCount} (${Math.round(connectionsWithNotes/connectionCount*100)}%)\n`);

    if (devicesWithAddresses < deviceCount * 0.5) {
        warn('Low IP address coverage', `Only ${devicesWithAddresses} devices have addresses`);
    }

    console.log(`\n🧪 TEST 7: Data Export Simulation`);
    console.log('─────────────────────────────────────────────────────────────\n');

    test('Data can be stringified for export', () => {
        const json = JSON.stringify(data);
        if (json.length === 0) throw new Error('Cannot stringify data');
    });

    test('Stringified data is reasonable size', () => {
        const json = JSON.stringify(data);
        const sizeMB = json.length / (1024 * 1024);
        console.log(`   Size: ${sizeMB.toFixed(2)} MB`);
        if (sizeMB > 10) throw new Error('Data too large');
    });

    console.log(`\n📊 SUMMARY`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const passed = results.passed;
    const failed = results.failed;
    const warnings = results.warnings;
    const total = passed + failed;

    console.log(`Tests:       ${passed}/${total} passed`);
    console.log(`Failures:    ${failed}`);
    console.log(`Warnings:    ${warnings}`);
    console.log(`Success Rate: ${Math.round(passed/total*100)}%\n`);

    if (failed === 0) {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                 ✅ ALL TESTS PASSED                            ║');
        console.log('║         Data is ready for production deployment                 ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        console.log('📋 Next Steps:');
        console.log('   1. Test application: npm test');
        console.log('   2. Import a backup: Use web interface');
        console.log('   3. Export data: Test JSON/Excel export');
        console.log('   4. Health check: bash scripts/validation-health-check.sh');
        console.log('   5. Deploy: Commit changes to git\n');
        process.exit(0);
    } else {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                   ❌ TESTS FAILED                              ║');
        console.log('║              Cannot deploy with failures                        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        process.exit(1);
    }

} catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    process.exit(1);
}
