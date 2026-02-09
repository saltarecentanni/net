# Guacamole Integration - Setup Guide

## Overview

TIESSE Matrix Network integrates with Apache Guacamole for SSH, RDP, VNC and Telnet access directly from the browser, with no client installation required.

**Version:** 3.6.035  
**Date:** February 9, 2026

---

## Architecture

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

## Guacamole Installation (Docker)

### 1. Prepare Directories

```bash
sudo mkdir -p /opt/guacamole/{init,data}
sudo chmod 777 /opt/guacamole/init
```

### 2. Create docker-compose.yml

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

### 3. Generate Database Schema

```bash
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > /opt/guacamole/init/initdb.sql
```

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Access Guacamole

- URL: `http://YOUR_IP:8080/guacamole`
- Default login: `guacadmin` / `guacadmin`

---

## Security Configuration (IMPORTANT!)

Matrix uses **two separate Guacamole users** for security:

### Create Admin User (tiesse)

Used by the API to **create** connections.

1. Log in to Guacamole as `guacadmin`
2. Go to **Settings** → **Users** → **New User**
3. Configure:
   - **Username:** `tiesse`
   - **Password:** (choose a strong password)
   - ✅ Enable ALL admin permissions:
     - ✅ System administrator
     - ✅ Audit system
     - ✅ Create new users
     - ✅ Create new user groups
     - ✅ Create new connections
     - ✅ Create new connection groups
     - ✅ Create new sharing profiles
     - ✅ Change own password
4. **Save**

### Create Viewer User (matrix-user)

⚠️ **CRITICAL:** This user opens connections in the browser. Must have **NO** admin permissions!

1. Go to **Settings** → **Users** → **New User**
2. Configure:
   - **Username:** `matrix-user`
   - **Password:** (choose a strong password)
   - ❌ **UNCHECK ALL** permissions:
     - ❌ System administrator
     - ❌ Audit system
     - ❌ Create new users
     - ❌ Create new user groups
     - ❌ Create new connections
     - ❌ Create new connection groups
     - ❌ Create new sharing profiles
     - ⚠️ Change own password (optional — not a risk)
3. **Save**

### Grant Connection Permissions

1. In **Users**, click `matrix-user`
2. Go to the **Connections** tab
3. Check **READ** on all existing connections
4. **Save**

### Security Summary

| User | Used For | Admin Access | Can Create Connections |
|------|----------|--------------|----------------------|
| `tiesse` | API (create connections) | ✅ Yes | ✅ Yes |
| `matrix-user` | Browser (open connections) | ❌ No | ❌ No |

When a user clicks "Home" in Guacamole, they do **NOT** see the admin panel.

---

## Matrix Configuration

### File: `config/guacamole.json`

```json
{
    "enabled": true,

    "server": {
        "baseUrl": "http://GUACAMOLE_IP:8080/guacamole"
    },

    "credentials": {
        "_comment": "Admin — used to CREATE connections",
        "username": "tiesse",
        "password": "[admin-password]"
    },

    "viewerCredentials": {
        "_comment": "Viewer — used to OPEN connections (no admin)",
        "username": "matrix-user",
        "password": "[viewer-password]"
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

## API Endpoints

### Status
```
GET /api/guacamole.php?action=status
```

### Connect
```
POST /api/guacamole.php
{
    "action": "connect",
    "ip": "10.10.254.121",
    "protocol": "ssh",
    "deviceName": "SW-CORE-01"
}
```

### Health Check
```
GET /api/guacamole.php?action=health
```

### Version
```
GET /api/guacamole.php?action=version
```

### Test (Debug)
```
GET /api/guacamole.php?action=test&ip=10.10.254.121&protocol=ssh
```

---

## Troubleshooting

### Error: "Authentication failed"
- Check credentials in `config/guacamole.json`
- Confirm the user exists in Guacamole
- Test login manually at `http://IP:8080/guacamole`

### Error: "Connection already exists"
- The connection exists under a different name
- The code attempts to find it automatically
- If it persists, delete the connection in Guacamole admin panel

### Error: "Could not connect"
- Verify guacd is running: `docker ps`
- Confirm the device's SSH/RDP port is reachable
- Test connectivity: `telnet IP PORT`

### User sees admin panel
- `matrix-user` was not configured correctly
- Verify ALL admin permissions are unchecked
- Confirm `viewerCredentials` is present in `guacamole.json`

---

## Logs

### API Proxy Logs (Apache)
```bash
tail -f /var/log/apache2/error.log | grep Guac
```

### Guacamole Container Logs
```bash
docker logs guacamole -f
docker logs guacd -f
```

---

## Required Ports

| Service | Port | Usage |
|---------|------|-------|
| Guacamole Web | 8080 | Web interface & API |
| SSH | 22 | SSH connections |
| RDP | 3389 | Remote Desktop connections |
| VNC | 5900 | VNC connections |
| Telnet | 23 | Telnet connections |

---

## Changelog

### v3.6.020 (February 2026)
- ✅ Added separate viewer user (security)
- ✅ Viewer token used in URL (does not expose admin)
- ✅ Security documentation

### v3.6.019
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting
- ✅ Token caching
- ✅ Structured error codes

### v3.6.018
- ✅ Auto-update existing connections
- ✅ Popup window for SSH
- ✅ Terminal size 100x30

### v3.6.017
- ✅ Popup window 850x550
- ✅ Font size 14

### v3.6.016
- ✅ Fix "already exists" error
- ✅ Search by name extracted from error
