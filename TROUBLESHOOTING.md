# 🔧 TROUBLESHOOTING - Corrigir Atualização

## Problema

```
cp: cannot stat 'matrix/*': No such file or directory
script '/var/www/html/matrix/api/librenms.php' not found or unable to stat
```

Causa: Script `/usr/local/bin/update-matrix` está tentando copiar arquivos de um diretório que não existe.

---

## Solução Rápida (5 minutos)

### Passo 1: Restaurar arquivos

```bash
# SSH no servidor
ssh root@10.10.225.103

# Ir para diretório
cd /var/www/html/matrix

# Restaurar tudo
git fetch origin main
git reset --hard origin/main

# Verificar
ls -la api/ | grep librenms.php
ls -la index.html
```

**Esperado**: Ver `librenms.php` na lista

### Passo 2: Atualizar script de update

Copie o texto abaixo (salve em `/tmp/update-matrix-fix.sh`):

```bash
nano /tmp/update-matrix-fix.sh
```

Cole isto:

```bash
#!/bin/bash
set -e
cd /var/www/html/matrix || exit 1
echo "🔄 Atualizando Matrix..."
git fetch origin main
git reset --hard origin/main
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
sudo chmod -R 644 *.* 
sudo chmod 755 *.sh scripts/*.sh 2>/dev/null || true
[ -f .env.librenms ] && sudo chmod 600 .env.librenms
echo "✅ Pronto!"
```

Salve (Ctrl+X, Y, Enter)

### Passo 3: Instale o script fixado

```bash
sudo cp /tmp/update-matrix-fix.sh /usr/local/bin/update-matrix
sudo chmod 755 /usr/local/bin/update-matrix
```

### Passo 4: Teste

```bash
cd /var/www/html
update-matrix

# Deve mostrar: ✅ Pronto!
```

---

## Verificar se funcionou

```bash
# 1. Arquivo PHP existe?
curl http://localhost/matrix/api/librenms.php?action=health

# 2. Deve retornar JSON (mesmo com erro de token)
# {"error":"LibreNMS API token não configurado"...}

# 3. Se houver erro 404, arquivo não existe
# Se houver erro 500, token falta (isso é normal)
```

---

## Próxima Vez

Quando rodar `update-matrix` novamente, não deve mais dar erro de `cp`.

Se der, execute:

```bash
cd /var/www/html/matrix
git status
git log -1 --oneline
```

E compartilhe o output.

---

## ⚠️ IMPORTANTE

Não execute `git reset --hard` fora do diretório `/var/www/html/matrix` (a menos que saiba o que está fazendo). O script de atualização deve estar **dentro** do diretório correto.

**Teste final** (deve retornar código 200):

```bash
curl -I http://localhost/matrix/index.html
# HTTP/1.1 200 OK
```
