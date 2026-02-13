/**
 * DEFAULT LOCATIONS & ROOMS - Tiesse Matrix Network
 * ============================================================================
 * These are the 22 PHYSICAL locations of the Sede Ivrea building.
 * They are PERMANENT and must NEVER be deleted by clearAll or any reset.
 * Only custom rooms created by users are ephemeral.
 *
 * Developer: Rafael Russo
 * Version: 4.1.006
 * ============================================================================
 */

// 22 default physical locations (mapped to floorplan rooms)
var DEFAULT_LOCATIONS = [
    { id: 'loc-00', siteId: 'main', code: '00', name: 'Sala Server',                          type: 'mapped', roomRef: '0',  color: '#7c3aed' },
    { id: 'loc-01', siteId: 'main', code: '01', name: 'Amministrazione',                      type: 'mapped', roomRef: '1',  color: '#7c3aed' },
    { id: 'loc-02', siteId: 'main', code: '02', name: 'F.Montefiori',                         type: 'mapped', roomRef: '2',  color: '#7c3aed' },
    { id: 'loc-03', siteId: 'main', code: '03', name: 'L.Ciofalo',                            type: 'mapped', roomRef: '3',  color: '#7c3aed' },
    { id: 'loc-04', siteId: 'main', code: '04', name: 'L.Lucrezia',                           type: 'mapped', roomRef: '4',  color: '#7c3aed' },
    { id: 'loc-05', siteId: 'main', code: '05', name: 'Sala Riunioni',                        type: 'mapped', roomRef: '5',  color: '#7c3aed' },
    { id: 'loc-06', siteId: 'main', code: '06', name: 'E.Saroglia/E.Zanellato/F.Lucrezia',    type: 'mapped', roomRef: '6',  color: '#7c3aed' },
    { id: 'loc-07', siteId: 'main', code: '07', name: 'O.Miraglio',                           type: 'mapped', roomRef: '7',  color: '#7c3aed' },
    { id: 'loc-08', siteId: 'main', code: '08', name: 'L.Corfiati/R.Belletti',                type: 'mapped', roomRef: '8',  color: '#7c3aed' },
    { id: 'loc-09', siteId: 'main', code: '09', name: 'QA',                                   type: 'mapped', roomRef: '9',  color: '#7c3aed' },
    { id: 'loc-10', siteId: 'main', code: '10', name: 'C.Frigiolini',                         type: 'mapped', roomRef: '10', color: '#7c3aed' },
    { id: 'loc-11', siteId: 'main', code: '11', name: 'E. Avanzi',                            type: 'mapped', roomRef: '11', color: '#7c3aed' },
    { id: 'loc-12', siteId: 'main', code: '12', name: 'ICT - G.Cappai/R.Russo',               type: 'mapped', roomRef: '12', color: '#7c3aed' },
    { id: 'loc-13', siteId: 'main', code: '13', name: 'EPA - Riparazioni',                    type: 'mapped', roomRef: '13', color: '#7c3aed' },
    { id: 'loc-14', siteId: 'main', code: '14', name: 'S.Rotondo',                            type: 'mapped', roomRef: '14', color: '#7c3aed' },
    { id: 'loc-15', siteId: 'main', code: '15', name: 'Imballo/Etichettatura',                type: 'mapped', roomRef: '15', color: '#7c3aed' },
    { id: 'loc-16', siteId: 'main', code: '16', name: 'Hardware',                             type: 'mapped', roomRef: '16', color: '#7c3aed' },
    { id: 'loc-17', siteId: 'main', code: '17', name: 'G.Deiaco',                             type: 'mapped', roomRef: '17', color: '#7c3aed' },
    { id: 'loc-18', siteId: 'main', code: '18', name: 'Sala Riunioni II',                     type: 'mapped', roomRef: '18', color: '#7c3aed' },
    { id: 'loc-19', siteId: 'main', code: '19', name: 'Reception',                            type: 'mapped', roomRef: '19', color: '#7c3aed' },
    { id: 'loc-20', siteId: 'main', code: '20', name: 'Zone Test - Arcipelago 01',            type: 'mapped', roomRef: '20', color: '#7c3aed' },
    { id: 'loc-21', siteId: 'main', code: '21', name: 'Zone Test - Arcipelago 02',            type: 'mapped', roomRef: '21', color: '#7c3aed' }
];

