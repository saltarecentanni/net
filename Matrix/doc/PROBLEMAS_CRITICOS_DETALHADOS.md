# PROBLEMAS CRÍTICOS ENCONTRADOS - TIESSE MATRIX v3.5.010

## 1️⃣ RACE CONDITION - Escrita Simultânea

**Status:** ⚠️ Mitigado no mesmo processo (fila de escrita); ainda sem lock multiprocesso.

### Localização
- **Arquivo:** `server.js` linha ~170
- **Código:**
```javascript
await enqueueDataWrite(async () => {
    const tempFile = DATA_FILE + '.tmp';
    const backupFile = DATA_FILE + '.bak';
    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(DATA_FILE)) await fs.promises.copyFile(DATA_FILE, backupFile);
    await fs.promises.rename(tempFile, DATA_FILE);
});
```

### Problema (antes da correção)
```
Tempo T0: User A lê arquivo      [devices: [1, 2, 3], connections: [A→B]]
Tempo T1: User B lê arquivo      [devices: [1, 2, 3], connections: [A→B]]
Tempo T2: User A modifica dev#2, escreve [devices: [1, 2_MOD, 3], ...]
Tempo T3: User B modifica dev#3, escreve [devices: [1, 2, 3_MOD], ...]  ← SOBRESCREVE A
                                ↓
                    PERDA: Modificação de Dev#2
```

### Por que é crítico para nuclear
- Dados de rede nuclear não podem ser perdidos/inconsistentes
- Uma perda = pane do sistema
- Sem recovery = desastre

### Situação Atual
- ✓ Escrita enfileirada evita corrida dentro do mesmo processo
- ✓ Temp + backup (.bak)
- ⚠️ Ainda sem lock compartilhado entre processos
- ❌ Sem transações/rollback

---

## 2️⃣ BLOQUEIO DO EVENT LOOP - Resolvido com escrita assíncrona

**Status:** ✅ Corrigido com escrita assíncrona.

### Localização
- **Arquivo:** `server.js` linha ~170

### Situação Atual
```javascript
// ✓ ASSÍNCRONO = Não bloqueia event loop
await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
await fs.promises.rename(tempFile, DATA_FILE);
```

### Impacto Atual
```
Carga Crítica (100 dispositivos + 500 conexões):
├── Usuário A salva → entra na fila de escrita
├── Usuário B salva → aguarda na fila (latência)
└── Resultado: Sem bloqueio do event loop, mas fila pode aumentar
```

### Solução Recomendada (para multi‑processo)
- Implementar lock compartilhado (Redis/file‑lock)
- Migrar persistência para banco transacional

---

## 3️⃣ SEM TRANSAÇÕES ACID

### Localização
- **Arquivo:** `server.js` linha ~170 (POST /data)
- **Arquivo:** `js/app.js` linha ~3000 (importData)

### Problema
```javascript
// Operação multi-passo SEM transação:
// 1. Lê arquivo
const data = JSON.parse(content);

// 2. Modifica (5 passos)
data.devices.push(newDevice);
data.connections.push(newConnection);
data.nextDeviceId++;
// ... mais modificações

// 3. Escreve (SEM TRANSAÇÃO)
await fs.promises.writeFile(tempFile, JSON.stringify(data));
await fs.promises.rename(tempFile, DATA_FILE);
// ❌ Se falhar no meio = estado inconsistente

// Exemplo de falha:
// - Device adicionado ✓
// - Connection criada ✓
// - Escrita falha no byte 50M ✗
// - Resultado: Arquivo corrompido, app inteiro down
```

### Impacto em Nuclear
- Operação pode ficar em estado intermediário
- Sem rollback automático
- Sistema inteiro offline até reparo manual
- Compliance regulatória: FALHA

### Solução Recomendada
```javascript
// Implementar camada transacional:
class Transaction {
    constructor(data) {
        this.original = JSON.parse(JSON.stringify(data)); // Deep copy
        this.modified = data;
    }
    
    async commit() {
        // Salvar atomicamente
        const tempFile = DATA_FILE + '.tmp';
        await fs.writeFile(tempFile, JSON.stringify(this.modified));
        await fs.rename(tempFile, DATA_FILE);
    }
    
    rollback() {
        // Voltar ao original
        return this.original;
    }
}
```

---

## 4️⃣ SENHAS PLAIN-TEXT

> **✅ RESOLVIDO em v3.4.3:** Credenciais removidas do código fonte. Password verificada apenas via API auth.php com hash bcrypt.

### Localização (ANTES da correção)
- **Arquivo:** `server.js` linhas 27-28
```javascript
// ANTES (v3.4.1 e anteriores):
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'tiesse';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'senha_aqui';
```

