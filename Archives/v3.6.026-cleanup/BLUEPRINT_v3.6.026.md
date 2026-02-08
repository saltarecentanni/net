# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.6.026  
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

### v3.6.026 (Current) - February 8, 2026 - Professional Cleanup Release

#### 📚 Documentation Improvements
- Consolidated 24 doc files → 6 core documents (removed 18 obsolete files)
- Unified version numbering across all files (3.5.047 → 3.6.026)
- Enhanced README.md with system statistics and comprehensive guides
- Verified all technical content matches source code

#### 🗑️ Code Cleanup
- Moved 14 diagnostic/temporary files to Archives
- Removed 19 redundant documentation files
- Reorganized doc structure for maintainability
- Eliminated text duplication and dead references

#### ✅ Validation & Verification
- Verified JSON import/export data integrity
- Confirmed Excel export (4 sheets) fidelity
- Validated all module dependencies
- Confirmed data checksum protection (SHA-256)

### v3.6.024-025 - February 6, 2026 - Stability Foundation
- Room structure: 21 fully mapped rooms with floor plan polygons
- UI improvements: Active labels, link icons, remote access integration
- Data: 140 devices, 200+ connections, validated import system
- Error handling: Enhanced try-catch blocks for data loading
- Endpoints: Absolute path routing for Apache/Node.js compatibility

---

## 3. ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | HTML5 + Tailwind CSS 3.x | Local vendor, responsive design |
| **JavaScript** | ES6 Vanilla | No framework, 19,000+ lines |
| **Icons** | Custom SVG | Cisco-style network icons (25+) |
| **Modals** | SweetAlert2 | Local vendor, user interactions |
| **Excel** | SheetJS (XLSX) 0.18.5 | Local vendor, 4-sheet export |
| **Backend** | PHP 8.3 or Node.js 16+ | Production or development |
| **Authentication** | Session-based + bcrypt | Secure password hashing |
| **Data Store** | JSON file | data/network_manager.json (~193KB) |
| **Validation** | json-validator.js | 798 lines protecting data integrity |

### 3.2 Core File Structure

```
Matrix/
├── index.html              # Single-page application
├── server.js               # Node.js development server
├── data.php                # PHP API endpoint
├── package.json            # npm dependencies
│
├── js/
│   ├── app.js              # Core (4,816 lines) - state, data load, device management
│   ├── features.js         # Topology, export (4,678 lines)
│   ├── ui-updates.js       # UI rendering (2,806 lines)
│   ├── floorplan.js        # Floor plan (1,187 lines)
│   ├── device-detail.js    # Device modal (826 lines)
│   ├── dashboard.js        # Charts (553 lines)
│   ├── json-validator.js   # Validation (798 lines) 
│   ├── editlock.js         # Multi-user lock (228 lines)
│   ├── auth.js             # Authentication (150+ lines)
│   └── icons.js            # SVG icons
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
        id: "uuid",
        from: "device-uuid-1",
        fromPort: "24",
        to: "device-uuid-2",
        toPort: "1",
        type: "trunk",               // see section 6
        status: "active",
        cableColor: "#3b82f6"
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
    
    version: "3.6.026",
    lastModified: "2026-02-08T14:00:00Z",
    checksum: "sha256..."            // Data integrity
}
```

---

## 4. MODULES & COMPONENTS

### 4.1 Core Application (app.js - 4,816 lines)

**Primary Functions:**
- `serverLoad()` - Fetches data from `/data` endpoint into appState
- `normalizeDataCase()` - Standardizes field names and case
- `migrateToNewLocationSystem()` - Creates default site, migrates legacy room data
- `initApp()` - Page load initialization, triggers serverLoad()
- `updateGlobalCounters()` - Updates device/connection statistics
- Toast notifications, debug logging, activity tracking

**Key Features:**
- State management for 140+ devices, 200+ connections
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

### 4.4 Device Detail Modal (device-detail.js - 826 lines)

**Functions:**
- `openDeviceDetail(deviceId)` - Open detail modal
- `renderPortMap()` - VLAN-colored port grid visualization
- `renderConnectionsList()` - List all device connections
- `renderVlanSummary()` - VLAN usage statistics

### 4.5 Dashboard Module (dashboard.js - 553 lines)

**Charts:**
- Device type distribution (pie chart)
- Devices by location (bar chart)
- Connection type statistics

### 4.6 Floor Plan Module (floorplan.js - 1,187 lines)

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

### 4.7 JSON Validator (json-validator.js - 798 lines)

**Validation Operations:**
- Schema validation for devices, connections, rooms, sites
- Field type checking and normalization
- Deprecated field detection (zone, zoneIP, roomId)
- Automatic field consolidation (color→cableColor)
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
| Type | Color | Use Case |
|------|-------|----------|
| lan | 🔵 Blue | Standard LAN |
| wan | 🔴 Red | Internet/WAN |
| trunk | 🟢 Green | Switch trunks |
| dmz | 🟠 Orange | DMZ segment |
| management | 🟣 Purple | Management VLAN |
| walljack | ⚫ Gray | Wall outlets |
| other | ⚪ White | Custom |

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
    "version": "3.6.026",
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
| app.js | 4,816 | Core application logic |
| features.js | 4,678 | Topology & export |
| ui-updates.js | 2,806 | UI rendering |
| floorplan.js | 1,187 | Floor plan module |
| device-detail.js | 826 | Device modal UI |
| dashboard.js | 553 | Charts & statistics |
| server.js | 891 | Node.js server |
| json-validator.js | 798 | Data validation |
| **Total JavaScript** | **~16,000** | Client + server |
| **Total Project** | **~19,000** | Including PHP, CSS, HTML |

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

**Document Version:** 3.6.026  
**Last Updated:** February 8, 2026  
**Status:** Production Ready

---

## Additional Resources

See complementary documentation:
- **README.md** - User guide and feature overview
- **QUICK_REFERENCE.md** - Commands and settings
- **VALIDATION_TESTING_GUIDE.md** - Testing procedures
- **ROOM_STRUCTURE.md** - Complete JSON schema
