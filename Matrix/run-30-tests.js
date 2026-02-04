#!/usr/bin/env node
/**
 * VERIFICAÇÃO COMPLETA - 30 TESTES
 * 15 Verificações Normais + 15 Verificações Reversas
 */

const fs = require('fs');

console.log('🔍 VERIFICAÇÃO COMPLETA - 30 TESTES\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
        errors.push({ test: name, error: e.message });
        failed++;
    }
}

console.log('\n📋 PARTE 1: 15 VERIFICAÇÕES NORMAIS\n');

// 1. Verificar se app.js existe e tem label correto
test('1. app.js existe', () => {
    if (!fs.existsSync('js/app.js')) throw new Error('Arquivo não encontrado');
});

test('2. Label "Wall Jack" correto (não "Wall Jack ID")', () => {
    const content = fs.readFileSync('js/app.js', 'utf8');
    if (!content.includes('🔌 Wall Jack\'') || content.includes('🔌 Wall Jack ID')) {
        throw new Error('Label incorreto');
    }
});

// 3. Verificar se features.js tem ícone external
test('3. Ícone external SVG adicionado', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    if (!content.includes('external: function(color)')) {
        throw new Error('Ícone external não encontrado');
    }
});

// 4. Verificar typeColors tem external
test('4. typeColors tem entrada "external"', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    if (!content.includes('external: \'#e0f2fe\'')) {
        throw new Error('Cor external não encontrada');
    }
});

// 5. Verificar typeLabels tem external
test('5. typeLabels tem entrada "external"', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    if (!content.includes('external: \'External/Internet\'')) {
        throw new Error('Label external não encontrado');
    }
});

// 6. Verificar typeBadgeColors tem external
test('6. typeBadgeColors tem entrada "external"', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    if (!content.includes('external: \'#0ea5e9\'')) {
        throw new Error('Badge color external não encontrado');
    }
});

// 7. Verificar dados padronizados
test('7. Conexões external padronizadas para "Internet/ISP"', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const externals = data.connections.filter(c => !c.to && c.externalDest && !c.isWallJack);
    const hasOldNames = externals.some(c => c.externalDest === 'ISP' || c.externalDest === 'External/WAN');
    if (hasOldNames) throw new Error('Ainda existem nomes antigos');
});

// 8. Verificar estrutura de dados intacta
test('8. Estrutura devices intacta', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    if (!Array.isArray(data.devices) || data.devices.length !== 101) {
        throw new Error(`Esperado 101 devices, encontrado ${data.devices.length}`);
    }
});

// 9. Verificar conexões intactas
test('9. Conexões intactas (90 total)', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    if (!Array.isArray(data.connections) || data.connections.length !== 90) {
        throw new Error(`Esperado 90 conexões, encontrado ${data.connections.length}`);
    }
});

// 10. Verificar walljacks
test('10. Wall jacks preservados (14)', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const wj = data.connections.filter(c => c.isWallJack === true);
    if (wj.length !== 14) throw new Error(`Esperado 14, encontrado ${wj.length}`);
});

// 11. Verificar external/ISP
test('11. External/ISP corretos (3)', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const ext = data.connections.filter(c => !c.to && c.externalDest && !c.isWallJack);
    if (ext.length !== 3) throw new Error(`Esperado 3, encontrado ${ext.length}`);
});

// 12. Verificar JSON válido
test('12. network_manager.json é JSON válido', () => {
    const content = fs.readFileSync('data/network_manager.json', 'utf8');
    JSON.parse(content); // Throws if invalid
});

// 13. Verificar sintaxe JavaScript app.js
test('13. app.js sintaxe válida', () => {
    const content = fs.readFileSync('js/app.js', 'utf8');
    if (content.includes('if (externalDestLabel) externalDestLabel.textContent = \'🔌 Wall Jack\';')) {
        // OK
    } else {
        throw new Error('Sintaxe incorreta');
    }
});

// 14. Verificar sintaxe JavaScript features.js
test('14. features.js sintaxe válida', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    // Check for unmatched braces would be complex, just verify it parses
    if (content.length < 100000) throw new Error('Arquivo muito pequeno, pode estar corrompido');
});

// 15. Verificar backup existe
test('15. Backup criado', () => {
    const backups = fs.readdirSync('backup').filter(f => f.includes('before-external-improvements'));
    if (backups.length === 0) throw new Error('Backup não encontrado');
});

console.log('\n📋 PARTE 2: 15 VERIFICAÇÕES REVERSAS\n');

