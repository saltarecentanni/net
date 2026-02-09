# 🏢 Room & Location Data Structure

**Version:** 3.6.035  
**Date:** February 9, 2026  
**Note:** Room & Location structures have been stable since v3.6.026. This documentation remains accurate for the current implementation.

---

## 1. Overview

The location management system is divided into two levels:

### 1.1 Rooms (Floor Plan)
Rooms in the Floor Plan allow you to:
- Map physical areas on the building plan
- Associate devices with rooms
- View per-room statistics
- Manage nicknames for easy identification

### 1.2 Locations (v3.5.005+)
The location system allows:
- **Mapped Locations** (0-19): Linked to Floor Plan rooms
- **Custom Locations** (21+): User-defined locations not mapped to a room
- Independent location persistence
- Management via Location Manager

---

## 2. Data Structure

### 2.1 Room Object (Floor Plan Geometry)

```json
{
  "id": "8",
  "name": "8",
  "nickname": "Sala Server",
  "type": "server",
  "area": 50,
  "capacity": 20,
  "description": "Main server room with racks and network equipment",
  "color": "rgba(239,68,68,0.15)",
  "polygon": [
    {"x": 760, "y": 281},
    {"x": 1010, "y": 281},
    {"x": 1010, "y": 521},
    {"x": 760, "y": 521}
  ],
  "notes": "Temperature controlled, restricted access"
}
```

### 2.2 Room Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique room identifier |
| `name` | string | ✅ | Original name/number |
| `nickname` | string | ❌ | Descriptive name (e.g., "Sala Server") |
| `type` | string | ❌ | Room type (see section 3) |
| `area` | number | ❌ | Area in m² |
| `capacity` | number | ❌ | Device capacity |
| `description` | string | ❌ | Detailed description |
| `color` | string | ❌ | Polygon RGBA color |
| `polygon` | array | ❌ | Vertex coordinates [{x,y}] |
| `notes` | string | ❌ | Additional notes |

### 2.3 Location Object (v3.5.005+)

```json
{
  "id": 21,
  "siteId": null,
  "code": "MAG-ESTERNO",
  "name": "Magazzino Esterno",
  "type": "warehouse",
  "roomRef": null,
  "color": "#34d399"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | ✅ | Unique ID (0-19=mapped, 21+=custom) |
| `siteId` | number | ❌ | Site reference (future use) |
| `code` | string | ✅ | Unique short code |
| `name` | string | ✅ | Descriptive name |
| `type` | string | ❌ | Location type |
| `roomRef` | string | ❌ | Reference to room.id if mapped |
| `color` | string | ❌ | Custom hex color |

### 2.4 Rooms vs Locations

| Aspect | Rooms | Locations |
|--------|-------|-----------|
| **Purpose** | Floor Plan geometry | Logical organization |
| **ID Range** | String (any) | 0-19 mapped, 21+ custom |
| **Storage** | `appState.rooms` | `appState.locations` |
| **Visual** | Polygons on floor plan | Dropdowns/filters |
| **Editing** | Floor Plan Mode | Location Manager |

---

## 3. Room Types

| Type | Label | Default Color |
|------|-------|---------------|
| `server` | Server Room | `rgba(239,68,68,0.15)` (red) |
| `office` | Office | `rgba(59,130,246,0.15)` (blue) |
| `storage` | Storage | `rgba(34,197,94,0.15)` (green) |
| `meeting` | Meeting Room | `rgba(168,85,247,0.15)` (purple) |
| `production` | Production | `rgba(249,115,22,0.15)` (orange) |
| `datacenter` | Data Center | `rgba(185,28,28,0.15)` (dark red) |
| `network` | Network Room | `rgba(6,182,212,0.15)` (cyan) |
| `other` | Other | `rgba(107,114,128,0.15)` (gray) |

---

## 4. Device-Room Association

### 4.1 How It Works

Devices are associated with rooms via the `location` field:

```
Device.location ←→ Room.nickname (or Room.name)
```

**Example:**
- Room: `{ id: "8", nickname: "Sala Server" }`
- Device: `{ location: "Sala Server" }` → belongs to that room

### 4.2 Helper Function

```javascript
function deviceBelongsToRoom(device, room) {
    if (!device || !device.location || !room) return false;
    var normalize = function(str) {
        return (str || '').toLowerCase().replace(/\s+/g, '');
    };
    var deviceLoc = normalize(device.location);
    var roomNickname = normalize(room.nickname || room.name || room.id);
    return deviceLoc === roomNickname;
}
```

**Behavior:**
- Case-insensitive ("Sala Server" = "sala server")
- Ignores extra whitespace ("Sala  Server" = "SalaServer")
- Fallback chain: nickname → name → id

### 4.3 Utility Functions

```javascript
// Count devices in a room
function countDevicesInRoom(room) {
    return appState.devices.filter(function(d) {
        return deviceBelongsToRoom(d, room);
    }).length;
}

