#!/usr/bin/env node
/**
 * FIX CONNECTIONS DATA
 * Converts incorrectly formatted externalDest connections to proper device-to-device connections
 * when a real device with matching name exists.
 */

const fs = require('fs');
const path = require('path');

// Allow custom file path as argument, otherwise use default
const DATA_FILE = process.argv[2] || path.join(__dirname, 'data', 'matrix-network-data.json');
const BACKUP_FILE = DATA_FILE + '.bak.auto_fix';

function findMatchingDevice(externalDest, devices) {
    if (!externalDest) return null;
    const extLower = externalDest.toLowerCase().trim();
    
    // 1. Exact match
    for (const dev of devices) {
        if (dev.name && dev.name.toLowerCase() === extLower) {
            return dev;
        }
    }
    
    // 2. Substring match
    for (const dev of devices) {
        if (dev.name) {
            const nameLower = dev.name.toLowerCase();
            if (nameLower.includes(extLower) || extLower.includes(nameLower)) {
                return dev;
            }
        }
    }
    
    // 3. Word-based match - any significant word matches (aligned with features.js)
    const extWords = extLower.split(/[\s\-_\/\(\)]+/).filter(w => w.length > 2);
    
    for (const dev of devices) {
        if (!dev.name) continue;
        const devWords = dev.name.toLowerCase().split(/[\s\-_\/\(\)]+/).filter(w => w.length > 2);
        
        for (const extWord of extWords) {
            if (devWords.includes(extWord)) {
                return dev;  // 1 word match is enough (same as production)
            }
        }
    }
    
    return null;
}

function fixConnectionsData() {
    console.log('='.repeat(70));
    console.log('FIX CONNECTIONS DATA - Auto-repair tool');
    console.log('='.repeat(70));
    
    // Read data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // Create backup
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Backup created: ${BACKUP_FILE}`);
    
    let fixedCount = 0;
    const fixes = [];
    
    // Process each connection
    for (let i = 0; i < data.connections.length; i++) {
        const conn = data.connections[i];
        
        // Only fix external connections (not wall jacks) that have no 'to' device
        if (!conn.to && conn.externalDest && !conn.isWallJack) {
            const matchingDevice = findMatchingDevice(conn.externalDest, data.devices);
            
            if (matchingDevice) {
                fixes.push({
                    index: i,
                    from: data.devices.find(d => d.id === conn.from)?.name || `ID ${conn.from}`,
                    fromPort: conn.fromPort,
                    oldDest: conn.externalDest,
                    newDest: matchingDevice.name,
                    deviceId: matchingDevice.id
                });
                
                // Fix the connection
                conn.to = matchingDevice.id;
                conn.toPort = conn.toPort || ''; // Keep existing or set empty
                delete conn.externalDest; // Remove externalDest field
                
                fixedCount++;
            }
        }
    }
    
    // Display fixes
    console.log(`\n📊 ANALYSIS RESULTS:`);
    console.log(`   Total connections: ${data.connections.length}`);
    console.log(`   Connections fixed: ${fixedCount}`);
    
    if (fixes.length > 0) {
        console.log(`\n🔧 FIXES APPLIED:`);
        fixes.forEach((fix, idx) => {
            console.log(`   ${idx + 1}. "${fix.from}" (${fix.fromPort}) → "${fix.oldDest}"`);
            console.log(`      ✅ Changed to device "${fix.newDest}" (ID: ${fix.deviceId})`);
        });
        
        // Save fixed data
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`\n✅ Fixed data saved to: ${DATA_FILE}`);
        console.log(`📌 Backup available at: ${BACKUP_FILE}`);
        console.log(`\n⚠️  IMPORTANT: Test the application and verify topology is correct!`);
        console.log(`   If issues occur, restore from backup.`);
    } else {
        console.log(`\n✅ No issues found - all connections are correctly formatted!`);
    }
    
    console.log('='.repeat(70));
}

// Run
try {
    fixConnectionsData();
} catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
}
