/**
 * INTEGRAÇÃO PORT MONITOR - QUICK SETUP
 * 
 * Passo 1: Adicionar script no index.html
 * ========================================
 * 
 * ANTES dos scripts já existentes, adicione:
 * 
 * <script src="js/port-monitor.js"></script>
 * 
 * Colocar depois de app.js carregar, por exemplo na seção <head> ou antes de </body>:
 * 
 * <script src="js/app.js"></script>
 * <script src="js/port-monitor.js"></script>  ← AQUI
 * 
 * 
 * Passo 2: Inicializar no app.js (depois de carregar dados)
 * ==========================================================
 * 
 * No final da função que carrega dados (após appState.devices e appState.connections
 * estarem preenchidos):
 * 
 * ```javascript
 * // API Response with all data
 * const response = await fetch('/data');
 * const data = await response.json();
 * 
 * appState.devices = data.devices || [];
 * appState.connections = data.connections || [];
 * // ... outros dados
 * 
 * // ← ADICIONAR AQUI:
 * portMonitor.init();  // Inicia monitoring!
 * ```
 * 
 * 
 * Passo 3: Adicionar Tab "Port Monitor" no HTML
 * ==============================================
 * 
 * Após a tab de Logs, adicionar:
 * 
 * <!-- Tab 8: Port Monitor -->
 * <button onclick="switchTab(8)" class="tab-button">🔌 Port Monitor</button>
 * 
 * <div id="tab-8" class="tab-pane" style="display:none;">
 *   <div class="p-6">
 *     <h1 class="text-3xl font-bold mb-6">🔌 Port Monitor</h1>
 *     
 *     <!-- Stats -->
 *     <div class="grid grid-cols-4 gap-4 mb-6">
 *       <div class="bg-green-100 p-4 rounded">
 *         <div class="text-sm font-bold text-green-800">Online</div>
 *         <div id="stat-online" class="text-2xl font-bold">--</div>
 *       </div>
 *       <div class="bg-red-100 p-4 rounded">
 *         <div class="text-sm font-bold text-red-800">Offline</div>
 *         <div id="stat-offline" class="text-2xl font-bold">--</div>
 *       </div>
 *       <div class="bg-blue-100 p-4 rounded">
 *         <div class="text-sm font-bold text-blue-800">Total</div>
 *         <div id="stat-total" class="text-2xl font-bold">--</div>
 *       </div>
 *       <div class="bg-purple-100 p-4 rounded">
 *         <div class="text-sm font-bold text-purple-800">Uptime</div>
 *         <div id="stat-uptime" class="text-2xl font-bold">--</div>
 *       </div>
 *     </div>
 *     
 *     <!-- Filtros -->
 *     <div class="mb-4 flex gap-2">
 *       <button onclick="updatePortDisplay('all')" class="px-4 py-2 bg-blue-500 text-white rounded">
 *         All Ports
 *       </button>
 *       <button onclick="updatePortDisplay('online')" class="px-4 py-2 bg-green-500 text-white rounded">
 *         🟢 Online
 *       </button>
 *       <button onclick="updatePortDisplay('offline')" class="px-4 py-2 bg-red-500 text-white rounded">
 *         🔴 Offline
 *       </button>
 *       <button onclick="refreshPortMonitor()" class="px-4 py-2 bg-yellow-500 text-white rounded ml-auto">
 *         🔄 Refresh Now
 *       </button>
 *     </div>
 *     
 *     <!-- Port Status List -->
 *     <h2 class="text-xl font-bold mb-4">Port Status</h2>
 *     <div id="port-list" class="space-y-2 max-h-96 overflow-y-auto">
 *       <!-- Preenchido dinamicamente por JavaScript -->
 *     </div>
 *     
 *     <!-- Alerts -->
 *     <h2 class="text-xl font-bold mt-8 mb-4">📢 Recent Alerts</h2>
 *     <div id="alert-list" class="space-y-2 max-h-48 overflow-y-auto">
 *       <!-- Preenchido dinamicamente -->
 *     </div>
 *   </div>
 * </div>
 * 
 * 
 * Passo 4: Adicionar funções JavaScript para UI
 * ==============================================
 * 
 * Adicionar no app.js ou em novo arquivo ui-port-monitor.js:
 * 
 * ```javascript
 * function updatePortDisplay(filter = 'all') {
 *   const portList = document.getElementById('port-list');
 *   const allPorts = portMonitor.getAllPortStatus();
 *   
 *   portList.innerHTML = '';
 *   
 *   for (const connId in allPorts) {
 *     const port = allPorts[connId];
 *     
 *     if (filter === 'online' && port.status !== 'online') continue;
 *     if (filter === 'offline' && port.status !== 'offline') continue;
 *     
 *     const from = port.from.name;
 *     const to = port.to.name;
 *     const status = port.status;
 *     const icon = status === 'online' ? '🟢' : status === 'offline' ? '🔴' : '⚪';
 *     const color = status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray';
 *     
 *     const borderColor = color === 'green' ? 'border-green-500 bg-green-50' : 
 *                         color === 'red' ? 'border-red-500 bg-red-50' : 
 *                         'border-gray-500 bg-gray-50';
 *     
 *     const html = `
 *       <div class="flex items-center justify-between p-3 rounded border-l-4 ${borderColor}">
 *         <div>
 *           <strong>${from}</strong> ${port.fromPort} → <strong>${to}</strong> ${port.toPort}
 *           <br>
 *           <small class="text-gray-600">${port.from.ip || 'N/A'} : ${port.to.ip || 'N/A'}</small>
 *         </div>
 *         <div class="flex items-center gap-2 text-right">
 *           <span class="text-lg font-bold">${icon}</span>
 *           <div>
 *             <div class="font-bold">${status.toUpperCase()}</div>
 *             <small class="text-gray-500">${port.lastCheck ? formatTime(Date.now() - port.lastCheck) + ' ago' : 'never'}</small>
 *           </div>
 *         </div>
 *       </div>
 *     `;
 *     
 *     portList.innerHTML += html;
 *   }
 * }
 * 
 * function updatePortStats() {
 *   const stats = portMonitor.getStats();
 *   
 *   document.getElementById('stat-online').textContent = stats.onlinePorts || 0;
 *   document.getElementById('stat-offline').textContent = stats.offlinePorts || 0;
 *   document.getElementById('stat-total').textContent = stats.totalPorts || 0;
 *   document.getElementById('stat-uptime').textContent = (stats.uptime || 0) + '%';
 * }
 * 
 * function updateAlertDisplay() {
 *   const alertList = document.getElementById('alert-list');
 *   const alerts = portMonitor.getAlerts().slice(-10).reverse();
 *   
 *   alertList.innerHTML = '';
 *   
 *   alerts.forEach(alert => {
 *     const icon = alert.type === 'port_down' ? '⚠️' : '✅';
 *     const color = alert.type === 'port_down' ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500';
 *     
 *     const html = `
 *       <div class="p-3 ${color} border-l-4 rounded flex justify-between items-center">
 *         <div>
 *           <strong>${icon} ${alert.type === 'port_down' ? 'PORT DOWN' : 'PORT RECOVERED'}</strong>
 *           <br>
 *           <small>${alert.devices[0]} → ${alert.devices[1]}</small>
 *           <br>
 *           <small class="text-gray-600">${new Date(alert.timestamp).toLocaleTimeString()}</small>
 *         </div>
 *       </div>
 *     `;
 *     
 *     alertList.innerHTML += html;
 *   });
 * }
 * 
 * function refreshPortMonitor() {
 *   portMonitor.scanAllPorts().then(() => {
 *     updatePortDisplay();
 *     updatePortStats();
 *     updateAlertDisplay();
 *     showToast('✅ Port monitor scan completed');
 *   });
 * }
 * 
 * // Atualizar display a cada 30 segundos
 * setInterval(() => {
 *   updatePortDisplay();
 *   updatePortStats();
 *   updateAlertDisplay();
 * }, 30000);
 * ```
 * 
 * 
 * Passo 5: Testar
 * ===============
 * 
 * 1. Abrir Console (F12) → Aba "Console"
 * 2. Você verá mensagens como:
 *    🔌 Port Monitor initialized
 *    ✅ Port Monitor: scanning every 10 minutes
 *    🔍 [PORT MONITOR] Scan started at 14:30:45
 *    🟢 SW - Core-01:eth1 → RT - Gateway:eth0 (online)
 *    🔴 SRV - Database:eth2 → NAS - Storage:eth3 (offline)
 *    ✅ [PORT MONITOR] Scan completed. 8 online, 2 offline
 * 
 * 3. Clicar em Tab "Port Monitor" (novo)
 * 4. Ver status verde (online) e vermelho (offline)
 * 5. Tentar desconectar um "dispositivo de teste" (simular)
 * 6. Aguardar próximo scan (max 10 min) ou clicar "Refresh Now"
 * 7. Deverá aparecer alerta vermelho
 * 
 * 
 * Passo 6: Debug
 * ==============
 * 
 * Ver toda a estrutura de dados:
 * console.log(appState.portMonitor)
 * 
 * Obter status de uma porta específica:
 * console.log(portMonitor.getPortStatus('conexao-id'))
 * 
 * Forçar scan imediato:
 * portMonitor.scanAllPorts()
 * 
 * Ver stats:
 * console.log(portMonitor.getStats())
 * 
 * Ver alertas:
 * console.log(portMonitor.getAlerts())
 * 
 * Desabilitar monitor:
 * portMonitor.toggle(false)
 * 
 * Reabilitar:
 * portMonitor.toggle(true)
 * 
 * 
 * PRÓXIMAS STEPS
 * ==============
 * 
 * ✅ FASE A (Simples): Ping + alertas básicas    [ AGORA ]
 * ⏱️  FASE B (Médio):   SNMP + email + webhooks  [ Semana 2-3 ]
 * 📊 FASE C (Completo): LibreNMS + escalabilidade [ Futuro ]
 * 
 * 
 * REFERÊNCIAS
 * ===========
 * 
 * Documento completo: matrix/doc/PHASE6_PORT_MONITOR_PROPOSAL.md
 * Arquivo principal: matrix/js/port-monitor.js
 * Resumo executivo: PHASE6_QUICK_SUMMARY.md
 */
