# TIESSE Matrix Network

Web-based network infrastructure documentation and visualization tool.

**Version:** 3.5.013  
**Date:** February 2, 2026  
**Environment:** Ubuntu 24.04 LTS + Apache 2.4 + PHP 8.3 (or Node.js 16+)

---

## 📋 What is Matrix Network?

TIESSE Matrix Network is a **documentation system** for corporate network infrastructure. It allows IT teams to:

- 📱 **Register devices** - Routers, switches, servers, access points, PCs, printers, cameras, UPS, etc.
- ⚡ **Document connections** - Map which port connects to what device
- 🗺️ **Visualize topology** - Interactive network diagram with Cisco-style icons
- 📊 **View connection matrix** - Grid showing all device-to-device connections
- 🏢 **Map floor plans** - Associate devices with physical rooms
- 💾 **Export data** - Excel, JSON backup, PNG images, Draw.io diagrams

### ⚠️ Important Note

This is a **documentation tool**, NOT a monitoring system:
- Devices are added **manually** (no auto-discovery)
- Status is set **manually** (no SNMP/ping checks)
- Data is saved **manually** (click "Save Now" button)

---

## 🆕 What's New in v3.5.013

### 🔗 Links Column Sorting
- 🔗 Links column in Devices table is now sortable
- Click header to sort by number of connections

### 🔧 Code Quality (v3.5.011)
- Removed dead code functions
- Fixed deprecated `.substr()` API
- Implemented auto-zoom to room in Floor Plan
- Added localStorage quota error handling
- Added ARIA accessibility labels

### 📶 WiFi AP Icon (v3.5.010)
- Wireless devices (WiFi, AP) show 📶 instead of ⚠ warning
- Cyan background for wireless devices without connections

### 📍 Location System (v3.5.005-008)
- Persistent locations with types: Site 🏢, Mapped 📍, Custom 🪧
- Location Manager to create, rename, delete locations
- Auto-migration from old data format

### ✨ Online Users (v3.5.001)
- Real-time counter of users viewing the system
- Color-coded: Green = viewers, Amber = editor active

---

## 🚀 Quick Start

### Option 1: Node.js Server
```bash
cd Matrix/
node server.js
# Open: http://localhost:3000
```

### Option 2: Apache + PHP
```bash
# Copy to web root
cp -r Matrix/ /var/www/html/matrix/

# Set permissions
chmod 777 /var/www/html/matrix/data/

# Access via browser
```

---

## 📁 File Structure

```
Matrix/
├── index.html          # Main application
├── server.js           # Node.js server
├── data.php            # PHP API
├── js/
│   ├── app.js          # Core logic
│   ├── auth.js         # Authentication
│   ├── features.js     # Topology, export
│   ├── ui-updates.js   # UI rendering
│   ├── floorplan.js    # Floor plan
│   └── editlock.js     # Multi-user lock
├── css/styles.css      # Custom styles
├── data/
│   └── network_manager.json  # Data storage
└── doc/
    ├── BLUEPRINT.md    # Technical spec
    └── README.md       # This file
```

---

## 🔐 Authentication

### View Mode (Guest)
- View all data
- Export to Excel/JSON/PNG
- Print reports

### Edit Mode (Login Required)
- Add/edit/delete devices
- Add/edit/delete connections
- Manage floor plan rooms
- Import JSON data
- Clear all data

### Multi-User Lock
- Only one editor at a time
- Lock expires after 5 minutes of inactivity
- Always logout when done!

---

## 📱 Device Types

| Type | Description |
|------|-------------|
| `server` | Server/Host |
| `switch` | Network Switch |
| `router` | Router |
| `router_wifi` | WiFi Router |
| `firewall` | Firewall |
| `access_point` | Wireless AP |
| `patch_panel` | Patch Panel |
| `walljack` | Wall Jack |
| `workstation` | Desktop PC |
| `laptop` | Laptop |
| `printer` | Printer |
| `camera` | IP Camera |
| `ups` | UPS |
| `other` | Other device |

---

## ⚡ Connection Types

| Type | Color | Use Case |
|------|-------|----------|
| `lan` | Blue | Standard LAN |
| `wan` | Red | WAN link |
| `trunk` | Green | Uplink/trunk |
| `dmz` | Orange | DMZ segment |
| `management` | Purple | Management VLAN |
| `fiber` | Cyan | Fiber optic |
| `walljack` | Brown | Wall port |

---

## 💾 Export Options

| Format | Description |
|--------|-------------|
| **Excel** | 4 sheets: Devices, Connections, Matrix, Rooms |
| **JSON** | Complete backup with SHA-256 checksum |
| **PNG** | High-resolution topology image |
| **Draw.io** | XML diagram for editing |

---

## 🏢 Floor Plan

1. Click **Floor Plan** tab
2. Click **+ Room** to add a room
3. Draw polygon by clicking corners
4. Set room nickname
5. Devices with matching Location appear in room

### Room-Device Association
- Set device's **Location** to match room's **Nickname**
- Example: Device location = "Server Room" → appears in room with nickname "Server Room"

---

## ⚙️ Configuration

### Environment Variables (.env)
```
AUTH_USER=admin
AUTH_PASSWORD=your_secure_password
```

### Backup Schedule (crontab)
```bash
# Weekly backup (Sundays 2:00 AM)
0 2 * * 0 /var/www/html/matrix/backup/backup.sh weekly

# Monthly backup (1st of month 3:00 AM)
0 3 1 * * /var/www/html/matrix/backup/backup.sh monthly
```

---

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ |
| Firefox | 88+ | ✅ |
| Edge | 90+ | ✅ |
| Safari | 14+ | ✅ |
| IE | Any | ❌ |

---

## ⚠️ Limitations

1. **Single JSON file** - Not suitable for 1000+ devices
2. **Manual save** - No auto-save, click "Save Now"
3. **Manual data** - No network auto-discovery
4. **Single editor** - One user edits at a time
5. **Memory-only logs** - Activity log not persisted

---

## 📚 Documentation

- [BLUEPRINT.md](BLUEPRINT.md) - Full technical specification
- [ROOM_STRUCTURE.md](ROOM_STRUCTURE.md) - Data structure details

---

## 📝 Changelog

See [UPDATE_NOTES.txt](../UPDATE_NOTES.txt) for full version history.

---

**Version:** 3.5.013  
**Last Updated:** February 2, 2026  
**© Tiesse S.P.A.**
