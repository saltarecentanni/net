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
│                           # - Structural HTML
│                           # - Inline CSS (Tailwind)
│                           # - 6 tabs: Devices, Connections, Matrix, Topology, Logs, Help
│
├── server.js               # Node.js server (v3.2.0)
│                           # - No external dependencies
│                           # - Port 3000
│                           # - REST API for data persistence
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
    ├── app.js              # Main logic (v3.2.0, ~2800 lines)
    │                       # - Global state (appState)
    │                       # - Device/Connection CRUD
    │                       # - Cascading selects
    │                       # - Persistence (localStorage + server)
    │                       # - escapeHtml() utility
    │                       # - JSON Import/Export
    │                       # - requireAuth() with fallback
    │                       # - Debounce timers for filters
    │                       # - toggleRearOrder() function
    │
    ├── ui-updates.js       # UI Rendering (v3.2.0, ~1430 lines)
    │                       # - Device list (cards/table)
    │                       # - Connection matrix
    │                       # - Connection table
    │                       # - Excel export (3 sheets, clean data)
    │                       # - XSS protection with escapeHtml
    │                       # - c.color fallback handling
    │
    ├── features.js         # Extended Features (v3.2.0, ~3350 lines)
    │                       # - ActivityLog module
    │                       # - LocationFilter module
    │                       # - SVGTopology module (Cisco icons)
    │                       # - DrawioExport module
    │                       # - showTopologyLegend() function
    │                       # - escapeHtml fallback
    │
    └── auth.js             # Authentication module (v3.2.0, ~200 lines)
                            # - Login/logout functions
                            # - Session management
\`\`\`

### 2.3 Version Summary

| File | Version | Lines | Description |
|------|---------|-------|-------------|
| index.html | 3.1.23 | ~1360 | Main HTML with 6 tabs, standardized forms |
| server.js | 3.1.20 | ~200 | Node.js REST server |
| app.js | 3.1.23 | ~2800 | Core logic, CRUD, cascading, toggleRearOrder |
| ui-updates.js | 3.1.23 | ~1430 | UI rendering, XSS protection |
| features.js | 3.1.23 | ~3350 | Extended features, topology |
| auth.js | 3.1.23 | ~200 | Authentication |

---

## 3. DATA MODEL

### 3.1 Main Structure

\`\`\`json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
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
| \`saveDeviceFromForm()\` | Save device from form |
| \`addDevice(device)\` | Add new device to state |
| \`updateDevice(id, data)\` | Update existing device |
| \`deleteDevice(id)\` | Delete device and related connections |
| \`saveConnection()\` | Save connection from form |
| \`toggleRearOrder()\` | Toggle order 00↔99 when Rear changes |
| \`showToast(msg, type)\` | Show notification toast |
| \`escapeHtml(str)\` | XSS protection utility |
| \`requireAuth()\` | Check authentication status |
| \`debounce(fn, ms)\` | Debounce utility for filters |
| \`exportJSON()\` | Export data as JSON file |
| \`importJSON(file)\` | Import data from JSON file |

### 5.2 ui-updates.js - UI Functions

| Function | Description |
|----------|-------------|
| \`updateDeviceList()\` | Render device list (cards or table) |
| \`updateConnectionsTable()\` | Render connections table |
| \`updateMatrix()\` | Render connection matrix |
| \`exportExcel()\` | Export to Excel with 3 sheets |
| \`printDeviceCards()\` | Print device cards |
| \`printMatrix()\` | Print matrix view |

### 5.3 features.js - Extended Features

| Module | Description |
|--------|-------------|
| \`ActivityLog\` | Track and display changes |
| \`LocationFilter\` | Filter by physical location |
| \`SVGTopology\` | Render network topology with Cisco icons |
| \`DrawioExport\` | Export topology to Draw.io format |

---

## 6. API ENDPOINTS

### 6.1 Node.js Server (server.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /data | Get all network data |
| POST | /data | Save network data |
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
| 3.1.23 | 2026-01-29 | UI/UX standardization, icon consistency, project restructure |
| 3.1.20 | 2026-01-28 | Cascading connection form, color picker |
| 3.1.8 | 2026-01-28 | Code cleanup, duplicate removal |
| 3.1.5 | 2026-01-28 | Topology position persistence |
| 3.1.3 | 2026-01-27 | Security improvements, XSS protection |
| 3.0.0 | 2026-01-26 | Major release with topology, locations, auth |

---

**© 2026 Tiesse S.P.A. - All rights reserved**
