# TIESSE Matrix Network - Technical Blueprint

**Version:** 3.1.5  
**Date:** January 28, 2026  
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

### 1.3 What's New in v3.1.5

#### Topology Position Persistence
| Enhancement | Description |
|-------------|-------------|
| **Position Persistence** | Custom device positions are now saved to localStorage |
| **Drag & Drop Memory** | Moving devices persists across tab switches and page reloads |
| **Layout Reset** | Changing layout clears custom positions (intentional reset) |
| **Improved UX** | No more losing topology arrangements when navigating |

#### Bug Fixes
| Issue | Description |
|-------|-------------|
| **WallJack Rack Filter** | Fixed WallJacks from other racks appearing when filtering by rack. Now only shows WallJacks from devices that belong to the filtered rack (not external/connected devices) |

### 1.4 What's New in v3.1.4

#### Code Quality
| Enhancement | Description |
|-------------|-------------|
| **Removed Duplicate Code** | Eliminated duplicate `requireAuth()` function definition |
| **Removed Dead Code** | Cleaned unused `debounceFilter` utility (now in app.js) |
| **Standardized Messages** | All Toast messages now in English for consistency |
| **Reduced File Size** | Removed ~20 lines of redundant code |

### 1.5 What's New in v3.1.3

#### Security Improvements
| Enhancement | Description |
|-------------|-------------|
| **XSS Protection** | Complete escapeHtml() sanitization in connections and devices tables |
| **Input Validation** | Enhanced import validation with type checking (number, string, array) |
| **Module Fallbacks** | Added escapeHtml fallback in features.js and ui-updates.js |
| **Auth Fallback** | requireAuth() with graceful fallback when Auth module unavailable |

#### Bug Fixes
| Issue | Description |
|-------|-------------|
| **c.color undefined** | Added connColor fallback: `c.color || config.connColors[c.type] || '#64748b'` |
| **Version Consistency** | All JS files now unified at v3.1.3 |

#### Performance
| Enhancement | Description |
|-------------|-------------|
| **Debounce Filters** | 250ms debounce on text input filters to reduce excessive updates |

### 1.4 What's New in v3.1.2

#### Legend Improvements
| Enhancement | Description |
|-------------|-------------|
| **WallJack Counting** | Legend now counts virtual WallJacks from connections (isWallJack=true) |
| **Off/Disabled Status** | Legend shows devices that are off/disabled with red badge and count |
| **Summary Footer** | Shows total devices, devices off, and wall jack count |

#### UI/UX Updates
| Enhancement | Description |
|-------------|-------------|
| **Topology Icon** | Changed from 🖧 to 🗺️ for better visibility |
| **Simplified Location Filter** | Removed duplicate icon and stats text from Actions bar |
| **Legend Button** | Added dedicated Legend button in Topology tab |

### 1.5 What's New in v3.0.x

#### v3.0.3 - Bug Fixes
| Issue | Description |
|-------|-------------|
| **Wall Jack Connections Missing** | Fixed rendering of WallJack/External connections in topology |
| **External Destination Support** | Added dedicated rendering for externalDest field |

#### v3.0.2 - Critical Fixes
| Issue | Description |
|-------|-------------|
| **Data Mutation Fix** | Fixed getFilteredConnections() mutating original data |
| **Memory Leak Fix** | Fixed document-level event listeners cleanup |
| **Error Handling** | Enhanced error handling with Toast messages |

#### v3.0.1 - SVG Topology
- SVG topology with Cisco-style icons
- Draw.io export functionality
- Fixed connection type/label fallbacks

#### v3.0.0 - Major Features
| Feature | Description |
|---------|-------------|
| **Location/Department** | Filter devices by physical location |
| **4 IP Address Fields** | Separate IP1-4 fields with mask support |
| **Device Links** | Multiple URLs/documentation links per device |
| **Network Topology Map** | Interactive visualization with pan/zoom |
| **Activity Logs** | Last 200 changes with type filters |
| **Authentication System** | Login required for edit mode |

---

## 2. ARCHITECTURE

