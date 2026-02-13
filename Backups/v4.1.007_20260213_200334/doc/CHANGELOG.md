# Changelog — Tiesse Matrix Network

All notable changes to this project are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

---

## [4.0.001] — 2026-02-11

### Added
- **Device Form Redesign**: Complete rewrite of form HTML into 5 logical rows (Hierarchy, Identity+Status, Network, Notes, Extended Info)
- **Wall Jack Telephone (WJ-TEL)**: New device type `walljack_tel` for RJ11 telephone/DSL outlets — separate from `walljack` (RJ45). Includes dedicated SVG icon (yellow plate, 4 pins, TEL label), prefix WJ-TEL, colors, topology layer, Draw.io style
- **English UI labels**: All form labels switched from Italian to English (`Location`, `Group`, `Type`, `Hostname`, `Brand/Model`, etc.)
- **Italian tooltips**: `title` attributes in Italian on all form fields for contextual help
- **Red asterisks on required fields**: Location, Group, Type, Hostname marked with `<span class="text-red-500">*</span>`
- **Separate Mask field**: Mask no longer part of IP — new standalone field. Legacy data with `10.10.100.1/24` auto-extracted on edit via `extractedMask`
- **DHCP disables network fields**: `toggleDhcpFields()` now sets `disabled=true` + `pointerEvents='none'` (not just opacity)
- **Group Manager location filter**: When a location is selected in device form, Group Manager shows only groups for that location with "No groups for this location" message when empty
- **Purple prefix in table**: Device column shows `<span class="text-purple-600 font-bold">PREFIX</span> rawName` instead of combined `getDeviceDisplayName()`

### Changed
- **Device types reduced to 24, then expanded to 25**: Removed `laptop` (LAP) and `wlc` (WLC), added `walljack_tel` (WJ-TEL) for RJ11 outlets
- **Type dropdown separator**: Changed from ` — ` (em-dash) to ` - ` (short dash)
- **Table header**: "Pos" → "Order/Rack Pos/ID#"
- **Table Links column removed**: Header, body cell, sort case, and `isAdmin` variable all deleted
- **Monitoring simplified to ON/OFF**: Removed `monitoringMethod` dropdown (was Auto/SNMP/Ping/Kuma/Manual/No) — now single checkbox `Monitoring ON`
- **IP field placeholder**: Changed from `192.168.1.1/24` to `192.168.1.1`
- **Device detail IP display**: `buildNetworkInfo()` uses `displayIp = mask ? ipOnly : ip` — strips /mask when separate mask exists
- **Monitoring badge in detail**: Shows "📡 ON" instead of method name
- **Manager/dialog titles**: English (`Group Manager`, `Type Manager`)
- `saveDevice()`: Strips `/mask` from IP, saves mask separately, no `monitoringMethod`
- `editDevice()`: Extracts `/XX` suffix from legacy IP into separate Mask field
- `clearDeviceForm()`: No monitoringMethod, no toggleMonitoringMethod references
- IP display in card/table views: Strips `/mask` suffix when `d.mask` exists

### Removed
- `toggleMonitoringMethod()` function — dead code after simplification
- `deviceMonitoringMethod` select element
- `monitoringMethodContainer` div
- `monitoringMethod` field from save/edit/clear flows
- `hostname` as separate field (merged into `name`)
- `dns1`/`dns2` fields (deferred)
- Links column from device table
- `isAdmin` variable from table rendering
- `linksHtml` variable from table rendering
- Laptop (LAP) and WLC device types

### Audit
- **45/45 items PASS** — Forward audit (code→HTML) and reverse audit (HTML→code) both clean
- Zero dead code, zero orphan references, zero inconsistencies

---

## [4.0.000] — 2026-02-11