// 22 default physical rooms with floorplan polygon data
var DEFAULT_ROOMS = [
    { id: '0',  name: '0',  nickname: 'Sala Server',                       type: 'office', area: 47142,  capacity: 10, description: 'Sala Server - Mapped',                       color: 'rgba(59,130,246,0.15)', polygon: [{x:525,y:463},{x:768,y:463},{x:768,y:657},{x:525,y:657}], devices: [], notes: '', floor: 0 },
    { id: '1',  name: '1',  nickname: 'Amministrazione',                   type: 'office', area: 154806, capacity: 10, description: 'Amministrazione - Mapped',                   color: 'rgba(59,130,246,0.15)', polygon: [{x:6,y:971},{x:538,y:970},{x:537,y:1107},{x:510,y:1108},{x:511,y:1273},{x:17,y:1272},{x:16,y:1272},{x:17,y:1263},{x:14,y:1266}], devices: [], notes: '', floor: 0 },
    { id: '2',  name: '2',  nickname: 'F.Montefiori',                      type: 'office', area: 64484,  capacity: 10, description: 'F.Montefiori - Mapped',                      color: 'rgba(59,130,246,0.15)', polygon: [{x:6,y:623},{x:194,y:623},{x:194,y:966},{x:6,y:966}], devices: [], notes: '', floor: 0 },
    { id: '3',  name: '3',  nickname: 'L.Ciofalo',                         type: 'office', area: 56181,  capacity: 10, description: 'L.Ciofalo - Mapped',                         color: 'rgba(59,130,246,0.15)', polygon: [{x:11,y:312},{x:194,y:312},{x:194,y:619},{x:11,y:619}], devices: [], notes: '', floor: 0 },
    { id: '4',  name: '4',  nickname: 'L.Lucrezia',                        type: 'office', area: 78300,  capacity: 10, description: 'L.Lucrezia - Mapped',                        color: 'rgba(59,130,246,0.15)', polygon: [{x:5,y:4},{x:266,y:4},{x:266,y:304},{x:5,y:304}], devices: [], notes: '', floor: 0 },
    { id: '5',  name: '5',  nickname: 'Sala Riunioni',                     type: 'office', area: 90480,  capacity: 10, description: 'Sala Riunioni - Mapped',                     color: 'rgba(59,130,246,0.15)', polygon: [{x:272,y:5},{x:512,y:5},{x:512,y:382},{x:272,y:382}], devices: [], notes: '', floor: 0 },
    { id: '6',  name: '6',  nickname: 'E.Saroglia/E.Zanellato/F.Lucrezia', type: 'office', area: 93500,  capacity: 10, description: 'E.Saroglia/E.Zanellato/F.Lucrezia - Mapped', color: 'rgba(59,130,246,0.15)', polygon: [{x:517,y:5},{x:767,y:5},{x:767,y:379},{x:517,y:379}], devices: [], notes: '', floor: 0 },
    { id: '7',  name: '7',  nickname: 'O.Miraglio',                        type: 'office', area: 69542,  capacity: 10, description: 'O.Miraglio - Mapped',                        color: 'rgba(59,130,246,0.15)', polygon: [{x:774,y:8},{x:992,y:8},{x:992,y:327},{x:774,y:327}], devices: [], notes: '', floor: 0 },
    { id: '8',  name: '8',  nickname: 'L.Corfiati/R.Belletti',             type: 'office', area: 145644, capacity: 10, description: 'L.Corfiati/R.Belletti - Mapped',             color: 'rgba(59,130,246,0.15)', polygon: [{x:1000,y:10},{x:1458,y:10},{x:1458,y:328},{x:1000,y:328}], devices: [], notes: '', floor: 0 },
    { id: '9',  name: '9',  nickname: 'QA',                                type: 'office', area: 373165, capacity: 10, description: 'QA - Mapped',                                color: 'rgba(59,130,246,0.15)', polygon: [{x:2495,y:0},{x:2499,y:638},{x:1865,y:638},{x:1865,y:404},{x:1936,y:404},{x:1940,y:2}], devices: [], notes: '', floor: 0 },
    { id: '10', name: '10', nickname: 'C.Frigiolini',                      type: 'office', area: 49400,  capacity: 10, description: 'C.Frigiolini - Mapped',                      color: 'rgba(59,130,246,0.15)', polygon: [{x:2503,y:12},{x:2763,y:12},{x:2763,y:202},{x:2503,y:202}], devices: [], notes: '', floor: 0 },
    { id: '11', name: '11', nickname: 'E. Avanzi',                         type: 'office', area: 36778,  capacity: 10, description: 'E. Avanzi - Mapped',                         color: 'rgba(59,130,246,0.15)', polygon: [{x:2504,y:213},{x:2763,y:213},{x:2763,y:355},{x:2504,y:355}], devices: [], notes: '', floor: 0 },
    { id: '12', name: '12', nickname: 'ICT - G.Cappai/R.Russo',            type: 'office', area: 69402,  capacity: 10, description: 'ICT - G.Cappai/R.Russo - Mapped',            color: 'rgba(59,130,246,0.15)', polygon: [{x:2505,y:366},{x:2763,y:366},{x:2763,y:635},{x:2505,y:635}], devices: [], notes: '', floor: 0 },
    { id: '13', name: '13', nickname: 'EPA - Riparazioni',                 type: 'office', area: 404915, capacity: 10, description: 'EPA - Riparazioni - Mapped',                 color: 'rgba(59,130,246,0.15)', polygon: [{x:1937,y:955},{x:1942,y:863},{x:2461,y:851},{x:2460,y:643},{x:2764,y:641},{x:2767,y:1271},{x:1948,y:1267}], devices: [], notes: '', floor: 0 },
    { id: '14', name: '14', nickname: 'S.Rotondo',                         type: 'office', area: 64310,  capacity: 10, description: 'S.Rotondo - Mapped',                         color: 'rgba(59,130,246,0.15)', polygon: [{x:1725,y:968},{x:1943,y:968},{x:1943,y:1263},{x:1725,y:1263}], devices: [], notes: '', floor: 0 },
    { id: '15', name: '15', nickname: 'Imballo/Etichettatura',             type: 'office', area: 149725, capacity: 10, description: 'Imballo/Etichettatura - Mapped',             color: 'rgba(59,130,246,0.15)', polygon: [{x:1453,y:704},{x:1718,y:704},{x:1718,y:1269},{x:1453,y:1269}], devices: [], notes: '', floor: 0 },
    { id: '16', name: '16', nickname: 'Hardware',                          type: 'office', area: 286242, capacity: 10, description: 'Hardware - Mapped',                          color: 'rgba(59,130,246,0.15)', polygon: [{x:910,y:690},{x:1441,y:693},{x:1446,y:1274},{x:987,y:1267},{x:984,y:976},{x:911,y:969}], devices: [], notes: '', floor: 0 },
    { id: '17', name: '17', nickname: 'G.Deiaco',                          type: 'office', area: 62964,  capacity: 10, description: 'G.Deiaco - Mapped',                          color: 'rgba(59,130,246,0.15)', polygon: [{x:772,y:974},{x:984,y:974},{x:984,y:1271},{x:772,y:1271}], devices: [], notes: '', floor: 0 },
    { id: '18', name: '18', nickname: 'Sala Riunioni II',                  type: 'office', area: 70042,  capacity: 10, description: 'Sala Riunioni II - Mapped',                  color: 'rgba(59,130,246,0.15)', polygon: [{x:543,y:971},{x:768,y:972},{x:764,y:1267},{x:520,y:1266},{x:515,y:1116},{x:538,y:1112}], devices: [], notes: '', floor: 0 },
    { id: '19', name: '19', nickname: 'Reception',                         type: 'office', area: 22852,  capacity: 10, description: 'Reception - Mapped',                         color: 'rgba(59,130,246,0.15)', polygon: [{x:404,y:459},{x:520,y:459},{x:520,y:656},{x:404,y:656}], devices: [], notes: '', floor: 0 },
    { id: '20', name: '20', nickname: 'Zone Test - Arcipelago 01',         type: 'office', area: 148230, capacity: 10, description: 'Zone Test - Arcipelago 01 - Mapped',         color: 'rgba(59,130,246,0.15)', polygon: [{x:910,y:333},{x:1459,y:333},{x:1459,y:603},{x:910,y:603}], devices: [], notes: '', floor: 0 },
    { id: '21', name: '21', nickname: 'Zone Test - Arcipelago 02',         type: 'office', area: 124940, capacity: 10, description: 'Zone Test - Arcipelago 02 - Mapped',         color: 'rgba(59,130,246,0.15)', polygon: [{x:1860,y:641},{x:2455,y:641},{x:2453,y:846},{x:1858,y:856}], devices: [], notes: '', floor: 0 }
];