### 2.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | HTML5 + Tailwind CSS | CDN |
| JavaScript | ES6 (Vanilla) | - |
| Icons | Custom SVG (Cisco-style) | - |
| Excel | SheetJS (XLSX) | 0.18.5 |
| Backend | Node.js | 14+ |
| Authentication | Session-based | - |
| Persistence | JSON file | - |
| Fallback | LocalStorage | - |

### 2.2 File Structure

```
intranet/
├── index.html              # Main page (1138 lines)
│                           # - Structural HTML
│                           # - Inline CSS (Tailwind)
│                           # - 6 tabs: Devices, Connections, Matrix, Topology, Logs, Help
│
├── server.js               # Node.js server (v3.1.3)
│                           # - No external dependencies
│                           # - Port 3000
│                           # - REST API for data persistence
│
├── data.php                # REST API (PHP - alternative)
│                           # - GET: returns data
│                           # - POST: saves data with validation
│
├── start-server.bat        # Windows quick-start script
│
├── api/
│   └── auth.php            # Authentication API (PHP)
│
├── config/
│   └── config.php          # Configuration (AUTH_USER, SESSION_TIMEOUT)
│
├── js/
│   ├── app.js              # Main logic (v3.1.3, ~2400 lines)
│   │                       # - Global state (appState)
│   │                       # - Device/Connection CRUD
│   │                       # - Persistence (localStorage + server)
│   │                       # - escapeHtml() utility
│   │                       # - JSON Import/Export
│   │                       # - requireAuth() with fallback
│   │                       # - Debounce timers for filters
│   │
│   ├── ui-updates.js       # UI Rendering (v3.1.3, ~1400 lines)
│   │                       # - Device list (cards/table)
│   │                       # - Connection matrix
│   │                       # - Connection table
│   │                       # - Excel export (3 sheets)
│   │                       # - XSS protection with escapeHtml
│   │                       # - c.color fallback handling
│   │
│   ├── features.js         # Extended Features (v3.1.3, ~3250 lines)
│   │                       # - ActivityLog module
│   │                       # - LocationFilter module
│   │                       # - SVGTopology module (Cisco icons)
│   │                       # - DrawioExport module
│   │                       # - showTopologyLegend() function
│   │                       # - escapeHtml fallback
│   │
│   └── auth.js             # Authentication module (v3.1.3, ~220 lines)
│                           # - Login/logout functions
│                           # - Session management
│
└── data/
    └── network_manager.json  # Persisted data
```

### 2.3 Version Summary

| File | Version | Lines | Description |
|------|---------|-------|-------------|
| index.html | 3.1.5 | ~1140 | Main HTML with 6 tabs |
| server.js | 3.1.5 | - | Node.js REST server |
| app.js | 3.1.5 | ~2380 | Core logic, CRUD, debounce, requireAuth |
| ui-updates.js | 3.1.5 | ~1380 | UI rendering, XSS protection |
| features.js | 3.1.5 | ~3305 | Extended features, topology position persistence |
| auth.js | 3.1.5 | ~220 | Authentication |

---

## 3. DATA MODEL

### 3.1 Main Structure

```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
```

### 3.2 Device Object

```json
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
  "links": [                        // Documentation links
    { "label": "Manual", "url": "https://..." }
  ],
  "service": "DHCP",                // Service (optional)
  "ports": [                        // Array of ports
    { "name": "GbE01", "type": "GbE", "status": "active" }
  ],
  "notes": "Core switch"            // Notes (optional)
}
```

### 3.3 Device Types

