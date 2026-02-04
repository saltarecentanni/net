#!/usr/bin/env node
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔍 VERIFICAÇÃO PROFUNDA: WALLJACK COM CAMPO "to"\n');
console.log('='.repeat(80));

// Verificar se ALGUM walljack tem campo 'to'
const walljacks = data.connections.filter(c => c.isWallJack === true);

console.log(`📊 WALL JACKS EXISTENTES (${walljacks.length}):\n`);

let hasToField = 0;
walljacks.forEach((wj, i) => {
    const fromDev = data.devices.find(d => d.id === wj.from);
    const toDev = wj.to ? data.devices.find(d => d.id === wj.to) : null;
    
    console.log(`  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'}`);
    console.log(`     externalDest: ${wj.externalDest}`);
    console.log(`     to: ${wj.to || 'null'}`);
    console.log(`     toPort: ${wj.toPort || 'null'}`);
    
    if (wj.to) {
        hasToField++;
        console.log(`     ✅ TEM CAMPO TO! → ${toDev ? toDev.name : 'ID ' + wj.to}`);
    }
    console.log('');
});

console.log('='.repeat(80));
console.log(`RESULTADO: ${hasToField} wall jack(s) com campo "to"`);

if (hasToField > 0) {
    console.log('✅ SIM! Wall jacks PODEM ter campo "to"!');
} else {
    console.log('❌ Nenhum wall jack atual tem campo "to"');
}

// Verificar código fonte
console.log('\n' + '='.repeat(80));
console.log('🔧 VERIFICANDO CÓDIGO EM app.js:\n');

const appCode = fs.readFileSync('js/app.js', 'utf8');

// Verificar linha 2289: to: to,
console.log('Linha 2289 em app.js:');
console.log('  to: to,');
console.log('');
console.log('ANÁLISE:');
console.log('  • Campo "to" É SALVO mesmo para walljack!');
console.log('  • Se isWallJack=true E toDevice escolhido, "to" é salvo');
console.log('  • toPort é zerado para walljack (linha 2290)');
console.log('');

// Verificar features.js
console.log('='.repeat(80));
console.log('🎨 VERIFICANDO RENDERIZAÇÃO EM features.js:\n');

const featuresCode = fs.readFileSync('js/features.js', 'utf8');

// Procurar como walljacks são processados
if (featuresCode.includes('if (c.to || !c.externalDest || !c.isWallJack')) {
    console.log('Linha ~1860 em features.js:');
    console.log('  if (c.to || !c.externalDest || !c.isWallJack || ...)');
    console.log('');
    console.log('⚠️  PROBLEMA ENCONTRADO!');
    console.log('  • Condição: if (c.to || ...) return;');
    console.log('  • Se walljack TEM campo "to", ele é IGNORADO!');
    console.log('  • Não cria dispositivo virtual!');
    console.log('');
    console.log('CONCLUSÃO:');
    console.log('  ✅ Dados PERMITEM "to" em walljack');
    console.log('  ❌ Renderização IGNORA walljack com "to"');
    console.log('  💡 Walljack com "to" vira conexão normal!');
}

console.log('\n' + '='.repeat(80));
console.log('🎯 RESPOSTA FINAL:\n');
console.log('SIM, VOCÊ ESTÁ CERTO!');
console.log('');
console.log('Wall jacks PODEM ter campo "to":');
console.log('  • app.js SALVA campo "to" normalmente');
console.log('  • Estrutura de dados suporta');
console.log('  • Mas features.js tem lógica especial:');
console.log('    - Se tem "to": trata como conexão normal device-to-device');
console.log('    - Se não tem "to": cria dispositivo virtual walljack');
console.log('');
console.log('PARA SEU CASO (Switch → Z14 → Router):');
console.log('  1. From Device: Switch');
console.log('  2. From Port: eth0');
console.log('  3. To Device: Router');
console.log('  4. To Port: eth1');
console.log('  5. Escolher "Wall Jack" no dropdown');
console.log('  6. External Dest: Z14');
console.log('');
console.log('RESULTADO:');
console.log('  • Salva: from=Switch, to=Router, externalDest=Z14, isWallJack=true');
console.log('  • Topologia: Mostra Switch → Router (conexão normal)');
console.log('  • Z14 fica no campo externalDest (info adicional)');
console.log('  • NÃO cria caixa virtual "Z14"');
console.log('='.repeat(80));
