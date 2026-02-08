# ⚡ Quick Reference - TIESSE Matrix Network

**Version:** 3.6.028  
**Date:** February 9, 2026

---

## 🚀 Quick Start

### Node.js Development
```bash
cd Matrix/
npm install    # Install dependencies
node server.js # Start server (port 3000)
# Visit: http://localhost:3000
```

### Apache + PHP
```bash
sudo cp -r Matrix/ /var/www/html/matrix/
sudo chown -R www-data:www-data /var/www/html/matrix/
sudo chmod 755 /var/www/html/matrix/data/
# Visit: http://your-server/matrix/
```

---

## 📡 API Endpoints

### GET /data
Retrieve all network data (JSON format)

**Response:**
```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "sites": [...],
  "locations": [...],
  "version": "3.6.028",
  "checksum": "sha256hash"
}
```

### POST /data
Save network data with validation

**Request Body:**
```json
{
  "action": "save",
  "data": {
    "devices": [...],
    "connections": [...],
    ... (same as GET response)
  }
}
```

### GET /data?action=online
Get active users currently viewing/editing

**Response:**
```json
{
  "viewers": 3,
  "editors": 1,
  "users": [
    {"name": "admin", "role": "editor", "lastActive": "2026-02-08T14:32:00Z"}
  ]
}
```

---

## 🔐 Authentication

### Login
**Endpoint:** POST `/api/auth.php`

```javascript
// JavaScript example
fetch('/api/auth.php', {
  method: 'POST',
  body: JSON.stringify({
    action: 'login',
    username: 'admin',
    password: 'secure_password'
  })
})
```

### Logout
```javascript
fetch('/api/auth.php', {
  method: 'POST',
  body: JSON.stringify({
    action: 'logout'
  })
})
```

### Check Session
```javascript
fetch('/api/auth.php?check=1')
  .then(r => r.json())
  .then(data => console.log(data.loggedIn))
```

---

## 🔒 Edit Lock (Multi-User)

### Acquire Lock
```javascript
fetch('/api/editlock.php', {
  method: 'POST',
  body: JSON.stringify({
    action: 'acquire',
    username: 'admin'
  })
}).then(r => r.json())
  .then(data => {
    if (data.success) {
      console.log('Edit mode enabled - 5 min timeout');
    } else {
      console.log('Locked by:', data.lockedBy);
    }
  })
```

### Release Lock
```javascript
fetch('/api/editlock.php', {
  method: 'POST',
  body: JSON.stringify({
    action: 'release'
  })
})
```

### Keep Lock Alive
```javascript
fetch('/api/editlock.php', {
  method: 'POST',
  body: JSON.stringify({
    action: 'heartbeat'
  })
})
```

---

## 📱 Device Types Reference

```
server          → Server / Host machine
switch          → Network Switch
router          → Router / Gateway
router_wifi     → WiFi Router
firewall        → Firewall / UTM
access_point    → Wireless AP
patch_panel     → Patch Panel
walljack        → Wall Jack / Outlet
workstation     → Desktop PC / Workstation
laptop          → Laptop / Notebook
ip_phone        → IP Phone / VoIP
printer         → Printer / Multifunction
camera          → IP Camera / CCTV
ups             → UPS / Battery backup
isp             → ISP Router / Modem
other           → Other device type
```

---

## 🔌 Connection Types & Colors

```
lan             → Blue (#3b82f6)      - Standard LAN
wan             → Red (#ef4444)       - Internet/WAN link
trunk           → Green (#10b981)     - Switch-to-switch trunk
dmz             → Orange (#f97316)    - DMZ segment
management      → Purple (#a855f7)    - Management VLAN
walljack        → Gray (#6b7280)      - Wall outlet
other           → White (#f5f5f5)     - Custom
```

---

## 🧩 Data Model (Device Example)

```javascript
{
  id: "d-12345678",
  name: "SW-CORE-01",
  type: "switch",
  manufacturer: "Cisco",
  model: "C9300-48P",
  location: "Server Room",        // Room name or site
  group: "Rack-01",               // Rack name
  rackId: "A-01",                 // Rack position
  order: 1,                        // Order in rack
  ip: "192.168.1.1",              // Primary IP
  ip2: "10.0.0.1",                // Secondary IP (optional)
  networkZone: "LAN",             // Network zone
  networkZone2: "MGMT",           // Secondary zone (optional)
  ports: 48,                       // Number of ports
  status: "active",               // active / inactive
  links: [                        // Quick access links
    "https://192.168.1.1/admin",
    "ssh://192.168.1.1",
    "rdp://192.168.1.1"
  ],
  notes: "Main distribution switch",
  color: "#3b82f6"                // Optional custom color
}
```