| Type | Label | Badge Color |
|------|-------|-------------|
| router | Router | #3498db (Blue) |
| switch | Switch | #2ecc71 (Green) |
| patch | Patch Panel | #f39c12 (Orange) |
| firewall | Firewall | #e74c3c (Red) |
| server | Server | #9b59b6 (Purple) |
| wifi | WiFi AP | #1abc9c (Teal) |
| router_wifi | Router WiFi | #16a085 (Dark Teal) |
| isp | ISP/WAN | #e67e22 (Orange) |
| modem | Modem | #e67e22 (Orange) |
| hub | Hub | #7f8c8d (Gray) |
| walljack | Wall Jack | #7f8c8d (Gray) |
| pc | PC/Desktop | #34495e (Dark) |
| ip_phone | IP Phone | #27ae60 (Green) |
| printer | Printer | #f1c40f (Yellow) |
| nas | NAS/Storage | #9b59b6 (Purple) |
| camera | IP Camera | #e74c3c (Red) |
| ups | UPS | #27ae60 (Green) |
| laptop | Laptop | #2c3e50 (Dark) |
| others | Others | #95a5a6 (Gray) |

### 3.4 Connection Object

```json
{
  "from": 1,                        // Source device ID
  "fromPort": "GbE01",              // Source port
  "to": 2,                          // Destination device ID (or null)
  "toPort": "GbE01",                // Destination port
  "externalDest": "ISP Router",     // External destination (if to=null)
  "isWallJack": false,              // true if destination is a wall jack
  "type": "trunk",                  // Connection type
  "color": "#22c55e",               // Connection color
  "status": "active",               // Status: active|disabled
  "cableMarker": "A1",              // Cable identifier
  "cableColor": "#3b82f6",          // Physical cable color
  "notes": "Uplink"                 // Notes (optional)
}
```

### 3.5 Connection Types

| Type | Color | Description |
|------|-------|-------------|
| lan | #22c55e (Green) | Local network |
| wan | #3b82f6 (Blue) | Wide area network |
| dmz | #f97316 (Orange) | DMZ segment |
| trunk | #8b5cf6 (Purple) | Trunk/aggregation |
| management | #06b6d4 (Cyan) | Management network |
| backup | #eab308 (Yellow) | Backup link |
| fiber | #ec4899 (Pink) | Fiber connection |
| wallport | #84cc16 (Lime) | Wall port |
| external | #6366f1 (Indigo) | External connection |
| other | #94a3b8 (Slate) | Other |

### 3.6 Activity Log Entry

```json
{
  "timestamp": "2026-01-26T10:30:00.000Z",
  "action": "add",                  // add|edit|delete|import|export|login|logout|clear
  "type": "device",                 // device|connection|import|export|auth|system
  "details": "SW-CORE-01 (switch) @ Server Room",
  "user": "tiesse"
}
```

---

## 4. MODULES

### 4.1 ActivityLog (features.js)

Tracks user actions for audit trail. Stores last 200 entries in localStorage.

| Function | Description |
|----------|-------------|
| `ActivityLog.init()` | Initialize, load from localStorage |
| `ActivityLog.add(action, type, details, user)` | Add new log entry |
| `ActivityLog.render()` | Render logs table with filter |
| `ActivityLog.clear()` | Clear all logs |
| `ActivityLog.export()` | Export logs as JSON file |

### 4.2 LocationFilter (features.js)

Filters devices and connections by location.

| Function | Description |
|----------|-------------|
| `LocationFilter.init()` | Initialize dropdown with locations |
| `LocationFilter.update()` | Update location list from devices |
| `LocationFilter.apply()` | Apply filter and refresh views |
| `filterByLocation()` | Global function for HTML onclick |

### 4.3 SVGTopology (features.js)

Interactive SVG-based network topology with Cisco-style icons.

| Function | Description |
|----------|-------------|
| `SVGTopology.init()` | Initialize SVG container |
| `SVGTopology.render()` | Render devices and connections |
| `SVGTopology.updateLayout(layout)` | Change layout type |
| `SVGTopology.fit()` | Fit view to content |
| `SVGTopology.exportPNG()` | Export as PNG image |
| `SVGTopology.getAllDeviceTypes()` | Get list of device types |
| `SVGTopology.getTypeInfo(type)` | Get type label/color info |
| `SVGTopology.getMiniIcon(type, size)` | Get mini SVG icon |

**Available Layouts:**
- Auto (hierarchical by network layer)
- Circle
- Grid
- Hierarchical

### 4.4 DrawioExport (features.js)

Exports network topology to Draw.io (.drawio) format.

