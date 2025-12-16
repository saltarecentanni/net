# Tiesse Matrix Network - Blueprint

## Overview

**Tiesse Matrix Network** is a web-based application for managing and visualizing network infrastructure, including devices, ports, and connections in an intranet environment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  index.html                                                 │
│  ├── UI Layer (Tailwind CSS)                               │
│  ├── Application Logic (Vanilla JavaScript)                │
│  ├── Data Management (devices[], connections[])            │
│  └── Export Engine (XLSX.js for Excel)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP GET/POST (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVER (PHP)                            │
├─────────────────────────────────────────────────────────────┤
│  data.php                                                   │
│  ├── GET  → Read /data/network_manager.json                │
│  └── POST → Write /data/network_manager.json               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA STORAGE                            │
├─────────────────────────────────────────────────────────────┤
│  /data/network_manager.json                                 │
│  {                                                          │
│    "devices": [...],                                        │
│    "connections": [...],                                    │
│    "nextDeviceId": N                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
intranet/
├── index.html                 # Main application (single-page)
├── data.php                   # Backend API for data persistence
├── data/
│   └── network_manager.json   # Persistent data storage
├── doc/
│   ├── BLUEPRINT.md           # This file
│   └── CHANGELOG.md           # Version history
├── README.md                  # Quick start guide
└── .gitignore                 # Git ignore rules
```

---

## Data Models

### Device
```javascript
{
  "id": 1,                        // Unique identifier (auto-increment)
  "rackId": "Rack-Network-01",    // Rack location identifier
  "order": 1,                     // Position in rack (for sorting)
  "name": "Router-01",            // Device name
  "brandModel": "Cisco 2960",     // Brand and model
  "type": "router",               // Device type (see types below)
  "status": "active",             // "active" | "disabled"
  "addresses": [                  // Network addresses
    {
      "network": "192.168.1.0/24",
      "ip": "192.168.1.1",
      "vlan": 100
    }
  ],
  "service": "Main Gateway",      // Service description
  "ports": [                      // Physical ports
    {
      "name": "eth0",
      "type": "Eth",              // "Eth" | "SFP/SFP+" | "WAN" | "Console"
      "status": "active"          // "active" | "disabled"
    }
  ],
  "notes": ""                     // Free text notes
}
```

### Device Types
| Type | Label | Color |
|------|-------|-------|
| `router` | Router | Blue |
| `router_wifi` | Router + WiFi | Blue |
| `switch` | Switch | Green |
| `switch_poe` | Switch PoE | Green |
| `firewall` | Firewall | Red |
| `server` | Server | Purple |
| `access_point` | Access Point | Cyan |
| `isp` | ISP | Gray |
| `others` | Others | Slate |

### Connection
```javascript
{
  "from": 1,                      // Source device ID
  "fromPort": "eth0",             // Source port name
  "to": 2,                        // Destination device ID
  "toPort": "eth1",               // Destination port name
  "type": "lan",                  // Connection type (see below)
  "color": "#3b82f6",             // Visual color
  "status": "active",             // "active" | "disabled"
  "cableMarker": "A1",            // Physical cable label
  "cableColor": "#ef4444",        // Physical cable color
  "notes": ""                     // Free text notes
}
```

### Connection Types
| Type | Label | Default Color |
|------|-------|---------------|
| `lan` | LAN | Blue (#3b82f6) |
| `wan` | WAN | Purple (#8b5cf6) |
| `trunk` | Trunk | Orange (#f97316) |
| `management` | Management | Slate (#64748b) |
| `fiber` | Fiber | Yellow (#eab308) |
| `serial` | Serial | Gray (#6b7280) |

---

## Features

### Tab 1: Devices
- Add/Edit/Delete network devices
- Configure device ports
- Set network addresses (Network, IP, VLAN)
- Visual rack color coding
- Device status toggle (Active/Disabled)

### Tab 2: Matrix & Connections
- **Connection Matrix**: NxN grid showing all device interconnections
- Visual port display: `eth1 ⟷ eth13` format
- Cable markers as colored pills
- Click cell to edit connection
- Drag-to-scroll navigation for large matrices
- Add/Edit connections via form

### Tab 3: Active Connections
- Sortable table of all connections
- Filter by status
- Quick edit/delete actions
- Visual indicators: rack colors, status badges, cable markers

### Data Management
- **Auto-save**: Saves to LocalStorage + Server (if PHP available)
- **Export Excel**: Full data export with Devices and Connections sheets
- **Export JSON**: Raw data backup
- **Import JSON**: Restore from backup

---

## API Endpoints

### GET /data.php
Returns current data as JSON.

**Response:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 15
}
```

### POST /data.php
Saves data to server.

**Request Body:**
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 15
}
```

**Response (success):**
```json
{ "ok": true }
```

---

## Deployment

### Requirements
- Web server (Apache, Nginx, IIS)
- PHP 7.0+ (for data persistence)
- Write permissions on `/data/` folder

### Installation
1. Copy `intranet/` folder to web server document root
2. Set folder permissions:
   ```bash
   chmod 755 intranet/
   chmod 775 intranet/data/
   chown -R www-data:www-data intranet/
   ```
3. Access via browser: `http://server-ip/intranet/`

### Without PHP (Read-only mode)
Application works but cannot save to server. Data persists only in browser LocalStorage.

---

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

---

## Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 3.x (CDN) | UI Styling |
| XLSX.js | 0.18.5 (CDN) | Excel export |

---

## Security Considerations
- No authentication (designed for trusted intranet)
- Input validation on server-side (data.php)
- Safe file write with temp file + rename
- JSON validation before save

---

## Future Enhancements
- [ ] User authentication
- [ ] Audit log / history
- [ ] Network diagram visualization
- [ ] SNMP auto-discovery
- [ ] Backup scheduling
- [ ] Dark mode theme
