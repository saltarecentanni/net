# ⚡ PHASE 6B: Implementação Pronto para Usar

**Status**: 📦 Código pronto! Falta só você configurar.

---

## 📋 Resumo do Que Você Recebeu

✅ **docker-compose-librenms.yml** → Docker pronto para rodar  
✅ **librenms-client.js** → Cliente Node.js  
✅ **Endpoints prontos** → Código para adicionar no server.js  
✅ **Guia completo** → Passo a passo de instalação  

---

## 🚀 Próximos Passos (Na Sua Máquina)

### PASSO 1: Copiar Docker Compose

```bash
# No seu servidor
cd /path/to/your/docker  # Onde está seu Guacamole/outros containers

# Copiar arquivo
# Opção A: Via SCP
scp docker-compose-librenms.yml seu-usuario@seu-ip:/path/to/docker/

# Opção B: Criar manualmente
cat > docker-compose-librenms.yml << 'EOF'
# [Copiar conteúdo do arquivo aqui]
EOF
```

### PASSO 2: Iniciar LibreNMS

```bash
# No servidor Ubuntu
cd /path/to/docker
docker-compose -f docker-compose-librenms.yml up -d

# Aguardar inicialização (~2 min)
docker logs -f librenms
```

### PASSO 3: Acessar LibreNMS e Gerar API Token

```
1. Abrir: http://seu-ip:8000
2. Login: admin / admin
3. Settings → API → Create Token
4. Copiar token (guardar seguro!)
5. Usar em LIBRENMS_API_TOKEN
```

### PASSO 4: Copiar librenms-client.js

```bash
# Você já recebeu em: matrix/api/librenms-client.js
# Verificar se está no caminho correto no seu servidor
```

### PASSO 5: Integrar Endpoints no server.js

```bash
# Arquivo: matrix/server.js (ou js/app.js)

# Adicionar APÓS todas as rotas existentes:
[Ver conteúdo de LIBRENMS_SERVER_JS_CODE.md]

# Depois restartar o Node.js
docker restart seu-container-node
# OU
npm restart
```

### PASSO 6: Configurar Variáveis de Ambiente

```bash
# Arquivo: .env (or docker .env)

LIBRENMS_HOST=http://localhost:8000
LIBRENMS_API_TOKEN=seu_token_long_aqui
```

### PASSO 7: Testar API

```bash
# No console/terminal
curl http://seu-ip:3000/api/librenms/health

# Esperado:
{
  "status": "ok",
  "version": "22.x.x",
  "hostname": "librenms"
}
```

---

## 🧪 Testar Endpoints (No Navegador)

### Teste 1: Health Check
```
http://seu-ip:3000/api/librenms/health
```

### Teste 2: Lista Dispositivos
```
http://seu-ip:3000/api/librenms/devices
```

### Teste 3: Portas de um Switch
```
http://seu-ip:3000/api/librenms/ports/1
# (substitua 1 pelo device ID)
```

### Teste 4: Sincronizar Device com LibreNMS
```
POST http://seu-ip:3000/api/device/1/sync-librenms
# (substitua 1 pelo device ID do Tiesse)
```

---

## 📱 Integração na UI (device-detail.js)

Após testes OK, vou criar a seção de portas no modal. Por enquanto:

```javascript
// No modal, você pode testar com:
fetch('/api/librenms/ports/1')
  .then(r => r.json())
  .then(d => console.log(d.ports))
```

---

## ✅ Checklist de Implementação

- [ ] Docker Compose copiado para servidor
- [ ] LibreNMS iniciado em :8000
- [ ] API Token gerado
- [ ] Variáveis de ambiente (.env) configuradas
- [ ] librenms-client.js no lugar certo
- [ ] Endpoints adicionados ao server.js
- [ ] Node.js reiniciado
- [ ] /api/librenms/health retorna OK
- [ ] /api/librenms/devices lista seus switches
- [ ] /api/librenms/ports retorna portas

---

## 🐛 Se Algo Falhar

### "Cannot find module './api/librenms-client.js'"
```bash
# Verificar path exato
ls -la matrix/api/librenms-client.js

# Deve existir
```

### "LibreNMS API Token inválido"
```bash
# Gerar novo token no LibreNMS UI
# Copiar exatamente (sem espaços)
# Adicionar ao .env com LIBRENMS_API_TOKEN=
```

### "Connection refused na porta 8000"
```bash
# Verificar se LibreNMS iniciou
docker ps | grep librenms

# Ver logs
docker logs librenms

# Aguardar mais tempo (pode levar 3-5 min)
```

### "No route matches /api/librenms/health"
```bash
# Você copiou o código no server.js?
# Reiniciou Node.js após adicionar?
# Verificar path dos endpoints
```

---

## 📝 Próximas Etapas (Com Você)

1. **Você me confirma**: Tudo pronto?
2. **Eu crio**: Seção de portas no modal
3. **Teste**: Portas aparecem em tempo real
4. **Deploy**: Vai para produção

---

## 💡 Dúvidas Comuns

**P: Preciso adicionar CADA switch manualmente no LibreNMS?**  
R: Sim, por enquanto. LibreNMS descobrimento automático é opcional.

**P: As portas atualizam em tempo real?**  
R: Não por enquanto. LibreNMS atualiza SNMP a cada 5 minutos. Você quer mais frequente?

**P: Quero monitorar só algumas portas, não todas?**  
R: Sim, vou filtrar na UI.

**P: E se um switch não tem SNMP?**  
R: Não aparecerá em LibreNMS. Precisa habilitar SNMP primeiro.

---

**Confirma para eu criar a UI?** ✅
