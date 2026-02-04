#!/usr/bin/env node

/**
 * Debug External Map Creation
 * Simulates the features.js logic to see how many virtual externals are created
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/matrix-network-data.json', 'utf8'));

console.log('🔍 SIMULAÇÃO DE CRIAÇÃO DE VIRTUAL EXTERNALS\n');
console.log('='.repeat(70));

const externalMap = {};
const virtualExternals = [];

// Simulate the loop
data.connections.forEach((c, idx) => {
    // Skip conditions from features.js line 1976
    if (c.to || !c.externalDest || c.isWallJack || !c.from) {
        return;
    }
    
    const extKey = c.externalDest;
    
    console.log(`\nConexão ${idx}: Device ${c.from} -> "${extKey}"`);
    
    if (!externalMap[extKey]) {
        console.log(`  ✅ CRIANDO virtual external para "${extKey}"`);
        const virtualId = 'ext_' + extKey.replace(/[^a-zA-Z0-9]/g, '_');
        
        const virtualDevice = {
            id: virtualId,
            name: extKey,
            type: 'external',
            _isVirtualExternal: true,
            _originalConnection: c
        };
        
        virtualExternals.push(virtualDevice);
        externalMap[extKey] = virtualDevice;
    } else {
        console.log(`  ⏭️  PULANDO - Virtual external para "${extKey}" já existe`);
    }
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 RESULTADO:`);
console.log(`   Total de conexões externas: ${data.connections.filter(c => !c.to && c.externalDest && !c.isWallJack).length}`);
console.log(`   Virtual externals criados: ${virtualExternals.length}`);
console.log(`   externalMap entries: ${Object.keys(externalMap).length}`);

console.log('\n📋 Lista de Virtual Externals:');
virtualExternals.forEach((ve, i) => {
    const origConn = ve._originalConnection;
    const device = data.devices.find(d => d.id === origConn.from);
    console.log(`   ${i + 1}. ${ve.name} (ID: ${ve.id}) - from Device ${origConn.from} (${device?.name})`);
});

console.log('\n' + '='.repeat(70));

if (virtualExternals.length === new Set(virtualExternals.map(v => v.name)).size) {
    console.log('✅ CORRETO: Cada externalDest tem apenas 1 virtual external');
} else {
    console.log('❌ BUG: Existem virtual externals duplicados!');
}
