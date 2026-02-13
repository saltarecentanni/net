/**
 * TIESSE Matrix Network - Guacamole API Client
 * Version: 3.6.003
 * 
 * This module handles communication with Apache Guacamole REST API
 * for creating, updating, and managing remote connections.
 * 
 * Configuration: /config/guacamole.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class GuacamoleAPI {
    constructor() {
        this.config = null;
        this.authToken = null;
        this.dataSource = 'postgresql'; // Default Guacamole data source
        this.loadConfig();
    }

    /**
     * Load configuration from guacamole.json
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'config', 'guacamole.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(configData);
            console.log('[Guacamole] Configuration loaded');
        } catch (error) {
            console.error('[Guacamole] Error loading config:', error.message);
            this.config = { enabled: false };
        }
    }

    /**
     * Check if Guacamole integration is enabled
     */
    isEnabled() {
        return this.config && this.config.enabled === true;
    }

    /**
     * Make HTTP request to Guacamole API
     */
    async request(method, endpoint, data = null, isFormData = false) {
        return new Promise((resolve, reject) => {
            const baseUrl = new URL(this.config.server.baseUrl);
            const apiUrl = `${baseUrl.origin}${baseUrl.pathname}${this.config.server.apiPath}${endpoint}`;
            const url = new URL(apiUrl);
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {}
            };

            // Add auth token if available
            if (this.authToken && !endpoint.includes('/tokens')) {
                options.path += (options.path.includes('?') ? '&' : '?') + `token=${this.authToken}`;
            }

            // Set content type
            if (data) {
                if (isFormData) {
                    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                } else {
                    options.headers['Content-Type'] = 'application/json';
                }
            }

            const protocol = url.protocol === 'https:' ? https : http;
            
            const req = protocol.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const result = body ? JSON.parse(body) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(result);
                        } else {
                            reject({ status: res.statusCode, message: result.message || body });
                        }
                    } catch (e) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(body);
                        } else {
                            reject({ status: res.statusCode, message: body });
                        }
                    }
                });
            });

            req.on('error', reject);
            
            if (data) {
                if (isFormData) {
                    req.write(data);
                } else {
                    req.write(JSON.stringify(data));
                }
            }
            
            req.end();
        });
    }

    /**
     * Authenticate with Guacamole and get token
     */
    async authenticate() {
        if (!this.isEnabled()) {
            throw new Error('Guacamole integration is disabled');
        }

        try {
            const formData = `username=${encodeURIComponent(this.config.credentials.username)}&password=${encodeURIComponent(this.config.credentials.password)}`;
            const result = await this.request('POST', '/tokens', formData, true);
            
            this.authToken = result.authToken;
            this.dataSource = result.dataSource || 'postgresql';
            
            console.log('[Guacamole] Authentication successful');
            return true;
        } catch (error) {
            console.error('[Guacamole] Authentication failed:', error.message);
            throw error;
        }
    }

    /**
     * Ensure we have a valid auth token
     */
    async ensureAuthenticated() {
        if (!this.authToken) {
            await this.authenticate();
        }
        return true;
    }

    /**
     * Get or create the Matrix connection group
     */
    async getOrCreateConnectionGroup() {
        await this.ensureAuthenticated();
        
        const groupName = this.config.connectionGroup.name;
        
        // Get existing groups
        try {
            const groups = await this.request('GET', `/session/data/${this.dataSource}/connectionGroups`);
            
            // Find Matrix group
            for (const [id, group] of Object.entries(groups)) {
                if (group.name === groupName) {
                    this.config.connectionGroup.id = id;
                    return id;
                }
            }
            
            // Create new group
            const newGroup = await this.request('POST', `/session/data/${this.dataSource}/connectionGroups`, {
                parentIdentifier: 'ROOT',
                name: groupName,
                type: 'ORGANIZATIONAL'
            });
            
            this.config.connectionGroup.id = newGroup.identifier;
            console.log(`[Guacamole] Created connection group: ${groupName}`);
            return newGroup.identifier;
        } catch (error) {
            console.error('[Guacamole] Error with connection group:', error.message);
            return 'ROOT';
        }
    }

    /**
     * Create a new connection in Guacamole
     */
    async createConnection(device, protocol) {
        await this.ensureAuthenticated();
        
        const groupId = await this.getOrCreateConnectionGroup();
        const defaults = this.config.defaults[protocol] || {};
        
        const connectionName = `${device.name || device.nickname || device.ip} (${protocol.toUpperCase()})`;
        
        const connection = {
            parentIdentifier: groupId,
            name: connectionName,
            protocol: protocol,
            parameters: this.buildConnectionParameters(device, protocol, defaults),
            attributes: {
                'max-connections': '2',
                'max-connections-per-user': '2'
            }
        };

        try {
            const result = await this.request('POST', `/session/data/${this.dataSource}/connections`, connection);
            console.log(`[Guacamole] Created connection: ${connectionName} (ID: ${result.identifier})`);
            return result;
        } catch (error) {
            console.error('[Guacamole] Error creating connection:', error.message);
            throw error;
        }
    }

    /**
     * Build connection parameters based on protocol
     */
    buildConnectionParameters(device, protocol, defaults) {
        const ip = device.ip || device.ipAddress;
        const params = { hostname: ip };

        switch (protocol) {
            case 'ssh':
                params.port = device.sshPort || defaults.port || 22;
                params['color-scheme'] = defaults.colorScheme || 'green-black';
                params['font-size'] = String(defaults.fontSize || 12);
                if (device.sshUsername) params.username = device.sshUsername;
                if (device.sshPassword) params.password = device.sshPassword;
                break;

            case 'rdp':
                params.port = device.rdpPort || defaults.port || 3389;
                params.security = defaults.security || 'any';
                params['ignore-cert'] = defaults.ignoreCert ? 'true' : 'false';
                params.width = String(defaults.width || 1920);
                params.height = String(defaults.height || 1080);
                if (device.rdpUsername) params.username = device.rdpUsername;
                if (device.rdpPassword) params.password = device.rdpPassword;
                if (device.rdpDomain) params.domain = device.rdpDomain;
                break;

            case 'vnc':
                params.port = device.vncPort || defaults.port || 5900;
                params['color-depth'] = String(defaults.colorDepth || 24);
                if (device.vncPassword) params.password = device.vncPassword;
                break;

            case 'telnet':
                params.port = device.telnetPort || defaults.port || 23;
                params['color-scheme'] = defaults.colorScheme || 'green-black';
                if (device.telnetUsername) params.username = device.telnetUsername;
                if (device.telnetPassword) params.password = device.telnetPassword;
                break;
        }

        return params;
    }

    /**
     * Find existing connection for a device
     */
    async findConnection(deviceIp, protocol) {
        await this.ensureAuthenticated();
        
        try {
            const connections = await this.request('GET', `/session/data/${this.dataSource}/connections`);
            
            for (const [id, conn] of Object.entries(connections)) {
                if (conn.protocol === protocol) {
                    // Get connection details to check hostname
                    const details = await this.request('GET', `/session/data/${this.dataSource}/connections/${id}/parameters`);
                    if (details.hostname === deviceIp) {
                        return { id, ...conn, parameters: details };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('[Guacamole] Error finding connection:', error.message);
            return null;
        }
    }

    /**
     * Get or create connection for a device
     */
    async getOrCreateConnection(device, protocol) {
        const ip = device.ip || device.ipAddress;
        
        // Try to find existing connection
        let connection = await this.findConnection(ip, protocol);
        
        if (!connection) {
            // Create new connection
            connection = await this.createConnection(device, protocol);
        }
        
        return connection;
    }

    /**
     * Delete a connection
     */
    async deleteConnection(connectionId) {
        await this.ensureAuthenticated();
        
        try {
            await this.request('DELETE', `/session/data/${this.dataSource}/connections/${connectionId}`);
            console.log(`[Guacamole] Deleted connection: ${connectionId}`);
            return true;
        } catch (error) {
            console.error('[Guacamole] Error deleting connection:', error.message);
            return false;
        }
    }

    /**
     * Generate URL to open Guacamole connection
     */
    getConnectionUrl(connectionId) {
        const baseUrl = this.config.server.baseUrl;
        // Guacamole uses base64 encoded connection identifier
        const encodedId = Buffer.from(`${connectionId}\0c\0${this.dataSource}`).toString('base64');
        return `${baseUrl}/#/client/${encodedId}`;
    }

    /**
     * Get quick connect URL (without pre-created connection)
     * User enters credentials in Guacamole
     */
    getQuickConnectUrl(device, protocol) {
        const baseUrl = this.config.server.baseUrl;
        const ip = device.ip || device.ipAddress;
        const defaults = this.config.defaults[protocol] || {};
        const port = device[`${protocol}Port`] || defaults.port;
        
        // Format: protocol://hostname:port
        return `${baseUrl}/#/?protocol=${protocol}&hostname=${ip}&port=${port}`;
    }

    /**
     * Get Guacamole base URL
     */
    getBaseUrl() {
        return this.config.server.baseUrl;
    }

    /**
     * Get connection info for frontend
     */
    async getConnectionInfo(device, protocol) {
        if (!this.isEnabled()) {
            return {
                enabled: false,
                message: 'Guacamole integration is disabled'
            };
        }

        try {
            const connection = await this.getOrCreateConnection(device, protocol);
            return {
                enabled: true,
                connectionId: connection.identifier,
                connectionName: connection.name,
                url: this.getConnectionUrl(connection.identifier),
                baseUrl: this.getBaseUrl(),
                openInNewTab: this.config.ui.openInNewTab
            };
        } catch (error) {
            return {
                enabled: true,
                error: error.message,
                // Fallback to direct URL
                url: `${this.getBaseUrl()}/#/`,
                baseUrl: this.getBaseUrl(),
                openInNewTab: this.config.ui.openInNewTab
            };
        }
    }

    /**
     * Get Guacamole status and configuration for frontend
     */
    getStatus() {
        return {
            enabled: this.isEnabled(),
            baseUrl: this.config?.server?.baseUrl || null,
            protocols: this.config?.ui?.showProtocolButtons || ['ssh', 'rdp', 'vnc', 'telnet'],
            openInNewTab: this.config?.ui?.openInNewTab || true
        };
    }
}

// Singleton instance
const guacamoleAPI = new GuacamoleAPI();

module.exports = guacamoleAPI;
