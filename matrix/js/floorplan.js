/**
 * TIESSE Matrix Network - Floor Plan Module
 * Version: 4.1.007
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
    var scale = 0.7; // Default zoom 70%
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
        svg.style.background = '#F8FAFC';
        
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
        scale = 0.7; // Reset to default 70%
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
            19: { x: 0, y: -40 },   // MORE UP (above the number)
            20: { x: 0, y: 20 },    // Zone Test - Arcipelago 01
            21: { x: 0, y: 20 }     // Zone Test - Arcipelago 02
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
        var roomWallJacks = [];
        if (typeof appState !== 'undefined' && appState.connections) {
            var roomId = room.id.toString();
            roomWallJacks = appState.connections.filter(function(c) {
                if (!c.isWallJack) return false;
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
                    return SVGTopology.getMiniIcon(type, 24);
                }
            } catch(_e) { /* fallback below */ }
            return '<span style="font-size:18px;">' + getDeviceTypeIcon(type) + '</span>';
        }
        
        function getTypeLabel(type) {
            try {
                if (typeof SVGTopology !== 'undefined' && SVGTopology.getTypeInfo) {
                    var info = SVGTopology.getTypeInfo(type);
                    if (info && info.label) return info.label;
                }
            } catch(_e) { /* fallback below */ }
            return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        }
        
        // Room ID formatted as 2 digits
        var roomIdFormatted = String(room.id).padStart(2, '0');
        
        // Build modal content HTML
        var html = '<div class="room-info-modal" style="min-width:900px;">';
        
        // Header row: Room selector dropdown + Stats badges
        html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;">';
        
        // Room selector dropdown
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Room:</span>';
        html += '<select id="floorRoomSelector" onchange="event.stopPropagation(); FloorPlan.switchRoom(this.value)" style="padding:8px 12px;border:2px solid #22c55e;border-radius:8px;font-size:14px;font-weight:600;background:white;color:#166534;cursor:pointer;min-width:200px;">';
        
        // Populate rooms dropdown
        var allRooms = rooms.slice().sort(function(a, b) { return parseInt(a.id) - parseInt(b.id); });
        allRooms.forEach(function(r) {
            var rId = String(r.id).padStart(2, '0');
            var rName = r.nickname || ('Room ' + r.id);
            var selected = String(r.id) === String(room.id) ? ' selected' : '';
            html += '<option value="' + r.id + '"' + selected + '>' + rId + ' - ' + escapeHtml(rName) + '</option>';
        });
        html += '</select>';
        html += '</div>';
        
        // Stats badges (compact)
        html += '<div style="display:flex;gap:8px;margin-left:auto;">';
        html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#f0fdf4;color:#166534;border-radius:20px;font-size:12px;font-weight:600;">📱 ' + roomDevices.length + ' devices</span>';
        html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#fef3c7;color:#b45309;border-radius:20px;font-size:12px;font-weight:600;">⚡ ' + roomConnections.length + ' conn.</span>';
        if (roomWallJacks.length > 0) {
            html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#e2e8f0;color:#475569;border-radius:20px;font-size:12px;font-weight:600;">🔌 ' + roomWallJacks.length + ' WJ</span>';
        }
        html += '</div>';
        html += '</div>';
        
        // Filter bar - standardized like Devices/Connections
        var typeKeys = Object.keys(devicesByType).sort();
        
        // Get unique locations and groups from room devices
        var locationsInRoom = {};
        var groupsInRoom = {};
        var connectedCount = 0;
        var connectedDeviceIds = {};
        
        // Find connected devices
        (appState.connections || []).forEach(function(c) {
            connectedDeviceIds[c.from] = true;
            connectedDeviceIds[c.to] = true;
        });
        
        roomDevices.forEach(function(d) {
            if (d.location) locationsInRoom[d.location] = (locationsInRoom[d.location] || 0) + 1;
            if (d.rackId) groupsInRoom[d.rackId] = (groupsInRoom[d.rackId] || 0) + 1;
            if (connectedDeviceIds[d.id]) connectedCount++;
        });
        
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:10px;flex-wrap:wrap;">';
        html += '<span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;white-space:nowrap;">Filters:</span>';
        
        // Location filter
        var locationKeys = Object.keys(locationsInRoom).sort();
        if (locationKeys.length > 0) {
            html += '<select id="floorFilterLocation" onchange="event.stopPropagation(); FloorPlan.applyFilters()" style="padding:6px 10px;border:2px solid #cbd5e1;border-radius:6px;font-size:12px;background:white;font-weight:600;">';
            html += '<option value="">📍 All Locations</option>';
            locationKeys.forEach(function(loc) {
                html += '<option value="' + escapeHtml(loc) + '">' + escapeHtml(loc) + ' (' + locationsInRoom[loc] + ')</option>';
            });
            html += '</select>';
        }
        
        // Group filter
        var groupKeys = Object.keys(groupsInRoom).sort();
        if (groupKeys.length > 0) {
            html += '<select id="floorFilterGroup" onchange="event.stopPropagation(); FloorPlan.applyFilters()" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;">';
            html += '<option value="">🗂️ All Groups</option>';
            groupKeys.forEach(function(grp) {
                html += '<option value="' + escapeHtml(grp) + '">' + escapeHtml(grp) + ' (' + groupsInRoom[grp] + ')</option>';
            });
            html += '</select>';
        }
        
        // Search
        html += '<input type="text" id="floorFilterSearch" placeholder="🔍 Search name..." oninput="event.stopPropagation(); FloorPlan.applyFilters()" onclick="event.stopPropagation()" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;width:140px;">';
        
        // Type filter
        html += '<select id="floorFilterType" onchange="event.stopPropagation(); FloorPlan.applyFilters()" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;">';
        html += '<option value="">📦 All Types</option>';
        typeKeys.forEach(function(type) {
            var count = devicesByType[type].length;
            html += '<option value="' + type + '">' + getTypeLabel(type) + ' (' + count + ')</option>';
        });
        html += '</select>';
        
        // Status filter - default to Online
        html += '<select id="floorFilterStatus" onchange="event.stopPropagation(); FloorPlan.applyFilters()" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;">';
        html += '<option value="">🔘 All Status</option>';
        html += '<option value="active" selected>🟢 Online (' + activeCount + ')</option>';
        html += '<option value="disabled">🔴 Offline (' + disabledCount + ')</option>';
        html += '</select>';
        
        // Connected toggle - default checked
        html += '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#475569;cursor:pointer;white-space:nowrap;">';
        html += '<input type="checkbox" id="floorFilterConnected" checked onchange="event.stopPropagation(); FloorPlan.applyFilters()" onclick="event.stopPropagation()" style="accent-color:#3b82f6;">';
        html += '<span>Connected</span>';
        html += '</label>';
        
        // Device count badge
        html += '<span id="floorFilterCount" style="padding:6px 12px;background:#dbeafe;color:#1d4ed8;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">' + roomDevices.length + ' devices</span>';
        
        // Clear filters
        html += '<button onclick="event.stopPropagation(); FloorPlan.clearFilters()" style="padding:6px 10px;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">✕ Clear</button>';
        
        html += '</div>';
        
        // Devices container (will be filtered by JS) - larger height
        html += '<div id="floorDevicesContainer" style="max-height:55vh;overflow-y:auto;">';
        
        // Devices section - horizontal grid layout
        if (roomDevices.length > 0) {
            var numTypes = typeKeys.length;
            var gridCols = numTypes >= 3 ? 3 : (numTypes === 2 ? 2 : 1);
            
            html += '<div id="floorDevicesGrid" style="display:grid;grid-template-columns:repeat(' + gridCols + ',minmax(320px,1fr));gap:16px;">';
            
            typeKeys.forEach(function(type) {
                var devices = devicesByType[type];
                var typeLabel = getTypeLabel(type);
                var typeIcon = getTypeIcon(type);
                
                html += '<div class="floor-type-group" data-type="' + type + '" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;min-width:0;">';
                
                // Type header
                html += '<div style="background:linear-gradient(135deg,#f1f5f9,#e2e8f0);padding:10px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0;">';
                html += '<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">' + typeIcon + '</div>';
                html += '<span style="font-weight:600;color:#334155;font-size:12px;flex-grow:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + typeLabel + '</span>';
                html += '<span class="floor-type-count" style="background:#3b82f6;color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0;">' + devices.length + '</span>';
                html += '</div>';
                
                // Devices list - larger height to reduce scrolling
                html += '<div class="floor-devices-list" style="padding:8px;max-height:280px;overflow-y:auto;">';
                
                devices.forEach(function(device) {
                    var isActive = device.status !== 'disabled' && device.status !== 'off';
                    var bgColor = isActive ? '#f0fdf4' : '#fef2f2';
                    var dotColor = isActive ? '#22c55e' : '#ef4444';
                    var statusClass = isActive ? 'active' : 'disabled';
                    var deviceLocation = device.location || '';
                    var deviceGroup = device.rackId || '';
                    
                    html += '<div class="floor-device-item" data-device-id="' + device.id + '" data-status="' + statusClass + '" data-name="' + escapeHtml((device.name || '').toLowerCase()) + '" data-location="' + escapeHtml(deviceLocation) + '" data-group="' + escapeHtml(deviceGroup) + '" style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin:3px 0;border-radius:8px;background:' + bgColor + ';">';
                    
                    // Status dot
                    html += '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></span>';
                    
                    // Device info - wider area
                    html += '<div style="flex-grow:1;min-width:0;max-width:180px;">';
                    html += '<div style="font-weight:600;color:#1e293b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(getDeviceDisplayName(device)) + '">' + escapeHtml(getDeviceDisplayName(device)) + '</div>';
                    
                    // Build device info with better organization
                    var deviceIp = '';
                    if (device.addresses && device.addresses.length > 0) {
                        deviceIp = (device.addresses[0].ip || device.addresses[0].network || '').split('/')[0];
                    }
                    
                    // Line 1: IP and Group
                    var line1Items = [];
                    if (deviceIp) line1Items.push('IP: ' + deviceIp);
                    if (device.rackId) line1Items.push('Group: ' + device.rackId);
                    
                    // Line 2: VLAN, Zone/DMZ, Description
                    var line2Items = [];
                    if (device.vlan) line2Items.push('VLAN: ' + device.vlan);
                    if (device.zone) line2Items.push(device.zone);
                    if (device.dmz) line2Items.push('DMZ');
                    
                    if (line1Items.length > 0) {
                        html += '<div style="font-size:9px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;">' + line1Items.join(' • ') + '</div>';
                    }
                    if (line2Items.length > 0) {
                        html += '<div style="font-size:8px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + line2Items.join(' • ') + '</div>';
                    }
                    html += '</div>';
                    
                    // Quick Access Buttons via Guacamole - based on device.links
                    var deviceLinks = device.links || [];
                    var hasSsh = deviceLinks.some(function(l) { return l.type === 'ssh'; });
                    var hasRdp = deviceLinks.some(function(l) { return l.type === 'rdp'; });
                    var hasVnc = deviceLinks.some(function(l) { return l.type === 'vnc'; });
                    var hasTelnet = deviceLinks.some(function(l) { return l.type === 'telnet'; });
                    var hasWeb = deviceLinks.some(function(l) { return l.type === 'http' || l.type === 'https' || l.type === 'web'; });
                    
                    html += '<div style="display:flex;gap:4px;flex-shrink:0;align-items:center;flex-wrap:wrap;justify-content:flex-end;">';
                    
                    // Web access button
                    if (hasWeb && deviceIp) {
                        var webLink = deviceLinks.find(function(l) { return l.type === 'http' || l.type === 'https' || l.type === 'web'; });
                        var webUrl = webLink && webLink.url ? webLink.url : 'http://' + deviceIp;
                        if (!webUrl.startsWith('http')) webUrl = 'http://' + webUrl;
                        html += '<a href="' + escapeHtml(webUrl) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border-radius:6px;font-size:14px;text-decoration:none;" title="Web Interface">🌐</a>';
                    }
                    
                    // SSH button
                    if (hasSsh && deviceIp) {
                        html += '<button onclick="event.stopPropagation(); FloorPlan.openDeviceGuacamole(' + device.id + ', \'ssh\')" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#22c55e;border:none;border-radius:6px;font-size:11px;font-family:monospace;font-weight:bold;cursor:pointer;" title="SSH Terminal">>_</button>';
                    }
                    
                    // RDP button
                    if (hasRdp && deviceIp) {
                        html += '<button onclick="event.stopPropagation(); FloorPlan.openDeviceGuacamole(' + device.id + ', \'rdp\')" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#4f46e5,#3730a3);color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;" title="Remote Desktop">🖥️</button>';
                    }
                    
                    // VNC button
                    if (hasVnc && deviceIp) {
                        html += '<button onclick="event.stopPropagation(); FloorPlan.openDeviceGuacamole(' + device.id + ', \'vnc\')" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#059669,#047857);color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;" title="VNC Viewer">🖼️</button>';
                    }
                    
                    // Telnet button
                    if (hasTelnet && deviceIp) {
                        html += '<button onclick="event.stopPropagation(); FloorPlan.openDeviceGuacamole(' + device.id + ', \'telnet\')" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#ea580c,#9a3412);color:white;border:none;border-radius:6px;font-size:10px;font-family:monospace;font-weight:bold;cursor:pointer;" title="Telnet">tel</button>';
                    }
                    
                    // Device Details button - closes FloorPlan modal and opens DeviceDetail
                    html += '<button onclick="event.stopPropagation(); FloorPlan.openDeviceDetail(' + device.id + ')" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;" title="Device Details">🔍</button>';
                    
                    html += '</div>';
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
            html += '<div style="color:#b91c1c;font-size:12px;margin-top:6px;">Set device location to "<strong>' + escapeHtml(room.nickname || roomIdFormatted) + '</strong>" to assign it here</div>';
            html += '</div>';
        }
        
        // Wall Jacks section
        if (roomWallJacks.length > 0) {
            html += '<div style="margin-top:12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">';
            
            // Wall Jacks header
            html += '<div style="background:linear-gradient(135deg,#ecf0f1,#bdc3c7);padding:10px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #bdc3c7;">';
            html += '<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🔌</div>';
            html += '<span style="font-weight:600;color:#2c3e50;font-size:12px;flex-grow:1;">Wall Jacks</span>';
            html += '<span style="background:#7f8c8d;color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0;">' + roomWallJacks.length + '</span>';
            html += '</div>';
            
            // Wall Jacks list
            html += '<div style="padding:6px;max-height:150px;overflow-y:auto;">';
            
            roomWallJacks.forEach(function(wj) {
                var isActive = wj.status === 'active';
                var bgColor = isActive ? '#f0fdf4' : '#fef2f2';
                var dotColor = isActive ? '#22c55e' : '#ef4444';
                
                var sourceDevice = '';
                if (typeof appState !== 'undefined' && appState.devices && wj.from) {
                    var dev = appState.devices.find(function(d) { return d.id === wj.from; });
                    if (dev) sourceDevice = getDeviceDisplayName(dev);
                }
                
                html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin:2px 0;border-radius:6px;background:' + bgColor + ';">';
                html += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></span>';
                html += '<div style="flex-grow:1;min-width:0;">';
                html += '<div style="font-weight:500;color:#1e293b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(wj.externalDest) + '">' + escapeHtml(wj.externalDest) + '</div>';
                
                var infoItems = [];
                if (wj.cableMarker) infoItems.push('Cable: ' + wj.cableMarker);
                if (sourceDevice) infoItems.push('From: ' + sourceDevice);
                if (wj.fromPort) infoItems.push('Port: ' + wj.fromPort);
                if (infoItems.length > 0) {
                    html += '<div style="font-size:9px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + infoItems.join(' • ') + '</div>';
                }
                html += '</div></div>';
            });
            
            html += '</div></div>';
        }
        
        html += '</div>'; // End floorDevicesContainer
        html += '</div>'; // End room-info-modal
        
        // Room display name with 2-digit format
        var roomDisplayName = room.nickname || ('Room ' + roomIdFormatted);
        var titleText = roomDisplayName + ' (' + roomIdFormatted + ')';
        
        // Show modal - 70% width, then apply default filters
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '<span style="color:#166534">🏢 ' + escapeHtml(titleText) + '</span>',
                html: html,
                showCloseButton: true,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Close',
                cancelButtonColor: '#64748b',
                allowOutsideClick: false,
                width: 'auto',
                background: '#ffffff',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-lg',
                    htmlContainer: 'text-left'
                },
                didOpen: function() {
                    // Apply default filters (Online + Connected)
                    FloorPlan.applyFilters();
                }
            });
        } else {
            Toast.info('Room: ' + roomDisplayName + ' - ' + roomDevices.length + ' devices');
        }
    }
    
    // Switch to another room from the dropdown
    function switchRoom(roomId) {
        var newRoom = rooms.find(function(r) { return String(r.id) === String(roomId); });
        if (newRoom) {
            Swal.close();
            setTimeout(function() {
                selectRoom(newRoom);
                showRoomInfo(newRoom);
            }, 100);
        }
    }
    
    // Open device detail - close FloorPlan modal first
    function openDeviceDetail(deviceId) {
        Swal.close();
        setTimeout(function() {
            if (typeof DeviceDetail !== 'undefined' && DeviceDetail.open) {
                DeviceDetail.open(deviceId);
            }
        }, 100);
    }
    
    // Open Guacamole - keep FloorPlan modal open
    function openDeviceGuacamole(deviceId, protocol) {
        if (typeof DeviceDetail !== 'undefined' && DeviceDetail.openGuacamole) {
            DeviceDetail.openGuacamole(deviceId, protocol);
        }
    }
    
    // Apply filters in room modal
    function applyFilters() {
        var locationFilter = document.getElementById('floorFilterLocation');
        var groupFilter = document.getElementById('floorFilterGroup');
        var typeFilter = document.getElementById('floorFilterType');
        var statusFilter = document.getElementById('floorFilterStatus');
        var searchFilter = document.getElementById('floorFilterSearch');
        var connectedFilter = document.getElementById('floorFilterConnected');
        var countBadge = document.getElementById('floorFilterCount');
        
        var location = locationFilter ? locationFilter.value : '';
        var group = groupFilter ? groupFilter.value : '';
        var type = typeFilter ? typeFilter.value : '';
        var status = statusFilter ? statusFilter.value : '';
        var search = searchFilter ? searchFilter.value.toLowerCase().trim() : '';
        var connectedOnly = connectedFilter ? connectedFilter.checked : false;
        
        // Get connected device IDs
        var connectedDeviceIds = {};
        if (typeof appState !== 'undefined' && appState.connections) {
            appState.connections.forEach(function(c) {
                connectedDeviceIds[c.from] = true;
                connectedDeviceIds[c.to] = true;
            });
        }
        
        var totalVisible = 0;
        var typeGroups = document.querySelectorAll('.floor-type-group');
        
        typeGroups.forEach(function(groupEl) {
            var groupType = groupEl.getAttribute('data-type');
            var matchTypeFilter = !type || groupType === type;
            
            if (!matchTypeFilter) {
                groupEl.style.display = 'none';
                return;
            }
            
            // Check items within this group
            var items = groupEl.querySelectorAll('.floor-device-item');
            var visibleCount = 0;
            
            items.forEach(function(item) {
                var itemStatus = item.getAttribute('data-status');
                var itemName = item.getAttribute('data-name');
                var itemLocation = item.getAttribute('data-location') || '';
                var itemGroup = item.getAttribute('data-group') || '';
                var deviceId = item.getAttribute('data-device-id');
                
                var matchStatus = !status || itemStatus === status;
                var matchSearch = !search || itemName.indexOf(search) >= 0;
                var matchLocation = !location || itemLocation === location;
                var matchGroup = !group || itemGroup === group;
                var matchConnected = !connectedOnly || connectedDeviceIds[deviceId];
                
                var show = matchStatus && matchSearch && matchLocation && matchGroup && matchConnected;
                item.style.display = show ? '' : 'none';
                if (show) {
                    visibleCount++;
                    totalVisible++;
                }
            });
            
            // Hide entire group if no visible items
            groupEl.style.display = visibleCount > 0 ? '' : 'none';
            
            // Update count badge in group header
            var groupCountBadge = groupEl.querySelector('.floor-type-count');
            if (groupCountBadge) groupCountBadge.textContent = visibleCount;
        });
        
        // Update total count badge with filtered/total
        if (countBadge) {
            var allItems = document.querySelectorAll('.floor-device-item');
            var totalItems = allItems.length;
            if (totalVisible === totalItems) {
                countBadge.textContent = totalItems + ' devices';
                countBadge.style.background = '#dbeafe';
                countBadge.style.color = '#1d4ed8';
            } else {
                countBadge.textContent = totalVisible + '/' + totalItems + ' devices';
                countBadge.style.background = '#fef3c7';
                countBadge.style.color = '#b45309';
            }
        }
    }
    
    // Clear all filters - restore defaults (Online + Connected checked)
    function clearFilters() {
        var locationFilter = document.getElementById('floorFilterLocation');
        var groupFilter = document.getElementById('floorFilterGroup');
        var typeFilter = document.getElementById('floorFilterType');
        var statusFilter = document.getElementById('floorFilterStatus');
        var searchFilter = document.getElementById('floorFilterSearch');
        var connectedFilter = document.getElementById('floorFilterConnected');
        
        if (locationFilter) locationFilter.value = '';
        if (groupFilter) groupFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (statusFilter) statusFilter.value = 'active'; // Default to Online
        if (searchFilter) searchFilter.value = '';
        if (connectedFilter) connectedFilter.checked = true; // Default to Connected
        
        applyFilters();
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
            // Format ID with leading zero for 0-9
            var displayId = parseInt(room.id) >= 0 && parseInt(room.id) <= 9 ? '0' + room.id : room.id;
            var label = room.nickname ? displayId + ' - ' + room.nickname : displayId;
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
    
    /**
     * Open remote link - tries Guacamole first, then falls back to protocol handler
     */
    function openRemoteLink(element) {
        var deviceId = element.getAttribute('data-device-id');
        var protocol = element.getAttribute('data-protocol');
        var copyUrl = element.getAttribute('data-copy-url');
        
        // Try Guacamole first if DeviceDetail is available
        if (typeof DeviceDetail !== 'undefined' && DeviceDetail.openGuacamole) {
            DeviceDetail.openGuacamole(deviceId, protocol);
        } else if (typeof openProtocolLink === 'function') {
            // Fallback to standard protocol handler
            openProtocolLink(element);
        } else {
            // Last resort: copy to clipboard
            if (copyUrl) {
                navigator.clipboard.writeText(copyUrl).then(function() {
                    showToast('📋 Copied: ' + copyUrl, 'success');
                }).catch(function() {
                    prompt('Copy this address:', copyUrl);
                });
            }
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
        getRooms: function() { return rooms; },
        openRemoteLink: openRemoteLink,
        // New modal functions
        switchRoom: switchRoom,
        openDeviceDetail: openDeviceDetail,
        openDeviceGuacamole: openDeviceGuacamole,
        applyFilters: applyFilters,
        clearFilters: clearFilters
    };
})();
