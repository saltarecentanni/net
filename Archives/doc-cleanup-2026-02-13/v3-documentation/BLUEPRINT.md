# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.6.035  
**Date:** February 9, 2026  
**Author:** Tiesse S.P.A.  
**Environment:** Ubuntu 24.04 LTS + Node.js 16+ (or Apache 2.4 + PHP 8.3)

---

## 1. OVERVIEW

### 1.1 System Description
A comprehensive web-based network infrastructure documentation system for enterprise environments. Provides device inventory management, physical connection mapping, interactive topology visualization, floor plan design with device placement, and data import/export in multiple formats (Excel, JSON, PNG, Draw.io).

### 1.2 What This System IS
- ✅ **Documentation tool** for network infrastructure
- ✅ **Visual mapper** for device connections and topology
- ✅ **Inventory manager** for network equipment
- ✅ **Floor plan designer** with device placement on map
- ✅ **Export system** for Excel, JSON, PNG, Draw.io formats
- ✅ **Multi-user system** with edit locking (one editor at a time)
- ✅ **Data validation system** protecting import/export integrity
- ✅ **Remote access integration** via Apache Guacamole (SSH, RDP, VNC, Telnet)

### 1.3 What This System IS NOT
- ❌ **NOT a monitoring system** - does not check if devices are online
- ❌ **NOT auto-discovery** - devices are added manually
- ❌ **NOT a network scanner** - does not detect devices automatically
- ❌ **NOT SNMP/ICMP based** - no live network polling

---

## 2. VERSION TIMELINE

### v3.6.035 (Current) - February 9, 2026 - Documentation Cleanup & Version Alignment

#### Documentation
- Unified help.html into Help tab in index.html (21 sections)
- Added Guacamole section (section 20) to Help tab
- Translated all /doc/ files to English (consistent language)
- Cleaned up obsolete scripts and files
- Version alignment across all files

### v3.6.032 - February 9, 2026 - Device Detail Modal & Zone System

