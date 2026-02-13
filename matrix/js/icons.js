/**
 * Matrix Icons - SVG Icon System
 * Version: 4.1.007
 * Replaces emoji icons with consistent, scalable, accessible SVG inline icons
 * Inspired by Lucide Icons design language (MIT)
 */
var MI = (function() {
    'use strict';

    // SVG path definitions (24x24 viewBox, stroke-based)
    var P = {
        // === UI Actions ===
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
        printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
        trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
        lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
        key: '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
        settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        'chevron-up': '<path d="m18 15-6-6-6 6"/>',
        'chevron-down': '<path d="m6 9 6 6 6-6"/>',
        'chevron-right': '<path d="m9 18 6-6-6-6"/>',
        'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
        'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
        'arrow-up-down': '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
        filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
        refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
        calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3 14 21"/>',
        grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>',
        'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
        'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
        user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
        'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
        note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/>',

        // === Device Types ===
        router: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M11 9v6M14.5 9v6M18 9v6"/>',
        'switch': '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
        server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="1" fill="currentColor" stroke="none"/>',
        wifi: '<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
        globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
        laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
        monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
        smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
        tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>',
        phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>',
        battery: '<rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2"/>',
        camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
        tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
        'hard-drive': '<path d="M22 12H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><circle cx="6" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="16" r="1" fill="currentColor" stroke="none"/>',
        package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
        plug: '<path d="M12 22v-5"/><path d="M9 7V2M15 7V2"/><rect x="6" y="7" width="12" height="5" rx="1"/><path d="M12 12v5"/>',
        'wall-jack': '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="7" y="8" width="10" height="8" rx="1"/><path d="M9 10v4M12 10v4M15 10v4"/>',
        hub: '<circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7"/><path d="M2 12h7M15 12h7"/>',
        modem: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V5M10 8V3M14 8V5"/><circle cx="7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="12" r="1" fill="currentColor" stroke="none"/>',
        'patch-panel': '<rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="6" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="10" r="1"/><circle cx="18" cy="10" r="1"/><circle cx="6" cy="14" r="1"/><circle cx="10" cy="14" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="18" cy="14" r="1"/>',

        // === Network ===
        zap: '<path d="M13 2 3 14h9l-1 10 10-12h-9l1-10z"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
        tag: '<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>',
        palette: '<circle cx="13.5" cy="6.5" r="2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.66-1.67H17c3.05 0 5.56-2.5 5.56-5.56C22.56 6.01 17.96 2 12 2z"/>',
        diamond: '<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>',
        wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',

        // === Navigation ===
        'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
        map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>',
        'bar-chart': '<path d="M12 20V10M18 20V4M6 20v-4"/>',
        layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
        signpost: '<path d="M12 3v3M18 13v-3a1 1 0 0 0-1-1H4l3-3M6 17v-3a1 1 0 0 1 1-1h13l-3-3M12 21v-4"/>',
        door: '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>',
        cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',

        // === Protocol ===
        terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
        video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
        repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
        'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',

        // === Indicators ===
        'circle-dot': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
        circle: '<circle cx="12" cy="12" r="10"/>',
        'chart-pie': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
        inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
        activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',

        // === Additional UI ===
        bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
        'corner-down-left': '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
        shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
        radio: '<circle cx="12" cy="12" r="2"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
        home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
        cable: '<path d="M4 9a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2V4"/><path d="M18 4v1a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v1"/><path d="M2 11v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1"/><path d="M4 16a2 2 0 0 1 2 2v2"/><path d="M18 20v-2a2 2 0 0 1 2-2"/>'
    };

    /**
     * Render an SVG icon
     * @param {string} name - Icon name from the P dictionary
     * @param {Object} [opts] - Options: size, color, fill, sw (stroke-width), cls (extra class)
     * @returns {string} SVG HTML string
     */
    function i(name, opts) {
        var o = opts || {};
        var p = P[name];
        if (!p) return '<span class="mi-missing" aria-hidden="true">[' + name + ']</span>';
        var sz = o.size || 16;
        var clr = o.color || 'currentColor';
        var f = o.fill || 'none';
        var sw = o.sw || 2;
        var cls = 'mi' + (o.cls ? ' ' + o.cls : '');
        return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="' + f + '" stroke="' + clr + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" class="' + cls + '" aria-hidden="true">' + p + '</svg>';
    }

    // =========================================================================
    // CENTRALIZED ICON MAPS (eliminates duplication across 6+ files)
    // =========================================================================

    /** Zone -> icon name mapping */
    var zoneIconMap = {
        'DMZ': 'shield', 'Backbone': 'link', 'LAN': 'building', 'WAN': 'globe',
        'VLAN': 'bar-chart', 'VPN': 'lock', 'Cloud': 'cloud', 'Guest': 'users',
        'IoT': 'router', 'Servers': 'server', 'Management': 'settings',
        'Voice': 'phone', 'Storage': 'hard-drive'
    };

    /** Device type -> icon name mapping (unified across all files) */
    var deviceIconMap = {
        router: 'router', switch: 'switch', switch_l2: 'switch', switch_l3: 'switch', switch_poe: 'switch',
        firewall: 'shield', server: 'server', server_rack: 'server', server_blade: 'server', vm_host: 'server',
        wifi: 'wifi', router_wifi: 'wifi', access_point: 'wifi', ap: 'wifi',
        isp: 'globe', gateway: 'globe', modem: 'modem',
        pc: 'monitor', laptop: 'laptop', workstation: 'monitor', desktop: 'monitor',
        phone: 'smartphone', tablet: 'tablet', ip_phone: 'phone',
        printer: 'printer', camera: 'camera', ups: 'battery', pdu: 'zap',
        nas: 'hard-drive', storage: 'hard-drive', san: 'hard-drive',
        tv: 'tv', display: 'monitor',
        patch: 'patch-panel', patch_panel: 'patch-panel',
        walljack: 'wall-jack', wall_jack: 'wall-jack',
        hub: 'hub', cloud: 'cloud',
        others: 'package', other: 'package'
    };

    /** Protocol -> icon name mapping (unified) */
    var protocolIconMap = {
        http: 'globe', https: 'globe', ssh: 'terminal', telnet: 'send',
        rdp: 'monitor', vnc: 'image', smb: 'folder', nfs: 'folder',
        ftp: 'upload', sftp: 'upload', other: 'link'
    };

    /** Protocol -> button style class */
    var protocolStyles = {
        http:   { cls: 'bg-blue-500 hover:bg-blue-600', label: 'Web' },
        https:  { cls: 'bg-blue-500 hover:bg-blue-600', label: 'HTTPS' },
        ssh:    { cls: 'bg-slate-700 hover:bg-slate-800', label: 'SSH' },
        telnet: { cls: 'bg-orange-600 hover:bg-orange-700', label: 'Telnet' },
        rdp:    { cls: 'bg-indigo-600 hover:bg-indigo-700', label: 'RDP' },
        vnc:    { cls: 'bg-emerald-600 hover:bg-emerald-700', label: 'VNC' },
        smb:    { cls: 'bg-amber-600 hover:bg-amber-700', label: 'SMB' },
        nfs:    { cls: 'bg-amber-600 hover:bg-amber-700', label: 'NFS' },
        ftp:    { cls: 'bg-cyan-600 hover:bg-cyan-700', label: 'FTP' },
        other:  { cls: 'bg-slate-500 hover:bg-slate-600', label: 'Link' }
    };

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    var api = {
        /**
         * Core icon render function
         * Usage: MI.i('search') or MI.i('server', {size: 24, color: '#fff'})
         */
        i: i,

        /**
         * Get zone icon SVG. Usage: MI.zone('LAN')
         */
        zone: function(z, opts) {
            var name = zoneIconMap[z] || 'help-circle';
            return i(name, opts);
        },

        /**
         * Get device type icon SVG. Usage: MI.device('router')
         */
        device: function(t, opts) {
            var name = deviceIconMap[(t || '').toLowerCase()] || 'package';
            return i(name, opts);
        },

        /**
         * Get protocol icon SVG. Usage: MI.protocol('ssh')
         */
        protocol: function(p, opts) {
            var name = protocolIconMap[(p || '').toLowerCase()] || 'link';
            return i(name, opts);
        },

        /**
         * Get icon name for device type. Usage: MI.deviceName('router') // 'router'
         */
        deviceName: function(t) {
            return deviceIconMap[(t || '').toLowerCase()] || 'package';
        },

        /**
         * Get protocol button style. Usage: MI.protoStyle('ssh') // { cls, label }
         */
        protoStyle: function(p) {
            return protocolStyles[(p || '').toLowerCase()] || protocolStyles.other;
        },

        // Expose maps for direct access
        zones: zoneIconMap,
        devices: deviceIconMap,
        protocols: protocolIconMap,
        protoStyles: protocolStyles,

        /**
         * Hydrate all [data-icon] spans in the DOM with SVG icons.
         * Classes determine size: mi-stat=24, mi-btn=14, mi-lbl=12
         * Usage: MI.hydrate() or MI.hydrate(containerEl)
         */
        hydrate: function(root) {
            var els = (root || document).querySelectorAll('[data-icon]');
            for (var j = 0; j < els.length; j++) {
                var el = els[j];
                var name = el.getAttribute('data-icon');
                if (!name || el.getAttribute('data-hydrated')) continue;
                var sz = el.classList.contains('mi-stat') ? 24 :
                         el.classList.contains('mi-btn') ? 14 : 12;
                var clr = el.getAttribute('data-icon-color') || 'currentColor';
                el.innerHTML = i(name, { size: sz, color: clr });
                el.style.display = 'inline-flex';
                el.style.verticalAlign = 'middle';
                el.style.alignItems = 'center';
                el.setAttribute('data-hydrated', '1');
            }
        }
    };

    // Auto-hydrate on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { api.hydrate(); });
    } else {
        api.hydrate();
    }

    return api;
})();