| Function | Description |
|----------|-------------|
| `exportTopologyDrawio()` | Export topology as .drawio file |

### 4.5 Legend Modal (features.js)

Shows device type legend with counts and status.

| Function | Description |
|----------|-------------|
| `showTopologyLegend()` | Open legend modal with device counts |
| `closeLegendModal(event)` | Close legend modal |

**Legend Features:**
- Groups device types by category
- Shows count for each type
- Shows off/disabled devices with red badge
- Counts virtual WallJacks from connections
- Summary footer with totals

### 4.6 Auth (auth.js)

Handles user authentication.

| Function | Description |
|----------|-------------|
| `Auth.init()` | Check session on load |
| `Auth.login(username, password)` | Authenticate user |
| `Auth.logout()` | End session |
| `Auth.isAuthenticated()` | Check if logged in |
| `Auth.showLoginModal()` | Show login dialog |
| `Auth.hideLoginModal()` | Hide login dialog |

---

## 5. UI COMPONENTS

### 5.1 Tabs

| Tab | ID | Icon | Content |
|-----|----|----|---------|
| Devices | `tab-devices` | 📱 | Device form + list (cards/table) |
| Connections | `tab-active` | ⚡ | Connection form + list |
| Matrix | `tab-matrix` | 🔗 | Connection matrix (compact/detailed) |
| Topology | `tab-drawio` | 🗺️ | SVG topology with Cisco icons |
| Logs | `tab-logs` | 📜 | Activity log table |
| Help | `tab-help` | ❓ | Documentation |

### 5.2 Actions Bar

| Component | ID | Description |
|-----------|-----|-------------|
| Location Filter | `locationFilter` | Dropdown to filter by location |
| Location Count | `totalLocationsCount` | Badge showing number of locations |
| Device Count | `totalDevicesCount` | Button showing total devices |
| Connection Count | `totalConnectionsCount` | Button showing total connections |
| Save Now | - | Manual save button (edit mode only) |
| Export Excel | - | Export to XLSX |
| Export JSON | - | Export to JSON |
| Import JSON | - | Import from JSON (edit mode only) |

### 5.3 Topology Controls

| Button | Function | Description |
|--------|----------|-------------|
| Layout | `updateDrawioLayout()` | Change topology layout |
| Fit View | `fitDrawioView()` | Fit view to content |
| Legend | `showTopologyLegend()` | Show device type legend |
| Export PNG | `exportDrawioPNG()` | Export as PNG image |
| Export Draw.io | `exportTopologyDrawio()` | Export as .drawio file |

### 5.4 Device Form Fields

| Field ID | Property | Type |
|----------|----------|------|
| `rackId` | rackId | text + datalist |
| `deviceOrder` | order | number |
| `deviceRear` | isRear | checkbox |
| `deviceName` | name | text |
| `deviceBrandModel` | brandModel | text |
| `deviceType` | type | select |
| `deviceStatus` | status | select |
| `deviceLocation` | location | text + datalist |
| `deviceService` | service | text |
| `deviceNotes` | notes | textarea |
| `deviceLinksContainer` | links | dynamic |
| `portTypeQuantityContainer` | ports | dynamic |

### 5.5 Connection Form Fields

| Field ID | Property | Type |
|----------|----------|------|
| `fromDevice` | from | select |
| `fromPort` | fromPort | select |
| `toDevice` | to | select |
| `toPort` | toPort | select |
| `externalDest` | externalDest | text |
| `connType` | type | select |
| `connStatus` | status | select |
| `cableMarker` | cableMarker | text |
| `cableColor` | cableColor | color |
| `connNotes` | notes | textarea |

---

## 6. MAIN FUNCTIONS

### 6.1 Core Functions (app.js)

| Function | Description |
|----------|-------------|
| `escapeHtml(str)` | Escape HTML special characters |
| `saveToStorage()` | Save to localStorage + server |
| `saveNow()` | Manual save with feedback |
| `serverSave()` | POST to server |
| `serverLoad()` | GET from server |
| `loadFromStorage()` | Load from localStorage |
| `exportJSON()` | Export data to JSON file |
| `importData(event)` | Import JSON with validation |

