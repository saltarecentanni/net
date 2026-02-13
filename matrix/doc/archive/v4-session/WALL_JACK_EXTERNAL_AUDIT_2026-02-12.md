# 🔍 WALL JACK & EXTERNAL AUDIT - Complete Analysis
**Date:** February 12, 2026  
**Status:** CRITICAL ISSUES IDENTIFIED  
**Model:** Current vs Expected

---

## Executive Summary

Wall Jacks e Externals **NOT implemented as real bidirectional devices**:

| Aspect | Current ❌ | Expected ✅ |
|--------|-----------|-----------|
| **Device Type** | String in `externalDest` | Real device (type: `walljack` / `external`) |
| **Device Real Instance** | 0 devices | 23 Wall Jacks + 12 Externals = 35 devices |
| **Can originate conn?** | ❌ NO (terminal only) | ✅ YES (bidirectional) |
| **Multiple connections** | 1 per "device" | ✅ Multiple (in + out) |
| **Has roomId?** | ❌ MISSING (14 WJ + 6 Ext) | ✅ REQUIRED |
| **Port definition** | None | ✅ 2+ ports |
| **Device dropdown** | Special hardcoded | ✅ Normal device list |

---

## FORWARD CHECK - Current State Analysis

### 1️⃣ Device Structure
```
Total devices in system: 101
  ├─ Real devices: 101
  ├─ Wall Jacks as devices: 0 ❌ MISSING (should be ~23)
  └─ Externals as devices: 0 ❌ MISSING (should be ~12)

ISP devices (WRONG TYPE):
  ├─ ID 3: Huawei TIM (type: 'isp') - should be 'external'
  └─ ID 8: IMOLA-SGR-FWA-WIND (type: 'isp') - should be 'external'
```

### 2️⃣ Connection Structure
```
Total connections: 93
├─ Normal device-to-device: 73
├─ WallJack connections: 14 ❌ BROKEN
│  ├─ Data: from={device} → externalDest={string}
│  ├─ Problem 1: to=null (not bidirectional)
│  └─ Problem 2: ALL 14 MISSING roomId (100% failure rate)
│
└─ External connections: 6 ❌ BROKEN
   ├─ Data: from={device} → externalDest={string}
   ├─ Problem 1: to=null (not bidirectional)
   └─ Problem 2: 4/6 MISSING roomId (67% failure rate)
```

### 3️⃣ Data Integrity Status
```
Wall Jack Connections (14 total):
  ✅ Valid 'from' device: 14/14 (100%)
  ✅ Valid 'externalDest': 14/14 (100%)
  ❌ Valid 'roomId': 0/14 (0%)  ← CRITICAL
  ❌ Bidirectional: 0/14 (0%)   ← CRITICAL

External Connections (6 total):
  ✅ Valid 'from' device: 6/6 (100%)
  ✅ Valid 'externalDest': 6/6 (100%)
  ❌ Valid 'roomId': 2/6 (33%)  ← HIGH
  ❌ Bidirectional: 0/6 (0%)    ← CRITICAL
```

### 4️⃣ Connection Examples

**Wall Jack (CURRENT - BROKEN):**
```javascript
{
  "from": 10,           // Router device ID
  "fromPort": "eth11",
  "to": null,           // ❌ BROKEN - should be Wall Jack device ID
  "toPort": "",
  "externalDest": "Z4 - Sala Reunioni",  // ❌ String, not device ID
  "isWallJack": true,
  "roomId": null,       // ❌ EMPTY - should have room
  "type": "wallport"
}
```

**External (CURRENT - BROKEN):**
```javascript
{
  "from": 3,            // ISP device ID
  "fromPort": "WAN04",
  "to": null,           // ❌ BROKEN - should be next device or ISP device
  "toPort": "",
  "externalDest": "TIMxxxx",  // ❌ String, not device ID
  "isWallJack": false,
  "roomId": null,       // ❌ EMPTY
  "type": "wan"
}
```