---

## 🔗 Connection Model (Example)

```javascript
{
  id: "c-87654321",
  from: "d-12345678",            // From device ID
  fromPort: "24",                // Source port
  to: "d-87654321",              // To device ID
  toPort: "1",                   // Destination port
  type: "trunk",                 // Connection type
  status: "active",              // Status
  cableColor: "#3b82f6",         // Visual cable color
  vlan: "100",                   // VLAN ID (optional)
  notes: "Uplink to distribution"
}
```

---

## 📍 Room Model (Example)

```javascript
{
  id: "r-room-01",
  nickname: "Server Room",       // Display name
  number: "01",                  // Room number (for sorting)
  polygon: [                     // Canvas coordinates
    [100, 100],
    [500, 100],
    [500, 300],
    [100, 300]
  ],
  color: "#3b82f6"              // Display color
}
```

---

## 💾 Data Validation (json-validator.js)

### Validate Import
```javascript
const result = JSONValidator.validateImportData(jsonData);
if (result.valid) {
  // Safe to import
  applyImportedData(jsonData);
} else {
  // Show critical errors
  console.error(result.critical);
}
```

### Validate Before Export
```javascript
const result = JSONValidator.validateBeforeExport(appState);
if (!result.valid) {
  console.error('Export blocked:', result.critical);
}
```

### Check Field Deprecations
```javascript
// Old fields that are auto-migrated:
device.zone          → device.networkZone
device.zoneIP        → device.ip
device.roomId        → find matching room.nickname
connection.color     → connection.cableColor
```

---

## 📊 Validation Rules

### Devices Must Have:
- ✅ `id` (UUID)
- ✅ `name` (string, non-empty)
- ✅ `type` (from device types list)
- ✅ `location` (room or site name)
- ⚠️ `ip` (if status is "active")

### Connections Must Have:
- ✅ `id` (UUID format: c-xxxxxxxxxxxx)
- ✅ `from` (valid device ID - number)
- ✅ `to` (valid device ID or `null` for wallport/external types)
- ✅ `type` (from connection types list)
- ⚠️ `fromPort` & `toPort` (recommended)

### Optional Connection Fields:
- `roomId` (number|string|null) - maps wallport to room on floor plan
- `isWallJack` (boolean) - marks wall outlet connections
- `flagged` (boolean) - marks incomplete connections for review
- `flagReason` (string) - description of why flagged
- `externalDest` (string) - destination for external connections
- `cableMarker` (string) - physical cable label
- `cableColor` (string) - hex color code

### Forbidden Issues:
- ❌ Duplicate device IDs
- ❌ Connections to non-existent devices (orphans)
- ❌ Circular references
- ❌ Invalid field types

---

## 🎨 Color System (CSS Variables)

```css
/* Primary Colors */
--color-success: #10b981;    /* Green - Active, Connected */
--color-warning: #f59e0b;    /* Amber - Caution, Review */
--color-danger: #ef4444;     /* Red - Error, Offline */
--color-info: #3b82f6;       /* Blue - Information */

/* Device Type Colors */
--color-switch: #3b82f6;
--color-router: #1e40af;
--color-server: #7c3aed;
--color-access-point: #0891b2;
--color-firewall: #dc2626;

/* Zone Colors */
--color-zone-dmz: #ef4444;
--color-zone-backbone: #f97316;
--color-zone-lan: #3b82f6;
--color-zone-wan: #10b981;
```

---

## 📤 Export Formats

### JSON Export
- Complete data backup
- Includes SHA-256 checksum
- Can re-import to restore
- Size: ~200KB typical

**File Format:** `network_manager_YYYY-MM-DD.json`

### Excel Export
- 4 sheets: Devices, Connections, Matrix, Rooms
- Filterable columns
- Color-coded status
- Compatible with vlookup formulas

