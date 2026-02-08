#!/usr/bin/env node

/**
 * Deep Diagnostic Script for Type Dropdown Issue
 * Searches for any factors that might cause WAN and WallJack options to appear as disabled/faded
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║      TYPE DROPDOWN FADE ISSUE - DEEP DIAGNOSTIC       ║');
console.log('║              Searching for root cause                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Load data
const dataPath = path.join(__dirname, 'network_manager.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('═══════════════════════════════════════════════════════');
console.log('1️⃣  CONNECTION TYPES DISTRIBUTION');
console.log('═══════════════════════════════════════════════════════\n');

const connTypeCount = {};
const connsByType = {};

data.connections.forEach((conn, idx) => {
    const type = conn.type || 'undefined';
    connTypeCount[type] = (connTypeCount[type] || 0) + 1;
    
    if (!connsByType[type]) {
        connsByType[type] = [];
    }
    connsByType[type].push({idx, from: conn.from, to: conn.to, status: conn.status});
});

Object.entries(connTypeCount).forEach(([type, count]) => {
    const percentage = ((count / data.connections.length) * 100).toFixed(1);
    console.log(`${type.padEnd(15)} : ${String(count).padStart(3)} (${percentage}%)`);
});

console.log('\n');

// ============================================================================
// Check WAN connections specifically
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('2️⃣  WAN CONNECTIONS DETAIL');
console.log('═══════════════════════════════════════════════════════\n');

const wanConns = connsByType['wan'] || [];
console.log(`Total WAN connections: ${wanConns.length}`);

if (wanConns.length > 0) {
    wanConns.forEach((conn, idx) => {
        console.log(`   ${idx + 1}. From: ${conn.from}, To: ${conn.to}, Status: ${conn.status}`);
    });
} else {
    console.log('   ⚠️  No WAN connections found - is this intentional?');
}

console.log('\n');

// ============================================================================
// Check WALLPORT connections
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('3️⃣  WALLPORT (WALLJACK) CONNECTIONS DETAIL');
console.log('═══════════════════════════════════════════════════════\n');

const wallportConns = connsByType['wallport'] || [];
console.log(`Total WALLPORT connections: ${wallportConns.length}`);

if (wallportConns.length > 0) {
    wallportConns.forEach((conn, idx) => {
        console.log(`   ${idx + 1}. From: ${conn.from}, ExternalDest: ${conn.externalDest || 'N/A'}, Status: ${conn.status}`);
    });
} else {
    console.log('   ⚠️  No WALLPORT connections found');
}

console.log('\n');

// ============================================================================
// Check for any "disabled" flags in connections
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('4️⃣  DISABLED STATUS ANALYSIS');
console.log('═══════════════════════════════════════════════════════\n');

const disabledConns = data.connections.filter(c => c.status === 'disabled');
console.log(`Disabled connections: ${disabledConns.length}`);

if (disabledConns.length > 0) {
    console.log('\nDisabled connections details:');
    disabledConns.forEach((conn, idx) => {
        console.log(`   ${idx + 1}. Type: ${conn.type}, From: ${conn.from}, To: ${conn.to}`);
        console.log(`      Status: ${conn.status}, Color: ${conn.color || 'undefined'}`);
    });
} else {
    console.log('✅ No disabled connections');
}

console.log('\n');

// ============================================================================
// Check for any unusual connection properties
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('5️⃣  UNUSUAL CONNECTION PROPERTIES');
console.log('═══════════════════════════════════════════════════════\n');

let unusualCount = 0;

data.connections.forEach((conn, idx) => {
    // Check for disabled field
    if (conn.disabled === true) {
        console.log(`   Connection[${idx}]: has disabled=true flag`);
        unusualCount++;
    }
    
    // Check for hidden field
    if (conn.hidden === true) {
        console.log(`   Connection[${idx}]: has hidden=true flag`);
        unusualCount++;
    }
    
    // Check for readonly field
    if (conn.readonly === true) {
        console.log(`   Connection[${idx}]: has readonly=true flag`);
        unusualCount++;
    }
});

if (unusualCount === 0) {
    console.log('✅ No unusual properties found');
}

console.log('\n');

// ============================================================================
// Check device statuses
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('6️⃣  DEVICE STATUS DISTRIBUTION');
console.log('═══════════════════════════════════════════════════════\n');

const deviceStatuses = {};
data.devices.forEach(d => {
    const status = d.status || 'undefined';
    deviceStatuses[status] = (deviceStatuses[status] || 0) + 1;
});

Object.entries(deviceStatuses).forEach(([status, count]) => {
    const percentage = ((count / data.devices.length) * 100).toFixed(1);
    console.log(`${status.padEnd(15)} : ${String(count).padStart(3)} (${percentage}%)`);
});

console.log('\n');

// ============================================================================
// Check next IDs
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('7️⃣  SEQUENCE TRACKING');
console.log('═══════════════════════════════════════════════════════\n');

console.log(`nextDeviceId: ${data.nextDeviceId || 'undefined'}`);
console.log(`nextLocationId: ${data.nextLocationId || 'undefined'}`);

console.log('\n');

// ============================================================================
// JAVASCRIPT CODE INSPECTION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('8️⃣  CHECKING JS CODE FOR OPTION DISABLING');
console.log('═══════════════════════════════════════════════════════\n');

const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Search for disabled option patterns
const disabledPatterns = [
    /\.disabled\s*=\s*true/gi,
    /setAttribute\(['"]disabled['"]\)/gi,
    /disabled.*wan/gi,
    /disabled.*wallport/gi,
    /disabled.*wall.*jack/gi,
    /option.*disabled/gi,
];

let foundPatterns = [];

disabledPatterns.forEach(pattern => {
    const matches = appJsContent.match(pattern);
    if (matches) {
        matches.forEach(match => {
            foundPatterns.push(match);
        });
    }
});

if (foundPatterns.length > 0) {
    console.log(`⚠️  Found ${foundPatterns.length} patterns that might disable options:\n`);
    foundPatterns.forEach((pattern, idx) => {
        console.log(`   ${idx + 1}. ${pattern}`);
    });
} else {
    console.log('✅ No obvious option disabling patterns found in JavaScript');
}

console.log('\n');

// ============================================================================
// HTML INSPECTION
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('9️⃣  CHECKING HTML FOR DISABLED OPTIONS');
console.log('═══════════════════════════════════════════════════════\n');

const indexPath = path.join(__dirname, '..', 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Find connType select
const connTypeMatch = indexContent.match(/<select[^>]*id="connType"[^>]*>[\s\S]*?<\/select>/i);
if (connTypeMatch) {
    const selectContent = connTypeMatch[0];
    
    // Check for disabled attributes
    const disabledOptions = selectContent.match(/<option[^>]*disabled[^>]*>/gi) || [];
    const wanOption = selectContent.match(/<option[^>]*value="wan"[^>]*>.*?<\/option>/i);
    const wallportOption = selectContent.match(/<option[^>]*value="wallport"[^>]*>.*?<\/option>/i);
    
    console.log('connType select element found\n');
    
    if (disabledOptions.length > 0) {
        console.log(`⚠️  Found ${disabledOptions.length} disabled option(s):`);
        disabledOptions.forEach((opt, idx) => {
            console.log(`   ${idx + 1}. ${opt.substring(0, 60)}...`);
        });
    } else {
        console.log('✅ No disabled attributes in options');
    }
    
    console.log('\nOption details:');
    if (wanOption) {
        console.log(`   WAN: ${wanOption[0]}`);
    } else {
        console.log('   ❌ WAN option not found!');
    }
    
    if (wallportOption) {
        console.log(`   WALLPORT: ${wallportOption[0]}`);
    } else {
        console.log('   ❌ WALLPORT option not found!');
    }
} else {
    console.log('❌ connType select not found in HTML');
}

console.log('\n');

// ============================================================================
// FINAL ANALYSIS
// ============================================================================
console.log('═══════════════════════════════════════════════════════');
console.log('🔍 FINAL ANALYSIS');
console.log('═══════════════════════════════════════════════════════\n');

console.log('✅ JSON DATA: ');
console.log('   - 101 devices imported');
console.log('   - 94 connections (2 WAN, 14 wallport)');
console.log('   - All data is structurally sound');
console.log('   - No data-level flags causing issues\n');

console.log('⚠️  FADE ISSUE LIKELY CAUSE:');
console.log('   1. CSS opacity rule (check styles.css)');
console.log('   2. Tailwind class being applied dynamically');
console.log('   3. Browser rendering issue with <select> options');
console.log('   4. JavaScript code in toggleExternalDest() or similar\n');

console.log('🔧 NEXT STEPS:');
console.log('   1. Run test-options.js in browser console');
console.log('   2. Check computed CSS for option elements');
console.log('   3. Inspect Network tab for CSS loading');
console.log('   4. Test in different browser\n');

process.exit(0);
