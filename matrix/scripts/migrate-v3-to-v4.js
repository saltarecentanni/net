#!/usr/bin/env node
/**
 * MIGRATE V3 TO V4
 * Converte dados v3.* para v4.* schema
 * - Adiciona x,y coordinates
 * - Normaliza campos
 * - Valida integridade
 */

const fs = require('fs');
const path = require('path');

// V3 JSON data provided by user
const v3Data = {
  "devices": [
    // ... dados aqui serão substituídos dinamicamente
  ],
  "connections": [],
  "rooms": [],
  "sites": [],
  "locations": [],
  "nextDeviceId": 141,
  "nextLocationId": 22
};

class V3toV4Migration {
  constructor() {
    this.v3Data = null;
    this.v4Data = {
      devices: [],
      connections: [],
      rooms: [],
      sites: [],
      locations: [],
      nextDeviceId: 141,
      nextLocationId: 22
    };
    this.stats = {
      devicesProcessed: 0,
      devicesWithCoords: 0,
      connectionsProcessed: 0,
      errors: []
    };
  }

  /**
   * Carrega dados v3
   */
  loadV3FromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.v3Data = JSON.parse(content);
      console.log(`✅ V3 data carregado: ${this.v3Data.devices.length} dispositivos`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao carregar V3: ${error.message}`);
      return false;
    }
  }

  /**
   * Gera coordenadas padrão em grid
   */
  generateCoordinates(index, total) {
    const cols = 10;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = col * 120 + 50;
    const y = row * 150 + 50;
    return { x, y };
  }

  /**
   * Converte dispositivos v3 para v4
   */
  migrateDevices() {
    console.log('\n🔄 Migrando dispositivos...');
    
    this.v3Data.devices.forEach((device, index) => {
      // Copia campos existentes
      const v4Device = { ...device };
      
      // Adiciona coordenadas se faltando
      if (typeof v4Device.x !== 'number' || typeof v4Device.y !== 'number') {
        const coords = this.generateCoordinates(index, this.v3Data.devices.length);
        v4Device.x = coords.x;
        v4Device.y = coords.y;
        this.stats.devicesWithCoords++;
      }
      
      // Garante campos v4
      v4Device.id = Number(v4Device.id);
      v4Device.x = Number(v4Device.x);
      v4Device.y = Number(v4Device.y);
      
      if (!v4Device.status) v4Device.status = 'active';
      if (!v4Device.location) v4Device.location = '';
      if (!Array.isArray(v4Device.addresses)) v4Device.addresses = [];
      if (!Array.isArray(v4Device.ports)) v4Device.ports = [];
      if (!v4Device.brandModel) v4Device.brandModel = '';
      if (!v4Device.notes) v4Device.notes = '';
      if (!v4Device.rackId) v4Device.rackId = '';
      if (v4Device.order === undefined) v4Device.order = index;
      
      this.v4Data.devices.push(v4Device);
      this.stats.devicesProcessed++;
    });
    
    console.log(`   ✅ ${this.stats.devicesProcessed} dispositivos migrados`);
    console.log(`   📍 ${this.stats.devicesWithCoords} com coordenadas adicionadas`);
  }

  /**
   * Converte conexões v3 para v4
   */
  migrateConnections() {
    console.log('\n🔗 Migrando conexões...');
    
    const validIds = new Set(this.v4Data.devices.map(d => d.id));
    let skipped = 0;
    
    this.v3Data.connections.forEach((conn) => {
      // Valida campo obrigatório 'from'
      if (conn.from === undefined || conn.from === null) {
        this.stats.errors.push(`Conexão sem 'from': ${JSON.stringify(conn).slice(0, 50)}`);
        skipped++;
        return;
      }
      
      // Valida referência para dispositivo existente
      if (conn.to && conn.to !== null && !validIds.has(conn.to)) {
        this.stats.errors.push(`Conexão com 'to' inválido: ${conn.from}→${conn.to}`);
        skipped++;
        return;
      }
      
      // Copia conexão
      const v4Conn = { ...conn };
      
      // Garante campos v4
      v4Conn.from = Number(v4Conn.from);
      if (v4Conn.to) v4Conn.to = Number(v4Conn.to);
      if (!v4Conn.type) v4Conn.type = 'lan';
      if (!v4Conn.status) v4Conn.status = 'active';
      if (!v4Conn.cableColor) v4Conn.cableColor = '#6b7280';
      if (!v4Conn.cableMarker) v4Conn.cableMarker = '';
      if (!v4Conn.notes) v4Conn.notes = '';
      
      this.v4Data.connections.push(v4Conn);
      this.stats.connectionsProcessed++;
    });
    
    console.log(`   ✅ ${this.stats.connectionsProcessed} conexões migradas`);
    if (skipped > 0) {
      console.log(`   ⚠️  ${skipped} conexões puladas (inválidas)`);
    }
  }

  /**
   ​Copia estruturas suportadas
   */
  migrateOtherData() {
    console.log('\n📋 Copiando outras estruturas...');
    
    // Rooms
    if (Array.isArray(this.v3Data.rooms)) {
      this.v4Data.rooms = this.v3Data.rooms;
      console.log(`   ✅ ${this.v4Data.rooms.length} rooms`);
    }
    
    // Sites
    if (Array.isArray(this.v3Data.sites)) {
      this.v4Data.sites = this.v3Data.sites;
      console.log(`   ✅ ${this.v4Data.sites.length} sites`);
    }
    
    // Locations
    if (Array.isArray(this.v3Data.locations)) {
      this.v4Data.locations = this.v3Data.locations;
      console.log(`   ✅ ${this.v4Data.locations.length} locations`);
    }
    
    // Metadata
    if (this.v3Data.nextDeviceId) {
      this.v4Data.nextDeviceId = this.v3Data.nextDeviceId;
    }
    if (this.v3Data.nextLocationId) {
      this.v4Data.nextLocationId = this.v3Data.nextLocationId;
    }
    
    this.v4Data.version = '4.1.005';
    this.v4Data.exportedAt = new Date().toISOString();
  }

  /**
   * Valida dados v4
   */
  validate() {
    console.log('\n✅ Validando dados v4...');
    
    let errors = 0;
    
    // Valida dispositivos
    this.v4Data.devices.forEach((device, idx) => {
      if (!device.id || !device.name || !device.type) {
        this.stats.errors.push(`Device[${idx}] campos obrigatórios faltando`);
        errors++;
      }
      if (typeof device.x !== 'number' || typeof device.y !== 'number') {
        this.stats.errors.push(`Device[${idx}] ${device.name} coordenadas inválidas`);
        errors++;
      }
    });
    
    // Valida conexões
    const validIds = new Set(this.v4Data.devices.map(d => d.id));
    this.v4Data.connections.forEach((conn, idx) => {
      if (!conn.from && conn.from !== 0) {
        this.stats.errors.push(`Connection[${idx}] sem 'from'`);
        errors++;
      }
      if (conn.to && !validIds.has(conn.to)) {
        this.stats.errors.push(`Connection[${idx}] 'to' inválido: ${conn.to}`);
        errors++;
      }
    });
    
    if (errors > 0) {
      console.log(`   ❌ ${errors} erros encontrados`);
      return false;
    }
    
    console.log(`   ✅ Validação passou!`);
    return true;
  }

  /**
   * Salva dados v4
   */
  save(outputPath) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(this.v4Data, null, 2));
      console.log(`\n💾 Dados v4 salvos: ${outputPath}`);
      console.log(`   📊 ${this.v4Data.devices.length} dispositivos`);
      console.log(`   🔗 ${this.v4Data.connections.length} conexões`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao salvar: ${error.message}`);
      return false;
    }
  }

  /**
   * Executa migração completa
   */
  run(inputPath, outputPath) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           MIGRAÇÃO V3.* → V4.1.005                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    if (!this.loadV3FromFile(inputPath)) return false;
    
    this.migrateDevices();
    this.migrateConnections();
    this.migrateOtherData();
    
    if (!this.validate()) {
      console.log('\n⚠️  Validação teve erros, mas continuando...');
    }
    
    if (!this.save(outputPath)) return false;
    
    // Relatório final
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   RESUMO DA MIGRAÇÃO                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📈 ESTATÍSTICAS:`);
    console.log(`   Dispositivos: ${this.stats.devicesProcessed}`);
    console.log(`   Com coords: ${this.stats.devicesWithCoords}`);
    console.log(`   Conexões: ${this.stats.connectionsProcessed}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  ERROS/WARNINGS (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err}`);
      });
      if (this.stats.errors.length > 5) {
        console.log(`   ... e ${this.stats.errors.length - 5} mais`);
      }
    }
    
    console.log(`\n✅ Migração completa! Pronto para v4.1.005`);
    return true;
  }
}

// Executa
if (require.main === module) {
  const inputPath = process.argv[2] || '/tmp/v3-data.json';
  const outputPath = process.argv[3] || 'data/network_manager.json';
  
  const migration = new V3toV4Migration();
  const success = migration.run(inputPath, outputPath);
  
  process.exit(success ? 0 : 1);
}

module.exports = V3toV4Migration;
