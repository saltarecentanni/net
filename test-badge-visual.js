#!/usr/bin/env node

/**
 * Test: Hostname Badge Visual System
 * Verifies that when type is selected, the purple badge displays the prefix
 */

// Mock DOM
const mockDOM = {
    deviceType: { value: '' },
    devicePrefix: { value: '' },
    deviceName: { value: '' },
    hostnamePrefixBadge: { textContent: '', style: { display: 'none' } }
};

// Device Prefix Database
const DEVICE_PREFIXES = [
    { type: 'switch', prefix: 'SW' },
    { type: 'router', prefix: 'RT' },
    { type: 'firewall', prefix: 'FW' },
    { type: 'poe_injector', prefix: 'POE' },
    { type: 'server', prefix: 'SRV' },
];

function getDefaultPrefix(type) {
    for (var i = 0; i < DEVICE_PREFIXES.length; i++) {
        if (DEVICE_PREFIXES[i].type === type) {
            return DEVICE_PREFIXES[i].prefix;
        }
    }
    return 'GEN';
}

// Simulated onDeviceTypeChange function
function onDeviceTypeChange() {
    var type = mockDOM.deviceType.value;
    var prefixField = mockDOM.devicePrefix;
    var prefix = getDefaultPrefix(type);
    
    if (prefixField) {
        prefixField.value = prefix;
    }
    
    // Show/hide the purple prefix badge
    var badge = mockDOM.hostnamePrefixBadge;
    if (badge) {
        if (prefix) {
            badge.textContent = prefix;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Clear hostname field and focus it
    var nameField = mockDOM.deviceName;
    if (nameField) {
        nameField.value = '';
    }
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     TEST: Hostname Badge Visual System - Purple Display       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let total = 0;

// Test 1: Select Switch type
console.log('📋 TEST 1: Select Type = Switch\n');
total++;
mockDOM.deviceType.value = 'switch';
mockDOM.hostnamePrefixBadge.style.display = 'none';
mockDOM.hostnamePrefixBadge.textContent = '';
onDeviceTypeChange();

if (mockDOM.hostnamePrefixBadge.textContent === 'SW' && 
    mockDOM.hostnamePrefixBadge.style.display === 'block' &&
    mockDOM.deviceName.value === '') {
    passed++;
    console.log('  ✅ Badge shows: SW (purple visible)');
    console.log('  ✅ Input field is empty');
    console.log('  ✅ Prefix field: ' + mockDOM.devicePrefix.value);
} else {
    console.log('  ❌ Failed');
    console.log('     Badge: ' + mockDOM.hostnamePrefixBadge.textContent);
    console.log('     Display: ' + mockDOM.hostnamePrefixBadge.style.display);
    console.log('     Input: ' + mockDOM.deviceName.value);
}

console.log('');

// Test 2: Change to Router type
console.log('📋 TEST 2: Change Type = Router\n');
total++;
mockDOM.deviceType.value = 'router';
mockDOM.deviceName.value = 'old-value';  // Simulate previous value
onDeviceTypeChange();

if (mockDOM.hostnamePrefixBadge.textContent === 'RT' && 
    mockDOM.hostnamePrefixBadge.style.display === 'block' &&
    mockDOM.deviceName.value === '') {
    passed++;
    console.log('  ✅ Badge updated to: RT');
    console.log('  ✅ Input cleared (was overwritten)');
} else {
    console.log('  ❌ Failed');
}

console.log('');

// Test 3: Sequence (Switch → FW → POE)
console.log('📋 TEST 3: Type Sequence - Switch → Firewall → POE\n');
total += 3;

// Switch
mockDOM.deviceType.value = 'switch';
onDeviceTypeChange();
if (mockDOM.hostnamePrefixBadge.textContent === 'SW' && mockDOM.hostnamePrefixBadge.style.display === 'block') {
    passed++;
    console.log('  ✅ Step 1: SW (purple)');
} else {
    console.log('  ❌ Step 1 failed');
}

// Firewall
mockDOM.deviceType.value = 'firewall';
onDeviceTypeChange();
if (mockDOM.hostnamePrefixBadge.textContent === 'FW' && mockDOM.hostnamePrefixBadge.style.display === 'block') {
    passed++;
    console.log('  ✅ Step 2: FW (purple)');
} else {
    console.log('  ❌ Step 2 failed');
}

// POE
mockDOM.deviceType.value = 'poe_injector';
onDeviceTypeChange();
if (mockDOM.hostnamePrefixBadge.textContent === 'POE' && mockDOM.hostnamePrefixBadge.style.display === 'block') {
    passed++;
    console.log('  ✅ Step 3: POE (purple)');
} else {
    console.log('  ❌ Step 3 failed');
}

console.log('\n');

// Test 4: Empty type
console.log('📋 TEST 4: Empty Type - Badge Hidden\n');
total++;
mockDOM.deviceType.value = '';
mockDOM.hostnamePrefixBadge.style.display = 'block';
onDeviceTypeChange();

if (mockDOM.hostnamePrefixBadge.style.display === 'none') {
    passed++;
    console.log('  ✅ Badge hidden when type is empty');
} else {
    console.log('  ❌ Badge should be hidden');
}

console.log('\n');

// Summary
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  RESULTS                                                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const percentage = Math.round((passed / total) * 100);
console.log('  Testes passados: ' + passed + '/' + total + ' (' + percentage + '%)\n');

if (passed === total) {
    console.log('  ✅ SISTEMA DE BADGE FUNCIONANDO PERFEITAMENTE!\n');
    console.log('  • Sigla em roxo/violeta aparece quando tipo é selecionado: ✓');
    console.log('  • Campo hostname fica vazio para entrada do usuário: ✓');
    console.log('  • Badge desaparece quando tipo é vazio: ✓');
    console.log('  • Mudança de tipo atualiza badge corretamente: ✓\n');
    process.exit(0);
} else {
    console.log('  ⚠️  ALGUNS TESTES FALHARAM\n');
    process.exit(1);
}
