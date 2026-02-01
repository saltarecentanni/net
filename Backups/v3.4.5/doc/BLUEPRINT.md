# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.4.5  
**Date:** February 1, 2026  
**Author:** Tiesse S.P.A.  
**Environment:** Ubuntu 24.04 LTS + Apache 2.4 + PHP 8.3

---

## 1. OVERVIEW

### 1.1 Description
A web-based network infrastructure management system for enterprise environments. Allows users to register network devices, map connections between them, visualize the topology in matrix and graphical formats, and manage room/floor plans with device associations.

### 1.2 Objectives
- Centralized documentation of network infrastructure
- Visual connection matrix between devices (SVG with zoom/pan)
- Interactive network topology map with Cisco-style icons
- Floor Plan with room management and device placement
- Activity logging for audit trail
- Export data to Excel/JSON/Draw.io/PNG for documentation
- Multi-user access via local network with authentication
- Complete data import/export including rooms

### 1.3 What's New in v3.4.5

#### 🔒 Security Fixes (v3.4.5)
| Fix | Description |
|-----|-------------|
| **XSS in Toast** | Changed innerHTML to textContent - prevents script injection |
| **DOM Manipulation** | Toast creates elements instead of injecting HTML strings |
| **User Content Safe** | Device names no longer vulnerable to XSS attacks |

#### 🐛 Critical Bug Fixes (v3.4.5)
| Fix | Description |
|-----|-------------|
| **removeConnection()** | Code executed outside .then() even when cancelled |
| **clearAll()** | Wrong API endpoint + missing serverSave() call |
| **floorplan.js** | Duplicate return made setRooms() unreachable |

#### ✅ Verified Systems (v3.4.5)
| System | Status |
|--------|--------|
| JSON Export | ✅ SHA-256 checksum working |
| JSON Import | ✅ Version validation + rollback |
| Excel Export | ✅ 4 sheets exported correctly |
| Form Validation | ✅ All validations present |
| Error Handling | ✅ All fetch calls have .catch() |
| PHP Backend | ✅ Security verified |

### 1.4 What's New in v3.4.3

#### 🔒 Multi-User Edit Lock System (v3.4.3)
| Enhancement | Description |
|-------------|-------------|
| **Edit Lock API** | `api/editlock.php` - Server-side lock management |
| **Client Module** | `js/editlock.js` - Lock acquire/release/heartbeat |
| **Lock Timeout** | 5 minutes inactivity auto-release |
| **Heartbeat** | 60-second intervals keep lock alive |
| **Conflict Prevention** | Shows warning when another user is editing |
| **Auto-Release** | Lock released on logout or page close |

#### 💾 Automated Backup System (v3.4.3)
| Enhancement | Description |
|-------------|-------------|
| **backup.sh** | Script with retention policy |
| **Weekly Backup** | Sunday 02:00 - 4 weeks rotational |
| **Monthly Backup** | Day 1 03:00 - 12 months retention |
| **Cron Integration** | Automatic scheduling via crontab |

#### 🔐 Security Hardening (v3.4.3)
| Enhancement | Description |
|-------------|-------------|
| **No Hardcoded Passwords** | Removed from all source files |
| **API-Only Verification** | Password checked via auth.php only |
| **Environment Variables** | Credentials in .env file |

### 1.4 What's New in v3.4.2

#### 🔒 Security & Reliability (v3.4.2)
| Enhancement | Description |
|-------------|-------------|
| **Async Save + Backup** | Non‑blocking save with temp file and .bak backup |
| **Write Serialization** | Queued writes prevent same‑process race conditions |
| **Timing‑Safe Auth** | Login comparison uses timingSafeEqual |
| **Session Cleanup** | Expired sessions purged periodically |
| **Export/Import Checksum** | JSON exports include checksum (simples); imports validate |
| **Input Validation** | Stricter device/connection validation | 

### 1.5 What's New in v3.4.0

#### 🏢 Floor Plan & Room Management
| Enhancement | Description |
|-------------|-------------|
| **Room-Device Association** | Devices linked to rooms via location field |
| **Room Nicknames** | Editable nicknames with automatic device sync |
| **Professional Room Modal** | SweetAlert2-based modal with device list |
| **Room Statistics** | Device count, connection status per room |
| **Export Rooms** | JSON/Excel exports now include rooms data |
| **setRooms() API** | FloorPlan module accepts external room data |

