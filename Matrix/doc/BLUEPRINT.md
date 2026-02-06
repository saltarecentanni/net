# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.6.025  
**Date:** February 6, 2026  
**Author:** Tiesse S.P.A.  
**Environment:** Ubuntu 24.04 LTS + Apache 2.4.58 + PHP 8.3

---

## 1. OVERVIEW

### 1.1 Description
A comprehensive web-based network infrastructure documentation system for enterprise environments. Provides device inventory management, physical connection mapping, interactive topology visualization, floor plan design with device placement, and **remote access via Guacamole** (SSH, RDP, VNC, Telnet directly in the browser).

### 1.2 What This System IS
- ✅ **Documentation tool** for network infrastructure
- ✅ **Visual mapper** for device connections
- ✅ **Inventory manager** for network equipment
- ✅ **Floor plan** designer with device placement
- ✅ **Remote access gateway** via Apache Guacamole (SSH, RDP, VNC, Telnet)
- ✅ **Export system** for Excel, JSON, PNG, Draw.io
- ✅ **Multi-user system** with edit locking

### 1.3 What This System IS NOT
- ❌ **NOT a monitoring system** - does not check if devices are online
- ❌ **NOT auto-discovery** - devices are added manually
- ❌ **NOT a network scanner** - does not detect devices automatically
- ❌ **NOT SNMP/ICMP based** - no live network polling

---

## 2. VERSION HISTORY

### v3.6.025 (Current) - February 6, 2026

#### 🏢 Room Structure & FloorPlan
| Feature | Description |
|---------|-------------|
| **21 Rooms** | Expanded from 20 to 21 rooms (IDs 0-20) |
| **Room 8 Split** | Original BIGONE split into Room 8 (L.Corfiati/R.Belletti) and Room 20 (BigOne) |
| **Room 19 Added** | New room mapped for additional space |
| **Polygon Update** | All 21 rooms with updated polygon coordinates |
| **Background #F8FAFC** | Uniform background color for FloorPlan and Topology |
| **Legend IDs 00-09** | Room IDs 0-9 now display with leading zero |

