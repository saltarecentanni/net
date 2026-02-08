#!/usr/bin/env node
/**
 * TIESSE Matrix Network - JSON Refactoring Script v3.5.045
 * 
 * Safe migration to remove deprecated/duplicate fields:
 * - rack → rackId (keep only rackId)
 * - rear → isRear (keep only isRear)
 * - color → cableColor (keep only cableColor)
 * - zone, zoneIP → remove (deprecated location system)
 * - _isExternal, roomId → remove (unused)
 * 
 * Usage: node scripts/refactor-json.js
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, '../data/network_manager.json.backup-pre-refactor');
const DATA_FILE = path.join(__dirname, '../data/network_manager.json');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           JSON Refactoring Script - v3.5.045                   ║');
console.log('║         Removing Duplicate & Deprecated Fields                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

try {
    // 1. Read current data
    console.log('📖 Reading current JSON...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // 2. Create backup
    console.log('💾 Creating backup...');
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    console.log(`   ✅ Backup saved: ${BACKUP_FILE}`);
    
    // 3. Track changes
    const stats = {
        devicesProcessed: 0,
        devicesModified: 0,
        rackConsolidated: 0,
        rearConsolidated: 0,
        zoneRemoved: 0,
        zoneIPRemoved: 0,
        isExternalRemoved: 0,
        connectionProcessed: 0,
        connectionModified: 0,
        colorConsolidated: 0,
        roomIdRemoved: 0
    };

    // 4. Refactor devices
    console.log('\n🔧 Refactoring devices...');
    data.devices.forEach((device, idx) => {
        stats.devicesProcessed++;
        const changes = [];

        // rack → rackId consolidation
        if (device.rack !== undefined) {
            if (device.rackId === undefined) {
                device.rackId = device.rack;
                changes.push('rack→rackId');
                stats.rackConsolidated++;
            } else if (device.rack !== device.rackId) {
                console.warn(`   ⚠️  Device[${idx}] "${device.name}": rack(${device.rack}) ≠ rackId(${device.rackId}), keeping rackId`);
            }
            delete device.rack;
        }

        // rear → isRear consolidation
        if (device.rear !== undefined) {
            if (device.isRear === undefined) {
                device.isRear = device.rear;
                changes.push('rear→isRear');
                stats.rearConsolidated++;
            } else if (device.rear !== device.isRear) {
                console.warn(`   ⚠️  Device[${idx}] "${device.name}": rear(${device.rear}) ≠ isRear(${device.isRear}), keeping isRear`);
            }
            delete device.rear;
        }

        // zone field removal
        if (device.zone !== undefined) {
            console.log(`   ℹ️  Device[${idx}] "${device.name}": removing deprecated zone="${device.zone}"`);
            delete device.zone;
            stats.zoneRemoved++;
            changes.push('zone removed');
        }

        // zoneIP field removal
        if (device.zoneIP !== undefined) {
            console.log(`   ℹ️  Device[${idx}] "${device.name}": removing deprecated zoneIP="${device.zoneIP}"`);
            delete device.zoneIP;
            stats.zoneIPRemoved++;
            changes.push('zoneIP removed');
        }

        // _isExternal field removal
        if (device._isExternal !== undefined) {
            delete device._isExternal;
            stats.isExternalRemoved++;
            changes.push('_isExternal removed');
        }

        if (changes.length > 0) {
            stats.devicesModified++;
        }
    });

    console.log(`   ✅ Processed ${stats.devicesProcessed} devices`);
    console.log(`   📊 Modified ${stats.devicesModified} devices`);
    console.log(`   ├─ Consolidated rack→rackId: ${stats.rackConsolidated}`);
    console.log(`   ├─ Consolidated rear→isRear: ${stats.rearConsolidated}`);
    console.log(`   ├─ Removed zone field: ${stats.zoneRemoved}`);
    console.log(`   └─ Removed zoneIP field: ${stats.zoneIPRemoved}`);

    // 5. Refactor connections
    console.log('\n🔧 Refactoring connections...');
    data.connections.forEach((conn, idx) => {
        stats.connectionProcessed++;
        const changes = [];

        // color → cableColor consolidation
        if (conn.color !== undefined) {
            if (conn.cableColor === undefined) {
                conn.cableColor = conn.color;
                changes.push('color→cableColor');
                stats.colorConsolidated++;
            } else if (conn.color !== conn.cableColor) {
                console.warn(`   ⚠️  Connection[${idx}]: color("${conn.color}") ≠ cableColor("${conn.cableColor}"), keeping cableColor`);
            }
            delete conn.color;
        }

        // roomId field removal
        if (conn.roomId !== undefined) {
            delete conn.roomId;
            stats.roomIdRemoved++;
            changes.push('roomId removed');
        }

        if (changes.length > 0) {
            stats.connectionModified++;
        }
    });

    console.log(`   ✅ Processed ${stats.connectionProcessed} connections`);
    console.log(`   📊 Modified ${stats.connectionModified} connections`);
    console.log(`   ├─ Consolidated color→cableColor: ${stats.colorConsolidated}`);
    console.log(`   └─ Removed roomId field: ${stats.roomIdRemoved}`);

    // 6. Verify integrity
    console.log('\n🔍 Verifying integrity...');
    let integrityOk = true;

    // Check all devices have required fields
    for (let i = 0; i < data.devices.length; i++) {
        const d = data.devices[i];
        const required = ['id', 'name', 'type', 'status', 'location'];
        for (const field of required) {
            if (d[field] === undefined) {
                console.error(`   ❌ Device[${i}]: missing required field "${field}"`);
                integrityOk = false;
            }
        }
    }

    // Check all connections reference valid devices
    const deviceIds = new Set(data.devices.map(d => d.id));
    for (let i = 0; i < data.connections.length; i++) {
        const c = data.connections[i];
        if (!deviceIds.has(c.from)) {
            console.error(`   ❌ Connection[${i}]: from device ${c.from} does not exist`);
            integrityOk = false;
        }
        if (c.to !== undefined && c.to !== null && !deviceIds.has(c.to)) {
            console.error(`   ❌ Connection[${i}]: to device ${c.to} does not exist`);
            integrityOk = false;
        }
    }

    if (integrityOk) {
        console.log('   ✅ Integrity check passed');
    } else {
        throw new Error('Integrity check failed!');
    }

    // 7. Verify no deprecated fields remain
    console.log('\n🔎 Checking for remaining deprecated fields...');
    let hasDeprecated = false;
    const deprecatedFields = ['rack', 'rear', 'zone', 'zoneIP', '_isExternal'];
    const connDeprecated = ['color', 'roomId'];

    for (let i = 0; i < data.devices.length; i++) {
        const d = data.devices[i];
        for (const field of deprecatedFields) {
            if (d[field] !== undefined) {
                console.error(`   ❌ Device[${i}]: still has deprecated field "${field}"`);
                hasDeprecated = true;
            }
        }
    }

    for (let i = 0; i < data.connections.length; i++) {
        const c = data.connections[i];
        for (const field of connDeprecated) {
            if (c[field] !== undefined) {
                console.error(`   ❌ Connection[${i}]: still has deprecated field "${field}"`);
                hasDeprecated = true;
            }
        }
    }

    if (!hasDeprecated) {
        console.log('   ✅ No deprecated fields detected');
    }

    // 8. Write refactored data
    console.log('\n💾 Writing refactored data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`   ✅ Saved: ${DATA_FILE}`);

    // 9. Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     REFACTORING SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`
✅ DEVICES (${stats.devicesProcessed} total, ${stats.devicesModified} modified)
   ├─ Consolidated rack→rackId:     ${stats.rackConsolidated}
   ├─ Consolidated rear→isRear:     ${stats.rearConsolidated}
   ├─ Removed zone field:           ${stats.zoneRemoved}
   ├─ Removed zoneIP field:         ${stats.zoneIPRemoved}
   └─ Removed _isExternal field:    ${stats.isExternalRemoved}

✅ CONNECTIONS (${stats.connectionProcessed} total, ${stats.connectionModified} modified)
   ├─ Consolidated color→cable:     ${stats.colorConsolidated}
   └─ Removed roomId field:         ${stats.roomIdRemoved}

🛡️  INTEGRITY CHECKS
   ├─ Device references:            ✅ Valid
   ├─ Connection references:        ✅ Valid
   ├─ Deprecated fields:            ✅ None remaining
   └─ Backup created:               ✅ ${path.basename(BACKUP_FILE)}

📊 RESULT: ✅ REFACTORING SUCCESSFUL
    
🔄 Next Steps:
   1. Test the application with: npm test
   2. Verify imports still work
   3. Check exports are valid
   4. Run: bash scripts/validation-health-check.sh
    `);

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nRolling back...');
    if (fs.existsSync(BACKUP_FILE)) {
        const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        fs.writeFileSync(DATA_FILE, JSON.stringify(backup, null, 2));
        console.log('✅ Data restored from backup');
    }
    process.exit(1);
}
