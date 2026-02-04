#!/usr/bin/env node
/**
 * FIX EXTERNAL CONNECTIONS
 * 
 * Problema: Conexões "External" (ISP, Firewall, BIG ONE, External/WAN) não têm
 * comportamento consistente com WallJacks:
 * - Não têm ícone definido em deviceIcons
 * - Renderizados como caixas amarelas simples (🌐)
 * - Podem conflitar com devices reais
 * - isWallJack=false mas sem tipo claro
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔧 CORREÇÃO DE CONEXÕES EXTERNAL\n');
console.log('='.repeat(80));

// Identificar conexões External
const externals = data.connections.filter(c => 
    !c.to && c.externalDest && c.isWallJack !== true
);

console.log(`\n📊 Encontradas ${externals.length} conexões External:\n`);

externals.forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`  ${i+1}. ${fromDev ? fromDev.name : 'N/A'} → "${c.externalDest}"`);
    console.log(`     Port: ${c.fromPort || '(não definido)'}, Type: ${c.type}`);
});

// ============================================================================
// ANÁLISE DE CONFLITOS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('⚠️  ANÁLISE DE CONFLITOS COM DEVICES REAIS');
console.log('='.repeat(80));

const conflicts = [];

externals.forEach(c => {
    const extName = c.externalDest.toLowerCase();
    
    // Buscar dispositivos reais com nome similar (PRECISO)
    const exactMatch = data.devices.find(d => 
        d.name.toLowerCase() === extName
    );
    
    const partialMatch = data.devices.filter(d => {
        const dName = d.name.toLowerCase();
        // Evitar falsos positivos como "ONE" em "BIG ONE" vs "D-Link"
        const extWords = extName.split(/[\s\-_\/]+/).filter(w => w.length > 3);
        const dWords = dName.split(/[\s\-_\/]+/).filter(w => w.length > 3);
        
        return extWords.some(ew => dWords.some(dw => ew === dw));
    });
    
    if (exactMatch) {
        conflicts.push({
            connection: c,
            type: 'exact',
            device: exactMatch,
            action: 'CONVERTER para conexão device-to-device'
        });
    } else if (partialMatch.length > 0 && partialMatch.length < 5) { // Evitar muitos matches
        conflicts.push({
            connection: c,
            type: 'partial',
            devices: partialMatch,
            action: 'VERIFICAR se é mesmo device'
        });
    }
});

if (conflicts.length === 0) {
    console.log('\n✅ Nenhum conflito encontrado!');
} else {
    console.log(`\n❌ ${conflicts.length} conflito(s) encontrado(s):\n`);
    conflicts.forEach((conf, i) => {
        const fromDev = data.devices.find(d => d.id === conf.connection.from);
        console.log(`  ${i+1}. "${conf.connection.externalDest}"`);
        console.log(`     FROM: ${fromDev ? fromDev.name : 'N/A'}`);
        console.log(`     Tipo: ${conf.type.toUpperCase()}`);
        
        if (conf.type === 'exact') {
            console.log(`     → Device real: "${conf.device.name}" (ID ${conf.device.id}, tipo: ${conf.device.type})`);
        } else {
            console.log(`     → Possíveis matches (${conf.devices.length}):`);
            conf.devices.slice(0, 3).forEach(d => {
                console.log(`       - "${d.name}" (ID ${d.id}, tipo: ${d.type})`);
            });
        }
        console.log(`     🔧 ${conf.action}\n`);
    });
}

// ============================================================================
// PROPOSTAS DE SOLUÇÃO
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('💡 PROPOSTAS DE SOLUÇÃO');
console.log('='.repeat(80));

console.log('\n📌 SOLUÇÃO 1: Criar ícone SVG para tipo "external"');
console.log('   Em js/features.js, adicionar na linha ~1250:');
console.log(`
   external: function(color) {
       return '<g transform="translate(10,8) scale(0.8)">' +
           // Ícone de nuvem/mundo externo
           '<ellipse cx="45" cy="32" rx="40" ry="28" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="2"/>' +
           '<text x="45" y="40" text-anchor="middle" fill="#0369a1" font-size="24">🌐</text>' +
           '</g>';
   },
`);
console.log('   E adicionar nas cores (linha ~1294):');
console.log(`   external: '#e0f2fe',  // Light blue (external)`);

console.log('\n📌 SOLUÇÃO 2: Corrigir conflito "Firewall"');
const firewallConn = externals.find(c => c.externalDest === 'Firewall');
if (firewallConn) {
    const firewallDev = data.devices.find(d => d.name === 'Firewall Fortinet');
    console.log(`   Conexão atual: Device ${firewallConn.from} → externalDest="Firewall"`);
    console.log(`   Device real: ID ${firewallDev.id} "${firewallDev.name}"`);
    console.log(`   🔧 CONVERTER para: from=${firewallConn.from}, to=${firewallDev.id}`);
    console.log(`   ⚠️  NOTA: Verificar se é conexão circular (device para si mesmo)!`);
}

console.log('\n📌 SOLUÇÃO 3: Verificar "BIG ONE"');
const bigOneConns = externals.filter(c => c.externalDest.includes('BIG ONE'));
console.log(`   ${bigOneConns.length} conexões para "BIG ONE - Laboratorio di Prove"`);
bigOneConns.forEach(c => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`   - FROM: "${fromDev.name}" (ID ${c.from}), port: ${c.fromPort}`);
});
console.log(`   🔧 VERIFICAR se "BIG ONE" é um device real ou realmente externo`);
console.log(`   🔧 Se for device real, converter para conexão device-to-device`);

console.log('\n📌 SOLUÇÃO 4: Manter "External/WAN" e "ISP" como external');
console.log('   Estas são genuinamente externas (ISP, Internet, WAN)');
console.log('   Beneficiam-se do novo ícone "external"');

// ============================================================================
// PREPARAR BACKUP E APLICAR
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🔄 APLICAR CORREÇÕES?');
console.log('='.repeat(80));

console.log('\nEste script apenas ANALISA os problemas.');
console.log('Para aplicar correções:');
console.log('  1. Adicionar ícone "external" em js/features.js');
console.log('  2. Corrigir conflito Firewall (se necessário)');
console.log('  3. Verificar BIG ONE manualmente');
console.log('  4. Manter External/WAN e ISP como estão');

console.log('\n✅ Análise completa!');
