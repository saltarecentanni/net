/**
 * Adicionar ao server.js do Tiesse Matrix
 * 
 * Coloque isto DEPOIS de todas as outras rotas, perto do final:
 */

// ============================================================
// INTEGRAÇÃO LIBRENMS - MONITORAMENTO DE PORTAS
// ============================================================

const LibreNMSClient = require('./api/librenms-client.js');
const lnms = new LibreNMSClient();

/**
 * GET /api/librenms/health
 * Verifica se LibreNMS está acessível
 */
app.get('/api/librenms/health', async (req, res) => {
    console.log('[API] GET /api/librenms/health');
    const status = await lnms.health();
    res.json(status);
});

/**
 * GET /api/librenms/devices
 * Lista todos os dispositivos monitorados em LibreNMS
 */
app.get('/api/librenms/devices', async (req, res) => {
    console.log('[API] GET /api/librenms/devices');
    try {
        const devices = await lnms.listDevices(req.query.force === 'true');
        res.json({
            status: 'ok',
            count: devices.length,
            devices
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/librenms/ports/:deviceId
 * Obtém todas as portas de um dispositivo LibreNMS
 * 
 * Exemplo:
 *   GET /api/librenms/ports/1
 */
app.get('/api/librenms/ports/:deviceId', async (req, res) => {
    console.log(`[API] GET /api/librenms/ports/${req.params.deviceId}`);
    try {
        const ports = await lnms.getPortes(req.params.deviceId);
        
        // Agrupar por status
        const grouped = {
            up: ports.filter(p => p.status === 'up'),
            down: ports.filter(p => p.status === 'down'),
            other: ports.filter(p => p.status !== 'up' && p.status !== 'down')
        };

        res.json({
            status: 'ok',
            deviceId: req.params.deviceId,
            count: ports.length,
            summary: {
                total: ports.length,
                up: grouped.up.length,
                down: grouped.down.length,
                other: grouped.other.length
            },
            ports,
            grouped
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/librenms/port/:deviceId/:portId
 * Obtém status de uma porta específica
 * 
 * Exemplo:
 *   GET /api/librenms/port/1/5
 */
app.get('/api/librenms/port/:deviceId/:portId', async (req, res) => {
    console.log(`[API] GET /api/librenms/port/${req.params.deviceId}/${req.params.portId}`);
    try {
        const port = await lnms.getPortStatus(
            req.params.deviceId,
            req.params.portId
        );
        res.json({
            status: 'ok',
            port
        });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

/**
 * GET /api/librenms/device/by-ip/:ipAddress
 * Busca dispositivo por IP
 * 
 * Exemplo:
 *   GET /api/librenms/device/by-ip/192.168.1.10
 */
app.get('/api/librenms/device/by-ip/:ipAddress', async (req, res) => {
    console.log(`[API] GET /api/librenms/device/by-ip/${req.params.ipAddress}`);
    try {
        const device = await lnms.findDeviceByIP(req.params.ipAddress);
        
        if (!device) {
            return res.status(404).json({ 
                error: `Dispositivo com IP ${req.params.ipAddress} não encontrado em LibreNMS` 
            });
        }

        // Se encontrou, puxar portas também
        const ports = await lnms.getPortes(device.id);
        
        res.json({
            status: 'ok',
            device,
            ports: {
                count: ports.length,
                up: ports.filter(p => p.status === 'up').length,
                down: ports.filter(p => p.status === 'down').length,
                list: ports
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/librenms/device/by-hostname/:hostname
 * Busca dispositivo por hostname/sysName
 * 
 * Exemplo:
 *   GET /api/librenms/device/by-hostname/switch-01
 */
app.get('/api/librenms/device/by-hostname/:hostname', async (req, res) => {
    console.log(`[API] GET /api/librenms/device/by-hostname/${req.params.hostname}`);
    try {
        const device = await lnms.findDeviceByHostname(req.params.hostname);
        
        if (!device) {
            return res.status(404).json({ 
                error: `Dispositivo ${req.params.hostname} não encontrado em LibreNMS` 
            });
        }

        const ports = await lnms.getPortes(device.id);
        
        res.json({
            status: 'ok',
            device,
            ports: {
                count: ports.length,
                up: ports.filter(p => p.status === 'up').length,
                down: ports.filter(p => p.status === 'down').length,
                list: ports
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/device/:deviceId/sync-librenms
 * Sincroniza um dispositivo Tiesse com LibreNMS
 * Procura por IP e adiciona as portas do LibreNMS
 */
app.post('/api/device/:deviceId/sync-librenms', async (req, res) => {
    console.log(`[API] POST /api/device/${req.params.deviceId}/sync-librenms`);
    try {
        const deviceId = parseInt(req.params.deviceId);
        const device = appState.devices.find(d => d.id === deviceId);
        
        if (!device) {
            return res.status(404).json({ error: 'Dispositivo não encontrado' });
        }

        const ip = device.addresses?.ipv4;
        if (!ip) {
            return res.status(400).json({ error: 'Dispositivo sem IP configurado' });
        }

        // Buscar em LibreNMS
        const lnmsDevice = await lnms.findDeviceByIP(ip);
        if (!lnmsDevice) {
            return res.status(404).json({ error: 'Dispositivo não encontrado em LibreNMS' });
        }

        // Puxar portas
        const ports = await lnms.getPortes(lnmsDevice.id);

        // Atualizar dispositivo Tiesse
        device.librenmsId = lnmsDevice.id;
        device.librenmsSync = {
            hostname: lnmsDevice.hostname,
            os: lnmsDevice.os,
            serial: lnmsDevice.serial,
            lastSync: new Date().toISOString(),
            portCount: ports.length,
            portsUp: ports.filter(p => p.status === 'up').length,
            portsDown: ports.filter(p => p.status === 'down').length
        };
        device.librenms_ports = ports;

        res.json({
            status: 'ok',
            message: 'Sincronização concluída',
            device,
            ports
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ LibreNMS API endpoints registered');