**Wall Jack (EXPECTED - CORRECT):**
```javascript
// SIDE 1: Router X → Wall Jack Z4
{
  "from": 10,           // Router X
  "fromPort": "eth11",
  "to": 102,            // Wall Jack Device ID 102 ✅
  "toPort": "port1",    // WJ first side
  "isWallJack": false,  // Now it's a normal device
  "roomId": "room-4",
  "type": "wallport"
}

// SIDE 2: Wall Jack Z4 → Router Y
{
  "from": 102,          // Wall Jack Device ID ✅
  "fromPort": "port2",  // WJ second side
  "to": 45,             // Router Y
  "toPort": "eth01",
  "isWallJack": false,
  "roomId": "room-4",
  "type": "wallport"
}
```

**External (EXPECTED - CORRECT):**
```javascript
// SIDE 1: Router/Device → ISP Device (Fiber entry)
{
  "from": 3,            // ISP Modem Device ✅
  "fromPort": "port1",  // ISP first port
  "to": 50,             // Device receiving Internet
  "toPort": "wan01",
  "roomId": "room-telecom",
  "type": "wan"
}

// SIDE 2: ISP Device → VPN/Cloud (alternative path)
{
  "from": 3,            // ISP Device
  "fromPort": "port2",  // ISP second port
  "to": 12,             // VPN endpoint
  "toPort": "vpn01",
  "roomId": "room-telecom",
  "type": "vpn"
}
```

---

## REVERSE CHECK - Data Persistence Verification

### Current Data Layer Issues
```
Operation: Load network_manager.json
Result: ❌ INCONSISTENT

Issues found:
1. Wall Jack roomId ALL NULL (14/14 affected)
2. External roomId PARTIAL NULL (4/6 affected)
3. String IDs in externalDest will break if we create real devices
4. Form saves externalDest but should save numeric device ID
```

### What Will Break If We Create Real Wall Jack Devices
```javascript
// Current app.js logic (will BREAK):
if (isWallJack) {
    connData.externalDest = externalDest;  // ❌ Saves string
}

// Should be:
if (isWallJack) {
    connData.to = wallJackDeviceId;  // ✅ Save device ID
    connData.toPort = selectedPort;
}

// Current connection reconstruction (will FAIL):
for (var c in connections) {
    if (c.externalDest) {
        // ❌ Tries to find device by STRING, not ID
    }
}

// Should be:
for (var c in connections) {
    if (c.to && isWallJackDevice(c.to)) {
        // ✅ Normal device ID reference
    }
}
```

---

## RUNTIME CHECK - Application Behavior

### Form Behavior (CURRENT - BROKEN)
```
1. User selects Device: "🔌 Wall Jack / Presa LAN"
2. Form shows TWO Location fields:
   - Destination Location (normal device dropdown)
   - Wall Jack Room (special dropdown)
   ❌ CONFUSING - which one to use?

3. User enters "Z1" in Wall Jack ID field
4. Save creates connection with:
   - to: null
   - externalDest: "Z1"
   - roomId: null (EMPTY) - BUG!

5. On page refresh:
   ❌ Wall Jack not found in device dropdown
   ❌ Connection appears broken in connection list
```

### Form Behavior (EXPECTED - CORRECT)
```
1. User selects Device: "Wall Jack Z1" from dropdown
   - Wall Jacks appear as normal devices
   - No special "Wall Jack ID" field needed

2. Form shows NORMAL structure:
   - Location: [filtered by first dropdown]
   - Group: [filtered by location]
   - Device: Wall Jack Z1 (real device)
   - Port: [W J available ports]

3. User selects ports normally
4. Save creates connection with:
   - from: router_device_id
   - fromPort: eth11
   - to: wj_device_id (102)
   - toPort: port1
   - roomId: auto-filled from device

5. On page refresh:
   ✅ Connection appears correctly
   ✅ Can edit both sides independently
```

---

## CODE ANALYSIS - Affected Modules

### app.js Issues
```javascript
// Line 3564-3566: BROKEN LOGIC
var isWallJack = (toDeviceVal === 'walljack');  // ❌ String comparison
var to = (toDeviceVal && !isExternal && !isWallJack) ? parseInt(toDeviceVal, 10) : null;

// Should be:
var isWallJackDevice = (d && d.type === 'walljack');  // Check device type
var to = toDeviceVal ? parseInt(toDeviceVal, 10) : null;  // Normal device ID

// Line 3645-3652: BROKEN ROOM ASSIGNMENT
if (isWallJack || isExternal) {
    var roomId = roomSelect.value;  // ❌ Gets value, but field is hidden for External
}

// Should be:
var roomId = null;
if (isWallJackDevice || isExternalDevice) {
    roomId = device.location || roomSelect.value;  // Use device's location
}

// Line 4295+: BROKEN DEVICE POPULATION
opts += '<option value="walljack">🔌 Wall Jack</option>';  // ❌ Special string
opts += '<option value="external">📡 External/ISP</option>';  // ❌ Special string

// Should be:
// Just list wall jack DEVICES normally like any other device
// No special options needed because they're real devices
```

