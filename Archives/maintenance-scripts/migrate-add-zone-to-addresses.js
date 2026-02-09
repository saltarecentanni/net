#!/usr/bin/env node
/**
 * Migration Script: Add zone field to addresses
 * 
 * This script adds the 'zone' field to all addresses that don't have it.
 * Devices created before the zone feature was added will be updated.
 * 
 * Usage: node migrate-add-zone-to-addresses.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'network_manager.json');
const BACKUP_FILE = DATA_FILE + '.backup_' + Date.now();

console.log('=== Migration: Add zone to addresses ===\n');

// Load data
let data;
try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(raw);
    console.log(`✓ Loaded ${DATA_FILE}`);
    console.log(`  Devices: ${data.devices.length}`);
    console.log(`  Connections: ${data.connections.length}\n`);
} catch (err) {
    console.error('✗ Failed to load data:', err.message);
    process.exit(1);
}

// Create backup
try {
    fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    console.log(`✓ Backup created: ${path.basename(BACKUP_FILE)}\n`);
} catch (err) {
    console.error('✗ Failed to create backup:', err.message);
    process.exit(1);
}

// Migration counters
let devicesUpdated = 0;
let addressesUpdated = 0;
let addressesMigrated = 0;

// Process devices
console.log('Processing devices...\n');

data.devices.forEach((device, idx) => {
    let deviceModified = false;
    
    // Ensure addresses array exists
    if (!device.addresses) {
        device.addresses = [];
    }
    
    // Process each address
    device.addresses.forEach((addr, addrIdx) => {
        // Add zone field if missing
        if (addr.zone === undefined) {
            addr.zone = '';
            addressesMigrated++;
            deviceModified = true;
            console.log(`  [${device.id}] ${device.name}: addresses[${addrIdx}].zone added`);
        }
        
        // Ensure all required fields exist
        if (addr.ip === undefined) addr.ip = '';
        if (addr.vlan === undefined) addr.vlan = null;
        if (addr.network === undefined && addr.ip) {
            addr.network = addr.ip;
        }
        
        addressesUpdated++;
    });
    
    // Migrate from old ip1-ip4 format if present
    const oldIPs = [];
    ['ip1', 'ip2', 'ip3', 'ip4'].forEach(key => {
        if (device[key] && device[key].trim()) {
            oldIPs.push(device[key].trim());
            delete device[key];
            deviceModified = true;
        }
    });
    
    if (oldIPs.length > 0) {
        oldIPs.forEach(ip => {
            // Check if IP already in addresses
            const exists = device.addresses.some(a => a.network === ip || a.ip === ip);
            if (!exists) {
                device.addresses.push({
                    network: ip,
                    ip: '',
                    vlan: null,
                    zone: ''
                });
                addressesMigrated++;
                console.log(`  [${device.id}] ${device.name}: migrated old IP ${ip} to addresses[]`);
            }
        });
    }
    
    if (deviceModified) {
        devicesUpdated++;
    }
});

console.log('\n=== Migration Summary ===');
console.log(`Devices updated: ${devicesUpdated}`);
console.log(`Addresses processed: ${addressesUpdated}`);
console.log(`Zone fields added: ${addressesMigrated}`);

// Save if changes were made
if (devicesUpdated > 0) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`\n✓ Changes saved to ${path.basename(DATA_FILE)}`);
    } catch (err) {
        console.error('\n✗ Failed to save:', err.message);
        process.exit(1);
    }
} else {
    console.log('\n✓ No changes needed - all addresses already have zone field');
}

console.log('\nMigration complete!');