**File Format:** `network_manager_YYYY-MM-DD.xlsx`

### PNG Export
- Network topology image
- Zoom and pan friendly
- SVG-to-canvas rendering
- 1920x1080 default resolution

**File Format:** `topology_YYYY-MM-DD.png`

### Draw.io Export
- Editable diagram in Draw.io
- Preserves device positions
- XML format
- Can re-import modified version

**File Format:** `topology_YYYY-MM-DD.xml`

---

## 🖥️ JavaScript Module Reference

| Module | Key Functions | Purpose |
|--------|--------------|---------|
| app.js | serverLoad(), updateUI() | Core state mgmt |
| features.js | SVGTopology, ExportExcel | Topology & export |
| ui-updates.js | updateDevicesList() | UI rendering |
| floorplan.js | FloorPlan.init() | Floor plan canvas |
| device-detail.js | openDeviceDetail() | Device modal |
| dashboard.js | initDashboard() | Charts |
| json-validator.js | validateImportData() | Data validation |
| editlock.js | EditLock.acquire() | Multi-user lock |
| auth.js | Auth.login() | Authentication |

---

## 🔍 Search & Filter

### Device Search
- Search by: name, IP, location, group
- Case-insensitive match
- Real-time results

**Example:**
```javascript
appState.devices.filter(d => 
  d.name.includes('SW') || d.ip.includes('192.168')
)
```

### Filter by Type
```javascript
appState.devices.filter(d => d.type === 'router')
```

### Filter by Location
```javascript
appState.devices.filter(d => d.location === 'Server Room')
```

---

## 📐 Matrix View

The Matrix shows connections in a grid format:

**Rows:** Source devices (FROM)  
**Columns:** Destination devices (TO)  
**Cell Colors:** By connection type

Click any cell to view connection details.

---

## 🏢 Floor Plan Tips

### Adding a Room
1. Click **+ Room**
2. Click points on map to draw polygon
3. Double-click to finish
4. Enter room name and number

### Placing Devices
- Set device's **Location** = room's **Nickname**
- Devices auto-appear in room (on page reload)
- Drag device icon to reposition

### Zoom & Pan
- Scroll to zoom
- Drag background to pan
- Double-click room to zoom to it

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Loading..." stuck | Hard refresh (Ctrl+Shift+R) or check /data endpoint |
| Save fails | Check data/ directory permissions (chmod 755) |
| Device missing | Verify location name matches room name exactly |
| Room empty | Ensure device's location matches room's nickname |
| Export blank | Verify appState has devices before export |

---

## 📈 Performance Tips

1. **Device Limit:** 500+ devices may slow topology rendering
2. **Connection Limit:** 1000+ connections may impact matrix view
3. **Room Polygons:** Keep under 50 points per room polygon
4. **Browser Cache:** Clear cache if UI acts strange

---

## 🔗 Useful Links

| Feature | URL |
|---------|-----|
| Data Export | index.html #export-tab |
| Data Import | Click any device to edit |
| Floor Plan | index.html #floorplan-tab |
| Topology | index.html #topology-tab |
| Matrix | index.html #matrix-tab |
| Dashboard | index.html #dashboard-tab |

---

## 💡 Developer Commands

### Load Data in Console
```javascript
// Get all devices
console.table(appState.devices);

// Get all connections  
console.table(appState.connections);

// Find device by name
appState.devices.find(d => d.name === 'SW-01');

// Count devices by type
appState.devices.reduce((acc, d) => 
  (acc[d.type] = (acc[d.type] || 0) + 1, acc), {})
```

### Debug Export
```javascript
// Test JSON export validation
JSONValidator.validateBeforeExport(appState);

// Check data checksum
console.log(appState.checksum);
```

---

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+R` | Hard refresh (clear cache) |
| `Ctrl+F` | Search devices |
| `ESC` | Close modals |
| `Enter` | Confirm dialog |
| `Tab` | Focus next field |

---

**For complete documentation, see:**
- 📖 README.md - User guide
- 🏗️ BLUEPRINT.md - Technical architecture
- 🧪 VALIDATION_TESTING_GUIDE.md - Testing procedures
- 🗂️ ROOM_STRUCTURE.md - JSON schema reference

---

**System:** TIESSE Matrix Network v3.6.028  
**Status:** ✅ Production Ready

