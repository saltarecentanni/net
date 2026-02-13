#!/bin/bash

# Update Matrix Application - v4.1.009
# Executa no servidor de produção

set -e

echo "🔄 Atualizando Matrix..."

# 1. Ir para diretório
cd /var/www/html/matrix || { echo "❌ Diretório não encontrado"; exit 1; }

# 2. Git pull
echo "📥 Fazendo git pull..."
git fetch origin main
git reset --hard origin/main

# 3. Permissões
echo "🔐 Ajustando permissões..."
sudo chown -R www-data:www-data /var/www/html/matrix
sudo chmod -R 755 /var/www/html/matrix
sudo chmod -R 644 /var/www/html/matrix/*.* 2>/dev/null || true

# 4. Permissões especiais
sudo chmod 600 .env.librenms 2>/dev/null || true
sudo chmod 755 matrix/scripts/*.sh 2>/dev/null || true
sudo chmod 755 diagnostic-script.sh 2>/dev/null || true

echo "✅ Atualização concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar firewall: sudo ufw status | grep -E '161|162|8000'"
echo "2. Testar API: curl 'http://localhost/matrix/api/librenms.php?action=health'"
echo "3. Acessar: http://10.10.225.103/matrix"
