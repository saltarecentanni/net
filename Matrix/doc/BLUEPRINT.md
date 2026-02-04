# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.5.044  
**Date:** February 4, 2026  
**Author:** Tiesse S.P.A.  
**Environment:** Ubuntu 24.04 LTS + Apache 2.4 + PHP 8.3

---

## 1. OVERVIEW

### 1.1 Description
A web-based network infrastructure documentation system for enterprise environments. Allows users to register network devices, map physical connections between them, visualize the topology in matrix and graphical formats, and manage room/floor plans with device associations.

### 1.2 What This System IS
- ✅ **Documentation tool** for network infrastructure
- ✅ **Visual mapper** for device connections
- ✅ **Inventory manager** for network equipment
- ✅ **Floor plan** designer with device placement
- ✅ **Export system** for Excel, JSON, PNG, Draw.io

### 1.3 What This System IS NOT
- ❌ **NOT a monitoring system** - does not check if devices are online
- ❌ **NOT auto-discovery** - devices are added manually
- ❌ **NOT a network scanner** - does not detect devices automatically
- ❌ **NOT SNMP/ICMP based** - no live network polling

---

## 2. VERSION HISTORY

### v3.5.044 (Current) - February 4, 2026

#### 🔍 Data Integrity Investigation & Debug Logging
| Feature | Description |
|---------|-------------|
| **Device Count Analysis** | Identified 29 devices without IP addresses (infrastructure elements) |
| **Filter Detection** | Added debug logging to report hidden devices on load |
| **JSON Validation** | Confirmed all 101 devices fully present and valid |
| **Transparency** | Clear identification of why some devices don't appear in default view |

### v3.5.043 - February 4, 2026

