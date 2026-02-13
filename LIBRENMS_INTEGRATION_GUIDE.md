# 📊 Integração LibreNMS + Tiesse Matrix

**Objetivo**: Monitorar portas de switches via LibreNMS integrado com Tiesse Matrix

---

## 🚀 PASSO 1: Instalar LibreNMS com Docker

### 1.1 Copiar arquivo de composição

```bash
# No seu servidor Ubuntu
cd /path/to/your/docker
cp docker-compose-librenms.yml docker-compose-librenms.yml

# Ou se preferir, crie como novo arquivo:
cat > docker-compose-librenms.yml << 'EOF'
[aqui vai o conteúdo do compose]
EOF
```

### 1.2 Iniciar LibreNMS

```bash
docker-compose -f docker-compose-librenms.yml up -d
```

### 1.3 Aguardar inicialização

```bash
# Verificar status
docker ps | grep librenms

# Ver logs (aguarde ~2 minutos)
docker-compose -f docker-compose-librenms.yml logs -f librenms
```

### 1.4 Acessar LibreNMS

```
http://seu-ip-servidor:8000
Usuario: admin
Senha: admin (padrão - MUDE DEPOIS!)
```

---

## 🔧 PASSO 2: Configurar SNMP nos Switches

### Para **D-Link** (ex: DGS-1210)

```bash
# Via SSH/Telnet no switch:

configure
snmp-server community public
snmp-server community-access public read
end
save
```

### Para **Cisco** (ex: Catalyst)

```bash
configure terminal
snmp-server community public RO
snmp-server community private RW
end
write memory
```

### Para **TP-Link** (ex: T2600G)

```
Via Web UI:
  System → SNMP Settings
  Enable SNMP
  Community: public (RO)
  Apply
```

### Para **Outros Switches**

Procure por "SNMP Community" nas settings e habilite community **public** (read-only).

---

## 📡 PASSO 3: Adicionar Switches no LibreNMS

### 3.1 Na Web UI do LibreNMS

```
1. Ir para: Devices → Add Device
2. Hostname: IP do switch (ex: 192.168.1.10)
3. SNMP Community: public
4. SNMP Version: v2c
5. Add Device
```

### 3.2 Testar Conectividade

```bash
# Do servidor, testar SNMP:

snmpget -v2c -c public 192.168.1.10 sysDescr.0

# Esperado:
SNMPv2-MIB::sysDescr.0 = STRING: "D-Link DGS-1210-28..."
```

Se falhar, verificar:
- Firewall bloqueando UDP 161?
- SNMP habilitado no switch?
- Community string correta?

---

## 🔌 PASSO 4: Verificar Portas no LibreNMS

### 4.1 Na Web UI

```
Devices → [seu-switch] → Ports
```

Você deve ver todas as portas:
- GigabitEthernet0/1 → UP/DOWN
- GigabitEthernet0/2 → UP/DOWN
- etc

### 4.2 Via API LibreNMS

```bash
# Testar API (substitua valores)
curl -H 'X-Auth-Token: SEU_API_TOKEN' \
  http://localhost:8000/api/v0/devices/1/ports | jq

# Esperado:
{
  "ports": [
    {
      "port_id": 1,
      "port_label": "Eth1",
      "ifOperStatus": "up",  # ← Status
      "ifSpeed": 1000000000,
      ...
    },
    ...
  ]
}
```

### 4.3 Gerar API Token

```
LibreNMS UI:
  Settings → API → Create token
  Copiar token (guardar seguro!)
```

---

## 🔗 PASSO 5: Integrar no Tiesse Matrix

### 5.1 Criar Endpoint Node.js

Arquivo: `matrix/server.js` adicionar rota:

```javascript
// GET /api/librenms/ports/:deviceId
app.get('/api/librenms/ports/:deviceId', async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const librenmsHost = process.env.LIBRENMS_HOST || 'http://localhost:8000';
        const librenmsToken = process.env.LIBRENMS_API_TOKEN;
        
        if (!librenmsToken) {
            return res.status(500).json({ error: 'LibreNMS API token not configured' });
        }
        
        const response = await fetch(`${librenmsHost}/api/v0/devices/${deviceId}/ports`, {
            headers: { 'X-Auth-Token': librenmsToken }
        });
        
        const data = await response.json();
        
        res.json({
            ports: data.ports.map(p => ({
                id: p.port_id,
                name: p.port_label,
                status: p.ifOperStatus,
                speed: p.ifSpeed,
                description: p.port_description,
                mtu: p.ifMtu
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 5.2 Variáveis Ambiente

Arquivo: `.env` (ou docker .env)

```env
LIBRENMS_HOST=http://localhost:8000
LIBRENMS_API_TOKEN=seu_token_aqui
```

### 5.3 Integrar na UI (device-detail.js)

Adicionar após seção de monitoramento PHASE 6:

```javascript
// Expandir o buildModalContent() para incluir seção de portas
function buildLibrenmsPorts(device) {
    const html = '<div style="margin-top:16px;border-top:2px solid #e2e8f0;padding-top:16px;">';
    html += '<div style="font-weight:600;color:#334155;font-size:13px;margin-bottom:12px;">🔌 Portas (via LibreNMS)</div>';
    
    // Fazer request para API
    fetch(`/api/librenms/ports/${device.id}`)
        .then(r => r.json())
        .then(data => {
            const portsHtml = data.ports.map(port => {
                const statusIcon = port.status === 'up' ? '🟢' : '🔴';
                return `<div style="padding:8px;margin:4px 0;background:#f1f5f9;border-radius:6px;">
                    ${statusIcon} ${port.name} - ${port.status.toUpperCase()}
                    ${port.description ? ` (${port.description})` : ''}
                </div>`;
            }).join('');
            
            document.querySelector('#librenms-ports').innerHTML = portsHtml;
        });
    
    html += '<div id="librenms-ports" style="loading...">Carregando portas...</div>';
    html += '</div>';
    return html;
}
```

---

## ✅ Checklist de Instalação

- [ ] Docker Compose criado
- [ ] LibreNMS rodando (http://IP:8000)
- [ ] SNMP configurado nos switches
- [ ] Switches adicionados no LibreNMS
- [ ] Portas aparecem no LibreNMS UI
- [ ] API Token gerado
- [ ] Endpoint Node.js criado
- [ ] Variáveis de ambiente configuradas
- [ ] UI integrada no modal

---

## 🐛 Troubleshooting

### LibreNMS não inicia

```bash
docker logs librenms
# Procurar por erros de conexão DB
```

### SNMP falha

```bash
# Verificar conectividade
ping 192.168.1.10

# Testar SNMP diretamente
snmpwalk -v2c -c public 192.168.1.10 system

# Ver firewall
sudo ufw status
```

### API retorna erro 401

- Token expirado? Gerar novo
- Token wrong? Copiar novamente
- Check LIBRENMS_HOST está correto

---

**Próximo**: Você confirma o endpoint Node.js criado, depois testamos no navegador! 🚀
