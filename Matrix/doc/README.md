# TIESSE Matrix Network

Web-based network infrastructure documentation and visualization tool.

**Version:** 3.6.028  
**Date:** February 9, 2026  
**Environment:** Ubuntu 24.04 LTS + Node.js 16+ (or Apache 2.4 + PHP 8.3)

---

## 📋 What is Matrix Network?

TIESSE Matrix Network is a **documentation system** for corporate network infrastructure. It allows IT teams to:

- 📱 **Register devices** - Routers, switches, servers, access points, PCs, printers, cameras, UPS, etc.
- ⚡ **Document connections** - Map which port connects to what device
- 🗺️ **Visualize topology** - Interactive network diagram with Cisco-style icons
- 🔲 **Network Zones** - Group devices by zone (DMZ, Backbone, LAN, WAN) with visual boundaries
- 📊 **View connection matrix** - Grid showing all device-to-device connections
- 🏢 **Map floor plans** - Associate devices with physical rooms
- 💾 **Export data** - Excel, JSON backup, PNG images, Draw.io diagrams
- 🔗 **Quick access links** - SSH, RDP, VNC, Telnet direct links to devices

### ⚠️ Important Note

This is a **documentation tool**, NOT a monitoring system:
- Devices are added **manually** (no auto-discovery)
- Status is set **manually** (no SNMP/ping checks)
- Data is saved **manually** (click "Save Now" button)

---

## 🆕 What's New in v3.6.028

### 🎯 v3.6.028 - Data Integrity & Normalization
- **Port Normalization**: NEW `normalizePortName()` pads eth1→eth01, preserves GbE/SFP/WAN prefixes
- **Bug Fix**: `saveDevice()` now correctly saves `ports` and `links` fields
- **Bug Fix**: `saveConnection()` normalizes port names on save
- **Bug Fix**: `importData()` now calls `normalizeDataCase()` after import
- **Data Cleanup**: 79 ports + 3 connection ports fixed, UUIDs on all 93 connections
- **Doc Consolidation**: Merged duplicate docs, updated all line counts (17,742 total JS)
- **Verification**: 12-point audit + SHA-256 roundtrip = ZERO ERRORS

### 📦 v3.6.026 - Cleanup & Consolidation (Previous)
- **UI Stability**: Fixed critical Promise errors in data loading
- **Room Structure**: Complete 21-room mapping with FloorPlan improvements
- **Endpoint Optimization**: Absolute path routing for Node.js/Apache compatibility
- **Error Handling**: Enhanced try-catch blocks for data migrations
- **Device Management**: Smart device matching (29 hidden devices fully validated)
- **JSON Validation System**: 273 lines of validation protecting data integrity
- **Data Consolidation**: Deprecated field detection + automatic field merging

---

## 🚀 Quick Start

### Option 1: Node.js Server (Development)
```bash
cd Matrix/
npm install  # If needed: npm install bcrypt
node server.js
# Open: http://localhost:3000
```

### Option 2: Apache + PHP (Production)
```bash
# Copy to web root
sudo cp -r Matrix/ /var/www/html/matrix/

# Set permissions
sudo chown -R www-data:www-data /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/data/
sudo chmod 644 /var/www/html/matrix/data/*.json

# Access: http://your-server/matrix/
```

---

## 📁 File Structure

```
Matrix/
├── index.html                  # Single-page application
├── server.js                   # Node.js development server
├── data.php                    # PHP API endpoint
├── package.json                # Dependencies (bcrypt, path, fs)
│
├── js/                         # Application logic
│   ├── app.js                  # Core (4887 lines) - app state, data load, device search
│   ├── auth.js                 # Authentication & session management
│   ├── ui-updates.js           # UI rendering engine
│   ├── features.js             # Topology, export, protocol links
│   ├── floorplan.js            # Floor plan module (rooms, polygons)
│   ├── dashboard.js            # Statistics & charts
│   ├── device-detail.js        # Device modal UI
│   ├── json-validator.js       # Import/export validation (273 lines)
│   ├── editlock.js             # Multi-user edit lock (5 min timeout)
│   └── icons.js                # Cisco-style SVG icon generation
│
├── css/
│   └── styles.css              # Tailwind + custom styles (43.1 KB)
│
├── assets/
│   ├── planta.png              # Floor plan background image
│   ├── logoTiesse.png          # Company logo
│   └── vendor/                 # Libraries (Tailwind, SweetAlert2, Chart.js, XLSX)
│
├── data/
│   ├── network_manager.json    # Main data storage (~197 KB)
│   └── online_users.json       # Active users tracker
│
├── api/                        # PHP endpoints (optional)
│   ├── auth.php                # Authentication
│   └── editlock.php            # Multi-user locks
│
├── config/
│   ├── config.php              # Server configuration
│   └── guacamole.json          # Guacamole proxy settings
│
├── backup/
│   ├── backup.sh               # Automated backup script
│   └── crontab.txt             # Cron schedule example
│
├── scripts/
│   ├── update-version.sh       # Version updater
│   └── deploy.sh               # Deployment automation
│
├── doc/
│   ├── README.md               # This file (complete guide)
│   ├── BLUEPRINT.md            # Technical specification
│   ├── QUICK_REFERENCE.md      # Quick command reference
│   ├── GUACAMOLE_SETUP.md      # Guacamole proxy configuration
│   ├── VALIDATION_TESTING_GUIDE.md  # Testing data integrity
│   └── ROOM_STRUCTURE.md       # JSON data schema
│
└── tests/
    ├── e2e-tests.js            # End-to-end tests
    └── frontend-tests.js       # UI tests
```

