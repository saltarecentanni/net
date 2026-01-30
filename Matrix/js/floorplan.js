/**
 * TIESSE Matrix Network - Floor Plan Module
 * Version: 3.4.0
 * 
 * Interactive floor plan visualization with:
 * - SVG rendering and manipulation
 * - Room management (CRUD)
 * - Device placement on floor plan
 * - Zoom/Pan controls
 * - Click interactions
 * 
 * NOTE: Mapping tool available at /draw-rooms-v2.html (undocumented)
 */

'use strict';

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
            if (typeof save === 'function') {
                save(); // Save to server
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
        svg.style.background = '#f9fafb';
        
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
        
        // Check if clicking on a room
        var target = e.target;
        if (target.classList.contains('room-area')) {
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
        
        // Get devices by location field
        var roomDevices = appState.devices.filter(function(d) { 
            return d.location === room.name; 
        });
        
        // Create room group
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'room-group');
        g.setAttribute('data-room-id', room.id);
        
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
        
        // Labels removed - already on the plant image
        
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
        // Get devices by location field
        var roomDevices = appState.devices.filter(function(d) { 
            return d.location === room.id; 
        });
        
        // Build devices list HTML
        var devicesHtml = '';
        if (roomDevices.length > 0) {
            devicesHtml = '<ul class="mt-2 space-y-1">';
            roomDevices.forEach(function(device) {
                var statusColor = device.status === 'active' ? '#22c55e' : '#ef4444';
                devicesHtml += '<li style="display:flex;align-items:center;gap:8px;padding:4px 0;">';
                devicesHtml += '<span style="width:8px;height:8px;border-radius:50%;background:' + statusColor + '"></span>';
                devicesHtml += '<span>' + escapeHtml(device.name) + '</span>';
                if (device.type) devicesHtml += '<span style="color:#64748b;font-size:12px;">(' + device.type + ')</span>';
                devicesHtml += '</li>';
            });
            devicesHtml += '</ul>';
        } else {
            devicesHtml = '<p style="color:#64748b;font-size:14px;margin-top:8px;">No devices assigned</p>';
        }
        
        // Title with nickname if exists
        var titleText = room.nickname ? room.nickname + ' (Sala ' + room.id + ')' : 'Sala ' + room.id;
        
        // Show modal with SweetAlert2
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '<span style="color:#22c55e">🏢 ' + escapeHtml(titleText) + '</span>',
                html: '<div style="text-align:left;">' +
                    '<div style="margin-bottom:16px;">' +
                    '<label style="font-size:12px;color:#64748b;">Room Nickname:</label>' +
                    '<input type="text" id="roomNicknameInput" value="' + escapeHtml(room.nickname || '') + '" ' +
                    'placeholder="Ex: Sala Server, Ufficio 12" ' +
                    'style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;">' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                    '<div>' +
                    '<h4 style="font-weight:600;color:#334155;margin-bottom:8px;">📏 Details</h4>' +
                    '<p><strong>ID:</strong> ' + room.id + '</p>' +
                    '<p><strong>Tipo:</strong> ' + (room.type || 'office') + '</p>' +
                    '</div>' +
                    '<div>' +
                    '<h4 style="font-weight:600;color:#334155;margin-bottom:8px;">💻 Devices (' + roomDevices.length + ')</h4>' +
                    devicesHtml +
                    '</div>' +
                    '</div>' +
                    '</div>',
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: '💾 Save Nickname',
                confirmButtonColor: '#22c55e',
                width: '500px',
                background: '#f8fafc',
                customClass: {
                    popup: 'rounded-xl'
                },
                preConfirm: function() {
                    return document.getElementById('roomNicknameInput').value;
                }
            }).then(function(result) {
                if (result.isConfirmed) {
                    // Atualizar nickname da sala
                    room.nickname = result.value;
                    saveRoomsData();
                    // Atualizar select de location
                    if (typeof updateLocationSelect === 'function') {
                        updateLocationSelect();
                    }
                }
            });
        } else {
            // Fallback sem SweetAlert2
            alert('Room: ' + room.name + '\nDevices: ' + roomDevices.length);
        }
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
            alert('Please draw a polygon on the floor plan to create a room.\nEdit mode will be implemented in the next version.');
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
                // In a full implementation, this would activate polygon drawing mode
                alert('Polygon drawing mode coming soon!\nFor now, rooms can be added programmatically.');
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
        if (!confirm('Delete this room?')) return;
        
        rooms = rooms.filter(function(r) { return r.id !== roomId; });
        saveRoomsData();
        closeRoomPanel();
        renderRooms();
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
                // TODO: Auto zoom to room
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
            alert('No floor plan loaded');
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
            container.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">No rooms mapped</span>';
            return;
        }
        
        var html = '';
        sortedRooms.forEach(function(room) {
            var label = room.nickname ? room.id + ' - ' + room.nickname : room.id;
            var textColor = room.nickname ? 'color: #6d28d9;' : 'color: #64748b;';
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
        updateStats: updateStats
    };
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    return {
        init: init,
        zoom: zoom,
        resetZoom: resetZoom,
        toggleEditMode: toggleEditMode,
        exportToPNG: exportToPNG
    };
})();