#### 🔧 Import/Export Critical Fixes
| Fix | Description |
|-----|-------------|
| **exportJSON()** | Now includes `rooms`, `exportedAt`, `version` |
| **importData()** | Validates and imports rooms with FloorPlan sync |
| **exportExcel()** | New "Rooms" sheet with all room data |
| **clearAll()** | Backup includes rooms, clear syncs FloorPlan |
| **saveToStorage()** | Now saves rooms to localStorage |

#### 🎨 UI/UX Improvements
| Enhancement | Description |
|-------------|-------------|
| **CSS Variables** | Standardized color system with variables |
| **Topology Legend** | Professional modal with SVG icons |
| **Room Modal** | Device list with icons, links, status badges |
| **Tab Colors** | Fixed primary-light blue color (#eff6ff) |
| **SVG Matrix** | ViewBox-based zoom and pan |

#### 🔧 Bug Fixes
| Fix | Description |
|-----|-------------|
| **Room Nickname Save** | Fixed `save()` → `serverSave()` |
| **Device Links** | Changed from `link/link2` to `links[]` array |
| **External Connections** | Normalized `isWallJack: undefined` → `false` |
| **deviceBelongsToRoom()** | Case-insensitive, space-normalized matching |

---

## 2. ARCHITECTURE

### 2.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | HTML5 + Tailwind CSS | Local (v3.x) |
| JavaScript | ES6 (Vanilla) | - |
| Icons | Custom SVG (Cisco-style) | - |
| Modals | SweetAlert2 | Local (assets/vendor) |
| Excel | SheetJS (XLSX) | 0.18.5 (Local) |
| Backend | PHP (Apache) or Node.js | 7.4+ / 16+ |
| Authentication | Session-based | - |
| Persistence | JSON file | - |
| Fallback | LocalStorage | - |

### 2.2 File Structure

```
Matrix/
├── index.html              # Main page (v3.4.x)
│                           # - Structural HTML with 7 tabs
│                           # - CSS Variables integration
│                           # - SweetAlert2 modals
│
├── server.js               # Node.js server (v3.4.x)
│                           # - No external dependencies
│                           # - Port 3000
│                           # - REST API for data persistence
│                           # - Session-based authentication
│
├── data.php                # REST API (PHP - for Apache)
│                           # - GET: returns data
│                           # - POST: saves data with file locking
│
├── draw-rooms-v2.html      # Room polygon mapping tool
│
├── start-server.bat        # Windows quick-start script
│
├── deploy.sh               # Linux deploy script
│
├── api/
│   ├── auth.php            # Authentication API (PHP)
│   └── editlock.php        # Edit Lock API (v3.4.3)
│                           # - acquire: get editing lock
│                           # - release: release lock
│                           # - heartbeat: keep lock alive
│                           # - status: check lock status
│
├── assets/
│   ├── logoTiesse.png      # Company logo
│   ├── planta.png          # Floor plan background image
│   └── vendor/             # Local libraries (offline capable)
│       ├── tailwind.min.js # Tailwind CSS
│       └── xlsx.full.min.js # SheetJS XLSX
│
├── backup/                 # Automated backup system (v3.4.3)
│   ├── backup.sh           # Backup script with retention
│   ├── weekly/             # Weekly backups (4 max)
│   └── monthly/            # Monthly backups (12 max)
│
├── config/
│   └── config.php          # Configuration (AUTH_USER, SESSION_TIMEOUT)
│
├── css/
│   └── styles.css          # CSS Variables and custom styles
│
├── data/
│   ├── network_manager.json  # Persisted data (devices, connections, rooms)
│   └── edit.lock           # Lock file (auto-generated)
│
├── doc/
│   ├── README.md           # User documentation
│   ├── BLUEPRINT.md        # Technical documentation (this file)
│   └── ROOM_STRUCTURE.md   # Room data structure documentation
│
└── js/
    ├── app.js              # Main logic (v3.4.x)
    │                       # - Global state (appState)
    │                       # - Device/Connection CRUD
    │                       # - Room-device association helpers
    │                       # - Import/Export with rooms
    │                       # - Toast notification system
    │
    ├── ui-updates.js       # UI Rendering (v3.4.x)
    │                       # - Device list (cards/table)
    │                       # - SVG Matrix with zoom/pan
    │                       # - Excel export (4 sheets)
    │                       # - XSS protection
    │
    ├── features.js         # Extended Features (v3.4.x)
    │                       # - ActivityLog module
    │                       # - SVGTopology module (Cisco icons)
    │                       # - DrawioExport module
    │                       # - Topology legend modal
    │
    ├── floorplan.js        # Floor Plan module (v3.4.x)
    │                       # - Room rendering on SVG
    │                       # - Room CRUD operations
    │                       # - Device-room associations
    │                       # - Room info modal (showRoomInfo)
    │                       # - PNG export
    │
    ├── editlock.js         # Edit Lock module (v3.4.3)
    │                       # - EditLock.acquire()
    │                       # - EditLock.release()
    │                       # - EditLock.heartbeat()
    │                       # - Conflict detection modal
    │
    └── auth.js             # Authentication module (v3.4.x)
                            # - Login/logout functions
                            # - Session management
                            # - EditLock integration
```

### 2.3 Version Summary

| File | Version | Description |
|------|---------|-------------|
| index.html | 3.4.3 | Main HTML with 7 tabs |
| server.js | 3.4.3 | Node.js REST server with auth |
| app.js | 3.4.3 | Core logic, CRUD, import/export |
| ui-updates.js | 3.4.3 | UI rendering, SVG Matrix |
| features.js | 3.4.3 | Extended features, topology |
| floorplan.js | 3.4.3 | Floor plan and room management |
| editlock.js | 3.4.3 | Multi-user edit lock module |
| editlock.php | 3.4.3 | Edit lock API |
| backup.sh | 3.4.3 | Automated backup script |
| auth.js | 3.4.3 | Authentication + EditLock |
| styles.css | 3.4.3 | CSS Variables |

---

## 3. DATA MODEL

### 3.1 Main Structure (Persisted in network_manager.json)

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117
}
```

### 3.2 Application State (Runtime)

```javascript
var appState = {
    devices: [],                    // Array of device objects
    connections: [],                // Array of connection objects
    rooms: [],                      // Array of room objects
    nextDeviceId: 1,                // Auto-increment ID counter
    connSort: [{ key: 'id', asc: true }],  // Multi-level sorting
    deviceSort: { key: 'rack', asc: true },
    deviceView: 'table',            // 'table' or 'cards'
    matrixLimit: 12,                // Matrix pagination limit
    matrixExpanded: false,
    rackColorMap: {},               // Rack color assignments
    deviceFilters: {
        location: '',
        source: '',
        name: '',
        type: '',
        status: '',
        hasConnections: ''          // '', 'yes', 'no'
    },
    connFilters: {
        source: '',
        anyDevice: '',
        fromDevice: '',
        toDevice: '',
        destination: '',
        type: '',
        status: '',
        cable: '',
        normalizeView: false
    }
};
```

### 3.3 Device Object

```json
{
  "id": 1,
  "rackId": "Rack-Network-01",
  "order": 1,
  "isRear": false,
  "name": "Tiesse-Wifi",
  "brandModel": "Imola IPQ-GW-WIFI",
  "type": "router_wifi",
  "status": "active",
  "location": "Sala Server",
  "addresses": [
    { "network": "10.10.100.220", "ip": "", "vlan": null }
  ],
  "service": "ssid: TIESSE",
  "ports": [
    { "name": "LAN1", "type": "eth", "status": "active" }
  ],
  "links": [
    { "label": "WebUI", "url": "http://10.10.100.220" }
  ],
  "notes": "Main WiFi router"
}
```

### 3.4 Connection Object

```json
{
  "from": 1,
  "to": 2,
  "fromPort": "LAN1",
  "toPort": "Gi0/1",
  "type": "lan",
  "status": "active",
  "cableMarker": "A001",
  "cableColor": "#3b82f6",
  "isWallJack": false,
  "externalDest": null,
  "notes": "Uplink connection"
}
```

### 3.5 Room Object

```json
{
  "id": "8",
  "name": "8",
  "nickname": "Sala Server",
  "type": "server",
  "area": 50,
  "capacity": 20,
  "description": "Main server room",
  "color": "rgba(239,68,68,0.15)",
  "polygon": [
    {"x": 760, "y": 281},
    {"x": 1010, "y": 281},
    {"x": 1010, "y": 521},
    {"x": 760, "y": 521}
  ],
  "notes": "Temperature controlled"
}
```

### 3.6 Device Types

| Type | Label | Description |
|------|-------|-------------|
| router | Router | Standard router |
| router_wifi | Router WiFi | Router with WiFi |
| switch | Switch | Network switch |
| patch | Patch Panel | Patch panel |
| walljack | Wall Jack | Wall outlet |
| firewall | Firewall | Firewall device |
| server | Server | Server |
| wifi | WiFi AP | Access point |
| isp | ISP/Provider | Internet provider |
| pc | PC/Desktop | Computer |
| printer | Printer | Printer |
| nas | NAS/Storage | Network storage |
| camera | IP Camera | Security camera |
| ups | UPS | Uninterruptible power |
| others | Others | Generic device |

### 3.7 Connection Types

| Type | Label | Color |
|------|-------|-------|
| lan | LAN | #3b82f6 (Blue) |
| wan | WAN/Internet | #10b981 (Green) |
| dmz | DMZ | #f59e0b (Amber) |
| trunk | Trunk/Uplink | #8b5cf6 (Purple) |
| management | Management | #06b6d4 (Cyan) |
| backup | Backup | #64748b (Gray) |
| fiber | Fiber Optic | #ec4899 (Pink) |
| wallport | Wall Jack | #84cc16 (Lime) |
| external | External | #f97316 (Orange) |
| other | Other | #64748b (Gray) |

### 3.8 Room Types

| Type | Label | Color |
|------|-------|-------|
| server | Server Room | rgba(239,68,68,0.15) |
| office | Office | rgba(59,130,246,0.15) |
| storage | Storage | rgba(34,197,94,0.15) |
| meeting | Meeting Room | rgba(168,85,247,0.15) |
| production | Production | rgba(249,115,22,0.15) |
| datacenter | Data Center | rgba(185,28,28,0.15) |
| network | Network Room | rgba(6,182,212,0.15) |
| other | Other | rgba(107,114,128,0.15) |

### 3.9 Port Types

| Value | Label | Category |
|-------|-------|----------|
| eth | Eth/RJ45 | copper |
| GbE | GbE 1G | copper |
| 2.5GbE | 2.5GbE | copper |
| 10GbE | 10GbE-T | copper |
| PoE | PoE/PoE+ | copper |
| SFP | SFP 1G | fiber |
| SFP+ | SFP+ 10G | fiber |
| SFP28 | SFP28 25G | fiber |
| QSFP+ | QSFP+ 40G | fiber |
| QSFP28 | QSFP28 100G | fiber |
| WAN | WAN | wan |
| MGMT | MGMT | management |
| TTY | Console/TTY | management |
| USB | USB | management |
| serial | Serial | legacy |
| others | Others | other |

---

## 4. USER INTERFACE

### 4.1 Tab Structure

| Tab | Icon | Purpose |
|-----|------|---------|
| Devices | 📋 | Device management (cards/table view) |
| Active Connections | ⚡ | Connection management with cascading forms |
| Matrix | 🔀 | SVG Connection matrix with zoom/pan |
| Topology | 🗺️ | Visual network map with Cisco icons |
| Floor Plan | 🏢 | Room management and device placement |
| Logs | 📝 | Activity log with filters |
| Help | ❓ | Integrated help |

### 4.2 CSS Variables

```css
:root {
    --color-primary: #3b82f6;
    --color-primary-light: #eff6ff;
    --color-primary-dark: #1e40af;
    --color-secondary: #64748b;
    --color-success: #22c55e;
    --color-success-light: #dcfce7;
    --color-danger: #ef4444;
    --color-danger-light: #fee2e2;
    --color-warning: #f59e0b;
    --color-warning-light: #fef3c7;
    --color-info: #06b6d4;
    --color-text: #1e293b;
    --color-text-light: #64748b;
    --color-text-inverse: #ffffff;
    --color-border: #e2e8f0;
    --color-bg: #f8fafc;
    --color-bg-alt: #f1f5f9;
}
```

### 4.3 Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| ✗ | Device/connection disabled |
| ↩ | Device on rear side of rack |
| 🟢 | Active status |
| 🔴 | Disabled status |

### 4.4 Rack Numbering Convention

| Position | Range | Description |
|----------|-------|-------------|
| FRONT | 01-98 | Top to bottom |
| REAR (↩) | 99-01 | Bottom to top |
| Scattered | 00 | Device not in rack |

---

## 5. KEY FUNCTIONS

### 5.1 app.js - Core Functions

| Function | Description |
|----------|-------------|
| `initializeApp()` | Initialize application and load data |
| `saveDevice()` | Save device from form |
| `editDevice(id)` | Edit device by ID |
| `removeDevice(id)` | Delete device and related connections |
| `saveConnection()` | Save connection from form |
| `editConnection(idx)` | Edit connection by index |
| `removeConnection(idx)` | Delete connection |
| `exportJSON()` | Export data as JSON (includes rooms, version) |
| `importData(e)` | Import data from JSON (validates and imports rooms) |
| `clearAll()` | Clear all data with mandatory backup (includes rooms) |
| `saveToStorage()` | Save to localStorage (includes rooms) |
| `serverSave()` | Save to server (includes rooms) |
| `serverLoad()` | Load from server (includes rooms) |
| `loadFromStorage()` | Load from localStorage (includes rooms) |
| `deviceBelongsToRoom(device, room)` | Check if device belongs to room (normalized) |
| `countDevicesInRoom(room)` | Count devices in a room |
| `getDevicesInRoom(room)` | Get all devices in a room |
| `updateLocationSelect()` | Update location dropdown with room nicknames |
| `Toast.success/error/warning/info(msg)` | Show notification |

### 5.2 ui-updates.js - UI Functions

| Function | Description |
|----------|-------------|
| `updateDevicesList()` | Render device list (cards or table) |
| `updateConnectionsList()` | Render connections table |
| `updateMatrix()` | Render SVG connection matrix |
| `exportExcel()` | Export to Excel (4 sheets: Devices, Connections, Matrix, Rooms) |
| `updateGlobalCounters()` | Update header counters |

### 5.3 floorplan.js - Floor Plan Functions

| Function | Description |
|----------|-------------|
| `FloorPlan.init()` | Initialize floor plan module |
| `FloorPlan.setRooms(rooms)` | Set rooms array (for import) |
| `FloorPlan.getRooms()` | Get current rooms array |
| `FloorPlan.zoom(delta)` | Zoom in/out |
| `FloorPlan.resetZoom()` | Reset zoom to default |
| `FloorPlan.toggleEditMode()` | Toggle edit mode |
| `FloorPlan.exportToPNG()` | Export floor plan as PNG |
| `showRoomInfo(roomId)` | Show room info modal with devices |
| `saveRoomsData()` | Save rooms to appState and server |
| `renderRooms()` | Render room polygons on SVG |
| `updateStats()` | Update room statistics |

### 5.4 features.js - Extended Features

| Module/Function | Description |
|-----------------|-------------|
| `ActivityLog.add(action, type, details)` | Add activity log entry |
| `ActivityLog.get()` | Get all log entries |
| `SVGTopology.render()` | Render network topology |
| `SVGTopology.getMiniIcon(type)` | Get mini SVG icon for device type |
| `DrawioExport.export()` | Export to Draw.io XML |
| `showTopologyLegend()` | Show device type legend modal |

---

## 6. API ENDPOINTS

### 6.1 Node.js Server (server.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /data | Get all network data (devices, connections, rooms) |
| POST | /data | Save network data |
| GET | /api/auth.php?action=check | Check session status |
| POST | /api/auth.php?action=login | Authenticate user |
| POST | /api/auth.php?action=logout | End session |
| GET | /* | Serve static files |

### 6.2 PHP API (data.php)

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | Returns network_manager.json |
| POST | - | Saves data with validation and file locking |
| POST | verify_password | Verify admin password (for clearAll) |

### 6.3 Edit Lock API (editlock.php) - v3.4.3

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | Returns current lock status |
| POST | acquire | Acquire editing lock |
| POST | release | Release editing lock |
| POST | heartbeat | Keep lock alive (extends timeout) |

**Lock Status Response:**
```json
{
  "locked": true,
  "lockedBy": "tiesse",
  "lockedAt": 1706745600,
  "expiresAt": 1706745900,
  "timeout": 300
}
```

**Acquire Response (success):**
```json
{
  "success": true,
  "message": "Lock acquired",
  "expiresAt": 1706745900
}
```

**Acquire Response (conflict):**
```json
{
  "success": false,
  "message": "Already locked by tiesse",
  "lockedBy": "tiesse",
  "lockedAt": 1706745600
}
```

### 6.4 Data Response Format

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117
}
```