#### 🔧 Topology Improvements & Data Integrity
| Feature | Description |
|---------|-------------|
| **Smart Device Matching** | 3-level algorithm prevents duplicate boxes (exact, partial, word-based) |
| **findMatchingDevice()** | Intelligent function matches external destinations to real devices |
| **Connection Colors** | Softer color palette (#fca5a5, #fdba74, #d8b4fe, #e9d5ff) |
| **Topology Stability** | Reduced visual complexity with improved color scheme |
| **Data Validation** | SHA-256 checksum for all imports |
| **Version Tracking** | All exports include version and exportedAt timestamp |

### v3.5.042 (February 4, 2026)

#### 🐛 Bug Fixes & UI Improvements
| Feature | Description |
|---------|-------------|
| **UI Fixes** | Removed "+ Add location" from dropdown, centered Order label |
| **Topology Connections** | External connections now link to real devices when available |
| **Label Management** | Reduced label overlap on connection lines |

### v3.5.041 (February 4, 2026)

#### 🔧 Security & Compatibility
| Feature | Description |
|---------|-------------|
| **bcrypt Compatibility** | PHP-compatible password hashing with bcrypt/bcryptjs |
| **CSRF Protection** | Token validation for all POST requests |
| **Rate Limiting** | Enhanced rate limiting by IP and username |

### v3.5.040 (February 4, 2026)

#### 🔧 Critical Bug Fixes & Visual Improvements
| Feature | Description |
|---------|-------------|
| **Location Order Fix** | Fixed parseInt('00') falsy bug - code 00 now appears before 01 |
| **isNaN Pattern** | Changed `parseInt(x) || 999` to `isNaN(parsedCode) ? 999 : parsedCode` |
| **Zone Lines** | Zones rendered as thick lines (5px, 35% opacity) instead of rectangles |
| **Star Topology** | Devices connect to zone centroid in star pattern |
| **Single Device Zones** | Badge displayed below device instead of surrounding area |
| **Division by Zero** | Added protection in centroid calculation |

### v3.5.037 - February 4, 2026

#### 🎨 UI/UX Improvements
| Feature | Description |
|---------|-------------|
| **Location Selects** | Changed from orange to neutral slate styling |
| **Color Scheme** | `border-slate-400 bg-slate-50 text-slate-800` |
| **Zone Visualization** | Initial thick line implementation |

### v3.5.036 - February 3, 2026

#### 🔧 Code Quality & Centralization
| Feature | Description |
|---------|-------------|
| **standardDeviceSort()** | Centralized sort function for consistent ordering (rackId + order) |
| **getDevicesSorted()** | Standard function to get sorted devices array |
| **getDevicesFiltered()** | Standard function to filter and sort devices |
| **NETWORK_ZONES** | Single source of truth for network zone options |
| **IP + Zone Dropdown** | Each IP field now has integrated Network Zone selector |
| **100 Verifications** | Complete syntax, balance, and code quality audit |
| **Fixed getSorted()** | Removed duplicate function declaration |

### v3.5.035 - February 3, 2026

#### 🔗 Centralized Data Utilities
| Feature | Description |
|---------|-------------|
| **Centralization** | Created centralized functions for sorting and filtering |
| **IP Zone Integration** | Network Zone dropdown integrated with each IP field |
| **Removed Redundancy** | Removed separate Network Zone form |

### v3.5.013 - February 2, 2026

#### 🔗 Links Column Sorting
| Feature | Description |
|---------|-------------|
| **Sortable Links** | 🔗 Links column in Devices table now sortable |
| **Click Handler** | Added onclick to Links header |
| **Sort Logic** | Sorts by number of connections (links.length) |

#### 🔍 Audit 3.0 Review
| Verification | Status |
|--------------|--------|
| **Promises** | All critical .then() chains have .catch() |
| **Clipboard** | copyToClipboard has fallback for older browsers |
| **Swal.fire** | Confirmed - never rejects, no .catch() needed |
| **i18n** | Interface consistent in English |

### v3.5.011 - February 2, 2026

#### 🔧 Code Quality Fixes
| Fix | Description |
|-----|-------------|
| **Dead Code** | Removed unused `autoResizeTextarea()` and `countDevicesInRoom()` |
| **Deprecated API** | Replaced `.substr()` with `.substring()` |
| **Auto-zoom** | Implemented auto-zoom to room in Floor Plan |
| **Storage Error** | Added QuotaExceededError detection |
| **Accessibility** | Added ARIA labels and roles |

### v3.5.010 - February 2, 2026

#### 📶 WiFi AP Without Warning
| Feature | Description |
|---------|-------------|
| **Wireless Devices** | `wifi`, `router_wifi`, `access_point` no longer show ⚠ warning |
| **Dedicated Icon** | 📶 Wireless in cyan instead of orange ⚠ |
| **Background** | Cyan light background for wireless devices without connections |
| **Updated Legend** | ✗ disabled · ↩ rear · ⚠ not connected · 📶 wireless · 🌐 link |

### v3.5.005-008 - Location System

#### 📍 Persistent Location System
| Feature | Description |
|---------|-------------|
| **appState.sites[]** | Company sites array |
| **appState.locations[]** | Persistent locations with id, code, name, type |
| **Auto Migration** | migrateToNewLocationSystem() converts existing data |
| **Location Manager** | Full management: create, rename, delete locations |
| **Three Types** | site (🏢), mapped (📍 from Floor Plan), custom (🪧) |

### v3.5.001 - Online Users

#### ✨ Online Users Indicator
| Feature | Description |
|---------|-------------|
| **Real-time Counter** | Shows number of users viewing the application |
| **Visual Indicator** | Badge with count (01, 02...) |
| **Color Coding** | Green = viewers only, Amber = editor present |
| **Heartbeat** | 30-second ping to maintain presence |
| **Auto-cleanup** | Inactive users removed after 60 seconds |

---

## 3. ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | HTML5 + Tailwind CSS 3.x | Local vendor file |
| **JavaScript** | ES6 Vanilla | No framework |
| **Icons** | Custom SVG | Cisco-style topology icons |
| **Modals** | SweetAlert2 | Local vendor |
| **Excel** | SheetJS (XLSX) 0.18.5 | Local vendor |
| **Backend** | Node.js 16+ / PHP 8.3 | Dual-mode support |
| **Auth** | Session-based | PHP sessions |
| **Data** | JSON file | `data/network_manager.json` |

### 3.2 File Structure

```
Matrix/
├── index.html              # Main application (SPA)
├── server.js               # Node.js server (alternative)
├── data.php                # PHP API endpoint
├── deploy.sh               # Deployment script
│
├── api/
│   ├── auth.php            # Authentication API
│   └── editlock.php        # Multi-user lock API
│
├── config/
│   └── config.php          # Server configuration
│
├── js/
│   ├── app.js              # Core application logic (4200+ lines)
│   ├── auth.js             # Authentication module
│   ├── features.js         # Topology, activity log, export (3400+ lines)
│   ├── ui-updates.js       # UI rendering (2100+ lines)
│   ├── floorplan.js        # Floor plan module (850+ lines)
│   └── editlock.js         # Edit lock client (160 lines)
│
├── css/
│   └── styles.css          # Custom styles + CSS variables
│
├── assets/vendor/
│   ├── tailwind.min.js     # Tailwind CSS
│   ├── sweetalert2.min.js  # Modal dialogs
│   └── xlsx.full.min.js    # Excel export
│
├── data/
│   ├── network_manager.json # Main data file
│   └── online_users.json    # Active users tracking
│
├── backup/
│   ├── backup.sh           # Backup script
│   ├── weekly/             # Weekly backups (4 weeks)
│   └── monthly/            # Monthly backups (12 months)
│
└── doc/
    ├── BLUEPRINT.md        # This file
    ├── README.md           # User guide
    └── ROOM_STRUCTURE.md   # Data structure docs
```

### 3.3 Data Model

```javascript
appState = {
    // Core data
    devices: [{
        id: "uuid",
        name: "SW-Core-01",
        type: "switch",
        location: "Data Center",
        group: "Rack-01",
        rackId: "A-01",
        ip: "192.168.1.1",
        ports: 48,
        status: "active",
        links: ["https://...", "ssh://..."],
        notes: "Main core switch"
    }],
    
    connections: [{
        id: "uuid",
        from: "device-uuid-1",
        fromPort: "24",
        to: "device-uuid-2", 
        toPort: "1",
        type: "trunk",
        status: "active",
        cableColor: "#3b82f6",
        notes: "Uplink to distribution"
    }],
    
    rooms: [{
        id: "room-uuid",
        nickname: "Server Room",
        polygon: [[x1,y1], [x2,y2], ...],
        color: "#3b82f6"
    }],
    
    // New in v3.5.005+
    sites: ["Sede Ivrea", "Filiale Torino"],
    
    locations: [{
        id: "loc-uuid",
        code: "DC01",
        name: "Data Center",
        type: "site|mapped|custom",
        roomRef: "room-uuid" // if type=mapped
    }],
    
    // Metadata
    version: "3.5.013",
    lastModified: "2026-02-02T12:00:00Z"
}
```

---

## 4. MODULES

### 4.1 Core Modules (app.js)

| Module | Purpose |
|--------|---------|
| **Toast** | Notification system (success, error, warning, info) |
| **Debug** | Conditional logging (DEBUG_MODE flag) |
| **OnlineTracker** | Real-time user presence tracking |
| **ActivityLog** | Action history (add, edit, delete operations) |

### 4.2 Feature Modules (features.js)

| Module | Purpose |
|--------|---------|
| **SVGTopology** | Interactive network diagram with Cisco icons |
| **ConnectionStatus** | Badge rendering for connection states |
| **LocationManager** | Site/location management UI |
| **ExportDrawIO** | Draw.io XML export |

### 4.3 UI Module (ui-updates.js)

| Function | Purpose |
|----------|---------|
| `updateUI()` | Master UI refresh |
| `updateDevicesList()` | Devices tab rendering (cards/table) |
| `updateConnectionsList()` | Connections tab rendering |
| `updateMatrix()` | SVG connection matrix |
| `getDevicesSortedBy()` | Multi-column sorting |

### 4.4 Floor Plan Module (floorplan.js)

| Function | Purpose |
|----------|---------|
| `FloorPlan.init()` | Initialize canvas and tools |
| `FloorPlan.getRooms()` | Get all rooms |
| `FloorPlan.setRooms()` | Import rooms from data |
| `FloorPlan.editRoom()` | Room editing modal |
| `FloorPlan.zoomToRoom()` | Auto-zoom to selected room |

### 4.5 Auth Module (auth.js)

| Function | Purpose |
|----------|---------|
| `Auth.showLoginModal()` | Login dialog |
| `Auth.login()` | Authentication |
| `Auth.logout()` | Session end |
| `Auth.isLoggedIn()` | Check auth state |

### 4.6 Edit Lock Module (editlock.js)

| Function | Purpose |
|----------|---------|
| `EditLock.acquire()` | Get edit lock |
| `EditLock.release()` | Release lock |
| `EditLock.heartbeat()` | Keep lock alive |

---

## 5. API ENDPOINTS

### 5.1 Data API (data.php / server.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/data.php` | Load all data |
| POST | `/data.php` | Save all data |
| GET | `/data.php?action=online` | Get online users |

### 5.2 Auth API (api/auth.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth.php` | Login/logout |
| GET | `/api/auth.php?check=1` | Check session |

### 5.3 Edit Lock API (api/editlock.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `action=acquire` | Get edit lock |
| POST | `action=release` | Release lock |
| POST | `action=heartbeat` | Keep lock alive |
| GET | `action=status` | Check lock status |

---

## 6. DEVICE TYPES

| Type | Icon | Description |
|------|------|-------------|
| `server` | 🖥️ | Server/host |
| `switch` | 🔀 | Network switch |
| `router` | 🌐 | Router |
| `router_wifi` | 📶 | WiFi router |
| `firewall` | 🔥 | Firewall |
| `access_point` | 📶 | Wireless AP |
| `wifi` | 📶 | WiFi device |
| `patch_panel` | ▦ | Patch panel |
| `walljack` | ⬜ | Wall jack |
| `workstation` | 💻 | Desktop PC |
| `laptop` | 💻 | Laptop |
| `phone` | 📞 | IP Phone |
| `ip_phone` | 📞 | IP Phone |
| `printer` | 🖨️ | Printer |
| `camera` | 📷 | IP Camera |
| `storage` | 💾 | Storage |
| `nas` | 📦 | NAS |
| `ups` | 🔋 | UPS |
| `pdu` | ⚡ | PDU |
| `isp` | 🌍 | ISP connection |
| `modem` | 📡 | Modem |
| `sensor` | 📊 | Sensor |
| `other` | ❓ | Other |

---

## 7. CONNECTION TYPES

| Type | Color | Description |
|------|-------|-------------|
| `lan` | Blue | Standard LAN |
| `wan` | Red | WAN link |
| `trunk` | Green | Trunk/uplink |
| `dmz` | Orange | DMZ segment |
| `management` | Purple | Management VLAN |
| `fiber` | Cyan | Fiber optic |
| `backup` | Gray | Backup link |
| `walljack` | Brown | Wall port |
| `external` | Pink | External link |

---

## 8. EXPORT FORMATS

### 8.1 JSON Export
- Complete data backup with checksum
- Includes: devices, connections, rooms, sites, locations
- SHA-256 integrity verification

### 8.2 Excel Export
- 4 worksheets: Devices, Connections, Matrix, Rooms
- Filterable columns
- Color-coded status

### 8.3 PNG Export
- High-resolution topology image
- SVG-to-canvas conversion
- Download as file

### 8.4 Draw.io Export
- XML format compatible with Draw.io
- Preserves device positions
- Connection routing

---

## 9. SECURITY

### 9.1 Authentication
- Session-based login
- Password hashed with bcrypt
- Rate limiting (5 attempts/minute)
- Session timeout (30 minutes)

### 9.2 Multi-User Locking
- Only one editor at a time
- Lock timeout: 5 minutes
- Heartbeat: 60 seconds
- Auto-release on logout

### 9.3 Data Protection
- XSS prevention (escapeHtml)
- Path traversal protection
- Backup before destructive operations

---

## 10. DEPLOYMENT

### 10.1 Requirements
- Apache 2.4+ with PHP 8.1+
- OR Node.js 16+
- Write permissions on `data/` directory
- Modern browser (Chrome, Firefox, Edge, Safari)

### 10.2 Installation
```bash
# Clone or copy files to web root
cp -r Matrix/ /var/www/html/matrix/

# Set permissions
chmod 755 /var/www/html/matrix/
chmod 777 /var/www/html/matrix/data/

# Configure .env
cp .env.example .env
nano .env  # Set AUTH_USER and AUTH_PASSWORD

# (Optional) Setup cron for backups
crontab -e
# Add: 0 2 * * 0 /var/www/html/matrix/backup/backup.sh weekly
# Add: 0 3 1 * * /var/www/html/matrix/backup/backup.sh monthly
```

### 10.3 Node.js Mode
```bash
cd Matrix/
node server.js
# Access: http://localhost:3000
```

---

## 11. BROWSER SUPPORT

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| IE | Any | ❌ Not supported |

---

## 12. KNOWN LIMITATIONS

1. **Single JSON file** - All data in one file, not suitable for very large networks (1000+ devices)
2. **No real-time sync** - Changes require manual save, no WebSocket push
3. **Manual data entry** - No auto-discovery of network devices
4. **Single editor** - Only one user can edit at a time
5. **No audit trail** - Activity log is in-memory only

---

## 13. FUTURE ROADMAP

- [ ] WebSocket real-time sync
- [ ] SQLite backend option
- [ ] SNMP device import
- [ ] Network diagram auto-layout
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] PDF report generation
- [ ] VLAN visualization

---

**Document Version:** 3.5.013  
**Last Updated:** February 2, 2026