---

## 🔐 Authentication & Permissions

### 👁️ View Mode (No Login Required)
- View all devices and connections
- Navigate topology, matrix, floor plan
- Export to Excel, JSON, PNG
- Print reports
- Use search and filters

### ✏️ Edit Mode (Login Required)
- Add, edit, delete devices and connections
- Manage locations and rooms
- Edit floor plan
- Import JSON data
- Clear all data

### 🔒 Multi-User Edit Lock
- **Only ONE user can edit** at a time (5-minute timeout)
- If locked, see who's editing and wait time
- Lock releases automatically on logout

---

## 📱 Device Types

| Type | Icon | Description |
|------|------|-------------|
| `server` | 🖥️ | Server / Host machine |
| `switch` | 🔀 | Network Switch (L2/L3) |
| `router` | 🌐 | Router / Gateway |
| `router_wifi` | 📶 | WiFi Router |
| `firewall` | 🛡️ | Firewall / UTM |
| `access_point` | 📡 | Wireless Access Point |
| `patch` | 🔲 | Patch Panel |
| `walljack` | 🔌 | Wall Jack / Network outlet |
| `workstation` | 💻 | Desktop PC |
| `laptop` | 💼 | Laptop / Notebook |
| `printer` | 🖨️ | Printer / MFP |
| `camera` | 📷 | IP Camera / CCTV |
| `tv` | 📺 | TV / Display / Monitor |
| `ups` | 🔋 | UPS / Battery backup |
| `ip_phone` | 📞 | IP Phone / VoIP |
| `isp` | 🌍 | ISP Router / Modem |
| `other` | ❓ | Other device type |

---

## 🔲 Network Zones

Devices can be grouped visually in the Topology view:

| Zone | Color | CIDR Example |
|------|-------|--------------|
| DMZ | 🔴 Red | 172.24.254.0/24 |
| Backbone | 🟠 Amber | 10.10.0.0/16 |
| LAN | 🔵 Blue | 10.10.100.0/24 |
| WAN | 🟢 Green | external |
| Cloud | 🟣 Indigo | cloud.example.com |
| Management | 💜 Purple | 10.10.254.0/24 |

Custom zones can be created with any name.

---

## ⚡ Connection Types

| Type | Color | Best For |
|------|-------|----------|
| `lan` | 🔵 Blue | Standard LAN connections |
| `wan` | 🔴 Red | Internet / WAN links |
| `trunk` | 🟢 Green | Switch-to-switch trunks |
| `dmz` | 🟠 Orange | DMZ segment |
| `management` | 🟣 Purple | VLAN management |
| `walljack` | ⚫ Gray | Wall outlets |
| `other` | ⚪ White | Custom connections |

---

## 🔗 Quick Access Links

Devices can have direct access links:

| Protocol | Behavior |
|----------|----------|
| SSH | Opens SSH client + copies address |
| RDP | Downloads `.rdp` file |
| VNC | Opens VNC viewer + copies address |
| Telnet | Opens Telnet + copies address |
| HTTP/HTTPS | Opens in browser tab |
| SMB/NFS | Copies path to clipboard |

---

## 💾 Export & Import

### Export Formats

| Format | Contents | Use Case |
|--------|----------|----------|
| **Excel** | Devices, Connections, Matrix, Rooms | Reporting, offline analysis |
| **JSON** | Complete data + SHA-256 checksum | Backup, data transfer |
| **PNG** | Network topology diagram | Documentation, presentations |
| **Draw.io** | Editable network diagram | Further customization |

### Import Formats

| Format | Validation | Merge Strategy |
|--------|-----------|-----------------|
| **JSON** | Full schema validation | Smart duplicate detection |
| **Excel** | 4-sheet structure check | Column mapping verification |

**Data Integrity Checks:**
- SHA-256 checksum verification
- Schema validation (devices, connections, rooms, locations)
- Deprecated field detection (zone, zoneIP for devices)
- Automatic field consolidation (color→cableColor, rack→rackId)
- Connection orphan detection

