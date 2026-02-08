# TIESSE Matrix Network - Validation System Testing Guide (v3.6.026)

## Quick Test Checklist

### Pre-Test Setup
- [ ] Server running on port 3000 (Node.js) or Apache
- [ ] Browser open to `http://localhost:3000` or your server IP
- [ ] Browser DevTools console open (F12)
- [ ] Logged in with Edit Mode enabled

### Test 1: Valid Data Import ✅
**Goal:** Verify validator accepts good data

1. Go to Devices tab → click "📥 Import JSON"
2. Select valid backup: `Archives/temp-files/Tiesse-Matrix-Network_FIXED_2026-02-04.json`
3. **Expected:**
   - ✅ Console shows: `[Validation] ✅ Data passed validation, safe to import`
   - ✅ Toast success: "Imported: 101 devices, 94 connections"
   - ✅ Data loads correctly (verify device count in sidebar)

### Test 2: Corrupted Import Rejection ❌
**Goal:** Verify validator blocks bad data

1. Create test file with invalid JSON:
```json
{
  "devices": [
    {"id": 1, "name": "Test"}  // Missing required: type, status, location
  ],
  "connections": []
}
```

2. Go to Devices tab → click "📥 Import JSON"
3. Select corrupted file
4. **Expected:**
   - ❌ Console shows: `[Validation] CRITICAL ERRORS FOUND`
   - ❌ Toast error: "❌ Import blocked by validation system"
   - ❌ Data NOT imported, appState unchanged

### Test 3: Referential Integrity Check 🔗
**Goal:** Verify validator catches broken device references

1. Create test file:
```json
{
  "devices": [
    {"id": 1, "name": "Device1", "type": "router", "status": "active", "location": "LOC-00"}
  ],
  "connections": [
    {"from": 999, "type": "fiber", "status": "active"}  // 999 doesn't exist!
  ],
  "version": "3.5.046"
}
```

2. Import file
3. **Expected:**
   - ❌ Console shows: `Connection[0]: 'from' device ID 999 does not exist`
   - ❌ Import blocked
   - ❌ Toast error displayed

### Test 4: Deprecated Field Detection ⚠️
**Goal:** Verify validator warns about old field names

1. Create test file with deprecated fields:
```json
{
  "devices": [
    {
      "id": 1, "name": "Legacy", "type": "router", "status": "active", 
      "location": "LOC-00",
      "zone": "OLD_ZONE",          // Deprecated!
      "rear": true                  // Should be isRear
    }
  ],
  "connections": [
    {"from": 1, "type": "fiber", "status": "active", "roomId": 5}  // Deprecated!
  ],
  "version": "3.5.045"
}
```

2. Import file
3. **Expected:**
   - ⚠️ Console shows: `⚠️ Import contains deprecated fields`
   - ⚠️ Lists deprecated field warnings
   - ✅ Data still imports (warnings don't block)
   - ⚠️ Toast success but with deprecation note

### Test 5: JSON Export Validation ✅
**Goal:** Verify validator checks before export

1. Make sure you're logged in (Edit Mode)
2. Click "📤 Export JSON"
3. **Expected:**
   - ✅ Console shows: `[Validation] Checking data before save...`
   - ✅ Console shows: `[Validation] ✅ Data is valid for saving`
   - ✅ JSON file downloads with correct filename
   - ✅ Downloaded file should have 101 devices, 94 connections

### Test 6: Excel Export Validation ✅
**Goal:** Verify validator checks before Excel export

1. Make sure you're logged in (Edit Mode)
2. Click "📊 Export Excel"
3. **Expected:**
   - ✅ Console shows: `[Validation] Checking data before save...`
   - ✅ Excel file downloads
   - ✅ Excel has 3 sheets: Devices, Connections, Matrix
   - ✅ Devices sheet shows 101 rows (+ header)
   - ✅ Connections sheet shows 94 rows (+ header)

### Test 7: Duplicate Field Detection 🔄
**Goal:** Verify validator detects conflicting old/new field names

1. Current backup has this issue: `rack` vs `rackId` conflict
2. Import current `network_v3.5.044-101-94.json` backup
3. **Expected:**
   - ⚠️ Console shows: `Device[X]: duplicate 'rack' field`
   - ✅ Import still succeeds (not critical)
   - ⚠️ Warnings logged for user awareness

### Test 8: Validator Availability ✅
**Goal:** Verify validator is properly loaded

In DevTools Console, run:
```javascript
typeof JSONValidatorFrontend              // Should be 'object'
typeof JSONValidatorFrontend.validateImportData   // Should be 'function'
window.validateBeforeImport                // Should be 'function'
window.validateBeforeSave                  // Should be 'function'
```

**Expected:** All three should be `'function'` or `'object'`

## Performance Tests

### Test 9: Large Dataset Validation ⚡
**Goal:** Verify validator handles 101+94 data efficiently

1. In Console, run:
```javascript
console.time('Validation');
var report = JSONValidatorFrontend.validateImportData(appState);
console.timeEnd('Validation');
console.log('Report:', report);
```

2. **Expected:**
   - Validation should complete in < 50ms
   - No console errors
   - Report shows: devices: 101, connections: 94

## Console Output Examples

### Good Import
```
[Validation] Checking imported data...
[Validation] ✅ Valid! 101 devices, 94 connections
[Validation] ✅ Data passed validation, safe to import
```

### Bad Import (Duplicate IDs)
```
[Validation] Checking imported data...
[Validation] Cannot import - critical errors found
[Log] json-validator.js:26 [Validation] CRITICAL ERRORS FOUND:
[Log]   • Device[2]: invalid or missing id
[Log]   • Connection[15]: 'to' device ID 105 does not exist
```

### Deprecated Fields
```
[Validation] Checking imported data...
[Validation] ⚠️ 3 deprecated fields found
[Log] [Validation] Import has warnings but will proceed
```

## Troubleshooting

### Issue: "JSONValidatorFrontend is not defined"
**Solution:** 
- Refresh page (Ctrl+Shift+R for hard refresh)
- Check that `js/json-validator.js` loaded in Network tab
- Check browser console for load errors

### Issue: "Validation blocks everything"
**Solution:**
- Check exact error message in Toast
- Open backed copy in JSON editor, fix issues
- Ensure all devices have: id, name, type, status, location
- Ensure all connections have: from (device ID that exists), type, status

### Issue: "Validator logs show deprecated fields but data imports anyway"
**This is correct behavior** - deprecated fields are warnings, not errors.
The system allows imports but alerts about migration needs.

## Success Criteria

All tests pass when:
- ✅ Valid data imports successfully
- ✅ Corrupted data is blocked
- ✅ Referential integrity maintained
- ✅ Deprecated fields detected
- ✅ Exports validated before download
- ✅ Validator loads without errors
- ✅ Performance < 100ms for 101+94 dataset

## Data Safety Guarantee

After validation system integration:
- ✅ **Import Protection:** No corrupted backups can sneak in
- ✅ **Export Protection:** No broken data exported to users
- ✅ **Referential Protection:** No orphaned connections
- ✅ **Version Protection:** Only compatible versions imported
- ✅ **Audit Trail:** All validation results logged to console

---

**Version:** 3.5.046  
**Validation System:** Frontend + Backend Ready  
**Test Coverage:** 9 core scenarios  
**Expected Success Rate:** 100%

**Next Steps After Validation Tests:**
1. Run all 9 tests ✅
2. Check console for any errors
3. Verify 101 devices + 94 connections data integrity
4. Move to backend integration (server.js api/json-validator.js)
5. Create release notes for v3.5.046
