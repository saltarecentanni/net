/**
 * JavaScript Code Audit Script
 * Verifica código morto, duplicações e inconsistências
 */

const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

console.log('='.repeat(60));
console.log('  AUDITORIA DO CÓDIGO JAVASCRIPT');
console.log('='.repeat(60));

const allCode = {};
const allFunctions = {};
const allVariables = {};
const issues = { errors: [], warnings: [], info: [] };

// Ler todos os arquivos
jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
    allCode[file] = content;
    
    // Extrair funções
    const funcMatches = content.matchAll(/function\s+(\w+)\s*\(/g);
    for (const match of funcMatches) {
        if (!allFunctions[match[1]]) allFunctions[match[1]] = [];
        allFunctions[match[1]].push(file);
    }
    
    // Extrair variáveis globais (só no início da linha)
    const varMatches = content.matchAll(/^(?:var|let|const)\s+(\w+)\s*=/gm);
    for (const match of varMatches) {
        if (!allVariables[match[1]]) allVariables[match[1]] = [];
        allVariables[match[1]].push(file);
    }
});

console.log('\n📁 ARQUIVOS ANALISADOS:', jsFiles.length);
jsFiles.forEach(f => console.log('  - ' + f + ' (' + Math.round(allCode[f].length / 1024) + 'KB)'));

// 1. Funções duplicadas
console.log('\n🔄 FUNÇÕES DUPLICADAS (mesmo nome em arquivos diferentes):');
let dupCount = 0;
Object.entries(allFunctions).forEach(([name, files]) => {
    if (files.length > 1) {
        // Verificar se não é interno a IIFE (procurar em context global)
        const globalOccurrences = files.filter(f => {
            const content = allCode[f];
            // Verificar se a função está no nível global ou em IIFE exposta
            const regex = new RegExp(`(?:^|window\\.)${name}\\s*=|^function\\s+${name}`, 'm');
            return regex.test(content);
        });
        
        if (files.length > 1) {
            dupCount++;
            console.log('  ⚠️ ' + name + ': ' + files.join(', '));
        }
    }
});
if (dupCount === 0) console.log('  ✅ Nenhuma duplicação encontrada');
else issues.warnings.push('Funções com mesmo nome: ' + dupCount);

// 2. Funções definidas mas possivelmente não chamadas
console.log('\n🔍 FUNÇÕES POTENCIALMENTE ÓRFÃS:');
const allCodeCombined = Object.values(allCode).join('\n');
let orphanCount = 0;
const knownModules = ['SVGTopology', 'LocationFilter', 'ConnectionTypeFilter', 'Dashboard', 'DeviceDetail', 'FloorPlan', 'Auth', 'EditLock', 'Toast', 'Debug', 'OnlineTracker'];

Object.entries(allFunctions).forEach(([name, files]) => {
    // Ignorar funções internas comuns
    if (['init', 'render', 'update', 'show', 'hide', 'open', 'close', 'to', 'from', 'for', 'if', 'get', 'set'].includes(name)) return;
    
    // Contar chamadas (excluir a própria definição)
    const callRegex = new RegExp(`\\b${name}\\s*\\(`, 'g');
    const calls = (allCodeCombined.match(callRegex) || []).length;
    const definitions = files.length;
    
    if (calls <= definitions) {
        // Verificar se é parte de um módulo exportado
        const isExported = knownModules.some(m => 
            allCodeCombined.includes(`${m}.${name}`) || 
            allCodeCombined.includes(`${name}: ${name}`)
        );
        
        if (!isExported && calls === definitions) {
            orphanCount++;
            if (orphanCount <= 15) {
                console.log('  ⚠️ ' + name + ' (em ' + files.join(', ') + ') - sem chamadas visíveis');
            }
        }
    }
});
if (orphanCount > 15) console.log('  ... e mais ' + (orphanCount - 15) + ' funções órfãs');
if (orphanCount > 0) issues.info.push('Funções possivelmente não utilizadas: ' + orphanCount);

