# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.6.028  
**Date:** February 8, 2026  
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

### 1.3 What This System IS NOT
- ❌ **NOT a monitoring system** - does not check if devices are online
- ❌ **NOT auto-discovery** - devices are added manually
- ❌ **NOT a network scanner** - does not detect devices automatically
- ❌ **NOT SNMP/ICMP based** - no live network polling

---

## 2. VERSION TIMELINE

### v3.6.028 (Current) - February 8, 2026 - Data Integrity & Validation Release

#### 🔧 Data Normalization (v3.6.027-028)
- NEW: `normalizePortName()` function - pads port names (eth1→eth01)
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

#### 📚 Documentation Consolidation
- Merged duplicate docs (BLUEPRINT + QUICK_REFERENCE versioned copies removed)
- Updated all metrics: 17,742 JS lines, 101 devices, 93 connections, ~197KB JSON
- Consolidated 8 doc files → 6 core documents
- All version strings aligned across 11 JS files + HTML + docs

#### ✅ Verification
- 12-point reverse verification: ZERO ERRORS
- SHA-256 roundtrip test: byte-identical after export→import cycle
- All 14 device fields validated through save pipeline
- All 15 connection fields validated through import/export cycle
- Port normalization standard: lowercase `eth`+2-digit pad, uppercase acronyms (GbE, SFP, WAN)

### v3.6.026 - February 8, 2026 - Professional Cleanup Release
- Consolidated 24 doc files → 6 core documents
- Moved 14 diagnostic/temporary files to Archives
- Unified version numbering, verified data integrity

### v3.6.024-025 - February 6, 2026 - Stability Foundation
- Room structure: 21 fully mapped rooms with floor plan polygons
- UI improvements: Active labels, link icons, remote access integration
- Data: 101 devices, 93 connections, validated import system
- Error handling: Enhanced try-catch blocks for data loading
- Endpoints: Absolute path routing for Apache/Node.js compatibility

---

## 3. ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | HTML5 + Tailwind CSS 3.x | Local vendor, responsive design |
| **JavaScript** | ES6 Vanilla | No framework, 17,742 lines |
| **Icons** | Custom SVG | Cisco-style network icons (25+) |
| **Modals** | SweetAlert2 | Local vendor, user interactions |
| **Excel** | SheetJS (XLSX) 0.18.5 | Local vendor, 4-sheet export |
| **Backend** | PHP 8.3 or Node.js 16+ | Production or development |
| **Authentication** | Session-based + bcrypt | Secure password hashing |
| **Data Store** | JSON file | data/network_manager.json (~197KB) |
| **Validation** | json-validator.js | 273 lines protecting data integrity |

### 3.2 Core File Structure

```
Matrix/
├── index.html              # Single-page application
├── server.js               # Node.js development server
├── data.php                # PHP API endpoint
├── package.json            # npm dependencies
│
├── js/
│   ├── app.js              # Core (4,887 lines) - state, data load, device management
│   ├── features.js         # Topology, export (4,678 lines)
│   ├── ui-updates.js       # UI rendering (2,806 lines)
│   ├── floorplan.js        # Floor plan (1,219 lines)
│   ├── dashboard.js        # Charts (1,210 lines)
│   ├── device-detail.js    # Device modal (962 lines)
│   ├── json-validator.js   # Validation (273 lines) 
│   ├── editlock.js         # Multi-user lock (228 lines)
│   ├── auth.js             # Authentication (306 lines)
│   └── icons.js            # SVG icons (276 lines)
│
├── css/
│   └── styles.css          # Tailwind + custom variables (43.1 KB)
│
├── api/
│   ├── auth.php            # Authentication
│   └── editlock.php        # Multi-user locks
│
├── config/
│   └── config.php          # Server configuration
│
├── data/
│   └── network_manager.json # Main data file
│
└── doc/
    ├── README.md           # User guide
    ├── BLUEPRINT.md        # This file
    ├── QUICK_REFERENCE.md  # Command reference
    ├── GUACAMOLE_SETUP.md  # Remote access setup
    ├── VALIDATION_TESTING_GUIDE.md
    └── ROOM_STRUCTURE.md   # JSON schema docs
```

### 3.3 Data Model (appState)

