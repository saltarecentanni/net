#!/usr/bin/env node
/**
 * FERRAMENTA DE LIMPEZA E VALIDAÇÃO DE DADOS
 * Corrige integridade do banco de dados network_manager.json
 * 
 * Funções:
 * - Completa campos X,Y faltando
 * - Remove duplicatas de dispositivos
 * - Remove conexões órfãs
 * - Valida schema completo
 * - Gera relatório detalhado
 */

const fs = require('fs');
const path = require('path');

class DataCleanup {
  constructor(dataPath = 'data/network_manager.json') {
    this.dataPath = dataPath;
    this.data = null;
    this.backupPath = null;
    this.report = {
      startTime: new Date(),
      issues: {
        missingX: [],
        missingY: [],
        duplicateIds: [],
        duplicateNames: [],
        orphanConnections: [],
        invalidConnections: [],
        missingFields: []
      },
      fixes: {
        xAssigned: 0,
        yAssigned: 0,
        duplicatesRemoved: 0,
        orphansRemoved: 0,
        fieldsAdded: 0
      }
    };
  }

  /**
   * Carrega dados do arquivo JSON
   */
  load() {
    try {
      const content = fs.readFileSync(this.dataPath, 'utf8');
      this.data = JSON.parse(content);
      console.log(`✅ Dados carregados: ${this.data.devices.length} dispositivos, ${this.data.connections.length} conexões`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao carregar dados: ${error.message}`);
      return false;
    }
  }

  /**
   * Cria backup antes de fazer alterações
   */
  backup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.backupPath = `${this.dataPath}.cleanup_${timestamp}.bak`;
      fs.copyFileSync(this.dataPath, this.backupPath);
      console.log(`✅ Backup criado: ${this.backupPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar backup: ${error.message}`);
      return false;
    }
  }

  /**
   * Gera coordenadas padrão para dispositivos sem X,Y
   * Distribui em grid para evitar sobreposição
   */
  generateDefaultCoordinates(index, total) {
    const cols = 10;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = col * 120 + 50; // 50px margem + 120px por coluna
    const y = row * 150 + 50; // 50px margem + 150px por linha
    return { x, y };
  }

  /**
   * ETAPA 1: Completa campos X,Y faltando
   */
  fixMissingCoordinates() {
    console.log('\n📍 ETAPA 1: Completando coordenadas X,Y faltando...');
    
    let missingCount = 0;
    
    this.data.devices.forEach((device, index) => {
      if (typeof device.x !== 'number' || typeof device.y !== 'number') {
        const coords = this.generateDefaultCoordinates(index, this.data.devices.length);
        
        if (typeof device.x !== 'number') {
          device.x = coords.x;
          this.report.fixes.xAssigned++;
          this.report.issues.missingX.push(device.name || `ID:${device.id}`);
        }
        
        if (typeof device.y !== 'number') {
          device.y = coords.y;
          this.report.fixes.yAssigned++;
          this.report.issues.missingY.push(device.name || `ID:${device.id}`);
        }
        
        missingCount++;
      }
    });
    
    console.log(`   ✅ ${missingCount} dispositivos corrigidos`);
    console.log(`      - X atribuído: ${this.report.fixes.xAssigned}`);
    console.log(`      - Y atribuído: ${this.report.fixes.yAssigned}`);
  }

  /**
   * ETAPA 2: Remove duplicatas de ID e nomes
   */
  removeDuplicates() {
    console.log('\n🔄 ETAPA 2: Removendo duplicatas...');
    
    const seen = new Map(); // ID -> primeiro device
    const seenNames = new Map(); // name -> array de devices
    const toRemove = new Set();

    // Primeiro pass: identificar duplicatas
    this.data.devices.forEach((device, index) => {
      // Duplicata de ID
      if (seen.has(device.id)) {
        toRemove.add(index);
        this.report.issues.duplicateIds.push({
          id: device.id,
          name: device.name,
          index,
          action: 'removed'
        });
        return;
      }
      seen.set(device.id, device);

      // Duplicata de nome (mantém lista para reference)
      if (!seenNames.has(device.name)) {
        seenNames.set(device.name, []);
      }
      seenNames.get(device.name).push(index);
    });

    // Segundo pass: marcar nomes duplicados para reporte
    seenNames.forEach((indices, name) => {
      if (indices.length > 1) {
        this.report.issues.duplicateNames.push({
          name,
          count: indices.length,
          devices: indices.map(i => ({
            id: this.data.devices[i].id,
            name: this.data.devices[i].name,
            index: i
          }))
        });
      }
    });

    // Remover duplicatas em ordem reversa para manter índices válidos
    const removeIndexes = Array.from(toRemove).sort((a, b) => b - a);
    removeIndexes.forEach(index => {
      this.data.devices.splice(index, 1);
      this.report.fixes.duplicatesRemoved++;
    });

    console.log(`   ✅ ${this.report.fixes.duplicatesRemoved} dispositivos duplicados removidos`);
    if (this.report.issues.duplicateNames.length > 0) {
      console.log(`   ⚠️  ${this.report.issues.duplicateNames.length} nomes duplicados detectados (não removidos automaticamente)`);
    }
  }

  /**
   * ETAPA 3: Remove conexões órfãs e inválidas
   */
  removeOrphanConnections() {
    console.log('\n🔗 ETAPA 3: Removendo conexões órfãs e inválidas...');
    
    const validIds = new Set(this.data.devices.map(d => d.id));
    const toRemove = [];

    this.data.connections.forEach((conn, index) => {
      // Verifica campos required
      if (!conn.from || !conn.to) {
        toRemove.push(index);
        this.report.issues.invalidConnections.push({
          index,
          reason: 'missing from/to',
          conn
        });
        return;
      }

      // Verifica se devices existem
      if (!validIds.has(conn.from) || !validIds.has(conn.to)) {
        toRemove.push(index);
        this.report.issues.orphanConnections.push({
          from: conn.from,
          to: conn.to,
          fromExists: validIds.has(conn.from),
          toExists: validIds.has(conn.to)
        });
      }
    });

    // Remover em ordem reversa
    toRemove.sort((a, b) => b - a).forEach(index => {
      this.data.connections.splice(index, 1);
      this.report.fixes.orphansRemoved++;
    });

    console.log(`   ✅ ${this.report.fixes.orphansRemoved} conexões inválidas/órfãs removidas`);
  }

  /**
   * ETAPA 4: Valida e normaliza schema
   */
  normalizeSchema() {
    console.log('\n📋 ETAPA 4: Normalizando schema...');

    const requiredFields = ['id', 'name', 'type', 'x', 'y', 'status'];
    const defaults = {
      status: 'active',
      location: '',
      addresses: [],
      service: '',
      rackId: '',
      order: 0,
      brandModel: '',
      notes: ''
    };

    this.data.devices.forEach((device, index) => {
      // Adiciona campos faltando com valores padrão
      Object.entries(defaults).forEach(([field, defaultValue]) => {
        if (!(field in device)) {
          device[field] = defaultValue;
          this.report.fixes.fieldsAdded++;
        }
      });

      // Garante tipos corretos
      device.id = Number(device.id);
      device.x = Number(device.x);
      device.y = Number(device.y);
    });

    console.log(`   ✅ ${this.report.fixes.fieldsAdded} campos faltando adicionados`);
  }

  /**
   * ETAPA 5: Valida integridade
   */
  validate() {
    console.log('\n✅ ETAPA 5: Validando integridade...');

    let valid = true;
    
    // Valida dispositivos
    this.data.devices.forEach((device, index) => {
      if (!device.id || !device.name || !device.type) {
        console.log(`   ❌ Dispositivo inválido no índice ${index}:`, device);
        valid = false;
      }
      if (typeof device.x !== 'number' || typeof device.y !== 'number') {
        console.log(`   ❌ Coordenadas inválidas no dispositivo ${device.name}:`, device);
        valid = false;
      }
    });

    // Valida conexões
    const validIds = new Set(this.data.devices.map(d => d.id));
    this.data.connections.forEach((conn, index) => {
      if (!conn.from || !conn.to) {
        console.log(`   ❌ Conexão inválida no índice ${index}:`, conn);
        valid = false;
      }
      if (!validIds.has(conn.from) || !validIds.has(conn.to)) {
        console.log(`   ❌ Conexão órfã no índice ${index}: ${conn.from}→${conn.to}`);
        valid = false;
      }
    });

    if (valid) {
      console.log('   ✅ Todas as validações passaram!');
    }

    return valid;
  }

  /**
   * Salva dados corrigidos
   */
  save() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
      console.log(`\n✅ Dados salvos em: ${this.dataPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao salvar dados: ${error.message}`);
      return false;
    }
  }

  /**
   * Gera relatório detalhado
   */
  generateReport() {
    this.report.endTime = new Date();
    this.report.duration = (this.report.endTime - this.report.startTime) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   RELATÓRIO DE LIMPEZA                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('🔧 CORREÇÕES APLICADAS:');
    console.log(`   X atribuído: ${this.report.fixes.xAssigned}`);
    console.log(`   Y atribuído: ${this.report.fixes.yAssigned}`);
    console.log(`   Duplicatas removidas: ${this.report.fixes.duplicatesRemoved}`);
    console.log(`   Conexões órfãs removidas: ${this.report.fixes.orphansRemoved}`);
    console.log(`   Campos adicionados: ${this.report.fixes.fieldsAdded}`);

    const totalFixes = Object.values(this.report.fixes).reduce((a, b) => a + b, 0);
    console.log(`\n   📊 TOTAL DE CORREÇÕES: ${totalFixes}`);

    if (this.report.issues.duplicateNames.length > 0) {
      console.log(`\n   ⚠️  NOMES DUPLICADOS (requer revisão manual):`);
      this.report.issues.duplicateNames.forEach(dup => {
        console.log(`      - "${dup.name}": ${dup.count} dispositivos`);
      });
    }

    console.log('\n📈 ESTADO FINAL:');
    console.log(`   Dispositivos: ${this.data.devices.length}`);
    console.log(`   Conexões: ${this.data.connections.length}`);
    console.log(`   Tempo: ${this.report.duration.toFixed(2)}s`);
    console.log(`\n   Backup: ${this.backupPath}`);

    // Salva relatório JSON
    const reportPath = `data/cleanup_report_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`   Relatório JSON: ${reportPath}`);
  }

  /**
   * Executa pipeline completo de limpeza
   */
  run() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     FERRAMENTA DE LIMPEZA E VALIDAÇÃO - network_manager.json   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (!this.load()) return false;
    if (!this.backup()) return false;

    this.fixMissingCoordinates();
    this.removeDuplicates();
    this.removeOrphanConnections();
    this.normalizeSchema();

    if (!this.validate()) {
      console.warn('\n⚠️  ALGUMAS VALIDAÇÕES FALHARAM! Verifique os erros acima.');
    }

    if (!this.save()) return false;

    this.generateReport();

    return true;
  }
}

// Executa se chamado como script
if (require.main === module) {
  const cleanup = new DataCleanup();
  const success = cleanup.run();
  process.exit(success ? 0 : 1);
}

module.exports = DataCleanup;
