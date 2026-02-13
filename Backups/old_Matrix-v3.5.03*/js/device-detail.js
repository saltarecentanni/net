/**
 * Device Detail Modal - TIESSE Matrix Network
 * Version: 3.6.037
 * 
 * Modal de detalhes do dispositivo no padrão visual do Floor Plan
 * com visualização de portas estilo switch real (RJ45)
 */

var DeviceDetail = (function() {
    'use strict';

    // VLAN color palette - cores inspiradas no D-Link switch
    var vlanColors = {
        100: { color: '#22c55e', label: 'Management' },  // Verde
        151: { color: '#22c55e', label: 'Users' },       // Verde
        200: { color: '#eab308', label: 'VoIP' },        // Amarelo
        300: { color: '#a855f7', label: 'Servers' },     // Roxo
        999: { color: '#ef4444', label: 'Trunk' },       // Vermelho
        1: { color: '#22c55e', label: 'Native' }         // Verde
    };

    // Zone colors
    var zoneColors = {
        'LAN': '#22c55e',
        'WAN': '#f59e0b',
        'DMZ': '#ef4444',
        'VLAN': '#3b82f6',
        'MGMT': '#06b6d4',
        'VoIP': '#eab308',
        'Guest': '#f97316',
        'IoT': '#a855f7',
        'Servers': '#8b5cf6',
        'Storage': '#14b8a6',
        'Backup': '#78716c',
        'Test': '#ec4899'
    };

    // Default colors for unknown VLANs
    var defaultVlanColors = ['#22c55e', '#eab308', '#3b82f6', '#a855f7', '#06b6d4'];

    var currentDevice = null;
    var currentConnections = [];

    /**
     * Escape HTML para prevenir XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function(m) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
        });
    }

    /**
     * Open the device detail modal usando SweetAlert2
     */
    function open(deviceOrId) {
        var device = typeof deviceOrId === 'object' ? deviceOrId : findDevice(deviceOrId);
        if (!device) {
            console.error('Device not found:', deviceOrId);
            return;
        }

        currentDevice = device;
        currentConnections = getDeviceConnections(device.id);

        var html = buildModalContent(device, currentConnections);
        
        // Usar SweetAlert2 como o Floor Plan
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                html: html,
                width: '1100px',
                padding: '0',
                showConfirmButton: false,
                showCloseButton: true,
                customClass: {
                    popup: 'device-detail-popup',
                    closeButton: 'device-detail-close'
                },
                didOpen: function() {
                    // Bind click events
                    bindPortEvents();
                }
            });
        } else {
            // Fallback para modal padrão
            document.getElementById('deviceDetailHeader').innerHTML = buildHeader(device);
            document.getElementById('deviceDetailContent').innerHTML = buildContent(device, currentConnections);
            document.getElementById('deviceDetailModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    function close(event) {
        if (event && event.target !== event.currentTarget) return;
        
        if (typeof Swal !== 'undefined' && Swal.isVisible()) {
            Swal.close();
        } else {
            document.getElementById('deviceDetailModal').classList.add('hidden');
            document.body.style.overflow = '';
        }
        currentDevice = null;
        currentConnections = [];
    }

    /**
     * Find device by ID
     */
    function findDevice(id) {
        if (!window.appState || !window.appState.devices) return null;
        return window.appState.devices.find(function(d) { return d.id === id; });
    }

    /**
     * Get connections for device
     */
    function getDeviceConnections(deviceId) {
        if (!window.appState || !window.appState.connections) return [];
        return window.appState.connections.filter(function(c) {
            return c.from === deviceId || c.to === deviceId;
        });
    }

    /**
     * Get device type icon
     */
    function getTypeIcon(type) {
        var icons = {
            'router': '🌐',
            'switch': '🔀',
            'firewall': '🛡️',
            'server': '🖥️',
            'workstation': '💻',
            'printer': '🖨️',
            'ap': '📶',
            'modem': '📡',
            'isp': '🌍',
            'ups': '🔋',
            'storage': '💾',
            'camera': '📹',
            'phone': '📞',
            'patch-panel': '🔌',
            'other': '📦'
        };
        return icons[type] || '📦';
    }

    /**
     * Get type label
     */
    function getTypeLabel(type) {
        var labels = {
            'router': 'Router',
            'switch': 'Switch',
            'firewall': 'Firewall',
            'server': 'Server',
            'workstation': 'Workstation',
            'printer': 'Printer',
            'ap': 'Access Point',
            'modem': 'Modem',
            'isp': 'ISP',
            'ups': 'UPS',
            'storage': 'Storage',
            'camera': 'Camera',
            'phone': 'Phone',
            'patch-panel': 'Patch Panel',
            'other': 'Other'
        };
        return labels[type] || type;
    }

    /**
     * Build complete modal content
     */
    function buildModalContent(device, connections) {
        var ports = device.ports || [];
        var addresses = device.addresses || [];
        var links = device.links || [];
        
        var html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">';
        
        // ========== HEADER ==========
        html += '<div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);padding:16px 20px;border-bottom:2px solid #e2e8f0;">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">';
        
        // Device name and info
        html += '<div style="flex:1;min-width:200px;">';
        html += '<h2 style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#1e293b;">' + escapeHtml(device.name) + '</h2>';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#64748b;">';
        html += '<span>' + getTypeLabel(device.type) + '</span>';
        html += '<span style="color:#cbd5e1;">•</span>';
        
        // Status badge
        var isActive = device.status === 'active';
        var statusBg = isActive ? '#dcfce7' : '#fef2f2';
        var statusColor = isActive ? '#166534' : '#991b1b';
        var statusDot = isActive ? '#22c55e' : '#ef4444';
        html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:' + statusBg + ';color:' + statusColor + ';border-radius:10px;font-size:11px;font-weight:600;">';
        html += '<span style="width:6px;height:6px;border-radius:50%;background:' + statusDot + ';"></span>';
        html += (isActive ? 'Online' : 'Offline') + '</span>';
        
        if (device.location) {
            html += '<span style="color:#cbd5e1;">•</span>';
            html += '<span>📍 ' + escapeHtml(device.location) + '</span>';
        }
        if (device.rackId) {
            html += '<span style="color:#cbd5e1;">•</span>';
            html += '<span>🗄️ ' + escapeHtml(device.rackId) + '</span>';
        }
        html += '</div></div>';
        
        // Quick access buttons with labels
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">';
        html += buildQuickButtons(device, links, addresses);
        html += '</div>';
        
        html += '</div></div>';
        
        // ========== CONTENT ==========
        html += '<div style="padding:16px 20px;">';
        
        // Port visualization section
        if (ports.length > 0) {
            html += '<div style="margin-bottom:16px;">';
            html += '<div style="font-weight:600;color:#334155;font-size:13px;margin-bottom:10px;display:flex;align-items:center;gap:6px;">';
            html += '🔌 Ports (' + ports.length + ')';
            html += '</div>';
            html += buildPortVisualization(device, ports, connections);
            html += '</div>';
        }
        
        // Two column layout: Network + Info | Connections + Notes
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
        
        // Left column
        html += '<div>';
        
        // Network info
        html += '<div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;margin-bottom:12px;">';
        html += '<div style="font-weight:600;color:#334155;font-size:12px;margin-bottom:8px;">🌐 Network</div>';
        html += buildNetworkInfo(addresses, device.gateway, device.mask);
        html += '</div>';
        
        // Zone/Connection Types Summary - mostra apenas se há conexões
        if (connections.length > 0) {
            html += '<div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;">';
            html += '<div style="font-weight:600;color:#334155;font-size:12px;margin-bottom:8px;">🔗 Zones</div>';
            html += buildVlanSummary(ports, connections);
            html += '</div>';
        }
        
        html += '</div>';
        
        // Right column
        html += '<div>';
        
        // Connections
        html += '<div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:12px;margin-bottom:12px;">';
        html += '<div style="font-weight:600;color:#334155;font-size:12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">';
        html += '<span>🔗 Connections</span>';
        html += '<span style="background:#3b82f6;color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;">' + connections.length + '</span>';
        html += '</div>';
        html += buildConnectionsList(device, connections);
        html += '</div>';
        
        // Notes
        var notes = device.notes || device.service || '';
        if (notes) {
            html += '<div style="background:#fffbeb;border-radius:10px;border:1px solid #fde68a;padding:12px;">';
            html += '<div style="font-weight:600;color:#92400e;font-size:12px;margin-bottom:6px;">📝 Notes</div>';
            html += '<div style="font-size:11px;color:#78350f;line-height:1.4;">' + escapeHtml(notes) + '</div>';
            html += '</div>';
        }
        
        html += '</div></div>';
        
        // Port detail bar
        html += '<div id="portDetailBar" style="display:none;margin-top:12px;padding:10px 12px;background:#f1f5f9;border-radius:8px;font-size:12px;color:#475569;"></div>';
        
        html += '</div></div>';
        
        return html;
    }

    /**
     * Build quick access buttons with labels - TODOS via Guacamole
     */
    function buildQuickButtons(device, links, addresses) {
        var html = '';
        var ip = addresses.length > 0 ? (addresses[0].ip || addresses[0].network || '').split('/')[0] : '';
        
        var hasWeb = links.some(function(l) { return l.type === 'http' || l.type === 'https' || l.type === 'web'; });
        var hasSsh = links.some(function(l) { return l.type === 'ssh'; });
        var hasRdp = links.some(function(l) { return l.type === 'rdp'; });
        var hasVnc = links.some(function(l) { return l.type === 'vnc'; });
        var hasTelnet = links.some(function(l) { return l.type === 'telnet'; });
        
        // Helper para criar botões com label
        function makeButton(icon, label, bgGradient, textColor, onclick) {
            var style = 'display:inline-flex;flex-direction:column;align-items:center;justify-content:center;';
            style += 'min-width:40px;padding:4px 6px;';
            style += 'background:' + bgGradient + ';';
            style += 'color:' + textColor + ';border:none;border-radius:6px;';
            style += 'cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;';
            
            var btn = '<button onclick="' + onclick + '" style="' + style + '">';
            btn += '<span style="font-size:12px;line-height:1;">' + icon + '</span>';
            btn += '<span style="font-size:7px;font-weight:600;margin-top:1px;letter-spacing:0.3px;">' + label + '</span>';
            btn += '</button>';
            return btn;
        }
        
        // Web - via Guacamole (não link direto)
        if (hasWeb && ip) {
            html += makeButton('🌐', 'WEB', 'linear-gradient(135deg,#3b82f6,#1d4ed8)', 'white', 'DeviceDetail.openGuacamole(' + device.id + ', \'http\')');
        }
        
        // SSH - via Guacamole
        if (hasSsh && ip) {
            html += makeButton('>_', 'SSH', 'linear-gradient(135deg,#1e293b,#0f172a)', '#22c55e', 'DeviceDetail.openGuacamole(' + device.id + ', \'ssh\')');
        }
        
        // RDP - via Guacamole
        if (hasRdp && ip) {
            html += makeButton('🖥️', 'RDP', 'linear-gradient(135deg,#4f46e5,#3730a3)', 'white', 'DeviceDetail.openGuacamole(' + device.id + ', \'rdp\')');
        }
        
        // VNC - via Guacamole
        if (hasVnc && ip) {
            html += makeButton('🖼️', 'VNC', 'linear-gradient(135deg,#059669,#047857)', 'white', 'DeviceDetail.openGuacamole(' + device.id + ', \'vnc\')');
        }
        
        // Telnet - via Guacamole
        if (hasTelnet && ip) {
            html += makeButton('📡', 'TEL', 'linear-gradient(135deg,#ea580c,#9a3412)', 'white', 'DeviceDetail.openGuacamole(' + device.id + ', \'telnet\')');
        }
        
        // Edit button - sempre visível
        html += makeButton('✏️', 'EDIT', 'linear-gradient(135deg,#64748b,#475569)', 'white', 'DeviceDetail.editDevice(' + device.id + ')');
        
        return html;
    }

    /**
     * Build port visualization - estilo RJ45 real
     * Auto-sizes: shrinks panel for devices with few ports
     */
    function buildPortVisualization(device, ports, connections) {
        // Separar portas por tipo - lógica melhorada
        var lanPorts = [];
        var specialPorts = { wan: [], sfp: [], mgmt: [], console: [] };
        
        // Ordenar portas por número para processamento consistente
        var sortedPorts = ports.slice().sort(function(a, b) {
            var numA = parseInt((a.name || '').replace(/\D/g, '')) || 0;
            var numB = parseInt((b.name || '').replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        // Determinar quantas portas "normais" existem baseado na contagem total
        // Ex: Switch 48 portas + 4 SFP = 52 total, então porta 49+ são SFP
        var totalPorts = sortedPorts.length;
        var regularPortThreshold = totalPorts > 24 ? totalPorts - 4 : totalPorts; // Últimas 4 são geralmente SFP
        
        sortedPorts.forEach(function(port, index) {
            var portType = (port.type || '').toLowerCase();
            var portName = (port.name || '').toLowerCase();
            var portNum = parseInt(portName.replace(/\D/g, '')) || (index + 1);
            
            // Classificação por tipo explícito primeiro
            if (portType === 'wan' || portName.match(/^wan/i)) {
                specialPorts.wan.push(port);
            } else if (portType === 'console' || portName.match(/^(console|con|tty|serial|rs232)/i)) {
                specialPorts.console.push(port);
            } else if (portType === 'mgmt' || portType === 'management' || portName.match(/^(mgmt|management|oob|aux)/i)) {
                specialPorts.mgmt.push(port);
            } else if (portType === 'sfp' || portType === 'sfp+' || portName.match(/^(sfp|xfp|qsfp|fiber)/i)) {
                // SFP explícito no nome/tipo
                specialPorts.sfp.push(port);
            } else if (portName.match(/^(gb|ge|gig|10g|25g|40g|100g)/i)) {
                // Portas Gigabit/10G+ não numéricas vão para SFP
                specialPorts.sfp.push(port);
            } else if (totalPorts > 24 && portNum > regularPortThreshold) {
                // Portas altas em switches grandes são geralmente SFP
                specialPorts.sfp.push(port);
            } else {
                lanPorts.push(port);
            }
        });
        
        var hasSpecialPorts = specialPorts.wan.length > 0 || specialPorts.sfp.length > 0 || 
                              specialPorts.mgmt.length > 0 || specialPorts.console.length > 0;
        
        // Auto-size: for few ports, shrink panel to fit content instead of full width
        var isCompact = totalPorts < 6;
        var wrapperStyle = isCompact ? 'text-align:center;' : '';
        var panelStyle = 'background:linear-gradient(180deg,#374151,#1f2937);border-radius:10px;padding:12px;border:2px solid #4b5563;';
        if (isCompact) {
            panelStyle += 'display:inline-block;text-align:left;';
        }
        
        // Wrapper for centering compact panels
        var html = isCompact ? '<div style="' + wrapperStyle + '">' : '';
        
        // Container do switch
        html += '<div style="' + panelStyle + '">';
        
        // Brand label (sem PWR/SYS)
        html += '<div style="margin-bottom:10px;">';
        html += '<span style="color:#94a3b8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">' + 
                escapeHtml(device.brandModel || device.type || 'Network Device') + '</span>';
        html += '</div>';
        
        // Layout: LAN ports (principal) | Special ports à direita
        html += '<div style="display:flex;gap:8px;align-items:flex-start;">';
        
        // LAN ports section (principal, à esquerda)
        if (lanPorts.length > 0) {
            html += '<div style="flex:1;">';
            
            // Layout em 2 linhas só para switches muito grandes (>48 LAN ports)
            if (lanPorts.length > 48) {
                // Linha superior (portas ímpares 1,3,5...)
                html += '<div style="display:flex;gap:2px;margin-bottom:2px;">';
                for (var i = 0; i < lanPorts.length; i += 2) {
                    html += buildRJ45Port(lanPorts[i], connections);
                }
                html += '</div>';
                
                // Linha inferior (portas pares 2,4,6...)
                html += '<div style="display:flex;gap:2px;">';
                for (var j = 1; j < lanPorts.length; j += 2) {
                    html += buildRJ45Port(lanPorts[j], connections);
                }
                html += '</div>';
            } else {
                // Linha única (16, 24 etc cabem numa linha)
                html += '<div style="display:flex;gap:2px;flex-wrap:wrap;">';
                lanPorts.forEach(function(port) {
                    html += buildRJ45Port(port, connections);
                });
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // Special ports section (à direita, separado)
        if (hasSpecialPorts) {
            html += '<div style="flex-shrink:0;padding-left:12px;border-left:2px solid #4b5563;">';
            
            // Container com alinhamento no topo
            html += '<div style="display:flex;gap:16px;align-items:flex-start;">';
            
            // WAN ports
            if (specialPorts.wan.length > 0) {
                html += '<div style="text-align:center;">';
                html += '<div style="color:#f59e0b;font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:4px;white-space:nowrap;">WAN</div>';
                html += '<div style="display:flex;gap:3px;">';
                specialPorts.wan.forEach(function(port) {
                    html += buildRJ45Port(port, connections, '#f59e0b');
                });
                html += '</div></div>';
            }
            
            // SFP ports
            if (specialPorts.sfp.length > 0) {
                html += '<div style="text-align:center;">';
                html += '<div style="color:#a855f7;font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:4px;white-space:nowrap;">SFP</div>';
                html += '<div style="display:flex;gap:3px;">';
                specialPorts.sfp.forEach(function(port) {
                    html += buildSFPPort(port, connections);
                });
                html += '</div></div>';
            }
            
            // MGMT ports
            if (specialPorts.mgmt.length > 0) {
                html += '<div style="text-align:center;">';
                html += '<div style="color:#06b6d4;font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:4px;white-space:nowrap;">MGMT</div>';
                html += '<div style="display:flex;gap:3px;">';
                specialPorts.mgmt.forEach(function(port) {
                    html += buildRJ45Port(port, connections, '#06b6d4');
                });
                html += '</div></div>';
            }
            
            // Console ports
            if (specialPorts.console.length > 0) {
                html += '<div style="text-align:center;">';
                html += '<div style="color:#64748b;font-size:8px;font-weight:700;text-transform:uppercase;margin-bottom:4px;white-space:nowrap;">CON</div>';
                html += '<div style="display:flex;gap:3px;">';
                specialPorts.console.forEach(function(port) {
                    html += buildConsolePort(port, connections);
                });
                html += '</div></div>';
            }
            
            html += '</div>'; // fecha container
            html += '</div>'; // fecha special ports section
        }
        
        html += '</div></div>';
        
        // Close compact wrapper
        if (isCompact) html += '</div>';
        
        return html;
    }

    /**
     * Build port tooltip - informação da conexão
     * Mostra apenas info do destino: port ⟷ port | Device POS#YY RACK
     * Portas sem conexão não exibem tooltip
     */
    function buildPortTooltip(port, connections) {
        var isDisabled = port.status === 'inactive' || port.status === 'disabled';
        
        // Conexão info
        var conn = connections.find(function(c) {
            return c.fromPort === port.name || c.toPort === port.name;
        });
        
        // Se não tem conexão, sem tooltip (retorna vazio)
        if (!conn) {
            return '';
        }
        
        var tooltipParts = [];
        var isOutgoing = conn.from === currentDevice.id;
        var myPort = isOutgoing ? conn.fromPort : conn.toPort;
        var otherPort = isOutgoing ? conn.toPort : conn.fromPort;
        var otherDeviceId = isOutgoing ? conn.to : conn.from;
        
        if (otherDeviceId) {
            var otherDevice = findDevice(otherDeviceId);
            if (otherDevice) {
                var otherRack = otherDevice.rackId || '';
                var otherPos = otherDevice.rackPos ? 'POS#' + otherDevice.rackPos : '';
                var otherName = otherDevice.name || '';
                var otherInfo = [otherName, otherPos, otherRack].filter(Boolean).join(' ');
                
                // Formato: port ⟷ port | OtherDevice
                tooltipParts.push(myPort + ' ⟷ ' + (otherPort || '-') + ' | ' + otherInfo);
            }
        } else if (conn.externalDest) {
            tooltipParts.push(port.name + ' ⟷ ' + conn.externalDest);
        }
        
        // Info adicional
        if (port.vlan) tooltipParts.push('VLAN ' + port.vlan);
        if (isDisabled) tooltipParts.push('Disabled');
        
        return escapeHtml(tooltipParts.join(' | '));
    }

    /**
     * Build RJ45 port visual - estilo conector real
     */
    function buildRJ45Port(port, connections, forcedColor) {
        var hasConnection = connections.some(function(c) {
            return c.fromPort === port.name || c.toPort === port.name;
        });
        var isDisabled = port.status === 'inactive' || port.status === 'disabled';
        
        // Determinar cor baseado no status de conexão
        // Connected = verde, Disconnected = azul escuro
        var portColor;
        
        if (isDisabled) {
            portColor = '#1f2937'; // Cinza muito escuro (desativado)
        } else if (forcedColor && hasConnection) {
            portColor = forcedColor; // Cor forçada para portas especiais (WAN, MGMT)
        } else if (hasConnection) {
            portColor = '#22c55e'; // Verde para conectado
        } else {
            portColor = '#1e3a5a'; // Azul escuro para desconectado
        }
        
// Extrair apenas número da porta (sem eth, lan, etc)
        var portNum = port.name.replace(/\D/g, '') || '';
        
        // Usar função helper para tooltip completo
        var tooltip = buildPortTooltip(port, connections);
        
        // LED de atividade - VERDE = conectado, VERMELHO = desconectado
        var ledColor = isDisabled ? '#374151' : (hasConnection ? '#22c55e' : '#ef4444');
        
        // Visual RJ45 style
        var html = '<div class="port-rj45" data-port="' + escapeHtml(port.name) + '" ';
        html += 'style="position:relative;cursor:pointer;transition:transform 0.15s;" ';
        html += 'title="' + tooltip + '" ';
        html += 'onclick="DeviceDetail.showPortDetail(\'' + escapeHtml(port.name) + '\')">'; 
        
        // LED indicator
        html += '<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:8px;height:8px;border-radius:50%;background:' + ledColor + ';';
        if (!isDisabled) html += 'box-shadow:0 0 8px ' + ledColor + ';';
        html += '"></div>';
        
        // RJ45 body - formato de T invertido (26x34)
        html += '<div style="width:26px;height:34px;position:relative;">';
        
        // Tab superior (clip do RJ45)
        html += '<div style="position:absolute;top:0;left:4px;right:4px;height:9px;background:' + portColor + ';border-radius:3px 3px 0 0;opacity:0.7;"></div>';
        
        // Corpo principal
        html += '<div style="position:absolute;top:8px;left:0;right:0;bottom:0;background:' + portColor + ';border-radius:3px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);">';
        if (portNum) {
            html += '<span style="color:white;font-size:8px;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,0.5);">' + portNum + '</span>';
        }
        html += '</div>';
        
        html += '</div></div>';
        
        return html;
    }

    /**
     * Build SFP port visual
     */
    function buildSFPPort(port, connections) {
        var hasConnection = connections.some(function(c) {
            return c.fromPort === port.name || c.toPort === port.name;
        });
// Extrair apenas número (sem sfp, etc)
        var portNum = port.name.replace(/\D/g, '') || '';
        var color = hasConnection ? '#a855f7' : '#1e3a5a';
        
        // Tooltip completo
        var tooltip = buildPortTooltip(port, connections);
        
        // LED para SFP - vermelho se desconectado
        var ledColor = hasConnection ? '#a855f7' : '#ef4444';
        
        var html = '<div class="port-sfp" data-port="' + escapeHtml(port.name) + '" ';
        html += 'style="cursor:pointer;transition:transform 0.15s;position:relative;" ';
        html += 'title="' + tooltip + '" ';
        html += 'onclick="DeviceDetail.showPortDetail(\'' + escapeHtml(port.name) + '\')">'; 
        
        // LED indicator
        html += '<div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:8px;height:8px;border-radius:50%;background:' + ledColor + ';box-shadow:0 0 8px ' + ledColor + ';"></div>';
        
        // SFP cage style (36x26)
        html += '<div style="width:36px;height:26px;background:#1f2937;border:2px solid ' + color + ';border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative;">';
        // Inner slot
        html += '<div style="width:24px;height:14px;background:' + color + ';border-radius:2px;opacity:0.3;"></div>';
        if (portNum) {
            html += '<span style="position:absolute;color:' + (hasConnection ? '#a855f7' : '#94a3b8') + ';font-size:8px;font-weight:600;">' + portNum + '</span>';
        }
        html += '</div></div>';
        
        return html;
    }

    /**
     * Build Console port visual
     */
    function buildConsolePort(port, connections) {
        // Tooltip completo
        var tooltip = buildPortTooltip(port, connections);
        
        var html = '<div class="port-console" data-port="' + escapeHtml(port.name) + '" ';
        html += 'style="cursor:pointer;transition:transform 0.15s;" ';
        html += 'title="' + tooltip + '" ';
        html += 'onclick="DeviceDetail.showPortDetail(\'' + escapeHtml(port.name) + '\')">';
        
        // RJ45 console style (azul) (30x26)
        html += '<div style="width:30px;height:26px;background:#0369a1;border-radius:4px;display:flex;align-items:center;justify-content:center;">';
        html += '<span style="color:white;font-size:9px;font-weight:700;">CON</span>';
        html += '</div></div>';
        
        return html;
    }

    /**
     * Build network info section
     * @param {Array} addresses - IP addresses array
     * @param {string} gateway - Optional gateway (user-defined)
     * @param {string} mask - Optional mask (user-defined)
     */
    function buildNetworkInfo(addresses, gateway, mask) {
        if (!addresses || addresses.length === 0) {
            return '<div style="color:#94a3b8;font-size:11px;text-align:center;">No IP configured</div>';
        }
        
        var html = '';
        addresses.forEach(function(addr) {
            var ip = addr.ip || addr.network || 'N/A';
            var ipOnly = ip.split('/')[0];
            var zone = addr.zone || '';
            var zoneColor = zoneColors[zone] || '#64748b';
            
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:white;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:4px;">';
            html += '<div style="display:flex;align-items:center;gap:6px;">';
            
            if (zone) {
                html += '<span style="width:8px;height:8px;border-radius:50%;background:' + zoneColor + ';flex-shrink:0;"></span>';
            }
            
            html += '<span style="font-family:monospace;font-size:12px;font-weight:600;color:#1e293b;">' + escapeHtml(ip) + '</span>';
            
            if (zone) {
                html += '<span style="font-size:9px;padding:2px 6px;background:' + zoneColor + '20;color:' + zoneColor + ';border-radius:4px;font-weight:600;">' + escapeHtml(zone) + '</span>';
            }
            
            html += '</div>';
            html += '<button onclick="DeviceDetail.copyToClipboard(\'' + escapeHtml(ipOnly) + '\')" style="background:none;border:none;cursor:pointer;font-size:12px;color:#94a3b8;padding:2px;" title="Copy">📋</button>';
            html += '</div>';
        });
        
        // Show Gateway and Mask ONLY if explicitly configured (no assumptions!)
        if (gateway || mask) {
            html += '<div style="font-size:10px;color:#64748b;margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;">';
            if (gateway) {
                html += '<div>Gateway: <span style="font-family:monospace;font-weight:600;">' + escapeHtml(gateway) + '</span></div>';
            }
            if (mask) {
                html += '<div>Mask: <span style="font-family:monospace;font-weight:600;">' + escapeHtml(mask) + '</span></div>';
            }
            html += '</div>';
        }
        
        return html;
    }

    /**
     * Build VLAN/Zone summary - mostra apenas zonas que existem nas conexões
     */
    function buildVlanSummary(ports, connections) {
        // Extrair zonas únicas das conexões baseado no type
        var zones = {};
        
        connections.forEach(function(conn) {
            // Type da conexão é a zona
            var zone = (conn.type || '').toLowerCase();
            if (zone && zone !== 'unknown' && zone !== 'other') {
                // Capitalizar para display
                var displayZone = zone.charAt(0).toUpperCase() + zone.slice(1);
                zones[displayZone] = (zones[displayZone] || 0) + 1;
            }
        });
        
        // Se não há zonas, não mostrar nada
        if (Object.keys(zones).length === 0) {
            return '<div style="color:#94a3b8;font-size:10px;text-align:center;">Nessuna zona configurata</div>';
        }
        
        // Cores por zona (minúsculo para match)
        var zoneColorMap = {
            'Lan': '#22c55e',
            'Wan': '#f59e0b', 
            'Dmz': '#ef4444',
            'Vlan': '#3b82f6',
            'Trunk': '#8b5cf6',
            'Vpn': '#06b6d4',
            'Cloud': '#60a5fa',
            'Management': '#06b6d4',
            'Servers': '#8b5cf6',
            'Iot': '#a855f7',
            'Guest': '#f97316',
            'Voice': '#eab308',
            'Backup': '#78716c',
            'Fiber': '#14b8a6',
            'Test': '#ec4899',
            'Wallport': '#64748b',
            'External': '#f59e0b'
        };
        
        var html = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        
        // Ordenar zonas por nome
        Object.keys(zones).sort().forEach(function(zone) {
            var color = zoneColorMap[zone] || '#64748b';
            html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:white;border-radius:4px;border:1px solid ' + color + '40;font-size:9px;">';
            html += '<span style="width:6px;height:6px;border-radius:50%;background:' + color + ';"></span>';
            html += '<span style="font-weight:600;color:' + color + ';">' + zone.toUpperCase() + '</span>';
            html += '<span style="color:#64748b;">(' + zones[zone] + ')</span>';
            html += '</span>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Build connections list
     */
    function buildConnectionsList(device, connections) {
        if (connections.length === 0) {
            return '<div style="color:#94a3b8;font-size:11px;text-align:center;">No connections</div>';
        }
        
        var html = '<div style="max-height:150px;overflow-y:auto;">';
        
        connections.forEach(function(conn) {
            var isOutgoing = conn.from === device.id;
            var otherDeviceId = isOutgoing ? conn.to : conn.from;
            var myPort = isOutgoing ? conn.fromPort : conn.toPort;
            var otherPort = isOutgoing ? conn.toPort : conn.fromPort;
            
            var otherDeviceName = 'External';
            if (otherDeviceId) {
                var otherDevice = findDevice(otherDeviceId);
                otherDeviceName = otherDevice ? otherDevice.name : 'Device #' + otherDeviceId;
            } else if (conn.externalDest) {
                otherDeviceName = conn.externalDest;
            }
            
            html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:white;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:4px;font-size:11px;cursor:pointer;" ';
            if (otherDeviceId) {
                html += 'onclick="DeviceDetail.open(' + otherDeviceId + ')"';
            }
            html += '>';
            
            // My port (sem ":")
            html += '<span style="font-family:monospace;font-size:10px;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-weight:600;">' + escapeHtml(myPort || '-') + '</span>';
            
            // Arrow
            html += '<span style="color:' + (isOutgoing ? '#3b82f6' : '#22c55e') + ';font-weight:bold;">' + (isOutgoing ? '→' : '←') + '</span>';
            
            // Other device
            html += '<span style="flex:1;font-weight:500;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(otherDeviceName) + '</span>';
            
            // Other port (sem ":")
            if (otherPort) {
                html += '<span style="font-family:monospace;font-size:10px;background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;">' + escapeHtml(otherPort) + '</span>';
            }
            
            // Cable marker - estilo igual à tabela Connections (círculo colorido + texto)
            if (conn.cableMarker) {
                var cableColor = conn.cableColor || '#64748b';
                html += '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 8px;background:' + cableColor + '15;border:1px solid ' + cableColor + '40;border-radius:10px;">';
                html += '<span style="width:8px;height:8px;border-radius:50%;background:' + cableColor + ';"></span>';
                html += '<span style="color:' + cableColor + ';font-weight:600;">' + escapeHtml(conn.cableMarker) + '</span>';
                html += '</span>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Show port detail in bar
     */
    function showPortDetail(portName) {
        if (!currentDevice) return;
        
        var port = (currentDevice.ports || []).find(function(p) { return p.name === portName; });
        if (!port) return;
        
        var info = [port.name];
        if (port.type) info.push('Type: ' + port.type);
        if (port.vlan) info.push('VLAN: ' + port.vlan);
        if (port.status) info.push('Status: ' + port.status);
        
        // Connection info
        var conn = currentConnections.find(function(c) {
            return c.fromPort === portName || c.toPort === portName;
        });
        if (conn) {
            var otherDeviceId = conn.from === currentDevice.id ? conn.to : conn.from;
            if (otherDeviceId) {
                var otherDevice = findDevice(otherDeviceId);
                if (otherDevice) info.push('Connected to: ' + otherDevice.name);
            } else if (conn.externalDest) {
                info.push('Connected to: ' + conn.externalDest);
            }
        }
        
        var bar = document.getElementById('portDetailBar');
        if (bar) {
            bar.style.display = 'block';
            bar.innerHTML = '<strong>' + escapeHtml(port.name) + '</strong> &nbsp;|&nbsp; ' + 
                           info.slice(1).map(escapeHtml).join(' &nbsp;|&nbsp; ');
        }
    }

    /**
     * Copy to clipboard
     */
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                if (typeof Toast !== 'undefined') {
                    Toast.success('Copied: ' + text);
                }
            });
        }
    }

    /**
     * Edit device - fecha modal e vai para o topo da página
     */
    function editDevice(deviceId) {
        if (typeof Swal !== 'undefined' && Swal.isVisible()) {
            Swal.close();
        }
        if (typeof window.editDevice === 'function') {
            window.editDevice(deviceId);
            // Scroll para o topo absoluto da página
            setTimeout(function() {
                // Forçar scroll para o topo absoluto
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                
                // Depois focar no primeiro campo do formulário
                setTimeout(function() {
                    var nameField = document.getElementById('deviceName');
                    if (nameField) {
                        nameField.focus();
                    }
                }, 50);
            }, 150);
        }
    }

    /**
     * Open Guacamole session
     */
    function openGuacamole(deviceId, protocol) {
        var device = findDevice(deviceId);
        if (!device) return;
        
        var addresses = device.addresses || [];
        var ip = addresses.length > 0 ? (addresses[0].ip || addresses[0].network || '').split('/')[0] : '';
        
        if (!ip) {
            if (typeof Toast !== 'undefined') {
                Toast.warning('No IP configured for this device');
            }
            return;
        }
        
        // Try to use Guacamole API - endpoint correto conforme doc
        var apiPaths = ['/api/guacamole.php', './api/guacamole.php', 'api/guacamole.php'];
        
        function tryApi(pathIndex) {
            if (pathIndex >= apiPaths.length) {
                // Guacamole não disponível - mostrar erro
                if (typeof Toast !== 'undefined') {
                    Toast.error('❌ Guacamole integration not available.\n\nProtocol: ' + protocol.toUpperCase() + '\nIP: ' + ip + '\n\nPlease configure Guacamole:\n1. Check /config/guacamole.json\n2. Verify Guacamole is running on port 8080\n3. See /doc/GUACAMOLE_SETUP.md', 10000);
                } else {
                    alert('Guacamole integration not available.\n\nProtocol: ' + protocol.toUpperCase() + '\nIP: ' + ip + '\n\nPlease configure Guacamole.');
                }
                return;
            }
            
            fetch(apiPaths[pathIndex], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'connect',
                    device: { 
                        ip: ip,
                        name: device.name || 'Device'
                    },
                    ip: ip,  // Compatibilidade com guacamole.php (Apache)
                    protocol: protocol,
                    deviceName: device.name || 'Device'  // Compatibilidade com guacamole.php
                })
            }).then(function(r) {
                return r.json();
            }).then(function(data) {
                if (data.success && data.url) {
                    // Abrir em popup com tamanho adequado para cada protocolo
                    var width, height, windowName;
                    
                    if (protocol === 'ssh' || protocol === 'telnet') {
                        // Terminal: janela estilo CMD/terminal
                        width = 900;
                        height = 600;
                        windowName = 'guac_terminal_' + deviceId;
                    } else if (protocol === 'rdp') {
                        // RDP: tela grande (quase fullscreen)
                        width = Math.min(1920, screen.width - 100);
                        height = Math.min(1080, screen.height - 100);
                        windowName = 'guac_rdp_' + deviceId;
                    } else if (protocol === 'vnc') {
                        // VNC: tela média-grande
                        width = Math.min(1280, screen.width - 100);
                        height = Math.min(900, screen.height - 100);
                        windowName = 'guac_vnc_' + deviceId;
                    } else {
                        // HTTP/outros: aba normal
                        window.open(data.url, '_blank');
                        return;
                    }
                    
                    // Calcular posição central
                    var left = Math.max(0, (screen.width - width) / 2);
                    var top = Math.max(0, (screen.height - height) / 2);
                    
                    // Abrir popup com características de janela
                    var features = 'width=' + width + ',height=' + height + 
                                   ',left=' + left + ',top=' + top +
                                   ',menubar=no,toolbar=no,location=no,status=no' +
                                   ',resizable=yes,scrollbars=no';
                    
                    window.open(data.url, windowName, features);
                } else if (data.error) {
                    if (typeof Toast !== 'undefined') {
                        Toast.error('❌ Guacamole: ' + data.error, 6000);
                    }
                    tryApi(pathIndex + 1);
                } else {
                    tryApi(pathIndex + 1);
                }
            }).catch(function(err) {
                tryApi(pathIndex + 1);
            });
        }
        
        tryApi(0);
    }

    /**
     * Bind port hover/click events
     */
    function bindPortEvents() {
        var ports = document.querySelectorAll('.port-rj45, .port-sfp, .port-console');
        ports.forEach(function(port) {
            port.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.15)';
            });
            port.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * Go to floor plan
     */
    function goToFloorPlan(location) {
        if (typeof Swal !== 'undefined' && Swal.isVisible()) {
            Swal.close();
        }
        if (typeof FloorPlan !== 'undefined' && location) {
            FloorPlan.showRoomInfo(location);
        }
    }

    // Legacy build functions for non-SweetAlert fallback
    function buildHeader(device) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;">' +
               '<h2 class="text-xl font-bold">' + escapeHtml(device.name) + '</h2>' +
               '<button onclick="DeviceDetail.close()" class="text-white text-2xl">&times;</button></div>';
    }

    function buildContent(device, connections) {
        return buildPortVisualization(device, device.ports || [], connections) +
               '<div class="grid grid-cols-2 gap-4 mt-4">' +
               '<div>' + buildNetworkInfo(device.addresses || [], device.gateway, device.mask) + '</div>' +
               '<div>' + buildConnectionsList(device, connections) + '</div></div>';
    }

    // Public API
    return {
        open: open,
        close: close,
        showPortDetail: showPortDetail,
        copyToClipboard: copyToClipboard,
        editDevice: editDevice,
        openGuacamole: openGuacamole,
        goToFloorPlan: goToFloorPlan
    };

})();

// Make available globally
window.DeviceDetail = DeviceDetail;
