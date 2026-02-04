# CHANGELOG v3.5.051

**Data:** 2026-02-04

## 🎯 BREAKING CHANGES

### Renomeação do Arquivo de Dados Principal
- **Antes:** `data/network_manager.json`
- **Depois:** `data/matrix-network-data.json`
- **Motivo:** Nome do arquivo agora reflete corretamente o nome do programa (TIESSE Matrix Network)
- **Impacto:** Todas as 29 referências em 18 arquivos foram atualizadas
- **Migração:** Automática - o arquivo foi renomeado e todas as referências internas atualizadas

## ✨ Melhorias

### 1. External Connections como Seção Organizada
- External connections agora aparecem como ícones organizados (padrão Wall Jack)
- Nova seção "External Connections" no Room Info modal
- Visual consistente com Wall Jacks (amarelo/dourado)
- Mostra: destino, device origem, porta, cabo, notas, status
- Contador visual com ícone 🌐

### 2. Correção de Conexões Duplicadas
- Removidas 4 conexões duplicadas que causavam caixas amarelas duplicadas:
  - Device 11 ↔ 6: 1 duplicata removida
  - Device 15 ↔ 16: 1 duplicata removida  
  - Device 55 ↔ 57 (BIG ONE): 2 duplicatas removidas (com toPort vazio)
- Total final: 90 conexões (73 device-to-device + 17 external/wall jacks)
- Scripts criados:
  - `remove-duplicate-connections.js` - Remove duplicatas automaticamente
  - `verify-no-duplicates.js` - Verifica ausência de duplicatas
  - `debug-external-map.js` - Debug de external connections

### 3. Validação e Integridade
- Export/Import testado e funcionando perfeitamente
- Validação de integridade: 7/7 checks passando
- Zero referências ao nome antigo de arquivo
- Sem corrupção de dados detectada

## 📝 Arquivos Atualizados

### Código
- `js/app.js` - CURRENT_VERSION e SUPPORTED_VERSIONS atualizados
- `js/floorplan.js` - Seções External Connections adicionadas
- `server.js` - Banner de versão atualizado
- `data.php` - Versão atualizada
- `config/config.php` - DATA_FILE path atualizado

### Scripts
- `backup.sh` - Path do arquivo de dados atualizado
- `clean-obsolete-fields.js` - Path atualizado
- `fix-connections-data.js` - Path atualizado
- `remove-duplicate-connections.js` - Novo script
- `test-export-import-cycle.js` - Path atualizado
- `validate-data-integrity.js` - Path e descrição atualizados
- `verify-no-duplicates.js` - Novo script
- `debug-external-map.js` - Novo script

### Documentação
- `index.html` - 7 referências atualizadas
- `doc/README.md` - Estrutura de arquivos atualizada
- `doc/BLUEPRINT.md` - Paths e referências atualizadas
- `doc/ROOM_STRUCTURE.md` - Nome do arquivo de dados atualizado
- `UPDATE_NOTES.txt` - Referências atualizadas (2 cópias)

## 🔧 Testes Realizados

### Export/Import
```
✅ Loaded 101 devices, 90 connections
✅ Export file is valid JSON
✅ All required fields present
✅ Device count matches: 101
✅ Connection count matches: 90
✅ Location count matches: 25
✅ All 90 connections match perfectly
✅ No corrupt externalDest found
🎉 ALL TESTS PASSED!
```

### Validação de Integridade
```
✅ JSON is valid
✅ All 101 device IDs are unique
✅ All 101 devices have required fields
✅ All 90 connections are structurally valid
✅ No orphaned connections
✅ All 25 location codes are unique
✅ Metadata intact (v3.5.051)
🎉 ALL VALIDATIONS PASSED!
```

### Verificação de Duplicatas
```
✅ NENHUMA DUPLICATA ENCONTRADA!
📊 Estatísticas:
   - Dispositivos: 101
   - Conexões únicas: 73
   - Wall jacks/External: 17
   - Versão: 3.5.051
```

## 📦 Arquivos Criados

### Scripts de Manutenção
- `remove-duplicate-connections.js` - Remove conexões duplicadas com backup automático
- `verify-no-duplicates.js` - Verifica ausência de duplicatas bidirecionais
- `debug-external-map.js` - Debug de criação de virtual externals

### Relatórios
- `DUPLICATE_CONNECTIONS_REPORT.txt` - Relatório detalhado das duplicatas encontradas
- `CHANGELOG_v3.5.051.md` - Este arquivo

### Backups
- `data/matrix-network-data.json.backup.YYYYMMDD_HHMMSS` - Backups automáticos

## 🚀 Migração

### Para Atualizar de v3.5.050 → v3.5.051

1. **Fazer backup:**
   ```bash
   cp data/network_manager.json data/network_manager.json.backup
   ```

2. **Atualizar arquivos:**
   ```bash
   git pull origin main
   ```

3. **Renomear arquivo de dados:**
   ```bash
   mv data/network_manager.json data/matrix-network-data.json
   ```

4. **Verificar integridade:**
   ```bash
   node validate-data-integrity.js
   ```

5. **Verificar duplicatas:**
   ```bash
   node verify-no-duplicates.js
   ```

6. **Reiniciar servidor:**
   ```bash
   # Node.js
   pm2 restart matrix
   
   # Apache/PHP
   sudo systemctl restart apache2
   ```

## ⚠️ Notas Importantes

1. **Breaking Change:** O nome do arquivo de dados mudou. Scripts externos que referenciam `network_manager.json` precisam ser atualizados para `matrix-network-data.json`.

2. **Compatibilidade de Import:** Arquivos exportados em v3.5.050 e anteriores são totalmente compatíveis com v3.5.051.

3. **External Connections:** A renderização de external connections foi completamente reformulada para ser consistente com wall jacks.

4. **Duplicatas Removidas:** Se você tinha conexões duplicadas, elas foram automaticamente removidas. Verifique se todas as conexões esperadas ainda estão presentes.

## 📊 Estatísticas da Versão

- **Arquivos modificados:** 26
- **Linhas modificadas:** 38.808 (+38.771, -37)
- **Referências atualizadas:** 29 em 18 arquivos
- **Commits:** 5 (incluindo este)
- **Testes executados:** 3 (export/import, integridade, duplicatas)
- **Status:** ✅ Todos os testes passando

---

**Desenvolvido por:** TIESSE S.P.A.  
**Versão anterior:** 3.5.050  
**Versão atual:** 3.5.051