---

## 7. EXPORT FORMATS

### 7.1 JSON Export Structure

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117,
  "exportedAt": "2026-02-01T12:00:00.000Z",
  "version": "3.4.0"
}
```

### 7.2 Excel Export (4 Sheets)

| Sheet | Columns |
|-------|---------|
| **Devices** | Location, Group, Order, Position, Name, Type/Brand, Category, Status, IP Addresses, Service, Ports, Notes |
| **Connections** | ID, Src Rack, Src Pos, Src Device, Src Port, Dst Port, Dst Device, Dst Pos, Dst Rack, Type, Cable ID, Cable Color, Status, Notes |
| **Matrix** | Device connection matrix (AOA format) |
| **Rooms** | ID, Name, Nickname, Width, Height, X, Y, Color, Devices (count), Notes |

### 7.3 Backup Format (clearAll)

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 117,
  "exportedAt": "2026-02-01T12:00:00.000Z",
  "backupReason": "Pre-Clear All Backup",
  "version": "3.4.0"
}
```

---

## 8. SECURITY

### 8.1 Authentication
- Session-based with configurable timeout
- Default credentials: `tiesse` / (configured in config.php or .env)
- Public access for read-only operations
- Protected operations: add, edit, delete, import, clearAll

### 8.2 XSS Protection
All user input sanitized via `escapeHtml()` before rendering.

