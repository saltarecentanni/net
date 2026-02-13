# TIESSE Matrix Network v4.0.000 - Migration Plan

**Date:** February 10, 2026  
**From:** v3.6.037 → v4.0.000  
**Working Directory:** /Matrix4/  
**Backup:** /Matrix-versaoatual/ (untouched)

---

## IMPLEMENTATION STATUS

| Component | Status | Files Modified |
|-----------|--------|----------------|
| Device Prefix/Sigla System | ✅ DONE | app.js, index.html, ui-updates.js, features.js, device-detail.js, dashboard.js, floorplan.js |
| New Device Types (DVR, PoE, IoT, TST) | ✅ DONE | app.js (VALID_ENUMS), index.html (select), features.js (colors/labels/badges) |
| Custom Prefix Creation UI | ✅ DONE | app.js (showCustomPrefixDialog, SweetAlert2) |
| Prefix in JSON Export/Import | ✅ DONE | app.js (exportJSON, importJSON, serverLoad, saveToStorage) |
| Auto-prefix Migration | ✅ DONE | app.js (normalizeDataCase auto-populates prefix from type) |
| UI English Labels + Italian Tooltips | ✅ DONE | index.html (form labels EN, title attrs IT) |
| Groups System | ✅ DONE | app.js (16 functions), index.html (deviceGroup select, Group Manager) |
| Groups Persistence | ✅ DONE | app.js (serverSave, saveToStorage, saveNow, loadFromStorage, serverLoad, exportJSON, importData) |
| Groups Auto-Migration | ✅ DONE | app.js (migrateToGroupSystem: 11 groups from 101 devices' rackId values) |
| Group Manager Location Filter | ✅ DONE | app.js (openGroupManager filters by selected location) |
| Device Form Redesign (5 rows, EN) | ✅ DONE | index.html (complete rewrite), app.js (save/edit/clear) |
| New Device Fields (DHCP, MAC, SN, etc.) | ✅ DONE | index.html, app.js, ui-updates.js, device-detail.js |
| Mask Separated from IP | ✅ DONE | app.js (saveDevice strips /mask, editDevice extracts), ui-updates.js, device-detail.js |
| Monitoring ON/OFF Checkbox | ✅ DONE | index.html (checkbox), app.js (saveDevice), device-detail.js (📡 badge) |
| DHCP Disables Network Fields | ✅ DONE | app.js (toggleDhcpFields: disabled + pointerEvents) |
| Table Redesign (no Links column) | ✅ DONE | ui-updates.js (purple prefix, Order/Rack Pos/ID#, no Links) |
| 24 → 25 Device Types (added WJ-TEL) | ✅ DONE | app.js (DEVICE_PREFIXES), index.html, features.js (typeIcons, SVG, colors) |
| Red Asterisks on Required Fields | ✅ DONE | index.html (Location, Group, Type, Hostname) |
| Location Enhancements | ⏳ TODO | — |
| WallJack/External Cleanup | ⏳ TODO | — |
| Connection Form Simplification | ⏳ TODO | — |
| Monitoring Engine | ⏳ TODO | — |

---

## LANGUAGE CONVENTION

| Layer | Language | Example |
|-------|----------|---------|
| Code (JS variables, functions, comments) | 🇬🇧 English | `monitoring.enabled`, `saveDevice()` |
| Data (JSON keys, field names) | 🇬🇧 English | `"isRack": true`, `"serialNumber": ""` |
| UI labels | 🇬🇧 English | `"Location"`, `"Hostname"`, `"Brand/Model"` |
| UI tooltips (title attributes) | 🇮🇹 Italian | `title="Posizione nella rete"`, `title="Marca e Modello"` |
| Manager/Dialog titles | 🇬🇧 English | `"Group Manager"`, `"Type Manager"` |
| SweetAlert messages | 🇮🇹 Italian | `"Dispositivo aggiunto"`, `"Errore"` |
| Documentation (/doc/) | 🇬🇧 English | This file |

---

## PHASE 1: DATA MODEL - New Hierarchy

### 1.1 New `groups` Array in appState

**Currently:** `rackId` is a free-text field in each device. No independent group entity exists.  
**Change:** Create `appState.groups[]` as independent entities.

```javascript
// NEW: appState.groups[]
{
  id: "grp-uuid",              // Unique ID (auto-generated)
  locationId: "loc-00",        // Parent location ID (required)
  code: "RACK-NETWORK-01",     // Short code (can repeat across locations)
  name: "Rack Network 01",     // Descriptive name
  description: "",             // Optional description (e.g., "Solo dispositivi VoIP")
  isRack: true,                // Is this group a physical rack?
  rackUnits: 42,               // If isRack=true, how many U (optional)
  color: "#3b82f6",            // Color for UI
  order: 1                     // Sort order within location
}
```

**Unique identifier:** `locationId + code` (same code in different locations = different groups)

**Migration of existing data:**
- Extract unique `rackId` values from all devices
- Create one group per unique `rackId`, assigned to the device's location
- Replace `device.rackId` (string) → `device.groupId` (reference to group.id)

### 1.2 Enhanced `locations` Array

**Currently:** Locations exist but cannot be created empty.  
**Change:** Allow empty locations + virtual type + isolation flag.

```javascript
// ENHANCED: appState.locations[]
{
  id: "loc-00",                 // Unique ID (existing format kept)
  siteId: "main",              // Site reference
  code: "00",                  // Short code
  name: "Sala Server",         // Descriptive name
  type: "physical",            // "physical" | "virtual" ← NEW VALUES
  roomRef: "0",                // Reference to room polygon (null if virtual)
  color: "#7c3aed",
  isIsolated: false,           // NEW: If true, excluded from global reports/cascades
  showInFloorPlan: true        // NEW: Whether to show on floor plan map
}
```

**New fields:**
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `type` | string | `"physical"` | `"physical"` or `"virtual"` (replaces old `"mapped"`/`"custom"`) |
| `isIsolated` | boolean | `false` | Isolate from global cascades/reports |
| `showInFloorPlan` | boolean | `true` | Show/hide on floor plan |

**Migration:**
- Existing `type: "mapped"` → `type: "physical"`, `showInFloorPlan: true`
- Existing `type: "custom"` → `type: "virtual"`, `showInFloorPlan: false`

---

## PHASE 2: DEVICE FORM - New Fields

### 2.1 New Fields Added to Device

| Field | JSON Key | Type | Required | Default | UI Label (EN) | Tooltip (IT) |
|-------|----------|------|----------|---------|---------------|---------------|
| Group | `rackId` | string | Yes | `""` | Group * | Gruppo |
| DHCP toggle | `isDhcp` | boolean | No | `false` | DHCP | DHCP |
| MAC Address | `macAddress` | string | No | `""` | MAC Address | Indirizzo MAC |
| Serial Number | `serialNumber` | string | No | `""` | Serial Number | Numero di Serie |
| Asset Tag | `assetTag` | string | No | `""` | Asset Tag | Etichetta Patrimonio |
| Mask | `mask` | string | No | `""` | Mask | Maschera |
| Monitoring | `monitoringEnabled` | boolean | No | `false` | Monitoring ON | Monitoraggio attivo |

> **Note:** `hostname` was merged into the device `name` field (not a separate field).  
> **Note:** `dns1`/`dns2` were removed — not needed at this stage.  
> **Note:** `monitoringMethod` was removed — only ON/OFF toggle for now.

### 2.2 Updated Device Data Model

```javascript
// COMPLETE device structure v4.0.001
{
  // Identity
  id: 1,                               // Numeric ID (auto-increment) - KEPT
  name: "Core-Switch-01",              // Device name (raw, without prefix) - KEPT
  prefix: "SW",                        // Device prefix/sigla (v4) - NEW
  brandModel: "Cisco C9300-48P",       // Brand + Model - KEPT
  type: "switch",                      // Device type - KEPT
  serialNumber: "",                     // NEW: Serial number
  assetTag: "",                         // NEW: Asset tag
  macAddress: "",                       // NEW: Primary MAC address

  // Hierarchy
  location: "Sala Server",             // Location name - KEPT
  rackId: "RACK-NETWORK-01",           // Group code reference - KEPT (references group.code)
  order: 1,                            // Position within group - KEPT
  isRear: false,                       // Rear-of-rack flag - KEPT

  // Status
  status: "active",                    // KEPT: active|disabled|maintenance

  // Network (ENHANCED)
  isDhcp: false,                       // NEW: If true, IP/GW/Mask fields are disabled
  addresses: [{
    network: "10.10.100.1/24",         // KEPT
    ip: "",                            // KEPT (legacy)
    vlan: null,                        // KEPT
    zone: "LAN"                        // KEPT
  }],
  gateway: "",                         // KEPT
  mask: "",                            // NEW: Separated from IP (was /24 suffix)

  // Ports - KEPT
  ports: [{
    name: "eth01",
    type: "eth",
    status: "active"
  }],

  // Links - KEPT
  links: [{
    type: "ssh",
    url: "10.10.100.1"
  }],

  // Monitoring (NEW)
  monitoringEnabled: false,            // NEW: Is this device monitored? (ON/OFF only)

  // Metadata - KEPT
  service: "",
  notes: ""
}
```

### 2.3 Fields NOT Implemented (Deferred or Merged)

| Field | Reason |
|-------|--------|
| `hostname` | Merged into `name` field — not a separate field |
| `dns1` / `dns2` | Deferred — not needed at this stage |
| `monitoringMethod` | Removed — only ON/OFF checkbox for now |
| `locationId` | Kept as `location` (string) — no ID-based reference yet |
| `groupId` | Kept as `rackId` (string) — references `group.code` |
| `position` | Kept as `order` — rename deferred |
| `rackPosition` | Kept as `isRear` (boolean) — enum conversion deferred |

### 2.4 Device Form Layout (HTML) — Current Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│ + Add Device                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ ROW 1: Hierarchy                                                    │
│ [Location *] [Group *] [Type *] [Order]                             │
│                                                                     │
│ ROW 2: Identity + Status                                            │
│ [Hostname *] [Brand/Model] [Service] [Status ▼] [☐ Monitoring ON]  │
│                                                                     │
│ ROW 3: Network                                                      │
│ [☐ DHCP] [IP] [Zone ▼] [+] [Gateway] [Mask]                       │
│ Ports: [Name] [Type ▼] [Status ▼] [+]                              │
│ Links: [icon] [+]                                                   │
│                                                                     │
│ ROW 4: Notes                                                        │
│ [Notes textarea]                                                    │
│                                                                     │
│ ROW 5: Extended Info (collapsible <details>)                        │
│ [Serial Number] [Asset Tag] [MAC Address]                           │
│                                                                     │
│ [+ Add] [Cancel] [Clear]                                            │
└─────────────────────────────────────────────────────────────────────┘
```

**Labels:** English. **Tooltips (title):** Italian.  
**Required fields** (red asterisk): Location, Group, Type, Hostname.  
**DHCP checkbox:** When checked, IP/Gateway/Mask fields are **disabled** (disabled=true, pointerEvents='none').  
**Monitoring:** Single ON checkbox — no method dropdown.  
**IP field:** Placeholder `192.168.1.1` (no /mask suffix).  
**Mask:** Separate field from IP. Legacy data with IP like `10.10.100.1/24` is auto-extracted into Mask field on edit.

---

## PHASE 3: WALLJACK & EXTERNAL - Normalized as Regular Devices

### 3.1 Problem

Currently walljack and external are treated as "special connections" with:
- `connection.isWallJack` (boolean flag)
- `connection.externalDest` (free-text destination)
- `connection.roomId` (room assignment)
- Virtual phantom devices created in topology
- **167 special-case code points** across 8 files

### 3.2 Solution

Walljack and External become **normal devices** with ports and standard connections.

**Before (WRONG):**
```
Switch.eth02 → connection(isWallJack=true, externalDest="Z15") → phantom
```

**After (CORRECT):**
```
Switch.eth02 → PatchPanel.eth05 → WallJack-Z15.port01 ↔ [cable A6] ↔ srv-vm-01.eth01
ISP-TIM.wan01 → Firewall.wan01
```

### 3.3 Fields REMOVED from Connection

| Field | Reason |
|-------|--------|
| `isWallJack` | Walljack is now a regular device |
| `externalDest` | External/ISP is now a regular device |
| `roomId` | Device's `locationId` handles this |

### 3.4 Connection Data Model (Simplified)

```javascript
// SIMPLIFIED connection v4.0.000
{
  id: "c-xxxxxxxxxxxx",        // UUID - KEPT
  from: 1,                     // Source device ID - KEPT
  fromPort: "eth24",           // Source port - KEPT
  to: 2,                       // Destination device ID - KEPT (always a real device now)
  toPort: "eth01",             // Destination port - KEPT
  type: "trunk",               // Connection type - KEPT
  status: "active",            // KEPT
  cableColor: "#3b82f6",       // KEPT
  cableMarker: "A1",           // KEPT
  notes: ""                    // KEPT
}
```

### 3.5 HTML Changes - Connection Form

**REMOVED elements:**
- `<option value="walljack">` from toDevice select
- `<option value="external">` from toDevice select
- `<div id="externalDestContainer">` (entire section)
- `<div id="wallJackRoomContainer">` (entire section)
- `<input id="externalDest">`
- `<select id="wallJackRoomId">`

**Result:** Connection form becomes a simple from→to device picker with no special cases.

### 3.6 Code Cleanup (167 references)

| File | References to Remove/Simplify | Lines Affected |
|------|-------------------------------|----------------|
| js/app.js | 49 | isWallJack checks, externalDest logic, toggleExternalDest(), populateWallJackRoomSelect() |
| js/ui-updates.js | 25 | Special rendering for WJ/External in tables, matrix, rack view |
| js/features.js | 70 | Virtual device creation, wallJackMap, externalMap, special topology routing |
| js/device-detail.js | 3 | externalDest in tooltips and connection list |
| js/floorplan.js | 3 | WJ room filtering |
| js/json-validator.js | 3 | isWallJack validation |
| js/dashboard.js | 5 | WJ/external search and display |
| index.html | 9 | DOM elements, sample data, help text |

### 3.7 Data Migration

For each connection with `isWallJack: true`:
1. Check if a walljack device already exists with matching name/externalDest
2. If not, create a new device `{ type: "walljack", name: externalDest, ... }`
3. Convert the connection to a normal device-to-device connection
4. Remove `isWallJack`, `externalDest`, `roomId` from the connection

For each connection with `externalDest` and no `isWallJack`:
1. Check if an ISP/external device already exists
2. If not, create a new device `{ type: "isp", name: externalDest, ... }`
3. Convert to normal connection
4. Remove `externalDest`

---

## PHASE 4: CONNECTIONS - Rebuilt with New Hierarchy

### 4.1 Connection Form Changes

After Phase 3 cleanup, the connection form is simplified:

```
┌─ Connessione ──────────────────────────────────────────────────────┐
│                                                                     │
│ SORGENTE                          DESTINAZIONE                      │
│ [📍 Posizione ▼]                  [📍 Posizione ▼]                 │
│ [🗂️ Gruppo ▼]                     [🗂️ Gruppo ▼]                    │
│ [📟 Dispositivo * ▼]              [📟 Dispositivo * ▼]             │
│ [🔌 Porta * ▼]                    [🔌 Porta * ▼]                   │
│                                                                     │
│ DETTAGLI                                                            │
│ [Tipo Connessione ▼] [Stato ▼]                                     │
│ [🎨 Colore Cavo] [🏷️ Etichetta Cavo]                              │
│ [📝 Note]                                                           │
│                                                                     │
│ [+ Aggiungi Connessione] [Annulla] [Pulisci]                       │
└─────────────────────────────────────────────────────────────────────┘
```

**No more special cases.** Every connection is device-to-device.

---

## PHASE 5: TOPOLOGY / MATRIX / FLOOR PLAN - Updated

### 5.1 Topology

- Remove virtual walljack/external device creation (~100 lines in features.js)
- All devices are real → render normally
- WallJack devices show with walljack icon (already exists)
- ISP/External devices show with isp/external icon (already exists)

### 5.2 Matrix

- Remove special WJ/External rows/columns
- All devices are in the standard matrix grid

### 5.3 Floor Plan

- WallJack devices belong to a location → show in that room
- Remove special `roomId` connection logic
- Use standard `device.locationId` → room mapping

---

## PHASE 6: MONITORING (Future - After Phases 1-5)

### 6.1 Device Monitoring Fields

Currently implemented: simple ON/OFF checkbox (`monitoringEnabled: true/false`).  
Future expansion will add method selection and scheduling:

```javascript
monitoringEnabled: true,               // Already implemented (v4.0.001)
monitoringMethod: \"auto\"               // FUTURE: \"snmp\" | \"ping\" | \"uptime_kuma\" | \"manual\" | \"auto\"
```

### 6.2 Schedule System (appState.monitoring)

```javascript
appState.monitoring = {
  config: { enabled: true, defaultInterval: 3600, ... },
  schedules: [{ scope, interval, method, runDays, runHours, notify }],
  portStates: [{ deviceId, port, matrixStatus, realStatus, mismatch }],
  alerts: [{ type, severity, deviceId, port, expected, actual, status }]
}
```

### 6.3 Integration Points
- **A) SNMP** via LibreNMS API → Managed switches, routers, firewalls
- **B) Ping/ARP** → PCs, TVs, phones, unmanaged devices
- **C) Uptime Kuma** API → Services (HTTP, SSH, DNS, DB)

### 6.4 Alert Types
| Code | Situation | Required Action |
|------|-----------|----------------|
| `UNDOCUMENTED_UP` | Port UP but no connection in Matrix | Document the connection |
| `DOCUMENTED_DOWN` | Connection exists but port is DOWN | Check cable or remove connection |
| `MAC_CHANGED` | Different MAC on port | Verify device swap |
| `DEVICE_UNREACHABLE` | Entire device not responding | Check power/network |

---

## FILE CHANGE SUMMARY

### Files MODIFIED (as of v4.0.001)

| File | Changes |
|------|---------|
| `index.html` | Form redesign: 5 rows, EN labels + IT tooltips, 24 types (" - " separator), DHCP checkbox, Monitoring ON checkbox, red asterisks, separate Mask field, IP placeholder "192.168.1.1" |
| `js/app.js` | DEVICE_PREFIXES (24), saveDevice (strips /mask, no monitoringMethod), editDevice (extractedMask), toggleDhcpFields (disabled+pointerEvents), openGroupManager (location filter), 16 group functions |
| `js/ui-updates.js` | Table: purple prefix + raw name, "Order/Rack Pos/ID#" header, Links column removed, IP strips /mask when separate mask exists |
| `js/features.js` | typeIcons (24 entries), connection rendering, topology display points |
| `js/device-detail.js` | displayIp (mask-aware), monitoring badge "📡 ON", no hostname/DNS |
| `js/floorplan.js` | Display points updated to getDeviceDisplayName() |
| `js/json-validator.js` | Validation rules updated |
| `js/dashboard.js` | Search/display updated with getDeviceDisplayName() |
| `package.json` | Version 4.0.001 |

### Files NOT MODIFIED

| File | Reason |
|------|--------|
| `js/auth.js` | No changes needed |
| `js/editlock.js` | No changes needed |
| `js/icons.js` | walljack and external icons KEPT (they're still valid device types) |
| `css/styles.css` | No changes needed |
| `server.js` | No changes needed |
| `data.php` | No changes needed |

### Data Migration (`network_manager.json`)

| Action | Details |
|--------|---------|
| Create `groups[]` | Extract from existing `rackId` values |
| Update `locations[]` | Add `isIsolated`, `showInFloorPlan`, normalize `type` |
| Update `devices[]` | `rackId` → `groupId`, `order` → `position`, `isRear` → `rackPosition`, `location` → `locationId`, add new empty fields |
| Update `connections[]` | Convert WJ/External to normal device-to-device, remove `isWallJack`, `externalDest`, `roomId` |
| Create new WJ devices | From `externalDest` data in walljack connections |
| Create new ISP devices | From `externalDest` data in external connections |

---

## IMPLEMENTATION ORDER

```
Phase 1: Data Model (groups, locations)
  ├── 1.1 Add groups[] to appState
  ├── 1.2 Enhance locations[] (virtual, isolated)
  ├── 1.3 Create Location Manager UI (create empty locations)
  └── 1.4 Create Group Manager UI (create empty groups)

Phase 2: Device Form
  ├── 2.1 Add new HTML fields (DHCP, MAC, SN, hostname, monitoring)
  ├── 2.2 Update saveDevice()
  ├── 2.3 Update editDevice()
  ├── 2.4 Update clearDeviceForm()
  ├── 2.5 Update device table rendering
  └── 2.6 Update Device Detail modal

Phase 3: WallJack/External Cleanup
  ├── 3.1 Remove special UI elements from index.html
  ├── 3.2 Clean app.js (49 references)
  ├── 3.3 Clean ui-updates.js (25 references)
  ├── 3.4 Clean features.js (70 references)
  ├── 3.5 Clean remaining files (14 references)
  └── 3.6 Write data migration function

Phase 4: Connections
  ├── 4.1 Simplify connection form
  └── 4.2 Update connection rendering

Phase 5: Views
  ├── 5.1 Update topology (no more virtual devices)
  ├── 5.2 Update matrix view
  └── 5.3 Update floor plan

Phase 6: Monitoring (future)
  ├── 6.1 Monitoring toggle in device form
  ├── 6.2 Schedule system
  ├── 6.3 LibreNMS/Ping/Uptime Kuma integration
  └── 6.4 Alert system
```

---

## VALIDATION CHECKLIST

Before each phase is complete, verify:

- [ ] Server starts without errors (`node server.js`)
- [ ] Page loads without console errors
- [ ] Existing data is preserved (101 devices, 93 connections)
- [ ] New fields save and load correctly
- [ ] Edit mode populates all fields
- [ ] Clear form resets all fields
- [ ] Device Detail modal shows new fields
- [ ] Topology renders correctly
- [ ] Matrix renders correctly
- [ ] Floor Plan renders correctly
- [ ] Export (JSON, Excel) includes new fields
- [ ] Import handles both old (v3.x) and new (v4.x) data formats

---

**Status:** Phase 1 ✅ COMPLETE | Phase 2 ✅ ~90% COMPLETE | Phases 3-6 ⏳ TODO  
**Current Version:** v4.0.001  
**Next Step:** Device modal modifications, then Phase 3 (WallJack/External cleanup)
