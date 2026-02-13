# Tiesse Matrix Network — v4.0.001 Documentation

> **Internal Use Only** — Tiesse S.P.A. © 2026  
> This documentation covers the v4.0.001 architecture, data model, and development guidelines.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Model](#data-model)
4. [File Structure](#file-structure)
5. [Design System](#design-system)
6. [Conventions](#conventions)
7. [API Reference](#api-reference)
8. [Development Guide](#development-guide)

---

## Architecture Overview

Matrix Network is a single-page application (SPA) for managing enterprise network infrastructure: devices, connections, floor plans, and topology visualization. It runs entirely in the browser with a Node.js backend for persistence.

### Hierarchy (v4)

```
SITE → LOCATION → GROUP → DEVICE
```

| Level | Description | Example |
|-------|-------------|---------|
| **Site** | Physical company branch | "Sede Imola", "Filiale Bologna" |
| **Location** | Room or logical zone within a site | "Sala Server", "Piano 1 Uffici" |
| **Group** | Rack, desk cluster, or logical group within a location | "RACK-NETWORK-01", "STANDALONE" |
| **Device** | Any network-connected equipment | "SW Core-Switch-01", "RT Gateway" |

### Device Prefix System (v4)

Every device has a **prefix (sigla)** prepended to its display name for universal identification.  
**25 standard prefixes** (Laptop and WLC were removed, WJ-TEL added in v4.0.001):

| Code | Type | Label (EN) | Tooltip (IT) |
|------|------|------------|---------------|
| MOD | modem | Modem / Fiber | Modem o terminale fibra (ONT/ONU) |
| FW | firewall | Firewall | Apparato di sicurezza |
| RT | router | Router | Router infrastruttura |
| RTW | router_wifi | Router Wi-Fi | Router con wireless integrato |
| SW | switch | Switch | Switch di rete (L2/L3) |
| AP | wifi | Access Point | Punto di accesso wireless |
| POE | poe | PoE Injector/Switch | Power over Ethernet |
| SRV | server | Server | Server applicazioni/database |
| NAS | nas | NAS / Storage | Network Attached Storage |
| UPS | ups | UPS / Nobreak | Gruppo di continuità |
| IP-PHO | ip_phone | IP Phone | Telefono VoIP |
| PRN | printer | Printer | Stampante di rete |
| CAM | camera | IP Camera | Telecamera di sicurezza IP |
| DVR | dvr | DVR / NVR | Videoregistratore |
| IOT | iot | IoT Device | Dispositivo IoT / smart |
| TST | tst | Test Bench | Bancada test / porta lab |
| GEN | others | Generic | Dispositivo generico |
| PC | pc | PC / Desktop | Personal computer |
| TAB | tablet | Tablet | Dispositivo tablet |
| PP | patch | Patch Panel | Pannello distribuzione cavi |
| WJ | walljack | Wall Jack RJ45 | Presa a muro rete (RJ45) |
| WJ-TEL | walljack_tel | Wall Jack RJ11 | Presa telefono/DSL (RJ11) |
| ISP | isp | ISP / Provider | Apparato ISP |
| TV | tv | TV / Display | Televisore / display |
| HUB | hub | Hub | Hub legacy |

Users can also create **custom prefixes** via the UI (Type Manager → 🔧 icon).

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | Vanilla ES6 JavaScript | — |
| CSS Framework | Tailwind CSS | 3.x (local runtime) |
| Custom CSS | styles.css (CSS variables) | 678 lines |
| Dialogs | SweetAlert2 | 11.x (local) |
| Charts | Chart.js | 4.x (local) |
| Excel Export | SheetJS (xlsx) | 0.20.x (local) |
| Backend | Node.js (pure http) | 16+ |
| Authentication | bcryptjs + session cookies | — |
| Data Store | Single JSON file | ~10K lines |
| CDN Dependencies | **None** (fully offline-capable) | — |

---

## Data Model

### Device Object

```javascript
{
    id: 1,                          // Auto-increment integer
    rackId: "RACK-NETWORK-01",      // Group code reference (UPPERCASE, matches group.code)
    order: 1,                       // Position within group (0-99)
    isRear: false,                  // Rear-of-rack flag
    name: "Core-Switch-01",         // Device name (raw, without prefix)
    prefix: "SW",                   // Device prefix/sigla (v4)
    brandModel: "HPE Aruba 2930F",  // Manufacturer and model
    type: "switch",                 // Device type (lowercase, from VALID_ENUMS)
    status: "active",               // Device status (lowercase)
    location: "Sala Server",        // Location name
    isDhcp: false,                  // DHCP toggle (disables IP/GW/Mask when true)
    addresses: [                    // IP addresses with zones
        { network: "192.168.1.1", ip: "", vlan: null, zone: "lan" }
    ],
    gateway: "192.168.1.254",       // Default gateway (optional)
    mask: "/24",                    // Subnet mask (separate field, extracted from legacy IP)
    ports: [                        // Physical ports
        { name: "eth01", type: "eth", status: "active" }
    ],
    links: [                        // External references
        { type: "ssh", url: "192.168.1.1" }
    ],
    monitoringEnabled: false,       // Monitoring ON/OFF (checkbox)
    macAddress: "",                 // Primary MAC address
    serialNumber: "",               // Serial number
    assetTag: "",                   // Asset tag
    service: "Core switching",      // Service description
    notes: ""                       // Free-text notes
}
```

### Group Object (v4.0.000)

Groups are organizational units within locations: racks, zones, areas, etc.  
Devices reference groups via `device.rackId = group.code`.

```javascript
{
    id: "grp-0001",                 // Auto-generated unique ID
    code: "RACK-NETWORK-01",       // UPPERCASE code (referenced by device.rackId)
    name: "Rack Network 01",       // Descriptive name (can differ from code)
    locationId: "loc-00",          // Parent location ID (required)
    isRack: true,                  // Is this group a physical rack?
    rackUnits: 42,                 // If isRack=true, rack height in U
    color: "#3b82f6",              // Display color (falls back to rackColorMap)
    order: 1,                      // Sort order within location
    description: ""                // Optional description
}
```

**Auto-migration:** On first load of v3 data, `migrateToGroupSystem()` extracts unique 
`rackId` values from all devices and creates group entities automatically.

### Connection Object

```javascript
{
    id: "c-6da15bd9356d",     // Secure random ID
    from: 1,                  // Source device ID
    fromPort: "eth01",        // Source port name
    to: 2,                    // Destination device ID
    toPort: "eth00",          // Destination port name
    externalDest: "",         // External destination (legacy, being removed)
    isWallJack: false,        // Wall jack flag (legacy, being removed)
    type: "trunk",            // Connection type
    status: "active",         // Connection status
    cableMarker: "A2",        // Physical cable label
    cableColor: "#22c55e",    // Cable color hex
    notes: ""                 // Free-text notes
}
```

### Location Object

```javascript
{
    id: "loc-00",             // Unique location ID
    siteId: "main",           // Parent site ID
    code: "00",               // Short numeric code
    name: "Sala Server",      // Display name
    type: "mapped",           // "mapped" (from floor plan) | "custom" (user-created)
    roomRef: 0,               // Reference to room polygon (null if custom)
    color: "#7c3aed"          // Display color
}
```

---

## File Structure

```
matrix/
├── index.html              # Single-page application (~4,222 lines)
├── server.js               # Node.js backend (911 lines)
├── data.php                # PHP backend (legacy compatibility)
├── package.json            # Node.js dependencies
├── .env                    # Environment variables (secrets)
├── css/
│   └── styles.css          # Custom CSS with variables (678 lines)
├── js/
│   ├── app.js              # Core logic, state, CRUD (~6,355 lines)
│   ├── ui-updates.js       # Device/connection tables, matrix (~2,807 lines)
│   ├── features.js         # Topology SVG, export, icons (~4,889 lines)
│   ├── floorplan.js        # Floor plan editor (~1,351 lines)
│   ├── dashboard.js        # Dashboard, search, analytics (~1,210 lines)
│   ├── device-detail.js    # Device detail modal (~1,135 lines)
│   ├── auth.js             # Authentication UI (306 lines)
│   ├── json-validator.js   # Data validation (299 lines)
│   ├── icons.js            # Cisco-style icon selection (276 lines)
│   └── editlock.js         # Exclusive edit lock (243 lines)
├── config/
│   ├── config.php          # PHP configuration
│   ├── json-schema.json    # JSON schema for validation
│   └── guacamole.json      # Guacamole integration config
├── api/                    # Backend API endpoints
├── data/
│   └── network_manager.json  # Application data (~10K lines)
├── assets/
│   └── vendor/             # Tailwind, SweetAlert2, Chart.js, SheetJS
├── backup/                 # Automatic pre-save backups
├── doc/
│   ├── README.md           # This file
│   ├── CHANGELOG.md        # Version history
│   ├── V4_MIGRATION_PLAN.md # Migration roadmap
│   └── archive/v3/         # Archived v3 documentation
├── scripts/                # Maintenance scripts
└── tests/                  # Test files
```

---

## Design System

### Color Palette (CSS Variables)

| Role | Variable | Value | Usage |
|------|----------|-------|-------|
| Primary | `--color-primary` | `#3b82f6` | Links, active elements, focus rings |
| Success | `--color-success` | `#22c55e` | Active status, confirmations |
| Danger | `--color-danger` | `#ef4444` | Errors, deletions, disabled status |
| Warning | `--color-warning` | `#f59e0b` | Warnings, attention indicators |
| Info | `--color-info` | `#6366f1` | Informational, secondary actions |
| Accent | `--color-accent` | `#8b5cf6` | Locations, special features |

### Typography

System font stack via Tailwind CSS defaults. No custom fonts loaded.

### Component Classes

| Class | Purpose |
|-------|---------|
| `.btn` + `.btn-{color}` | Action buttons with 3 sizes (sm/md/lg) |
| `.badge` + `.badge-{type}` | Status/type indicators |
| `.card` | Container panels |
| `.filter-control` | Filter input containers |
| `.matrix-cell` | Connection matrix cells |
| `.modal-overlay` + `.modal-content` | Modal dialogues |

### Responsive Strategy

All responsive behavior is handled through **Tailwind CSS utility classes** in HTML:
- `md:` — Medium screens (768px+)
- `lg:` — Large screens (1024px+)
- `xl:` — Extra large (1280px+)

No custom `@media` queries in CSS (except `@media print`).

---

## Conventions

### Language Convention

| Layer | Language | Example |
|-------|----------|---------|
| Code (JS variables, functions, comments) | English | `saveDevice()`, `getDeviceDisplayName()` |
| Data (JSON keys) | English | `"prefix": "SW"`, `"isRear": true` |
| UI labels | English | `"Location"`, `"Hostname"`, `"Brand/Model"` |
| UI tooltips (title attributes) | Italian | `title="Posizione nella rete"` |
| Manager/dialog titles | English | `"Group Manager"`, `"Type Manager"` |
| SweetAlert messages | Italian | `"Dispositivo aggiunto"` |
| Documentation | English | This file |

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Functions | camelCase | `saveDevice()`, `getDeviceDisplayName()` |
| Constants | UPPER_SNAKE_CASE | `DEVICE_PREFIXES`, `VALID_ENUMS` |
| CSS variables | kebab-case | `--color-primary`, `--shadow-md` |
| HTML IDs | camelCase | `deviceName`, `devicePrefix` |
| CSS classes | kebab-case | `.matrix-cell`, `.filter-control` |
| JSON keys | camelCase | `rackId`, `brandModel`, `cableMarker` |
| Device rackId | UPPERCASE | `"RACK-NETWORK-01"` |
| Device type/status | lowercase | `"switch"`, `"active"` |

### Data Normalization Rules

- `rackId` → always UPPERCASE
- `type` → always lowercase  
- `status` → always lowercase
- `prefix` → always UPPERCASE
- Port names → normalized (`eth01`, `GbE01`, `SFP01`)

---

## API Reference

### Backend Endpoints (server.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/data` | No | Load all application data |
| POST | `/data` | Yes + CSRF + Lock | Save all application data |
| GET | `/api/auth.php?action=check` | No | Check session status |
| POST | `/api/auth.php?action=login` | No | Authenticate user |
| GET | `/api/auth.php?action=logout` | No | End session |
| GET/POST | `/api/editlock.php` | Varies | Manage exclusive edit lock |
| GET/POST | `/api/guacamole` | Varies | Apache Guacamole integration |

### Security Features

- HttpOnly + SameSite=Strict session cookies
- CSRF token with timing-safe comparison
- Rate limiting with exponential backoff
- Exclusive edit lock (single editor, 5-minute timeout)
- Automatic backup before every save
- Write serialization queue
- Content Security Policy headers

---

## Development Guide

### Running Locally

```bash
cd matrix
npm install
node server.js
# → http://localhost:3000
```

### Adding a New Device Type

1. Add type string to `VALID_ENUMS.deviceTypes` in `js/app.js`
2. Add `<option>` to device type `<select>` in `index.html`
3. Add prefix entry to `DEVICE_PREFIXES` in `js/app.js`
4. Add entries to `typeColors`, `typeLabels`, `typeBadgeColors` in `js/features.js`
5. (Optional) Add SVG icon to `deviceIcons` in `js/features.js`

### Adding a New Device Field

1. Add HTML input to device form in `index.html`
2. Read value in `saveDevice()` in `js/app.js`
3. Add to `deviceData` object in `saveDevice()`
4. Populate in `editDevice()`
5. Reset in `clearDeviceForm()`
6. Display in relevant views (table, card, detail modal, export)

---

## Archived Documentation

Previous v3 documentation is preserved in `doc/archive/v3/`.
