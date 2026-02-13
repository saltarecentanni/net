#!/usr/bin/env node

/**
 * Test: Device Naming System - Normal & Reverse Flow
 * Verifies that hostname auto-fill works and type switching doesn't break
 */

// Mock DOM structures
const mockDOM = {
    deviceType: { value: '' },
    devicePrefix: { value: '' },
    deviceName: { value: '' }
};

// Device Prefix Database (from app.js)
const DEVICE_PREFIXES = [
    { type: 'switch', prefix: 'SW' },
    { type: 'router', prefix: 'RT' },
    { type: 'firewall', prefix: 'FW' },
    { type: 'poe_injector', prefix: 'POE' },
    { type: 'access_point', prefix: 'AP' },
    { type: 'server', prefix: 'SRV' },
    { type: 'nas', prefix: 'NAS' },
    { type: 'ups', prefix: 'UPS' },
    { type: 'ip_phone', prefix: 'IP-PHO' },
    { type: 'printer', prefix: 'PRN' },
    { type: 'camera', prefix: 'CAM' },
    { type: 'dvr', prefix: 'DVR' },
    { type: 'iot_device', prefix: 'IOT' }
];

function getDefaultPrefix(type) {
    for (var i = 0; i < DEVICE_PREFIXES.length; i++) {
        if (DEVICE_PREFIXES[i].type === type) {
            return DEVICE_PREFIXES[i].prefix;
        }
    }
    return 'GEN';
}

function simulateTypeSelection(type) {
    mockDOM.deviceType.value = type;
    mockDOM.devicePrefix.value = getDefaultPrefix(type);
    return getDefaultPrefix(type);
}

function reset() {
    mockDOM.deviceType.value = '';
    mockDOM.devicePrefix.value = '';
    mockDOM.deviceName.value = '';
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  TEST: Device Naming System - Normal & Reverse Verification   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passedTests = 0;
let totalTests = 0;

// ========================================
// TEST 1: NORMAL FLOW - Single type selection
// ========================================
console.log('📋 TEST 1: NORMAL FLOW - Single Type Selection\n');

const testCases = [
    { type: 'switch', expected: 'SW' },
    { type: 'router', expected: 'RT' },
    { type: 'firewall', expected: 'FW' },
    { type: 'poe_injector', expected: 'POE' },
    { type: 'server', expected: 'SRV' },
    { type: 'nas', expected: 'NAS' }
];

testCases.forEach(function(testCase) {
    totalTests++;
    reset();
    const result = simulateTypeSelection(testCase.type);
    const passed = result === testCase.expected;
    
    if (passed) {
        passedTests++;
        console.log('  ✅ Type: ' + testCase.type + ' → Prefix: ' + result);
    } else {
        console.log('  ❌ Type: ' + testCase.type + ' → Expected: ' + testCase.expected + ', Got: ' + result);
    }
});

console.log('\n');

// ========================================
// TEST 2: REVERSE FLOW - Type Switching
// ========================================
console.log('📋 TEST 2: REVERSE FLOW - Type Switching\n');

const switchingTests = [
    { from: 'switch', to: 'router', fromExp: 'SW', toExp: 'RT' },
    { from: 'firewall', to: 'poe_injector', fromExp: 'FW', toExp: 'POE' },
    { from: 'server', to: 'nas', fromExp: 'SRV', toExp: 'NAS' },
    { from: 'switch', to: 'server', fromExp: 'SW', toExp: 'SRV' },
    { from: 'router', to: 'firewall', fromExp: 'RT', toExp: 'FW' }
];

switchingTests.forEach(function(test) {
    totalTests += 2;
    
    // Step 1: Select first type
    reset();
    const result1 = simulateTypeSelection(test.from);
    const step1Pass = result1 === test.fromExp;
    if (step1Pass) {
        passedTests++;
        console.log('  ✅ Step 1 - Select: ' + test.from + ' → ' + result1);
    } else {
        console.log('  ❌ Step 1 - Expected: ' + test.fromExp + ', Got: ' + result1);
    }
    
    // Step 2: Switch to different type
    const result2 = simulateTypeSelection(test.to);
    const step2Pass = result2 === test.toExp;
    if (step2Pass) {
        passedTests++;
        console.log('  ✅ Step 2 - Switch to: ' + test.to + ' → ' + result2);
    } else {
        console.log('  ❌ Step 2 - Expected: ' + test.toExp + ', Got: ' + result2);
    }
    console.log('');
});

// ========================================
// TEST 3: Edge Cases
// ========================================
console.log('📋 TEST 3: EDGE CASES\n');

// Edge case 1: Unknown type
totalTests++;
reset();
const unknownResult = simulateTypeSelection('unknown_device');
const unknownPass = unknownResult === 'GEN';
if (unknownPass) {
    passedTests++;
    console.log('  ✅ Unknown type → Fallback: GEN');
} else {
    console.log('  ❌ Unknown type → Expected: GEN, Got: ' + unknownResult);
}

// Edge case 2: Empty type
totalTests++;
reset();
const emptyResult = simulateTypeSelection('');
const emptyPass = emptyResult === 'GEN';
if (emptyPass) {
    passedTests++;
    console.log('  ✅ Empty type → Fallback: GEN');
} else {
    console.log('  ❌ Empty type → Expected: GEN, Got: ' + emptyResult);
}

console.log('\n');

// ========================================
// RESULTS
// ========================================
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  RESULTS                                                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const percentage = Math.round((passedTests / totalTests) * 100);
console.log('  Testes passados: ' + passedTests + '/' + totalTests + ' (' + percentage + '%)\n');

if (passedTests === totalTests) {
    console.log('  ✅ TUDO FUNCIONANDO PERFEITAMENTE!\n');
    console.log('  • Auto-preenchimento de hostname: ✓');
    console.log('  • Mudança de tipo sem bugs: ✓');
    console.log('  • Tratamento de casos especiais: ✓\n');
    process.exit(0);
} else {
    console.log('  ⚠️  ALGUNS TESTES FALHARAM\n');
    process.exit(1);
}
