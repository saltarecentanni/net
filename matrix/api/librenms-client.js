/**
 * LibreNMS Integration Module
 * 
 * Fornece integração com LibreNMS para monitorar portas de switches
 * Endpoints:
 *   GET /api/librenms/health      - Health check
 *   GET /api/librenms/devices     - Lista dispositivos em LibreNMS
 *   GET /api/librenms/ports/:id   - Portas de um dispositivo
 *   GET /api/librenms/port-status/:deviceId/:portId - Status einzelne porta
 */

const fetch = require('node-fetch');

class LibreNMSClient {
    constructor(host, apiToken) {
        this.host = host || process.env.LIBRENMS_HOST || 'http://localhost:8000';
        this.apiToken = apiToken || process.env.LIBRENMS_API_TOKEN;
        this.cacheDevices = {};
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Faz request para API LibreNMS
     */
    async request(endpoint, options = {}) {
        try {
            const url = `${this.host}/api/v0${endpoint}`;
            const headers = {
                'X-Auth-Token': this.apiToken,
                'Accept': 'application/json',
                ...options.headers
            };

            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                timeout: 10000
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('LibreNMS API Token inválido ou expirado');
                }
                throw new Error(`LibreNMS API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[LibreNMS] Request error:`, error.message);
            throw error;
        }
    }

    /**
     * Verifica conectividade com LibreNMS
     */
    async health() {
        try {
            const data = await this.request('/system');
            return {
                status: 'ok',
                version: data.version,
                hostname: data.hostname
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Lista todos os dispositivos em LibreNMS
     */
    async listDevices(force = false) {
        const now = Date.now();
        
        // Usar cache se disponível
        if (!force && this.cacheDevices.data && (now - this.cacheDevices.timestamp) < this.cacheExpiry) {
            return this.cacheDevices.data;
        }

        try {
            const data = await this.request('/devices');
            
            const devices = (data.devices || []).map(d => ({
                id: d.device_id,
                hostname: d.hostname,
                sysName: d.sysName,
                sysDescription: d.sysDescr,
                ipv4: d.ipv4 && d.ipv4.ipv4_address,
                status: d.status,
                os: d.os,
                serial: d.serial,
                lastDiscovered: d.last_discovered
            }));

            // Cachear resultados
            this.cacheDevices = {
                data: devices,
                timestamp: now
            };

            return devices;
        } catch (error) {
            console.error('[LibreNMS] Error listing devices:', error.message);
            return [];
        }
    }

    /**
     * Obtém portas de um dispositivo
     */
    async getPortes(deviceId) {
        try {
            const data = await this.request(`/devices/${deviceId}/ports`);
            
            return (data.ports || []).map(p => ({
                id: p.port_id,
                index: p.ifIndex,
                name: p.ifName,
                label: p.port_label || p.ifName,
                alias: p.ifAlias,
                description: p.port_description,
                type: p.ifType,
                status: p.ifOperStatus,        // up, down, testing, dormant, notPresent, lowerLayerDown
                adminStatus: p.ifAdminStatus,
                mtu: p.ifMtu,
                speed: p.ifSpeed,
                highSpeed: p.ifHighSpeed,
                inOctets: p.ifInOctets,
                outOctets: p.ifOutOctets,
                inErrors: p.ifInErrors,
                outErrors: p.ifOutErrors,
                inDiscards: p.ifInDiscards,
                outDiscards: p.ifOutDiscards,
                lastChange: p.ifLastChange,
                vlan: p.portVlan,
                tagged: p.portTagged,
                vlanTags: p.vlanTags
            }));
        } catch (error) {
            console.error(`[LibreNMS] Error getting ports for device ${deviceId}:`, error.message);
            return [];
        }
    }

    /**
     * Obtém status de uma porta específica
     */
    async getPortStatus(deviceId, portId) {
        try {
            const ports = await this.getPortes(deviceId);
            const port = ports.find(p => p.id === parseInt(portId));
            
            if (!port) {
                throw new Error(`Porta ${portId} não encontrada`);
            }

            return port;
        } catch (error) {
            console.error(`[LibreNMS] Error getting port status:`, error.message);
            throw error;
        }
    }

    /**
     * Busca dispositivo por IP
     */
    async findDeviceByIP(ipAddress) {
        try {
            const devices = await this.listDevices();
            return devices.find(d => d.ipv4 === ipAddress);
        } catch (error) {
            console.error('[LibreNMS] Error finding device by IP:', error.message);
            return null;
        }
    }

    /**
     * Busca dispositivo por hostname
     */
    async findDeviceByHostname(hostname) {
        try {
            const devices = await this.listDevices();
            return devices.find(d => 
                d.hostname === hostname || 
                d.sysName === hostname
            );
        } catch (error) {
            console.error('[LibreNMS] Error finding device by hostname:', error.message);
            return null;
        }
    }
}

/**
 * Exporte para integração em server.js
 */
module.exports = LibreNMSClient;

/**
 * Exemplo de uso em server.js:
 * 
 * const LibreNMSClient = require('./librenms-client.js');
 * const lnms = new LibreNMSClient();
 * 
 * app.get('/api/librenms/health', async (req, res) => {
 *     const status = await lnms.health();
 *     res.json(status);
 * });
 * 
 * app.get('/api/librenms/devices', async (req, res) => {
 *     const devices = await lnms.listDevices();
 *     res.json({ devices });
 * });
 * 
 * app.get('/api/librenms/ports/:deviceId', async (req, res) => {
 *     const ports = await lnms.getPortes(req.params.deviceId);
 *     res.json({ ports });
 * });
 * 
 * app.get('/api/librenms/port/:deviceId/:portId', async (req, res) => {
 *     try {
 *         const port = await lnms.getPortStatus(
 *             req.params.deviceId, 
 *             req.params.portId
 *         );
 *         res.json({ port });
 *     } catch (error) {
 *         res.status(404).json({ error: error.message });
 *     }
 * });
 */
