#!/bin/bash

# Update Matrix Application - v4.1.009 FIXED
# Script correto para /usr/local/bin/update-matrix

set -e

cd /var/www/html/matrix || exit 1

echo "🔄 Atualizando Matrix (v4.1.009)..."
echo "  Diretório: $(pwd)"

# 1. IMPORTANTE: Não deletar arquivos, apenas fazer merge
echo "📥 Atualizando do GitHub..."
git fetch origin main
git merge --ff-only origin/main 2>/dev/null || git reset --hard origin/main

# 2. Permissões de arquivo
echo "🔐 Ajustando permissões..."

# Apache
sudo chown -R www-data:www-data . 2>/dev/null || true
sudo chmod -R 755 . 2>/dev/null || true
sudo chmod -R 644 *.* 2>/dev/null || true
sudo chmod 755 *.sh 2>/dev/null || true
sudo chmod 755 matrix 2>/dev/null || true
sudo chmod 755 matrix/api 2>/dev/null || true
sudo chmod 755 matrix/js 2>/dev/null || true
sudo chmod 755 matrix/css 2>/dev/null || true

# Arquivo de config especial
if [ -f .env.librenms ]; then
    sudo chmod 600 .env.librenms
    echo "    ✓ .env.librenms (600)"
fi

# Scripts
if [ -d scripts ]; then
    sudo chmod 755 scripts/*.sh 2>/dev/null || true
    echo "    ✓ scripts/ executáveis"
fi

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "📋 Verificações:"
echo "  1. Versão: $(cat matrix/package.json | grep version | head -1)"
echo "  2. Último commit: $(git log -1 --oneline)"
echo "  3. Local: $(pwd)"
