# Tiesse Matrix Network - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2025-12-16

### Added
- **24 rack colors**: Expanded from 12 to 24 automatic colors for rack identification
- **Device dropdown with rack colors**: Device selection dropdowns now show rack color indicators
- **nextDeviceId in export/import**: Full preservation of device ID sequence across backups

### Changed
- **Notes display**: Simplified to gray italic text (removed amber icon)
- **Edit field highlighting**: Lighter colors (#f8fafc background, #93c5fd border)
- **IP display**: Line breaks between IPs instead of pipe separator
- **Print ID column**: Hidden during printing for cleaner output

### Fixed
- **Export/Import cycle**: Complete data integrity including nextDeviceId field
- **Port validation**: Proper handling of empty ports and disabled connections
- **Data structure verification**: Full integrity checks for devices and connections

---

## [2.1.1] - 2025-12-16

### Changed
- **Rack Position in cards**: Now displays as blue pill badge matching Active Connections style
- **Arrow shadow**: Enhanced ⟷ arrow with multiple shadows for better visibility

---

## [2.1.0] - 2025-12-16

### Added
- **Print buttons**: Print Matrix and Print Active Connections with proper styling
- **Print color support**: CSS for printing background colors
- **No connections warning**: Orange border and warning for devices without connections
- **Notes column**: Notes now displayed in same row (Active Connections table)

### Changed
- **Project name**: Renamed to "Tiesse Matrix Network"
- **IP formatting**: Comma-separated format (IP: 10.10.0.0/16, 172.16.10.254)
- **Rack Position**: Simplified display without formatting
- **Edit/Del buttons**: Hidden when printing (no-print class)

### Fixed
- Sticky column z-index for matrix scrolling
- Notes display no longer confuses rows

---

## [2.0.0] - 2025-12-15

### Added
- **Connection Matrix**: Visual NxN grid showing all device interconnections
- **Horizontal port display**: Ports shown as `eth1 ⟷ eth13` with colored elements
- **Drag-to-scroll**: Grab and drag to navigate large matrices
- **Cable markers**: Visual pills showing physical cable labels with colors
- **Arrow indicator**: Yellow bidirectional arrow (⟷) between ports in matrix and table
- **Active Connections tab**: Dedicated view for connection management
- **Sortable columns**: Click headers to sort in Active Connections table
- **Rack color coding**: Automatic colors based on rack ID
- **Form field highlighting**: Gray background when editing existing items
- **Connection counter**: Shows total number of connections

### Changed
- **UI Layout**: Full-width responsive design
- **Tab system**: Three tabs (Devices, Matrix & Connections, Active Connections)
- **Matrix headers**: Dark headers (top) and light headers (left) for better readability
- **Port colors**: Source port light (#e5e7eb), Destination port dark (#374151)
- **Version**: Updated to 2.0.0
- **Language**: All UI and comments now in English

### Removed
- "Working Offline" indicator (replaced with "Auto-save: LocalStorage + Server")
- SVG connection lines (removed due to visual complexity)
- Vertical port layout (replaced with horizontal)

### Fixed
- Port display using correct field names (from/fromPort/to/toPort)
- Matrix cell overflow with proper sizing (90x70px)
- Cache issues with meta tags for cache control

---

## [1.0.0] - 2025-12-14

### Added
- Initial release
- Device management (CRUD operations)
- Port configuration per device
- Network address management (Network, IP, VLAN)
- Connection management between devices
- Export to Excel (XLSX format)
- Export/Import JSON for backup
- LocalStorage persistence
- Server persistence via PHP (data.php)
- Device types: Router, Switch, Firewall, Server, Access Point, ISP, Others
- Connection types: LAN, WAN, Trunk, Management, Fiber, Serial
- Device status: Active/Disabled
- Responsive design with Tailwind CSS

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 2.2.0 | 2025-12-16 | 24 rack colors, improved export/import, UI polish |
| 2.1.0 | 2025-12-16 | Print support, notes column |
| 2.0.0 | 2025-12-15 | Matrix view, tabs, enhanced UI |
| 1.0.0 | 2025-12-14 | Initial release |

---

## Upgrade Notes

### From 1.x to 2.0.0
- No data migration required
- JSON format unchanged
- Simply replace files and refresh browser
- Clear browser cache if UI doesn't update (Ctrl+Shift+R)
