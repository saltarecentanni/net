#!/usr/bin/env node
/**
 * Análise de qualidade dos dados - network_manager.json
 */

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data', 'network_manager.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log('🔍 ANÁLISE PROFUNDA - network_manager.json\n');
console.log('='.repeat(60));

// 1. Dispositivos
const deviceIds = new Set();
const duplicateIds = [];
data.devices.forEach(d => {
  if (deviceIds.has(d.id)) duplicateIds.push(d.id);
  deviceIds.add(d.id);
});

console.log('\n📊 DISPOSITIVOS:');
console.log('  Total:', data.devices.length);
console.log('  IDs duplicados:', duplicateIds.length ? duplicateIds.join(', ') : '✅ Nenhum');

// 2. Conexões órfãs
const orphanConns = [];
data.connections.forEach((c, idx) => {
  if (c.from && !deviceIds.has(c.from)) {
    orphanConns.push({idx, conn: c.id, issue: 'FROM=' + c.from + ' não existe'});
  }
  if (c.to && !deviceIds.has(c.to)) {
    orphanConns.push({idx, conn: c.id, issue: 'TO=' + c.to + ' não existe'});
  }
});

console.log('\n🔗 CONEXÕES:');
console.log('  Total:', data.connections.length);
console.log('  Órfãs:', orphanConns.length ? '❌ ' + orphanConns.length : '✅ Nenhuma');
if (orphanConns.length > 0) {
  console.log('\n  ⚠️  Conexões órfãs encontradas:');
  orphanConns.forEach(o => console.log('    - Conn[' + o.idx + ']:', o.issue));
}

// 3. Dispositivos sem conexões
const connectedDevices = new Set();
data.connections.forEach(c => {
  if (c.from) connectedDevices.add(c.from);
  if (c.to) connectedDevices.add(c.to);
});

const isolatedDevices = data.devices.filter(d => !connectedDevices.has(d.id));
console.log('  Dispositivos isolados:', isolatedDevices.length);
if (isolatedDevices.length > 0) {
  console.log('\n  Dispositivos sem conexões:');
  isolatedDevices.forEach(d => console.log('    - ID', d.id + ':', d.name, '(' + d.type + ')'));
}

// 4. Status
const statuses = {};
data.devices.forEach(d => {
  const s = d.status || 'undefined';
  statuses[s] = (statuses[s] || 0) + 1;
});
console.log('\n📊 STATUS:');
Object.keys(statuses).sort().forEach(s => console.log('  ' + s + ':', statuses[s]));

// 5. Conexões duplicadas
const connKeys = new Map();
const duplicates = [];
data.connections.forEach((c, idx) => {
  const key = c.from + '->' + (c.to || c.externalDest || 'ext');
  if (connKeys.has(key)) {
    duplicates.push({
      original: connKeys.get(key), 
      duplicate: idx, 
      from: c.from, 
      to: c.to || c.externalDest
    });
  } else {
    connKeys.set(key, idx);
  }
});

console.log('\n🔗 CONEXÕES DUPLICADAS:', duplicates.length ? '❌ ' + duplicates.length : '✅ Nenhuma');
if (duplicates.length > 0) {
  console.log('\n  Duplicatas encontradas:');
  duplicates.forEach(d => {
    console.log('    - FROM', d.from, '→ TO', d.to);
    console.log('      Índices:', d.original, 'e', d.duplicate);
  });
}

// 6. Campos problemáticos
const issues = [];
data.devices.forEach((d, idx) => {
  if (d.ip1 || d.ip2 || d.ip3 || d.ip4) {
    issues.push({idx, id: d.id, name: d.name, issue: 'Usa ip1/ip2/ip3/ip4 (obsoleto)'});
  }
  if (!d.type) {
    issues.push({idx, id: d.id, name: d.name, issue: 'Sem type'});
  }
  if (!d.name || d.name.trim() === '') {
    issues.push({idx, id: d.id, issue: 'Sem nome'});
  }
});

console.log('\n⚠️  CAMPOS PROBLEMÁTICOS:', issues.length ? '❌ ' + issues.length : '✅ Nenhum');
if (issues.length > 0) {
  console.log('\n  Problemas encontrados:');
  issues.forEach(o => console.log('    - Device', o.id + ':', o.name, '-', o.issue));
}

// 7. Conexões externas/walljack
const externalConns = data.connections.filter(c => !c.to && c.externalDest);
const walljackConns = data.connections.filter(c => c.isWallJack === true);

console.log('\n🌐 CONEXÕES EXTERNAS/WALLJACK:');
console.log('  External (sem .to):', externalConns.length);
console.log('  WallJack (isWallJack=true):', walljackConns.length);

if (externalConns.length > 0) {
  const dests = {};
  externalConns.forEach(c => {
    const d = c.externalDest || 'undefined';
    dests[d] = (dests[d] || 0) + 1;
  });
  console.log('\n  Destinos externos:');
  Object.keys(dests).sort().forEach(d => console.log('    -', d + ':', dests[d]));
}

// 8. Valores null/undefined
const nullProblems = [];
data.connections.forEach((c, idx) => {
  if (c.from === null || c.from === undefined) {
    nullProblems.push({idx, issue: 'from é null/undefined'});
  }
  if (!c.to && !c.externalDest) {
    nullProblems.push({idx, issue: 'sem to nem externalDest'});
  }
});

console.log('\n⚠️  VALORES NULL/UNDEFINED:', nullProblems.length ? '❌ ' + nullProblems.length : '✅ Nenhum');
if (nullProblems.length > 0) {
  console.log('\n  Problemas encontrados:');
  nullProblems.forEach(p => console.log('    - Conn[' + p.idx + ']:', p.issue));
}

// Resumo final
console.log('\n' + '='.repeat(60));
console.log('\n📋 RESUMO:');
const totalIssues = orphanConns.length + duplicates.length + issues.length + nullProblems.length;
if (totalIssues === 0) {
  console.log('✅ NENHUM PROBLEMA ENCONTRADO - Dados limpos!');
} else {
  console.log('❌ Total de problemas:', totalIssues);
  console.log('   - Conexões órfãs:', orphanConns.length);
  console.log('   - Conexões duplicadas:', duplicates.length);
  console.log('   - Campos problemáticos:', issues.length);
  console.log('   - Valores null:', nullProblems.length);
  console.log('   - Dispositivos isolados:', isolatedDevices.length, '(aviso, não erro)');
}

console.log('\n');
