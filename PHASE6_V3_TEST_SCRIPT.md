# PHASE 6 v3: Script de Testes da Integração

**Objetivo**: Validar a integração do monitoramento de portas no modal de dispositivos

---

## 🧪 Teste 1: Criar Dispositivo de Teste (Console Script)

Abrir Developer Tools (F12) e executar este script para criar um dispositivo de teste:

```javascript
// Criar um dispositivo de teste com toda a estrutura necessária
const testDevice = {
  id: 'test-device-001',
  name: 'Router Casa (TESTE)',
  type: 'router',
  model: 'TP-Link',
  status: 'online',
  addresses: {
    ipv4: '192.168.1.1',
    ipv6: 'fe80::1'
  },
  prefix: 'ROUTER',
  siteId: 'main',
  location: '00',
  ports: [
    { port: 1, type: 'rj45', description: 'WAN', connected: true },
    { port: 2, type: 'rj45', description: 'LAN 1', connected: true },
    { port: 3, type: 'rj45', description: 'LAN 2', connected: false },
    { port: 4, type: 'rj45', description: 'LAN 3', connected: false }
  ],
  monitoring: {
    enabled: false,
    checkInterval: 10 * 60 * 1000,      // 10 minutos
    alertThreshold: 1 * 60 * 60 * 1000, // 1 hora
    lastCheck: 0,
    currentStatus: 'unknown',
    lastStatusChange: 0,
    downtime: 0,
    alertSent: false
  }
};

// Adicionar ao appState
appState.devices.push(testDevice);

console.log('✅ Dispositivo de teste criado:', testDevice);
console.log('📊 Total de devices:', appState.devices.length);
```

---

## 🎯 Teste 2: UI Deve Ser Visível

**Passo a passo:**
1. Abrir o script acima (Teste 1) no console
2. Procurar no painel esquerdo um novo item "Router Casa (TESTE)" ou usar busca (Ctrl+F)
3. Clicar no dispositivo
4. Modal deve abrir
5. **Scroll para baixo** até ver seção "📡 Port Monitoring"

**Esperado:**
```
✅ Seção com estes elementos:
  - Checkbox: "Enable Monitoring"
  - Select: "Check Interval" (com opções: 5m, 10m, 30m, 1h, 6h, 24h)
  - Select: "Alert After Offline" (com opções: 1m, 5m, 10m, 30m, 1h)
  - Div: Status (mostrando "⚪ Unknown" inicialmente)
  - Div: Last Check (mostrando "Never")
  - Botão azul: "🔍 Scan Now"
```

---

## ⚡ Teste 3: Enable/Disable Checkbox

**Passo a passo:**
1. Modal do "Router Casa (TESTE)" deve estar aberto
2. Clicar no checkbox "Enable Monitoring"
3. Os dois selects devem aparecer
4. Abrir console (F12) → deve ver mensagem similar:
   ```
   ⚙️  Router Casa (TESTE): ✅ Enabled
   ```

**Esperado:**
- ✅ Config section aparece/desaparece
- ✅ Console mostra mensagem de ativação
- ✅ device.monitoring.enabled = true

---

## 🔍 Teste 4: Manual Scan (Scan Now)

**Passo a passo:**
1. Modal deve estar com monitoramento ativado
2. Clicar no botão "🔍 Scan Now"
3. Botão deve ficar desativado e mudar para "⏳ Scanning..."
4. Abrir/verificar console para ver:
   ```javascript
   🔍 MANUAL SCAN: Router Casa (TESTE)
     Pinging 192.168.1.1...
     Result: 🟢 ONLINE (ou 🔴 OFFLINE)
   ```
5. Após 2-3 segundos, botão volta para "🔍 Scan Now"
6. Status deve mudar para 🟢 ou 🔴

**Esperado:**
- ✅ Botão fica desativado durante scan
- ✅ Console mostra log de PING
- ✅ Status atualiza após scan
- ✅ Last Check mostra hora atual

---

## 📊 Teste 5: Background Loop (60 segundos)

**Passo a passo:**
1. Ativar monitoramento no dispositivo de teste
2. Selecionar "Check Interval": "5 minutes"
3. Fechar modal
4. Abrir console (F12)
5. **Aguardar ~60 segundos**
6. Verificar se erscheint mensagem:
   ```javascript
   📊 [CHECK] 14:25:30 - Checking N device(s)
   ```

**Esperado:**
- ✅ A cada 60s, o monitor verifica quais devices precisam check
- ✅ Se intervalo foi atingido, faz PING e atualiza status
- ✅ Console mostra logs de progresso

