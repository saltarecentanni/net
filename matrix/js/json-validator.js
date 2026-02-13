/**
 * TIESSE Matrix Network - JSON Validator (Frontend)
 * Version: 4.1.006
 * 
 * Client-side validation for import/export operations
 * Prevents user from corrupting data
 * 
 * SUPPORTED OPTIONAL FIELDS:
 * - Connection.flagged (boolean): marks incomplete connections for later correction
 * - Connection.flagReason (string): human-readable reason for flagging
 * - Connection.isWallJack (boolean): marks connections to wall outlets (no 'to' device)
 * - Connection.roomId (number|string|null): assigns WallJack/WallPort to room on floor plan
 */

var JSONValidatorFrontend = {
    /**
     * Validate imported JSON data before applying
     */
    validateImportData: function(data) {
        const report = {
            valid: true,
            critical: [],
            warnings: [],
            deprecated: [],
            stats: {
                devices: 0,
                connections: 0,
                deviceIdsValid: true,
                referencesValid: true
            }
        };

        try {
            // 1. Parse if string
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    report.valid = false;
                    report.critical.push(`JSON parse error: ${e.message}`);
                    return report;
                }
            }

            // 2. Structure check
            if (!data || typeof data !== 'object') {
                report.valid = false;
                report.critical.push('Data is not a valid object');
                return report;
            }

            // 3. Required arrays
            const required = ['devices', 'connections'];
            required.forEach(field => {
                if (!Array.isArray(data[field])) {
                    report.valid = false;
                    report.critical.push(`Missing or invalid array: ${field}`);
                }
            });

            if (!report.valid) return report;

            // 4. Device validation
            report.stats.devices = data.devices.length;
            const deviceIds = new Set();

            data.devices.forEach((device, idx) => {
                // Critical checks
                if (!device.id || typeof device.id !== 'number') {
                    report.valid = false;
                    report.critical.push(`Device[${idx}]: invalid or missing id`);
                }

                if (!device.name || typeof device.name !== 'string') {
                    report.valid = false;
                    report.critical.push(`Device[${idx}]: invalid or missing name`);
                }

                if (!device.type) {
                    report.warnings.push(`Device[${idx}]: missing type`);
                }

                if (!device.status) {
                    report.warnings.push(`Device[${idx}]: missing status`);
                }

                if (!device.location) {
                    report.warnings.push(`Device[${idx}]: missing location`);
                }

                // Check for duplicate fields
                if (device.rack && device.rack !== device.rackId) {
                    report.deprecated.push(`Device[${idx}]: duplicate 'rack' field (value differs from 'rackId')`);
                }

                if (device.rear !== undefined && device.rear !== device.isRear) {
                    report.deprecated.push(`Device[${idx}]: duplicate 'rear' field (value differs from 'isRear')`);
                }

                if (device.zone) {
                    report.deprecated.push(`Device[${idx}]: has deprecated 'zone' field`);
                }

                if (device.id) {
                    deviceIds.add(device.id);
                }
            });

            // 5. Connection validation
            report.stats.connections = data.connections.length;
            const maxDeviceId = Math.max(...Array.from(deviceIds), 0);

            data.connections.forEach((conn, idx) => {
                // Critical checks
                if (typeof conn.from !== 'number' || conn.from <= 0) {
                    report.valid = false;
                    report.critical.push(`Connection[${idx}]: invalid 'from' device ID`);
                }

                if (!deviceIds.has(conn.from)) {
                    report.valid = false;
                    report.critical.push(`Connection[${idx}]: 'from' device ID ${conn.from} does not exist`);
                    report.stats.referencesValid = false;
                }

                if (conn.to !== null && conn.to !== undefined) {
                    if (typeof conn.to !== 'number' || conn.to <= 0) {
                        report.valid = false;
                        report.critical.push(`Connection[${idx}]: invalid 'to' device ID`);
                    }
                    if (!deviceIds.has(conn.to)) {
                        report.valid = false;
                        report.critical.push(`Connection[${idx}]: 'to' device ID ${conn.to} does not exist`);
                        report.stats.referencesValid = false;
                    }
                }

                if (!conn.type) {
                    report.warnings.push(`Connection[${idx}]: missing type`);
                }

                if (!conn.status) {
                    report.warnings.push(`Connection[${idx}]: missing status`);
                }

                // Check deprecated fields
                if (conn.color) {
                    report.deprecated.push(`Connection[${idx}]: has obsolete 'color' field (use config.connColors[type] instead)`);
                }

                // Validate optional support fields that are allowed
                // - flagged: marks incomplete/problematic connections for later correction
                // - flagReason: human-readable description of why flagged
                // - isWallJack: marks if connection is to wall outlet/jack (special type with no 'to' device)
                // - roomId: assigns WallJack/WallPort connections to specific rooms on floor plan
                // These fields are optional and do not trigger validation errors
                if (conn.flagged !== undefined && typeof conn.flagged !== 'boolean') {
                    report.warnings.push(`Connection[${idx}]: 'flagged' should be boolean`);
                }
                if (conn.flagReason !== undefined && typeof conn.flagReason !== 'string') {
                    report.warnings.push(`Connection[${idx}]: 'flagReason' should be string`);
                }
                if (conn.roomId !== undefined && conn.roomId !== null && 
                    typeof conn.roomId !== 'number' && typeof conn.roomId !== 'string') {
                    report.warnings.push(`Connection[${idx}]: 'roomId' should be number, string, or null`);
                }
                if (conn.isWallJack !== undefined && typeof conn.isWallJack !== 'boolean') {
                    report.warnings.push(`Connection[${idx}]: 'isWallJack' should be boolean`);
                }
            });

            // 6. Cross-checks
            if (data.nextDeviceId) {
                if (data.nextDeviceId <= maxDeviceId) {
                    report.warnings.push(`nextDeviceId (${data.nextDeviceId}) should be > max device ID (${maxDeviceId})`);
                }
            }

        } catch (e) {
            report.valid = false;
            report.critical.push(`Validation error: ${e.message}`);
        }

        return report;
    },

    /**
     * Check if data can be imported safely
     */
    canImportSafely: function(data) {
        const report = this.validateImportData(data);
        return report.valid && report.critical.length === 0;
    },

    /**
     * Get human-readable validation message
     */
    getValidationMessage: function(report) {
        if (report.critical.length === 0 && report.warnings.length === 0 && report.deprecated.length === 0) {
            return `✅ Valid! ${report.stats.devices} devices, ${report.stats.connections} connections`;
        }

        let msg = '';

        if (report.critical.length > 0) {
            msg += `🔴 ${report.critical.length} CRITICAL errors\n`;
            msg += report.critical.map(e => `   • ${e}`).join('\n') + '\n';
        }

        if (report.warnings.length > 0) {
            msg += `🟡 ${report.warnings.length} warnings\n`;
        }

        if (report.deprecated.length > 0) {
            msg += `⚠️ ${report.deprecated.length} deprecated fields found\n`;
        }

        return msg;
    },

    /**
     * Validate before exporting
     */
    validateBeforeExport: function(appState) {
        const report = {
            valid: true,
            critical: [],
            warnings: []
        };

        if (!appState.devices || !Array.isArray(appState.devices)) {
            report.valid = false;
            report.critical.push('Invalid devices array');
        }

        if (!appState.connections || !Array.isArray(appState.connections)) {
            report.valid = false;
            report.critical.push('Invalid connections array');
        }

        if (!appState.nextDeviceId || typeof appState.nextDeviceId !== 'number') {
            report.critical.push('Missing or invalid nextDeviceId');
        }

        // Check for duplicate device IDs
        const ids = appState.devices.map(d => d.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            report.valid = false;
            report.critical.push('Duplicate device IDs detected');
        }

        return report;
    }
};

/**
 * Global validation hook - can be called from save operations
 */
window.validateBeforeSave = function(appState) {
    console.log('[Validation] Checking data before save...');
    const report = JSONValidatorFrontend.validateBeforeExport(appState);
    
    if (report.critical.length > 0) {
        console.error('[Validation] CRITICAL ERRORS FOUND:');
        report.critical.forEach(err => console.error('  ' + err));
        return false;
    }
    
    if (report.warnings.length > 0) {
        console.warn('[Validation] Warnings:');
        report.warnings.forEach(w => console.warn('  ' + w));
    }
    
    console.log('[Validation] ✅ Data is valid for saving');
    return true;
};

/**
 * Global validation hook - called during import
 */
window.validateBeforeImport = function(jsonData) {
    console.log('[Validation] Checking imported data...');
    const report = JSONValidatorFrontend.validateImportData(jsonData);
    
    console.log(JSONValidatorFrontend.getValidationMessage(report));
    
    if (report.critical.length > 0) {
        console.error('[Validation] Cannot import - critical errors found');
        return false;
    }
    
    if (report.warnings.length > 0) {
        console.warn('[Validation] Import has warnings but will proceed');
    }
    
    console.log('[Validation] ✅ Data passed validation, safe to import');
    return true;
};
