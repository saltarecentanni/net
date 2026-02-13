# 🔧 TROUBLESHOOTING - Corrigir Atualização

## Problema 1: Arquivo librenms.php não encontrado

```
ls: cannot access 'api/librenms.php': No such file or directory
curl: (22) The requested URL returned error: 404 Not Found
```

**Causa**: Git reset funcionou, mas commitados recentes não foram sincronizados corretamente.

### Solução Rápida (2 minutos)

```bash
cd /var/www/html/matrix

# Limpar e fazer pull forçado
git clean -fd
git fetch --all --force
git pull origin main --force

# Verificar
ls -la matrix/api/librenms.php
```

Se ainda não aparecer, use:

```bash
bash /wgetscripts/fix-git-sync.sh
```

---

## Problema 2: cp cannot stat 'matrix/*'

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

---

## Problema 3: ERRO DE FIREWALL - "Bad port '161/udp'"

```
ERROR: Bad port '161/udp'
```

**Causa**: Sintaxe UFW incorreta.

### Solução

```bash
# INCORRETO (não funciona):
sudo ufw allow 161/udp

# CORRETO:
sudo ufw allow from 10.10.0.0/16 to any port 161/udp
sudo ufw allow from 10.10.0.0/16 to any port 162/udp

# SNMP (LibreNMS):
sudo ufw allow from 10.10.0.0/16 to any port 8000/tcp

# Verificar:
sudo ufw status
```

---

## Problema 4: SNMP test mostra "Unknown Object Identifier"

```
snmpget -v 2c -c public 10.10.4.220 sysDescr.0
Error in packet: Reason: (noSuchName) There is no such variable name in this MIB.
```

**Causa**: Switch não respondendo ou comunidade incorreta.

### Solução

```bash
# 1. Verificar se switch está respondendo
ping 10.10.4.220

# 2. Testar com timeout maior
snmpget -v 2c -c public -t 5 -r 3 10.10.4.220 .1.3.6.1.2.1.1.1.0

# 3. Se não funcionar, verificar no switch:
ssh admin@10.10.4.220
# Configuração # show snmp
# Deve aparecer: "SNMP community: public"

# 4. LibreNMS testa automaticamente ao adicionar device
# Adicione o device no LibreNMS UI primeiro
```

---

## Problema 5: LibreNMS Docker não inicia

```
docker-compose up -d
# ERROR: service not found
```

### Solução

```bash
# 1. Verificar arquivo
ls -la docker-compose-librenms.yml

# 2. Se não existe, restaure:
cd /var/www/html/matrix
git restore docker-compose-librenms.yml

# 3. Iniciar
docker-compose -f docker-compose-librenms.yml up -d

# 4. Esperar 2 minutos para MariaDB inicializar
sleep 120

# 5. Verificar logs
docker-compose -f docker-compose-librenms.yml logs librenms | head -20
```

---

## Problema 6: API retorna 500 "token não configurado"

```json
{"error":"LibreNMS API token não configurado","status":"error"}
```

**Causa**: Arquivo `.env.librenms` não existe ou token falta.

### Solução

```bash
# 1. Criar arquivo
cp matrix/api/.env.librenms.example matrix/api/.env.librenms

# 2. Editar
nano matrix/api/.env.librenms

# 3. Alterar:
# LIBRENMS_HOST=http://10.10.225.103:8000
# LIBRENMS_API_TOKEN=sei_meu_token

# 4. Permissões
chmod 600 matrix/api/.env.librenms

# 5. Testar
curl "http://localhost/matrix/api/librenms.php?action=health"
```

---

## Problema 7: Permissões de arquivo

```
Permission denied when writing to .env
```

### Solução

```bash
# Restaurar permissões
cd /var/www/html/matrix
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
sudo chmod -R 644 *.* js/ css/ data/
sudo chmod 755 *.sh scripts/*.sh 2>/dev/null || true
sudo chmod 600 .env* matrix/api/.env*

# Testar
touch test.txt
rm test.txt
echo "✅ Permissões OK"
```

---

## Quick Checklist

Se nada funcionar, execute isto em ordem:

```bash
#!/bin/bash
cd /var/www/html/matrix

echo "1️⃣  Git clean..."
git clean -fd
git fetch --all --force
git reset --hard origin/main

echo "2️⃣  Permissões..."
sudo chown -R www-data:www-data .
sudo chmod -R 755 .
sudo chmod -R 644 *.* js/ css/ data/
sudo chmod 755 *.sh scripts/*.sh 2>/dev/null || true

echo "3️⃣  Verificar librenms.php..."
ls -la matrix/api/librenms.php && echo "✅ OK" || echo "❌ NÃO ENCONTRADO"

echo "4️⃣  Verificar ambiente..."
[ -f .env.librenms ] && echo "✅ .env.librenms existe" || echo "⚠️  Copiar de .env.librenms.example"

echo "5️⃣  Teste HTTP..."
curl -I http://localhost/matrix/index.html | head -1

echo "✅ Verificação completa!"
```

Salve como `check.sh` e execute:

```bash
bash check.sh
```

---

## Contacte suporte se:

1. `ls api/librenms.php` ainda retorna "not found" após git reset
2. `docker-compose logs` mostra erro de MariaDB
3. `snmpget` não responde de nenhum switch
4. Apache retorna 500 em todos os endpoints
5. Alguma outra coisa não funcionar como esperado

**Contexto útil para suporte**:
```bash
# Código do servidor
curl -s http://localhost/matrix/api/librenms.php?action=health

# Version do git
git log -1 --oneline

# Status
git status

# Permissões
ls -la matrix/api/