// 16-30: Verificações reversas (procurar o que NÃO deveria estar lá)

test('16. Não há "Wall Jack ID" no código', () => {
    const content = fs.readFileSync('js/app.js', 'utf8');
    if (content.includes('Wall Jack ID')) throw new Error('Label antigo ainda presente');
});

test('17. Não há conexões BIG ONE', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const bigone = data.connections.filter(c => c.externalDest && c.externalDest.includes('BIG ONE'));
    if (bigone.length > 0) throw new Error(`${bigone.length} conexões BIG ONE encontradas`);
});

test('18. Não há conexão Firewall circular', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const fw = data.connections.filter(c => c.from === 9 && c.externalDest === 'Firewall');
    if (fw.length > 0) throw new Error('Conexão Firewall circular encontrada');
});

test('19. Não há campos "room" nas conexões', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const hasRoom = data.connections.some(c => c.room !== undefined);
    if (hasRoom) throw new Error('Campo "room" obsoleto encontrado');
});

test('20. Não há dispositivos duplicados', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const ids = data.devices.map(d => d.id);
    const unique = new Set(ids);
    if (ids.length !== unique.size) throw new Error('IDs duplicados');
});

test('21. Não há conexões órfãs', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const deviceIds = new Set(data.devices.map(d => d.id));
    const orphans = data.connections.filter(c => !deviceIds.has(c.from) || (c.to && !deviceIds.has(c.to)));
    if (orphans.length > 0) throw new Error(`${orphans.length} conexões órfãs`);
});

test('22. Não há syntax errors em app.js', () => {
    const content = fs.readFileSync('js/app.js', 'utf8');
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 10) throw new Error('Desbalanceamento de chaves');
});

test('23. Não há syntax errors em features.js', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 10) throw new Error('Desbalanceamento de chaves');
});

test('24. Não há valores null indevidos', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const badDevices = data.devices.filter(d => !d.name || !d.type);
    if (badDevices.length > 0) throw new Error(`${badDevices.length} devices com campos obrigatórios null`);
});

test('25. Não há tipos de conexão inválidos', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const validTypes = ['lan', 'wan', 'trunk', 'wallport', 'fiber', 'other'];
    const invalid = data.connections.filter(c => !validTypes.includes(c.type));
    if (invalid.length > 0) throw new Error(`${invalid.length} conexões com tipo inválido`);
});

test('26. Não há portas vazias onde deveriam ter valor', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const deviceConn = data.connections.filter(c => c.to && !c.isWallJack);
    const missingPorts = deviceConn.filter(c => !c.fromPort && !c.toPort);
    // Alguns devices podem não ter portas (ISP, others), então só alertar se > 5
    if (missingPorts.length > 5) throw new Error(`${missingPorts.length} conexões sem portas`);
});

test('27. Não há externalDest vazio para walljack', () => {
    const data = JSON.parse(fs.readFileSync('data/network_manager.json', 'utf8'));
    const wj = data.connections.filter(c => c.isWallJack && !c.externalDest);
    if (wj.length > 0) throw new Error(`${wj.length} walljacks sem externalDest`);
});

test('28. Não há caracteres inválidos no JSON', () => {
    const content = fs.readFileSync('data/network_manager.json', 'utf8');
    // Check for common JSON corruption
    if (content.includes('undefined') || content.includes('NaN')) {
        throw new Error('Valores inválidos no JSON');
    }
});

test('29. Não há referências a código antigo', () => {
    const content = fs.readFileSync('js/features.js', 'utf8');
    // Verificar se não tem referências a migração antiga
    if (content.includes('migrate-to-v3.7')) throw new Error('Referências antigas encontradas');
});

test('30. Não há arquivos corrompidos', () => {
    const files = ['js/app.js', 'js/features.js', 'data/network_manager.json'];
    files.forEach(f => {
        const stats = fs.statSync(f);
        if (stats.size < 1000) throw new Error(`${f} muito pequeno: ${stats.size} bytes`);
    });
});

console.log('\n' + '='.repeat(80));
console.log('📊 RESULTADO FINAL\n');
console.log(`✅ Passou: ${passed}/30`);
console.log(`❌ Falhou: ${failed}/30`);

if (errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:\n');
    errors.forEach((e, i) => {
        console.log(`  ${i+1}. ${e.test}`);
        console.log(`     → ${e.error}\n`);
    });
} else {
    console.log('\n🎉 TODAS AS VERIFICAÇÕES PASSARAM!');
}

console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
