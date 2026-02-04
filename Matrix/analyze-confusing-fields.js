#!/usr/bin/env node
/**
 * Análise de campos confusos: Wall Jack ID e Room
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔍 ANÁLISE DE CAMPOS CONFUSOS\n');
console.log('='.repeat(80));

// Verificar todos os campos em connections
const allConnFields = new Set();
data.connections.forEach(c => {
    Object.keys(c).forEach(k => allConnFields.add(k));
});

console.log('📋 TODOS OS CAMPOS EM CONNECTIONS:');
console.log(Array.from(allConnFields).sort().join(', '));

// Verificar walljacks especificamente
const walljacks = data.connections.filter(c => c.isWallJack === true);
console.log(`\n\n🔳 WALLJACKS (${walljacks.length}):\n`);

walljacks.slice(0, 3).forEach((wj, i) => {
    const fromDev = data.devices.find(d => d.id === wj.from);
    console.log(`  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'}`);
    console.log(`     externalDest: ${wj.externalDest}`);
    console.log(`     Campos: ${Object.keys(wj).join(', ')}`);
    console.log('');
});

// Verificar campo room
const connsWithRoom = data.connections.filter(c => c.room !== undefined);
console.log(`🏠 CONEXÕES COM CAMPO "room": ${connsWithRoom.length}`);
if (connsWithRoom.length > 0) {
    connsWithRoom.slice(0, 3).forEach(c => {
        console.log(`  - room: "${c.room}", externalDest: ${c.externalDest || 'N/A'}`);
    });
}

// Verificar External/ISP
const externals = data.connections.filter(c => 
    !c.to && c.externalDest && c.isWallJack !== true
);

console.log(`\n\n🌐 EXTERNAL/ISP (${externals.length}):\n`);
externals.forEach((ext, i) => {
    const fromDev = data.devices.find(d => d.id === ext.from);
    console.log(`  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'}`);
    console.log(`     externalDest: ${ext.externalDest}`);
    console.log(`     Campos: ${Object.keys(ext).join(', ')}`);
    console.log('');
});

console.log('='.repeat(80));
console.log('📝 ANÁLISE:\n');
console.log('1. "Wall Jack ID" (campo externalDest):');
console.log('   - É o DESTINO da conexão (Z1, Z2, etc)');
console.log('   - Label confuso: deveria ser "Destination" ou "Wall Jack"');
console.log('   - NÃO é um ID técnico, é o nome do destino\n');

console.log('2. Campo "room" (🏠 Room):');
console.log(`   - Aparece em ${connsWithRoom.length} conexões`);
console.log('   - Sistema antigo de rooms (appState.rooms)');
console.log('   - Substituído por "location" em devices');
console.log('   - OBSOLETO e confuso\n');

console.log('3. External/ISP vs WallJack:');
console.log('   - Ambos usam externalDest (sem campo "to")');
console.log('   - Diferença: isWallJack = true/false');
console.log('   - Ambos criam "dispositivos virtuais" na topologia');
console.log('   - WallJack tem ícone 🔳, External não tem ícone definido\n');

console.log('='.repeat(80));
console.log('💡 SUGESTÕES:\n');

console.log('SUGESTÃO 1: Renomear label "Wall Jack ID" → "Destination"');
console.log('  - Mais claro e genérico');
console.log('  - Serve para WallJack (Z1, Z2) E External/ISP (Internet)\n');

console.log('SUGESTÃO 2: Remover campo "room" obsoleto');
console.log('  - Não está sendo usado');
console.log('  - Confunde usuário');
console.log('  - Limpar dos dados e formulário\n');

console.log('SUGESTÃO 3: Unificar comportamento WallJack e External/ISP');
console.log('  - Ambos são "destinos externos"');
console.log('  - Diferença apenas no tipo (isWallJack true/false)');
console.log('  - Adicionar ícone para External/ISP (como WallJack tem)\n');

console.log('SUGESTÃO 4: Campo "dupla ligação"?');
console.log('  - Se refere a múltiplas conexões para mesmo destino');
console.log('  - Ex: Device A → Z1 (eth01) + Device A → Z1 (eth02)');
console.log('  - Já funciona! Não precisa campo especial\n');
