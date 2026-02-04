#!/usr/bin/env node
/**
 * Análise: Wall Jacks e ISP como "pontes" ou "finais"
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🔍 WALL JACKS E ISP/INTERNET: FINAIS OU PONTES?\n');
console.log('='.repeat(80));

console.log('\n📊 SITUAÇÃO ATUAL:\n');

// Contar wall jacks únicos
const walljacks = data.connections.filter(c => c.isWallJack === true);
const uniqueWallJacks = [...new Set(walljacks.map(c => c.externalDest))];

console.log(`✅ WALL JACKS: ${walljacks.length} conexões, ${uniqueWallJacks.length} destinos únicos`);
uniqueWallJacks.forEach((wj, i) => {
    const count = walljacks.filter(c => c.externalDest === wj).length;
    console.log(`   ${i+1}. "${wj}" → ${count} conexão(ões)`);
});

// Contar externals únicos
const externals = data.connections.filter(c => 
    !c.to && c.externalDest && c.isWallJack !== true
);
const uniqueExternals = [...new Set(externals.map(c => c.externalDest))];

console.log(`\n✅ EXTERNAL/ISP: ${externals.length} conexões, ${uniqueExternals.length} destinos únicos`);
uniqueExternals.forEach((ext, i) => {
    const count = externals.filter(c => c.externalDest === ext).length;
    console.log(`   ${i+1}. "${ext}" → ${count} conexão(ões)`);
});

console.log('\n' + '='.repeat(80));
console.log('🎯 COMO FUNCIONA ATUALMENTE:\n');

console.log('CADA externalDest DIFERENTE = DISPOSITIVO VIRTUAL SEPARADO\n');

console.log('Exemplo Wall Jacks:');
console.log('  • Switch A → Z1 (cria dispositivo virtual "Z1")');
console.log('  • Switch B → Z1 (usa o MESMO dispositivo virtual "Z1")');
console.log('  • Switch C → Z2 (cria NOVO dispositivo virtual "Z2")');
console.log('  ✅ Você pode ter Z1, Z2, Z3... Z100, quantos quiser!\n');

console.log('Exemplo External/ISP:');
console.log('  • Router A → "TIM" (cria dispositivo virtual "TIM")');
console.log('  • Router B → "TIM" (usa o MESMO dispositivo virtual "TIM")');
console.log('  • Router C → "Vodafone" (cria NOVO dispositivo virtual "Vodafone")');
console.log('  ✅ Você pode ter TIM, Vodafone, Eolo, Fastweb, quantos quiser!\n');

console.log('='.repeat(80));
console.log('⚠️  MAS E AS "PONTES"?\n');

console.log('ATUALMENTE: Wall Jack e External/ISP são sempre PONTOS FINAIS');
console.log('  • Não têm campo "to" (destino)');
console.log('  • São desenhados na topologia como dispositivos virtuais');
console.log('  • NÃO PODEM conectar a outro device\n');

console.log('FISICAMENTE NA REDE REAL:');
console.log('  • Wall Jack Z1 (tomada na parede)');
console.log('  •   → Cabo passa dentro da parede');
console.log('  •   → Conecta no Patch Panel porta 5');
console.log('  •   → Patch Panel porta 5 conecta ao Switch\n');

console.log('COMO CADASTRAR ISSO NO SISTEMA:');
console.log('  ❌ ERRADO: Device → Wall Jack Z1 → Patch Panel');
console.log('             (Wall Jack não pode ter "to")');
console.log('');
console.log('  ✅ CORRETO OPÇÃO 1: Device → Patch Panel porta 5');
console.log('                      (Use "notes" ou "cableMarker" = "Z1")');
console.log('');
console.log('  ✅ CORRETO OPÇÃO 2: Device → Wall Jack Z1 (ponto final)');
console.log('                      (Se não precisa mostrar patch panel)\n');

console.log('='.repeat(80));
console.log('💡 CASOS DE USO:\n');

console.log('CASO 1: WALL JACK COMO PONTO FINAL');
console.log('  Situação: Impressora na sala conecta na tomada Z5');
console.log('  Cadastro: Impressora → Wall Jack Z5');
console.log('  Topologia: Mostra Impressora conectada a Z5 (caixa virtual)');
console.log('  ✅ Correto!\n');

console.log('CASO 2: WALL JACK COMO PONTE (passthrough)');
console.log('  Situação: PC conecta em Z5 → cabo vai até Patch Panel porta 10 → Switch');
console.log('  Cadastro ATUAL: PC → Wall Jack Z5 (para depois)');
console.log('  Cadastro IDEAL:');
console.log('    • PC → Patch Panel porta 10 (notes: "via Z5")');
console.log('    • Patch Panel porta 10 → Switch porta 8');
console.log('  Topologia: Mostra caminho completo PC → Patch → Switch');
console.log('  ✅ Mais completo!\n');

console.log('CASO 3: ISP COMO PONTO FINAL');
console.log('  Situação: Router conecta à Internet via TIM');
console.log('  Cadastro: Router WAN → External/ISP "TIM"');
console.log('  Topologia: Mostra Router conectado a "TIM" (caixa amarela)');
console.log('  ✅ Correto!\n');

console.log('CASO 4: ISP COMO PONTE (WAN link)');
console.log('  Situação: Router Sede → Internet → Router Filial (VPN)');
console.log('  Cadastro ATUAL: Router Sede → External "VPN Filial"');
console.log('                  Router Filial → External "VPN Sede"');
console.log('  Cadastro FUTURO: Poderia ter "VPN tunnel" device intermediário');
console.log('  ❓ Caso avançado, pode manter como está por ora\n');

console.log('='.repeat(80));
console.log('✅ RESPOSTA DIRETA:\n');

console.log('SIM, você pode cadastrar quantos quiser:');
console.log('  ✅ Z1, Z2, Z3... Z50, Z100 (wall jacks)');
console.log('  ✅ TIM, Vodafone, Eolo, ISP-A, ISP-B (ISPs)');
console.log('  ✅ Múltiplas conexões para o mesmo destino (Z1 pode ter 10 conexões)');
console.log('');
console.log('Sobre "pontes":');
console.log('  ⚠️  Wall Jack e External/ISP são SEMPRE pontos finais (sem "to")');
console.log('  ✅ Para mostrar caminho completo, use conexões device-to-device:');
console.log('     Device → Patch Panel → Switch (melhor que Device → Wall Jack)');
console.log('  💡 Use "notes" ou "cableMarker" para identificar wall jack físico\n');

console.log('Quer adicionar suporte para Wall Jack como "passthrough"?');
console.log('  → Isso requereria mudança significativa na arquitetura');
console.log('  → Melhor usar Patch Panel para esse propósito');
console.log('='.repeat(80));
