# LibreNMS API Integration - Matrix v4.1.009

## 📋 Overview

Integração PHP pura entre **Matrix** e **LibreNMS** para monitorar portos (UP/DOWN) de switches sem necessidade de Node.js.

## 🚀 Quick Start

### 1. Configurar Credenciais
```bash
# No servidor, copie o arquivo .env.librenms.example
cp matrix/api/.env.librenms.example .env.librenms

# Edite e adicione seu token API
nano .env.librenms

# Configure:
LIBRENMS_HOST=http://10.10.225.103:8000
LIBRENMS_API_TOKEN=seu_token_do_librenms
```

### 2. Testar API
Abra no navegador:
```
http://10.10.225.103/matrix/api/test-librenms.html
```

Ou via curl:
```bash
# Health check
curl "http://10.10.225.103/matrix/api/librenms.php?action=health"

# List all devices
curl "http://10.10.225.103/matrix/api/librenms.php?action=devices"

# Get ports of device 1
curl "http://10.10.225.103/matrix/api/librenms.php?action=ports&device_id=1"

# Get specific port status
curl "http://10.10.225.103/matrix/api/librenms.php?action=port_status&device_id=1&port_id=1"
```

## 📡 API Endpoints

| Ação | URL | Descrição |
|------|-----|-----------|
| **health** | `?action=health` | Verifica conexão com LibreNMS |
| **devices** | `?action=devices` | Lista todos os dispositivos |
| **ports** | `?action=ports&device_id=X` | Lista portos de um device |
| **port_status** | `?action=port_status&device_id=X&port_id=Y` | Status de um porto |
| **device_by_ip** | `?action=device_by_ip&ip=X.X.X.X` | Busca device por IP |
| **device_by_hostname** | `?action=device_by_hostname&hostname=NAME` | Busca device por hostname |
| **info** | `?action=info` | Informações do LibreNMS |

## 📝 Respostas de Exemplo

### Health Check (✅ Sucesso)
```json
{
  "status": "ok",
  "message": "Conectado ao LibreNMS",
  "timestamp": "2026-02-13T22:30:00+00:00",
  "system": {
    "version": "24.1.0",
    "hostname": "librenms.example.com"
  }
}
```

### List Devices
```json
{
  "status": "ok",
  "count": 3,
  "devices": [
    {
      "device_id": 1,
      "hostname": "switch1.local",
      "ip": "10.10.4.220",
      "status": 1,
      "type": "network",
      "os": "dgs-3600"
    }
  ],
  "timestamp": "2026-02-13T22:30:00+00:00"
}
```

### Get Ports
```json
{
  "status": "ok",
  "device_id": 1,
  "count": 26,
  "ports": [
    {
      "port_id": 1,
      "ifName": "eth1",
      "ifAlias": "Porta 1 - Uplink",
      "ifOperStatus": "up",
      "status": "UP",
      "ifSpeed": "1000000000",
      "ifType": "ethernetCsmacd"
    },
    {
      "port_id": 5,
      "ifName": "eth5",
      "ifAlias": "Porta 5 - Servidor",
      "ifOperStatus": "down",
      "status": "DOWN",
      "ifSpeed": "0",
      "ifType": "ethernetCsmacd"
    }
  ],
  "timestamp": "2026-02-13T22:30:00+00:00"
}
```

## 🔌 Integração com JavaScript (device-detail.js)

### Exemplo de uso no frontend:

```javascript
// Buscar portos quando abrir modal
async function showDevicePorts(deviceId) {
    const response = await fetch(`/matrix/api/librenms.php?action=ports&device_id=${deviceId}`);
    const data = await response.json();
    
    if (data.status === 'ok') {
        data.ports.forEach(port => {
            console.log(`${port.ifName}: ${port.status}`);
        });
    }
}

// Monitorar status em tempo real
setInterval(async () => {
    const response = await fetch(`/matrix/api/librenms.php?action=port_status&device_id=1&port_id=1`);
    const data = await response.json();
    
    const status = data.is_up ? '🟢 UP' : '🔴 DOWN';
    console.log(`Porto ${data.ifName}: ${status}`);
}, 60000); // A cada 60 segundos
```

## 🔒 Segurança

1. **Arquivo `.env.librenms` nunca commita** (está em .gitignore)
2. **Token deve ser regenerado** se comprometido
3. **CORS configurado** apenas para localhost por padrão
4. **SSL verificação** pode ser habilitada em produção

## 🐛 Troubleshooting

### "LibreNMS API token não configurado"
```bash
# Verificar se .env.librenms existe
ls -la .env.librenms

# Se não existir, criar:
cp matrix/api/.env.librenms.example .env.librenms
# Editar com seu token
```

### "LibreNMS não disponível"
```bash
# Verificar se LibreNMS está rodando
docker ps | grep librenms

# Verificar conectividade
curl http://10.10.225.103:8000

# Verificar firewall
sudo ufw status | grep 8000
```

### "API returned HTTP 401"
- Token inválido - gere um novo no LibreNMS Web UI
- Token expirado - crie novo token

## 📊 Estrutura de Arquivos

```
matrix/
├── api/
│   ├── librenms.php              # ← API Principal
│   ├── test-librenms.html        # ← Testador Web
│   └── .env.librenms.example     # ← Template de config
├── js/
│   └── device-detail.js          # ← Para integração futura
└── config/
    └── (configs da aplicação)
```

## 📚 Próximas Etapas

1. ✅ Arquivo `librenms.php` pronto
2. ✅ Endpoints testáveis
3. ⏳ Integrar com `device-detail.js` para mostrar portos na interface
4. ⏳ Criar seção de monitoramento em tempo real
5. ⏳ Alertas quando portos mudam de status

---

**Versão**: 4.1.009  
**Última atualização**: 13/02/2026
