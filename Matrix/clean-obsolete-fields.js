#!/usr/bin/env node
/**
 * Clean Obsolete Fields from network_manager.json
 * 
 * This script removes obsolete fields that are no longer used in the UI:
 * - zone (old field, replaced by ips[].zone)
 * - zoneIP (old field, replaced by ips[].ip with zone)
 * 
 * These fields cause devices to not appear in selection lists because
 * the UI expects IPs in the ips[] array, not in separate zone/zoneIP fields.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.argv[2] || path.join(__dirname, 'data', 'network_manager.json');

console.log('===========================================');
console.log('Clean Obsolete Fields - Network Manager');
console.log('===========================================\n');

// Read data
console.log('📖 Reading:', DATA_FILE);
const rawData = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(rawData);

// Backup original
const backupFile = DATA_FILE + '.bak.clean_fields';
console.log('💾 Creating backup:', backupFile);
fs.writeFileSync(backupFile, rawData);

// Find devices with obsolete fields
let devicesWithZone = 0;
let devicesWithZoneIP = 0;
let totalCleaned = 0;

console.log('\n🔍 Scanning devices...\n');

data.devices.forEach(device => {
    let cleaned = false;
    
    if (device.zone !== undefined && device.zone !== null && device.zone !== '') {
        console.log(`  ⚠️  Device ${device.id} (${device.name})`);
        console.log(`      Location: ${device.location || 'N/A'}`);
        console.log(`      Obsolete field: zone = "${device.zone}"`);
        delete device.zone;
        devicesWithZone++;
        cleaned = true;
    }
    
    if (device.zoneIP !== undefined && device.zoneIP !== null && device.zoneIP !== '') {
        if (!cleaned) {
            console.log(`  ⚠️  Device ${device.id} (${device.name})`);
            console.log(`      Location: ${device.location || 'N/A'}`);
        }
        console.log(`      Obsolete field: zoneIP = "${device.zoneIP}"`);
        delete device.zoneIP;
        devicesWithZoneIP++;
        cleaned = true;
    }
    
    if (cleaned) {
        console.log(`      ✅ Cleaned\n`);
        totalCleaned++;
    }
});

// Save cleaned data
if (totalCleaned > 0) {
    console.log('💾 Saving cleaned data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    console.log('\n===========================================');
    console.log('✅ CLEANUP COMPLETE');
    console.log('===========================================');
    console.log(`Devices with 'zone' field removed:   ${devicesWithZone}`);
    console.log(`Devices with 'zoneIP' field removed: ${devicesWithZoneIP}`);
    console.log(`Total devices cleaned:                ${totalCleaned}`);
    console.log(`\n📊 Total devices in database:         ${data.devices.length}`);
    console.log(`📊 Total connections:                 ${data.connections.length}`);
    console.log(`\n💾 Backup saved to: ${backupFile}`);
    console.log('\n⚠️  IMPORTANT: These devices should now appear in selection lists.');
    console.log('   If they had DMZ zone, you need to manually re-add the zone');
    console.log('   information in the device edit form (IP tab → Zone field).\n');
} else {
    console.log('\n===========================================');
    console.log('✅ NO OBSOLETE FIELDS FOUND');
    console.log('===========================================');
    console.log('All devices are clean. No action needed.\n');
    // Remove backup if nothing was cleaned
    fs.unlinkSync(backupFile);
}
