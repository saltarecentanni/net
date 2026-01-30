# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.2.0  
**Date:** January 29, 2026  
**Author:** Tiesse S.P.A.

---

## 1. OVERVIEW

### 1.1 Description
A web-based network infrastructure management system for enterprise environments. Allows users to register network devices, map connections between them, and visualize the topology in matrix and graphical formats.

### 1.2 Objectives
- Centralized documentation of network infrastructure
- Visual connection matrix between devices
- Interactive network topology map with Cisco-style icons
- Activity logging for audit trail
- Export data to Excel/JSON/Draw.io for documentation
- Multi-user access via local network with authentication

### 1.3 What's New in v3.2.0

#### 🌐 Offline/Intranet Preparation
| Enhancement | Description |
|-------------|-------------|
| **Local Libraries** | Tailwind CSS and XLSX.js served locally (`/assets/vendor/`) |
| **CDN Independence** | Works without internet connection |
| **Apache/Linux Ready** | Tested for Linux server deployment |

#### 🔒 Multi-User Concurrency Improvements
| Enhancement | Description |
|-------------|-------------|
| **File Locking** | Implemented `LOCK_EX` for safe writing |
| **Unique Temp File** | Uses `uniqid()` to avoid collisions |
| **Atomic Rename** | Atomic operation for data integrity |

#### 📊 Excel Export Improvements
| Enhancement | Description |
|-------------|-------------|
| **Clean Data** | Removed emojis from columns (uses `[WJ]` and `[EXT]` instead) |
| **Compatibility** | Export works correctly in offline environment |

#### 🔧 Script Fixes
| Fix | Description |
|-----|-------------|
| **start-server.bat** | Fixed path (was `intranet/`, now root) |
| **PHP Fallback** | Tries local php, then php in PATH |
| **Generic IP** | Removed hardcoded IP |

#### 📁 New Assets Structure
```
assets/
├── logoTiesse.png          # Company logo
└── vendor/                 # Local libraries (NEW)
    ├── tailwind.min.js     # Tailwind CSS v3.x
    └── xlsx.full.min.js    # SheetJS XLSX v0.18.5
```

#### 🔮 Future Migration Preparation
| Preparation | Description |
|-------------|-------------|
| **Data Access Layer** | Structure prepared for JSON → Database migration |
| **Documentation** | Architecture documented for easier maintenance |

### 1.4 What's New in Previous Versions

#### v3.1.23 - UI/UX Standardization
- Standardized Forms with identical styling
- Consistent Icons in all labels
- Connection Form colors differentiated

#### v3.1.20 - Cascading Connection Form
- Cascading selection: Location → Group → Device → Port
- Color picker with custom hex input
- Quick filters for groups in connections

#### v3.1.8 - Code Cleanup & Verification
- Removed 183 lines of duplicate code
- 28 test scenarios executed successfully
- 100% import/export validation

---

## 2. ARCHITECTURE

### 2.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | HTML5 + Tailwind CSS | Local (v3.x) |
| JavaScript | ES6 (Vanilla) | - |
| Icons | Custom SVG (Cisco-style) | - |
| Excel | SheetJS (XLSX) | 0.18.5 (Local) |
| Backend | PHP (Apache) or Node.js | 7.4+ / 14+ |
| Authentication | Session-based | - |
| Persistence | JSON file | - |
| Fallback | LocalStorage | - |

### 2.2 File Structure

