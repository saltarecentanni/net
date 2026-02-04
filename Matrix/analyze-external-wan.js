#!/usr/bin/env node
/**
 * Análise: O que pode ser categorizado como External/WAN?
 */

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));

console.log('🌐 ANÁLISE: O QUE PODE SER EXTERNAL/WAN?\n');
console.log('='.repeat(80));

// Conexões External legítimas
const externals = data.connections.filter(c => 
    !c.to && c.externalDest && c.isWallJack !== true
);

console.log(`\n📊 EXTERNAL ATUAIS (${externals.length}):\n`);
externals.forEach((c, i) => {
    const fromDev = data.devices.find(d => d.id === c.from);
    console.log(`  ${i+1}. FROM: ${fromDev ? fromDev.name : 'N/A'} (tipo: ${fromDev ? fromDev.type : '?'})`);
    console.log(`     → TO: "${c.externalDest}"`);
    console.log(`     Port: ${c.fromPort || '(não definido)'}`);
    console.log(`     Type: ${c.type}`);
    console.log('');
});

// Analisar dispositivos que conectam à WAN
console.log('='.repeat(80));
console.log('🔍 DISPOSITIVOS QUE TIPICAMENTE CONECTAM À WAN:\n');

const wanDevices = data.devices.filter(d => {
    const type = d.type || '';
    const name = (d.name || '').toLowerCase();
    
    return type === 'router' || 
           type === 'firewall' || 
           type === 'modem' ||
           name.includes('wan') ||
           name.includes('isp') ||
           name.includes('tim') ||
           name.includes('fwa') ||
           name.includes('huawei');
});

console.log(`Encontrados ${wanDevices.length} dispositivos de borda/WAN:\n`);
wanDevices.forEach((d, i) => {
    // Verificar conexões deste device
    const conns = data.connections.filter(c => c.from === d.id);
    const hasExternal = conns.some(c => c.externalDest);
    
    console.log(`  ${i+1}. ${d.name} (ID ${d.id}, tipo: ${d.type})`);
    console.log(`     Conexões: ${conns.length} ${hasExternal ? '✅ (tem external)' : '❌ (sem external)'}`);
    if (hasExternal) {
        const ext = conns.find(c => c.externalDest);
        console.log(`     → External: "${ext.externalDest}"`);
    }
    console.log('');
});

console.log('='.repeat(80));
console.log('💡 CATEGORIAS TÍPICAS DE EXTERNAL/WAN:\n');
console.log('  1. ISP (Internet Service Provider) - Fornecedor de Internet');
console.log('  2. WAN (Wide Area Network) - Links entre sites');
console.log('  3. Internet - Conexão genérica à internet');
console.log('  4. Cloud Provider - AWS, Azure, GCP, etc');
console.log('  5. VPN Endpoint - Túneis VPN externos');
console.log('  6. Telecom Link - Links de operadoras (TIM, Vodafone, etc)');
console.log('  7. Branch Office - Filiais remotas');
console.log('  8. DMZ Externa - Zona desmilitarizada externa');
console.log('  9. Datacenter Remoto - DC externo');
console.log(' 10. Peering/IX - Internet Exchange points');

console.log('\n='.repeat(80));
console.log('🎯 RECOMENDAÇÃO:\n');
console.log('  ISP e External/WAN são essencialmente a mesma coisa!');
console.log('  Podemos padronizar tudo como "External/WAN" ou separar:');
console.log('    - "ISP" = Fornecedor de Internet específico');
console.log('    - "WAN" = Links WAN privados');
console.log('    - "Internet" = Acesso genérico');
console.log('\n  Atualmente temos:');
console.log('    - 2x "External/WAN" (Huawei TIM, TIESSE_IVREA_FWA)');
console.log('    - 1x "ISP" (Imola6 LX5272)');
console.log('\n  Opções:');
console.log('    A) Unificar tudo como "Internet" (simples)');
console.log('    B) Renomear "ISP" → "External/WAN" (padronizar)');
console.log('    C) Manter separado ISP ≠ WAN (detalhado)');
