#!/usr/bin/env node
/**
 * MIGRAÇÃO v3.6.028 → v4.1.005 COM GRUPOS DE LOCATIONS
 * 
 * Executa:
 * 1. Migração completa de dados v3 para v4
 * 2. Adiciona 3 grupos padrão em cada Location: AREA, ENDPOINT, WALLJACK
 */

const fs = require('fs');
const path = require('path');

class MigrationWithLocationGroups {
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
        locationsImported: 0,
        groupsAdded: 0
      },
      issues: [],
      fixes: []
    };

    // Grupos padrão que serão adicionados a cada location
    this.DEFAULT_GROUPS = ['AREA', 'ENDPOINT', 'WALLJACK'];
  }

  /**
   * Lê dados v3
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
      console.log(`   - Locations: ${data.locations?.length || 0}`);

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
    const v4Device = {
      id: Number(v3Device.id),
      name: v3Device.name || `Device-${v3Device.id}`,
      type: v3Device.type || 'others',
      status: v3Device.status || 'active',
      
      rackId: v3Device.rackId || '',
      order: v3Device.order || index,
      location: v3Device.location || '',
      brandModel: v3Device.brandModel || '',
      
      addresses: Array.isArray(v3Device.addresses) ? v3Device.addresses : [],
      ports: Array.isArray(v3Device.ports) ? v3Device.ports : [],
      notes: v3Device.notes || '',
      
      service: v3Device.service || '',
      links: Array.isArray(v3Device.links) ? v3Device.links : [],
      
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
   * Gera coordenadas em grid
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
      
      externalDest: v3Conn.externalDest || '',
      isWallJack: v3Conn.isWallJack || false,
      wallJackType: v3Conn.wallJackType || 'RJ45',
      
      type: v3Conn.type || 'lan',
      status: v3Conn.status || 'active',
      cableMarker: v3Conn.cableMarker || '',
      cableColor: v3Conn.cableColor || '#6b7280',
      
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
      if (!conn.from && conn.from !== 0) {
        orphaned.push({ index: idx, reason: 'missing from', conn });
        return;
      }

      if (conn.to === null || conn.to === undefined) {
        if (conn.externalDest) {
          valid.push(conn);
          return;
        }
        orphaned.push({ index: idx, reason: 'no to and no externalDest', conn });
        return;
      }

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
    }

    return valid;
  }

  /**
   * Adiciona grupos padrão a cada location
   * NOVO: Cada location terá AREA, ENDPOINT, WALLJACK
   */
  addLocationGroups(locations) {
    console.log(`\n🏘️  Adicionando grupos às ${locations.length} locations...`);
    
    const locationsWithGroups = locations.map((location, idx) => {
      // Cria estrutura com groups
      const locationWithGroups = {
        ...location,
        groups: this.DEFAULT_GROUPS.map((groupName, groupIdx) => ({
          id: `${location.id}-${groupName.toLowerCase()}`,
          locationId: location.id,
          name: groupName,
          order: groupIdx,
          isVisible: true,
          color: this.getGroupColor(groupName)
        }))
      };

      this.report.stats.groupsAdded += this.DEFAULT_GROUPS.length;
      return locationWithGroups;
    });

    console.log(`✅ ${this.report.stats.groupsAdded} grupos criados (3 por location)`);
    return locationsWithGroups;
  }

  /**
   * Cores específicas para cada grupo
   */
  getGroupColor(groupName) {
    const colors = {
      'AREA': '#3b82f6',       // Azul
      'ENDPOINT': '#ef4444',   // Vermelho
      'WALLJACK': '#10b981'    // Verde
    };
    return colors[groupName] || '#6b7280';
  }

  /**
   * Executa migração completa
   */
  migrate(inputPath) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     MIGRAÇÃO v3.6.028 → v4.1.005 COM GRUPOS DE LOCATIONS      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    try {
      // 1. Lê dados v3
      const v3Data = this.readV3Data(inputPath);

      // 2. Backup
      if (fs.existsSync(this.dataPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = `${this.dataPath}.pre-migration-${timestamp}.bak`;
        fs.copyFileSync(this.dataPath, backupPath);
        console.log(`✅ Backup: ${backupPath}`);
      }

      // 3. Migra dispositivos
      console.log(`\n🔄 Migrando ${v3Data.devices?.length || 0} dispositivos...`);
      const devices = (v3Data.devices || []).map((d, i) => this.migrateDevice(d, i));
      const validDeviceIds = new Set(devices.map(d => d.id));

      // 4. Migra conexões
      console.log(`🔄 Migrando ${v3Data.connections?.length || 0} conexões...`);
      let connections = (v3Data.connections || []).map(c => this.migrateConnection(c, validDeviceIds));
      connections = this.validateConnections(connections, validDeviceIds);

      // 5. Migra salas/locations
      const rooms = v3Data.rooms || [];
      const sites = v3Data.sites || [{id: 'main', name: 'Sede Ivrea', isDefault: true}];
      let locations = v3Data.locations || [];
      this.report.stats.locationsImported = locations.length;

      // 6. NOVO: Adiciona grupos a cada location
      locations = this.addLocationGroups(locations);

      // 7. Constrói dados v4
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

      // 8. Salva arquivo
      fs.writeFileSync(this.dataPath, JSON.stringify(v4Data, null, 2));
      console.log(`\n✅ Arquivo v4 salvo: ${this.dataPath}`);

      // 9. Relatório
      this.generateReport();

      return true;
    } catch (error) {
      console.error(`\n❌ ERRO: ${error.message}`);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Gera relatório
   */
  generateReport() {
    this.report.endTime = new Date();
    this.report.duration = (this.report.endTime - this.report.startTime) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  RELATÓRIO DE MIGRAÇÃO                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 ESTATÍSTICAS:');
    console.log(`   ✅ Dispositivos importados: ${this.report.stats.devicesImported}`);
    console.log(`   🔧 Dispositivos corrigidos: ${this.report.stats.devicesFixed}`);
    console.log(`   ✅ Conexões importadas: ${this.report.stats.connectionsImported}`);
    console.log(`   ❌ Conexões removidas (órfãs): ${this.report.stats.connectionsRemovedOrphans}`);
    console.log(`   ✅ Locations importadas: ${this.report.stats.locationsImported}`);
    console.log(`   🏘️  Grupos adicionados: ${this.report.stats.groupsAdded}`);
    console.log(`      └─ AREA, ENDPOINT, WALLJACK para cada location`);

    console.log(`\n⏱️  Tempo total: ${this.report.duration.toFixed(2)}s`);
    console.log(`✅ Migração concluída! Arquivo: ${this.dataPath}`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Uso: node migrate-v3-to-v4-with-groups.js <arquivo-v3.json>

Exemplo:
  node migrate-v3-to-v4-with-groups.js /tmp/v3-028-production.json

O que faz:
  1. Migra dados de v3 para v4 com validação
  2. Adiciona 3 grupos padrão a cada Location:
     - AREA (azul: #3b82f6)
     - ENDPOINT (vermelho: #ef4444)
     - WALLJACK (verde: #10b981)
  3. Gera coordenadas para dispositivos sem posição
  4. Remove conexões órfãs
    `);
    process.exit(0);
  }

  const inputFile = args[0];
  const migrator = new MigrationWithLocationGroups();
  
  const success = migrator.migrate(inputFile);
  process.exit(success ? 0 : 1);
}

module.exports = MigrationWithLocationGroups;
