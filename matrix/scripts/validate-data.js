/**
 * VALIDADOR DE INTEGRIDADE DE DADOS
 * Verifica network_manager.json antes de usar
 * 
 * Uso:
 * - node validate-data.js <arquivo> [--fix] [--strict]
 * 
 * Opções:
 * --fix    : Tenta corrigir problemas automaticamente
 * --strict : Falha em qualquer problema (sem warnings)
 */

const fs = require('fs');
const path = require('path');

class DataValidator {
  constructor(options = {}) {
    this.options = {
      fix: false,
      strict: false,
      ...options
    };
    this.errors = [];
    this.warnings = [];
    this.data = null;
  }

  /**
   * Valida schema de dispositivo
   */
  validateDevice(device, index) {
    const errors = [];

    // Campos obrigatórios
    if (!device.id && device.id !== 0) {
      errors.push(`Device[${index}] é sem ID`);
    }
    if (!device.name || device.name.trim() === '') {
      errors.push(`Device[${index}] nome vazio ou ausente`);
    }
    if (!device.type || device.type.trim() === '') {
      errors.push(`Device[${index}] tipo vazio ou ausente`);
    }

    // Coordenadas
    if (typeof device.x !== 'number') {
      if (this.options.fix) {
        device.x = Math.random() * 1000;
      } else {
        errors.push(`Device[${index}] coordenada X inválida`);
      }
    }
    if (typeof device.y !== 'number') {
      if (this.options.fix) {
        device.y = Math.random() * 1000;
      } else {
        errors.push(`Device[${index}] coordenada Y inválida`);
      }
    }

    // Validações adicionais
    if (!device.status) {
      if (this.options.fix) {
        device.status = 'active';
      } else {
        this.warnings.push(`Device[${index}] ${device.name} sem status`);
      }
    }

    if (!Array.isArray(device.addresses)) {
      if (this.options.fix) {
        device.addresses = [];
      } else {
        this.warnings.push(`Device[${index}] ${device.name} addresses inválido`);
      }
    }

    return errors;
  }

  /**
   * Valida schema de conexão
   */
  validateConnection(conn, index, validDeviceIds) {
    const errors = [];

    // Campos obrigatórios
    if (!conn.from && conn.from !== 0) {
      errors.push(`Connection[${index}] sem 'from'`);
    }
    if (!conn.to && conn.to !== 0) {
      errors.push(`Connection[${index}] sem 'to'`);
    }

    // Valida referências
    if (conn.from !== undefined && !validDeviceIds.has(conn.from)) {
      errors.push(`Connection[${index}] referencia dispositivo inexistente: ${conn.from}`);
    }
    if (conn.to !== undefined && !validDeviceIds.has(conn.to)) {
      errors.push(`Connection[${index}] referencia dispositivo inexistente: ${conn.to}`);
    }

    return errors;
  }

  /**
   * Executa validação completa
   */
  validate(data) {
    this.data = data;

    console.log('🔍 Validando estrutura JSON...\n');

    // Valida estrutura top-level
    if (!data.devices || !Array.isArray(data.devices)) {
      this.errors.push('JSON sem propriedade "devices" array');
      return false;
    }
    if (!data.connections || !Array.isArray(data.connections)) {
      this.errors.push('JSON sem propriedade "connections" array');
      return false;
    }

    // Coleta IDs válidos
    const validDeviceIds = new Set();
    const seenIds = new Map();

    // Valida dispositivos
    console.log(`Validando ${data.devices.length} dispositivos...`);
    data.devices.forEach((device, index) => {
      const devErrors = this.validateDevice(device, index);
      this.errors.push(...devErrors);

      // Verifica duplicata de ID
      if (seenIds.has(device.id)) {
        this.errors.push(`Dispositivo[${index}] ID ${device.id} duplicado (também em índice ${seenIds.get(device.id)})`);
      } else {
        seenIds.set(device.id, index);
        validDeviceIds.add(device.id);
      }
    });

    // Valida conexões
    console.log(`Validando ${data.connections.length} conexões...`);
    data.connections.forEach((conn, index) => {
      const connErrors = this.validateConnection(conn, index, validDeviceIds);
      this.errors.push(...connErrors);
    });

    // Relatório
    console.log(`\n📊 RELATÓRIO DE VALIDAÇÃO:`);
    console.log(`   Dispositivos: ${data.devices.length}`);
    console.log(`   Conexões: ${data.connections.length}`);
    console.log(`   Erros: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log(`\n❌ ERROS ENCONTRADOS:`);
      this.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err}`);
      });
      if (this.errors.length > 10) {
        console.log(`   ... e ${this.errors.length - 10} mais`);
      }
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      this.warnings.slice(0, 5).forEach(warn => {
        console.log(`   - ${warn}`);
      });
      if (this.warnings.length > 5) {
        console.log(`   ... e ${this.warnings.length - 5} mais`);
      }
    }

    const hasCritical = this.errors.length > 0;
    if (hasCritical && !this.options.fix) {
      console.log(`\n❌ Validação FALHOU. Use --fix para tentar corrigir.`);
    } else if (hasCritical && this.options.fix) {
      console.log(`\n✅ Verificação com --fix: ${this.errors.length} erros detectados, tentando corrigir...`);
    } else {
      console.log(`\n✅ Validação passou!`);
    }

    return !hasCritical || this.options.fix;
  }

  /**
   * Exporta dados validados
   */
  getValidData() {
    return this.data;
  }
}

/**
 * CLI
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Uso: node validate-data.js <arquivo> [--fix] [--strict]

Exemplos:
  node validate-data.js data/network_manager.json
  node validate-data.js data/network_manager.json --fix
  node validate-data.js data/network_manager.json --fix --strict

Opções:
  --fix     Tenta corrigir problemas automaticamente
  --strict  Falha em ANY erro (inclui warnings)
    `);
    process.exit(0);
  }

  const filePath = args[0];
  const options = {
    fix: args.includes('--fix'),
    strict: args.includes('--strict')
  };

  try {
    console.log(`📂 Carregando: ${filePath}\n`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const validator = new DataValidator(options);
    const isValid = validator.validate(data);

    if (options.fix && !isValid) {
      console.log(`\n💾 Salvando dados corrigidos...`);
      fs.writeFileSync(filePath, JSON.stringify(validator.getValidData(), null, 2));
      console.log(`✅ Arquivo atualizado: ${filePath}`);
    }

    process.exit(isValid && (!options.strict || validator.warnings.length === 0) ? 0 : 1);
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = DataValidator;
