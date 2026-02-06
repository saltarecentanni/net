/**
 * Device Detail Modal - TIESSE Matrix Network
 * Version: 3.6.006
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
        if (!hasWeb && !hasSsh && !hasRdp && !hasVnc && !hasTelnet && !device.location) {
            return '';
        }

        html += '<div class="flex flex-wrap gap-2 mt-3">';
        
        // Web access - show if configured OR if device has IP (common default)
        if (hasWeb || ip) {
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
     * Copy text to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(function() {
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Copied!',
                    text: text,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                alert('Copied: ' + text);
            }
        });
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
        
        // Try to load config file directly (works with Apache)
        return fetch('/config/guacamole.json')
            .then(function(response) {
                if (!response.ok) throw new Error('Config not found');
                return response.json();
            })
            .then(function(config) {
                guacamoleConfig = {
                    enabled: config.enabled !== false,
                    baseUrl: config.server ? config.server.baseUrl : null,
                    protocols: config.ui ? config.ui.showProtocolButtons : ['ssh', 'rdp', 'vnc', 'telnet'],
                    openInNewTab: config.ui ? config.ui.openInNewTab : true
                };
                return guacamoleConfig;
            })
            .catch(function(error) {
                console.warn('[Guacamole] Failed to load config:', error);
                guacamoleConfig = { enabled: false };
                return guacamoleConfig;
            });
    }

    /**
     * Open Guacamole remote connection
     * Works without Matrix login - opens Guacamole directly
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

        // Load config and open Guacamole
        loadGuacamoleConfig().then(function(config) {
            if (!config.enabled || !config.baseUrl) {
                // Guacamole not configured - show helpful message
                var copyText = '';
                var helpHtml = '';
                
                switch(protocol) {
                    case 'ssh':
                        copyText = 'ssh admin@' + ip;
                        helpHtml = 'Command copied: <code>' + copyText + '</code>';
                        break;
                    case 'rdp':
                        copyText = ip;
                        helpHtml = 'IP copied. Use Remote Desktop to connect to: <code>' + ip + '</code>';
                        break;
                    case 'vnc':
                        copyText = ip + ':5900';
                        helpHtml = 'VNC address copied: <code>' + copyText + '</code>';
                        break;
                    case 'telnet':
                        copyText = 'telnet ' + ip;
                        helpHtml = 'Command copied: <code>' + copyText + '</code>';
                        break;
                }
                
                copyToClipboard(copyText);
                
                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: '📋 Copied!',
                        html: helpHtml + '<br><br><small class="text-slate-500">Configure Guacamole for direct access</small>',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                }
                return;
            }

            // Open Guacamole with quick-connect parameters via URL fragment
            // Format: #/client/CONNECTION_STRING where CONNECTION_STRING is base64 encoded
            var port = protocol === 'rdp' ? 3389 : (protocol === 'vnc' ? 5900 : (protocol === 'telnet' ? 23 : 22));
            
            // Note: Guacamole's quick-connect format varies by version
            // Most compatible: open home and let user select/create connection
            var guacUrl = config.baseUrl + '/#/';
            window.open(guacUrl, '_blank');
            
            // Copy connection info to clipboard for easy setup
            var connInfo = protocol.toUpperCase() + '://' + ip + ':' + port;
            copyToClipboard(connInfo);
            
            // Show hint about the device
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: '🚀 ' + protocol.toUpperCase(),
                    html: '<div class="text-left">' +
                          '<p class="mb-2">Guacamole opened in new tab</p>' +
                          '<div class="bg-slate-100 rounded p-2 text-sm font-mono">' +
                          '<div><b>Device:</b> ' + device.name + '</div>' +
                          '<div><b>IP:</b> ' + ip + '</div>' +
                          '<div><b>Port:</b> ' + port + '</div>' +
                          '</div>' +
                          '<p class="mt-2 text-xs text-slate-500">Connection info copied to clipboard</p>' +
                          '</div>',
                    timer: 4000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        });
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
