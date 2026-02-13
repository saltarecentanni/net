# PASSO A PASSO: MIGRAÇÃO v3.6.035 → v4.1.006

## 🎯 Objetivo
Remover **TODOS** os dados antigos de `/data` e importar a produção v3.6.035 (140 dispositivos) com validação e limpeza automática.

---

## 📋 Pré-requisitos
✅ Script de migração criado: `/workspaces/net/Matrix4/scripts/migrate-production-data.js`  
✅ Script de reset criado: `/workspaces/net/Matrix4/scripts/reset-import-production.sh`  
✅ Arquivo v3 disponível (você forneceu com 140 dispositivos)

---

## 🚀 PASSOS RÁPIDOS (RECOMENDADO)

### Opção 1: Reset + Migração Automática (RECOMENDADA)

**1️⃣ Prepare o arquivo v3**
```bash
# Salve seu JSON v3.6.035 em um arquivo acessível
# Por exemplo: /tmp/v3-full-production.json
# (você forneceu o conteúdo anteriormente)

# Ou copie de um backup v3 existente:
cp Archives/bkp/v3.6.028/data/network_manager.json /tmp/v3-full-production.json
```

**2️⃣ Execute reset + migração em um comando**
```bash
cd /workspaces/net/Matrix4
bash scripts/reset-import-production.sh /tmp/v3-full-production.json
```

Este script faz **automaticamente**:
- ✅ Cria backup de segurança (compactado em `.tar.gz`)
- ✅ Para o servidor
- ✅ Remove **TODOS** os dados antigos de `/data`
- ✅ Executa migração v3 → v4
- ✅ Valida integridade dos dados
- ✅ Reinicia servidor na porta 3000
- ✅ Testa conectividade

**Resultado esperado:**
```
═══════════════════════════════════════════════════════════════
         ✅ MIGRAÇÃO COMPLETADA COM SUCESSO!
═══════════════════════════════════════════════════════════════

📊 Arquivo: /workspaces/net/Matrix4/data/network_manager.json
📈 Dispositivos: 140
🔗 Conexões: [número de conexões]
🌐 Servidor: http://localhost:3000
```

---

### Opção 2: Migração Manually (passo a passo)

**1️⃣ Prepare arquivo de importação**
```bash
# Você forneceu JSON com 140 dispositivos
# Salve em /tmp/v3-import.json ou outro caminho

cat > /tmp/v3-import.json << 'EOF'
{
  "devices": [
    { "id": 1, "name": "IMOLAIPQ-GW-WIFI", "type": "router_wifi", ... },
    ...
  ],
  "connections": [ ... ],
  "sites": [ ... ],
  "version": "3.6.035"
}
EOF
```

**2️⃣ Para o servidor (se rodando)**
```bash
pkill -f "node server.js"
sleep 2
```

**3️⃣ Remove dados antigos**
```bash
#️ CUIDADO: Isso remove TUDO em /data/
rm -f /workspaces/net/Matrix4/data/network_manager.json*
```

**4️⃣ Executa migração**
```bash
cd /workspaces/net/Matrix4
node scripts/migrate-production-data.js /tmp/v3-import.json
```

**5️⃣ Valida dados**
```bash
node scripts/validate-data.js data/network_manager.json
```

**6️⃣ Reinicia servidor**
```bash
npm start &
sleep 3

# Testa
curl http://localhost:3000
```

---

## 📤 FORNECENDO SEU JSON v3

Você pode fornecer seu JSON de **3 maneiras**:

### Opção A: Cole o conteúdo JSON aqui
```
Copie o conteúdo do arquivo /data/network_manager.json da sua produção v3.6.035
Cole o JSON completo aqui nessa conversa
```

### Opção B: Caminho de arquivo existente
Se você já tem um backup v3:
```bash
# Encontre e use diretamente
ls -la Archives/bkp/*/data/network_manager.json

## Use direto:
bash scripts/reset-import-production.sh Archives/bkp/v3.6.028/data/network_manager.json
```

### Opção C: Via upload
Se puder fazer upload do arquivo para `/tmp/v3-full.json`:
```bash
bash scripts/reset-import-production.sh /tmp/v3-full.json
```

---

## ✅ VERIFICAÇÃO PÓS-MIGRAÇÃO

