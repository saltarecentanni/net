# Archives - TIESSE Matrix Network

Este diretório contém arquivos arquivados do projeto TIESSE Matrix Network que foram removidos do diretório ativo `Matrix/` para manter apenas código de produção.

## 📁 Estrutura

### `old-backups/` (6 arquivos)
Backups antigos do arquivo de dados da época em que o sistema usava `network_manager.json`:
- `network_manager.json.bak` - Backup automático
- `network_manager.json.bak.20260202154419` - Snapshot temporal
- `network_manager.json.bak.auto_fix` - Antes do auto-fix
- `network_manager.json.bak.before_fixed_import_20260204_115137` - Antes do import fix
- `network_manager.json.bak.clean_fields` - Antes da limpeza de campos
- `network_manager_before_duplicate_removal_2026-02-04.json` - Antes da remoção de duplicatas

**Status:** Obsoletos após renomeação para `matrix-network-data.json` (v3.5.051)

### `maintenance-scripts/` (3 arquivos)
Scripts de manutenção one-time que já foram executados com sucesso:
- `clean-obsolete-fields.js` - Removeu campos `zone`/`zoneIP` obsoletos de 4 dispositivos
- `fix-connections-data.js` - Corrigiu problemas de dados em conexões
- `remove-duplicate-connections.js` - Removeu 4 conexões duplicadas (yellow boxes bug)

**Status:** Executados e validados. Mantidos para referência histórica.

### `temp-files/` (2 arquivos)
Arquivos temporários de testes e debug:
- `Tiesse-Matrix-Network_FIXED_2026-02-04.json` - Arquivo de teste durante correção
- `debug-external-map.js` - Script de debug para conexões externas

**Status:** Temporários, não mais necessários após correções implementadas.

### `dev-tools/` (2 arquivos)
Ferramentas de desenvolvimento:
- `draw-rooms-v2.html` (31KB) - Ferramenta standalone para desenhar salas (mapeador visual)

**Status:** Tool de desenvolvimento, não necessária em produção.

### `platform-specific/` (1 arquivo)
Scripts específicos de plataforma:
- `start-server.bat` (1.4KB) - Script para iniciar servidor no Windows

**Status:** Desnecessário no ambiente Linux (Ubuntu 24.04).

### `legacy-tests/` (1 arquivo)
Scripts de teste obsoletos:
- `test-suite.sh` (14KB) - Versão 1.0.0 do test suite

**Status:** Substituído por `test-suite-v2.sh` com correções de API.

### `/` (1 arquivo)
- `UPDATE_NOTES.txt` - Cópia duplicada (original em `Matrix/UPDATE_NOTES.txt`)

## 🗂️ Resumo da Limpeza

**Total de arquivos arquivados:** 16
**Data da limpeza:** 04/02/2026
**Versão atual do sistema:** v3.5.051
**Arquivos restantes em Matrix/:** 35 (apenas produção)

## ⚠️ Notas Importantes

1. **Não delete este diretório** - Contém histórico importante do projeto
2. **Scripts de manutenção** podem ser reutilizados em emergências
3. **Backups** preservados para auditoria e recuperação histórica
4. **draw-rooms-v2.html** pode ser restaurado se precisar mapear novas salas

## 🔄 Histórico de Mudanças

### v3.5.051 (04/02/2026)
- ✅ Movidos 11 arquivos da primeira fase de limpeza
- ✅ Organização em subdireories temáticos
- ✅ Documentação completa do processo
- ✅ Movidos 5 arquivos adicionais (segunda fase)

### Contexto
Após o release v3.5.051, foi realizada limpeza profunda do diretório `Matrix/` para remover:
- Backups obsoletos da época de `network_manager.json`
- Scripts one-time já executados
- Arquivos temporários de debug
- Ferramentas de desenvolvimento não essenciais
- Scripts específicos de plataforma Windows
- Versões antigas de testes

O objetivo foi manter `Matrix/` contendo apenas código de produção ativo.

---

**Manutenção:** Este arquivo deve ser atualizado quando novos arquivos forem arquivados.
