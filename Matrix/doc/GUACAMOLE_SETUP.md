# Guacamole Integration - Setup Guide

## Visão Geral

O TIESSE Matrix Network integra-se com Apache Guacamole para acesso SSH, RDP, VNC e Telnet diretamente pelo navegador.

**Versão**: 3.6.028  
**Data**: Fevereiro 9, 2026

---

## Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Matrix Web    │────▶│ guacamole.php   │────▶│   Guacamole     │
│   (Browser)     │     │   (API Proxy)   │     │   (Docker)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  guacd + SSH    │
                                                │  RDP/VNC/Telnet │
                                                └─────────────────┘
```

---

## Instalação do Guacamole (Docker)

### 1. Preparar diretórios

```bash
sudo mkdir -p /opt/guacamole/{init,data}
sudo chmod 777 /opt/guacamole/init
```

### 2. Criar docker-compose.yml

```yaml
version: '3.8'

services:
  guacd:
    image: guacamole/guacd
    container_name: guacd
    restart: always
    networks:
      - guac-network

  postgres:
    image: postgres:13
    container_name: guac-postgres
    restart: always
    environment:
      POSTGRES_USER: guacamole
      POSTGRES_PASSWORD: guacamole_password
      POSTGRES_DB: guacamole_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - /opt/guacamole/init:/docker-entrypoint-initdb.d
    networks:
      - guac-network

  guacamole:
    image: guacamole/guacamole
    container_name: guacamole
    restart: always
    depends_on:
      - guacd
      - postgres
    environment:
      GUACD_HOSTNAME: guacd
      POSTGRES_HOSTNAME: postgres
      POSTGRES_DATABASE: guacamole_db
      POSTGRES_USER: guacamole
      POSTGRES_PASSWORD: guacamole_password
    ports:
      - "8080:8080"
    networks:
      - guac-network

networks:
  guac-network:

volumes:
  postgres-data:
```

### 3. Gerar schema do banco

```bash
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > /opt/guacamole/init/initdb.sql
```

### 4. Iniciar serviços

```bash
docker-compose up -d
```

### 5. Acessar Guacamole

- URL: `http://SEU_IP:8080/guacamole`
- Login padrão: `guacadmin` / `guacadmin`

---

## Configuração de Segurança (IMPORTANTE!)

### Criar Usuário Admin (tiesse)

1. Acesse Guacamole como `guacadmin`
2. Vá em **Settings** → **Users** → **New User**
3. Configure:
   - **Username**: `tiesse`
   - **Password**: `tiesseadm`
   - ✅ Marque TODAS as permissões admin:
     - ✅ Amministratore di sistema
     - ✅ Audit system
     - ✅ Crea un utente
     - ✅ Create new user groups
     - ✅ Crea una connessione
     - ✅ Crea un gruppo di connessioni
     - ✅ Create new sharing profiles
     - ✅ Cambia la tua password
4. **Save**

### Criar Usuário Viewer (matrix-user) - SEGURANÇA

⚠️ **CRÍTICO**: Este usuário é usado para abrir conexões no navegador. Sem permissões admin!

1. Vá em **Settings** → **Users** → **New User**
2. Configure:
   - **Username**: `matrix-user`
   - **Password**: `MatrixSSH2026`
   - ❌ **DESMARQUE TODAS** as permissões:
     - ❌ Amministratore di sistema
     - ❌ Audit system
     - ❌ Crea un utente
     - ❌ Create new user groups
     - ❌ Crea una connessione
     - ❌ Crea un gruppo di connessioni
     - ❌ Create new sharing profiles
     - ⚠️ Cambia la tua password (opcional - não é risco)
3. **Save**

### Dar Permissão às Conexões

1. Em **Users**, clique em `matrix-user`
2. Vá na aba **Connections**
3. Marque **READ** em todas as conexões existentes
4. **Save**

### Resultado de Segurança

| Usuário | Usado para | Acesso Admin | Pode criar conexões |
|---------|------------|--------------|---------------------|
| `tiesse` | API (criar conexões) | ✅ Sim | ✅ Sim |
| `matrix-user` | Navegador (abrir conexões) | ❌ Não | ❌ Não |

