/**
 * Device Detail Modal - TIESSE Matrix Network
 * Version: 3.6.028
 * Shows complete device information with port visualization and VLAN colors
 */

var DeviceDetail = (function() {
    'use strict';

    // VLAN color palette
    var vlanColors = {
        100: { color: '#3b82f6', label: 'Management', bg: 'bg-blue-500' },
        151: { color: '#22c55e', label: 'Users', bg: 'bg-green-500' },
        200: { color: '#eab308', label: 'VoIP', bg: 'bg-yellow-500' },
        300: { color: '#a855f7', label: 'Servers', bg: 'bg-purple-500' },
        999: { color: '#ef4444', label: 'Trunk', bg: 'bg-red-500' },
        1: { color: '#94a3b8', label: 'Native', bg: 'bg-slate-400' }
    };

    // Default colors for unknown VLANs
    var defaultVlanColors = [
        { color: '#f97316', bg: 'bg-orange-500' },
        { color: '#14b8a6', bg: 'bg-teal-500' },
        { color: '#ec4899', bg: 'bg-pink-500' },
        { color: '#8b5cf6', bg: 'bg-violet-500' },
        { color: '#06b6d4', bg: 'bg-cyan-500' }
    ];

    var currentDevice = null;
    var currentConnections = [];

    /**
     * Open the device detail modal
     * @param {number|object} deviceOrId - Device object or device ID
     */
    function open(deviceOrId) {
        var device = typeof deviceOrId === 'object' ? deviceOrId : findDevice(deviceOrId);
        if (!device) {
            console.error('Device not found:', deviceOrId);
            return;
        }

        currentDevice = device;
        currentConnections = getDeviceConnections(device.id);

        renderModal(device);
        document.getElementById('deviceDetailModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the device detail modal
     * @param {Event} event - Click event
     */
    function close(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('deviceDetailModal').classList.add('hidden');
        document.body.style.overflow = '';
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
     * Get all connections for a device
     */
    function getDeviceConnections(deviceId) {
        if (!window.appState || !window.appState.connections) return [];
        return window.appState.connections.filter(function(c) {
            return c.from === deviceId || c.to === deviceId;
        });
    }

    /**
     * Get room number for location
     */
    function getRoomNumber(locationName) {
        if (!locationName || !window.appState) return '';
        
        // Search in rooms
        if (window.appState.rooms) {
            var room = window.appState.rooms.find(function(r) {
                return r.nickname === locationName || r.name === locationName;
            });
            if (room && room.id !== undefined) {
                return String(room.id).padStart(2, '0');
            }
        }
        
        // Search in locations
        if (window.appState.locations) {
            var loc = window.appState.locations.find(function(l) {
                return l.name === locationName;
            });
            if (loc && loc.code !== undefined) {
                return String(loc.code).padStart(2, '0');
            }
        }
        
        return '';
    }

    /**
     * Format location with room number
     */
    function formatLocation(location) {
        if (!location) return 'N/A';
        var roomNum = getRoomNumber(location);
        return roomNum ? roomNum + ' - ' + location : location;
    }

    /**
     * Get device icon SVG (large version)
     */
    function getDeviceIcon(type) {
        if (window.SVGTopology && window.SVGTopology.getLargeIcon) {
            return window.SVGTopology.getLargeIcon(type);
        }
        // Fallback emoji
        var icons = {
            router: '🔲', switch: '🔳', server: '🖥️', firewall: '🛡️',
            ap: '📡', printer: '🖨️', pc: '💻', ip_phone: '📞',
            nas: '💾', camera: '📹', tv: '📺', others: '📦'
        };
        return '<span style="font-size:48px;">' + (icons[type] || icons.others) + '</span>';
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        var colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            maintenance: 'bg-yellow-100 text-yellow-800'
        };
        var icons = { active: '🟢', inactive: '🔴', maintenance: '🟡' };
        var statusClass = colors[status] || colors.inactive;
        var icon = icons[status] || '⚪';
        return '<span class="px-2 py-1 rounded-full text-xs font-medium ' + statusClass + '">' + 
               icon + ' ' + (status || 'unknown').charAt(0).toUpperCase() + (status || 'unknown').slice(1) + '</span>';
    }

    /**
     * Format device type label
     */
    function formatTypeLabel(type) {
        if (!type) return 'Unknown';
        var labels = {
            router: 'Router', switch: 'Switch', server: 'Server', firewall: 'Firewall',
            ap: 'Access Point', router_wifi: 'Router WiFi', ip_phone: 'IP Phone',
            printer: 'Printer', pc: 'PC', nas: 'NAS', camera: 'Camera', tv: 'TV/Display',
            isp: 'ISP', wallbox: 'Wallbox', others: 'Other'
        };
        return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    }

    /**
     * Build VLAN color map for device ports
     */
    function buildVlanColorMap(ports) {
        var vlansFound = {};
        var colorIndex = 0;

        ports.forEach(function(port) {
            if (port.vlan && !vlansFound[port.vlan] && !vlanColors[port.vlan]) {
                vlansFound[port.vlan] = defaultVlanColors[colorIndex % defaultVlanColors.length];
                colorIndex++;
            }
        });

        return Object.assign({}, vlanColors, vlansFound);
    }

    /**
     * Get port color based on VLAN and status
     */
    function getPortColor(port, vlanColorMap, connections) {
        if (port.status === 'inactive' || port.status === 'disabled') {
            return { color: '#1f2937', symbol: '⬛', label: 'Disabled' };
        }

        // Check if port has connection
        var hasConnection = connections.some(function(c) {
            return c.fromPort === port.name || c.toPort === port.name;
        });

        if (!hasConnection && !port.vlan) {
            return { color: '#d1d5db', symbol: '○', label: 'Free' };
        }

        if (port.vlan && vlanColorMap[port.vlan]) {
            return { 
                color: vlanColorMap[port.vlan].color, 
                symbol: '●', 
                label: 'VLAN ' + port.vlan 
            };
        }

        // Connected but no VLAN
        return { color: '#94a3b8', symbol: '●', label: 'Native' };
    }

    /**
     * Render port map visualization
     */
    function renderPortMap(device, connections) {
        var ports = device.ports || [];
        if (ports.length === 0) {
            return '<div class="text-center text-slate-400 py-4">No ports configured</div>';
        }

        var vlanColorMap = buildVlanColorMap(ports);
        var portsPerRow = ports.length <= 12 ? ports.length : Math.ceil(ports.length / 2);
        
        // Split ports into rows
        var rows = [];
        for (var i = 0; i < ports.length; i += portsPerRow) {
            rows.push(ports.slice(i, i + portsPerRow));
        }

        var html = '<div class="bg-slate-800 rounded-lg p-4 mb-4">';
        html += '<div class="text-center text-slate-300 text-sm mb-3 font-medium">' + 
                (device.brandModel || device.name) + ' (' + ports.length + ' ports)</div>';
        
        rows.forEach(function(row, rowIndex) {
            html += '<div class="flex justify-center gap-1 mb-2">';
            row.forEach(function(port) {
                var portColor = getPortColor(port, vlanColorMap, connections);
                var portNum = port.name.replace(/\D/g, '') || port.name;
                html += '<div class="port-box cursor-pointer hover:scale-110 transition-transform" ' +
                        'onclick="DeviceDetail.showPortDetail(\'' + port.name + '\')" ' +
                        'title="' + port.name + (port.vlan ? ' - VLAN ' + port.vlan : '') + '">' +
                        '<div class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" ' +
                        'style="background-color: ' + portColor.color + '; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">' +
                        portNum + '</div></div>';
            });
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Render VLAN summary
     */
    function renderVlanSummary(device, connections) {
        var ports = device.ports || [];
        var vlanColorMap = buildVlanColorMap(ports);
        var vlanGroups = {};
        var freePorts = [];
        var disabledPorts = [];

        ports.forEach(function(port) {
            var hasConnection = connections.some(function(c) {
                return c.fromPort === port.name || c.toPort === port.name;
            });

            if (port.status === 'inactive' || port.status === 'disabled') {
                disabledPorts.push(port.name);
            } else if (port.vlan) {
                if (!vlanGroups[port.vlan]) {
                    vlanGroups[port.vlan] = [];
                }
                vlanGroups[port.vlan].push(port.name);
            } else if (!hasConnection) {
                freePorts.push(port.name);
            } else {
                // Connected but no VLAN - Native
                if (!vlanGroups['native']) {
                    vlanGroups['native'] = [];
                }
                vlanGroups['native'].push(port.name);
            }
        });

        var html = '<div class="bg-slate-50 rounded-lg p-3">';
        html += '<h4 class="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">📊 VLANs</h4>';
        html += '<div class="space-y-2">';

        // Render VLAN groups
        Object.keys(vlanGroups).sort(function(a, b) {
            if (a === 'native') return 1;
            if (b === 'native') return -1;
            return parseInt(a) - parseInt(b);
        }).forEach(function(vlanId) {
            var vlanPorts = vlanGroups[vlanId];
            var vlanInfo = vlanId === 'native' ? 
                { color: '#94a3b8', label: 'Native/Access' } : 
                (vlanColorMap[vlanId] || { color: '#94a3b8', label: 'VLAN ' + vlanId });
            
            html += '<div class="flex items-center justify-between bg-white rounded px-2 py-1.5 border border-slate-200">';
            html += '<div class="flex items-center gap-2">';
            html += '<span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ' + vlanInfo.color + ';"></span>';
            html += '<span class="text-sm font-medium text-slate-700">' + (vlanId === 'native' ? 'Native' : 'VLAN ' + vlanId) + '</span>';
            if (vlanInfo.label && vlanId !== 'native' && vlanInfo.label !== 'VLAN ' + vlanId) {
                html += '<span class="text-xs text-slate-400">(' + vlanInfo.label + ')</span>';
            }
            html += '</div>';
            html += '<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">' + vlanPorts.length + ' ports</span>';
            html += '</div>';
        });

        // Free ports
        if (freePorts.length > 0) {
            html += '<div class="flex items-center justify-between bg-white rounded px-2 py-1.5 border border-green-200">';
            html += '<div class="flex items-center gap-2">';
            html += '<span class="w-3 h-3 rounded-full flex-shrink-0 border-2 border-green-400 bg-green-50"></span>';
            html += '<span class="text-sm font-medium text-green-700">Free</span>';
            html += '</div>';
            html += '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">' + freePorts.length + ' ports</span>';
            html += '</div>';
        }

        // Disabled ports
        if (disabledPorts.length > 0) {
            html += '<div class="flex items-center justify-between bg-white rounded px-2 py-1.5 border border-slate-300">';
            html += '<div class="flex items-center gap-2">';
            html += '<span class="w-3 h-3 rounded-full flex-shrink-0 bg-slate-800"></span>';
            html += '<span class="text-sm font-medium text-slate-500">Disabled</span>';
            html += '</div>';
            html += '<span class="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">' + disabledPorts.length + ' ports</span>';
            html += '</div>';
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Format port list (compress ranges)
     */
    function formatPortList(ports) {
        if (ports.length === 0) return '';
        if (ports.length <= 4) return ports.join(', ');
        
        // Try to compress sequential numbers
        var nums = ports.map(function(p) { return parseInt(p.replace(/\D/g, '') || 0); }).sort(function(a,b) { return a-b; });
        var result = [];
        var start = nums[0], prev = nums[0];
        
        for (var i = 1; i <= nums.length; i++) {
            if (i === nums.length || nums[i] !== prev + 1) {
                if (start === prev) {
                    result.push(String(start));
                } else {
                    result.push(start + '-' + prev);
                }
                if (i < nums.length) {
                    start = nums[i];
                    prev = nums[i];
                }
            } else {
                prev = nums[i];
            }
        }
        
        return result.join(', ');
    }

    /**
     * Render connections list
     */
    function renderConnections(device, connections) {
        var html = '<div class="bg-slate-50 rounded-lg p-3">';
        html += '<h4 class="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">';
        html += '🔗 Connections <span class="ml-auto text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">' + connections.length + '</span></h4>';

        if (connections.length === 0) {
            html += '<div class="text-slate-400 text-sm text-center py-2">No connections configured</div>';
        } else {
            html += '<div class="space-y-1.5 max-h-48 overflow-y-auto">';
            connections.forEach(function(conn) {
                var isOutgoing = conn.from === device.id;
                var otherDeviceId = isOutgoing ? conn.to : conn.from;
                var myPort = isOutgoing ? conn.fromPort : conn.toPort;
                var otherPort = isOutgoing ? conn.toPort : conn.fromPort;
                var arrow = isOutgoing ? '→' : '←';
                var arrowColor = isOutgoing ? 'text-blue-500' : 'text-green-500';
                
                var otherDeviceName = 'External';
                if (otherDeviceId) {
                    var otherDevice = findDevice(otherDeviceId);
                    otherDeviceName = otherDevice ? otherDevice.name : 'Device #' + otherDeviceId;
                } else if (conn.externalDest) {
                    otherDeviceName = conn.externalDest;
                }

                html += '<div class="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer" ' +
                        'onclick="' + (otherDeviceId ? 'DeviceDetail.open(' + otherDeviceId + ')' : '') + '">';
                
                // My port
                html += '<span class="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium min-w-[50px] text-center">' + (myPort || '-') + '</span>';
                
                // Arrow
                html += '<span class="' + arrowColor + ' font-bold text-sm">' + arrow + '</span>';
                
                // Other device and port
                html += '<div class="flex-1 min-w-0">';
                html += '<span class="text-sm text-slate-700 truncate block">' + otherDeviceName + '</span>';
                html += '</div>';
                
                // Other port
                if (otherPort) {
                    html += '<span class="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">:' + otherPort + '</span>';
                }
                
                // Cable marker
                if (conn.cableMarker) {
                    html += '<span class="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">' + conn.cableMarker + '</span>';
                }
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Render network info
     */
    function renderNetworkInfo(device) {
        var addresses = device.addresses || [];
        var html = '<div class="bg-slate-50 rounded-lg p-3">';
        html += '<h4 class="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">🌐 Network</h4>';

        if (addresses.length === 0) {
            html += '<div class="text-slate-400 text-sm text-center py-2">No IP configured</div>';
        } else {
            html += '<div class="space-y-1.5">';
            addresses.forEach(function(addr) {
                var ip = addr.ip || addr.network || 'N/A';
                var ipOnly = ip.split('/')[0];
                html += '<div class="flex items-center justify-between bg-white rounded px-2 py-1.5 border border-slate-200">';
                html += '<div class="flex items-center gap-2">';
                html += '<span class="font-mono text-sm text-slate-800 font-medium">' + ip + '</span>';
                if (addr.vlan) {
                    html += '<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">VLAN ' + addr.vlan + '</span>';
                }
                html += '</div>';
                html += '<button onclick="DeviceDetail.copyToClipboard(\'' + ipOnly + '\'); event.stopPropagation();" ' +
                        'class="text-slate-400 hover:text-blue-600 text-xs px-1" title="Copy IP">📋</button>';
                html += '</div>';
            });
            html += '</div>';

            // Gateway - try to derive from first IP
            if (addresses[0].network) {
                var ip = addresses[0].network.split('/')[0];
                var parts = ip.split('.');
                if (parts.length === 4) {
                    parts[3] = '1';
                    html += '<div class="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">';
                    html += '<span class="font-medium">Gateway:</span> ' + parts.join('.') + '</div>';
                }
            }
        }

        html += '</div>';
        return html;
    }

    /**
     * Render quick action links
     * Only shows buttons for protocols that are configured in device.links
     */
    function renderLinks(device) {
        var links = device.links || [];
        var addresses = device.addresses || [];
        var html = '';
        var ip = addresses.length > 0 ? (addresses[0].ip || addresses[0].network || '').split('/')[0] : '';

        // Check which protocols are configured
        var hasWeb = links.some(function(l) { return l.type === 'http' || l.type === 'https' || l.type === 'web'; });
        var hasSsh = links.some(function(l) { return l.type === 'ssh'; });
        var hasRdp = links.some(function(l) { return l.type === 'rdp'; });
        var hasVnc = links.some(function(l) { return l.type === 'vnc'; });
        var hasTelnet = links.some(function(l) { return l.type === 'telnet'; });

        // No buttons if no links configured
        if (!hasWeb && !hasSsh && !hasRdp && !hasVnc && !hasTelnet) {
            return '';
        }

        html += '<div class="flex flex-wrap gap-2 mt-3">';
        
        // Web access - only if web link is configured
        if (hasWeb) {
            var webLink = links.find(function(l) { return l.type === 'http' || l.type === 'https' || l.type === 'web'; });
            var url = webLink ? webLink.url : 'http://' + ip;
            if (!url.startsWith('http')) url = 'http://' + url;
            html += '<a href="' + url + '" target="_blank" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">' +
                    '🌐 Web</a>';
        }

        // SSH - only if configured in links
        if (hasSsh && ip) {
            html += '<button onclick="DeviceDetail.openGuacamole(' + device.id + ', \'ssh\')" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 transition-colors" ' +
                    'title="Open SSH session">' +
                    '🔐 SSH</button>';
        }
        
        // RDP - only if configured in links
        if (hasRdp && ip) {
            html += '<button onclick="DeviceDetail.openGuacamole(' + device.id + ', \'rdp\')" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors" ' +
                    'title="Open RDP session">' +
                    '🖥️ RDP</button>';
        }
        
        // VNC - only if configured in links
        if (hasVnc && ip) {
            html += '<button onclick="DeviceDetail.openGuacamole(' + device.id + ', \'vnc\')" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors" ' +
                    'title="Open VNC session">' +
                    '🖼️ VNC</button>';
        }
        
        // Telnet - only if configured in links
        if (hasTelnet && ip) {
            html += '<button onclick="DeviceDetail.openGuacamole(' + device.id + ', \'telnet\')" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors" ' +
                    'title="Open Telnet session">' +
                    '📟 Telnet</button>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Render notes section
     */
    function renderNotes(device) {
        var notes = device.notes || device.service || '';
        if (!notes) return '';
        
        return '<div class="mt-3 pt-3 border-t border-slate-200">' +
               '<h4 class="font-semibold text-slate-700 flex items-center gap-2 mb-1">📝 Notes</h4>' +
               '<div class="text-sm text-slate-600">' + notes + '</div>' +
               '</div>';
    }

    /**
     * Render complete modal
     */
    function renderModal(device) {
        // Header
        var headerHtml = '<div class="flex items-start justify-between">';
        headerHtml += '<div class="flex items-center gap-4">';
        headerHtml += '<div class="bg-white bg-opacity-10 p-2 rounded-lg">' + getDeviceIcon(device.type) + '</div>';
        headerHtml += '<div>';
        headerHtml += '<h2 class="text-xl font-bold">' + device.name + '</h2>';
        headerHtml += '<div class="flex items-center gap-2 mt-1 text-sm text-slate-300">';
        headerHtml += '<span>' + formatTypeLabel(device.type) + '</span>';
        headerHtml += '<span>•</span>';
        headerHtml += getStatusBadge(device.status);
        headerHtml += '<span>•</span>';
        headerHtml += '<span>📍 ' + formatLocation(device.location) + '</span>';
        if (device.rackId) {
            headerHtml += '<span>•</span>';
            headerHtml += '<span>🗄️ ' + device.rackId + (device.order ? ' #' + device.order : '') + '</span>';
        }
        headerHtml += '</div>';
        headerHtml += '</div></div>';
        headerHtml += '<button onclick="DeviceDetail.close()" class="text-white hover:text-slate-300 text-2xl font-bold leading-none">&times;</button>';
        headerHtml += '</div>';
        
        // Quick links
        headerHtml += '<div class="mt-3">' + renderLinks(device) + '</div>';

        document.getElementById('deviceDetailHeader').innerHTML = headerHtml;

        // Content - Port map + Info columns
        var contentHtml = '';
        
        // Port map
        contentHtml += renderPortMap(device, currentConnections);

        // Two columns: VLAN summary + Connections
        contentHtml += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        
        // Left column: VLANs + Network
        contentHtml += '<div class="space-y-4">';
        contentHtml += renderVlanSummary(device, currentConnections);
        contentHtml += renderNetworkInfo(device);
        contentHtml += '</div>';
        
        // Right column: Connections + Notes
        contentHtml += '<div class="space-y-4">';
        contentHtml += renderConnections(device, currentConnections);
        contentHtml += renderNotes(device);
        contentHtml += '</div>';
        
        contentHtml += '</div>';

        document.getElementById('deviceDetailContent').innerHTML = contentHtml;
        
        // Reset port detail bar
        document.getElementById('deviceDetailPortBar').classList.add('hidden');
    }

    /**
     * Show port detail in bottom bar
     */
    function showPortDetail(portName) {
        if (!currentDevice) return;
        
        var port = (currentDevice.ports || []).find(function(p) { return p.name === portName; });
        if (!port) return;

        var connection = currentConnections.find(function(c) {
            return c.fromPort === portName || c.toPort === portName;
        });

        var html = '<span class="font-semibold">' + port.name + '</span>';
        
        if (port.vlan) {
            html += ' <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">VLAN ' + port.vlan + '</span>';
        }
        
        if (port.status) {
            var statusColors = { active: 'text-green-600', inactive: 'text-red-600', disabled: 'text-slate-500' };
            html += ' <span class="' + (statusColors[port.status] || '') + '">' + port.status + '</span>';
        }

        if (connection) {
            var isOutgoing = connection.from === currentDevice.id;
            var otherDeviceId = isOutgoing ? connection.to : connection.from;
            var otherPort = isOutgoing ? connection.toPort : connection.fromPort;
            var arrow = isOutgoing ? '→' : '←';
            
            var otherDeviceName = 'External';
            if (otherDeviceId) {
                var otherDevice = findDevice(otherDeviceId);
                otherDeviceName = otherDevice ? otherDevice.name : 'Device #' + otherDeviceId;
            } else if (connection.externalDest) {
                otherDeviceName = connection.externalDest;
            }

            html += ' <span class="text-slate-400 mx-2">│</span> ';
            html += '<span>' + arrow + ' ' + otherDeviceName;
            if (otherPort) html += ':' + otherPort;
            html += '</span>';

            if (connection.cableMarker) {
                html += ' <span class="bg-slate-200 px-2 py-0.5 rounded text-xs">Cable: ' + connection.cableMarker + '</span>';
            }
            if (connection.type) {
                html += ' <span class="text-slate-500 text-xs">' + connection.type.toUpperCase() + '</span>';
            }
        } else {
            html += ' <span class="text-slate-400 ml-2">No connection</span>';
        }

        document.getElementById('deviceDetailPortInfo').innerHTML = html;
        document.getElementById('deviceDetailPortBar').classList.remove('hidden');
    }

    /**
     * Copy text to clipboard (with fallback for HTTP)
     */
    function copyToClipboard(text) {
        // Try modern API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(function() {
                    showCopySuccess(text);
                })
                .catch(function() {
                    // Fallback for HTTP or permission denied
                    fallbackCopy(text);
                });
        } else {
            // Fallback for older browsers
            fallbackCopy(text);
        }
    }
    
    /**
     * Fallback copy using execCommand
     */
    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopySuccess(text);
        } catch (err) {
            console.error('Copy failed:', err);
            if (window.Swal) {
                Swal.fire({
                    icon: 'info',
                    title: 'Copy manually',
                    text: text,
                    confirmButtonText: 'OK'
                });
            } else {
                prompt('Copy this:', text);
            }
        }
        document.body.removeChild(textarea);
    }
    
    /**
     * Show copy success notification
     */
    function showCopySuccess(text) {
        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: text,
                timer: 1500,
                showConfirmButton: false
            });
        }
    }

    /**
     * Navigate to floor plan
     */
    function goToFloorPlan(deviceId) {
        close();
        // Switch to floor plan tab and highlight device
        if (window.switchTab) {
            window.switchTab('floorplan');
        }
        // Try to highlight/select the device
        setTimeout(function() {
            if (window.FloorPlan && window.FloorPlan.selectDevice) {
                window.FloorPlan.selectDevice(deviceId);
            }
        }, 300);
    }

    /**
     * Open device edit form
     */
    function editDevice(deviceId) {
        close();
        // Switch to devices tab and open edit
        if (window.switchTab) {
            window.switchTab('devices');
        }
        setTimeout(function() {
            if (window.editDevice) {
                window.editDevice(deviceId);
            }
        }, 300);
    }

    // Guacamole configuration cache
    var guacamoleConfig = null;

    /**
     * Load Guacamole configuration
     * Works with both Apache (static file) and Node.js (API)
     */
    function loadGuacamoleConfig() {
        if (guacamoleConfig !== null) {
            return Promise.resolve(guacamoleConfig);
        }
        
        // Try multiple paths to find config (works with both Node.js and Apache)
        var paths = [
            'api/guacamole-config.php',        // PHP endpoint (Apache - preferred)
            '/matrix/api/guacamole-config.php', // Apache with /matrix/ prefix
            'config/guacamole.json',           // Relative path (Node.js dev)
            '/matrix/config/guacamole.json'    // Apache direct JSON access
        ];
        
        function tryFetch(pathIndex) {
            if (pathIndex >= paths.length) {
                console.warn('[Guacamole] Config not found in any location');
                guacamoleConfig = { enabled: false };
                return Promise.resolve(guacamoleConfig);
            }
            
            return fetch(paths[pathIndex])
                .then(function(response) {
                    if (!response.ok) throw new Error('Not found');
                    return response.json();
                })
                .then(function(config) {
                    console.log('[Guacamole] Config loaded from:', paths[pathIndex]);
                    guacamoleConfig = {
                        enabled: config.enabled !== false,
                        baseUrl: config.server ? config.server.baseUrl : null,
                        protocols: config.ui ? config.ui.showProtocolButtons : ['ssh', 'rdp', 'vnc', 'telnet'],
                        openInNewTab: config.ui ? config.ui.openInNewTab : true
                    };
                    return guacamoleConfig;
                })
                .catch(function() {
                    return tryFetch(pathIndex + 1);
                });
        }
        
        return tryFetch(0);
    }

    /**
     * Open Guacamole connection via API
     * Creates connection automatically if it doesn't exist
     */
    function openGuacamole(deviceId, protocol) {
        var device = findDevice(deviceId);
        if (!device) {
            console.error('Device not found:', deviceId);
            return;
        }

        // Get IP address
        var addresses = device.addresses || [];
        var ip = addresses.length > 0 ? (addresses[0].ip || addresses[0].network || '').split('/')[0] : '';
        
        if (!ip) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No IP Address',
                    text: 'This device has no IP address configured.',
                    confirmButtonText: 'OK'
                });
            } else {
                alert('This device has no IP address configured.');
            }
            return;
        }

        // Show loading
        if (window.Swal) {
            Swal.fire({
                title: 'Connecting...',
                html: '<div class="text-sm">' + device.name + '<br>' + protocol.toUpperCase() + ' → ' + ip + '</div>',
                allowOutsideClick: false,
                didOpen: function() {
                    Swal.showLoading();
                }
            });
        }

        // Call API to create/get connection
        var apiPaths = [
            'api/guacamole.php',
            '/matrix/api/guacamole.php'
        ];
        var lastError = '';
        
        function tryApi(pathIndex) {
            if (pathIndex >= apiPaths.length) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Connection Error',
                        html: '<p>Unable to connect to Guacamole.</p>' +
                              '<p class="text-sm text-red-600 mt-2">' + (lastError || 'Unknown error') + '</p>',
                        confirmButtonText: 'OK'
                    });
                }
                return;
            }
            
            fetch(apiPaths[pathIndex], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'connect',
                    ip: ip,
                    protocol: protocol,
                    deviceName: device.name
                })
            })
            .then(function(response) {
                return response.json().then(function(data) {
                    if (!response.ok || data.error) {
                        var errMsg = data.error || ('HTTP ' + response.status);
                        if (data.detail) errMsg += ': ' + data.detail;
                        throw new Error(errMsg);
                    }
                    return data;
                });
            })
            .then(function(data) {
                if (data.url) {
                    // Success - open Guacamole
                    if (window.Swal) {
                        Swal.fire({
                            icon: 'success',
                            title: '🖥️ ' + protocol.toUpperCase(),
                            html: '<div class="text-left">' +
                                  '<div class="bg-slate-100 rounded p-3 font-mono text-sm">' +
                                  '<div><b>' + device.name + '</b></div>' +
                                  '<div class="text-blue-600">' + ip + '</div>' +
                                  '</div>' +
                                  '<p class="text-sm text-slate-600 mt-2">Opening Guacamole...</p>' +
                                  '</div>',
                            timer: 1500,
                            timerProgressBar: true,
                            showConfirmButton: false
                        });
                    }
                    
                    // Open in popup window with fixed size (similar to PuTTY)
                    setTimeout(function() {
                        var width = protocol === 'rdp' ? 1024 : 850;
                        var height = protocol === 'rdp' ? 768 : 550;
                        var left = (screen.width - width) / 2;
                        var top = (screen.height - height) / 2;
                        var windowName = 'guac_' + device.id + '_' + protocol;
                        var features = 'width=' + width + ',height=' + height + 
                                      ',left=' + left + ',top=' + top +
                                      ',menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no';
                        window.open(data.url, windowName, features);
                    }, 500);
                } else {
                    throw new Error('URL not returned');
                }
            })
            .catch(function(err) {
                console.warn('Guacamole API error at', apiPaths[pathIndex], ':', err.message);
                lastError = err.message;
                // Try next path
                tryApi(pathIndex + 1);
            });
        }
        
        tryApi(0);
    }

    // Public API
    return {
        open: open,
        close: close,
        showPortDetail: showPortDetail,
        copyToClipboard: copyToClipboard,
        goToFloorPlan: goToFloorPlan,
        editDevice: editDevice,
        openGuacamole: openGuacamole
    };

})();

// Make DeviceDetail available globally
window.DeviceDetail = DeviceDetail;