### 6.2 Device CRUD (app.js)

| Function | Description |
|----------|-------------|
| `saveDevice()` | Create/update device |
| `editDevice(id)` | Load device into form |
| `removeDevice(id)` | Delete device and connections |
| `clearDeviceForm()` | Clear form fields |
| `cancelDeviceEdit()` | Cancel edit mode |

### 6.3 Connection CRUD (app.js)

| Function | Description |
|----------|-------------|
| `saveConnection()` | Create/update connection |
| `editConnection(idx)` | Load connection into form |
| `removeConnection(idx)` | Delete connection |
| `updateFromPorts()` | Update source port dropdown |
| `updateToPorts()` | Update destination port dropdown |

### 6.4 UI Updates (ui-updates.js)

| Function | Description |
|----------|-------------|
| `updateUI()` | Master update function |
| `updateDevicesList()` | Render device list |
| `updateMatrix()` | Render connection matrix |
| `updateConnectionsList()` | Render connection table |
| `exportExcel()` | Export to XLSX (3 sheets) |
| `printMatrix()` | Print matrix view |
| `printConnections()` | Print connections list |

### 6.5 Topology Functions (features.js)

| Function | Description |
|----------|-------------|
| `updateDrawioLayout()` | Change SVG layout |
| `fitDrawioView()` | Fit view to content |
| `exportDrawioPNG()` | Export as PNG |
| `exportTopologyDrawio()` | Export to Draw.io |
| `showTopologyLegend()` | Show legend modal |
| `closeLegendModal()` | Close legend modal |
| `filterTopologyByLocation()` | Filter topology by location |
| `filterTopologyByRack()` | Filter topology by source |

---

## 7. REST API

### 7.1 Data API (server.js / data.php)

#### GET /data.php
Returns system data.

**Response 200:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 5
}
```

#### POST /data.php
Saves data with validation.

**Request Body:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 5
}
```

**Response 200:**
```json
{"ok": true}
```

### 7.2 Authentication API (api/auth.php)

#### GET /api/auth.php?action=check
Check authentication status.

#### POST /api/auth.php?action=login
Login with credentials.

#### POST /api/auth.php?action=logout
End session.

---

## 8. BROWSER SUPPORT

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

**Required Features:**
- ES6 (let, const, arrow functions, template literals)
- Fetch API
- LocalStorage
- CSS Grid & Flexbox

---

## 9. CHANGELOG

### v3.1.3 (January 28, 2026)
- **Security:** Complete XSS protection with escapeHtml() in all tables
- **Security:** Enhanced import validation with type checking
- **Security:** Added escapeHtml fallback in features.js and ui-updates.js
- **Security:** Added requireAuth() fallback for missing Auth module
- **Bug Fix:** Fixed c.color undefined error with connColor fallback
- **Performance:** Added 250ms debounce on device and connection filters
- **Maintenance:** Unified all JS files to version 3.1.3

### v3.1.2 (January 28, 2026)
- Legend shows WallJack count from connections
- Legend shows off/disabled devices with red badge
- Legend footer with total summary
- Changed Topology icon from 🖧 to 🗺️
- Simplified Actions bar location filter
- Added Legend button in Topology tab
- Renamed "Activity Logs" tab to "Logs"

### v3.0.3 (January 2026)
- Fixed WallJack/External connections in topology
- External device labels with 2-line format

### v3.0.2 (January 2026)
- Fixed data mutation in getFilteredConnections()
- Fixed memory leak in topology event listeners
- Enhanced error handling

### v3.0.1 (January 2026)
- SVG topology with Cisco-style icons
- Draw.io export functionality
- Fixed connection type/label fallbacks

### v3.0.0 (January 2026)
- Added Location/Department field
- Added 4 IP address fields
- Added Device Links feature
- Added Network Topology map
- Added Activity Logs
- Added Authentication system
- Added filtered printing

---

## 10. LICENSE

Property of Tiesse S.P.A. - Internal use only.
