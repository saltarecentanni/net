/**
 * IMPORTADOR SEGURO DE JSON COM VALIDAÇÃO
 * Substitui manual JSON uploads com validação automática
 * 
 * Uso na aplicação:
 * - Intercepta POST /api/import-json
 * - Valida completamente antes de aceitar
 * - Oferece sugestões de correção
 * - Garante rollback se falhar
 */

const fs = require('fs');
const path = require('path');
const DataValidator = require('./validate-data');
const DataCleanup = require('./data-cleanup');

class SafeImporter {
  constructor(dataPath = 'data/network_manager.json') {
    this.dataPath = dataPath;
    this.backupPath = null;
  }

  /**
   * Importa arquivo JSON com validação completa
   * 
   * @param {object} jsonData - Dados JSON a importar
   * @param {object} options - {autoFix: boolean, strict: boolean}
   * @returns {object} {success: boolean, data: object, errors: [], warnings: [], backup: string}
   */
  import(jsonData, options = {}) {
    const result = {
      success: false,
      data: null,
      errors: [],
      warnings: [],
      backup: null,
      message: '',
      fixes: {}
    };

    const opts = {
      autoFix: options.autoFix !== false, // padrão: true
      strict: options.strict === true,
    };

    try {
      console.log(`\n📥 Importando JSON com ${jsonData.devices?.length || 0} dispositivos...`);

      // 1. Cria backup do atual
      result.backup = this._createBackup();
      console.log(`   ✅ Backup criado: ${result.backup}`);

      // 2. Valida dados importados
      const validator = new DataValidator({
        fix: opts.autoFix,
        strict: opts.strict
      });

      const isValid = validator.validate(jsonData);
      result.errors = validator.errors;
      result.warnings = validator.warnings;

      if (!isValid && !opts.autoFix) {
        result.message = `❌ Validação falhou com ${result.errors.length} erros. Use autoFix=true para corrigir.`;
        console.log(`\n${result.message}`);
        return result;
      }

      // 3. Se autofixar, detalha as correções
      if (opts.autoFix && result.errors.length > 0) {
        console.log(`\n🔧 Aplicando correções automáticas...`);
        
        // Aplica cleanup estruturado
        const cleanup = new DataCleanup();
        cleanup.data = validator.getValidData();
        cleanup.fixMissingCoordinates();
        cleanup.removeDuplicates();
        cleanup.removeOrphanConnections();
        cleanup.normalizeSchema();
        
        result.fixes = cleanup.report.fixes;
        jsonData = cleanup.data;
      }

      // 4. Valida novamente após fixes
      const finalValidator = new DataValidator({fix: false, strict: false});
      const finalValid = finalValidator.validate(jsonData);

      if (!finalValid) {
        result.message = `❌ Dados AINDA contêm erros após limpeza: ${finalValidator.errors.length}`;
        console.log(`\n${result.message}`);
        this._restoreBackup(result.backup);
        return result;
      }

      // 5. Salva dados validados
      fs.writeFileSync(this.dataPath, JSON.stringify(jsonData, null, 2));
      
      result.success = true;
      result.data = jsonData;
      result.message = `✅ Import bem-sucedido! ${jsonData.devices.length} dispositivos, ${jsonData.connections.length} conexões`;
      
      console.log(`\n${result.message}`);
      console.log(`   📊 Correções: ${Object.values(result.fixes).reduce((a, b) => a + b, 0)}`);
      console.log(`   💾 Arquivo: ${this.dataPath}`);

      return result;

    } catch (error) {
      result.message = `❌ ERRO na importação: ${error.message}`;
      console.error(`\n${result.message}`);
      
      // Tenta restaurar
      if (result.backup) {
        this._restoreBackup(result.backup);
        console.log(`   ⏮️  Banco restaurado de: ${result.backup}`);
      }
      
      return result;
    }
  }

  /**
   * Faz upload de arquivo JSON
   * 
   * @param {string} filePath - Caminho do arquivo JSON
   * @param {object} options - {autoFix, strict}
   * @returns {object} Resultado import
   */
  importFile(filePath, options = {}) {
    try {
      console.log(`\n📂 Lendo arquivo: ${filePath}`);
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return this.import(jsonData, options);
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro ao ler arquivo: ${error.message}`,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Cria backup do arquivo atual
   */
  _createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = `${this.dataPath}.import_${timestamp}.bak`;
      
      if (fs.existsSync(this.dataPath)) {
        fs.copyFileSync(this.dataPath, backupPath);
      }
      
      return backupPath;
    } catch (error) {
      console.error(`Erro ao criar backup: ${error.message}`);
      return null;
    }
  }

  /**
   * Restaura backup
   */
  _restoreBackup(backupPath) {
    try {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, this.dataPath);
        return true;
      }
    } catch (error) {
      console.error(`Erro ao restaurar backup: ${error.message}`);
    }
    return false;
  }

  /**
   * Lista backups disponíveis
   */
  listBackups() {
    try {
      const dir = path.dirname(this.dataPath);
      const filename = path.basename(this.dataPath);
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith(filename) && f.includes('.bak'))
        .sort()
        .reverse()
        .slice(0, 10);

      return files.map(f => ({
        file: f,
        path: path.join(dir, f),
        date: fs.statSync(path.join(dir, f)).mtime
      }));
    } catch (error) {
      return [];
    }
  }
}

/**
 * CLI para imports
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Uso: node safe-importer.js <comando> [opções]

Comandos:
  import <arquivo>    Importa arquivo JSON
  list-backups       Lista backups disponíveis
  restore <backup>   Restaura um backup

Exemplos:
  node safe-importer.js import novo-dados.json
  node safe-importer.js import novo-dados.json --auto-fix
  node safe-importer.js list-backups
    `);
    process.exit(0);
  }

  const command = args[0];
  const importer = new SafeImporter();

  if (command === 'import' && args[1]) {
    const autoFix = args.includes('--auto-fix');
    const result = importer.importFile(args[1], { autoFix });
    process.exit(result.success ? 0 : 1);
  } else if (command === 'list-backups') {
    const backups = importer.listBackups();
    console.log(`\n📁 Backups disponíveis (últimos 10):\n`);
    backups.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.file}`);
      console.log(`      Data: ${b.date.toLocaleString()}`);
    });
  } else {
    console.error(`❌ Comando desconhecido: ${command}`);
    process.exit(1);
  }
}

module.exports = SafeImporter;
