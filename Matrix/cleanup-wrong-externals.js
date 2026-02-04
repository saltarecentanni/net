#!/usr/bin/env node
/**
 * LIMPEZA DE CONEXÕES EXTERNAL INCORRETAS
 * 
 * Remove:
 * 1. Firewall → "Firewall" (device off/desligado, erro de cadastro)
 * 2. Todas conexões para "BIG ONE" (é zona, não external)
 * 
 * Mantém:
 * - External/WAN (legítimo)
 * - ISP (legítimo)
 */

const fs = require('fs');
const path = require('path');

// Backup primeiro
const dataPath = 'data/network_manager.json';
const backupPath = `backup/network_manager.json.bak.before_external_cleanup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;

console.log('🧹 LIMPEZA DE CONEXÕES EXTERNAL INCORRETAS\n');
console.log('='.repeat(80));

// Ler dados
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`\n📊 ESTADO ATUAL:`);
console.log(`   Devices: ${data.devices.length}`);
console.log(`   Connections: ${data.connections.length}`);

// Identificar conexões a remover
const toRemove = [];

data.connections.forEach((c, idx) => {
    // 1. Firewall → "Firewall" (conexão circular, device off)
    if (c.from === 9 && c.externalDest === 'Firewall') {
        toRemove.push({
            index: idx,
            reason: 'Firewall device off/desligado',
            connection: c
        });
    }
    
    // 2. Qualquer conexão para BIG ONE (é zona, não external)
    if (c.externalDest && c.externalDest.includes('BIG ONE')) {
        toRemove.push({
            index: idx,
            reason: 'BIG ONE é zona, não external',
            connection: c
        });
    }
});

console.log(`\n❌ CONEXÕES A REMOVER: ${toRemove.length}\n`);

toRemove.forEach((item, i) => {
    const fromDev = data.devices.find(d => d.id === item.connection.from);
    console.log(`  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'} (ID ${item.connection.from})`);
    console.log(`     → TO: "${item.connection.externalDest}"`);
    console.log(`     Port: ${item.connection.fromPort || '(não definido)'}`);
    console.log(`     Motivo: ${item.reason}\n`);
});

// Criar backup
console.log('='.repeat(80));
console.log('💾 CRIANDO BACKUP...');
fs.mkdirSync('backup', { recursive: true });
fs.copyFileSync(dataPath, backupPath);
console.log(`   ✅ Backup: ${backupPath}`);

// Remover conexões (do final para início para não afetar índices)
const indicesToRemove = toRemove.map(item => item.index).sort((a, b) => b - a);
indicesToRemove.forEach(idx => {
    data.connections.splice(idx, 1);
});

console.log('\n='.repeat(80));
console.log('💾 SALVANDO DADOS LIMPOS...');
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`\n📊 ESTADO FINAL:`);
console.log(`   Devices: ${data.devices.length} (sem alteração)`);
console.log(`   Connections: ${data.connections.length} (${toRemove.length} removidas)`);

// Verificar External restantes
const remainingExternals = data.connections.filter(c => 
    !c.to && c.externalDest && c.isWallJack !== true
);

console.log(`\n✅ EXTERNAL LEGÍTIMOS RESTANTES: ${remainingExternals.length}\n`);
remainingExternals.forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`  ${i+1}. ${fromDev ? fromDev.name : 'N/A'} → "${c.externalDest}"`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ LIMPEZA COMPLETA!');
console.log('='.repeat(80));
console.log('\nPróximo passo: Adicionar ícone "external" em js/features.js');