Assim, quando um usuário clica em "Home" no Guacamole, ele **NÃO** tem acesso ao painel admin!

---

## Configuração no Matrix

### Arquivo: `/config/guacamole.json`

```json
{
    "enabled": true,
    
    "server": {
        "baseUrl": "http://10.10.225.103:8080/guacamole"
    },
    
    "credentials": {
        "_comment": "Admin - usado para CRIAR conexões",
        "username": "tiesse",
        "password": "tiesseadm"
    },
    
    "viewerCredentials": {
        "_comment": "Viewer - usado para ABRIR conexões (sem admin)",
        "username": "matrix-user",
        "password": "MatrixSSH2026"
    },
    
    "defaults": {
        "ssh": {
            "port": 22,
            "colorScheme": "green-black",
            "fontSize": 14,
            "terminalWidth": 100,
            "terminalHeight": 30
        },
        "rdp": {
            "port": 3389,
            "security": "any",
            "ignoreCert": true,
            "width": 1920,
            "height": 1080
        },
        "telnet": {
            "port": 23,
            "colorScheme": "green-black",
            "fontSize": 14
        },
        "vnc": {
            "port": 5900,
            "colorDepth": 24
        }
    }
}
```

---

## Endpoints da API

### Status
```
GET /api/guacamole.php?action=status
```

### Conectar
```
POST /api/guacamole.php
{
    "action": "connect",
    "ip": "10.10.254.121",
    "protocol": "ssh",
    "deviceName": "IRA-North01"
}
```

### Health Check
```
GET /api/guacamole.php?action=health
```

### Versão
```
GET /api/guacamole.php?action=version
```

### Teste (Debug)
```
GET /api/guacamole.php?action=test&ip=10.10.254.121&protocol=ssh
```

---

## Troubleshooting

### Erro: "Authentication failed"
- Verifique as credenciais em `guacamole.json`
- Confirme que o usuário existe no Guacamole
- Teste o login manualmente em `http://IP:8080/guacamole`

### Erro: "Connection already exists"
- A conexão já existe com outro nome
- O código tenta encontrar automaticamente
- Se persistir, delete a conexão no Guacamole

### Erro: "Could not connect"
- Verifique se o guacd está rodando: `docker ps`
- Confirme a porta SSH/RDP do dispositivo
- Teste conectividade: `telnet IP PORTA`

### Usuário vê painel admin
- O usuário `matrix-user` não foi configurado corretamente
- Verifique se TODAS as permissões admin estão desmarcadas
- Confirme que `viewerCredentials` está no `guacamole.json`

---

## Logs

### Ver logs do API Proxy (Apache)
```bash
tail -f /var/log/apache2/error.log | grep Guac
```

### Ver logs do Guacamole
```bash
docker logs guacamole -f
docker logs guacd -f
```

---

## Portas Necessárias

| Serviço | Porta | Uso |
|---------|-------|-----|
| Guacamole Web | 8080 | Interface web e API |
| SSH | 22 | Conexões SSH |
| RDP | 3389 | Conexões Remote Desktop |
| VNC | 5900 | Conexões VNC |
| Telnet | 23 | Conexões Telnet |

---

## Atualizações

### v3.6.020 (Fevereiro 2026)
- ✅ Adicionado usuário viewer separado (segurança)
- ✅ Token do viewer usado na URL (não expõe admin)
- ✅ Documentação de segurança

### v3.6.019
- ✅ Retry logic com exponential backoff
- ✅ Rate limiting
- ✅ Token caching
- ✅ Structured error codes

### v3.6.018
- ✅ Auto-update de conexões existentes
- ✅ Popup window para SSH
- ✅ Tamanho terminal 100x30

### v3.6.017
- ✅ Janela popup 850x550
- ✅ Fonte size 14

### v3.6.016
- ✅ Fix erro "already exists"
- ✅ Busca por nome extraído do erro
