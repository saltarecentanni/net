#!/usr/bin/env node
/**
 * Análise detalhada dos problemas com conexões "External"
 * Compara com WallJacks que funcionam corretamente
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔍 ANÁLISE PROFUNDA: EXTERNAL vs WALLJACK\n');
console.log('='.repeat(80));

// Separar por tipo
const walljacks = data.connections.filter(c => c.isWallJack === true);
const externals = data.connections.filter(c => !c.to && c.externalDest && c.isWallJack !== true);

console.log('\n📊 ESTATÍSTICAS:');
console.log('  ✅ WallJacks (isWallJack=true):', walljacks.length);
console.log('  ⚠️  Externals (isWallJack undefined/false):', externals.length);

// ============================================================================
// ANÁLISE 1: ESTRUTURA DOS DADOS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📋 ANÁLISE 1: ESTRUTURA DE DADOS');
console.log('='.repeat(80));

console.log('\n✅ WALLJACKS (3 exemplos):');
walljacks.slice(0, 3).forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`\n  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'} (ID: ${c.from})`);
    console.log(`     → TO: ${c.externalDest}`);
    console.log(`     isWallJack: ${c.isWallJack}`);
    console.log(`     fromPort: ${c.fromPort || '(não definido)'}`);
    console.log(`     type: ${c.type || '(não definido)'}`);
});

console.log('\n⚠️  EXTERNALS (todos):');
externals.forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`\n  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'} (ID: ${c.from})`);
    console.log(`     → TO: ${c.externalDest}`);
    console.log(`     isWallJack: ${c.isWallJack === undefined ? 'UNDEFINED' : c.isWallJack}`);
    console.log(`     fromPort: ${c.fromPort || '(não definido)'}`);
    console.log(`     type: ${c.type || '(não definido)'}`);
});

// ============================================================================
// ANÁLISE 2: COMPORTAMENTO NO CÓDIGO (features.js)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🔧 ANÁLISE 2: COMPORTAMENTO NO CÓDIGO');
console.log('='.repeat(80));

console.log('\n📖 Em features.js linha 1859-1860:');
console.log('   WallJacks processados: if (c.to || !c.externalDest || !c.isWallJack || ...)');
console.log('   → REQUER: isWallJack === true');
console.log('   → CRIA: Dispositivos virtuais com tipo "walljack"');
console.log('   → ÍCONE: 🔳 (definido)');

console.log('\n📖 Em features.js linha 1954:');
console.log('   Externals processados: if (c.to || !c.externalDest || c.isWallJack || ...)');
console.log('   → REQUER: isWallJack === false ou undefined');
console.log('   → CRIA: Dispositivos virtuais com tipo ???');
console.log('   → ÍCONE: ??? (não definido claramente)');

// ============================================================================
// ANÁLISE 3: VERIFICAR SE EXTERNAL CORRESPONDE A DEVICE REAL
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🔍 ANÁLISE 3: EXTERNAL vs DEVICES REAIS');
console.log('='.repeat(80));

externals.forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    const extName = c.externalDest.toLowerCase();
    
    // Buscar dispositivo real com nome similar
    const matchingDevices = data.devices.filter(d => {
        const dName = d.name.toLowerCase();
        return dName.includes(extName) || extName.includes(dName) || 
               dName.split(/[\s\-_\/]+/).some(word => extName.includes(word));
    });
    
    console.log(`\n  ${i+1}. External: "${c.externalDest}"`);
    console.log(`     FROM: ${fromDev ? fromDev.name : 'N/A'}`);
    if (matchingDevices.length > 0) {
        console.log(`     ⚠️  CONFLITO! Existe(m) device(s) real(is):`);
        matchingDevices.forEach(md => {
            console.log(`       - ID ${md.id}: "${md.name}" (tipo: ${md.type})`);
        });
    } else {
        console.log(`     ✅ Não há device real com nome similar`);
    }
});

// ============================================================================
// ANÁLISE 4: NOMES DIFERENTES NA TABELA VS FORMULÁRIO
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📝 ANÁLISE 4: DISCREPÂNCIAS DE NOME');
console.log('='.repeat(80));

console.log('\nNomes de External Destinations:');
const uniqueExternals = [...new Set(externals.map(c => c.externalDest))];
uniqueExternals.forEach((name, i) => {
    const conns = externals.filter(c => c.externalDest === name);
    console.log(`  ${i+1}. "${name}" (usado em ${conns.length} conexão/ões)`);
});

// ============================================================================
// ANÁLISE REVERSA: O QUE O CÓDIGO ESPERA
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🔄 ANÁLISE REVERSA: O QUE O CÓDIGO ESPERA');
console.log('='.repeat(80));

console.log('\n1️⃣ Para WallJacks:');
console.log('   ✅ Deve ter: isWallJack = true');
console.log('   ✅ Deve ter: externalDest com nome (Z1, Z2, etc)');
console.log('   ✅ NÃO deve ter: campo "to"');
console.log('   ✅ Renderizado como: Dispositivo virtual tipo "walljack" com ícone 🔳');

console.log('\n2️⃣ Para Externals (ISP, Firewall, BIG ONE):');
console.log('   ❓ Deve ter: isWallJack = false OU undefined?');
console.log('   ✅ Deve ter: externalDest com nome');
console.log('   ✅ NÃO deve ter: campo "to"');
console.log('   ❓ Renderizado como: Tipo desconhecido, sem ícone claro');

console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
console.log('   Os Externals não têm isWallJack definido explicitamente!');
console.log('   O código em features.js trata eles diferente dos walljacks,');
console.log('   mas não há uma categoria clara para eles.');

// ============================================================================
// RECOMENDAÇÕES
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('💡 RECOMENDAÇÕES');
console.log('='.repeat(80));

console.log('\nSOLUÇÃO 1: Definir isWallJack=false explicitamente');
console.log('  - Mudar todas as conexões External para ter isWallJack: false');
console.log('  - Código já espera isso (linha 1954: c.isWallJack)');

console.log('\nSOLUÇÃO 2: Criar tipo específico "external"');
console.log('  - Adicionar campo isExternal: true');
console.log('  - Código pode diferenciar: walljack vs external vs device');

console.log('\nSOLUÇÃO 3: Verificar se External já é um Device real');
console.log('  - BIG ONE pode ser device 57 ou 58');
console.log('  - Evitar duplicação de dispositivos');
console.log('  - Usar conexão normal device-to-device');

console.log('\n' + '='.repeat(80));
console.log('FIM DA ANÁLISE');
console.log('='.repeat(80));