#### 🎨 Device Detail Modal Redesign
- NEW: RJ45-style port visualization with realistic hardware appearance
- Port sizes: RJ45 26x34px, SFP 36x26px, Console 30x26px
- LED indicators: Green (#22c55e) = connected, Red (#ef4444) = disconnected
- Smart port classification: LAN ports (left) | Special ports (right: WAN, SFP, MGMT, CON)
- Automatic 2-row layout for switches with >12 ports (odd ports top, even bottom)
- Port tooltips show only destination info (no source redundancy)
- Disconnected ports have no tooltip (clean UI)

#### 🔗 Zone/Connection Type System Expansion
- NEW connection types: `vlan`, `vpn`, `cloud`, `servers`, `iot`, `guest`, `voice`, `test`
- Full list: lan, wan, dmz, vlan, trunk, vpn, cloud, management, servers, iot, guest, voice, backup, fiber, test, wallport, external, other
- Zone colors: DMZ (red), WAN (orange), VPN (cyan), Trunk (purple), Test (pink), Cloud (light blue)
- Zones section in Device Detail shows only existing connection types
- Connection Type is the primary source for zone classification (not device addresses)

#### 🔘 Quick Access Buttons (Guacamole Integration)
- All remote access via Guacamole API (WEB, SSH, RDP, VNC, TEL)
- Fallback to direct protocol only if Guacamole unavailable
- API paths tried: `/guacamole/api`, `/api/guacamole`, `/Matrix/api/guacamole`
- Buttons: 🌐 WEB | 📟 SSH | 🖥️ RDP | 📺 VNC | 📞 TEL | ✏️ EDIT

#### 📊 UI Improvements
- Modal width increased to 1100px for better port visualization
- Port numbers displayed with smaller font (8px) for cleaner appearance
- Special ports grouped with labels (WAN, SFP, MGMT, CON)
- Zone badges use connection type colors with transparent borders

### v3.6.030-031 - February 8-9, 2026
- Topology drag boundary fix
- Port visualization refinements
- Connection list improvements

### v3.6.028-029 - February 8, 2026 - Data Integrity & Validation Release

#### 🔧 Data Normalization (v3.6.027-028)
- `normalizePortName()` function - pads port names (eth1→eth01)
- Extended `normalizeDataCase()` to cover ports, connection ports, cableMarker, cableColor
- Fixed 79 device ports and 3 connection ports with missing zero-padding
- Added UUID (`c-xxxxxxxxxxxx`) to all 93 connections
- Removed deprecated `_isExternal` from 101 devices
- Migrated `color` → `cableColor` in connections

#### 🔄 Import/Export Validation
- Full round-trip verified: 15 connection fields preserved (100%)
- `roomId` field confirmed functional (maps wallport/walljack to floor plan)
- Validator enhanced to recognize: `roomId`, `flagged`, `flagReason`, `isWallJack`
- 6 connections flagged as incomplete for later correction

#### 🐛 Bug Fixes
- CRITICAL: `saveDevice()` now includes `ports` and `links` in deviceData (was silently dropping them)
- `saveConnection()` now normalizes fromPort/toPort via `normalizePortName()`
- `importData()` now calls `normalizeDataCase()` after applying data (was missing)

### v3.6.026 - February 8, 2026 - Professional Cleanup Release
- Consolidated 24 doc files → 6 core documents
- Moved 14 diagnostic/temporary files to Archives
- Unified version numbering, verified data integrity

---

## 3. ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | HTML5 + Tailwind CSS 3.x | Local vendor, responsive design |
| **JavaScript** | ES6 Vanilla | No framework, ~18,000 lines |
| **Icons** | Custom SVG | Cisco-style network icons (25+) |
| **Modals** | SweetAlert2 | Local vendor, user interactions |
| **Excel** | SheetJS (XLSX) 0.18.5 | Local vendor, 4-sheet export |
| **Backend** | PHP 8.3 or Node.js 16+ | Production or development |
| **Authentication** | Session-based + bcrypt | Secure password hashing |
| **Data Store** | JSON file | data/network_manager.json (~200KB) |
| **Validation** | json-validator.js | 273 lines protecting data integrity |
| **Remote Access** | Apache Guacamole | Web-based SSH/RDP/VNC/Telnet |

### 3.2 Core File Structure

```
Matrix/
├── index.html              # Single-page application (3,217 lines)
├── server.js               # Node.js development server
├── data.php                # PHP API endpoint
├── package.json            # npm dependencies (v3.6.032)
│
├── js/
│   ├── app.js              # Core (4,988 lines) - state, data, device management
│   ├── features.js         # Topology, export (~4,700 lines)
│   ├── ui-updates.js       # UI rendering (~2,800 lines)
│   ├── floorplan.js        # Floor plan (~1,220 lines)
│   ├── dashboard.js        # Charts (~1,210 lines)
│   ├── device-detail.js    # Device modal (1,032 lines) ⭐ REDESIGNED v3.6.032
│   ├── json-validator.js   # Validation (273 lines) 
│   ├── editlock.js         # Multi-user lock (228 lines)
│   ├── auth.js             # Authentication (306 lines)
│   └── icons.js            # SVG icons (276 lines)
│
├── css/
│   └── styles.css          # Tailwind + custom variables (~45 KB)
│
├── api/
│   ├── auth.php            # Authentication
│   ├── editlock.php        # Multi-user locks
│   ├── guacamole.php       # Guacamole proxy API
│   └── guacamole-config.php # Guacamole settings
│
├── config/
│   ├── config.php          # Server configuration
│   └── guacamole.json      # Guacamole connection settings
│
├── data/
│   └── network_manager.json # Main data file (~200KB)
│
└── doc/
    ├── README.md           # User guide
    ├── BLUEPRINT.md        # This file (complete technical reference)
    ├── QUICK_REFERENCE.md  # Command reference
    ├── GUACAMOLE_SETUP.md  # Remote access setup
    ├── VALIDATION_TESTING_GUIDE.md
    └── ROOM_STRUCTURE.md   # JSON schema docs
```

### 3.3 Data Model (appState)

```javascript
appState = {
    devices: [{
        id: 1,                          // Numeric ID (auto-increment)
        name: "SW-Core-01",             // Device name (required)
        type: "switch",                 // See section 6.1
        brandModel: "Cisco C9300-48P",  // Brand + Model
        status: "active",               // active|disabled|maintenance
        location: "Sala Server",        // Room or location name
        rackId: "RACK-NETWORK-01",      // Rack identifier
        order: 1,                        // Position in rack (00-99)
        isRear: false,                   // true = rear side of rack
        addresses: [{
            network: "10.10.100.1/24",  // IP with CIDR
            ip: "",                      // Legacy field
            vlan: null,                  // VLAN ID (optional)
            zone: "LAN"                  // Network zone (optional)
        }],
        ports: [{
            name: "eth01",               // Port name (zero-padded)
            type: "eth",                 // eth|sfp|wan|console|mgmt
            status: "active"             // active|disabled
        }],
        links: [{
            type: "ssh",                 // ssh|web|rdp|vnc|telnet
            url: "10.10.100.1",          // Target IP/URL
            label: "ssh"                 // Display label
        }],
        service: "Core Switch",          // Description/service
        notes: ""                        // Additional notes
    }],
    
    connections: [{
        id: "c-xxxxxxxxxxxx",           // UUID format (12 hex chars)
        from: 1,                         // Source device ID (number)
        fromPort: "eth24",               // Source port name
        to: 2,                           // Target device ID (number or null)
        toPort: "eth01",                 // Target port name
        type: "trunk",                   // ⭐ PRIMARY ZONE IDENTIFIER - see 6.2
        status: "active",                // active|disabled|maintenance
        cableColor: "#3b82f6",           // Hex color code
        cableMarker: "A1",               // Physical cable label
        notes: "",                       // Additional notes
        externalDest: "",                // External destination (when to=null)
        isWallJack: false,               // true for wall outlet connections
        roomId: null                     // Room ID for floor plan mapping
    }],
    
    rooms: [{
        id: "room-uuid",                 // Unique room ID
        nickname: "Server Room",         // Display name
        number: "01",                    // Room number
        polygon: [[x1,y1], [x2,y2],...], // Floor plan coordinates
        color: "#3b82f6"                 // Room color on map
    }],
    
    sites: ["Sede Ivrea", "Filiale Torino"],
    
    locations: [{
        id: 1,
        code: "DC01",
        name: "Data Center",
        type: "site|mapped|custom"
    }],
    
    version: "3.6.035",
    lastModified: "2026-02-09T14:00:00Z",
    checksum: "sha256..."               // Data integrity
}
```

---

## 4. MODULES & COMPONENTS

### 4.1 Core Application (app.js - 4,988 lines)

**Primary Functions:**
| Function | Purpose |
|----------|---------|
| `serverLoad()` | Fetches data from `/data` endpoint |
| `normalizeDataCase()` | Standardizes field names, case, port padding |
| `normalizePortName()` | Pads port numbers (eth1→eth01) |
| `saveDevice()` | Full device save with 14+ fields |
| `saveConnection()` | Connection save with port normalization |
| `initApp()` | Page initialization |
| `updateGlobalCounters()` | Updates statistics |

**Key Constants:**
```javascript
var SUPPORTED_VERSIONS = ['3.6.032', '3.6.031', '3.6.030', ...];
var CURRENT_VERSION = '3.6.035';

var VALID_ENUMS = {
    deviceTypes: ['server', 'switch', 'router', 'firewall', ...],
    deviceStatus: ['active', 'disabled', 'maintenance', ...],
    connectionTypes: ['lan', 'wan', 'dmz', 'vlan', 'trunk', 'vpn', 
                      'cloud', 'management', 'servers', 'iot', 
                      'guest', 'voice', 'backup', 'fiber', 'test', 
                      'wallport', 'external', 'other'],
    connectionStatus: ['active', 'disabled', 'inactive', ...]
};

var NETWORK_ZONES = [
    { value: 'LAN', label: '🏢 LAN' },
    { value: 'WAN', label: '🌐 WAN' },
    { value: 'DMZ', label: '🛡️ DMZ' },
    { value: 'VLAN', label: '📊 VLAN' },
    { value: 'VPN', label: '🔒 VPN' },
    { value: 'Cloud', label: '☁️ Cloud' },
    { value: 'Guest', label: '👥 Guest' },
    { value: 'IoT', label: '📡 IoT' },
    { value: 'Servers', label: '🖥️ Servers' },
    { value: 'Management', label: '⚙️ Mgmt' },
    { value: 'Voice', label: '📞 Voice' },
    { value: 'Test', label: '🧪 Test' }
];
```

### 4.2 Device Detail Modal (device-detail.js - 1,032 lines) ⭐ v3.6.032

**Visual Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ DEVICE NAME                                              [✕]  │
│   BrandModel • Location • Rack                                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────────────┐ │
│ │ 🌐 Network          │ │ 🔌 Ports (53)                      │ │
│ │  10.10.100.1 ─ LAN  │ │ ┌───────────────────────────────┐  │ │
│ │  192.168.1.1 ─ DMZ  │ │ │ ● ● ● ●   [LAN PORTS]    ● ● │  │ │
│ ├─────────────────────┤ │ │ 01 03 05 07 ...          47│  │ │
│ │ 🔗 Zones            │ │ │ 02 04 06 08 ...          48│  │ │
│ │  [LAN] [DMZ] [Trunk]│ │ └───────────────────────────────┘  │ │
│ └─────────────────────┘ │ WAN │ SFP │ CON │←Special ports    │ │
│                         └─────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [🌐 WEB] [📟 SSH] [🖥️ RDP] [📺 VNC] [📞 TEL] [✏️ EDIT]        │
├─────────────────────────────────────────────────────────────────┤
│ 📡 Connections (8)                                              │
│ ─────────────────────────────────────────────────────────────── │
│  eth01 ⟷ eth10 | Switch-Core-01 (RACK-01 #02)                   │
│  eth03 ⟷ wan01 | ISP-Router (RACK-01 #03)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Port Visualization Functions:**

| Function | Purpose |
|----------|---------|
| `buildPortVisualization()` | Main port layout builder |
| `buildRJ45Port()` | RJ45-style port (26x34px, LED, tooltip) |
| `buildSFPPort()` | SFP cage style (36x26px) |
| `buildConsolePort()` | Console port (30x26px, blue) |
| `buildPortTooltip()` | Tooltip with destination info only |
| `buildQuickButtons()` | Guacamole-integrated quick access buttons |
| `buildVlanSummary()` | Zone badges from connection types |

**Port Classification Logic:**
```javascript
// Automatic port type detection
if (portName.match(/^wan/i)) → specialPorts.wan
if (portName.match(/^(console|con|tty|serial|rs232)/i)) → specialPorts.console
if (portName.match(/^(mgmt|management|oob|aux)/i)) → specialPorts.mgmt
if (portName.match(/^(sfp|xfp|qsfp|fiber|gb|ge|gig|10g)/i)) → specialPorts.sfp
else → lanPorts
```

**LED Color Scheme:**
| Status | Color | Hex |
|--------|-------|-----|
| Connected | Green | #22c55e |
| Disconnected | Red | #ef4444 |
| Disabled | Gray | #374151 |

### 4.3 Features Module (features.js - ~4,700 lines)

**Topology Visualization:**
- SVGTopology class - Interactive network diagram
- 25+ Cisco-style device icons
- Connection rendering with color-coded types
- Zone visualization with centroid-based star topology
- Zoom, pan, drag-to-reposition capabilities

**Data Export:**
- Excel export (4 sheets): Devices, Connections, Matrix, Rooms
- JSON export with SHA-256 checksum
- Draw.io XML export (preserves layout)
- PNG topology image export

### 4.4 Floor Plan Module (floorplan.js - 1,219 lines)

**Core Functions:**
- `FloorPlan.init()` - Initialize canvas + background image
- `FloorPlan.getRooms()` - Retrieve room polygons
- `FloorPlan.editRoom()` - Room creation/editing
- `FloorPlan.drawDevices()` - Place devices on map

### 4.5 Dashboard Module (dashboard.js - 1,210 lines)

**Charts:**
- Device type distribution (pie chart)
- Devices by location (bar chart)
- Connection type statistics

### 4.6 JSON Validator (json-validator.js - 273 lines)

**Validation Operations:**
- Schema validation for devices, connections, rooms
- Field type checking and normalization
- Deprecated field detection
- SHA-256 checksum verification
- Excel structure validation

---

## 5. DATA FLOW

### 5.1 Startup Sequence
```
Browser loads → initApp() 
  ↓
Check session (Auth.isLoggedIn)
  ↓
serverLoad() fetches /data endpoint
  ↓
Data arrives → normalizeDataCase()
  ↓
updateUI() renders all views
  ↓
Start heartbeat (online user tracking)
```

### 5.2 Device Detail Modal Flow
```
User clicks device row → DeviceDetail.open(deviceId)
  ↓
Fetch device data from appState
  ↓
Get device connections from appState.connections
  ↓
Build modal HTML:
  ├─ buildPortVisualization() → RJ45/SFP/Console ports
  ├─ buildNetworkInfo() → IP addresses
  ├─ buildVlanSummary() → Zone badges from connection types
  ├─ buildQuickButtons() → Guacamole buttons
  └─ buildConnectionsList() → Connected devices
  ↓
SweetAlert2.fire(html) → Display modal
```

### 5.3 Guacamole Integration Flow
```
User clicks quick access button (SSH/RDP/etc)
  ↓
openGuacamole(protocol, host) called
  ↓
Try API paths in order:
  1. /guacamole/api/session
  2. /api/guacamole/session
  3. /Matrix/api/guacamole/session
  ↓
If API responds → Open Guacamole in new tab
If API fails → Fallback to direct protocol (ssh://host)
```

---

## 6. DEVICE & CONNECTION TYPES

### 6.1 Device Types
| Type | Icon | Description |
|------|------|-------------|
| server | 🖥️ | Server / Host |
| switch | 🔀 | Network Switch |
| router | 🌐 | Router |
| router_wifi | 📶 | WiFi Router |
| firewall | 🛡️ | Firewall / UTM |
| access_point | 📡 | Access Point |
| patch_panel | 🔲 | Patch Panel |
| walljack | 🔌 | Wall Jack |
| workstation | 💻 | Desktop PC |
| laptop | 💼 | Laptop |
| ip_phone | 📞 | IP Phone |
| printer | 🖨️ | Printer |
| camera | 📷 | IP Camera |
| ups | 🔋 | UPS |
| isp | 🌍 | ISP/Modem |
| nas | 💾 | NAS Storage |
| pdu | 🔌 | PDU |
| tv/display | 📺 | Display/Monitor |
| other | ❓ | Other |

### 6.2 Connection Types (Zone System) ⭐ v3.6.032

| Type | Emoji | Color | Use Case |
|------|-------|-------|----------|
| lan | ↔️ | #22c55e Green | Standard LAN |
| wan | 🌐 | #f59e0b Orange | Internet/WAN |
| dmz | 🛡️ | #ef4444 Red | DMZ segment |
| vlan | 🔷 | #3b82f6 Blue | VLAN tagging |
| trunk | ⬆️ | #8b5cf6 Purple | Switch trunks |
| vpn | 🔒 | #06b6d4 Cyan | VPN tunnels |
| cloud | ☁️ | #60a5fa Light Blue | Cloud services |
| management | ⚙️ | #06b6d4 Cyan | MGMT VLAN |
| servers | 🖥️ | #8b5cf6 Purple | Server segment |
| iot | 📡 | #a855f7 Purple | IoT devices |
| guest | 👥 | #f97316 Orange | Guest network |
| voice | 📞 | #eab308 Yellow | VoIP/Voice |
| backup | 💾 | #78716c Gray | Backup links |
| fiber | 💡 | #14b8a6 Teal | Fiber optic |
| test | 🧪 | #ec4899 Pink | Test/Prova |
| wallport | 🔌 | #64748b Gray | Wall ports |
| external | 📡 | #f59e0b Orange | External/ISP |
| other | 📦 | #64748b Gray | Other |

**Zone System Philosophy:**
- `connections.type` is the PRIMARY source for zone classification
- When creating a connection with `type: dmz`, both endpoints are in DMZ zone
- Device Detail modal shows only zones that exist in device's connections
- No need to edit each device individually - zones are inferred from connections

### 6.3 Network Zones (Device Addresses)
| Zone | Color | Purpose |
|------|-------|---------|
| LAN | Green | Internal network |
| WAN | Orange | External/Internet |
| DMZ | Red | Demilitarized zone |
| VLAN | Blue | Tagged VLAN |
| VPN | Cyan | VPN tunnel |
| Cloud | Light Blue | Cloud services |
| Guest | Orange | Guest WiFi |
| IoT | Purple | IoT devices |
| Servers | Purple | Server segment |
| Management | Cyan | MGMT network |
| Voice | Yellow | VoIP |
| Test | Pink | Test environment |

---

## 7. API ENDPOINTS

### 7.1 Data Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/data` | Get all data (JSON) |
| POST | `/data` | Save all data |
| GET | `/data?action=online` | Get active users |

### 7.2 Guacamole Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/guacamole` | Create Guacamole session |
| GET | `/guacamole/api/session` | Check Guacamole availability |

### 7.3 Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth.php` | Login/logout/check |
| POST | `/api/editlock.php` | Acquire/release lock |

---

## 8. SECURITY ARCHITECTURE

### 8.1 Authentication
- Session-based with PHP sessions
- Passwords hashed with bcrypt
- Rate limiting: 5 failed attempts/minute
- Auto-logout: 30 minutes inactivity

### 8.2 Multi-User Concurrency
- Edit lock: Single editor at a time
- Lock timeout: 5 minutes
- Heartbeat: 60 seconds

### 8.3 Data Integrity
- SHA-256 checksum on all data
- Import validation prevents corruption
- Backup before destructive operations

### 8.4 Remote Access Security
- Guacamole handles SSH/RDP/VNC authentication
- No direct credentials stored in frontend
- API proxy prevents credential exposure

---

## 9. DEPLOYMENT GUIDE

### 9.1 System Requirements
- **Server:** Apache 2.4+ with PHP 8.1+ OR Node.js 16+
- **Permissions:** Write access to `data/` directory
- **Browsers:** Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Optional:** Apache Guacamole for remote access

### 9.2 Installation (Apache + PHP)

```bash
sudo cp -r Matrix/ /var/www/html/matrix/
sudo chown -R www-data:www-data /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/data/
```

### 9.3 Installation (Node.js)

```bash
cd Matrix/
npm install
node server.js
# Access: http://localhost:3000
```

### 9.4 Guacamole Integration

See `doc/GUACAMOLE_SETUP.md` for complete setup instructions.

---

## 10. CODE METRICS

| File | Lines | Purpose |
|------|-------|---------|
| app.js | 4,988 | Core application logic |
| features.js | ~4,700 | Topology & export |
| ui-updates.js | ~2,800 | UI rendering |
| index.html | 3,217 | Main SPA |
| floorplan.js | 1,219 | Floor plan module |
| dashboard.js | 1,210 | Charts & statistics |
| device-detail.js | 1,032 | Device modal ⭐ |
| server.js | ~900 | Node.js server |
| auth.js | 306 | Authentication |
| json-validator.js | 273 | Data validation |
| icons.js | 276 | SVG icon library |
| editlock.js | 228 | Edit lock system |
| **Total JavaScript** | **~18,000** | Client + server |

---

## 11. BROWSER COMPATIBILITY

| Browser | Minimum | Status |
|---------|---------|--------|
| Chrome | 90 | ✅ Full |
| Firefox | 88 | ✅ Full |
| Edge | 90 | ✅ Full |
| Safari | 14 | ✅ Full |
| IE | Any | ❌ Not supported |

---

## 12. KNOWN LIMITATIONS

1. **Single JSON file** - 500+ devices may impact performance
2. **Manual save required** - No real-time auto-save
3. **Manual data entry** - No SNMP/network auto-discovery
4. **Single editor at a time** - Edit lock prevents concurrent editing

---

## 13. TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| "Loading..." message | Data endpoint unavailable | Check `/data` returns JSON |
| Save fails | File permissions | `chmod 755 data/` |
| Ports not visible | Empty ports array | Add ports to device |
| Guacamole fails | API not available | Check Guacamole service |

---

## 14. CHANGELOG SUMMARY

| Version | Date | Highlights |
|---------|------|------------|
| 3.6.035 | Feb 9, 2026 | Documentation cleanup, version alignment, Help unification |
| 3.6.032 | Feb 9, 2026 | Device Detail redesign, Zone system expansion |
| 3.6.030 | Feb 8, 2026 | Topology improvements |
| 3.6.028 | Feb 8, 2026 | Data integrity & validation |
| 3.6.026 | Feb 8, 2026 | Documentation cleanup |
| 3.6.024 | Feb 6, 2026 | Room structure finalization |

---

**Document Version:** 3.6.035  
**Last Updated:** February 9, 2026  
**Status:** Production Ready

---

## Additional Resources

- **README.md** - User guide and feature overview
- **QUICK_REFERENCE.md** - Commands and settings
- **VALIDATION_TESTING_GUIDE.md** - Testing procedures
- **ROOM_STRUCTURE.md** - Complete JSON schema
- **GUACAMOLE_SETUP.md** - Remote access setup
