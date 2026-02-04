#!/usr/bin/env node

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔍 VERIFICAÇÃO FINAL DE DUPLICATAS\n');
console.log('='.repeat(70));

// Build connection map
const connMap = new Map();

data.connections.forEach(conn => {
    if (!conn.from || !conn.to) return;
    const key = `${conn.from}-${conn.to}`;
    if (!connMap.has(key)) {
        connMap.set(key, []);
    }
    connMap.get(key).push(conn);
});

// Check for duplicates
let duplicatesFound = 0;

connMap.forEach((conns, key) => {
    if (conns.length > 1) {
        duplicatesFound++;
        const [from, to] = key.split('-');
        console.log(`⚠️  Device ${from} → Device ${to}: ${conns.length} conexões`);
        conns.forEach((c, i) => {
            console.log(`   ${i+1}. ${c.fromPort || '(sem porta)'} → ${c.toPort || '(sem porta)'}`);
        });
        console.log('');
    }
});

console.log('='.repeat(70));

if (duplicatesFound === 0) {
    console.log('✅ NENHUMA DUPLICATA ENCONTRADA!');
    console.log('');
    console.log('📊 Estatísticas:');
    console.log(`   - Dispositivos: ${data.devices.length}`);
    console.log(`   - Conexões únicas: ${data.connections.filter(c => c.from && c.to).length}`);
    console.log(`   - Wall jacks/External: ${data.connections.filter(c => !c.from || !c.to).length}`);
    console.log(`   - Versão: ${data.version}`);
} else {
    console.log(`❌ ${duplicatesFound} GRUPOS DE DUPLICATAS AINDA PRESENTES`);
}

console.log('='.repeat(70));
