# TIESSE Matrix Network

Web-based network infrastructure documentation and visualization tool.

**Version:** 3.5.028  
**Date:** February 3, 2026  
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
- 🔗 **Quick access links** - SSH, RDP, VNC, Telnet direct links to devices

### ⚠️ Important Note

This is a **documentation tool**, NOT a monitoring system:
- Devices are added **manually** (no auto-discovery)
- Status is set **manually** (no SNMP/ping checks)
- Data is saved **manually** (click "Save Now" button)

---

## 🆕 What's New in v3.5.028

### 🔗 Protocol Link Handlers (v3.5.024-028)
- **SSH links**: Click to open SSH client + address copied to clipboard
- **RDP links**: Downloads `.rdp` file (works on any browser)
- **VNC links**: Click to open VNC viewer + address copied
- **Telnet links**: Click to open Telnet + address copied
- Copy fallback for browsers without protocol handlers
- Toast notifications with usage instructions

### 🎯 UI Consistency (v3.5.027)
- Rear indicator (↩) position standardized
- Connection table matches Devices table display

### 🔧 Error Handling (v3.5.028)
- Added `.catch()` on all Promise chains
- Added `try/catch` on SSH/VNC/Telnet handlers
- Removed console.log from production code

### 📊 Previous Releases
- **v3.5.023**: Case normalization for rackId filtering
- **v3.5.014**: UI text standardization, emojis on all tables
- **v3.5.013**: Links column sorting, copy device feature
- **v3.5.010**: WiFi AP icon, accessibility improvements

---

## 🚀 Quick Start

### Option 1: Node.js Server (Development)
```bash
cd Matrix/
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

# Access via browser: http://your-server/matrix/
```

---

## 📁 File Structure

```
Matrix/
├── index.html              # Main application (single-page app)
├── server.js               # Node.js development server
├── data.php                # PHP API for Apache
├── js/
│   ├── app.js              # Core application logic (4300+ lines)
│   ├── auth.js             # Authentication system
│   ├── features.js         # Topology, export, protocol links
│   ├── ui-updates.js       # UI rendering engine
│   ├── floorplan.js        # Floor plan module
│   └── editlock.js         # Multi-user edit lock
├── css/
│   └── styles.css          # Custom styles (mostly Tailwind)
├── assets/
│   ├── planta.png          # Floor plan background image
│   ├── logoTiesse.png      # Company logo
│   └── vendor/             # Libraries (SweetAlert2, Tailwind, XLSX)
├── api/
│   ├── auth.php            # Authentication API
│   └── editlock.php        # Edit lock API
├── data/
│   ├── network_manager.json     # Main data storage
│   └── online_users.json        # Active users tracker
├── backup/
│   ├── backup.sh           # Backup script
│   └── crontab.txt         # Cron schedule example
├── config/
│   └── config.php          # Server configuration
└── doc/
    ├── README.md           # This file
    ├── BLUEPRINT.md        # Technical specification
    └── ROOM_STRUCTURE.md   # Data structure details
```

---

## 🔐 Authentication & Permissions

### 👁️ View Mode (No Login Required)
Anyone can:
- View all devices and connections
- Navigate topology, matrix, floor plan
- Export to Excel, JSON, PNG
- Print reports
- Use search and filters

### ✏️ Edit Mode (Login Required)
After logging in, you can:
- Add, edit, delete devices
- Add, edit, delete connections
- Manage locations
- Edit floor plan rooms
- Import JSON data
- Clear all data

### 🔒 Multi-User Edit Lock
- **Only ONE user can edit at a time**
- Lock expires after **5 minutes** of inactivity
- If someone else is editing, you'll see who and wait time
- **Always logout when done!** (releases the lock)

### 🔑 Default Credentials
```
Username: admin
Password: (configured in config.php)
```

---

## 📱 Device Types

| Icon | Type | Description |
|------|------|-------------|
| 🖥️ | `server` | Server / Host machine |
| 🔀 | `switch` | Network Switch (L2/L3) |
| 🌐 | `router` | Router / Gateway |
| 📶 | `router_wifi` | WiFi Router |
| 🛡️ | `firewall` | Firewall / UTM |
| 📡 | `access_point` | Wireless Access Point |
| 🔲 | `patch` | Patch Panel |
| 🔌 | `walljack` | Wall Jack / Network outlet |
| 💻 | `workstation` | Desktop PC |
| 💼 | `laptop` | Laptop / Notebook |
| 🖨️ | `printer` | Printer / MFP |
| 📷 | `camera` | IP Camera / CCTV |
| 🔋 | `ups` | UPS / Battery backup |
| 📞 | `ip_phone` | IP Phone / VoIP |
| 🌍 | `isp` | ISP Router / Modem |
| ❓ | `other` | Other device type |

---

## ⚡ Connection Types

| Type | Color | Description |
|------|-------|-------------|
| `lan` | 🔵 Blue | Standard LAN connection |
| `wan` | 🔴 Red | WAN / Internet link |
| `trunk` | 🟢 Green | Trunk / Uplink between switches |
| `dmz` | 🟠 Orange | DMZ segment |
| `management` | 🟣 Purple | Management VLAN |
| `fiber` | 🔷 Cyan | Fiber optic link |
| `walljack` | 🟤 Brown | Wall outlet connection |
| `voip` | 🟡 Yellow | Voice over IP |
| `serial` | ⚫ Gray | Serial / Console connection |
| `wifi` | 💜 Violet | Wireless connection |

