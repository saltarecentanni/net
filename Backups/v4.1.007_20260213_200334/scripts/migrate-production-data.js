#!/usr/bin/env node
/**
 * MIGRAÇÃO DE PRODUÇÃO v3.* → v4.*
 * 
 * Migra dados de v3.6.035 para v4.1.005 com:
 * - Limpeza completa de dados órfãos
 * - Validação de integridade
 * - Geração de coordenadas X,Y quando faltam
 * - Schema v4 correto
 */

const fs = require('fs');
const path = require('path');

class ProductionMigration {
  constructor(dataPath = 'data/network_manager.json') {
    this.dataPath = dataPath;
    this.report = {
      startTime: new Date(),
      inputFile: null,
      stats: {
        devicesImported: 0,
        devicesFixed: 0,
        connectionsImported: 0,
        connectionsOrphaned: 0,
        connectionsRemovedOrphans: 0,
        roomsImported: 0,
        locationsImported: 0
      },
      issues: [],
      fixes: []
    };
  }

  /**
   * Lê dados v3 (pode ser de arquivo ou stdin)
   */
  readV3Data(inputPath) {
    try {
      if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      const content = fs.readFileSync(inputPath, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`\n✅ Arquivo v3 carregado: ${inputPath}`);
      console.log(`   - Dispositivos: ${data.devices?.length || 0}`);
      console.log(`   - Conexões: ${data.connections?.length || 0}`);
      console.log(`   - Salas: ${data.rooms?.length || 0}`);

      this.report.inputFile = inputPath;
      return data;
    } catch (error) {
      console.error(`❌ Erro ao carregar v3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migra schema de device v3 → v4
   */
  migrateDevice(v3Device, index) {
    // Cria device v4 mantendo compatibilidade
    const v4Device = {
      id: Number(v3Device.id),
      name: v3Device.name || `Device-${v3Device.id}`,
      type: v3Device.type || 'others',
      status: v3Device.status || 'active',
      
      // Campos com valores padrão
      rackId: v3Device.rackId || '',
      order: v3Device.order || index,
      location: v3Device.location || '',
      brandModel: v3Device.brandModel || '',
      
      // Arrays
      addresses: Array.isArray(v3Device.addresses) ? v3Device.addresses : [],
      ports: Array.isArray(v3Device.ports) ? v3Device.ports : [],
      notes: v3Device.notes || '',
      
      // Links/Service
      service: v3Device.service || '',
      links: Array.isArray(v3Device.links) ? v3Device.links : [],
      
      // Coordenadas (v4)
      x: typeof v3Device.x === 'number' ? v3Device.x : null,
      y: typeof v3Device.y === 'number' ? v3Device.y : null
    };

    // Gera coordenadas se faltarem
    if (!v4Device.x || !v4Device.y) {
      const coords = this.generateCoordinates(index);
      v4Device.x = v4Device.x || coords.x;
      v4Device.y = v4Device.y || coords.y;
      this.report.fixes.push(`Device ${v4Device.id}: Coordenadas geradas (${v4Device.x}, ${v4Device.y})`);
      this.report.stats.devicesFixed++;
    }

    this.report.stats.devicesImported++;
    return v4Device;
  }

  /**
   * Gera coordenadas em grid quando faltam
   */
  generateCoordinates(index) {
    const cols = 10;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: col * 120 + 50,
      y: row * 150 + 50
    };
  }

  /**
   * Migra schema de connection v3 → v4
   */
  migrateConnection(v3Conn, deviceIdMap) {
    const v4Conn = {
      id: v3Conn.id || `c-${Math.random().toString(36).substr(2, 12)}`,
      from: v3Conn.from,
      fromPort: v3Conn.fromPort || '',
      to: v3Conn.to !== undefined && v3Conn.to !== null ? v3Conn.to : null,
      toPort: v3Conn.toPort || '',
      
      // External/WallJack
      externalDest: v3Conn.externalDest || '',
      isWallJack: v3Conn.isWallJack || false,
      wallJackType: v3Conn.wallJackType || 'RJ45',
      
      // Cable info
      type: v3Conn.type || 'lan',
      status: v3Conn.status || 'active',
      cableMarker: v3Conn.cableMarker || '',
      cableColor: v3Conn.cableColor || '#6b7280',
      
      // Room ref
      roomId: v3Conn.roomId || null,
      notes: v3Conn.notes || ''
    };

    return v4Conn;
  }

  /**
   * Valida e remove conexões órfãs
   */
  validateConnections(connections, validDeviceIds) {
    const valid = [];
    const orphaned = [];

    connections.forEach((conn, idx) => {
      // Valida campos obrigatórios
      if (!conn.from && conn.from !== 0) {
        orphaned.push({ index: idx, reason: 'missing from', conn });
        return;
      }

      // Se to é null, é válido (wallport)
      if (conn.to === null || conn.to === undefined) {
        if (conn.externalDest) {
          valid.push(conn);
          return;
        }
        orphaned.push({ index: idx, reason: 'no to and no externalDest', conn });
        return;
      }

      // Valida existência de devices
      if (!validDeviceIds.has(conn.from)) {
        orphaned.push({ index: idx, reason: `invalid from device ${conn.from}`, conn });
        return;
      }

      if (!validDeviceIds.has(conn.to)) {
        orphaned.push({ index: idx, reason: `invalid to device ${conn.to}`, conn });
        return;
      }

      valid.push(conn);
    });

    this.report.stats.connectionsImported = valid.length;
    this.report.stats.connectionsOrphaned = orphaned.length;
    this.report.stats.connectionsRemovedOrphans = orphaned.length;

    if (orphaned.length > 0) {
      console.log(`\n⚠️  ${orphaned.length} conexões órfãs removidas`);
      orphaned.forEach(o => {
        console.log(`   - Connection ${o.index}: ${o.reason}`);
      });
    }

    return valid;
  }

  /**
   * Executa migração completa
   */
  migrate(inputPath) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║        MIGRAÇÃO DE PRODUÇÃO v3.* → v4.1.005                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    try {
      // 1. Lê dados v3
      const v3Data = this.readV3Data(inputPath);

      // 2. Cria backup do arquivo antigo
      if (fs.existsSync(this.dataPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = `${this.dataPath}.pre-migration-${timestamp}.bak`;
        fs.copyFileSync(this.dataPath, backupPath);
        console.log(`✅ Backup da versão anterior: ${backupPath}`);
      }

      // 3. Migra dispositivos
      console.log(`\n🔄 Migrando ${v3Data.devices?.length || 0} dispositivos...`);
      const devices = (v3Data.devices || []).map((d, i) => this.migrateDevice(d, i));
      const validDeviceIds = new Set(devices.map(d => d.id));

      // 4. Migra conexões
      console.log(`🔄 Migrando ${v3Data.connections?.length || 0} conexões...`);
      let connections = (v3Data.connections || []).map(c => this.migrateConnection(c, validDeviceIds));
      connections = this.validateConnections(connections, validDeviceIds);

      // 5. Migra salas e locações
      const rooms = v3Data.rooms || [];
      const locations = v3Data.locations || [];
      const sites = v3Data.sites || [{id: 'main', name: 'Sede Ivrea', isDefault: true}];

      this.report.stats.roomsImported = rooms.length;
      this.report.stats.locationsImported = locations.length;

      // 6. Constrói dados v4
      const v4Data = {
        devices,
        connections,
        rooms,
        locations,
        sites,
        nextDeviceId: (v3Data.nextDeviceId || Math.max(...devices.map(d => d.id), 0)) + 1,
        nextLocationId: v3Data.nextLocationId || locations.length + 1,
        exportedAt: new Date().toISOString(),
        version: '4.1.005',
        migratedFrom: v3Data.version || 'unknown',
        migrationDate: new Date().toISOString()
      };

      // 7. Salva arquivo
      fs.writeFileSync(this.dataPath, JSON.stringify(v4Data, null, 2));
      console.log(`\n✅ Arquivo v4 salvo: ${this.dataPath}`);

      // 8. Gera relatório
      this.generateReport();

      return true;
    } catch (error) {
      console.error(`\n❌ ERRO na migração: ${error.message}`);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Gera relatório de migração
   */
  generateReport() {
    this.report.endTime = new Date();
    this.report.duration = (this.report.endTime - this.report.startTime) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  RELATÓRIO DE MIGRAÇÃO                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 ESTATÍSTICAS:');
    console.log(`   Dispositivos importados: ${this.report.stats.devicesImported}`);
    console.log(`   Dispositivos corrigidos: ${this.report.stats.devicesFixed}`);
    console.log(`   Conexões importadas: ${this.report.stats.connectionsImported}`);
    console.log(`   Conexões removidas (órfãs): ${this.report.stats.connectionsRemovedOrphans}`);
    console.log(`   Salas: ${this.report.stats.roomsImported}`);
    console.log(`   Locações: ${this.report.stats.locationsImported}`);

    if (this.report.fixes.length > 0) {
      console.log(`\n🔧 CORREÇÕES APLICADAS (${this.report.fixes.length}):`);
      this.report.fixes.slice(0, 5).forEach(fix => {
        console.log(`   - ${fix}`);
      });
      if (this.report.fixes.length > 5) {
        console.log(`   ... e ${this.report.fixes.length - 5} mais`);
      }
    }

    console.log(`\n⏱️  Tempo total: ${this.report.duration.toFixed(2)}s`);
    console.log(`✅ Migração concluída! Arquivo: ${this.dataPath}`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Uso: node migrate-production-data.js <arquivo-v3.json>

Exemplo:
  node migrate-production-data.js /tmp/v3-import.json
  node migrate-production-data.js Archives/bkp/v3.6.028/data/network_manager.json
    `);
    process.exit(0);
  }

  const inputFile = args[0];
  const migrator = new ProductionMigration();
  
  const success = migrator.migrate(inputFile);
  process.exit(success ? 0 : 1);
}

module.exports = ProductionMigration;