```javascript
appState = {
    devices: [{
        id: "uuid",
        name: "SW-Core-01",
        type: "switch",              // see section 6
        location: "Data Center",     // room or site
        group: "Rack-01",
        ip: "192.168.1.1",
        networkZone: "LAN",          // see section 6
        ports: 48,
        status: "active",
        links: ["https://...", "ssh://..."],
        rackId: "A-01",
        order: 1,
        manufacturer: "Cisco",
        model: "C9300-48P"
    }],
    
    connections: [{
        id: "c-xxxxxxxxxxxx",        // UUID format
        from: 1,                       // device ID (number)
        fromPort: "eth24",
        to: 2,                         // device ID or null for special types
        toPort: "eth01",
        type: "trunk",               // see section 6
        status: "active",
        cableColor: "#3b82f6",
        cableMarker: "A1",           // physical cable label
        notes: "",
        externalDest: "",            // for external connections
        isWallJack: false,            // true for wall outlet connections
        roomId: null,                 // room ID for floor plan mapping (wallport/walljack)
        flagged: false,               // optional: marks incomplete connections
        flagReason: ""               // optional: reason for flagging
    }],
    
    rooms: [{
        id: "uuid",
        nickname: "Server Room",
        number: "01",
        polygon: [[x1,y1], [x2,y2], ...],
        color: "#3b82f6"
    }],
    
    sites: ["Sede Ivrea", "Filiale Torino"],
    
    locations: [{
        id: "uuid",
        code: "DC01",
        name: "Data Center",
        type: "site|mapped|custom"
    }],
    
    version: "3.6.028",
    lastModified: "2026-02-08T14:00:00Z",
    checksum: "sha256..."            // Data integrity
}
```

---

## 4. MODULES & COMPONENTS

### 4.1 Core Application (app.js - 4,887 lines)

**Primary Functions:**
- `serverLoad()` - Fetches data from `/data` endpoint into appState
- `normalizeDataCase()` - Standardizes field names, case, and port padding
- `normalizePortName()` - Pads port numbers to 2 digits (eth1→eth01)
- `migrateToNewLocationSystem()` - Creates default site, migrates legacy room data
- `initApp()` - Page load initialization, triggers serverLoad()
- `updateGlobalCounters()` - Updates device/connection statistics
- `saveDevice()` - Full 14-field save with normalization (type, status, rackId, ports, links)
- `saveConnection()` - Save with port normalization and type/status lowercase
- Toast notifications, debug logging, activity tracking

**Key Features:**
- State management for 101 devices, 93 connections
- Professional data normalization (see header table)
- Smart device matching (prevents visual duplicates in topology)
- Backward compatibility with v3.5.x data formats
- Real-time user presence tracking (heartbeat every 30 sec)

### 4.2 Features Module (features.js - 4,678 lines)

**Topology Visualization:**
- SVGTopology class - Interactive network diagram
- 25+ Cisco-style device icons
- Connection rendering with color-coded types
- Zone visualization with centroid-based star topology
- Zoom, pan, drag-to-reposition capabilities
- PNG export (high-resolution)

**Data Export:**
- Excel export (4 sheets): Devices, Connections, Matrix, Rooms
- JSON export with SHA-256 checksum
- Draw.io XML export (preserves layout)
- PNG topology image export

**Location Management:**
- Site/location CRUD operations
- Location filtering and sorting
- Multi-site support

### 4.3 UI Updates Module (ui-updates.js - 2,806 lines)

> **Note:** `escapeHtml()` is defined in app.js and shared globally across all
> `<script>` tags. Other modules must NOT re-declare it with `let` — use a
> `typeof` guard fallback if a local definition is needed.

**Primary Rendering Functions:**
- `updateUI()` - Master refresh function
- `updateDevicesList()` - Device cards/table rendering
- `updateConnectionsList()` - Connection entries
- `updateMatrix()` - SVG connection matrix
- `updateLocationDropdown()` - Location selectors
- `getDevicesSortedBy()` - Multi-column sorting (rackId, order, name)

**Formatting Functions:**
- `formatLabel()` - Converts "router_wifi" → "Router WiFi"
- `formatLocationLabel()` - Returns "00 - Server Room" (room number + name)

### 4.4 Device Detail Modal (device-detail.js - 962 lines)

**Functions:**
- `openDeviceDetail(deviceId)` - Open detail modal
- `renderPortMap()` - VLAN-colored port grid visualization
- `renderConnectionsList()` - List all device connections
- `renderVlanSummary()` - VLAN usage statistics

### 4.5 Dashboard Module (dashboard.js - 1,210 lines)

**Charts:**
- Device type distribution (pie chart)
- Devices by location (bar chart)
- Connection type statistics

### 4.6 Floor Plan Module (floorplan.js - 1,219 lines)

**Core Functions:**
- `FloorPlan.init()` - Initialize canvas + background image
- `FloorPlan.getRooms()` - Retrieve room polygons
- `FloorPlan.editRoom()` - Room creation/editing interface
- `FloorPlan.drawDevices()` - Place devices on map (by location)
- `FloorPlan.zoomToRoom()` - Auto-pan/zoom to specific room

