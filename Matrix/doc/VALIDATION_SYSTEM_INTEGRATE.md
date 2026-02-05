# TIESSE Matrix Network - JSON Validation Integration (v3.5.046)

## Summary

Three-tier validation system implemented to prevent data corruption during any modifications (import/export/Excel operations):

1. **Backend Validation** (`api/json-validator.js`) - Server-side validation
2. **Frontend Schema** (HTML reference) - Client-side schema definition
3. **Frontend Validator** (`js/json-validator.js`) - Client-side validation engine

## Integration Points

### 1. HTML (index.html - Line 3092)
```html
<script src="js/json-validator.js?v=3.5.046"></script>
```
- Validator loaded after all other JS modules
- Available globally as `JSONValidatorFrontend`

### 2. Import Function (js/app.js - Lines 4108-4118)
**Added to:** `importData()` function
**When:** After checksum/structure validation, before applying data
**Function:** Prevents importing corrupted or invalid JSON

```javascript
// ===== INTELLIGENT JSON VALIDATION (Frontend System) =====
if (typeof JSONValidatorFrontend !== 'undefined') {
    var validationReport = JSONValidatorFrontend.validateImportData(data);
    if (validationReport.critical.length > 0) {
        Toast.error('❌ Import blocked by validation system:\n' + 
                   validationReport.critical.slice(0, 3).join('\n'));
        Debug.error('Validation critical errors:', validationReport.critical);
        return;  // Block import
    }
    if (validationReport.deprecated.length > 0) {
        Debug.warn('⚠️ Import contains deprecated fields:', 
                  validationReport.deprecated.slice(0, 3));
    }
}
```

### 3. JSON Export Function (js/app.js - Lines 3906-3915)
**Added to:** `exportJSON()` function
**When:** Before creating payload
**Function:** Ensures exported data is valid

```javascript
// ===== PRE-EXPORT VALIDATION =====
if (typeof JSONValidatorFrontend !== 'undefined') {
    var preExportReport = JSONValidatorFrontend.validateBeforeExport(appState);
    if (preExportReport.critical.length > 0) {
        Toast.error('❌ Cannot export - validation errors:\n' + 
                   preExportReport.critical.slice(0, 3).join('\n'));
        Debug.error('Export validation failed:', preExportReport.critical);
        return;  // Block export
    }
}
```

### 4. Excel Export Function (js/ui-updates.js - Lines 2431-2442)
**Added to:** `exportExcel()` function
**When:** Before processing data into Excel sheet
**Function:** Validates before Excel conversion

```javascript
// ===== PRE-EXPORT VALIDATION =====
if (typeof JSONValidatorFrontend !== 'undefined') {
    var excelValidationReport = JSONValidatorFrontend.validateBeforeExport(appState);
    if (excelValidationReport.critical.length > 0) {
        Toast.error('❌ Cannot export Excel - validation errors:\n' + 
                   excelValidationReport.critical.slice(0, 2).join('\n'));
        Debug.error('Excel export validation failed:', excelValidationReport.critical);
        return;  // Block export
    }
}
```

## Validator Capabilities

### validateImportData(data)
Checks imported JSON structure:
- ✅ Valid JSON parsing
- ✅ Required arrays exist (devices, connections)
- ✅ Device required fields (id, name, type, status, location)
- ✅ Connection required fields (from, type, status)
- ✅ Referential integrity (all device IDs exist)
- ✅ Duplicate field detection (rack vs rackId, rear vs isRear, color vs cableColor)
- ✅ Deprecated field warnings (zone, zoneIP, _isExternal, roomId)

**Returns:** Report with critical/warnings/deprecated arrays + stats

### validateBeforeExport(appState)
Checks current app state before export:
- ✅ Valid devices array
- ✅ Valid connections array  
- ✅ Valid nextDeviceId
- ✅ No duplicate device IDs

**Returns:** Report with critical/warnings arrays

### Global Hooks
```javascript
window.validateBeforeSave(appState)    // Returns true/false
window.validateBeforeImport(jsonData)  // Returns true/false, logs details
```

## Benefits

1. **Prevents Data Corruption**
   - Catches invalid imports before they corrupt appState
   - Validates exports before user downloads
   - Ensures referential integrity maintained

2. **Early Warning System**
   - Detects deprecated fields before they become problems
   - Reports on duplicate/conflicting field values
   - Logs validation warnings to console

3. **User-Friendly**
   - Toast error messages explain what's wrong
   - Non-blocking warnings allow aware continuation
   - Detailed logs in console for debugging

4. **Backward Compatible**
   - Works with old backups (version validation)
   - Handles both new and legacy field names
   - Graceful degradation if validator not available

## Test Cases

### Import Validation (appState.devices + appState.connections)
- ✅ Valid JSON with 101 devices + 94 connections → PASS
- ❌ Duplicate device IDs → FAIL (critical)
- ❌ Connection referencing non-existent device → FAIL (critical)
- ⚠️ Device missing location field → WARN
- ⚠️ Connection has deprecated 'roomId' → DEPRECATED

### Export Validation (appState structure)
- ✅ Valid appState with nextDeviceId → PASS
- ❌ Missing nextDeviceId → FAIL (critical)
- ❌ Duplicate device IDs in appState.devices → FAIL (critical)

## Future Enhancements

1. **Backend Integration** - Call api/json-validator.js on POST /data
2. **Frontend UI Indicators** - Show validation status badge
3. **Field Auto-Correction** - Propose fixes for deprecated fields
4. **Audit Trail** - Log all validation results to server
5. **Custom Rules** - Allow site-specific validation extensions

## Files Modified

- **Created:** `/workspaces/net/Matrix/js/json-validator.js` (440 lines)
- **Modified:** `/workspaces/net/Matrix/index.html` (+1 script tag)
- **Modified:** `/workspaces/net/Matrix/js/app.js` (importData + exportJSON)
- **Modified:** `/workspaces/net/Matrix/js/ui-updates.js` (exportExcel)

## Activation

Validation system is **automatically active** when:
1. HTML page loads (includes json-validator.js)
2. User imports JSON file
3. User exports JSON
4. User exports Excel

No user action required - validation happens automatically.

## Monitoring

Check browser console (`F12`) for validation logs:
```
[Validation] Checking imported data...
[Validation] ❌ Device[5]: 'rear' field differs from 'isRear'
[Validation] ✅ Data passed validation, safe to import
```

---
**Version:** 3.5.046  
**Created:** 2026-02-13  
**System:** TIESSE Matrix Network
