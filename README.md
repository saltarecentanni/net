# 🏢 TIESSE MATRIX v4.1.009

## Aplicação de Monitoramento de Rede e Dispositivos

**Status**: ✅ Production Ready  
**Versão**: 4.1.009  
**Data**: 13/02/2026  
**Stack**: PHP 8.1+ | Apache 2.4+ | Docker

---

## 🎯 Funcionalidades Principais

### 📊 Dashboard
- Visualização em tempo real de dispositivos de rede
- Estatísticas de conexões e status
- Histórico de eventos
- Mapa visual de topologia

### 🔌 Monitoramento de Portos (via LibreNMS)
- Detecção de portos UP/DOWN em switches
- SNMP polling automático
- Alertas de mudança de status
- Histórico de ports

### 🏗️ Gerenciamento de Infraestrutura
- Cadastro de dispositivos (switches, routers, etc)
- Configuração de conexões entre dispositivos
- Organização por salas/áreas
- Backup automático de dados

### 🔐 Segurança & Acesso
- Autenticação de usuários
- Controle de perfis (admin, visualizador)
- Gerenciamento de sessões
- Logs de auditoria

---

## 🚀 Quick Start

Para começar rapidamente com LibreNMS + port monitoring:

```bash
# 1. Clonar e entrar no diretório
git clone https://github.com/saltarecentanni/net.git
cd net

# 2. Seguir o QUICKSTART
cat QUICKSTART.md

# 3. Instalar dependências do servidor
sudo apt-get install -y snmp snmp-mibs-downloader curl php-curl docker.io

# 4. Iniciar LibreNMS
sudo docker-compose -f docker-compose-librenms.yml up -d

# 5. Configurar credenciais
cp matrix/api/.env.librenms.example .env.librenms
nano .env.librenms  # Editar com seu token API

# 6. Testar APIs
curl "http://localhost/matrix/api/librenms.php?action=health"
```

📖 **Documentação completa**: [QUICKSTART.md](QUICKSTART.md)

---

## 📁 Estrutura de Arquivos

```
.
├── QUICKSTART.md                          # ← COMECE AQUI!
├── docker-compose-librenms.yml            # Docker para LibreNMS
├── diagnostic-script.sh                   # Diagnóstico do sistema
│
├── matrix/
│   ├── index.html                         # Interface web principal
│   ├── server.js                          # Servidor (se aplicável)
│   ├── package.json                       # Dependências npm
│   ├── config/                            # Arquivos de configuração
│   ├── css/                               # Estilos
│   ├── js/                                # JavaScript frontend
│   ├── api/
│   │   ├── librenms.php                   # ← API LibreNMS (PHP)
│   │   ├── test-librenms.html             # Testador web
│   │   ├── README-LIBRENMS.md             # Docs técnicas
│   │   └── .env.librenms.example          # Template config
│   ├── data/                              # Dados da aplicação
│   └── doc/                               # Documentação técnica
│
└── Archives/                              # Backup de versões antigas
```

---

## 🔌 Arquitetura

### Fluxo de Dados: Matrix → LibreNMS → Switches

```
┌─────────────────────────────────────────────────────────────┐
│                    MATRIX DASHBOARD                         │
│                  (Apache + PHP + JS)                        │
│                                                             │
│  └─→ Clica em um switch → Mostra portos UP/DOWN          │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ GET /matrix/api/librenms.php?action=ports
               │
┌──────────────▼──────────────────────────────────────────────┐
│                  LIBRENMS (Docker)                          │
│  - API REST em http://localhost:8000/api/v0               │
│  - Coleta dados SNMP dos switches                          │
│  - Armazena histórico de portos                            │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ SNMP (UDP 161)
               │
        ┌──────▼──────┐
        │   SWITCH    │  (ex: 10.10.4.220)
        │  DGS-3600   │  Polling SNMP → status dos portos
        └─────────────┘
```

---

## 📡 API Endpoints (LibreNMS)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/matrix/api/librenms.php?action=health` | GET | Verifica conexão |
| `/matrix/api/librenms.php?action=devices` | GET | Lista dispositivos |
| `/matrix/api/librenms.php?action=ports&device_id=X` | GET | Lista portos |
| `/matrix/api/librenms.php?action=port_status&device_id=X&port_id=Y` | GET | Status porto |
| `/matrix/api/librenms.php?action=device_by_ip&ip=X.X.X.X` | GET | Busca por IP |
| `/matrix/api/librenms.php?action=device_by_hostname&hostname=NAME` | GET | Busca por hostname |

**Docs** → [matrix/api/README-LIBRENMS.md](matrix/api/README-LIBRENMS.md)

---

## 🧪 Teste de Conectividade

```bash
# 1. Health check
curl "http://10.10.225.103/matrix/api/librenms.php?action=health"

# 2. Listar devices
curl "http://10.10.225.103/matrix/api/librenms.php?action=devices"

# 3. Ou abra no navegador
# http://10.10.225.103/matrix/api/test-librenms.html
```

---

## 🔧 Requisitos

- **OS**: Ubuntu 24.04 LTS (ou compatível)
- **Web**: Apache 2.4+ com módulo PHP
- **PHP**: 8.1+ com extensões (curl, json, sqlite, mysql opcional)
- **Docker**: 20+ (para LibreNMS)
- **Acesso rede**: SNMP (UDP 161/162) dos switches
- **Storage**: Mínimo 10GB livre para dados + docker images

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [QUICKSTART.md](QUICKSTART.md) | Guia rápido de instalação (30 min) |
| [matrix/api/README-LIBRENMS.md](matrix/api/README-LIBRENMS.md) | Referência técnica de APIs |
| [matrix/api/test-librenms.html](matrix/api/test-librenms.html) | Testador web interativo |
| [docker-compose-librenms.yml](docker-compose-librenms.yml) | Configuração Docker |

---

## 🛠️ Troubleshooting

### LibreNMS não responde
```bash
# Verificar se está rodando
docker ps | grep librenms

# Ver logs
docker-compose -f docker-compose-librenms.yml logs librenms
```

### SNMP falha
```bash
# Testar conectividade com switch
snmpget -v 2c -c public 10.10.4.220 sysDescr.0

# Verificar firewall
sudo ufw status | grep 161
```

### API retorna erro 500
```bash
# Verificar .env.librenms
cat .env.librenms

# Regenerar token no LibreNMS web UI
# http://10.10.225.103:8000 → seu usuário → API tokens
```

---

## 🔐 Segurança

⚠️ **IMPORTANTE PARA PRODUÇÃO:**

1. **Trocar senha padrão do LibreNMS** (admin/admin)
2. **Usar HTTPS** em vez de HTTP
3. **Restringir acesso** às APIs por IP
4. **Nunca commitar** o arquivo `.env.librenms`
5. **Rotacionar tokens API** regularmente
6. **Firewall**: Abrir SNMP apenas de switches conhecidos

---

## 📊 Histórico de Versões

- **v4.1.009** (13/02/2026): Integração PHP pura + LibreNMS Docker
- **v4.1.007** (12/02/2026): Port monitoring com PING (legacy)
- **v3.6.000** (anteriores): Versões antigas em Archives/

---

## 📞 Suporte

Para diagnosticar problemas, execute:

```bash
bash diagnostic-script.sh > report.txt 2>&1
# Compartilhe o arquivo report.txt para análise
```

---

## 📄 Licença

Propriedade de Tiesse  
Uso interno - Rede e Infraestrutura

---

**Desenvolvido com ❤️ para monitoramento simples e eficiente.**

Versão 4.1.009 | Última atualização: 13/02/2026