\`\`\`
Matrix/
├── index.html              # Main page (v3.2.0, ~1360 lines)
├── index.html              # Main page (v3.2.0, ~1364 lines)
│                           # - Structural HTML
│                           # - Inline CSS (Tailwind)
│                           # - 6 tabs: Devices, Connections, Matrix, Topology, Logs, Help
│
├── server.js               # Node.js server (v3.2.0, ~251 lines)
│                           # - No external dependencies
│                           # - Port 3000
│                           # - REST API for data persistence
│                           # - Session-based authentication
│
├── data.php                # REST API (PHP - recommended for Apache)
│                           # - GET: returns data
│                           # - POST: saves data with validation + file locking
│
├── start-server.bat        # Windows quick-start script (fixed path)
│
├── deploy.sh               # Linux deploy script
│
├── api/
│   └── auth.php            # Authentication API (PHP)
│
├── assets/
│   ├── logoTiesse.png      # Company logo
│   └── vendor/             # Local libraries (offline capable)
│       ├── tailwind.min.js # Tailwind CSS
│       └── xlsx.full.min.js # SheetJS XLSX
│
├── config/
│   └── config.php          # Configuration (AUTH_USER, SESSION_TIMEOUT)
│
├── data/
│   └── network_manager.json  # Persisted data (devices, connections)
│
├── doc/
│   ├── README.md           # User documentation
│   └── BLUEPRINT.md        # Technical documentation (this file)
│
└── js/
    ├── app.js              # Main logic (v3.2.1, ~2821 lines)
    │                       # - Global state (appState)
    │                       # - Device/Connection CRUD
    │                       # - Cascading selects
    │                       # - Persistence (localStorage + server)
    │                       # - escapeHtml() utility
    │                       # - exportJSON/importData functions
    │                       # - requireAuth() with fallback
    │                       # - Debounce timers for filters
    │                       # - toggleRearOrder() function
    │                       # - Toast notification system
    │
    ├── ui-updates.js       # UI Rendering (v3.1.5, ~1719 lines)
    │                       # - Device list (cards/table)
    │                       # - Connection matrix
    │                       # - Connection table
    │                       # - Excel export (3 sheets, clean data)
    │                       # - XSS protection with escapeHtml
    │                       # - c.color fallback handling
    │
    ├── features.js         # Extended Features (v3.1.5, ~3347 lines)
    │                       # - ActivityLog module
    │                       # - LocationFilter module
    │                       # - SVGTopology module (Cisco icons)
    │                       # - DrawioExport module
    │                       # - showTopologyLegend() function
    │                       # - escapeHtml fallback
    │
    └── auth.js             # Authentication module (v3.1.5, ~216 lines)
                            # - Login/logout functions
                            # - Session management
\`\`\`

### 2.3 Version Summary

| File | Version | Lines | Description |
|------|---------|-------|-------------|
| index.html | 3.2.0 | ~1364 | Main HTML with 6 tabs, standardized forms |
| server.js | 3.2.0 | ~251 | Node.js REST server with auth |
| app.js | 3.2.1 | ~2821 | Core logic, CRUD, cascading, toggleRearOrder |
| ui-updates.js | 3.1.5 | ~1719 | UI rendering, XSS protection |
| features.js | 3.1.5 | ~3347 | Extended features, SVGTopology |
| auth.js | 3.1.5 | ~216 | Authentication module |

---

## 3. DATA MODEL

### 3.1 Main Structure (Persisted)

\`\`\`json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
\`\`\`

### 3.1.1 Application State (Runtime)

The application maintains a runtime state object (`appState`) with the following structure:

\`\`\`javascript
var appState = {
    devices: [],                    // Array of device objects
    connections: [],                // Array of connection objects
    nextDeviceId: 1,                // Auto-increment ID counter
    connSort: [{ key: 'id', asc: true }],  // Multi-level sorting (up to 3 levels)
    deviceSort: { key: 'rack', asc: true }, // Device sorting
    deviceView: 'table',            // 'table' or 'cards'
    matrixLimit: 12,                // Matrix pagination limit
    matrixExpanded: false,          // Matrix expanded state
    rackColorMap: {},               // Rack color assignments
    deviceFilters: {                // Device list filters
        location: '',
        source: '',
        name: '',
        type: '',
        status: '',
        hasConnections: ''          // '', 'yes', 'no'
    },
    connFilters: {                  // Connection list filters
        source: '',
        anyDevice: '',
        fromDevice: '',
        toDevice: '',
        destination: '',
        type: '',
        status: '',
        cable: '',
        normalizeView: false        // Bidirectional view toggle
    }
};
\`\`\`

### 3.2 Device Object

\`\`\`json
{
  "id": 1,                          // Positive integer, auto-increment
  "rackId": "RACK01",               // Source/Origin (rack, location, group)
  "rack": "RACK01",                 // Alias for compatibility
  "order": 1,                       // Position in rack (0 = scattered device)
  "isRear": false,                  // true = device on rear side
  "name": "SW-CORE-01",             // Device name
  "brandModel": "Cisco Catalyst",   // Brand/model (optional)
  "type": "switch",                 // See Device Types below
  "status": "active",               // Status: active|disabled
  "location": "Server Room",        // Physical location/department
  "ip1": "192.168.1.1/24",          // IP Address 1 with mask
  "ip2": "10.0.0.1/8",              // IP Address 2 with mask
  "ip3": "",                        // IP Address 3 (optional)
  "ip4": "",                        // IP Address 4 (optional)
  "ips": ["192.168.1.1/24"],        // Array format (backward compatible)
  "links": [                        // Documentation links
    { "label": "Manual", "url": "https://..." }
  ],
  "service": "DHCP",                // Service (optional)
  "ports": [                        // Array of ports
    { "name": "GbE01", "type": "GbE", "status": "active" }
  ],
  "notes": "Core switch"            // Notes (optional)
}
\`\`\`

### 3.3 Device Types

| Type | Label | Icon | Badge Color |
|------|-------|------|-------------|
| router | Router | 📡 | #3498db (Blue) |
| switch | Switch | 🔀 | #2ecc71 (Green) |
| patch | Patch Panel | 📌 | #9b59b6 (Purple) |
| walljack | Wall Jack | 🔌 | #8e44ad |
| firewall | Firewall | 🛡️ | #e74c3c (Red) |
| server | Server | 🖥️ | #1abc9c |
| wifi | WiFi AP | 📶 | #f39c12 |
| isp | ISP/Provider | 🌐 | #34495e |
| pc | PC/Desktop | 💻 | #3498db |
| printer | Printer | 🖨️ | #95a5a6 |
| nas | NAS/Storage | 🗄️ | #2c3e50 |
| camera | IP Camera | 📹 | #16a085 |
| ups | UPS | 🔋 | #27ae60 |
| others | Others | 📦 | #7f8c8d |

### 3.4 Connection Object

\`\`\`json
{
  "from": {
    "device": 1,                    // Device ID
    "port": "GbE01"                 // Port name
  },
  "to": {
    "device": 2,                    // Device ID
    "port": "GbE24"                 // Port name
  },
  "type": "trunk",                  // Connection type
  "status": "active",               // Status: active|disabled
  "cableMarker": "A001",            // Physical cable label
  "color": "#3b82f6",               // Custom color (optional)
  "notes": "Uplink to core"         // Notes (optional)
}
\`\`\`

### 3.5 Connection Types

| Type | Label | Icon | Color |
|------|-------|------|-------|
| lan | LAN | ↔️ | #3b82f6 (Blue) |
| wan | WAN/Internet | 🌐 | #10b981 (Green) |
| dmz | DMZ | 🛡️ | #f59e0b (Amber) |
| trunk | Trunk/Uplink | ⬆️ | #8b5cf6 (Purple) |
| management | Management | ⚙️ | #06b6d4 (Cyan) |
| backup | Backup | 💾 | #64748b (Gray) |
| fiber | Fiber Optic | 💡 | #ec4899 (Pink) |
| wallport | Wall Jack | 🔌 | #84cc16 (Lime) |
| external | External | 📡 | #f97316 (Orange) |
| other | Other | 📦 | #64748b (Gray) |

### 3.6 Port Types

| Value | Label | Icon | Category |
|-------|-------|------|----------|
| eth | Eth/RJ45 | 🔌 | copper |
| GbE | GbE 1G | 🌐 | copper |
| 2.5GbE | 2.5GbE | ⚡ | copper |
| 5GbE | 5GbE | ⚡ | copper |
| 10GbE | 10GbE-T | 🚀 | copper |
| PoE | PoE/PoE+ | 🔋 | copper |
| SFP | SFP 1G | 💎 | fiber |
| SFP/SFP+ | SFP+ 10G | 💠 | fiber |
| SFP28 | SFP28 25G | 💠 | fiber |
| QSFP/QSFP+ | QSFP+ 40G | 🔷 | fiber |
| QSFP28 | QSFP28 100G | 🔷 | fiber |
| QSFP-DD | QSFP-DD 400G | 💎 | fiber |
| fiber | Fiber LC/SC | 🔴 | fiber |
| WAN | WAN | 🌍 | wan |
| eth/wan | ETH/WAN | 🌐 | wan |
| MGMT | MGMT | ⚙️ | management |
| TTY | Console/TTY | 🖥️ | management |
| USB | USB | 🔗 | management |
| USB-C | USB-C | 🔗 | management |
| RJ11 | RJ11/Phone | 📞 | telecom |
| ISDN | ISDN BRI | 📠 | telecom |
| E1/T1 | E1/T1 | 📡 | telecom |
| serial | Serial RS232 | 📟 | legacy |
| aux | AUX | 🔧 | legacy |
| others | Others | ❓ | other |

---

## 4. USER INTERFACE

### 4.1 Tab Structure

| Tab | Icon | Purpose |
|-----|------|---------|
| Devices | 📋 | Device management (cards/table view) |
| Active Connections | ⚡ | Connection management with cascading forms |
| Matrix | 🔀 | Connection matrix (compact/detailed) |
| Topology | 🗺️ | Visual network map with Cisco icons |
| Logs | 📝 | Activity log with filters |
| Help | ❓ | Integrated help |

### 4.2 Visual Indicators

| Indicator | Meaning | Style |
|-----------|---------|-------|
| ✗ | Device/connection disabled | text-red-500 font-bold |
| ↩ | Device on rear side of rack | text-amber-500 font-bold |
| ✕ | Close/delete button | text-red-500 hover:bg-red-100 |

### 4.3 Rack Numbering Convention

| Position | Range | Description |
|----------|-------|-------------|
| FRONT | 01-98 | Top to bottom (01, 02, 03...) |
| REAR (↩) | 99-01 | Bottom to top (99, 98, 97...) |
| Scattered | 00 | Device not in rack |

### 4.4 Form Standardization (v3.1.23)

| Element | Style |
|---------|-------|
| Labels | text-xs text-gray-700 |
| Inputs | text-xs py-1.5 rounded |
| Checkboxes | w-4 h-4 |
| Legends | text-xs mt-2 text-gray-500 |
| SOURCE Section | bg-orange-50 border-orange-200 |
| DESTINATION Section | bg-amber-50 border-amber-200 |

---

## 5. KEY FUNCTIONS

### 5.1 app.js - Core Functions

| Function | Description |
|----------|-------------|
| \`initializeApp()\` | Initialize application and load data |
| `saveDevice()` | Save device from form |
| `editDevice(id)` | Edit device by ID |
| `removeDevice(id)` | Delete device and related connections |
| `clearDeviceForm()` | Clear device form |
| `saveConnection()` | Save connection from form |
| `editConnection(idx)` | Edit connection by index |
| `removeConnection(idx)` | Delete connection |
| `toggleRearOrder()` | Toggle order 00↔99 when Rear changes |
| `showToast(msg, type)` | Show notification toast |
| `escapeHtml(str)` | XSS protection utility |
| `requireAuth()` | Check authentication status |
| `copyToClipboard(text)` | Copy text to clipboard |
| `exportJSON()` | Export data as JSON file |
| `importData(e)` | Import data from JSON file |
| `clearAll()` | Clear all data with backup |
| `saveToStorage()` | Save to localStorage |
| `serverLoad()` | Load data from server |
| `serverSave()` | Save data to server |
| `saveNow()` | Manual save button handler |
| `updateDeviceFilter(key, value)` | Update device filter |
| `getFilteredDevices()` | Get devices matching filters |
| `updateConnFilter(key, value)` | Update connection filter |
| `getFilteredConnections()` | Get connections matching filters |
| `getRackColor(rackId)` | Get color for rack |

### 5.2 ui-updates.js - UI Functions

| Function | Description |
|----------|-------------|
| `updateDevicesList()` | Render device list (cards or table) |
| `updateDevicesListOnly()` | Render list without rebuilding filters |
| `updateDeviceFilterBar()` | Render device filter bar |
| `updateConnectionsList()` | Render connections table |
| `updateConnFilterBar()` | Render connection filter bar |
| `updateMatrix()` | Render connection matrix |
| `updateMatrixFilters()` | Render matrix filter controls |
| `updateMatrixStats()` | Update matrix statistics display |
| `exportExcel()` | Export to Excel with 3 sheets |
| `printDeviceCards()` | Print device cards |
| `printMatrix()` | Print matrix view |
| `updateGlobalCounters()` | Update header counters |

### 5.3 features.js - Extended Features

| Module/Function | Description |
|--------|-------------|
| `ActivityLog` | Track and display changes (max 200 logs) |
| `LocationFilter` | Filter by physical location |
| `SVGTopology` | Render network topology with Cisco icons |
| `DrawioExport` | Export topology to Draw.io format |
| `showTopologyLegend()` | Show device type legend modal |
| `filterTopologyByRack()` | Filter topology by selected rack |
| `updateDrawioLayout()` | Update topology layout |
| `fitDrawioView()` | Fit topology to view |
| `exportDrawioPNG()` | Export topology as PNG |
| `exportTopologyDrawio()` | Export to Draw.io XML |

### 5.4 Toast Notification System

The application uses a centralized Toast notification system for user feedback.

| Method | Description |
|--------|-------------|
| `Toast.success(msg, duration)` | Green success message (default 3s) |
| `Toast.error(msg, duration)` | Red error message (default 5s) |
| `Toast.warning(msg, duration)` | Yellow warning message (default 4s) |
| `Toast.info(msg, duration)` | Blue info message (default 3s) |

---

## 6. API ENDPOINTS

### 6.1 Node.js Server (server.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /data | Get all network data |
| POST | /data | Save network data |
| GET | /api/auth.php?action=check | Check session status |
| POST | /api/auth.php?action=login | Authenticate user |
| POST | /api/auth.php?action=logout | End session |
| GET | /* | Serve static files |

### 6.2 PHP API (data.php)

| Method | Description |
|--------|-------------|
| GET | Returns network_manager.json |
| POST | Saves data with validation |

### 6.3 Auth API (api/auth.php)

| Action | Description |
|--------|-------------|
| login | Authenticate user |
| logout | End session |
| check | Check session status |

---

## 7. SECURITY

### 7.1 XSS Protection
All user input is sanitized using \`escapeHtml()\` function before rendering in HTML.

### 7.2 Authentication
- Edit operations require authentication
- Session-based with configurable timeout
- Public access for read-only operations

### 7.3 Data Validation
- Import validation with type checking
- Required field validation
- Backward compatibility handling

---

## 8. DEPLOYMENT

### 8.1 Node.js (Recommended)
\`\`\`bash
cd Matrix
node server.js
# Access: http://localhost:3000/
\`\`\`

### 8.2 PHP
\`\`\`bash
cd Matrix
php -S 0.0.0.0:8080
# Access: http://localhost:8080/
\`\`\`

### 8.3 Production (Apache)
\`\`\`bash
sudo cp -r Matrix/* /var/www/html/matrix/
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 775 /var/www/html/matrix/data
\`\`\`

---

## 9. CHANGELOG

| Version | Date | Changes |
|---------|------|---------|
| 3.2.1 | 2026-01-30 | app.js: Improved sticky headers and zoom |
| 3.2.0 | 2026-01-29 | Offline/Intranet preparation, local libraries, file locking |
| 3.1.23 | 2026-01-29 | UI/UX standardization, icon consistency, project restructure |
| 3.1.20 | 2026-01-28 | Cascading connection form, color picker |
| 3.1.8 | 2026-01-28 | Code cleanup, duplicate removal |
| 3.1.5 | 2026-01-28 | Topology position persistence |
| 3.1.3 | 2026-01-27 | Security improvements, XSS protection |
| 3.0.0 | 2026-01-26 | Major release with topology, locations, auth |

---

**© 2026 Tiesse S.P.A. - All rights reserved**