### Problema (exemplo do código vulnerável)
```javascript
// ❌ Comparação vulnerável a timing attack
if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    // Timing diferente para "taaccess" vs "tiessex"
    // Atacante pode descobrir caractere por caractere
}

// ❌ Armazenado plain-text em .env
// AUTH_PASSWORD=senha_exemplo
// Se hacker conseguir ler .env = acesso total

// ❌ Sem salt
// Se DB comprometida = mesma senha para todos usuários
```

### Impacto
- Account takeover possível
- Regulação nuclear: Rejeição imediata
- Confidencialidade comprometida

### Solução Recomendada
```javascript
const bcrypt = require('bcryptjs');

// 1. Hash a password no .env (gerado uma vez)
const AUTH_PASSWORD_HASH = '$2a$10$...'; // bcrypt hash

// 2. Verificar com timing-safe comparison
const match = await bcrypt.compare(inputPassword, AUTH_PASSWORD_HASH);

// 3. Ou usar timing-safe equal
const crypto = require('node:crypto');
const match = crypto.timingSafeEqual(
    Buffer.from(input, 'utf8'),
    Buffer.from(stored, 'utf8')
);
```

---

## 5️⃣ SEM CSRF TOKENS

### Localização
- **Arquivo:** `server.js` (todas as rotas POST)
- **Arquivo:** `index.html` (todos os forms)

### Problema
```html
<!-- ❌ SEM CSRF TOKEN - Vulnerável a form hijacking -->
<form method="POST" action="/data">
    <input type="hidden" name="devices" value="...">
    <button>Save</button>
</form>

<!-- Atacante pode fazer:
<img src="https://victim-app.com/data" 
     onload="stealData()">
     
Vítima clica, seu cookie de sessão envia POST automaticamente!
Resultado: Dados deletados/modificados por atacante
-->
```

### Impacto
- Modificações não-autorizadas de dados
- Exclusão total de configuração possível
- Para nuclear: Inaceitável

### Solução Recomendada
```javascript
// 1. Server gera token único por sessão
app.get('/csrf-token', (req, res) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.json({ token: req.session.csrfToken });
});

// 2. Frontend inclui token em forms
fetch('/api/csrf-token').then(r => r.json()).then(data => {
    document.querySelector('form').innerHTML += 
        `<input type="hidden" name="csrf" value="${data.token}">`;
});

// 3. Server valida token antes de processar POST
if (req.body.csrf !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
}
```

---

## 6️⃣ VALIDAÇÃO INCOMPLETA DE INPUTS

### Localização
- **Arquivo:** `data.php` (linhas 1-178)
- **Arquivo:** `server.js` (linhas ~130-160)
- **Arquivo:** `js/app.js` (linhas ~2950-3000)

### Problemas Encontrados

#### ❌ Sem validação de tipos
```javascript
// Aceita qualquer valor para campos numéricos
device.rackId = "999999999999999999999"; // ✗ Aceito (deveria ser número)
device.id = "não-é-número"; // ✗ Aceito se conseguir

// Solução:
if (typeof device.id !== 'number' || device.id < 0) {
    throw new Error('Invalid device.id');
}
```

#### ❌ Sem limites de tamanho
```javascript
device.name = "A".repeat(1000000); // 1MB string aceita ✗
device.notes = "B".repeat(10000000); // 10MB aceito ✗

// Solução:
const MAX_NAME_LENGTH = 255;
const MAX_NOTES_LENGTH = 5000;
if (device.name.length > MAX_NAME_LENGTH) {
    throw new Error(`Name too long: max ${MAX_NAME_LENGTH} chars`);
}
```

#### ❌ Sem enum validation
```javascript
device.type = "INVALID_TYPE"; // ✗ Aceito
device.status = "GARBAGE"; // ✗ Aceito

// Solução:
const VALID_TYPES = ['router', 'switch', 'firewall', 'server'];
const VALID_STATUSES = ['active', 'inactive', 'maintenance'];

if (!VALID_TYPES.includes(device.type)) {
    throw new Error(`Invalid type: ${device.type}`);
}
if (!VALID_STATUSES.includes(device.status)) {
    throw new Error(`Invalid status: ${device.status}`);
}
```

#### ❌ Sem validação de referências
```javascript
connection.to = 99999; // Conectar a device que não existe ✗
                       // Aceito sem verificar

// Solução:
const targetDevice = appState.devices.find(d => d.id === connection.to);
if (!targetDevice && connection.to !== null) {
    throw new Error(`Target device ${connection.to} does not exist`);
}
```

