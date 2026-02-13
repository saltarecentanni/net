# 🚀 QUICKSTART - Matrix + LibreNMS v4.1.009

## ⚡ Resumo Rápido

Integração **PHP pura** entre a aplicação Matrix e LibreNMS para monitorar portos (UP/DOWN) de switches.

**Resultado final**: Clique em um switch no Matrix → vê portos em tempo real → saiba quais estão UP/DOWN.

---

## 📋 Pre-requisitos

- Ubuntu 24.04 LTS com Apache + PHP
- Docker instalado
- SNMP protocol habilitado nos switches
- Acesso root/sudo no servidor

---

## 🎯 Instalação (30 minutos)

### 1. Preparar Servidor
```bash
# SSH no servidor
ssh usuario@10.10.225.103

# Instalar ferramentas SNMP
sudo apt update
sudo apt-get install -y snmp snmp-mibs-downloader curl php-curl

# Abrir firewall para LibreNMS + SNMP
sudo ufw allow from 10.10.0.0/16 to any port 161/udp  # SNMP
sudo ufw allow from 10.10.0.0/16 to any port 162/udp  # SNMP Trap
sudo ufw allow 8000/tcp                                # LibreNMS Web

# Verificar
sudo ufw status | grep -E "161|162|8000"
```

### 2. Iniciar LibreNMS em Docker
```bash
# Ir para aplicação
cd /var/www/html/matrix

# Fazer git pull para pegar último código
git pull origin main

# Copiar arquivo de configuração
cp matrix/api/.env.librenms.example .env.librenms

# Copiar docker-compose
ls -la docker-compose-librenms.yml

# Iniciar containers
sudo docker-compose -f docker-compose-librenms.yml up -d

# Aguardar startup (2-3 minutos)
sleep 30

# Verificar status
sudo docker-compose -f docker-compose-librenms.yml ps

# Ver logs
sudo docker-compose -f docker-compose-librenms.yml logs librenms | tail -20
```

### 3. Gerar Token API do LibreNMS
```bash
# Acessar web UI
# http://10.10.225.103:8000
# Username: admin
# Password: admin

# Depois:
# 1. Menu superior direito → seu nome → API tokens
# 2. Clique "Create API token"
# 3. Copy o token gerado (exemplo: abc123def456...)
```

### 4. Configurar Token na Aplicação
```bash
# No servidor, editar arquivo
nano .env.librenms

# Editar assim:
LIBRENMS_HOST=http://10.10.225.103:8000
LIBRENMS_API_TOKEN=seu_token_aqui_abc123def456

# Salvar (Ctrl+X, Y, Enter)

# Verificar permission
sudo chown www-data:www-data .env.librenms
sudo chmod 600 .env.librenms
```

### 5. Testar Conectividade
```bash
# Comando 1: Health Check
curl "http://10.10.225.103/matrix/api/librenms.php?action=health"

# Deve retornar:
# {"status":"ok","message":"Conectado ao LibreNMS",...}

# Comando 2: Listar Dispositivos
curl "http://10.10.225.103/matrix/api/librenms.php?action=devices"

# Deve retornar lista de devices
```

---

## 🔌 Configurar Switches (SNMP)

### D-Link DGS-3600
```
1. SSH no switch
2. Configure → System → SNMP Settings
3. Enable SNMP
4. Community: public (Read-Only)
5. Trap Host: 10.10.225.103
6. Salvar
```

### MikroTik RouterOS
```bash
ssh admin@switch_ip

/snmp set enabled=yes community=public
/snmp community set name=public authentication-password="" encryption-password=""
```

### Cisco IOS
```
configure terminal
snmp-server community public RO
snmp-server host 10.10.225.103 public
end
write memory
```

---

## ➕ Adicionar Switches ao LibreNMS

### Via Web UI
```
1. Di LibreNMS: http://10.10.225.103:8000
2. Admin → Devices → Add Device
3. Preencha:
   - Hostname: 10.10.4.220 (ou FQDN)
   - SNMP Version: v2c
   - Community: public
   - Port: 161
4. Clique "Add Device"
5. Aguarde descoberta de portos (1-2 minutos)
```

### Verificar SNMP Localmente
```bash
# No servidor Matrix
snmpget -v 2c -c public 10.10.4.220 sysDescr.0

# Deve retornar info do switch (modelo, firmware, etc)
```

---

## 🧪 Testar API

### Opção 1: Testador Web (mais fácil)
```
Abra no navegador:
http://10.10.225.103/matrix/api/test-librenms.html
```

### Opção 2: Curl (linha de comando)
```bash
# Listar todos os dispositivos
curl "http://10.10.225.103/matrix/api/librenms.php?action=devices"

# Pegar portos do device ID 1
curl "http://10.10.225.103/matrix/api/librenms.php?action=ports&device_id=1"

# Checar status de um porto específico
curl "http://10.10.225.103/matrix/api/librenms.php?action=port_status&device_id=1&port_id=1"

# Buscar device por IP
curl "http://10.10.225.103/matrix/api/librenms.php?action=device_by_ip&ip=10.10.4.220"
```

---

## 📡 Integração com a Interface

Quando os APIs acima estiverem funcionando, faça a integração no `device-detail.js`:

```javascript
// Ir para: matrix/js/device-detail.js
// Adicionar função para buscar portos via API

function loadDevicePorts(deviceId) {
    fetch(`/matrix/api/librenms.php?action=ports&device_id=${deviceId}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                data.ports.forEach(port => {
                    console.log(`${port.ifName}: ${port.status}`);
                });
            }
        });
}
```

---

## ✅ Checklist de Conclusão

- [ ] SNMP instalado no servidor (`snmpget --version` funciona)
- [ ] Firewall aberto para portas 161, 162, 8000
- [ ] LibreNMS rodando em Docker (verifique com `docker ps`)
- [ ] LibreNMS web acessível (http://10.10.225.103:8000)
- [ ] Token API gerado e adicionado ao `.env.librenms`
- [ ] Teste de health check retorna `status: ok`
- [ ] Ao menos 1 switch adicionado ao LibreNMS
- [ ] SNMP funcionando entre Matrix → Switch (`snmpget` retorna dados)
- [ ] API `/api/librenms.php?action=devices` lista switches
- [ ] Testador web (test-librenms.html) mostra portos corretamente

---

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [matrix/api/README-LIBRENMS.md](matrix/api/README-LIBRENMS.md) | Documentação técnica completa dos endpoints |
| [matrix/api/test-librenms.html](matrix/api/test-librenms.html) | Testador web interativo de APIs |
| [docker-compose-librenms.yml](docker-compose-librenms.yml) | Configuração do Docker para LibreNMS |

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Token não configurado" | Editar `.env.librenms` com seu token |
| "LibreNMS não disponível" | `docker ps \| grep librenms` - verificar se está rodando |
| "SNMP falha" | `snmpget -v 2c -c public [IP] sysDescr.0` - testar conectividade |
| "Portas não aparecem" | Esperar 2-3 minutos após adicionar device ao LibreNMS |
| "Firewall bloqueando" | `sudo ufw status` - verificar regras de 161/udp |

---

## 📞 Contato

Quando tiver dúvidas, execute:
```bash
# Diagnóstico rápido
bash diagnostic-script.sh
```

E compartilhe o arquivo `report.txt`.

---

**Versão**: 4.1.009  
**Data**: 13/02/2026  
**Suporte**: PHP 8.1+ | Apache 2.4+ | Docker 20+