**Features:**
- Canvas-based map with draggable points
- Polygon drawing with multi-point support
- Device placement by location matching
- Background image (planta.png) with adjustable opacity

### 4.7 JSON Validator (json-validator.js - 273 lines)

**Validation Operations:**
- Schema validation for devices, connections, rooms, sites
- Field type checking and normalization
- Deprecated field detection (zone, zoneIP for devices, color for connections)
- Automatic field consolidation (color→cableColor)
- Support for roomId in connections (floor plan mapping)
- Connection orphan detection
- SHA-256 checksum verification on imports
- Excel 4-sheet structure validation

**Import Safety:**
- Reject corrupted or malformed JSON
- Prevent data loss during field migration
- Report validation errors to user
- Step-by-step field mapping for Excel imports

### 4.8 Edit Lock System (editlock.js - 228 lines)

**Locking Mechanism:**
- Single editor at a time (5-minute timeout)
- Heartbeat pings every 60 seconds to maintain lock
- Auto-release on logout or session timeout
- Queue display showing who's waiting to edit
- Lock status indicator in UI

### 4.9 Authentication (auth.js + auth.php)

**Features:**
- Session-based login/logout
- Password hashing with bcrypt
- Rate limiting (5 failed attempts/minute)
- Session timeout (30 minutes inactivity)
- Check session status on page load

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
migrateToNewLocationSystem() (if needed)
  ↓
updateUI() renders all views
  ↓
Start heartbeat (online user tracking)
```

### 5.2 User Edit Operation
```
User clicks "Edit" → Request edit lock (EditLock.acquire)
  ↓
Lock acquired → UI switches to edit mode
  ↓
User modifies data (add/edit/delete devices/connections)
  ↓
User clicks "Save Now" → Validate changes (json-validator.js)
  ↓
POST /data with new appState (include checksum)
  ↓
Server validates → Saves to network_manager.json
  ↓
Response confirms → Display success toast
  ↓
Reload HTML → serverLoad() fetches fresh data
```

### 5.3 Export Operation
```
User selects export format (Excel/JSON/PNG/Draw.io)
  ↓
Client-side generation:
  - JSON: stringify(appState) + SHA-256 hash
  - Excel: XLSX library creates 4 sheets
  - PNG: Canvas → blob → download
  - Draw.io: XML generation from device positions
  ↓
Browser download triggers → User receives file
```

### 5.4 Import Operation
```
User selects import file (Excel/JSON)
  ↓
Client reads file → json-validator.js validates
  ↓
If JSON:
  - Parse JSON
  - Verify checksum
  - Validate schema
  
If Excel:
  - Read 4 sheets
  - Map columns to appState fields
  - Validate structure
  ↓
Present merge preview (show added/updated/removed items)
  ↓
User confirms → POST /data with merged appState
  ↓
Server validates + saves
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
| other | ❓ | Other |

### 6.2 Connection Types
| Type | Color | Count | Use Case |
|------|-------|-------|----------|
| lan | 🔵 Blue | 72 | Standard LAN connections |
| wallport | ⚫ Gray | 14 | Wall port/outlet connections (to=null, roomId maps to floor plan) |
| trunk | 🟢 Green | 4 | Switch trunks |
| wan | 🔴 Red | 2 | Internet/WAN (flagged as incomplete if to=null) |
| other | ⚪ White | 1 | Custom connections |
| dmz | 🟠 Orange | 0 | DMZ segment |
| management | 🟣 Purple | 0 | Management VLAN |
| walljack | ⚫ Gray | - | Legacy: now use wallport |

**Special Fields:**
- `isWallJack`: 14 connections marked as wall connections
- `roomId`: 20 connections mapped to rooms on floor plan
- `flagged`: 6 connections marked as incomplete (need correction)
- `externalDest`: 20 connections with external destination info

### 6.3 Network Zones
| Zone | Color | Typical CIDR |
|------|-------|------------|
| DMZ | Red | 172.24.254.0/24 |
| Backbone | Amber | 10.10.0.0/16 |
| LAN | Blue | 10.10.100.0/24 |
| WAN | Green | external |
| Cloud | Indigo | cloud.* |
| Management | Purple | 10.10.254.0/24 |

---

## 7. API ENDPOINTS

### 7.1 Data Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/data` | Get all data (JSON) |
| POST | `/data` | Save all data |
| GET | `/data?action=online` | Get active users |

**Response Format (GET):**
```json
{
    "devices": [...],
    "connections": [...],
    "rooms": [...],
    "sites": [...],
    "locations": [...],
    "version": "3.6.028",
    "lastModified": "2026-02-08T14:00:00Z",
    "checksum": "sha256hash"
}
```

### 7.2 Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth.php` | Login/logout/check |