// Get all devices in a room
function getDevicesInRoom(room) {
    return appState.devices.filter(function(d) {
        return deviceBelongsToRoom(d, room);
    });
}
```

---

## 5. Nickname Synchronization

When a room's nickname is changed, all associated devices are updated automatically:

```javascript
// On nickname save
var oldNickname = room.nickname || room.name;
var newNickname = input.value.trim();

// Update location for all associated devices
appState.devices.forEach(function(device) {
    if (deviceBelongsToRoom(device, { nickname: oldNickname, name: room.name })) {
        device.location = newNickname;
    }
});

room.nickname = newNickname;
```

---

## 6. Room Info Modal

Clicking a room on the Floor Plan shows a modal with:

### 6.1 Header
- Room name (nickname or name)
- Room type badge

### 6.2 Statistics
| Statistic | Description |
|-----------|-------------|
| 📊 Total Devices | Number of devices in the room |
| 🔗 Connections | Number of device connections |
| 📦 Capacity | Configured capacity |
| ⚠️ Errors | Devices with issues (if any) |
| 📍 Area | Area in m² |

### 6.3 Device List
For each device:
- SVG icon by type
- Device name
- Status badge (Active/Disabled)
- Links (if any)
- Rack/position info

### 6.4 Nickname Field
- Editable input
- Save on Enter or blur
- Automatically syncs device locations

---

## 7. Floor Plan API

### 7.1 Initialization

```javascript
FloorPlan.init();  // Loads rooms from appState.rooms
```

### 7.2 Room Management

```javascript
// Set rooms (for import)
FloorPlan.setRooms(newRoomsArray);

// Get rooms
var rooms = FloorPlan.getRooms();

// Save rooms
saveRoomsData();  // Internal, calls serverSave()
```

### 7.3 Zoom & Navigation

```javascript
FloorPlan.zoom(0.1);    // Zoom in
FloorPlan.zoom(-0.1);   // Zoom out
FloorPlan.resetZoom();  // Reset to default
```

### 7.4 Export

```javascript
FloorPlan.exportToPNG();  // Export as PNG image
```

---

## 8. Persistence

### 8.1 Storage Location

Rooms are stored in `network_manager.json`:

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 140
}
```

### 8.2 Save Flow

```
User edits room
       ↓
saveRoomsData()
       ↓
appState.rooms = rooms
       ↓
serverSave()  →  POST /data
       ↓
network_manager.json updated
```

### 8.3 Load Flow

```
Page load
    ↓
serverLoad()  →  GET /data
    ↓
appState.rooms = data.rooms
    ↓
FloorPlan.init()
    ↓
renderRooms()
```

---

## 9. Import/Export

### 9.1 JSON Export

Rooms are included in JSON exports:

```json
{
  "devices": [...],
  "connections": [...],
  "rooms": [...],
  "nextDeviceId": 140,
  "exportedAt": "2026-02-01T12:00:00.000Z",
  "version": "3.3.2"
}
```

### 9.2 JSON Import

Import validates rooms:

```javascript
// Validation
if (data.rooms && !Array.isArray(data.rooms)) {
    Toast.error('Invalid JSON: "rooms" must be an array');
    return;
}

// Per-room validation
for (var r = 0; r < data.rooms.length; r++) {
    var room = data.rooms[r];
    if (!room.id || !room.name) {
        Toast.error('Invalid room at index ' + r);
        return;
    }
}

// Import
appState.rooms = data.rooms || [];

// Sync Floor Plan
if (FloorPlan.setRooms) {
    FloorPlan.setRooms(appState.rooms);
}
```