#### 🎨 UI/UX Improvements
| Feature | Description |
|---------|-------------|
| **ACTIVE Label Fixed** | Changed from red (#f87171) to green (#059669) |
| **Link Icons Larger** | Increased from 9px to 12px, padding 5px/8px |
| **Pastel Link Colors** | Very light backgrounds for better icon visibility |
| **Shadow on Links** | Subtle box-shadow for depth |

#### 🔗 Remote Links Integration
| Feature | Description |
|---------|-------------|
| **Guacamole First** | Links try Guacamole before protocol handlers |
| **FloorPlan.openRemoteLink** | New function for remote connection handling |
| **Device ID Tracking** | Links store device-id for Guacamole lookup |
| **Protocol Detection** | SSH/RDP/VNC/TELNET auto-detected |

### v3.6.023 - February 6, 2026

#### 🖥️ Apache Guacamole Integration
| Feature | Description |
|---------|-------------|
| **Browser-based SSH** | Open SSH sessions directly in browser via Guacamole |
| **RDP/VNC/Telnet** | Support for multiple remote desktop protocols |
| **Auto-login** | Token-based authentication bypasses Guacamole login |
| **Popup window** | SSH opens in 850x550 popup (PuTTY-like experience) |
| **Terminal config** | 100x30 chars, green-on-black, font size 14 |
| **Auto-create connections** | Connections created on-demand in Guacamole |
| **guacamole.php** | Complete API proxy for Guacamole REST API (242 lines) |
| **guacamole.json** | Configuration file for server settings |

### v3.6.003-3.6.018 - February 5-6, 2026

#### 🔍 Device Detail & UI Improvements
| Feature | Description |
|---------|-------------|
| **Device Detail Modal** | Complete device information with port visualization |
| **Port Map by VLAN** | Colored port visualization grouped by VLAN |
| **VLAN Summary** | Lists all VLANs with port assignments |
| **Connections List** | Device connections with clickable navigation |
| **Guacamole Buttons** | SSH/Telnet/RDP buttons in device detail header |
| **Quick Access Links** | Web, SSH, FloorPlan, Edit buttons |
| **SVG Device Icons** | Large device type icons from SVGTopology |
| **device-detail.js** | New dedicated module (826 lines) |
| **JSON Validator** | Data validation with comprehensive error reporting |
| **Dashboard Charts** | Interactive charts for device statistics |

### v3.6.002 - February 6, 2026

#### 🎨 UI Enhancements & Location Numbering
| Feature | Description |
|---------|-------------|
| **Room Numbers in Cards** | Device cards show "00 - Sala Server" format |
| **Room Numbers in Charts** | Location charts display room number prefix |
| **formatLabel()** | Converts "router_wifi" to "Router WiFi" |
| **formatLocationLabel()** | Returns formatted location with room number |
| **Search Results** | Enhanced format: "NAME • Group • #Position" |

### v3.5.050 - February 5, 2026

#### 🔧 Script Organization & Versioning
| Feature | Description |
|---------|-------------|
| **Deploy Script** | Automatic version extraction from package.json |
| **Version Tracking** | Deploy displays version and creates .deployment record |
| **Consistent Versioning** | All files synchronized |

### v3.5.044-045 - February 4, 2026

#### 📦 Version Management & Refactoring
| Feature | Description |
|---------|-------------|
| **Automatic Backup** | .tar.gz backup system |
| **Script Organization** | Maintenance scripts in /scripts/ |
| **Documentation** | 13+ doc files in /doc/ directory |

### v3.5.040-043 - February 4, 2026

#### 🔧 Topology & Data Integrity
| Feature | Description |
|---------|-------------|
| **Smart Device Matching** | 3-level algorithm prevents duplicate boxes |
| **Connection Colors** | Softer color palette for visual clarity |
| **Zone Lines** | Zones rendered as thick lines (5px, 35% opacity) |
| **Star Topology** | Devices connect to zone centroid |
| **Data Validation** | SHA-256 checksum for imports |

### v3.5.035-037 - February 3-4, 2026

#### 🔗 Centralized Data & UI
| Feature | Description |
|---------|-------------|
| **standardDeviceSort()** | Centralized sort function (rackId + order) |
| **NETWORK_ZONES** | Single source of truth for zone options |
| **IP + Zone Dropdown** | Network Zone selector with each IP field |
| **UI Styling** | Neutral slate color scheme |

### v3.5.005-013 - February 2, 2026

#### 📍 Location System & Quality
| Feature | Description |
|---------|-------------|
| **appState.sites[]** | Company sites array |
| **appState.locations[]** | Persistent locations with type |
| **Location Manager** | Create, rename, delete locations |
| **Sortable Links** | Links column in table is sortable |
| **Code Quality** | Removed dead code, deprecated APIs |
| **Accessibility** | ARIA labels and roles |

### v3.5.001 - February 2, 2026

#### ✨ Online Users
| Feature | Description |
|---------|-------------|
| **Real-time Counter** | Shows active users |
| **Color Coding** | Green = viewers, Amber = editor |
| **Heartbeat** | 30-second ping for presence |

---

## 3. ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | HTML5 + Tailwind CSS 3.x | Local vendor file |
| **JavaScript** | ES6 Vanilla | No framework, 19,000+ lines |
| **Icons** | Custom SVG | Cisco-style topology icons |
| **Modals** | SweetAlert2 | Local vendor |
| **Excel** | SheetJS (XLSX) 0.18.5 | Local vendor |
| **Backend** | PHP 8.3 (Apache) | Production mode |
| **Backend Alt** | Node.js 16+ | Development mode |
| **Auth** | Session-based | PHP sessions with bcrypt |
| **Data** | JSON file | data/network_manager.json |
| **Remote Access** | Apache Guacamole | Docker on port 8080 |

### 3.2 File Structure

\`\`\`
Matrix/
├── index.html              # Main application (SPA)
├── server.js               # Node.js server (development)
├── data.php                # PHP API endpoint (production)
├── deploy.sh               # Deployment script
├── package.json            # Node dependencies
│
├── api/
│   ├── auth.php            # Authentication API (95 lines)
│   ├── editlock.php        # Multi-user lock API (164 lines)
│   ├── guacamole.php       # Guacamole proxy API (242 lines)
│   ├── guacamole-config.php # Config endpoint (39 lines)
│   ├── guacamole-test.php  # Diagnostic tool (195 lines)
│   ├── guacamole.js        # Node.js version (397 lines)
│   └── json-validator.js   # Node.js validator (286 lines)
│
├── config/
│   ├── config.php          # Server configuration
│   ├── guacamole.json      # Guacamole settings
│   └── json-schema.json    # Data validation schema
│
├── js/
│   ├── app.js              # Core application (4,816 lines)
│   ├── features.js         # Topology, export (4,678 lines)
│   ├── ui-updates.js       # UI rendering (2,806 lines)
│   ├── floorplan.js        # Floor plan module (1,187 lines)
│   ├── device-detail.js    # Device detail modal (826 lines)
│   ├── dashboard.js        # Dashboard charts (553 lines)
│   ├── json-validator.js   # Data validator (277 lines)
│   ├── editlock.js         # Edit lock client (228 lines)
│   └── auth.js             # Authentication (150+ lines)
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
├── scripts/
│   ├── audit-code.js       # Code audit tool
│   ├── audit-json.js       # JSON audit tool
│   └── update-version.sh   # Version updater
│
└── doc/
    ├── BLUEPRINT.md        # This file
    ├── README.md           # User guide
    ├── GUACAMOLE_SETUP.md  # Guacamole installation
    ├── ROOM_STRUCTURE.md   # Data structure docs
    └── [other docs...]     # Additional documentation
\`\`\`

### 3.3 Data Model

\`\`\`javascript
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
        ip2: "10.0.0.1",          // Secondary IP
        networkZone: "LAN",       // Network zone
        networkZone2: "MGMT",     // Secondary zone
        ports: 48,
        status: "active",
        links: ["https://...", "ssh://..."],
        notes: "Main core switch",
        order: 1,                 // Rack position
        manufacturer: "Cisco",
        model: "C9300-48P"
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
        notes: "Uplink to distribution",
        vlan: "100"
    }],
    
    rooms: [{
        id: "room-uuid",
        nickname: "Server Room",
        number: "01",             // Room number (sorting)
        polygon: [[x1,y1], [x2,y2], ...],
        color: "#3b82f6"
    }],
    
    sites: ["Sede Ivrea", "Filiale Torino"],
    
    locations: [{
        id: "loc-uuid",
        code: "DC01",
        name: "Data Center",
        type: "site|mapped|custom",
        roomRef: "room-uuid"      // if type=mapped
    }],
    
    // Metadata
    version: "3.6.025",
    lastModified: "2026-02-06T14:00:00Z",
    checksum: "sha256..."         // Data integrity
}
\`\`\`

---

## 4. MODULES

### 4.1 Core (app.js) - 4,816 lines

| Component | Purpose |
|-----------|---------|
| **State Management** | appState object with all data |
| **Toast Notifications** | Success, error, warning, info |
| **Debug Logging** | Conditional console output |
| **OnlineTracker** | Real-time user presence |
| **ActivityLog** | Action history tracking |
| **Import/Export** | JSON data handling with checksum |
| **Version Support** | Backward compatibility array |

### 4.2 Features (features.js) - 4,678 lines

| Component | Purpose |
|-----------|---------|
| **SVGTopology** | Interactive network diagram |
| **Cisco Icons** | 25+ device type SVG icons |
| **ConnectionStatus** | Badge rendering for states |
| **LocationManager** | Site/location management |
| **ExportDrawIO** | Draw.io XML export |
| **ExportExcel** | XLSX generation |
| **ExportPNG** | Topology image export |

### 4.3 UI Updates (ui-updates.js) - 2,806 lines

| Function | Purpose |
|----------|---------|
| updateUI() | Master UI refresh |
| updateDevicesList() | Device cards/table |
| updateConnectionsList() | Connections list |
| updateMatrix() | SVG connection matrix |
| getDevicesSortedBy() | Multi-column sorting |
| formatLabel() | Type label formatting |
| formatLocationLabel() | Location with room number |

### 4.4 Device Detail (device-detail.js) - 826 lines

| Function | Purpose |
|----------|---------|
| openDeviceDetail() | Open detail modal |
| openGuacamole() | Launch SSH/RDP/VNC session |
| renderPortMap() | VLAN-colored port grid |
| renderConnectionsList() | Device connections |
| renderVlanSummary() | VLAN usage summary |

### 4.5 Dashboard (dashboard.js) - 553 lines

| Function | Purpose |
|----------|---------|
| initDashboard() | Initialize charts |
| updateDashboardCharts() | Refresh all charts |
| createDeviceTypeChart() | Pie chart by type |
| createLocationChart() | Bar chart by location |
| createConnectionChart() | Connection statistics |

### 4.6 Floor Plan (floorplan.js) - 1,187 lines

| Function | Purpose |
|----------|---------|
| FloorPlan.init() | Initialize canvas |
| FloorPlan.getRooms() | Get all rooms |
| FloorPlan.setRooms() | Import rooms |
| FloorPlan.editRoom() | Room editing modal |
| FloorPlan.zoomToRoom() | Auto-zoom to room |
| FloorPlan.drawDevices() | Device placement |

### 4.7 Guacamole Proxy (guacamole.php) - 242 lines

| Function | Purpose |
|----------|---------|
| authenticate() | Get Guacamole token |
| findConnection() | Find existing connection |
| createConnection() | Create new connection |
| buildClientUrl() | Generate auto-login URL |

### 4.8 Auth (auth.js + auth.php)

| Function | Purpose |
|----------|---------|
| Auth.login() | User authentication |
| Auth.logout() | End session |
| Auth.isLoggedIn() | Check auth state |
| Rate limiting | 5 attempts/minute |

### 4.9 Edit Lock (editlock.js + editlock.php)

| Function | Purpose |
|----------|---------|
| EditLock.acquire() | Get edit lock |
| EditLock.release() | Release lock |
| EditLock.heartbeat() | Keep lock alive |

---

## 5. API ENDPOINTS

### 5.1 Data API (data.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /data.php | Load all data |
| POST | /data.php | Save all data |
| GET | /data.php?action=online | Get online users |

### 5.2 Auth API (api/auth.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth.php | Login/logout |
| GET | /api/auth.php?check=1 | Check session |

### 5.3 Edit Lock API (api/editlock.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | action=acquire | Get edit lock |
| POST | action=release | Release lock |
| POST | action=heartbeat | Keep alive |
| GET | action=status | Check status |

### 5.4 Guacamole API (api/guacamole.php)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | ?action=status | Check Guacamole connectivity |
| GET | ?action=health | Health check |
| POST | action=connect | Create/find connection, return URL |

**Request body for connect:**
\`\`\`json
{
    "action": "connect",
    "ip": "10.10.254.121",
    "protocol": "ssh",
    "deviceName": "Switch-01"
}
\`\`\`

**Response:**
\`\`\`json
{
    "success": true,
    "url": "http://server:8080/guacamole/#/client/...",
    "connection": {
        "identifier": "123",
        "name": "Switch-01 - 10.10.254.121 (SSH)",
        "protocol": "ssh",
        "hostname": "10.10.254.121"
    }
}
\`\`\`

---

## 6. DEVICE TYPES

| Type | Icon | Description |
|------|------|-------------|
| server | Server | Server/host |
| switch | Switch | Network switch |
| router | Router | Router |
| router_wifi | WiFi Router | WiFi router |
| firewall | Firewall | Firewall |
| access_point | AP | Wireless AP |
| wifi | WiFi | WiFi device |
| patch_panel | Panel | Patch panel |
| walljack | Jack | Wall jack |
| workstation | PC | Desktop PC |
| laptop | Laptop | Laptop |
| phone | Phone | IP Phone |
| ip_phone | Phone | IP Phone |
| printer | Printer | Printer |
| camera | Camera | IP Camera |
| storage | Storage | Storage |
| nas | NAS | NAS |
| ups | UPS | UPS |
| pdu | PDU | PDU |
| isp | ISP | ISP connection |
| modem | Modem | Modem |
| sensor | Sensor | Sensor |
| other | Other | Other |

---

## 7. CONNECTION TYPES

| Type | Color | Description |
|------|-------|-------------|
| lan | Blue | Standard LAN |
| wan | Red | WAN link |
| trunk | Green | Trunk/uplink |
| dmz | Orange | DMZ segment |
| management | Purple | Management VLAN |
| fiber | Cyan | Fiber optic |
| backup | Gray | Backup link |
| walljack | Brown | Wall port |
| external | Pink | External link |

---

## 8. GUACAMOLE INTEGRATION

### 8.1 Overview
Apache Guacamole provides browser-based remote access to devices via:
- **SSH** (port 22) - Terminal access
- **Telnet** (port 23) - Legacy terminal
- **RDP** (port 3389) - Windows Remote Desktop
- **VNC** (port 5900) - VNC viewer

### 8.2 Architecture
\`\`\`
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Matrix Web    │────▶│ guacamole.php   │────▶│   Guacamole     │
│   (Browser)     │     │   (API Proxy)   │     │   (Docker)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  guacd daemon   │
                                                │  SSH/RDP/VNC    │
                                                └─────────────────┘
\`\`\`

### 8.3 Configuration (config/guacamole.json)
\`\`\`json
{
    "enabled": true,
    "server": {
        "baseUrl": "http://10.10.225.103:8080/guacamole"
    },
    "credentials": {
        "username": "tiesse",
        "password": "tiesseadm"
    },
    "defaults": {
        "ssh": {
            "port": 22,
            "colorScheme": "green-black",
            "fontSize": 14,
            "terminalWidth": 100,
            "terminalHeight": 30
        },
        "rdp": {
            "port": 3389,
            "security": "any",
            "ignoreCert": true,
            "width": 1920,
            "height": 1080
        }
    }
}
\`\`\`

### 8.4 Window Sizes

| Protocol | Window Size | Terminal |
|----------|-------------|----------|
| SSH | 850 x 550 | 100 x 30 chars |
| Telnet | 850 x 550 | 100 x 30 chars |
| RDP | 1024 x 768 | N/A |
| VNC | 1024 x 768 | N/A |

---

## 9. EXPORT FORMATS

### 9.1 JSON Export
- Complete data backup with SHA-256 checksum
- Includes: devices, connections, rooms, sites, locations
- Version and timestamp included

### 9.2 Excel Export
- 4 worksheets: Devices, Connections, Matrix, Rooms
- Filterable columns
- Color-coded status

### 9.3 PNG Export
- High-resolution topology image
- SVG-to-canvas conversion

### 9.4 Draw.io Export
- XML format compatible with Draw.io
- Preserves device positions
- Connection routing

---

## 10. SECURITY

### 10.1 Authentication
- Session-based login with PHP sessions
- Password hashed with bcrypt (PHP/bcryptjs)
- Rate limiting (5 attempts/minute)
- Session timeout (30 minutes)

### 10.2 Multi-User Locking
- Single editor at a time
- Lock timeout: 5 minutes
- Heartbeat: 60 seconds
- Auto-release on logout

### 10.3 Data Protection
- XSS prevention (escapeHtml)
- Path traversal protection
- Backup before destructive operations
- JSON validation on import

### 10.4 Guacamole Security
- Admin user for API operations
- Token-based auto-login
- All remote access proxied through guacd

---

## 11. DEPLOYMENT

### 11.1 Requirements
- **Apache 2.4+** with PHP 8.1+
- OR **Node.js 16+** (development only)
- Write permissions on data/ directory
- Modern browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- **Optional:** Docker for Guacamole

### 11.2 Installation
\`\`\`bash
# Clone or copy files to web root
cp -r Matrix/ /var/www/html/matrix/

# Set permissions
chmod 755 /var/www/html/matrix/
chmod 777 /var/www/html/matrix/data/

# Configure credentials
# Edit config/config.php for auth
# Edit config/guacamole.json for remote access

# (Optional) Setup cron for backups
crontab -e
# 0 2 * * 0 /var/www/html/matrix/backup/backup.sh weekly
# 0 3 1 * * /var/www/html/matrix/backup/backup.sh monthly
\`\`\`

### 11.3 Guacamole Setup
See doc/GUACAMOLE_SETUP.md for detailed Docker installation.

---

## 12. KNOWN LIMITATIONS

1. **Single JSON file** - Not suitable for very large networks (1000+ devices)
2. **No real-time sync** - Changes require manual save
3. **Manual data entry** - No auto-discovery of network devices
4. **Single editor** - Only one user can edit at a time
5. **Guacamole admin access** - Users can access Guacamole admin panel via Home button

---

## 13. CODE METRICS

| File | Lines | Purpose |
|------|-------|---------|
| app.js | 4,816 | Core application |
| features.js | 4,678 | Topology, export |
| ui-updates.js | 2,806 | UI rendering |
| floorplan.js | 1,187 | Floor plan |
| device-detail.js | 826 | Device modal |
| dashboard.js | 553 | Charts |
| server.js | 891 | Node.js server |
| **Total JS** | **~16,000** | |
| guacamole.php | 242 | API proxy |
| data.php | 292 | Data API |
| auth.php | 95 | Auth API |
| editlock.php | 164 | Lock API |
| **Total PHP** | **~800** | |
| **Grand Total** | **~19,000** | Lines of code |

---

## 14. FUTURE ROADMAP

- [ ] WebSocket real-time sync
- [ ] SQLite backend option
- [ ] SNMP device import
- [ ] Network diagram auto-layout
- [ ] Multi-language support (i18n)
- [ ] Dark mode theme
- [ ] PDF report generation
- [ ] VLAN visualization improvements
- [x] ~~Guacamole integration~~ (v3.6.025)
- [x] ~~Device detail modal~~ (v3.6.003)
- [x] ~~Dashboard charts~~ (v3.6.003)
- [x] ~~JSON validation~~ (v3.6.005)

---

**Document Version:** 3.6.025  
**Last Updated:** February 6, 2026  
**Total Project Lines:** ~19,000
