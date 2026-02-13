#!/bin/bash
#
# UPDATE-MATRIX v2 - Script de atualização seguro
# Sincroniza código do GitHub sem deletar arquivos locais
#

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de log
log_info() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Verificar se está em /var/www/html/matrix
if [ ! -f "package.json" ] && [ ! -f "index.html" ]; then
    log_error "Não está no diretório correto!"
    echo "Execute: cd /var/www/html/matrix"
    exit 1
fi

log_info "Iniciando atualização do Matrix..."

# 1. Fazer backup do .env (se existir)
if [ -f ".env.librenms" ]; then
    log_warn "Fazendo backup de .env.librenms..."
    cp .env.librenms .env.librenms.backup
fi

# 2. Git fetch
log_info "Buscando atualizações do GitHub..."
git fetch origin main

# 3. Git reset
log_warn "Atualizando arquivos..."
git reset --hard origin/main

# 4. Restaurar .env se foi feito reset
if [ -f ".env.librenms.backup" ]; then
    log_warn "Restaurando .env.librenms..."
    cp .env.librenms.backup .env.librenms
fi

# 5. Corrigir permissões
log_info "Ajustando permissões..."
sudo chown -R www-data:www-data . 2>/dev/null || true
sudo chmod -R 755 . 2>/dev/null || true
sudo chmod -R 644 *.* js/ css/ data/ 2>/dev/null || true
sudo chmod 755 *.sh scripts/*.sh 2>/dev/null || true
[ -f .env.librenms ] && sudo chmod 600 .env.librenms 2>/dev/null || true

# 6. Verificar
log_info "Verificando instalação..."
if [ -f "matrix/api/librenms.php" ] || [ -f "api/librenms.php" ]; then
    log_info "Arquivo librenms.php encontrado ✓"
else
    log_warn "librenms.php não encontrado (pode ser normal se não foi commitado)"
fi

if [ -f "index.html" ]; then
    log_info "index.html encontrado ✓"
fi

# 7. Mostrar status
echo ""
log_info "Informações da atualização:"
git log -1 --oneline
echo ""
log_info "Atualização concluída com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Verificar librenms.php: curl http://localhost/matrix/api/librenms.php?action=health"
echo "2. Se .env.librenms foi alterado, você precisa reconfigurar"
echo "3. Reiniciar Apache: sudo systemctl restart apache2"