### features.js Issues
```javascript
// Line 1860-1910: VIRTUAL WALL JACK CREATION
// ❌ Creates virtual devices from externalDest strings
var wallJackMap = {};
if (c.to || !c.externalDest || !c.isWallJack) return;  // ❌ Wrong logic
virtualWallJacks.push({
    id: 'walljack-' + wjKey,
    name: c.externalDest,  // ❌ From string
    type: 'walljack'
});

// Should be:
// Get actual wall jack devices from appState.devices
// No virtual creation needed
```

### index.html Issues
```html
<!-- Line 531-600: DESTINATION FORM REDUNDANCY -->
<!-- ❌ Has TWO Location fields for Wall Jack:
     1. toLocation (normal device location)
     2. wallJackRoomId (wall jack specific room)
     
This is confusing because Wall Jack should use normal Device location
-->

<!-- Should be: Just one location field (from device), no special wall jack room
```

---

## REQUIRED FIXES - Implementation Plan

### Phase A: Create Wall Jack Devices (PREREQUISITE)

**Action:**
1. Create 23 real Wall Jack devices in network_manager.json
   - Type: 'walljack' or 'walljack_tel'
   - Name: "Wall Jack Z1", "Wall Jack Z2", etc.
   - Location: mapped from current externalDest room
   - Ports: 2 ports minimum (entry + exit)

2. Create 12 real External/ISP devices
   - Type: 'external'
   - Name: "TIM Fiber", "WIND WAN", etc.
   - Location: "Telecomunicazioni" or similar
   - Ports: 2+ ports

**Data Migration:**
```javascript
// Current:
connection.to = null
connection.externalDest = "Z1 - Sala Riunioni"

// After:
connection.to = 102  // Wall Jack device ID
connection.externalDest = null
```

### Phase B: Fix Connection Form

**Remove:**
- Wall Jack ID textbox (not needed - use device dropdown)
- Special External field (use normal device)
- toggleExternalDest() function (not needed)
- wallJackRoomContainer (redundant)

**Simplify to:**
- Normal device dropdown (including Wall Jacks as devices)
- Normal port selection

### Phase C: Update app.js Logic

**Replace:**
- isWallJack flag checks with device type checks
- externalDest string handling with device ID handling
- Special room assignment with device's normal location

### Phase D: Fix All 20 Broken Connections

**With missing roomId:**
- 14 Wall Jack connections
- 4-6 External connections

**Fix: Add roomId from device.location**

---

## VALIDATION CHECKLIST

- [ ] Wall Jack devices created as real devices (type: 'walljack')
- [ ] External devices created as real devices (type: 'external')
- [ ] All 20 connections have valid roomId values
- [ ] Connection form simplified (no special fields)
- [ ] Wall Jacks appear in device dropdown like normal devices
- [ ] Can create bidirectional connections (WJ as 'from' and 'to')
- [ ] Form validation works for wall jack devices
- [ ] Data persists after page refresh
- [ ] Group dropdown shows wall jack groups correctly
- [ ] No JavaScript errors in console
- [ ] All 93 connections load correctly
- [ ] Topology view renders correctly with real WJ devices

---

## Summary

**CRITICAL ISSUES FOUND:**
- ❌ 0 Wall Jack devices (should be 23)
- ❌ 0 External devices (should be 12)
- ❌ 14 Wall Jack connections missing roomId
- ❌ 4-6 External connections missing roomId
- ❌ No bidirectional capability (WJ/Ext only terminal)
- ❌ Form has redundant fields (2 Location dropdowns)

**NEXT STEPS:**
1. Create device migration script
2. Fix connection data
3. Simplify form
4. Test forward + reverse + runtime + reverse again
