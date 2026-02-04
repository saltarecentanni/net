#!/usr/bin/env node

/**
 * Remove Duplicate Connections Script
 * Fixes duplicate yellow boxes in topology by removing duplicate bidirectional connections
 * v3.5.050
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'matrix-network-data.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔍 SCRIPT DE REMOÇÃO DE CONEXÕES DUPLICADAS');
console.log('=' .repeat(80));

// Create backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(BACKUP_DIR, `network_manager_before_duplicate_removal_${timestamp}.json`);
fs.copyFileSync(DATA_FILE, backupFile);
console.log(`✅ Backup criado: ${backupFile}\n`);

// Load data
const rawData = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(rawData);

console.log(`📊 Estatísticas iniciais:`);
console.log(`   Devices: ${data.devices.length}`);
console.log(`   Conexões: ${data.connections.length}\n`);

// Track duplicates
const duplicatesToRemove = [];
const connectionsMap = new Map();

// Build connection map
data.connections.forEach((conn, index) => {
    if (!conn.from || !conn.to) {
        console.log(`⚠️  Conexão ${index} tem from/to faltando`);
        return;
    }
    
    const key = `${conn.from}-${conn.to}`;
    
    if (!connectionsMap.has(key)) {
        connectionsMap.set(key, []);
    }
    
    connectionsMap.get(key).push({ ...conn, originalIndex: index });
});

// Find duplicates
console.log('🔎 ANALISANDO CONEXÕES...\n');

connectionsMap.forEach((connections, key) => {
    if (connections.length > 1) {
        const [fromId, toId] = key.split('-');
        
        console.log(`⚠️  DUPLICATA ENCONTRADA: Device ${fromId} → Device ${toId}`);
        console.log(`   Total de conexões: ${connections.length}`);
        
        // Sort connections - prefer those with valid toPort
        connections.sort((a, b) => {
            // Prioritize connections with non-empty toPort
            const aHasPort = a.toPort && a.toPort.trim() !== '';
            const bHasPort = b.toPort && b.toPort.trim() !== '';
            
            if (aHasPort && !bHasPort) return -1;
            if (!aHasPort && bHasPort) return 1;
            
            // If both have ports or both don't, prefer the one with fromPort
            const aHasFromPort = a.fromPort && a.fromPort.trim() !== '';
            const bHasFromPort = b.fromPort && b.fromPort.trim() !== '';
            
            if (aHasFromPort && !bHasFromPort) return -1;
            if (!aHasFromPort && bHasFromPort) return 1;
            
            return 0;
        });
        
        // Keep the first (best) one, mark others for removal
        const keepConnection = connections[0];
        console.log(`   ✅ MANTENDO: ${keepConnection.fromPort || '(sem porta)'} → ${keepConnection.toPort || '(sem porta)'}`);
        
        for (let i = 1; i < connections.length; i++) {
            const dupConn = connections[i];
            console.log(`   ❌ REMOVENDO: ${dupConn.fromPort || '(sem porta)'} → ${dupConn.toPort || '(sem porta)'}`);
            duplicatesToRemove.push(dupConn.originalIndex);
        }
        
        console.log('');
    }
});

// Remove duplicates (in reverse order to maintain indices)
duplicatesToRemove.sort((a, b) => b - a);

console.log('=' .repeat(80));
console.log(`🗑️  REMOVENDO ${duplicatesToRemove.length} CONEXÕES DUPLICADAS...\n`);

duplicatesToRemove.forEach(index => {
    const removed = data.connections.splice(index, 1)[0];
    console.log(`   Removida: Device ${removed.from} (${removed.fromPort || 'sem porta'}) → Device ${removed.to} (${removed.toPort || 'sem porta'})`);
});

console.log('');
console.log('=' .repeat(80));
console.log(`📊 Estatísticas finais:`);
console.log(`   Devices: ${data.devices.length}`);
console.log(`   Conexões: ${data.connections.length}`);
console.log(`   Conexões removidas: ${duplicatesToRemove.length}\n`);

// Update version to 3.5.050
if (data.version !== '3.5.050') {
    console.log(`📝 Atualizando versão: ${data.version} → 3.5.050\n`);
    data.version = '3.5.050';
}

// Save cleaned data
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

console.log('=' .repeat(80));
console.log('✅ ARQUIVO LIMPO E SALVO!');
console.log('');
console.log('💡 PRÓXIMOS PASSOS:');
console.log('   1. Recarregue a aplicação no navegador');
console.log('   2. Verifique se as caixas amarelas duplicadas desapareceram');
console.log('   3. Se houver problemas, restaure o backup em:');
console.log(`      ${backupFile}`);
console.log('=' .repeat(80));