Após executar a migração, verifique:

**1️⃣ Arquivo criado**
```bash
ls -lh /workspaces/net/Matrix4/data/network_manager.json
# Deve estar presente e com tamanho razoável
```

**2️⃣ Integridade dos dados**
```bash
cd /workspaces/net/Matrix4
node scripts/validate-data.js data/network_manager.json
# Esperado: 0 errors, 0 warnings
```

**3️⃣ Servidor respondendo**
```bash
curl -s http://localhost:3000 | head -20
# Você deveria ver HTML da aplicação
```

**4️⃣ UI abrir em navegador**
```
Abra: http://localhost:3000
Verifique:
  ✓ Topologia renderiza todos os dispositivos
  ✓ Matrix view mostra dados corretos
  ✓ Sem erros no console browser (F12)
```

---

## 🔧 TROUBLESHOOTING

### ❌ "Arquivo de importação não encontrado"
```bash
# Verifique o caminho
ls -la /tmp/v3-import.json

# Crie se necessário:
cat > /tmp/v3-import.json << 'EOF'
{ seu JSON aqui }
EOF
```

### ❌ "Servidor não inicia após migração"
```bash
# Verifique log
tail /tmp/server-reset.log

# Verifique dados
node scripts/validate-data.js data/network_manager.json --fix
```

### ❌ "Dispositivos não aparecem na UI"
```bash
# Verifique coordenadas foram geradas
node -e "const d=require('./data/network_manager.json'); console.log(d.devices.length, 'devices'); d.devices.slice(0,3).forEach(dd => console.log(dd.id, dd.name, 'x:', dd.x, 'y:', dd.y))"
```

---

## 📊 O QUE ACONTECE NA MIGRAÇÃO

### Dados v3 → v4 (transformação automática):

| Campo v3 | Campo v4 | Transformação |
|----------|----------|---------------|
| `id` | `id` | Mantido |
| `name` | `name` | Mantido |
| `type` | `type` | Mantido |
| `status` | `status` | Mantido |
| `x`, `y` | `x`, `y` | Se vazio → gera em grid |
| - | `rackId` | "" (padrão) |
| - | `order` | Index do device |
| - | `brandModel` | "" (padrão) |
| `addresses` | `addresses` | Array mantido |
| `ports` | `ports` | Array mantido |

### Limpeza automática:
- ✅ Remove conexões órfãs (to/from referencia IDs inexistentes)
- ✅ Gera coordenadas faltantes em grid (120px × 150px)
- ✅ Normaliza schema v4
- ✅ Valida integridade completa

### Resultado final:
- 140 dispositivos importados ✅
- Coordenadas geradas (se faltavam) ✅
- Conexões válidas (órfãs removidas) ✅
- Pronto para renderizar topologia ✅

---

## 📝 PRÓXIMOS PASSOS

1. **Forneça o JSON v3.6.035** (140 dispositivos)
   - Cole aqui ou indique o caminho do arquivo

2. **Execute uma migração** (recomendado)
   ```bash
   bash /workspaces/net/Matrix4/scripts/reset-import-production.sh /tmp/seu-arquivo-v3.json
   ```

3. **Verifique a UI**
   - Abra http://localhost:3000
   - Teste Topologia, Matrix, Floorplan

4. **Valide completamente**
   - Teste todas as galerias
   - Verifique cores das conexões
   - Teste export/import

---

## 💾 BACKUPS GERADOS

A cada migração, cria-se um backup:
```
/workspaces/net/Matrix4/data/backups/pre-reset-20260213_143025.tar.gz
```

Para restaurar:
```bash
tar -xzf data/backups/pre-reset-*.tar.gz -C data/
```

---

## 🎓 RESUMO

| Comando | Função |
|---------|--------|
| `bash scripts/reset-import-production.sh /tmp/v3.json` | Reset + Migração completa (RECOMENDADO) |
| `node scripts/migrate-production-data.js /tmp/v3.json` | Só migração, sem reset |
| `node scripts/validate-data.js data/network_manager.json` | Valida integridade |
| `node scripts/validate-data.js data/network_manager.json --fix` | Valida e corrige |

---

**Aguardando seu JSON v3.6.035 de 140 dispositivos para proceder com a migração! 🚀**
