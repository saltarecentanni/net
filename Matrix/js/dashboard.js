/**
 * TIESSE Matrix Network - Dashboard Module
 * Version: 3.6.005
 * 
 * Features:
 * - Donut charts for device statistics
 * - Intelligent search across all fields
 * - Quick access links (SSH, RDP, HTTP, etc.)
 */

var Dashboard = (function() {
    'use strict';
    
    // Chart instances
    var charts = {
        byType: null,
        byStatus: null,
        byRoom: null
    };
    
    // Color palettes - DISTINCT COLORS
    var COLORS = {
        types: {
            server: '#3b82f6',      // blue
            switch: '#10b981',      // emerald
            router: '#8b5cf6',      // purple
            firewall: '#ef4444',    // red
            workstation: '#f472b6', // pink light
            laptop: '#06b6d4',      // cyan
            phone: '#ec4899',       // pink
            access_point: '#14b8a6',// teal
            wifi: '#f59e0b',        // amber (changed)
            printer: '#6b7280',     // gray
            storage: '#84cc16',     // lime
            nas: '#22d3ee',         // cyan light
            camera: '#a78bfa',      // violet light
            ups: '#fb923c',         // orange
            pdu: '#c084fc',         // purple light
            patch_panel: '#64748b', // slate
            patch: '#78716c',       // stone
            walljack: '#a3a3a3',    // neutral
            isp: '#0ea5e9',         // sky
            modem: '#7dd3fc',       // sky light
            router_wifi: '#4ade80', // green light
            hub: '#94a3b8',         // slate light
            pc: '#818cf8',          // indigo light
            ip_phone: '#f43f5e',    // rose
            tv: '#1e293b',          // slate dark
            display: '#475569',     // slate medium
            monitor: '#60a5fa',     // blue light
            others: '#d4d4d4',      // gray light
            other: '#a1a1aa'        // zinc
        },
        status: {
            active: '#10b981',      // emerald
            online: '#4ade80',      // green light
            offline: '#ef4444',     // red
            disabled: '#6b7280',    // gray
            maintenance: '#8b5cf6', // purple
            warning: '#fbbf24',     // amber
            error: '#dc2626'        // red dark
        },
        rooms: [
            '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f472b6',
            '#06b6d4', '#ec4899', '#14b8a6', '#84cc16', '#22d3ee',
            '#a78bfa', '#fb923c', '#c084fc', '#0ea5e9', '#4ade80',
            '#f43f5e', '#fbbf24', '#60a5fa', '#78716c', '#818cf8'
        ]
    };
    
    /**
     * Initialize dashboard
     */
    function init() {
        console.log('[Dashboard] Initializing...');
        
        // Setup search input listener
        var searchInput = document.getElementById('dashboardSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    clearSearch();
                }
            });
            // Focus shows dropdown if has content
            searchInput.addEventListener('focus', function() {
                if (searchInput.value.length >= 2) {
                    var results = document.getElementById('searchResults');
                    if (results && results.children.length > 0) {
                        results.classList.remove('hidden');
                    }
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            var searchContainer = document.querySelector('#dashboardSearch');
            var resultsContainer = document.getElementById('searchResults');
            if (searchContainer && resultsContainer) {
                if (!searchContainer.contains(e.target) && !resultsContainer.contains(e.target)) {
                    resultsContainer.classList.add('hidden');
                }
            }
        });
        
        // Initial render
        setTimeout(function() {
            updateCharts();
            updateStats();
        }, 500);
    }
    
    /**
     * Update all charts
     */
    function updateCharts() {
        if (!window.appState || !window.appState.devices) {
            console.log('[Dashboard] Waiting for appState...');
            return;
        }
        
        updateChartByType();
        updateChartByStatus();
        updateChartByRoom();
    }
    
    /**
     * Chart: Devices by Type
     */
    function updateChartByType() {
        var ctx = document.getElementById('chartByType');
        if (!ctx) return;
        
        var devices = appState.devices || [];
        var typeCounts = {};
        
        devices.forEach(function(d) {
            var type = (d.type || 'other').toLowerCase();
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        // Sort by count descending
        var sorted = Object.entries(typeCounts).sort(function(a, b) { return b[1] - a[1]; });
        var labels = sorted.map(function(e) { return e[0]; });
        var data = sorted.map(function(e) { return e[1]; });
        var colors = labels.map(function(l) { return COLORS.types[l] || '#9ca3af'; });
        
        // Labels with counts: "Switch (25)" - properly formatted
        var labelsWithCounts = labels.map(function(l, i) {
            return formatLabel(l) + ' (' + data[i] + ')';
        });
        
        if (charts.byType) {
            charts.byType.destroy();
        }
        
        charts.byType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsWithCounts,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 6,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Dispositivi per Tipo',
                        font: { size: 15, weight: 'bold' }
                    }
                }
            }
        });
    }
    
    /**
     * Chart: Devices by Status
     */
    function updateChartByStatus() {
        var ctx = document.getElementById('chartByStatus');
        if (!ctx) return;
        
        var devices = appState.devices || [];
        var statusCounts = {};
        
        devices.forEach(function(d) {
            var status = (d.status || 'active').toLowerCase();
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Sort by count descending
        var sorted = Object.entries(statusCounts).sort(function(a, b) { return b[1] - a[1]; });
        var labels = sorted.map(function(e) { return e[0]; });
        var data = sorted.map(function(e) { return e[1]; });
        var colors = labels.map(function(l) { return COLORS.status[l] || '#9ca3af'; });
        
        // Labels with counts: "Active (97)" - properly formatted
        var labelsWithCounts = labels.map(function(l, i) {
            return formatLabel(l) + ' (' + data[i] + ')';
        });
        
        if (charts.byStatus) {
            charts.byStatus.destroy();
        }
        
        charts.byStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsWithCounts,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 6,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Dispositivi per Status',
                        font: { size: 15, weight: 'bold' }
                    }
                }
            }
        });
    }
    
    /**
     * Chart: Devices by Room/Location
     */
    function updateChartByRoom() {
        var ctx = document.getElementById('chartByRoom');
        if (!ctx) return;
        
        var devices = appState.devices || [];
        var rooms = appState.rooms || [];
        var locations = appState.locations || [];
        var roomCounts = {};
        
        devices.forEach(function(d) {
            var room = d.location || d.room || 'Unknown';
            roomCounts[room] = (roomCounts[room] || 0) + 1;
        });
        
        // Sort by count descending
        var sorted = Object.entries(roomCounts).sort(function(a, b) { return b[1] - a[1]; });
        var labels = sorted.map(function(e) { return e[0]; });
        var data = sorted.map(function(e) { return e[1]; });
        var colors = labels.map(function(_, i) { return COLORS.rooms[i % COLORS.rooms.length]; });
        
        // Labels with room number prefix and counts: "00 - Sala Server (15)"
        var labelsWithCounts = labels.map(function(l, i) {
            // Find the room that matches this location name
            var roomNum = '';
            var locLower = l.toLowerCase().replace(/\s+/g, '');
            
            // First, search in rooms array
            for (var j = 0; j < rooms.length; j++) {
                var r = rooms[j];
                var nick = (r.nickname || '').toLowerCase().replace(/\s+/g, '');
                var rname = (r.name || '').toLowerCase().replace(/\s+/g, '');
                var rid = String(r.id !== undefined ? r.id : '').toLowerCase();
                
                if (l === r.nickname || l === r.name || l === String(r.id) ||
                    locLower === nick || locLower === rname || locLower === rid) {
                    roomNum = String(r.id).padStart(2, '0') + ' - ';
                    break;
                }
            }
            
            // If not found in rooms, search in locations (custom locations)
            if (!roomNum) {
                for (var k = 0; k < locations.length; k++) {
                    var loc = locations[k];
                    var locName = (loc.name || '').toLowerCase().replace(/\s+/g, '');
                    
                    if (l === loc.name || locLower === locName) {
                        roomNum = String(loc.code || loc.id || '').padStart(2, '0') + ' - ';
                        break;
                    }
                }
            }
            
            return roomNum + l + ' (' + data[i] + ')';
        });
        
        if (charts.byRoom) {
            charts.byRoom.destroy();
        }
        
        charts.byRoom = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsWithCounts,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 6,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Dispositivi per Location',
                        font: { size: 15, weight: 'bold' }
                    }
                }
            }
        });
    }
    
    /**
     * Update statistics cards
     */
    function updateStats() {
        if (!window.appState) return;
        
        var devices = appState.devices || [];
        var connections = appState.connections || [];
        var rooms = appState.rooms || [];
        
        // Count unique locations
        var locations = {};
        devices.forEach(function(d) {
            if (d.location) locations[d.location] = true;
        });
        
        // Update DOM
        setElementText('statTotalDevices', devices.length);
        setElementText('statTotalConnections', connections.length);
        setElementText('statTotalRooms', Object.keys(locations).length);
    }
    
    /**
     * Intelligent Search Handler
     */
    function handleSearch(e) {
        var query = (e.target.value || '').trim().toLowerCase();
        var resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) return;
        
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }
        
        var results = searchDevices(query);
        renderSearchResults(results, query);
        resultsContainer.classList.remove('hidden');
    }
    
    /**
     * Search devices and connections by any field
     */
    function searchDevices(query) {
        var results = [];
        
        // Search in devices
        if (window.appState && window.appState.devices) {
            appState.devices.forEach(function(device) {
                var score = calculateSearchScore(device, query);
                if (score > 0) {
                    results.push({
                        type: 'device',
                        device: device,
                        score: score
                    });
                }
            });
        }
        
        // Search in connections
        if (window.appState && window.appState.connections) {
            appState.connections.forEach(function(conn, idx) {
                var score = calculateConnectionSearchScore(conn, idx, query);
                if (score > 0) {
                    results.push({
                        type: 'connection',
                        connection: conn,
                        connectionIndex: idx,
                        score: score
                    });
                }
            });
        }
        
        // Sort by score (higher = better match)
        results.sort(function(a, b) { return b.score - a.score; });
        
        return results.slice(0, 25); // Limit to 25 results
    }
    
    /**
     * Normalize text for fuzzy search - removes hyphens, spaces, underscores
     * So "d-link" matches "dlink", "big one" matches "bigone"
     */
    function normalizeForSearch(text) {
        return text.toLowerCase().replace(/[-_\s.]/g, '');
    }
    
    /**
     * Check if text matches query (both exact and normalized)
     */
    function fuzzyMatch(text, query) {
        if (!text) return false;
        var textLower = text.toLowerCase();
        var queryLower = query.toLowerCase();
        // Exact match
        if (textLower.includes(queryLower)) return true;
        // Normalized match (ignoring hyphens, spaces, etc.)
        return normalizeForSearch(text).includes(normalizeForSearch(query));
    }
    
    /**
     * Calculate search relevance score - searches ALL fields
     */
    function calculateSearchScore(device, query) {
        var score = 0;
        var queryLower = query.toLowerCase();
        var queryNorm = normalizeForSearch(query);
        
        // Name (highest priority)
        if (device.name) {
            var nameLower = device.name.toLowerCase();
            var nameNorm = normalizeForSearch(device.name);
            if (nameLower.includes(queryLower)) {
                score += 100;
                if (nameLower.startsWith(queryLower)) score += 50;
            } else if (nameNorm.includes(queryNorm)) {
                score += 90; // Fuzzy match gets slightly lower score
                if (nameNorm.startsWith(queryNorm)) score += 40;
            }
        }
        
        // IP addresses (check all IPs in addresses array)
        if (device.addresses && device.addresses.length > 0) {
            for (var i = 0; i < device.addresses.length; i++) {
                var addr = device.addresses[i];
                var ip = addr.network || addr.ip || '';
                if (ip.toLowerCase().includes(queryLower)) {
                    score += 90;
                    if (ip.startsWith(query)) score += 40;
                }
            }
        }
        // Legacy IP fields
        if (device.ip && device.ip.toLowerCase().includes(queryLower)) {
            score += 90;
        }
        if (device.ip1 && device.ip1.toLowerCase().includes(queryLower)) {
            score += 90;
        }
        if (device.ip2 && device.ip2.toLowerCase().includes(queryLower)) {
            score += 85;
        }
        if (device.ip3 && device.ip3.toLowerCase().includes(queryLower)) {
            score += 85;
        }
        if (device.ip4 && device.ip4.toLowerCase().includes(queryLower)) {
            score += 85;
        }
        
        // Hostname
        if (fuzzyMatch(device.hostname, query)) {
            score += 80;
        }
        
        // Type
        if (fuzzyMatch(device.type, query)) {
            score += 70;
        }
        
        // Location/Room
        if (fuzzyMatch(device.location, query)) {
            score += 60;
        }
        if (fuzzyMatch(device.room, query)) {
            score += 60;
        }
        
        // RackId/Group
        if (fuzzyMatch(device.rackId, query)) {
            score += 55;
        }
        
        // Brand/Model
        if (fuzzyMatch(device.brandModel, query)) {
            score += 50;
        }
        
        // Service
        if (fuzzyMatch(device.service, query)) {
            score += 45;
        }
        
        // MAC address
        if (device.mac && device.mac.toLowerCase().replace(/[:-]/g, '').includes(queryLower.replace(/[:-]/g, ''))) {
            score += 50;
        }
        
        // Notes/Description
        if (fuzzyMatch(device.notes, query)) {
            score += 30;
        }
        if (fuzzyMatch(device.description, query)) {
            score += 30;
        }
        
        // Model/Manufacturer
        if (fuzzyMatch(device.model, query)) {
            score += 40;
        }
        if (fuzzyMatch(device.manufacturer, query)) {
            score += 40;
        }
        
        // Status
        if (fuzzyMatch(device.status, query)) {
            score += 20;
        }
        
        // Serial
        if (fuzzyMatch(device.serial, query)) {
            score += 35;
        }
        
        return score;
    }
    
    /**
     * Calculate search relevance score for connections
     */
    function calculateConnectionSearchScore(conn, idx, query) {
        var score = 0;
        var queryLower = query.toLowerCase();
        
        // Get device names for searching
        var fromDevice = getDeviceById(conn.from);
        var toDevice = getDeviceById(conn.to);
        var fromName = fromDevice ? fromDevice.name : '';
        var toName = toDevice ? toDevice.name : '';
        
        // Search in device names (with fuzzy match)
        if (fuzzyMatch(fromName, query)) {
            score += 80;
        }
        if (fuzzyMatch(toName, query)) {
            score += 80;
        }
        
        // Port names
        if (fuzzyMatch(conn.fromPort, query)) {
            score += 70;
        }
        if (fuzzyMatch(conn.toPort, query)) {
            score += 70;
        }
        
        // External destination
        if (fuzzyMatch(conn.externalDest, query)) {
            score += 75;
        }
        
        // Connection type (fiber, copper, etc)
        if (fuzzyMatch(conn.type, query)) {
            score += 60;
        }
        
        // Cable marker/label
        if (fuzzyMatch(conn.cableMarker, query)) {
            score += 90;
        }
        
        // Cable color
        if (fuzzyMatch(conn.cableColor, query)) {
            score += 50;
        }
        
        // Room/location
        if (fuzzyMatch(conn.roomId, query)) {
            score += 55;
        }
        
        // Notes
        if (fuzzyMatch(conn.notes, query)) {
            score += 40;
        }
        
        // VLAN (if in notes or type)
        if (queryLower.includes('vlan')) {
            if ((conn.notes && conn.notes.toLowerCase().includes('vlan')) || 
                (conn.type && conn.type.toLowerCase().includes('vlan'))) {
                score += 60;
            }
        }
        
        return score;
    }
    
    /**
     * Get device by ID helper
     */
    function getDeviceById(id) {
        if (!window.appState || !window.appState.devices) return null;
        for (var i = 0; i < appState.devices.length; i++) {
            if (appState.devices[i].id === id) {
                return appState.devices[i];
            }
        }
        return null;
    }
    
    /**
     * Render search results
     */
    function renderSearchResults(results, query) {
        var container = document.getElementById('searchResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="text-slate-400 text-center py-4 text-xs">Nessun risultato per "<b>' + escapeHtml(query) + '</b>"</div>';
            container.classList.remove('hidden');
            return;
        }
        
        // Count devices and connections
        var deviceCount = 0;
        var connCount = 0;
        results.forEach(function(r) {
            if (r.type === 'device') deviceCount++;
            else connCount++;
        });
        
        var countText = '';
        if (deviceCount > 0) countText += deviceCount + ' dispositivi';
        if (connCount > 0) countText += (countText ? ', ' : '') + connCount + ' connessioni';
        
        // Sort: devices first, then connections
        var sortedResults = results.slice().sort(function(a, b) {
            if (a.type === 'device' && b.type !== 'device') return -1;
            if (a.type !== 'device' && b.type === 'device') return 1;
            return b.score - a.score;
        });
        
        var html = '<div class="sticky top-0 bg-white border-b border-slate-200 px-3 py-2 text-[11px] text-slate-600 font-medium">' + countText + '</div>';
        html += '<div class="p-2 space-y-1">';
        
        sortedResults.forEach(function(result) {
            if (result.type === 'device') {
                html += renderSearchResultItem(result.device, query);
            } else {
                html += renderConnectionResultItem(result.connection, result.connectionIndex, query);
            }
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    /**
     * Render single search result item - DEVICE
     */
    function renderSearchResultItem(device, query) {
        var typeIcon = getDeviceIconEmoji(device.type);
        var statusColor = getStatusColor(device.status);
        
        // Get IP from addresses array or legacy field
        var deviceIP = '';
        if (device.addresses && device.addresses.length > 0) {
            deviceIP = device.addresses[0].network || device.addresses[0].ip || '';
        } else {
            deviceIP = device.ip || device.ip1 || '';
        }
        
        // Format position with leading zero
        var positionText = String(device.order || device.id || 0).padStart(2, '0');
        
        // Format location with room number
        var locationText = '';
        if (device.location) {
            var roomNum = findRoomNumber(device.location);
            locationText = roomNum ? roomNum + ' - ' + device.location : device.location;
        }
        
        var html = '<div class="bg-white border-l-4 border-l-blue-500 border border-slate-200 rounded-r p-3 hover:bg-blue-50 transition-all cursor-pointer flex items-center gap-3" onclick="Dashboard.goToDevice(' + device.id + ')">';
        
        // Category badge
        html += '<span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">📱 DEVICE</span>';
        
        // Icon
        html += '<span class="text-lg">' + typeIcon + '</span>';
        
        // Main info
        html += '<div class="flex-1 min-w-0">';
        
        // Line 1: NAME • Group • ID/Position #00
        html += '<div class="font-semibold text-slate-800 text-base truncate">';
        html += highlightMatch(device.name || 'Unnamed', query);
        if (device.rackId) html += ' <span class="text-slate-500 font-normal">• ' + device.rackId.toUpperCase() + '</span>';
        html += ' <span class="text-blue-600 font-medium">• #' + positionText + '</span>';
        html += '</div>';
        
        // Line 2: Type • Location (purple) • IP
        html += '<div class="text-sm text-slate-600">';
        html += '<span class="uppercase font-medium">' + formatLabel(device.type || '') + '</span>';
        if (locationText) html += ' • <span class="text-purple-600 font-semibold">📍 ' + locationText + '</span>';
        if (deviceIP) html += ' • <span class="font-mono bg-slate-100 px-1 rounded">' + deviceIP + '</span>';
        html += '</div>';
        
        html += '</div>';
        
        // Status
        html += '<span class="px-2 py-1 rounded text-xs font-bold ' + statusColor + '">' + (device.status || 'on').toUpperCase() + '</span>';
        
        html += '</div>';
        return html;
    }
    
    /**
     * Find room number for a location name
     */
    function findRoomNumber(locationName) {
        if (!locationName) return '';
        var locLower = locationName.toLowerCase().replace(/\s+/g, '');
        
        // Search in rooms
        if (appState.rooms && appState.rooms.length > 0) {
            for (var i = 0; i < appState.rooms.length; i++) {
                var r = appState.rooms[i];
                var nick = (r.nickname || '').toLowerCase().replace(/\s+/g, '');
                var rname = (r.name || '').toLowerCase().replace(/\s+/g, '');
                var rid = String(r.id !== undefined ? r.id : '').toLowerCase();
                
                if (locationName === r.nickname || locationName === r.name || locationName === String(r.id) ||
                    locLower === nick || locLower === rname || locLower === rid) {
                    return String(r.id).padStart(2, '0');
                }
            }
        }
        
        // Search in custom locations
        if (appState.locations && appState.locations.length > 0) {
            for (var j = 0; j < appState.locations.length; j++) {
                var loc = appState.locations[j];
                var locName = (loc.name || '').toLowerCase().replace(/\s+/g, '');
                
                if (locationName === loc.name || locLower === locName) {
                    var code = String(loc.code || loc.id || '').replace(/^loc-/, '');
                    return code.padStart(2, '0');
                }
            }
        }
        
        return '';
    }
    
    /**
     * Render single search result item - CONNECTION
     */
    function renderConnectionResultItem(conn, idx, query) {
        var fromDevice = getDeviceById(conn.from);
        var toDevice = getDeviceById(conn.to);
        var fromName = fromDevice ? fromDevice.name : 'Unknown';
        var toName = toDevice ? toDevice.name : (conn.externalDest || 'External');
        
        var html = '<div class="ml-4 bg-slate-50 border-l-4 border-l-purple-500 border border-slate-200 rounded-r p-3 hover:bg-purple-50 transition-all cursor-pointer flex items-center gap-3" onclick="Dashboard.goToConnection(' + idx + ')">';
        
        // Category badge
        html += '<span class="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">⚡ CONNECTION</span>';
        
        // Main info
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="font-semibold text-slate-700 text-base truncate">';
        html += highlightMatch(fromName, query) + ' <span class="text-purple-500 font-bold">→</span> ' + highlightMatch(toName, query);
        html += '</div>';
        html += '<div class="text-sm text-slate-600">';
        if (conn.fromPort) html += '<span class="font-mono font-medium bg-slate-200 px-1.5 py-0.5 rounded">' + conn.fromPort + '</span>';
        if (conn.toPort) html += ' → <span class="font-mono font-medium bg-slate-200 px-1.5 py-0.5 rounded">' + conn.toPort + '</span>';
        if (conn.type) html += ' • <span class="uppercase font-medium">' + conn.type + '</span>';
        if (conn.cableMarker) html += ' • 🏷️' + conn.cableMarker;
        html += '</div>';
        html += '</div>';
        
        // Type badge
        html += '<span class="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700">' + (conn.type || 'LINK').toUpperCase() + '</span>';
        
        html += '</div>';
        return html;
    }
    
    /**
     * Get device icon as emoji
     */
    function getDeviceIconEmoji(type) {
        var icons = {
            server: '🖥️', switch: '🔀', router: '📡', firewall: '🛡️',
            workstation: '💻', laptop: '💻', phone: '📱', ip_phone: '☎️',
            access_point: '📶', wifi: '📶', printer: '🖨️', storage: '💾',
            nas: '💾', camera: '📷', ups: '🔋', pdu: '⚡', patch_panel: '🔌',
            patch: '🔌', walljack: '🔳', isp: '🌐', modem: '📠',
            router_wifi: '📶', hub: '🔗', pc: '🖥️', tv: '📺',
            display: '🖵', monitor: '🖵', others: '📦', other: '📦'
        };
        return icons[(type || '').toLowerCase()] || '📦';
    }
    
    /**
     * Generate access links for a device
     */
    function generateAccessLinks(device) {
        var links = [];
        var ip = device.ip;
        
        if (!ip) return links;
        
        // Check for explicit access URLs in device properties
        if (device.webUrl || device.http_url || device.url) {
            var webUrl = device.webUrl || device.http_url || device.url;
            links.push({
                url: webUrl,
                label: 'Web',
                icon: '🌐',
                class: 'bg-blue-100 text-blue-700'
            });
        } else {
            // Default HTTP link for network devices
            var type = (device.type || '').toLowerCase();
            if (['switch', 'router', 'firewall', 'access_point', 'wifi', 'router_wifi', 'nas', 'storage', 'camera', 'printer'].includes(type)) {
                links.push({
                    url: 'http://' + ip,
                    label: 'HTTP',
                    icon: '🌐',
                    class: 'bg-blue-100 text-blue-700'
                });
            }
        }
        
        // HTTPS
        if (device.httpsUrl || device.https_url) {
            links.push({
                url: device.httpsUrl || device.https_url,
                label: 'HTTPS',
                icon: '🔒',
                class: 'bg-green-100 text-green-700'
            });
        }
        
        // SSH
        if (device.sshEnabled || device.ssh || device.sshUrl) {
            var sshUrl = device.sshUrl || ('ssh://' + (device.sshUser ? device.sshUser + '@' : '') + ip);
            links.push({
                url: sshUrl,
                label: 'SSH',
                icon: '💻',
                class: 'bg-slate-100 text-slate-700'
            });
        } else {
            // Add SSH for common server types
            var type = (device.type || '').toLowerCase();
            if (['server', 'switch', 'router', 'firewall'].includes(type)) {
                links.push({
                    url: 'ssh://' + ip,
                    label: 'SSH',
                    icon: '💻',
                    class: 'bg-slate-100 text-slate-700'
                });
            }
        }
        
        // RDP (Windows)
        if (device.rdpEnabled || device.rdp || device.rdpUrl) {
            var rdpUrl = device.rdpUrl || ('rdp://' + ip);
            links.push({
                url: rdpUrl,
                label: 'RDP',
                icon: '🖥️',
                class: 'bg-indigo-100 text-indigo-700'
            });
        } else {
            var type = (device.type || '').toLowerCase();
            if (['workstation', 'pc', 'server'].includes(type) && (device.os || '').toLowerCase().includes('windows')) {
                links.push({
                    url: 'rdp://' + ip,
                    label: 'RDP',
                    icon: '🖥️',
                    class: 'bg-indigo-100 text-indigo-700'
                });
            }
        }
        
        // VNC
        if (device.vncEnabled || device.vnc || device.vncUrl) {
            var vncUrl = device.vncUrl || ('vnc://' + ip);
            links.push({
                url: vncUrl,
                label: 'VNC',
                icon: '🖼️',
                class: 'bg-purple-100 text-purple-700'
            });
        }
        
        // Telnet (legacy)
        if (device.telnetEnabled || device.telnet) {
            links.push({
                url: 'telnet://' + ip,
                label: 'Telnet',
                icon: '📟',
                class: 'bg-amber-100 text-amber-700'
            });
        }
        
        // SNMP info
        if (device.snmpEnabled || device.snmp) {
            links.push({
                url: '#',
                label: 'SNMP',
                icon: '📊',
                class: 'bg-cyan-100 text-cyan-700'
            });
        }
        
        return links;
    }
    
    /**
     * Navigate to device in Devices tab
     */
    function goToDevice(deviceId) {
        // Hide search dropdown
        var resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        
        // Switch to devices tab
        if (typeof switchTab === 'function') {
            switchTab('devices');
        }
        
        // Scroll to device and highlight with animation
        setTimeout(function() {
            var deviceRow = document.querySelector('[data-device-id="' + deviceId + '"]');
            if (deviceRow) {
                deviceRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight animation
                deviceRow.style.transition = 'all 0.3s ease';
                deviceRow.style.backgroundColor = '#dbeafe';  // blue highlight
                deviceRow.style.boxShadow = '0 0 0 3px #3b82f6, 0 0 15px rgba(59,130,246,0.5)';
                deviceRow.style.transform = 'scale(1.01)';
                
                // Flash effect
                var flashCount = 0;
                var flashInterval = setInterval(function() {
                    flashCount++;
                    if (flashCount % 2 === 0) {
                        deviceRow.style.backgroundColor = '#dbeafe';
                    } else {
                        deviceRow.style.backgroundColor = '#bfdbfe';
                    }
                    if (flashCount >= 6) {
                        clearInterval(flashInterval);
                        // Remove highlight after 2 seconds
                        setTimeout(function() {
                            deviceRow.style.backgroundColor = '';
                            deviceRow.style.boxShadow = '';
                            deviceRow.style.transform = '';
                        }, 2000);
                    }
                }, 300);
            }
        }, 400);
    }
    
    /**
     * Navigate to connection in Active Connections tab
     */
    function goToConnection(connectionIndex) {
        // Hide search dropdown
        var resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        
        // Switch to active connections tab
        if (typeof switchTab === 'function') {
            switchTab('active');
        }
        
        // Scroll to connection and highlight with animation
        setTimeout(function() {
            // Try to find the connection row by data attribute or index
            var connRow = document.querySelector('[data-connection-index="' + connectionIndex + '"]');
            
            // If no data attribute, try to find by row number in the connections table
            if (!connRow) {
                var connTable = document.querySelector('#content-active table tbody');
                if (connTable && connTable.children[connectionIndex]) {
                    connRow = connTable.children[connectionIndex];
                }
            }
            
            if (connRow) {
                connRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight animation (purple for connections)
                connRow.style.transition = 'all 0.3s ease';
                connRow.style.backgroundColor = '#e9d5ff';  // purple highlight
                connRow.style.boxShadow = '0 0 0 3px #8b5cf6, 0 0 15px rgba(139,92,246,0.5)';
                connRow.style.transform = 'scale(1.01)';
                
                // Flash effect
                var flashCount = 0;
                var flashInterval = setInterval(function() {
                    flashCount++;
                    if (flashCount % 2 === 0) {
                        connRow.style.backgroundColor = '#e9d5ff';
                    } else {
                        connRow.style.backgroundColor = '#c4b5fd';
                    }
                    if (flashCount >= 6) {
                        clearInterval(flashInterval);
                        // Remove highlight after 2 seconds
                        setTimeout(function() {
                            connRow.style.backgroundColor = '';
                            connRow.style.boxShadow = '';
                            connRow.style.transform = '';
                        }, 2000);
                    }
                }, 300);
            }
        }, 400);
    }
    
    /**
     * Clear search
     */
    function clearSearch() {
        var searchInput = document.getElementById('dashboardSearch');
        var resultsContainer = document.getElementById('searchResults');
        
        if (searchInput) searchInput.value = '';
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
    }
    
    // ========== HELPER FUNCTIONS ==========
    
    function getDeviceIcon(type) {
        var icons = {
            server: '●', switch: '◆', router: '▲', firewall: '■',
            workstation: '○', laptop: '○', phone: '◇', ip_phone: '◇',
            access_point: '◈', wifi: '◈', printer: '▢', storage: '▣',
            nas: '▣', camera: '◉', ups: '▦', pdu: '▤', patch_panel: '▥',
            patch: '▥', walljack: '□', isp: '◎', modem: '◐',
            router_wifi: '◈', hub: '◌', pc: '●', tv: '▬',
            display: '▬', monitor: '▬', others: '◇', other: '◇'
        };
        return icons[(type || '').toLowerCase()] || '◇';
    }
    
    function getStatusColor(status) {
        var colors = {
            active: 'bg-green-100 text-green-700',
            online: 'bg-green-100 text-green-700',
            offline: 'bg-red-100 text-red-700',
            disabled: 'bg-slate-100 text-slate-700',
            maintenance: 'bg-amber-100 text-amber-700',
            warning: 'bg-yellow-100 text-yellow-700',
            error: 'bg-red-100 text-red-700'
        };
        return colors[(status || '').toLowerCase()] || 'bg-slate-100 text-slate-700';
    }
    
    function highlightMatch(text, query) {
        if (!text || !query) return escapeHtml(text || '');
        var escaped = escapeHtml(text);
        var regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
        return escaped.replace(regex, '<mark class="bg-blue-200 text-blue-900 px-0.5 rounded">$1</mark>');
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Format label for display: replace underscores with spaces and capitalize properly
     * Special handling for common abbreviations (IP, WiFi, NAS, ISP, etc.)
     */
    function formatLabel(str) {
        if (!str) return '';
        // Replace underscores with spaces
        var formatted = str.replace(/_/g, ' ');
        // Capitalize each word
        formatted = formatted.replace(/\b\w+/g, function(word) {
            var lower = word.toLowerCase();
            // Special abbreviations that should be uppercase
            var upperAbbreviations = ['ip', 'nas', 'isp', 'vpn', 'lan', 'wan', 'dmz', 'iot', 'ups', 'pdu', 'kvm', 'usb', 'hdmi', 'vga', 'cpu', 'ram', 'ssd', 'hdd'];
            // Special words with custom capitalization
            var specialWords = { 'wifi': 'WiFi', 'voip': 'VoIP', 'sfp': 'SFP', 'poe': 'PoE', 'qos': 'QoS' };
            
            if (upperAbbreviations.indexOf(lower) !== -1) {
                return lower.toUpperCase();
            }
            if (specialWords[lower]) {
                return specialWords[lower];
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
        return formatted;
    }
    
    function setElementText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // ========== PUBLIC API ==========
    
    return {
        init: init,
        updateCharts: updateCharts,
        updateStats: updateStats,
        goToDevice: goToDevice,
        goToConnection: goToConnection,
        clearSearch: clearSearch,
        refresh: function() {
            updateCharts();
            updateStats();
        }
    };
    
})();

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for appState to be loaded
    var checkInterval = setInterval(function() {
        if (window.appState && window.appState.devices) {
            clearInterval(checkInterval);
            Dashboard.init();
        }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(function() {
        clearInterval(checkInterval);
        Dashboard.init();
    }, 10000);
});