// 3. Verificar console.log deixados no código
console.log('\n🐛 CONSOLE.LOG/DEBUG NO CÓDIGO:');
let logCount = 0;
Object.entries(allCode).forEach(([file, content]) => {
    const logs = content.match(/console\.(log|warn|error|debug)\(/g) || [];
    if (logs.length > 0) {
        console.log('  📝 ' + file + ': ' + logs.length + ' console statements');
        logCount += logs.length;
    }
});
if (logCount > 20) {
    issues.info.push('Console statements: ' + logCount + ' (considere remover em produção)');
}

// 4. Verificar TODO/FIXME/HACK
console.log('\n📌 TODOs e FIXMEs:');
let todoCount = 0;
Object.entries(allCode).forEach(([file, content]) => {
    const todos = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX):.*/gi) || [];
    todos.forEach(t => {
        todoCount++;
        if (todoCount <= 10) {
            console.log('  📌 ' + file + ': ' + t.trim().substring(0, 60));
        }
    });
});
if (todoCount > 10) console.log('  ... e mais ' + (todoCount - 10) + ' TODOs');
if (todoCount > 0) issues.info.push('TODOs pendentes: ' + todoCount);

// 5. Verificar variáveis não utilizadas (aproximado)
console.log('\n🔢 VARIÁVEIS GLOBAIS DEFINIDAS:');
Object.entries(allVariables).forEach(([name, files]) => {
    if (files.length > 1) {
        console.log('  ⚠️ ' + name + ' definida em: ' + files.join(', '));
    }
});

// 6. Verificar padrões problemáticos
console.log('\n⚠️ PADRÕES POTENCIALMENTE PROBLEMÁTICOS:');
const patterns = [
    { regex: /eval\s*\(/g, desc: 'Uso de eval()' },
    { regex: /innerHTML\s*=(?!\s*['"])/g, desc: 'innerHTML sem sanitização' },
    { regex: /document\.write/g, desc: 'document.write' },
    { regex: /setTimeout\s*\(\s*['"`]/g, desc: 'setTimeout com string' },
    { regex: /==(?!=)/g, desc: '== em vez de ===' },
];

patterns.forEach(p => {
    let count = 0;
    Object.entries(allCode).forEach(([file, content]) => {
        const matches = content.match(p.regex) || [];
        count += matches.length;
    });
    if (count > 0 && p.desc !== '== em vez de ===') { // Muitos == são intencionais
        console.log('  ⚠️ ' + p.desc + ': ' + count + ' ocorrências');
    }
});

// 7. Verificar versões inconsistentes
console.log('\n🏷️ VERIFICANDO VERSÕES:');
const versionRegex = /(?:VERSION|version)['":\s]*([0-9]+\.[0-9]+\.[0-9]+)/gi;
const versions = new Set();
Object.values(allCode).forEach(content => {
    const matches = content.matchAll(versionRegex);
    for (const m of matches) {
        versions.add(m[1]);
    }
});
if (versions.size > 1) {
    issues.warnings.push('Múltiplas versões encontradas: ' + [...versions].join(', '));
    console.log('  ⚠️ Versões encontradas: ' + [...versions].join(', '));
} else if (versions.size === 1) {
    console.log('  ✅ Versão consistente: ' + [...versions][0]);
}

// Resumo
console.log('\n' + '='.repeat(60));
console.log('  RESUMO DA AUDITORIA DE CÓDIGO');
console.log('='.repeat(60));
console.log('  Erros: ' + issues.errors.length);
issues.errors.forEach(e => console.log('    ❌ ' + e));
console.log('  Avisos: ' + issues.warnings.length);
issues.warnings.forEach(w => console.log('    ⚠️ ' + w));
console.log('  Info: ' + issues.info.length);
issues.info.forEach(i => console.log('    ℹ️ ' + i));

// Lista de funções duplicadas para correção
console.log('\n' + '='.repeat(60));
console.log('  FUNÇÕES DUPLICADAS PARA CONSOLIDAR:');
console.log('='.repeat(60));
const toConsolidate = ['escapeHtml', 'copyToClipboard', 'getRackColor', 'formatLabel', 'getDeviceIcon', 'getContrastTextColor', 'darkenColor'];
toConsolidate.forEach(name => {
    if (allFunctions[name] && allFunctions[name].length > 1) {
        console.log('  🔧 ' + name + ': mover para app.js e remover de ' + allFunctions[name].filter(f => f !== 'app.js').join(', '));
    }
});
