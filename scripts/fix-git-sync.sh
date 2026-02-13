#!/bin/bash
# Fix para atualizar o servidor com todos os commits

set -e

cd /var/www/html/matrix

echo "🔧 Limpando cache Git..."
git clean -fd
git reset --hard HEAD

echo "🌐 Verificando remote..."
git remote -v

echo "📥 Fazendo pull completo..."
git fetch --all --force
git pull origin main --force

echo "✅ Verificando arquivo..."
if [ -f "matrix/api/librenms.php" ]; then
    echo "✅ Arquivo restaurado!"
    ls -la matrix/api/librenms.php
else
    echo "❌ Ainda falta..."
    ls -la matrix/api/
fi

echo ""
echo "📝 Resumo:"
git log -1 --oneline
git status