### 7.3 Edit Lock Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/editlock.php` | Acquire/release/heartbeat lock |

---

## 8. SECURITY ARCHITECTURE

### 8.1 Authentication
- Session-based with PHP sessions
- Passwords hashed with bcrypt (cost ~10)
- Rate limiting: max 5 failed login attempts/minute
- Auto-logout: 30 minutes inactivity
- CSRF protection via session tokens

### 8.2 Multi-User Concurrency
- Edit lock: Single editor at a time
- Lock timeout: 5 minutes
- Heartbeat: 60 seconds
- Auto-release on logout

### 8.3 Data Integrity
- SHA-256 checksum on all data
- Import validation prevents corruption
- Deprecated field detection + auto-migration
- Backup before destructive operations
- JSON schema validation

### 8.4 Protection Against
- XSS attacks (escapeHtml on user input)
- Path traversal (sanitize file paths)
- SQL injection (no SQL, JSON-based storage)
- CSRF (session tokens, POST validation)
- Data corruption (validation + checksum)

---

## 9. DEPLOYMENT GUIDE

### 9.1 System Requirements
- **Server:** Apache 2.4+ with PHP 8.1+ OR Node.js 16+
- **Permissions:** Write access to `data/` directory
- **Browsers:** Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Storage:** ~200 KB minimum, grows with data

### 9.2 Installation (Apache + PHP)

```bash
# Copy to web root
sudo cp -r Matrix/ /var/www/html/matrix/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/data/
sudo chmod 644 /var/www/html/matrix/data/*.json

# Enable mod_rewrite (if needed)
sudo a2enmod rewrite
sudo systemctl restart apache2

# Access: http://your-server/matrix/
```

### 9.3 Installation (Node.js)

```bash
cd Matrix/
npm install bcrypt
node server.js
# Access: http://localhost:3000
```

### 9.4 Configuration

**Apache/PHP:**
- Edit `config/config.php` for authentication credentials
- Set `DATA_FILE` path if not using default

**Node.js:**
- Server listens on port 3000 by default
- Supports CORS for development

---

## 10. CODE METRICS

| File | Lines | Purpose |
|------|-------|---------|
| app.js | 4,887 | Core application logic |
| features.js | 4,678 | Topology & export |
| ui-updates.js | 2,806 | UI rendering |
| floorplan.js | 1,219 | Floor plan module |
| dashboard.js | 1,210 | Charts & statistics |
| device-detail.js | 962 | Device modal UI |
| server.js | 897 | Node.js server |
| auth.js | 306 | Authentication |
| json-validator.js | 273 | Data validation |
| icons.js | 276 | SVG icon library |
| editlock.js | 228 | Edit lock system |
| **Total JavaScript** | **17,742** | Client + server |
| **Total Project** | **~22,000** | Including PHP, CSS, HTML |

---

## 11. BROWSER COMPATIBILITY

| Browser | Minimum | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90 | ✅ Full | Recommended |
| Firefox | 88 | ✅ Full | Full support |
| Edge | 90 | ✅ Full | Full support |
| Safari | 14 | ✅ Full | Full support |
| Opera | 76 | ✅ Full | Full support |
| IE | Any | ❌ Not supported | Use Edge instead |

---

## 12. KNOWN LIMITATIONS

1. **Single JSON file** - 500+ devices may impact performance
2. **Manual save required** - No real-time auto-save
3. **Manual data entry** - No SNMP/network auto-discovery
4. **Single editor at a time** - Edit lock prevents concurrent editing
5. **In-memory appState** - Page reload required after large imports

---

## 13. TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| "Loading..." message | Data endpoint unavailable | Check `/data` returns JSON |
| Save fails | File permissions | Verify `chmod 755 data/` |
| Device not visible | Wrong location name | Match device location to room |
| Floor plan empty | Room polygon coordinates | Verify room is drawn on map |
| Import fails | Corrupted JSON | Use json-validator tool |

---

## 14. FUTURE ENHANCEMENTS

- [ ] WebSocket real-time sync
- [ ] SQLite backend option
- [ ] Dark mode theme
- [ ] PDF report generation
- [ ] VLAN visualization improvements
- [ ] Multi-language support (i18n)
- [x] JSON validation system ✅
- [x] Dashboard charts ✅
- [x] Device detail modal ✅
- [x] Floor plan with polygons ✅

---

**Document Version:** 3.6.028  
**Last Updated:** February 9, 2026  
**Status:** Production Ready

---

## Additional Resources

See complementary documentation:
- **README.md** - User guide and feature overview
- **QUICK_REFERENCE.md** - Commands and settings
- **VALIDATION_TESTING_GUIDE.md** - Testing procedures
- **ROOM_STRUCTURE.md** - Complete JSON schema