### 9.3 Excel Export

Rooms have a dedicated worksheet:

| Column | Description |
|--------|-------------|
| ID | Unique identifier |
| Name | Original name |
| Nickname | Descriptive name |
| Width | Width |
| Height | Height |
| X | X coordinate |
| Y | Y coordinate |
| Color | RGBA color |
| Devices | Device count |
| Notes | Notes |

---

## 10. Polygon

### 10.1 Format

Array of {x, y} points defining the vertices:

```json
"polygon": [
  {"x": 760, "y": 281},
  {"x": 1010, "y": 281},
  {"x": 1010, "y": 521},
  {"x": 760, "y": 521}
]
```

### 10.2 Coordinate System

- Origin (0,0): top-left corner
- X: increases to the right
- Y: increases downward
- SVG ViewBox: depends on the floor plan image

### 10.3 Mapping Tool

Use `/draw-rooms-v2.html` to create polygons:
1. Load the floor plan image
2. Click to add vertices
3. Close the polygon
4. Export the coordinates

---

## 11. Location System (v3.5.005+)

### 11.1 Automatic Migration

On startup, the system checks if locations exist. If absent, it runs migration:

```javascript
function migrateToNewLocationSystem() {
    if (!appState.locations) appState.locations = [];
    if (appState.locations.length > 0) return;
    
    // Create locations from existing rooms (ID 0-19)
    if (appState.rooms && appState.rooms.length > 0) {
        appState.rooms.forEach(function(room, index) {
            if (index < 20) {
                appState.locations.push({
                    id: index,
                    siteId: null,
                    code: room.name || room.id,
                    name: room.nickname || room.name || 'Room ' + room.id,
                    type: room.type || null,
                    roomRef: room.id,
                    color: null
                });
            }
        });
    }
    
    // Set nextLocationId for custom locations
    if (!appState.nextLocationId) {
        appState.nextLocationId = 21;
    }
}
```

### 11.2 Location Manager

```javascript
var LocationFilter = {
    init: function() { /* Setup dropdown */ },
    getLocations: function() { return appState.locations || []; },
    filterDevices: function(locationId) { /* Filter devices by location */ },
    syncWithRooms: function() { /* Sync mapped locations */ }
};
```

### 11.3 Custom Locations

Custom locations (ID ≥ 21) allow creating positions not mapped on the Floor Plan:

```javascript
function createCustomLocation(name, code, type) {
    var loc = {
        id: appState.nextLocationId++,
        siteId: null,
        code: code,
        name: name,
        type: type || null,
        roomRef: null,
        color: null
    };
    appState.locations.push(loc);
    return loc;
}
```

---

## 12. Current Statistics

| Statistic | Value |
|-----------|-------|
| Total rooms | 20 |
| Total devices | 81 |
| Devices in "Sala Server" | 75 |
| Devices in "Ufficio12" | 6 |

---

## 13. Examples

### 13.1 Create a New Room

```javascript
var newRoom = {
    id: "new-" + Date.now(),
    name: "New Room",
    nickname: "Meeting Room 1",
    type: "meeting",
    color: "rgba(168,85,247,0.15)",
    polygon: [],
    notes: ""
};
appState.rooms.push(newRoom);
saveRoomsData();
```

### 13.2 Change Nickname

```javascript
var room = appState.rooms.find(r => r.id === "8");
var oldNickname = room.nickname;

// Update associated devices
appState.devices.forEach(function(d) {
    if (d.location === oldNickname) {
        d.location = "New Name";
    }
});

room.nickname = "New Name";
saveRoomsData();
```

### 13.3 Count Devices

```javascript
var room = appState.rooms.find(r => r.nickname === "Sala Server");
var count = countDevicesInRoom(room);
console.log("Devices in Sala Server:", count);
```

---

**© 2026 Tiesse S.P.A. - All rights reserved**