---

## 🏢 Floor Plan

Visualize devices on a building map:

### How to Use:
1. Click **🏢 Floor Plan** tab
2. Click **+ Room** to add a room
3. Click map corners to draw room polygon (double-click to finish)
4. Set device's **Location** = room's **Nickname**
5. Devices appear automatically in their rooms

### Current Structure:
```
21 Rooms mapped:
└─ Room 0: Sala Server
└─ Room 1-19: Various departments
└─ Room 20: BigOne (Testing Lab)

Rooms with polygons fully implemented and validated
```

---

## 🗺️ Topology View

Interactive network diagram with multiple viewing options:

### Features:
- **Drag & drop** to reposition devices
- **Zoom** with mouse wheel
- **Pan** by dragging background
- **Layout algorithms**: Circle, Grid, Hierarchical, Force
- **Filters**: By location, device type, status
- **Export**: PNG (high-resolution), Draw.io XML

### Network Zones:
Zones appear as connecting lines from devices to zone centroid, with color coding by type.

---

## 📊 Matrix View

Grid showing connections between all devices:

- **Rows**: Source devices (FROM)
- **Columns**: Destination devices (TO)
- **Cells**: Color-coded by connection type
- **Filterable**: By location, status, connection type
- **Clickable**: View connection details

---

## ⚙️ Server Configuration

### Node.js Development

```bash
npm install bcrypt
node server.js
# Listens on port 3000
```

### Apache + PHP Production

```bash
# Enable mod_rewrite for clean URLs
sudo a2enmod rewrite
sudo systemctl restart apache2

# Configure in config/config.php:
define('AUTH_USER', 'admin');
define('AUTH_PASSWORD', 'secure_password');
```

### Environment Variables (.env)

```
PORT=3000
DATA_FILE=data/network_manager.json
DEBUG_MODE=false
CORS_ORIGINS=http://localhost:3000
```

---

## 🌐 Browser Support

| Browser | Minimum | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Opera | 76+ | ✅ Full |
| IE | Any | ❌ Not supported |

---

## ⚠️ Known Limitations & Notes

1. **JSON file size** - Single file; 500+ devices may impact performance
2. **Manual save** - No auto-save, must click "Save Now"
3. **No auto-discovery** - Manual data entry only
4. **Single editor** - Edit lock allows only one user at a time
5. **Devices without IPs** - 32 devices without addresses (by design)
6. **Protocol handlers** - Depend on system configuration

---

## 🆘 Troubleshooting

### Application won't load
- Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Check Node.js is running: `curl http://localhost:3000`
- Check server logs: `node server.js` output

### Save fails
- Check file permissions: `sudo chmod 755 data/`
- Check file ownership: `sudo chown www-data:www-data data/`
- Verify disk space: `df -h`

### SSH/RDP links don't open
- Protocol handlers are OS-dependent
- Address is copied to clipboard - paste manually
- For RDP: downloaded `.rdp` file must be opened with RDP client

### Floor plan devices missing
- Verify device **Location** matches room **Nickname** exactly (case-insensitive)
- Check room is correctly drawn on map
- Save and reload page

### Import fails
- Validate JSON format with Python: `python3 -m json.tool file.json`
- Check for deprecated fields: zone, zoneIP (devices), color (connections)
- roomId in connections is valid (used for floor plan mapping)
- Ensure Excel has 4 sheets: Devices, Connections, Matrix, Rooms

---

## 📚 Additional Documentation

- [BLUEPRINT.md](BLUEPRINT.md) - Complete technical specification & architecture
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command & endpoint reference
- [GUACAMOLE_SETUP.md](GUACAMOLE_SETUP.md) - Remote access proxy configuration
- [VALIDATION_TESTING_GUIDE.md](VALIDATION_TESTING_GUIDE.md) - Data integrity testing procedures
- [ROOM_STRUCTURE.md](ROOM_STRUCTURE.md) - Detailed JSON schema documentation

---

## 📊 System Statistics (Current Data)

```
Devices:         101 total
├─ Active:        97
└─ Disabled:       4

Connections:      93 documented
├─ LAN:            72
├─ Wallport:       14
├─ Trunk:           4
├─ WAN:             2
└─ Other:           1

Locations:        25
├─ Rooms:          21 (mapped)
└─ Custom:          4

Rooms:            21 (with floor plan polygons)
Sites:             1
```

---

## 📞 Support & Feedback

For issues or feature requests:

1. Review this README and related docs
2. Check **Help** tab in application
3. Consult detailed documentation in `/doc/`
4. Enable DEBUG_MODE in server configuration for detailed logs

---

**Version:** 3.6.028  
**Last Updated:** February 8, 2026  
**Status:** ✅ Production Ready  
**© Tiesse S.P.A.**
