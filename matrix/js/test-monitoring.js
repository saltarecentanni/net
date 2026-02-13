/**
 * PHASE 6 v3: Test Script para Monitoramento de Portas
 * 
 * Executar automaticamente quando a página carrega
 * Carregue este arquivo no console ou adicione <script> ao index.html
 */

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
} else {
    runTests();
}

function runTests() {
    console.log('%c🧪 PHASE 6 v3 - TEST SUITE', 'color: blue; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════', 'color: blue');
    
    // Aguardar um pouco para appState estar disponível
    setTimeout(function() {
        console.log('\n📊 [TEST 1] Verificar appState e portMonitorV3...');
        
        if (!window.appState) {
            console.error('❌ appState não disponível!');
            return;
        }
        
        if (!window.portMonitorV3) {
            console.error('❌ portMonitorV3 não carregado!');
            return;
        }
        
        console.log('✅ appState disponível');
        console.log('✅ portMonitorV3 disponível');
        console.log(`   Total de devices: ${appState.devices.length}`);
        
        // Criar dispositivo de teste
        console.log('\n📊 [TEST 2] Criar dispositivo de teste...');
        
        const testDevice = {
            id: 'test-device-phase6-' + Date.now(),
            name: '⚡ TESTE MONITORING',
            type: 'router',
            model: 'Test Router',
            status: 'online',
            prefix: 'TST',
            siteId: 'main',
            location: '00',
            addresses: {
                ipv4: '192.168.1.1',
                ipv6: 'fe80::1'
            },
            gateway: '192.168.1.1',
            mask: '255.255.255.0',
            isDhcp: false,
            ports: [
                { port: 1, type: 'rj45', description: 'WAN', connected: true, vlan: 1 },
                { port: 2, type: 'rj45', description: 'LAN 1', connected: true, vlan: 100 },
                { port: 3, type: 'rj45', description: 'LAN 2', connected: false, vlan: 100 },
                { port: 4, type: 'rj45', description: 'LAN 3', connected: false, vlan: 100 }
            ],
            monitoring: {
                enabled: false,
                checkInterval: 5 * 60 * 1000,      // 5 minutos
                alertThreshold: 1 * 60 * 1000,     // 1 minuto (para testes rápidos)
                lastCheck: 0,
                currentStatus: 'unknown',
                lastStatusChange: 0,
                downtime: 0,
                alertSent: false
            }
        };
        
        appState.devices.push(testDevice);
        
        console.log('✅ Dispositivo de teste criado!');
        console.log('   ID:', testDevice.id);
        console.log('   Name:', testDevice.name);
        console.log('   IP:', testDevice.addresses.ipv4);
        console.log(`   Total devices agora: ${appState.devices.length}`);
        
        // Mostrar como acessar
        console.log('\n📊 [TEST 3] Instruções de teste...');
        console.log('%c💡 COMO FAZER OS TESTES:', 'color: green; font-weight: bold');
        console.log(`
1️⃣  PROCURE no painel esquerdo por: "⚡ TESTE MONITORING" (scroll se precisar)

2️⃣  CLIQUE no dispositivo para abrir a modal

3️⃣  Na modal, SCROLL PARA BAIXO até encontrar a seção "📡 Port Monitoring"

4️⃣  TESTE O CHECKBOX:
    • Clique em "Enable Monitoring"
    • Os campos de intervalo devem aparecer/desaparecer
    • Verifique este console para mensagens

5️⃣  TESTE O BOTÃO "🔍 Scan Now":
    • Deve mudar para "⏳ Scanning..."
    • Depois volta a "🔍 Scan Now"
    • Status deve atualizar para 🟢 (online) ou 🔴 (offline)

6️⃣  TESTE OS SELECTS:
    • Mude "Check Interval"
    • Mude "Alert After Offline"
    • Verifique console para confirmação

7️⃣  TESTE O BACKGROUND LOOP:
    • Ative monitoramento
    • Aguarde ~60 segundos
    • Console deve mostrar: "📊 [CHECK] HH:MM:SS - Checking X device(s)"
        `);
        
        // Funções de teste disponíveis
        console.log('\n📊 [TEST 4] Funções disponíveis no console...');
        
        // Criar funções globais de teste
        window.testMonitoring = {
            // Ver status do device de teste
            getStatus: function() {
                const device = appState.devices.find(d => d.id.startsWith('test-device-phase6-'));
                if (!device) {
                    console.log('❌ Dispositivo de teste não encontrado');
                    return;
                }
                console.log('📊 Status do Device de Teste:');
                console.log('   ID:', device.id);
                console.log('   Name:', device.name);
                console.log('   Monitoring Enabled:', device.monitoring.enabled);
                console.log('   Current Status:', device.monitoring.currentStatus);
                console.log('   Last Check:', device.monitoring.lastCheck > 0 ? 
                    new Date(device.monitoring.lastCheck).toLocaleTimeString() : 'Never');
                console.log('   Check Interval:', device.monitoring.checkInterval, 'ms');
                console.log('   Alert Threshold:', device.monitoring.alertThreshold, 'ms');
            },
            
            // Ver overview geral
            getOverview: function() {
                console.log('📊 Monitor Overview:');
                if (typeof portMonitorV3 !== 'undefined' && portMonitorV3.getOverview) {
                    const overview = portMonitorV3.getOverview();
                    console.log('   Monitored:', overview.monitored);
                    console.log('   Online:', overview.online);
                    console.log('   Offline:', overview.offline);
                    console.log('   Recent Alerts:', overview.recentAlerts);
                }
            },
            
            // Abrir device de teste na modal
            openTestDevice: function() {
                const device = appState.devices.find(d => d.id.startsWith('test-device-phase6-'));
                if (!device) {
                    console.log('❌ Dispositivo de teste não encontrado');
                    return;
                }
                if (typeof DeviceDetail !== 'undefined' && DeviceDetail.open) {
                    console.log('📖 Abrindo dispositivo de teste...');
                    DeviceDetail.open(device.id);
                } else {
                    console.log('❌ DeviceDetail não disponível');
                }
            },
            
            // Fazer scan manual
            scanTest: function() {
                const device = appState.devices.find(d => d.id.startsWith('test-device-phase6-'));
                if (!device) {
                    console.log('❌ Dispositivo de teste não encontrado');
                    return;
                }
                console.log('🔍 Iniciando scan manual...');
                if (typeof portMonitorV3 !== 'undefined') {
                    portMonitorV3.scanDeviceNow(device.id).then(result => {
                        console.log('✅ Scan concluído!');
                        console.log('   Status:', result.status);
                        console.log('   IP:', result.ip);
                    }).catch(err => {
                        console.error('❌ Erro no scan:', err.message);
                    });
                }
            },
            
            // Ativar monitoramento
            enableMonitoring: function() {
                const device = appState.devices.find(d => d.id.startsWith('test-device-phase6-'));
                if (!device) {
                    console.log('❌ Dispositivo de teste não encontrado');
                    return;
                }
                if (typeof portMonitorV3 !== 'undefined') {
                    portMonitorV3.setMonitoring(device.id, true, {
                        interval: 5 * 60 * 1000,
                        threshold: 1 * 60 * 1000
                    });
                    console.log('✅ Monitoramento ativado!');
                }
            },
            
            // Desativar monitoramento
            disableMonitoring: function() {
                const device = appState.devices.find(d => d.id.startsWith('test-device-phase6-'));
                if (!device) {
                    console.log('❌ Dispositivo de teste não encontrado');
                    return;
                }
                if (typeof portMonitorV3 !== 'undefined') {
                    portMonitorV3.setMonitoring(device.id, false);
                    console.log('✅ Monitoramento desativado!');
                }
            }
        };
        
        console.log('✅ Funções de teste registradas!');
        console.log('%cCOMOS USAR:', 'color: green; font-weight: bold');
        console.log(`
testMonitoring.getStatus()           → Ver status do device de teste
testMonitoring.getOverview()         → Ver overview geral do monitor
testMonitoring.openTestDevice()      → Abrir device de teste na modal
testMonitoring.scanTest()            → Fazer scan manual do device de teste
testMonitoring.enableMonitoring()    → Ativar monitoramento
testMonitoring.disableMonitoring()   → Desativar monitoramento
        `);
        
        console.log('\n%c════════════════════════════════', 'color: blue');
        console.log('%c✅ TESTES PRONTOS PARA COMEÇAR!', 'color: green; font-size: 14px; font-weight: bold');
        console.log('%c════════════════════════════════', 'color: blue');
        
    }, 1000);  // Aguardar 1 segundo para tudo carregar
}
