# Release Notes - TIESSE Matrix Network v3.6.032

**Release Date:** February 9, 2026  
**Type:** Feature Release  
**Status:** Production Ready

---

## 🎯 Highlights

This release focuses on **Device Detail Modal redesign** and **Zone System expansion**, providing a more realistic port visualization and improved network segmentation capabilities.

---

## ✨ New Features

### 1. Device Detail Modal Redesign

#### RJ45-Style Port Visualization
- Realistic hardware appearance matching physical switch ports
- LED indicators on each port showing connection status
- T-shaped connector design for authentic look

#### Port Specifications
| Port Type | Size | Visual |
|-----------|------|--------|
| RJ45 (LAN/WAN/MGMT) | 26x34px | Rectangular with clip tab |
| SFP/SFP+ | 36x26px | Cage style with slot |
| Console | 30x26px | Blue rectangular |

#### LED Color Scheme
| Status | Color | Hex |
|--------|-------|-----|
| Connected | Green | #22c55e |
| Disconnected | Red | #ef4444 |
| Disabled | Gray | #374151 |

### 2. Smart Port Layout

- **Automatic classification**: Ports separated into LAN (left) and Special (right)
- **Special port groups**: WAN, SFP, MGMT, Console with labels
- **2-row layout**: Switches with >12 ports display odd/even rows
- **Horizontal special ports**: No more vertical stacking

### 3. Improved Tooltips

- Shows **only destination info** (removed redundant source device)
- **No tooltip on disconnected ports** (clean UI)
- Format: `port ⟷ port | DeviceName`

### 4. Zone/Connection Type System

#### New Connection Types
Added 8 new connection types for better network segmentation:

| Type | Emoji | Color | Use Case |
|------|-------|-------|----------|
| vlan | 🔷 | #3b82f6 Blue | VLAN tagging |
| vpn | 🔒 | #06b6d4 Cyan | VPN tunnels |
| cloud | ☁️ | #60a5fa Light Blue | Cloud services |
| servers | 🖥️ | #8b5cf6 Purple | Server segment |
| iot | 📡 | #a855f7 Purple | IoT devices |
| guest | 👥 | #f97316 Orange | Guest network |
| voice | 📞 | #eab308 Yellow | VoIP/Voice |
| test | 🧪 | #ec4899 Pink | Test/Prova |

#### Full Connection Type List (18 total)
`lan`, `wan`, `dmz`, `vlan`, `trunk`, `vpn`, `cloud`, `management`, `servers`, `iot`, `guest`, `voice`, `backup`, `fiber`, `test`, `wallport`, `external`, `other`

### 5. Quick Access Buttons (Guacamole)

- All remote access via Guacamole API (not direct links)
- API paths tried: `/guacamole/api`, `/api/guacamole`, `/Matrix/api/guacamole`
- Fallback to direct protocol only if Guacamole unavailable
- Buttons: 🌐 WEB | 📟 SSH | 🖥️ RDP | 📺 VNC | 📞 TEL | ✏️ EDIT

### 6. Zone Display in Device Detail

- Shows only **existing zones** from device connections
- Zones inferred from `connections.type` (not device addresses)
- Color-coded badges matching connection type colors
- Empty message if no connections exist

---

## 🔧 Improvements

### UI/UX
- Modal width increased to 1100px for better port visualization
- Port numbers use smaller font (8px) for cleaner appearance
- Special port groups with header labels (WAN, SFP, MGMT, CON)
- Zone badges use transparent borders for elegance

### Code Quality
- Port classification logic with regex patterns
- Consistent color scheme across all components
- Updated VALID_ENUMS with all new connection types
- Clean separation of LAN vs special port rendering

---

## 📁 Files Changed

| File | Changes |
|------|---------|
| js/app.js | Updated version, VALID_ENUMS, SUPPORTED_VERSIONS |
| js/device-detail.js | Complete redesign (1,032 lines) |
| index.html | New connection type options in dropdown |
| package.json | Version bump to 3.6.032 |
| All JS files | Version header updated |

---

## 🔄 Migration Notes

### No Breaking Changes
- All existing data remains compatible
- New connection types are additive (don't affect existing `lan`, `wan`, etc.)
- Device address zones are preserved but not primary source

### Recommended Actions
1. **Test new connection types**: Try `dmz`, `vpn`, `test` on some connections
2. **Review port tooltips**: Verify they show expected destination info
3. **Check Guacamole integration**: Ensure API paths work in your environment

---

## 📊 Code Metrics

| Metric | v3.6.031 | v3.6.032 | Delta |
|--------|----------|----------|-------|
| device-detail.js | 1,018 lines | 1,032 lines | +14 |
| app.js | 4,988 lines | 4,988 lines | 0 |
| Connection Types | 10 | 18 | +8 |
| Total JS | ~17,800 | ~18,000 | +200 |

---

## 🐛 Bug Fixes

- Fixed port visualization showing only numbers (not full port names)
- Fixed zone display showing "Native" and "Free" incorrectly
- Fixed special ports stacking vertically instead of horizontally
- Fixed Guacamole buttons using direct links instead of API

---

## 📚 Documentation

- **BLUEPRINT.md**: Complete rewrite with all v3.6.032 features
- **README.md**: Updated with new version highlights
- **RELEASE_NOTES_v3.6.032.md**: This file

---

## 🔜 Next Steps

Potential improvements for future versions:
- [ ] Port-level VLAN configuration
- [ ] Bulk connection type assignment
- [ ] Zone-based filtering in device list
- [ ] Statistics by zone/connection type

---

**Backup:** `Archives/bkp/Matrix_v3.6.031_20260209_*.tar.gz`

---

*TIESSE Matrix Network Team*  
*February 9, 2026*