#### ❌ Sem sanitização de strings
```javascript
device.name = "<script>alert('XSS')</script>"; // ✗ Aceito
// Se reimportado no UI = XSS possível

// Solução:
function sanitizeString(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
```

---

## 7️⃣ IMPORT/EXPORT SEM INTEGRIDADE

### Localização
- **Arquivo:** `js/app.js` (linhas ~2910-3050)

### Problemas

#### ⚠️ Checksum simples (não criptográfico)
```javascript
// Exportar:
exportJSON() {
    const data = { devices, connections, nextDeviceId };
    // ✓ Checksum simples incluído (__checksum)
    return JSON.stringify(data);
}

// Importar:
importData(file) {
    const data = JSON.parse(file);
    // ✓ Valida checksum simples quando presente
}

// Cenário de falha:
// - User exporta: 100 devices, 500 connections, checksum=ABC123
// - Arquivo é corrompido em trânsito (damaged USB)
// - User importa arquivo quebrado
// - Sistema detecta checksum simples, mas sem assinatura forte
```

#### ❌ Sem versionamento
```javascript
// Export de v3.2.0
{ "devices": [...], "version": "3.2.0" }

// Import em v3.5.010
importData(v3.2.0_file);
// ✗ Não valida compatibilidade de versão
// Pode aceitar schema antigo incompatível
```

#### ❌ Sem backup antes de import
```javascript
importData(file) {
    // ❌ Diretamente sobrescreve appState
    appState = file;
    // Se arquivo corrupto = PERDA TOTAL de dados anteriores
    // Sem como voltar
}
```

### Solução Recomendada (para ambiente crítico)
```javascript
// Implementar checksummed export:
function exportJSON() {
    const data = {
        devices: appState.devices,
        connections: appState.connections,
        nextDeviceId: appState.nextDeviceId,
        version: '3.4.2',
        exportedAt: new Date().toISOString()
    };
    
    // 1. Calcular checksum SHA256
    const json = JSON.stringify(data);
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    
    // 2. Incluir no arquivo
    const withHash = {
        ...data,
        __hash: hash,
        __hashAlgorithm: 'sha256'
    };
    
    return JSON.stringify(withHash, null, 2);
}

function importData(file) {
    const data = JSON.parse(file);
    
    // 1. Validar versão
    if (data.version !== '3.4.2') {
        throw new Error(`Incompatible version: ${data.version}`);
    }
    
    // 2. Validar checksum
    const {__hash, __hashAlgorithm, ...toHash} = data;
    const json = JSON.stringify(toHash);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    
    if (hash !== __hash) {
        throw new Error('File integrity check failed - corrupted export');
    }
    
    // 3. Fazer backup antes
    const backup = JSON.parse(JSON.stringify(appState));
    
    // 4. Tentar importar
    try {
        appState = data;
        saveToStorage();
    } catch (e) {
        // Rollback
        appState = backup;
        throw e;
    }
}
```

---

## 8️⃣ VAZAMENTO DE MEMÓRIA - Sessions

### Localização
- **Arquivo:** `server.js` linhas 40-43
```javascript
const sessions = new Map(); // ← Cresce sem parar
```

### Problema
```javascript
// Session expira em 8 horas
function getSessionFromCookie(req) {
    const session = sessions.get(sessionId);
    if (session && Date.now() - session.lastActivity < SESSION_TIMEOUT) {
        session.lastActivity = Date.now();
        return session;
    }
    if (session) {
        sessions.delete(sessionId); // ← Deletado quando acessado
    }
}

// ❌ PROBLEMA:
// 1. Se sessão nunca é acessada após expiração = fica na Map
// 2. Muitos usuários = muitas sessões = cresce indefinidamente
// 3. Sem limite de Map size
// 4. Node.js memory cresce infinitamente até crash

// Cenário:
// - 1000 usuários fazem login em 8 horas
// - Cada sessão = ~200 bytes
// - 1000 × 200 = 200KB por ciclo
// - 24 ciclos/dia × 200KB = 4.8MB/dia
// - 365 dias = 1.75GB/ano ← Memory leak
```

### Solução Recomendada
```javascript
// Implementar limpeza de sessões expiradas:
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
        }
    }
}

// Rodar a cada 30 minutos
setInterval(cleanupExpiredSessions, 30 * 60 * 1000);

// Ou usar um banco de dados com TTL automático:
// Redis com EXPIRE key
redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 8 * 60 * 60);
```

---

## 9️⃣ SEM LOGGING/AUDITORIA PERSISTENTE

### Localização
- **Arquivo:** Nenhum arquivo de logging
- **Status:** ❌ ZERO implementado