---

## 🔗 Quick Access Links

Each device can have links for quick access:

| Type | Action | What Happens |
|------|--------|--------------|
| **SSH** | Click link | Opens SSH client + copies address |
| **RDP** | Click link | Downloads `.rdp` file |
| **VNC** | Click link | Opens VNC viewer + copies address |
| **Telnet** | Click link | Opens Telnet + copies address |
| **HTTP/HTTPS** | Click link | Opens in new browser tab |
| **SMB/NFS** | Click link | Copies path to clipboard |

💡 **Tip:** If protocol doesn't open, the address is already in your clipboard - just paste it!

---

## 💾 Export Options

| Format | Button | Description |
|--------|--------|-------------|
| **Excel** | 📊 Export | 4 sheets: Devices, Connections, Matrix, Rooms |
| **JSON** | 💾 Backup | Complete backup with SHA-256 checksum |
| **PNG** | In Topology | High-resolution network diagram image |
| **Draw.io** | In Topology | XML file for editing in draw.io |
| **Print** | 🖨️ Print | Filtered device/connection list |

---

## 🏢 Floor Plan

The Floor Plan feature lets you visualize devices on a building map:

### How to Use:
1. Click the **🏢 Floor Plan** tab
2. Click **+ Room** to add a room
3. Click on the map to draw corners of the room polygon
4. Double-click to finish the polygon
5. Give the room a **Nickname** (e.g., "Server Room")
6. Set device's **Location** field to match the room's nickname

### Room-Device Association
Devices appear in rooms automatically when:
```
Device Location = Room Nickname
```

Example:
- Room nickname: `Server Room`
- Device location: `Server Room`
- ✅ Device appears in that room on the floor plan!

---

## 🗺️ Topology View

Interactive network diagram showing all devices and connections:

### Features:
- **Drag & drop** devices to reposition
- **Zoom** with mouse wheel
- **Pan** by dragging background
- **Layout options**: Circle, Grid, Hierarchical, Force
- **Filter** by Group or Location
- **Click device** to see details
- **Export** to PNG or Draw.io

### Icons:
Devices display Cisco-style network icons based on their type.

---

## 📊 Matrix View

Grid showing all connections between devices:

- **Rows**: Source devices (FROM)
- **Columns**: Destination devices (TO)
- **Cells**: Connection type indicator
- **Click cell** to see connection details

---

## ⚙️ Server Configuration

### Apache + PHP Setup

1. **Enable PHP** (if not already):
```bash
sudo apt install php libapache2-mod-php
sudo a2enmod php
sudo systemctl restart apache2
```

2. **Configure permissions**:
```bash
sudo chown -R www-data:www-data /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/data/
```

3. **Edit config.php**:
```php
<?php
define('AUTH_USER', 'admin');
define('AUTH_PASSWORD', 'your_secure_password');
```

### Backup Schedule (crontab)

Add to crontab (`crontab -e`):
```bash
# Weekly backup (Sundays 2:00 AM)
0 2 * * 0 /var/www/html/matrix/backup/backup.sh weekly

# Monthly backup (1st of month 3:00 AM)
0 3 1 * * /var/www/html/matrix/backup/backup.sh monthly
```

---

## 🌐 Browser Support

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Opera | 76+ | ✅ Full support |
| IE | Any | ❌ Not supported |

---

## ⚠️ Known Limitations

1. **Single JSON file** - Performance may degrade with 500+ devices
2. **Manual save** - No auto-save, always click "Save Now"
3. **Manual data entry** - No network auto-discovery (SNMP, etc.)
4. **Single editor** - Only one user can edit at a time
5. **Session-only logs** - Activity log cleared on page refresh
6. **Protocol handlers** - Depend on user's system configuration

---

## 🆘 Troubleshooting

### "Save failed" error
- Check PHP permissions: `sudo chmod 755 data/`
- Check file ownership: `sudo chown www-data:www-data data/`
- Verify PHP is enabled: `php -v`

### SSH/RDP links don't open
- Protocol handlers depend on your system
- Address is copied to clipboard - paste manually
- For RDP: the `.rdp` file is downloaded, open it

### Login doesn't work
- Check `config/config.php` credentials
- Clear browser cache and cookies
- Check PHP error log: `/var/log/apache2/error.log`

### Floor plan doesn't show devices
- Ensure device's **Location** matches room's **Nickname** exactly
- Location matching is case-insensitive

---

## 📚 Additional Documentation

- [BLUEPRINT.md](BLUEPRINT.md) - Full technical specification
- [ROOM_STRUCTURE.md](ROOM_STRUCTURE.md) - Data structure details
- [UPDATE_NOTES.txt](../UPDATE_NOTES.txt) - Version changelog

---

## 📞 Support

For issues or questions:
1. Check the **Help** tab in the application
2. Review this README and BLUEPRINT.md
3. Check UPDATE_NOTES.txt for recent changes

---

**Version:** 3.5.028  
**Last Updated:** February 3, 2026  
**© Tiesse S.P.A.**
