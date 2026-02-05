/**
 * TIESSE Matrix Network - JSON Validator (Backend)
 * Version: 3.5.046
 * 
 * Smart validation system for data integrity
 * Prevents corruption during import/export/backup operations
 */

const fs = require('fs');
const path = require('path');

/**
 * Core validation engine
 */
const JSONValidator = {
    /**
     * Comprehensive validation of network_manager.json structure
     */
    validate: function(data) {
        const issues = {
            critical: [],
            warnings: [],
            deprecated: []
        };

        // 1. Structure validation
        if (!data || typeof data !== 'object') {
            issues.critical.push('Data is not an object');
            return issues;
        }

        // 2. Required fields
        const required = ['devices', 'connections', 'nextDeviceId'];
        required.forEach(field => {
            if (!(field in data)) {
                issues.critical.push(`Missing required field: ${field}`);
            }
        });

        if (issues.critical.length > 0) return issues;

        // 3. Array validation
        if (!Array.isArray(data.devices)) {
            issues.critical.push('devices must be an array');
        }
        if (!Array.isArray(data.connections)) {
            issues.critical.push('connections must be an array');
        }

        if (issues.critical.length > 0) return issues;

        // 4. Device validation
        const deviceIds = new Set();
        data.devices.forEach((device, idx) => {
            const deviceIssues = this.validateDevice(device, idx);
            issues.critical.push(...deviceIssues.critical);
            issues.warnings.push(...deviceIssues.warnings);
            issues.deprecated.push(...deviceIssues.deprecated);
            
            if (device.id) deviceIds.add(device.id);
        });

        // 5. Connection validation (referential integrity)
        data.connections.forEach((conn, idx) => {
            const connIssues = this.validateConnection(conn, idx, deviceIds);
            issues.critical.push(...connIssues.critical);
            issues.warnings.push(...connIssues.warnings);
            issues.deprecated.push(...connIssues.deprecated);
        });

        // 6. Data consistency checks
        const consistencyIssues = this.validateConsistency(data);
        issues.warnings.push(...consistencyIssues.warnings);
        issues.deprecated.push(...consistencyIssues.deprecated);

        return issues;
    },

    /**
     * Validate individual device
     */
    validateDevice: function(device, index) {
        const issues = {
            critical: [],
            warnings: [],
            deprecated: []
        };

        if (!device || typeof device !== 'object') {
            issues.critical.push(`Device[${index}]: must be an object`);
            return issues;
        }

        // Required fields
        if (!device.id || typeof device.id !== 'number' || device.id <= 0) {
            issues.critical.push(`Device[${index}]: id must be positive number`);
        }
        if (!device.name || typeof device.name !== 'string' || device.name.length === 0) {
            issues.critical.push(`Device[${index}]: name is required (1-255 chars)`);
        }
        if (!device.type || typeof device.type !== 'string') {
            issues.warnings.push(`Device[${index}]: type should be defined`);
        }
        if (!device.status || typeof device.status !== 'string') {
            issues.warnings.push(`Device[${index}]: status should be defined`);
        }
        if (!device.location || typeof device.location !== 'string') {
            issues.warnings.push(`Device[${index}]: location should be defined`);
        }

        // Array validations
        if (device.ports && !Array.isArray(device.ports)) {
            issues.warnings.push(`Device[${index}]: ports should be array`);
        }
        if (device.addresses && !Array.isArray(device.addresses)) {
            issues.warnings.push(`Device[${index}]: addresses should be array`);
        }

        // Deprecated field warnings
        if (device.rack !== undefined && device.rack !== device.rackId) {
            issues.deprecated.push(`Device[${index}]: has duplicate field 'rack' (use 'rackId' instead)`);
        }
        if (device.rear !== undefined && device.rear !== device.isRear) {
            issues.deprecated.push(`Device[${index}]: has duplicate field 'rear' (use 'isRear' instead)`);
        }
        if (device._isExternal === true) {
            issues.deprecated.push(`Device[${index}]: _isExternal is always false in current version`);
        }
        if (device.zone !== undefined && device.zone !== null) {
            issues.deprecated.push(`Device[${index}]: 'zone' field is deprecated`);
        }
        if (device.zoneIP !== undefined && device.zoneIP !== null) {
            issues.deprecated.push(`Device[${index}]: 'zoneIP' field is deprecated`);
        }

        return issues;
    },

    /**
     * Validate individual connection
     */
    validateConnection: function(connection, index, deviceIds) {
        const issues = {
            critical: [],
            warnings: [],
            deprecated: []
        };

        if (!connection || typeof connection !== 'object') {
            issues.critical.push(`Connection[${index}]: must be an object`);
            return issues;
        }

        // Required fields
        if (typeof connection.from !== 'number' || connection.from <= 0) {
            issues.critical.push(`Connection[${index}]: from must be positive device ID`);
        }
        if (!(connection.from in deviceIds) && connection.from > 0) {
            issues.critical.push(`Connection[${index}]: from device ID ${connection.from} not found`);
        }

        // to can be null (external) or valid device ID
        if (connection.to !== null && connection.to !== undefined) {
            if (typeof connection.to !== 'number' || connection.to <= 0) {
                issues.critical.push(`Connection[${index}]: to must be null or positive device ID`);
            }
            if (!(connection.to in deviceIds) && connection.to > 0) {
                issues.critical.push(`Connection[${index}]: to device ID ${connection.to} not found`);
            }
        }

        if (!connection.type || typeof connection.type !== 'string') {
            issues.warnings.push(`Connection[${index}]: type should be defined`);
        }
        if (!connection.status || typeof connection.status !== 'string') {
            issues.warnings.push(`Connection[${index}]: status should be defined`);
        }

        // Deprecated fields
        if (connection.color && connection.color !== connection.cableColor) {
            issues.deprecated.push(`Connection[${index}]: has duplicate field 'color' (use 'cableColor' instead, different values: '${connection.color}' vs '${connection.cableColor}')`);
        }
        if (connection.roomId !== undefined && connection.roomId !== null) {
            issues.deprecated.push(`Connection[${index}]: 'roomId' field is deprecated and unused`);
        }

        return issues;
    },

    /**
     * Check data consistency
     */
    validateConsistency: function(data) {
        const issues = {
            warnings: [],
            deprecated: []
        };

        // Count devices without required arrays
        const noAddr = data.devices.filter(d => !d.addresses || d.addresses.length === 0).length;
        const noPorts = data.devices.filter(d => !d.ports || d.ports.length === 0).length;

        if (noAddr > 0) {
            issues.warnings.push(`${noAddr} devices have no IP addresses (expected for switches/patch panels)`);
        }
        if (noPorts > 0) {
            issues.warnings.push(`${noPorts} devices have no ports defined`);
        }

        // Check if deprecated fields are widely used
        const dupRack = data.devices.filter(d => d.rack && d.rack !== d.rackId).length;
        const dupRear = data.devices.filter(d => d.rear !== undefined && d.rear !== d.isRear).length;
        const dupColor = data.connections.filter(c => c.color && c.color !== c.cableColor).length;

        if (dupRack > 0) {
            issues.deprecated.push(`${dupRack} devices have 'rack' field with different value than 'rackId'`);
        }
        if (dupRear > 0) {
            issues.deprecated.push(`${dupRear} devices have 'rear' field with different value than 'isRear'`);
        }
        if (dupColor > 0) {
            issues.deprecated.push(`${dupColor} connections have 'color' field different from 'cableColor'`);
        }

        return issues;
    },

    /**
     * Get validation severity level
     */
    getSeverity: function(issues) {
        if (issues.critical.length > 0) return 'CRITICAL';
        if (issues.warnings.length > 0) return 'WARNING';
        if (issues.deprecated.length > 0) return 'DEPRECATED';
        return 'OK';
    },

    /**
     * Format validation report
     */
    formatReport: function(issues, verbose = false) {
        const lines = [];
        const severity = this.getSeverity(issues);

        lines.push(`[${severity}] Data Validation Report`);
        lines.push(`Timestamp: ${new Date().toISOString()}`);
        lines.push('');

        if (issues.critical.length > 0) {
            lines.push(`🔴 CRITICAL ERRORS (${issues.critical.length}):`);
            issues.critical.forEach(e => lines.push(`   - ${e}`));
            lines.push('');
        }

        if (issues.warnings.length > 0) {
            lines.push(`🟡 WARNINGS (${issues.warnings.length}):`);
            if (verbose) {
                issues.warnings.forEach(w => lines.push(`   - ${w}`));
            } else {
                lines.push(`   ... ${issues.warnings.length} warnings (use verbose for details)`);
            }
            lines.push('');
        }

        if (issues.deprecated.length > 0) {
            lines.push(`⚠️  DEPRECATED FIELDS (${issues.deprecated.length}):`);
            if (verbose) {
                issues.deprecated.forEach(d => lines.push(`   - ${d}`));
            } else {
                lines.push(`   ... ${issues.deprecated.length} deprecated fields (use verbose for details)`);
            }
            lines.push('');
        }

        if (severity === 'OK') {
            lines.push('✅ All validations passed!');
        }

        return lines.join('\n');
    }
};

/**
 * Export for use in server
 */
module.exports = JSONValidator;