// Default site
var DEFAULT_SITES = [
    { id: 'main', name: 'Sede Ivrea', address: 'Ivrea, TO', type: 'headquarters' }
];

/**
 * Get a deep copy of default locations (safe to modify)
 */
function getDefaultLocations() {
    return JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
}

/**
 * Get a deep copy of default rooms (safe to modify)
 */
function getDefaultRooms() {
    return JSON.parse(JSON.stringify(DEFAULT_ROOMS));
}

/**
 * Get a deep copy of default sites (safe to modify)
 */
function getDefaultSites() {
    return JSON.parse(JSON.stringify(DEFAULT_SITES));
}

/**
 * Ensure default locations and rooms are always present in appState.
 * Merges defaults with any custom locations/rooms, preserving user additions.
 * Call this after any data load or clear operation.
 */
function ensureDefaultLocationsAndRooms() {
    // Ensure all 22 default locations exist
    var defaultLocs = getDefaultLocations();
    for (var i = 0; i < defaultLocs.length; i++) {
        var defLoc = defaultLocs[i];
        var exists = false;
        for (var j = 0; j < appState.locations.length; j++) {
            if (appState.locations[j].id === defLoc.id) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            appState.locations.push(defLoc);
        }
    }

    // Ensure all 22 default rooms exist
    var defaultRms = getDefaultRooms();
    if (!appState.rooms) appState.rooms = [];
    for (var k = 0; k < defaultRms.length; k++) {
        var defRoom = defaultRms[k];
        var roomExists = false;
        for (var l = 0; l < appState.rooms.length; l++) {
            if (appState.rooms[l].id === defRoom.id) {
                roomExists = true;
                break;
            }
        }
        if (!roomExists) {
            appState.rooms.push(defRoom);
        }
    }

    // Ensure default site
    if (!appState.sites) appState.sites = [];
    var defaultSts = getDefaultSites();
    for (var m = 0; m < defaultSts.length; m++) {
        var defSite = defaultSts[m];
        var siteExists = false;
        for (var n = 0; n < appState.sites.length; n++) {
            if (appState.sites[n].id === defSite.id) {
                siteExists = true;
                break;
            }
        }
        if (!siteExists) {
            appState.sites.push(defSite);
        }
    }

    // Sort locations by code
    appState.locations.sort(function(a, b) {
        return parseInt(a.code) - parseInt(b.code);
    });

    // Sort rooms by id
    appState.rooms.sort(function(a, b) {
        return parseInt(a.id) - parseInt(b.id);
    });
}
