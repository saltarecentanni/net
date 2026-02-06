/**
 * TIESSE Matrix Network - Floor Plan Module
 * Version: 3.6.010
 * 
 * Interactive floor plan visualization with:
 * - SVG rendering and manipulation
 * - Room management (CRUD)
 * - Device placement on floor plan
 * - Zoom/Pan controls
 * - Click interactions
 * - SweetAlert2 modals (v3.4.5)
 * 
 * NOTE: Mapping tool available at /draw-rooms-v2.html (undocumented)
 */

'use strict';

// Debug logger fallback (defined in app.js)
if (typeof Debug === 'undefined') {
    var Debug = {
        log: function() {},
        warn: function() {},
        error: function() {}
    };
}

var FloorPlan = (function() {
    // ============================================================================
    // STATE
    // ============================================================================
    var container = null;
    var svgElement = null;
    var scale = 1;
    var panX = 0;
    var panY = 0;
    var isPanning = false;
    var startPanX = 0;
    var startPanY = 0;
    var startMouseX = 0;
    var startMouseY = 0;
    var selectedRoom = null;
    var editMode = false;
    
    // Rooms data structure
    var rooms = [];
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    function init() {
        container = document.getElementById('floorplanContainer');
        if (!container) return;
        
        loadRoomsData();
        loadSVG();
        attachEventListeners();
        updateStats();
    }
    
    function loadRoomsData() {
        // Try to load from appState (will be saved with network_manager.json)
        if (typeof appState !== 'undefined' && appState.rooms) {
            rooms = appState.rooms;
        } else {
            // Initialize default rooms structure
            rooms = [];
            if (typeof appState !== 'undefined') {
                appState.rooms = rooms;
            }
        }
    }
    
    function saveRoomsData() {
        if (typeof appState !== 'undefined') {
            appState.rooms = rooms;
            // Use saveToStorage to sync both localStorage and server
            if (typeof saveToStorage === 'function') {
                saveToStorage();
            } else if (typeof serverSave === 'function') {
                serverSave();
            } else if (typeof saveNow === 'function') {
                saveNow();
            }
        }
    }
    
    function loadSVG() {
        if (!container) return;
        
        // Create SVG with HD plant image
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 2782 1292');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.background = 'var(--color-bg-alt)';
        
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', 'assets/planta.png');
        image.setAttribute('width', '2782');
        image.setAttribute('height', '1292');
        image.style.opacity = '1';
        
        const roomsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        roomsGroup.id = 'roomsLayer';
        
        svg.appendChild(image);
        svg.appendChild(roomsGroup);
        container.innerHTML = '';
        container.appendChild(svg);
        
        svgElement = svg;
        setupSVG();
        renderRooms();
        applyTransform();
    }
    
    function setupSVG() {
        if (!svgElement) return;
        
        // Preserve original viewBox
        if (!svgElement.hasAttribute('data-original-viewbox')) {
            var vb = svgElement.getAttribute('viewBox');
            svgElement.setAttribute('data-original-viewbox', vb || '0 0 735 599');
        }
        
        // Make SVG fill container
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.style.cursor = 'grab';
        
        // Add defs for markers and patterns if not exists
        var defs = svgElement.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgElement.insertBefore(defs, svgElement.firstChild);
        }
        
        // Add room highlight pattern
        if (!defs.querySelector('#roomHighlight')) {
            var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', 'roomHighlight');
            pattern.setAttribute('width', '4');
            pattern.setAttribute('height', '4');
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.innerHTML = '<rect width="4" height="4" fill="rgba(251,191,36,0.2)"/><circle cx="2" cy="2" r="1" fill="rgba(251,191,36,0.5)"/>';
            defs.appendChild(pattern);
        }
        
        // Create rooms layer group
        var roomsGroup = svgElement.querySelector('#roomsLayer');
        if (!roomsGroup) {
            roomsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            roomsGroup.setAttribute('id', 'roomsLayer');
            svgElement.appendChild(roomsGroup);
        }
    }
    
    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================
    
    function attachEventListeners() {
        if (!container) return;
        
        // Pan with mouse drag
        container.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        // Zoom with mouse wheel
        container.addEventListener('wheel', handleWheel, { passive: false });
        
        // Prevent context menu
        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
    }
    
    function handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click
        
        // Check if clicking on a room (polygon or marker)
        var target = e.target;
        if (target.classList.contains('room-area') || target.classList.contains('room-marker')) {
            handleRoomClick(target);
            return;
        }
        
        isPanning = true;
        startPanX = panX;
        startPanY = panY;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        container.style.cursor = 'grabbing';
    }
    
    function handleMouseMove(e) {
        if (!isPanning) return;
        
        var dx = e.clientX - startMouseX;
        var dy = e.clientY - startMouseY;
        
        panX = startPanX + dx;
        panY = startPanY + dy;
        
        applyTransform();
    }
    
    function handleMouseUp(e) {
        isPanning = false;
        container.style.cursor = 'grab';
    }
    
    function handleWheel(e) {
        e.preventDefault();
        
        var delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoom(delta);
    }
    
    function handleRoomClick(roomElement) {
        var roomId = roomElement.getAttribute('data-room-id');
        var room = rooms.find(function(r) { return r.id === roomId; });
        
        if (room) {
            selectRoom(room);
            showRoomInfo(room);
        }
    }
    
    // ============================================================================
    // ZOOM & PAN
    // ============================================================================
    
    function zoom(delta) {
        var newScale = scale + delta;
        newScale = Math.max(0.5, Math.min(3, newScale)); // Clamp between 50% and 300%
        
        scale = newScale;
        applyTransform();
        updateZoomLabel();
    }
    
    function resetZoom() {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform();
        updateZoomLabel();
    }
    
    function applyTransform() {
        if (!svgElement) return;
        
        var transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
        svgElement.style.transform = transform;
    }
    
    function updateZoomLabel() {
        var label = document.getElementById('floorplanZoomLevel');
        if (label) {
            label.textContent = Math.round(scale * 100) + '%';
        }
    }
    
    // ============================================================================
    // ROOMS MANAGEMENT
    // ============================================================================
    
    function renderRooms() {
        if (!svgElement) return;
        
        var roomsGroup = svgElement.querySelector('#roomsLayer');
        if (!roomsGroup) return;
        
        // Clear existing rooms
        roomsGroup.innerHTML = '';
        
        // Render each room
        rooms.forEach(function(room) {
            renderRoom(room, roomsGroup);
        });
        
        updateStats();
    }
    
    function renderRoom(room, parent) {
        if (!room.polygon || room.polygon.length === 0) return;
        
        // Get devices using global helper function
        var roomDevices = typeof getDevicesInRoom === 'function' ? getDevicesInRoom(room) : [];
        
        // Build tooltip text
        var tooltipLabel = room.nickname ? (room.id + ' - ' + room.nickname) : ('Room ' + room.id);
        var deviceCount = roomDevices.length;
        var tooltipText = tooltipLabel + (deviceCount > 0 ? ' (' + deviceCount + ' devices)' : '');
        
        // Create room group
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'room-group');
        g.setAttribute('data-room-id', room.id);
        
        // Add SVG title element for native tooltip (works on hover over any child)
        var titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleEl.textContent = tooltipText;
        g.appendChild(titleEl);
        
        // Create polygon area - invisible, click detection only
        var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        var points = room.polygon.map(function(p) { return p.x + ',' + p.y; }).join(' ');
        polygon.setAttribute('points', points);
        polygon.setAttribute('class', 'room-area');
        polygon.setAttribute('data-room-id', room.id);
        polygon.setAttribute('fill', 'transparent');
        polygon.setAttribute('stroke', 'transparent');
        polygon.setAttribute('stroke-width', '0');
        polygon.setAttribute('cursor', 'pointer');
        
        // Hover effect - fill verde ao passar o mouse
        polygon.addEventListener('mouseenter', function() {
            this.setAttribute('fill', 'rgba(34,197,94,0.25)');
        });
        
        polygon.addEventListener('mouseleave', function() {
            if (selectedRoom && selectedRoom.id === room.id) {
                this.setAttribute('fill', 'rgba(34,197,94,0.2)');
            } else {
                this.setAttribute('fill', 'transparent');
            }
        });
        
        g.appendChild(polygon);
        
        // Add 📍 marker at room center with custom offsets for specific rooms
        var center = calculatePolygonCenter(room.polygon);
        
        // Custom position adjustments per room (move down to not overlap numbers)
        var markerOffsets = {
            0: { x: -35, y: 25 },   // MORE left + down
            1: { x: 0, y: 20 },     // down
            2: { x: 0, y: 20 },     // down
            3: { x: 0, y: 20 },     // down
            4: { x: 0, y: 20 },     // down
            5: { x: -20, y: 20 },   // left + down
            6: { x: -20, y: 20 },   // left + down
            7: { x: -20, y: 35 },   // left + more down
            8: { x: 0, y: 20 },     // down
            9: { x: 0, y: 20 },     // down
            10: { x: 40, y: 35 },   // MORE right + more down
            11: { x: 25, y: 35 },   // more right + more down
            12: { x: 20, y: 20 },   // right + down
            13: { x: 0, y: 20 },    // down
            14: { x: -20, y: 20 },  // left + down
            15: { x: 0, y: 20 },    // down
            16: { x: 0, y: 20 },    // down
            17: { x: 0, y: 20 },    // down
            18: { x: 0, y: 20 },    // down
            19: { x: 0, y: -40 }    // MORE UP (above the number)
        };
        
        var offset = markerOffsets[room.id] || { x: 0, y: 20 };
        
        var marker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        marker.setAttribute('x', center.x + offset.x);
        marker.setAttribute('y', center.y + offset.y);
        marker.setAttribute('text-anchor', 'middle');
        marker.setAttribute('dominant-baseline', 'central');
        marker.setAttribute('font-size', '32');
        marker.setAttribute('cursor', 'pointer');
        marker.setAttribute('class', 'room-marker');
        marker.setAttribute('data-room-id', room.id);
        marker.textContent = '📍';
        
        g.appendChild(marker);
        
        parent.appendChild(g);
    }
    
    function calculatePolygonCenter(polygon) {
        var sumX = 0, sumY = 0;
        polygon.forEach(function(p) {
            sumX += p.x;
            sumY += p.y;
        });
        return {
            x: sumX / polygon.length,
            y: sumY / polygon.length
        };
    }
    
    function selectRoom(room) {
        // Deselect previous
        if (selectedRoom) {
            var prevElements = svgElement.querySelectorAll('[data-room-id="' + selectedRoom.id + '"]');
            prevElements.forEach(function(el) {
                if (el.tagName === 'polygon') {
                    el.setAttribute('fill', 'transparent');
                    el.setAttribute('stroke', 'transparent');
                    el.setAttribute('stroke-width', '0');
                }
            });
        }
        
        // Select new
        selectedRoom = room;
        var elements = svgElement.querySelectorAll('[data-room-id="' + room.id + '"]');
        elements.forEach(function(el) {
            if (el.tagName === 'polygon') {
                el.setAttribute('fill', 'rgba(34,197,94,0.2)');
            }
        });
    }
    
    function showRoomInfo(room) {
        // Get devices using global helper function
        var roomDevices = typeof getDevicesInRoom === 'function' ? getDevicesInRoom(room) : [];
        
        // Get Wall Jacks assigned to this room via roomId field
        // Simple logic: Wall Jack has roomId -> appears in that room
        // No roomId -> doesn't appear anywhere (until assigned)
        var roomWallJacks = [];
        if (typeof appState !== 'undefined' && appState.connections) {
            var roomId = room.id.toString();
            
            roomWallJacks = appState.connections.filter(function(c) {
                if (!c.isWallJack) return false;
                // Only show if explicitly assigned to this room
                return c.roomId !== undefined && c.roomId !== null && 
                       c.roomId !== '' && c.roomId.toString() === roomId;
            });
        }
        
        // Get connections for these devices
        var roomConnections = [];
        if (typeof appState !== 'undefined' && appState.connections) {
            var deviceIds = roomDevices.map(function(d) { return d.id; });
            roomConnections = appState.connections.filter(function(c) {
                return deviceIds.indexOf(c.from) >= 0 || deviceIds.indexOf(c.to) >= 0;
            });
        }
        
        // Count by type and status
        var typeCounts = {};
        var activeCount = 0;
        var disabledCount = 0;
        
        roomDevices.forEach(function(d) {
            var t = d.type || 'others';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            if (d.status === 'disabled' || d.status === 'off') {
                disabledCount++;
            } else {
                activeCount++;
            }
        });
        
        // Group devices by type for better organization
        var devicesByType = {};
        roomDevices.forEach(function(d) {
            var t = d.type || 'others';
            if (!devicesByType[t]) devicesByType[t] = [];
            devicesByType[t].push(d);
        });
        
        // Helper to get SVG icon from topology or fallback
        function getTypeIcon(type) {
            try {
                if (typeof SVGTopology !== 'undefined' && SVGTopology.getMiniIcon) {
                    return SVGTopology.getMiniIcon(type, 32);
                }
            } catch(e) {}
            return '<span style="font-size:24px;">' + getDeviceTypeIcon(type) + '</span>';
        }
        
        function getTypeLabel(type) {
            try {
                if (typeof SVGTopology !== 'undefined' && SVGTopology.getTypeInfo) {
                    var info = SVGTopology.getTypeInfo(type);
                    if (info && info.label) return info.label;
                }
            } catch(e) {}
            return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        }
        
        // Build modal content HTML - Horizontal expanded layout
        var html = '<div class="room-info-modal" style="min-width:900px;">';
        
        // Check if user is authenticated
        var isAuth = typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn();
        
        // Top row: Nickname edit + Stats cards
        html += '<div style="display:grid;grid-template-columns:1fr auto;gap:20px;margin-bottom:20px;">';
        
        // Nickname section
        html += '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:16px;border-radius:12px;">';
        html += '<label style="font-size:11px;font-weight:600;color:#166534;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Room Nickname</label>';
        
        if (isAuth) {
            // Editable input for authenticated users
            html += '<input type="text" id="roomNicknameInput" value="' + escapeHtml(room.nickname || '') + '" ';
            html += 'placeholder="Ex: Sala Server, Data Center, Office 12" ';
            html += 'style="width:100%;padding:10px 14px;border:2px solid #86efac;border-radius:8px;font-size:14px;background:white;outline:none;" ';
            html += 'onfocus="this.style.borderColor=\'#22c55e\';this.style.boxShadow=\'0 0 0 3px rgba(34,197,94,0.1)\'" ';
            html += 'onblur="this.style.borderColor=\'#86efac\';this.style.boxShadow=\'none\'">';
        } else {
            // Read-only display for guests
            html += '<div style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;background:#f8fafc;color:#64748b;">';
            html += escapeHtml(room.nickname || '(not set)');
            html += '</div>';
            html += '<div style="font-size:10px;color:#94a3b8;margin-top:4px;">🔒 Login to edit</div>';
        }
        html += '</div>';
        
        // Stats cards row
        html += '<div style="display:flex;gap:12px;">';
        
        // Room ID
        html += '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
        html += '<div style="font-size:22px;font-weight:700;color:#1d4ed8;">' + room.id + '</div>';
        html += '<div style="font-size:10px;color:#3b82f6;font-weight:600;">ROOM ID</div>';
        html += '</div>';
        
        // Devices
        html += '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
        html += '<div style="font-size:22px;font-weight:700;color:#166534;">' + roomDevices.length + '</div>';
        html += '<div style="font-size:10px;color:#22c55e;font-weight:600;">DEVICES</div>';
        html += '</div>';
        
        // Active
        html += '<div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
        html += '<div style="font-size:22px;font-weight:700;color:#059669;">' + activeCount + '</div>';
        html += '<div style="font-size:10px;color:#f87171;font-weight:600;">ACTIVE</div>';
        html += '</div>';
        
        // Disabled
        if (disabledCount > 0) {
            html += '<div style="background:linear-gradient(135deg,#fef2f2,#fecaca);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
            html += '<div style="font-size:22px;font-weight:700;color:#dc2626;">' + disabledCount + '</div>';
            html += '<div style="font-size:10px;color:#ef4444;font-weight:600;">DISABLED</div>';
            html += '</div>';
        }
        
        // Connections
        html += '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
        html += '<div style="font-size:22px;font-weight:700;color:#b45309;">' + roomConnections.length + '</div>';
        html += '<div style="font-size:10px;color:#d97706;font-weight:600;">CONNECTIONS</div>';
        html += '</div>';
        
        // Wall Jacks
        if (roomWallJacks.length > 0) {
            html += '<div style="background:linear-gradient(135deg,#ecf0f1,#bdc3c7);padding:12px 20px;border-radius:10px;text-align:center;min-width:80px;">';
            html += '<div style="font-size:22px;font-weight:700;color:#2c3e50;">' + roomWallJacks.length + '</div>';
            html += '<div style="font-size:10px;color:#7f8c8d;font-weight:600;">WALL JACKS</div>';
            html += '</div>';
        }

        html += '</div></div>'; // End stats + nickname row
        
        // Devices section - horizontal grid layout
        if (roomDevices.length > 0) {
            var typeKeys = Object.keys(devicesByType).sort();
            var numTypes = typeKeys.length;
            var gridCols = numTypes >= 3 ? 3 : (numTypes === 2 ? 2 : 1);
            
            html += '<div style="display:grid;grid-template-columns:repeat(' + gridCols + ',1fr);gap:16px;">';
            
            typeKeys.forEach(function(type) {
                var devices = devicesByType[type];
                var typeLabel = getTypeLabel(type);
                var typeIcon = getTypeIcon(type);
                
                html += '<div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">';
                
                // Type header
                html += '<div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;">';
                html += '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">' + typeIcon + '</div>';
                html += '<span style="font-weight:600;color:#334155;font-size:13px;flex-grow:1;">' + typeLabel + '</span>';
                html += '<span style="background:#3b82f6;color:white;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;">' + devices.length + '</span>';
                html += '</div>';
                
                // Devices list
                html += '<div style="padding:8px;max-height:200px;overflow-y:auto;">';
                
                devices.forEach(function(device) {
                    var isActive = device.status !== 'disabled' && device.status !== 'off';
                    var bgColor = isActive ? '#f0fdf4' : '#fef2f2';
                    var dotColor = isActive ? '#22c55e' : '#ef4444';
                    
                    html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;border-radius:8px;background:' + bgColor + ';">';
                    
                    // Status dot
                    html += '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></span>';
                    
                    // Device info
                    html += '<div style="flex-grow:1;min-width:0;">';
                    html += '<div style="font-weight:500;color:#1e293b;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(device.name) + '">' + escapeHtml(device.name) + '</div>';
                    
                    var infoItems = [];
                    if (device.ip) infoItems.push(device.ip);
                    if (device.rackId) infoItems.push('Rack: ' + device.rackId);
                    if (infoItems.length > 0) {
                        html += '<div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + infoItems.join(' • ') + '</div>';
                    }
                    html += '</div>';
                    
                    // Links - support both formats: links[] array or link/link2 properties
                    var deviceLinks = [];
                    if (device.links && Array.isArray(device.links) && device.links.length > 0) {
                        deviceLinks = device.links;
                    } else if (device.link || device.link2) {
                        if (device.link) deviceLinks.push({ url: device.link, label: 'Link 1' });
                        if (device.link2) deviceLinks.push({ url: device.link2, label: 'Link 2' });
                    }
                    
                    if (deviceLinks.length > 0) {
                        html += '<div style="display:flex;gap:3px;flex-shrink:0;">';
                        var linkColors = { 'SSH': '#f87171', 'RDP': '#3b82f6', 'VNC': '#8b5cf6', 'HTTP': '#a78bfa', 'HTTPS': '#a78bfa', 'SMB': '#6366f1', 'TELNET': '#64748b', 'default': '#64748b' };
                        deviceLinks.forEach(function(linkObj, idx) {
                            var url = linkObj.url || linkObj;
                            var label = linkObj.label || linkObj.type || 'Link';
                            var type = (linkObj.type || '').toUpperCase();
                            var bgColor = linkColors[type] || linkColors['default'];
                            var icon = type === 'SSH' ? '💻' : (type === 'RDP' ? '🖥️' : (type === 'VNC' ? '📺' : (type === 'TELNET' ? '📟' : '🔗')));
                            
                            // Use same system as DeviceLinks.renderLinks
                            if (url.match(/^(https?|ftp):\/\//i) || url.match(/^\\\//) || url.match(/^\//) || type === 'HTTP' || type === 'HTTPS') {
                                // HTTP/HTTPS/FTP - regular link
                                var href = url;
                                if (!href.match(/^[a-z]+:\/\//i) && !href.startsWith('//')) {
                                    href = 'http://' + href;
                                }
                                html += '<a href="' + escapeHtml(href) + '" target="_blank" style="background:' + bgColor + ';color:white;padding:3px 6px;border-radius:4px;font-size:9px;text-decoration:none;" title="' + escapeHtml(label + ': ' + url) + '">' + icon + '</a>';
                            } else {
                                // SSH/RDP/VNC/Telnet/SMB - use openProtocolLink system
                                var protocolUrl = url;
                                if (!url.match(/^[a-z]+:\/\//i)) {
                                    protocolUrl = (type.toLowerCase() || 'ssh') + '://' + url;
                                }
                                html += '<a href="javascript:void(0)" data-protocol-url="' + escapeHtml(protocolUrl) + '" data-copy-url="' + escapeHtml(url) + '" onclick="openProtocolLink(this)" style="background:' + bgColor + ';color:white;padding:3px 6px;border-radius:4px;font-size:9px;text-decoration:none;cursor:pointer;" title="🔗 Click to open: ' + escapeHtml(url) + '">' + icon + '</a>';
                            }
                        });
                        html += '</div>';
                    }
                    
                    html += '</div>';
                });
                
                html += '</div></div>';
            });
            
            html += '</div>';
        } else {
            // No devices message
            html += '<div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border-radius:12px;padding:32px;text-align:center;">';
            html += '<div style="font-size:40px;margin-bottom:12px;">📭</div>';
            html += '<div style="color:#991b1b;font-weight:600;font-size:15px;">No devices assigned to this room</div>';
            html += '<div style="color:#b91c1c;font-size:12px;margin-top:6px;">Set device location to "<strong>' + escapeHtml(room.nickname || room.id) + '</strong>" to assign it here</div>';
            html += '</div>';
        }
        
        // Wall Jacks section
        if (roomWallJacks.length > 0) {
            html += '<div style="margin-top:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">';
            
            // Wall Jacks header
            html += '<div style="background:linear-gradient(135deg,#ecf0f1,#bdc3c7);padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #bdc3c7;">';
            html += '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔌</div>';
            html += '<span style="font-weight:600;color:#2c3e50;font-size:13px;flex-grow:1;">Wall Jacks</span>';
            html += '<span style="background:#7f8c8d;color:white;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;">' + roomWallJacks.length + '</span>';
            html += '</div>';
            
            // Wall Jacks list
            html += '<div style="padding:8px;max-height:180px;overflow-y:auto;">';
            
            roomWallJacks.forEach(function(wj) {
                var isActive = wj.status === 'active';
                var bgColor = isActive ? '#f0fdf4' : '#fef2f2';
                var dotColor = isActive ? '#22c55e' : '#ef4444';
                
                // Get source device name
                var sourceDevice = '';
                if (typeof appState !== 'undefined' && appState.devices && wj.from) {
                    var dev = appState.devices.find(function(d) { return d.id === wj.from; });
                    if (dev) sourceDevice = dev.name;
                }
                
                html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;border-radius:8px;background:' + bgColor + ';">';
                
                // Status dot
                html += '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></span>';
                
                // Wall Jack info
                html += '<div style="flex-grow:1;min-width:0;">';
                html += '<div style="font-weight:500;color:#1e293b;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(wj.externalDest) + '">' + escapeHtml(wj.externalDest) + '</div>';
                
                var infoItems = [];
                if (wj.cableMarker) infoItems.push('Cable: ' + wj.cableMarker);
                if (sourceDevice) infoItems.push('From: ' + sourceDevice);
                if (wj.fromPort) infoItems.push('Port: ' + wj.fromPort);
                if (infoItems.length > 0) {
                    html += '<div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + infoItems.join(' • ') + '</div>';
                }
                html += '</div>';
                
                html += '</div>';
            });
            
            html += '</div></div>';
        }
        
        html += '</div>';
        
        // Title
        var titleText = room.nickname ? room.nickname + ' (Room ' + room.id + ')' : 'Room ' + room.id;
        
        // Show modal
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '<span style="color:#166534">🏢 ' + escapeHtml(titleText) + '</span>',
                html: html,
                showCloseButton: true,
                showConfirmButton: isAuth,
                showCancelButton: true,
                confirmButtonText: '💾 Save Nickname',
                cancelButtonText: isAuth ? 'Cancel' : 'Close',
                confirmButtonColor: '#22c55e',
                cancelButtonColor: '#64748b',
                width: 'auto',
                background: '#ffffff',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-lg',
                    htmlContainer: 'text-left'
                },
                preConfirm: isAuth ? function() {
                    return document.getElementById('roomNicknameInput').value;
                } : null
            }).then(function(result) {
                if (result.isConfirmed) {
                    var oldNickname = room.nickname;
                    var newNickname = result.value;
                    
                    // Update room nickname in local array
                    room.nickname = newNickname;
                    
                    // ALSO update in appState.rooms to ensure sync (compare as strings)
                    if (typeof appState !== 'undefined' && appState.rooms) {
                        var roomIdStr = String(room.id);
                        var appRoom = appState.rooms.find(function(r) { return String(r.id) === roomIdStr; });
                        if (appRoom && appRoom !== room) {
                            appRoom.nickname = newNickname;
                        }
                    }
                    
                    // Save to both localStorage and server
                    if (typeof appState !== 'undefined') {
                        appState.rooms = rooms; // Ensure sync
                        // Use saveToStorage to sync both localStorage and server
                        if (typeof saveToStorage === 'function') {
                            saveToStorage();
                        } else if (typeof serverSave === 'function') {
                            serverSave();
                        }
                    }
                    
                    // Sync devices: Update device.location if it matched old nickname
                    if (oldNickname && newNickname && oldNickname !== newNickname) {
                        var updatedCount = 0;
                        if (typeof appState !== 'undefined' && appState.devices) {
                            appState.devices.forEach(function(device) {
                                if (device.location === oldNickname) {
                                    device.location = newNickname;
                                    updatedCount++;
                                }
                            });
                            if (updatedCount > 0) {
                                // Use saveToStorage to sync both localStorage and server
                                if (typeof saveToStorage === 'function') {
                                    saveToStorage();
                                } else if (typeof serverSave === 'function') {
                                    serverSave();
                                }
                            }
                        }
                        if (updatedCount > 0 && typeof Toast !== 'undefined') {
                            Toast.success('Room nickname updated! Also updated ' + updatedCount + ' device(s) location.');
                        } else if (typeof Toast !== 'undefined') {
                            Toast.success('Room nickname updated!');
                        }
                    } else if (typeof Toast !== 'undefined') {
                        Toast.success('Room nickname updated!');
                    }
                    
                    // Update location select dropdowns
                    if (typeof updateLocationSelect === 'function') {
                        updateLocationSelect();
                    }
                    
                    // Refresh floor plan display AND legend
                    renderRooms();
                    updateStats();  // This updates the Room Legend sidebar
                }
            });
        } else {
            Toast.info('Room: ' + room.name + ' - ' + roomDevices.length + ' devices');
        }
    }
    
    // Helper function to get device type icon (fallback)
    function getDeviceTypeIcon(type) {
        var icons = {
            'router': '🌐',
            'switch': '🔀',
            'firewall': '🛡️',
            'server': '🖥️',
            'patch': '🔌',
            'wifi': '📶',
            'router_wifi': '📡',
            'pc': '💻',
            'laptop': '💻',
            'printer': '🖨️',
            'phone': '📱',
            'ip_phone': '☎️',
            'camera': '📹',
            'ups': '🔋',
            'nas': '💾',
            'modem': '📟',
            'hub': '🔲',
            'isp': '🌍',
            'cloud': '☁️',
            'walljack': '🔳',
            'others': '📦'
        };
        return icons[type] || '📦';
    }
    
    function closeRoomPanel() {
        var panel = document.getElementById('roomInfoPanel');
        if (panel) panel.style.display = 'none';
        
        if (selectedRoom) {
            var elements = svgElement.querySelectorAll('[data-room-id="' + selectedRoom.id + '"]');
            elements.forEach(function(el) {
                if (el.tagName === 'polygon') {
                    el.setAttribute('fill', 'transparent');
                    el.setAttribute('stroke', 'transparent');
                    el.setAttribute('stroke-width', '0');
                }
            });
            selectedRoom = null;
        }
    }
    
    // ============================================================================
    // CRUD OPERATIONS
    // ============================================================================
    
    function showAddRoomModal() {
        if (typeof Swal === 'undefined') {
            Toast.info('Room editing will be available in the next version.');
            return;
        }
        
        Swal.fire({
            title: 'Add New Room',
            html: '<div class="text-left">' +
                '<p class="text-sm text-slate-600 mb-3">Draw a polygon on the floor plan by clicking points, then fill in the details.</p>' +
                '<div class="space-y-2">' +
                '<input id="roomName" class="swal2-input" placeholder="Room Name">' +
                '<select id="roomType" class="swal2-input">' +
                '<option value="office">Office</option>' +
                '<option value="meeting">Meeting Room</option>' +
                '<option value="server">Server Room</option>' +
                '<option value="storage">Storage</option>' +
                '<option value="other">Other</option>' +
                '</select>' +
                '<input id="roomArea" class="swal2-input" type="number" placeholder="Area (m²)">' +
                '<input id="roomCapacity" class="swal2-input" type="number" placeholder="Capacity (people)">' +
                '<textarea id="roomDescription" class="swal2-textarea" placeholder="Description"></textarea>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonText: 'Create Room',
            cancelButtonText: 'Cancel',
            preConfirm: function() {
                return {
                    name: document.getElementById('roomName').value,
                    type: document.getElementById('roomType').value,
                    area: document.getElementById('roomArea').value,
                    capacity: document.getElementById('roomCapacity').value,
                    description: document.getElementById('roomDescription').value
                };
            }
        }).then(function(result) {
            if (result.isConfirmed && result.value.name) {
                Toast.info('Polygon drawing mode coming soon!');
            }
        });
    }
    
    function editRoom(roomId) {
        var room = rooms.find(function(r) { return r.id === roomId; });
        if (!room) return;
        
        if (typeof Swal === 'undefined') {
            var newName = prompt('Room Name:', room.name);
            if (newName) {
                room.name = newName;
                saveRoomsData();
                renderRooms();
            }
            return;
        }
        
        Swal.fire({
            title: 'Edit Room',
            html: '<div class="text-left space-y-2">' +
                '<input id="roomName" class="swal2-input" placeholder="Room Name" value="' + escapeHtml(room.name || '') + '">' +
                '<select id="roomType" class="swal2-input">' +
                '<option value="office"' + (room.type === 'office' ? ' selected' : '') + '>Office</option>' +
                '<option value="meeting"' + (room.type === 'meeting' ? ' selected' : '') + '>Meeting Room</option>' +
                '<option value="server"' + (room.type === 'server' ? ' selected' : '') + '>Server Room</option>' +
                '<option value="storage"' + (room.type === 'storage' ? ' selected' : '') + '>Storage</option>' +
                '<option value="other"' + (room.type === 'other' ? ' selected' : '') + '>Other</option>' +
                '</select>' +
                '<input id="roomArea" class="swal2-input" type="number" placeholder="Area (m²)" value="' + (room.area || '') + '">' +
                '<input id="roomCapacity" class="swal2-input" type="number" placeholder="Capacity" value="' + (room.capacity || '') + '">' +
                '<textarea id="roomDescription" class="swal2-textarea" placeholder="Description">' + escapeHtml(room.description || '') + '</textarea>' +
                '<button onclick="FloorPlan.deleteRoom(\'' + roomId + '\')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm mt-2">🗑️ Delete Room</button>' +
                '</div>',
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            preConfirm: function() {
                return {
                    name: document.getElementById('roomName').value,
                    type: document.getElementById('roomType').value,
                    area: document.getElementById('roomArea').value,
                    capacity: document.getElementById('roomCapacity').value,
                    description: document.getElementById('roomDescription').value
                };
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                room.name = result.value.name;
                room.type = result.value.type;
                room.area = result.value.area;
                room.capacity = result.value.capacity;
                room.description = result.value.description;
                saveRoomsData();
                renderRooms();
                if (selectedRoom && selectedRoom.id === roomId) {
                    showRoomInfo(room);
                }
            }
        });
    }
    
    function deleteRoom(roomId) {
        Swal.fire({
            title: 'Delete Room?',
            text: 'This room will be permanently deleted.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel'
        }).then(function(result) {
            if (result.isConfirmed) {
                rooms = rooms.filter(function(r) { return r.id !== roomId; });
                saveRoomsData();
                closeRoomPanel();
                renderRooms();
                Toast.success('Room deleted');
            }
        });
    }
    
    function toggleEditMode() {
        editMode = !editMode;
        var btn = document.getElementById('floorplanEditBtn');
        if (btn) {
            btn.textContent = editMode ? '✅ Done' : '✏️ Edit';
            btn.className = editMode ? 
                'bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2.5 rounded-lg text-sm' :
                'bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1 px-2.5 rounded-lg text-sm';
        }
    }
    
    // ============================================================================
    // FILTERS
    // ============================================================================
    
    function filterByRoom() {
        var select = document.getElementById('floorplanRoomFilter');
        if (!select) return;
        
        var roomId = select.value;
        
        if (roomId) {
            var room = rooms.find(function(r) { return r.id === roomId; });
            if (room) {
                selectRoom(room);
                showRoomInfo(room);
                // Auto zoom to room if it has polygon
                if (room.polygon && room.polygon.length > 0) {
                    var bounds = room.polygon.reduce(function(acc, p) {
                        return {
                            minX: Math.min(acc.minX, p.x),
                            maxX: Math.max(acc.maxX, p.x),
                            minY: Math.min(acc.minY, p.y),
                            maxY: Math.max(acc.maxY, p.y)
                        };
                    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
                    var centerX = (bounds.minX + bounds.maxX) / 2;
                    var centerY = (bounds.minY + bounds.maxY) / 2;
                    var container = document.getElementById('floorplanContainer');
                    if (container) {
                        var containerRect = container.getBoundingClientRect();
                        container.scrollLeft = centerX - containerRect.width / 2;
                        container.scrollTop = centerY - containerRect.height / 2;
                    }
                }
            }
        } else {
            closeRoomPanel();
        }
    }
    
    function updateRoomFilter() {
        var select = document.getElementById('floorplanRoomFilter');
        if (!select) return;
        
        var currentValue = select.value;
        select.innerHTML = '<option value="">🚪 All Rooms</option>';
        
        rooms.forEach(function(room) {
            var option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name || 'Unnamed Room';
            if (room.id === currentValue) option.selected = true;
            select.appendChild(option);
        });
    }
    
    // ============================================================================
    // EXPORT
    // ============================================================================
    
    function exportPNG() {
        if (!svgElement) {
            Toast.warning('No floor plan loaded');
            return;
        }
        
        // Clone SVG for export
        var clone = svgElement.cloneNode(true);
        
        // Remove transform
        clone.style.transform = '';
        
        // Create canvas
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        // Get SVG dimensions
        var bbox = svgElement.getBBox();
        canvas.width = bbox.width * 2; // 2x for quality
        canvas.height = bbox.height * 2;
        
        // Convert SVG to data URL
        var svgData = new XMLSerializer().serializeToString(clone);
        var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(svgBlob);
        
        var img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(function(blob) {
                var link = document.createElement('a');
                link.download = 'tiesse-floorplan-' + new Date().toISOString().split('T')[0] + '.png';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(url);
            });
        };
        img.src = url;
    }
    
    // ============================================================================
    // STATS
    // ============================================================================
    
    function updateStats() {
        var totalRooms = document.getElementById('totalRoomsCount');
        var roomDevices = document.getElementById('roomDevicesCount');
        
        if (totalRooms) {
            totalRooms.textContent = rooms.length;
        }
        
        if (roomDevices) {
            var count = 0;
            rooms.forEach(function(room) {
                if (room.deviceIds) count += room.deviceIds.length;
            });
            roomDevices.textContent = count;
        }
        
        updateRoomFilter();
        updateRoomLegend();
    }
    
    function updateRoomLegend() {
        var container = document.getElementById('roomLegendContent');
        if (!container) return;
        
        var sortedRooms = rooms.slice().sort(function(a, b) {
            return parseInt(a.id) - parseInt(b.id);
        });
        
        if (sortedRooms.length === 0) {
            container.innerHTML = '<span style="font-size: 10px; color: var(--color-text-muted); font-style: italic;">No rooms mapped</span>';
            return;
        }
        
        var html = '';
        sortedRooms.forEach(function(room) {
            var label = room.nickname ? room.id + ' - ' + room.nickname : room.id;
            var textColor = room.nickname ? 'color: var(--color-accent);' : 'color: var(--color-text-light);';
            var fontWeight = room.nickname ? 'font-weight: 600;' : 'font-weight: 400;';
            html += '<div style="font-size: 11px; padding: 2px 0; ' + textColor + fontWeight + ' white-space: nowrap;" title="Click room on map">' + label + '</div>';
        });
        
        container.innerHTML = html;
    }
    
    // ============================================================================
    // UTILITY
    // ============================================================================
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // ============================================================================
    // SET ROOMS (for import)
    // ============================================================================
    function setRooms(newRooms) {
        rooms = newRooms || [];
        if (typeof appState !== 'undefined') {
            appState.rooms = rooms;
        }
        // Re-render if already initialized
        if (container && container.querySelector('svg')) {
            renderRooms();
            updateStats();
        }
    }
    
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    return {
        init: init,
        zoom: zoom,
        resetZoom: resetZoom,
        filterByRoom: filterByRoom,
        showAddRoomModal: showAddRoomModal,
        editRoom: editRoom,
        deleteRoom: deleteRoom,
        toggleEditMode: toggleEditMode,
        closeRoomPanel: closeRoomPanel,
        exportPNG: exportPNG,
        updateStats: updateStats,
        setRooms: setRooms,
        getRooms: function() { return rooms; }
    };
})();
