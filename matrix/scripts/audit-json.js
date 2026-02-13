/**
 * JSON Data Audit Script
 * Verifica integridade dos dados em network_manager.json
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/network_manager.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('='.repeat(60));
console.log('  AUDITORIA DO network_manager.json');
console.log('='.repeat(60));

// Estatísticas gerais
console.log('\n📊 ESTATÍSTICAS GERAIS:');
console.log('  Dispositivos:', (data.devices || []).length);
console.log('  Conexões:', (data.connections || []).length);
console.log('  Rooms:', (data.rooms || []).length);
console.log('  Locations:', (data.locations || []).length);
console.log('  Groups:', (data.groups || []).length);

const deviceIds = new Set((data.devices || []).map(d => d.id));
const errors = [];
const warnings = [];

// 1. Verificar conexões órfãs
console.log('\n🔗 VERIFICANDO CONEXÕES...');
const orphanConns = [];
(data.connections || []).forEach((c, i) => {
    if (c.from && !deviceIds.has(c.from)) {
        orphanConns.push({ index: i, conn: c, issue: 'from=' + c.from + ' não existe' });
    }
    if (c.to && !deviceIds.has(c.to) && !c.externalDest) {
        orphanConns.push({ index: i, conn: c, issue: 'to=' + c.to + ' não existe' });
    }
});
if (orphanConns.length > 0) {
    errors.push('Conexões órfãs: ' + orphanConns.length);
    orphanConns.forEach(o => console.log('  ❌ Conexão #' + o.index + ': ' + o.issue));
} else {
    console.log('  ✅ Nenhuma conexão órfã');
}

// 2. Verificar dispositivos isolados
console.log('\n📡 VERIFICANDO DISPOSITIVOS ISOLADOS...');
const connectedDevices = new Set();
(data.connections || []).forEach(c => {
    if (c.from) connectedDevices.add(c.from);
    if (c.to) connectedDevices.add(c.to);
});
const isolated = (data.devices || []).filter(d => !connectedDevices.has(d.id));
if (isolated.length > 0) {
    warnings.push('Dispositivos isolados: ' + isolated.length);
    console.log('  ⚠️ ' + isolated.length + ' dispositivos sem conexões:');
    isolated.forEach(d => console.log('    - ' + d.name + ' (id:' + d.id + ', type:' + d.type + ')'));
} else {
    console.log('  ✅ Todos dispositivos têm conexões');
}

// 3. Verificar IDs duplicados
console.log('\n🔢 VERIFICANDO IDs DUPLICADOS...');
const idCounts = {};
(data.devices || []).forEach(d => {
    idCounts[d.id] = (idCounts[d.id] || 0) + 1;
});
const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
if (duplicateIds.length > 0) {
    errors.push('IDs duplicados: ' + duplicateIds.length);
    duplicateIds.forEach(([id, count]) => console.log('  ❌ ID ' + id + ' aparece ' + count + ' vezes'));
} else {
    console.log('  ✅ Nenhum ID duplicado');
}

// 4. Verificar campos obrigatórios
console.log('\n📝 VERIFICANDO CAMPOS OBRIGATÓRIOS...');
const noName = (data.devices || []).filter(d => !d.name);
const noType = (data.devices || []).filter(d => !d.type);
const noId = (data.devices || []).filter(d => d.id === undefined || d.id === null);

if (noName.length > 0) {
    errors.push('Dispositivos sem nome: ' + noName.length);
    noName.forEach(d => console.log('  ❌ ID ' + d.id + ' sem nome'));
}
if (noType.length > 0) {
    errors.push('Dispositivos sem tipo: ' + noType.length);
    noType.forEach(d => console.log('  ❌ ' + d.name + ' sem tipo'));
}
if (noId.length > 0) {
    errors.push('Dispositivos sem ID: ' + noId.length);
}
if (noName.length === 0 && noType.length === 0 && noId.length === 0) {
    console.log('  ✅ Todos campos obrigatórios preenchidos');
}

// 5. Verificar tipos válidos
console.log('\n🏷️ VERIFICANDO TIPOS DE DISPOSITIVOS...');
const validTypes = ['router', 'switch', 'server', 'firewall', 'ap', 'router_wifi', 'ip_phone', 
    'printer', 'pc', 'nas', 'camera', 'tv', 'isp', 'wallbox', 'walljack', 'others', 
    'patch_panel', 'ups', 'pdu', 'patch', 'hub', 'modem', 'access_point', 'workstation', 
    'laptop', 'storage', 'wifi', 'phone', 'display', 'monitor', 'other'];
const invalidTypes = (data.devices || []).filter(d => d.type && !validTypes.includes(d.type.toLowerCase()));
if (invalidTypes.length > 0) {
    warnings.push('Tipos desconhecidos: ' + invalidTypes.length);
    const uniqueTypes = [...new Set(invalidTypes.map(d => d.type))];
    console.log('  ⚠️ Tipos não reconhecidos: ' + uniqueTypes.join(', '));
} else {
    console.log('  ✅ Todos tipos são válidos');
}

// 6. Verificar rooms referenciadas
console.log('\n🏠 VERIFICANDO REFERÊNCIAS DE LOCATIONS...');
const roomNames = new Set((data.rooms || []).map(r => r.nickname || r.name));
const locationNames = new Set((data.locations || []).map(l => l.name));
const allLocationNames = new Set([...roomNames, ...locationNames]);

const unknownLocations = [];
(data.devices || []).forEach(d => {
    if (d.location && !allLocationNames.has(d.location)) {
        unknownLocations.push({ device: d.name, location: d.location });
    }
});
if (unknownLocations.length > 0) {
    warnings.push('Locations desconhecidas: ' + unknownLocations.length);
    console.log('  ⚠️ ' + unknownLocations.length + ' dispositivos com location não definida:');
    unknownLocations.slice(0, 10).forEach(u => console.log('    - ' + u.device + ': "' + u.location + '"'));
} else {
    console.log('  ✅ Todas locations são válidas');
}

// 7. Verificar conexões duplicadas
console.log('\n🔄 VERIFICANDO CONEXÕES DUPLICADAS...');
const connKeys = {};
const duplicateConns = [];
(data.connections || []).forEach((c, i) => {
    const key = [c.from, c.fromPort, c.to, c.toPort].join('-');
    if (connKeys[key]) {
        duplicateConns.push({ index: i, original: connKeys[key], conn: c });
    } else {
        connKeys[key] = i;
    }
});
if (duplicateConns.length > 0) {
    warnings.push('Conexões duplicadas: ' + duplicateConns.length);
    duplicateConns.forEach(d => console.log('  ⚠️ Conexão #' + d.index + ' duplica #' + d.original));
} else {
    console.log('  ✅ Nenhuma conexão duplicada');
}

// 8. Verificar portas referenciadas
console.log('\n🔌 VERIFICANDO PORTAS NAS CONEXÕES...');
let portIssues = 0;
(data.connections || []).forEach((c, i) => {
    if (c.from) {
        const fromDevice = (data.devices || []).find(d => d.id === c.from);
        if (fromDevice && c.fromPort) {
            const hasPort = (fromDevice.ports || []).some(p => p.name === c.fromPort);
            if (!hasPort) {
                portIssues++;
                if (portIssues <= 5) {
                    console.log('  ⚠️ Porta ' + c.fromPort + ' não existe em ' + fromDevice.name);
                }
            }
        }
    }
});
if (portIssues > 5) {
    console.log('  ... e mais ' + (portIssues - 5) + ' problemas de portas');
}
if (portIssues === 0) {
    console.log('  ✅ Todas portas referenciadas existem');
} else {
    warnings.push('Problemas de portas: ' + portIssues);
}

// Resumo final
console.log('\n' + '='.repeat(60));
console.log('  RESUMO DA AUDITORIA');
console.log('='.repeat(60));
console.log('  Erros críticos: ' + errors.length);
errors.forEach(e => console.log('    ❌ ' + e));
console.log('  Avisos: ' + warnings.length);
warnings.forEach(w => console.log('    ⚠️ ' + w));

if (errors.length === 0 && warnings.length === 0) {
    console.log('\n  🎉 Dados 100% íntegros!');
} else if (errors.length === 0) {
    console.log('\n  ✅ Nenhum erro crítico, mas há ' + warnings.length + ' avisos');
} else {
    console.log('\n  ❌ Encontrados ' + errors.length + ' erros que precisam correção');
}