### Problema
```
Regulação Nuclear Exige:
├── Quem fez a mudança → ❌ Não há
├── Quando foi feita → ❌ Não há
├── O quê exatamente → ❌ Não há
├── Resultado (sucesso/falha) → ❌ Não há
├── Não pode ser apagado → ❌ Pode deletar arquivo JSON
└── Retenção 7+ anos → ❌ Não há armazenamento

Cenário de Falha:
- Operador muda configuração
- Sistema explode
- Investigação: "Quem fez o quê quando?"
- Resposta: "Não sabemos, sem logging"
- Regulador: Rejeitado, operação encerrada
```

### Solução Recomendada
```javascript
// Implementar logging centralizado:
class AuditLog {
    async log(action, user, details, result = 'success', error = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            user: user,
            action: action, // e.g., 'add_device', 'modify_connection'
            details: details,
            result: result, // 'success' ou 'failure'
            error: error,
            ipAddress: req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
        };
        
        // Salvar em arquivo append-only (não pode sobrescrever)
        await fs.appendFile(
            '/var/log/tiesse/audit.jsonl',
            JSON.stringify(entry) + '\n'
        );
        
        // Também enviar para ELK/Splunk para central logging
        elasticsearchClient.index({
            index: 'tiesse-audit',
            body: entry
        });
    }
}

// Usar em todas as operações:
await AuditLog.log('add_device', username, { id: 1, name: 'Router-1' });
await AuditLog.log('modify_device', username, { id: 1, status: 'active' });
await AuditLog.log('delete_device', username, { id: 1 });
```

---

## 🔟 SEM BACKUP AUTOMÁTICO

### Localização
- **Arquivo:** Nenhum
- **Status:** ❌ ZERO implementado

### Problema
```
Backup Manual:
- Usuário clica "Export to JSON"
- Arquivo salvo em PC local
- Se PC morrer = backup também morre
- Sem destino seguro (S3, NFS, etc.)
- Sem retenção rotativa
- Sem verificação integridade

Resultado: Perda Irrecuperável de Dados
```

### Solução Recomendada
```javascript
// Implementar backup automático:
async function performBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = `/backups/network_manager_${timestamp}.json`;
    
    try {
        // 1. Ler dados atuais
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // 2. Calcular checksum
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        
        // 3. Salvar localmente
        const backup = {
            data: parsed,
            hash: hash,
            timestamp: timestamp
        };
        await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
        
        // 4. Enviar para S3
        await s3Client.putObject({
            Bucket: 'tiesse-backups',
            Key: `backups/${timestamp}.json`,
            Body: JSON.stringify(backup),
            ServerSideEncryption: 'AES256'
        });
        
        // 5. Manter apenas últimos 30 dias
        await cleanupOldBackups(30);
        
        console.log('✓ Backup completed successfully');
    } catch (e) {
        console.error('✗ Backup FAILED:', e);
        // ALERTA CRÍTICO - NOTIFICAR ADMIN
        await sendAlert(`Backup failure: ${e.message}`);
    }
}

// Rodar a cada hora
setInterval(performBackup, 60 * 60 * 1000);
```

---

## 🎯 RESUMO: TOP 10 PROBLEMAS CRÍTICOS

| # | Problema | Severidade | Tempo Fix | Impacto |
|---|----------|:----------:|:---------:|---------|
| 1 | Race condition writeSync | 🔴 CRÍTICO | 4h | Perda dados |
| 2 | Blocking event loop | 🔴 CRÍTICO | 8h | Timeout cascata |
| 3 | Sem transações | 🔴 CRÍTICO | 16h | Estado inconsistente |
| 4 | Senhas plain-text | 🔴 CRÍTICO | 4h | Account takeover |
| 5 | Sem CSRF tokens | 🔴 CRÍTICO | 12h | Form hijacking |
| 6 | Validação incompleta | 🔴 CRÍTICO | 24h | Injeção dados |
| 7 | Import sem integridade | 🔴 CRÍTICO | 8h | Corrupção import |
| 8 | Memory leak sessions | 🔴 CRÍTICO | 4h | OOM crash |
| 9 | Sem logging auditoria | 🔴 CRÍTICO | 20h | Não compliance |
| 10 | Sem backup automático | 🔴 CRÍTICO | 12h | Perda irrecuperável |

**Tempo total fix: ~112 horas (~2.8 semanas de trabalho)**

---

## 📞 CONTATO & SUGESTÕES

Este documento foi gerado por análise de código automatizada.  
Para discussões sobre remediação, contate seu departamento de engenharia.