---

## 💾 Teste 6: Persistência de Configuração

**Passo a passo:**
1. Ativar monitoramento no dispositivo
2. Mudar "Check Interval" para "30 minutes"
3. Mudar "Alert After Offline" para "5 minutes"
4. **Fechar modal** (clicando X)
5. **Reabrir modal** (clicar no dispositivo novamente)
6. Verificar se configuração foi mantida

**Esperado:**
- ✅ Checkbox continua ativado
- ✅ Check Interval mostra "30 minutes"
- ✅ Alert After Offline mostra "5 minutes"
- ✅ Status mantém valor anterior

---

## 🔗 Teste 7: Múltiplos Dispositivos

**Passo a passo:**
1. Criar outro dispositivo de teste (executar Teste 1 novamente, mas com ID diferente)
2. Ativar monitoramento em ambos dispositivos
3. Abrir console
4. Aguardar background loop processar
5. Deve ver ambos sendo monitorados

**Esperado:**
```javascript
// Console output a cada 60s:
📊 [CHECK] 14:26:30 - Checking 2 device(s)
  PING: Router Casa (TESTE 1) → 192.168.1.1
  PING: Router Casa (TESTE 2) → 192.168.2.1
```

---

## 🚨 Teste 8: Alertas (Simulação)

**Passo a passo:**
1. Ativar monitoramento
2. Selecionar "Alert After Offline": "1 minute"
3. Desconectar dispositivo (simular) ou aguardar PING falhar
4. Aguardar 1 minuto
5. Verificar console para mensagem de alerta
6. Toast notification deve aparecer

**Esperado:**
```javascript
// Console:
⚠️  ALERT: Router Casa está OFFLINE por mais de 1min

// Browser: Toast notification no canto superior direito
🔴 [ALERT] Router Casa está OFFLINE
```

---

## 🐛 Teste 9: Tratamento de Erros

**Cenários:**
1. Dispositivo sem IP → erro no scan
2. Fechar modal durante scan → botão volta ao normal
3. Desabilitar monitoramento → para de fazer checks

**Esperado:**
- ✅ Erros aparecem no console com contexto
- ✅ UI não congela
- ✅ Botão retorna ao estado normal após erro

---

## ✅ Checklist de Validação

Marcar conforme cada teste passa:

```javascript
// Copy-paste no console:
const validation = {
  uiRenders: '❌',           // Teste 2
  checkboxWorks: '❌',        // Teste 3
  manualScanWorks: '❌',      // Teste 4
  backgroundLoopRuns: '❌',   // Teste 5
  configPersists: '❌',       // Teste 6
  multipleDevices: '❌',      // Teste 7
  alertsWork: '❌',           // Teste 8
  errorHandling: '❌'         // Teste 9
};

// Atualizar após cada teste bem-sucedido:
// Ex: validation.uiRenders = '✅'
```

---

## 🔧 Console Útil - Debug Commands

```javascript
// Ver estado do monitor
portMonitorV3.getStatus('test-device-001')

// Ver todos os devices sendo monitorados
portMonitorV3.getOverview()

// Ver alertas recentes
portMonitorV3.getRecentAlerts()

// Parar monitoramento (para testes)
portMonitorV3.stopMonitoring()

// Reiniciar monitoramento
portMonitorV3.startMonitoring()

// Verificar device atual na modal
console.log(DeviceDetail)  // Module
console.log(currentDevice) // Dispositivo aberto (se houver acesso)

// Forçar check imediato de um device
portMonitorV3.checkDevice(appState.devices[0])
```

---

## 📋 Relatório de Teste

Após completar todos os testes, criar relatório:

| Teste | Status | Notas |
|-------|--------|-------|
| UI Rendering | ❌ | - |
| Enable/Disable | ❌ | - |
| Manual Scan | ❌ | - |
| Background Loop | ❌ | - |
| Persistência | ❌ | - |
| Múltiplos Devices | ❌ | - |
| Alertas | ❌ | - |
| Tratamento de Erros | ❌ | - |

---

## 🚀 Próximo Passo após Todos Testes Verdes

1. **Testar em navegadores diferentes**: Chrome, Firefox, Safari
2. **Testar em diferentes resoluções**: Desktop, Tablet, Mobile
3. **Testar com dados reais** (se disponível)
4. **Otimizar performance** se necessário
5. **Implementar PHASE B**: Email alerts, webhooks

---

**Data de Início dos Testes**: ____________________  
**Data de Conclusão**: ____________________  
**Status Geral**: ⏳ Pendente
