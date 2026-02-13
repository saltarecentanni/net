#!/bin/bash
# RESET COMPLETO + MIGRAÇÃO DE PRODUÇÃO
# Remove tudo de /data e importa v3.6.035 limpo

set -e

WORKSPACE_DIR="/workspaces/net"
MATRIX_DIR="$WORKSPACE_DIR/Matrix4"
DATA_DIR="$MATRIX_DIR/data"
SCRIPT_DIR="$MATRIX_DIR/scripts"

IMPORT_FILE="${1:-/tmp/v3-import.json}"
MAIN_DATA_FILE="$DATA_DIR/network_manager.json"
BACKUP_DIR="$DATA_DIR/backups"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}     RESET COMPLETO + MIGRAÇÃO v3.6.035 → v4.1.005${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}\n"

# 1. Verifica arquivo de importação
if [ ! -f "$IMPORT_FILE" ]; then
    echo -e "${RED}❌ Arquivo de importação não encontrado: $IMPORT_FILE${NC}"
    echo "   Crie com:"
    echo "   cat /path/to/v3-backup.json > $IMPORT_FILE"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo de importação encontrado${NC}"
echo "   Arquivo: $IMPORT_FILE"
echo "   Tamanho: $(du -h $IMPORT_FILE | cut -f1)"
echo ""

# 2. Cria backup de tudo que existe
echo -e "${YELLOW}🔄 Criando backups de segurança...${NC}"

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FULL_BACKUP="$BACKUP_DIR/pre-reset-${TIMESTAMP}.tar.gz"

if [ -f "$MAIN_DATA_FILE" ]; then
    tar -czf "$FULL_BACKUP" -C "$DATA_DIR" network_manager.json network_manager.json.* 2>/dev/null || true
    echo -e "${GREEN}✅ Backup criado: $FULL_BACKUP${NC}"
fi

# 3. Para servidor
echo -e "\n${YELLOW}🛑 Parando servidor...${NC}"
pkill -f "node server.js" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Servidor parado${NC}"

# 4. Remove TODOS os dados de /data
echo -e "\n${YELLOW}🗑️  Limpando /data...${NC}"

rm -f "$DATA_DIR/network_manager.json"
rm -f "$DATA_DIR/network_manager.json".*
rm -f "$DATA_DIR"/*.bak
rm -f "$DATA_DIR"/*.backup

echo -e "${GREEN}✅ Dados antigos removidos${NC}"
echo "   Mantém: backups/ e outros diretórios"

# 5. Executa migração
echo -e "\n${YELLOW}🔄 Executando migração...${NC}"
cd "$MATRIX_DIR"

if [ ! -f "$SCRIPT_DIR/migrate-production-data.js" ]; then
    echo -e "${RED}❌ Script de migração não encontrado${NC}"
    exit 1
fi

node "$SCRIPT_DIR/migrate-production-data.js" "$IMPORT_FILE"

if [ ! -f "$MAIN_DATA_FILE" ]; then
    echo -e "${RED}❌ Falha: arquivo de dados não foi criado${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Migração concluída${NC}"

# 6. Valida dados
echo -e "\n${YELLOW}✔️  Validando dados...${NC}"
node "$SCRIPT_DIR/validate-data.js" "$MAIN_DATA_FILE"

# 7. Reinicia servidor
echo -e "\n${YELLOW}🚀 Reiniciando servidor...${NC}"
npm start > /tmp/server-reset.log 2>&1 &
SERVER_PID=$!

sleep 3

# 8. Verifica servidor
if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}❌ Servidor falhou ao iniciar${NC}"
    echo "   Log:"
    cat /tmp/server-reset.log
    exit 1
fi

# 9. Testa conectividade
RESPONSE=$(curl -s http://localhost:3000/status 2>/dev/null || echo "error")

if [[ "$RESPONSE" == *"200"* ]] || [[ "$RESPONSE" == *"ok"* ]]; then
    echo -e "${GREEN}✅ Servidor respondendo na porta 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor iniciado (PID: $SERVER_PID), mas /status indisponível${NC}"
fi

echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}         ✅ MIGRAÇÃO COMPLETADA COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"

echo -e "📊 Arquivo: $MAIN_DATA_FILE"
echo -e "📈 Dispositivos: $(grep -o '"id":' "$MAIN_DATA_FILE" | grep -c 'id' || echo '?')"
echo -e "🔗 Conexões: $(grep -o '"from":' "$MAIN_DATA_FILE" | grep -c 'from' || echo '?')"
echo -e "🌐 Servidor: http://localhost:3000"
echo -e "💾 Backup: $FULL_BACKUP"
echo ""
echo -e "Próximos passos:"
echo -e "  1. Abra http://localhost:3000 no navegador"
echo -e "  2. Verifique a Topologia (todos os dispositivos visíveis)"
echo -e "  3. Teste a Matrix view"
echo -e "  4. Valide as conexões"