### 8.3 Data Validation

**Import Validation:**
- `devices` must be array
- `connections` must be array
- `rooms` must be array (if present)
- Each device: id (number), rackId/rack, name (string), type, status, ports (array)
- Each connection: from (number), type, status
- Each room: id, name (required)

---

## 9. DEPLOYMENT

### 9.1 Node.js (Recommended)
```bash
cd Matrix
node server.js
# Access: http://localhost:3000/
```

### 9.2 PHP Development
```bash
cd Matrix
php -S 0.0.0.0:8080
# Access: http://localhost:8080/
```

### 9.3 Production (Apache)
```bash
sudo cp -r Matrix/* /var/www/html/matrix/
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data
```

### 9.4 Windows Quick Start
```batch
start-server.bat
```

---

## 10. CHANGELOG

| Version | Date | Changes |
|---------|------|---------|
| 3.4.3 | 2026-02-01 | Edit Lock multi-user, automated backup, security hardening |
| 3.4.2 | 2026-02-01 | Rate limiting, async save, timing-safe auth |
| 3.4.0 | 2026-02-01 | Room management, import/export with rooms, FloorPlan setRooms API |
| 3.3.0 | 2026-01-31 | CSS Variables architecture, UI standardization |
| 3.2.0 | 2026-01-29 | Offline/Intranet preparation, local libraries, file locking |
| 3.1.x | 2026-01-27-28 | Cascading forms, code cleanup, security, XSS protection |
| 3.0.0 | 2026-01-26 | Major release with topology, locations, auth |

---

## 11. CURRENT DATA STATISTICS

| Entity | Count |
|--------|-------|
| Devices | 81 |
| Connections | 89 |
| Rooms | 20 |
| Next Device ID | 117 |

**Device Types in Use:** router_wifi, isp, router, switch, firewall, patch, others, server, wifi

**Connection Types in Use:** lan, wan, other, wallport, trunk

**Locations in Use:** Sala Server (75 devices), Ufficio12 (6 devices)

---

**© 2026 Tiesse S.P.A. - All rights reserved**