### Added
- **Group Entity System**: Groups (`appState.groups[]`) are now first-class entities with: id, code, name, locationId, isRack, rackUnits, color, order, description
- **16 group functions**: `getGroupByCode()`, `getGroupById()`, `getGroupsForLocation()`, `groupSortFn()`, `generateGroupId()`, `createGroupEntity()`, `getGroupDisplayLabel()`, `getGroupColor()`, `migrateToGroupSystem()`, `updateGroupSelect()`, `onDeviceLocationChange()`, `quickAddGroup()`, `openGroupManager()`, `quickAddGroupFromManager()`, `editGroup()`, `deleteGroup()`
- **Group Manager UI**: SweetAlert2 modal showing groups organized by location, with create/edit/delete operations
- **Quick Add Group**: Button "+" next to group select — opens SweetAlert2 dialog to create a group on the fly with code, name, location, isRack, rackUnits
- **Location→Group cascade**: Changing location in device form auto-filters the group select
- **Auto-migration**: `migrateToGroupSystem()` extracts unique `rackId` values from devices and creates group entities (11 groups from 101 devices in real data)
- **Group persistence**: Groups saved/loaded via localStorage (`networkGroups`), server (`serverSave`/`serverLoad`), JSON export/import (`exportJSON`/`importData`)
- **Device Prefix System**: 26 standard prefixes (SW, RT, FW, SRV, etc.) displayed before device names everywhere — tables, cards, matrix, topology, floor plan, exports, tooltips, search results, print views
- **Custom Prefix Creation**: SweetAlert2 dialog to create user-defined prefixes with code, Italian label, and English tooltip
- **`getDeviceDisplayName(device)`**: Standard function for rendering device names with prefix across 45+ display points in 7 files
- **`getDeviceRawName(device)`**: Utility to extract name without prefix (for editing)
- **5 new device types**: `wlc` (Wireless Controller), `poe` (PoE Injector/Switch), `dvr` (DVR/NVR), `iot` (IoT Device), `tst` (Test Bench)
- **Prefix field in device form**: New `<select id="devicePrefix">` with auto-selection based on device type
- **Auto-prefix migration**: `normalizeDataCase()` automatically populates `prefix` from `type` for legacy devices
- **Custom prefixes persistence**: Saved/loaded via localStorage, JSON export/import, and server sync
- **Italian UI labels**: All device form labels, buttons, and messages translated to Italian
- **Professional documentation**: New `doc/README.md` with architecture, data model, conventions, API reference; `doc/CHANGELOG.md` (this file)
- **Documentation archive**: v3 docs archived to `doc/archive/v3/`

### Changed
- **Device form**: `rackId` text input → `deviceGroup` select (populated from group entities, with "+" quick-add and "⚙️" manager buttons)
- **Device form Location**: Added `onchange="onDeviceLocationChange()"` to cascade group filtering
- **Form buttons**: All buttons translated to Italian (Aggiungi, Annulla, Pulisci, Aggiorna)
- **Form labels**: All labels translated to Italian (Posizione, Gruppo, Ordine, Nome Dispositivo, Marca/Modello)
- `saveDevice()`: Reads group from `<select id="deviceGroup">`, syncs to hidden `rackId` field
- `editDevice()`: Calls `updateGroupSelect()` and sets group select value
- `clearDeviceForm()`: Resets group select, Italian button text
- `getGroupsByLocation()`: Now uses `appState.groups` entities (with fallback to legacy device scan)
- `serverSave()`: Includes `groups[]` and `nextGroupId` in payload
- `saveToStorage()` / `saveNow()`: Persist `groups[]` and `nextGroupId` to localStorage
- `loadFromStorage()`: Loads `networkGroups` and `nextGroupId` from localStorage
- `serverLoad()`: Loads groups from server data, calls `migrateToGroupSystem()`
- `exportJSON()`: Includes `groups[]` and `nextGroupId` in export payload
- `importData()`: Restores groups from import, calls `migrateToGroupSystem()`, includes in rollback state
- `initApp()`: Calls `migrateToGroupSystem()` and `updateGroupSelect()` after data load
- `updateUI()`: Calls `updateGroupSelect()` alongside other refresh functions
- `VALID_ENUMS.deviceTypes` expanded from 31 to 36 types
- `typeColors`, `typeLabels`, `typeBadgeColors` in `features.js` — added 5 new types, Italian labels
- `appState` JSDoc: Added Group schema documentation

### Files Modified
| File | Lines | Changes |
|------|-------|---------|
| `js/app.js` | 5,335 | +180 (prefix system, helpers, CRUD updates, persistence) |
| `index.html` | 4,169 | +20 (prefix field, new device types, Italian labels) |
| `js/ui-updates.js` | 2,792 | 21 display points updated to `getDeviceDisplayName()` |
| `js/features.js` | 4,893 | 5 display points + new type entries in 3 lookup objects |
| `js/device-detail.js` | 1,080 | 5 display points updated |
| `js/dashboard.js` | 1,210 | 3 display points updated |
| `js/floorplan.js` | 1,351 | 3 display points updated |
| `doc/README.md` | new | Complete v4 documentation |
| `doc/CHANGELOG.md` | new | This file |
| `doc/V4_MIGRATION_PLAN.md` | 491+ | Added implementation status table |

---

## [3.6.037] — 2026-02-10

> Last v3 release. Full history in `doc/archive/v3/`.

### Summary
- Final stable v3 release before v4 migration
- 101 devices, 93 connections, 22 locations, 22 rooms
- All v3 features functional: topology, matrix, floor plan, export, import
