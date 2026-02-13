# 02. Quick Start - Instalação e Primeiros Passos

**Tempo estimado**: 10 minutos

---

## ⚡ Instalação Rápida

### Pré-requisitos
- Node.js 14+
- npm ou yarn
- Git
- Browser moderno

### Passo 1: Clonar ou baixar o projeto

```bash
cd /workspaces/net
# ou
git clone https://github.com/saltarecentanni/net.git
cd net/matrix
```

### Passo 2: Instalar dependências

```bash
npm install
```

### Passo 3: Configurar ambiente

```bash
# Copiar exemplo de configuração
cp .env.example .env

# Editar .env com suas credenciais
# IMPORTANTE: Mudar senhas em produção!
```

### Passo 4: Iniciar servidor

```bash
npm start
# ou
node server.js
```

**Servidor deve responder em**: http://localhost:3000

---

## 🔑 Credenciais Padrão

```
Username: tiesse
Password: tiesse
```

⚠️ **IMPORTANTE**: Mudar em produção via `.env`

---

## 🏗️ Estrutura de Pastas Essencial

```
matrix/
├── index.html          ← A aplicação (abrir no browser)
├── server.js           ← Backend Node.js
├── data/
│   └── network_manager.json  ← Database principal
├── js/                 ← Lógica da aplicação
├── css/                ← Estilos
└── doc/                ← Documentação
```

---

## ✅ Verificação de Instalação

### 1. Server rodando?
```bash
curl http://localhost:3000
```
Deve retornar HTML (status 200)

### 2. Dados carregando?
Abra http://localhost:3000 no browser e verifique:
- Dashboard mostra estatísticas
- Existem 119 dispositivos
- 22 localizações protegidas

### 3. Autenticação funcionando?
- Logout → tela de login aparece
- Username: tiesse, Password: tiesse
- Console sem erros

---

## 🚀 Primeiros Passos

### Adicionar um Dispositivo

1. Login com tiesse/tiesse
2. Clique em "+ Add Device"
3. Preencha:
   - **Location**: Escolha (ex: "Sala Server")
   - **Group**: Escolha ou crie
   - **Type**: Selecione (ex: "Switch - SW")
   - **Hostname**: Digite (ex: "Core-Switch-01")
   - **IP**: Digite (ex: "10.1.1.1")
4. Clique "Salva Agora" (ou auto-save)

✅ Dispositivo aparece em:
- Dispositivi tab
- Topology
- Matrix
- Dashboard

### Ver Topology

1. Clique em "Topology" tab
2. Veja dispositivos como nós SVG
3. Use mouse para zoom/pan
4. Clique em um dispositivo para detalhes

### Mapear Conexão

1. Vá para "Connessioni" tab
2. Clique "+ Add Connection"
3. Selecione "From Device" e porta
4. Selecione "To Device" e porta
5. Clique "Salva"

---

## 🐛 Debug & Troubleshooting

### Servidor não inicia?

```bash
# Verificar porta 3000
lsof -i :3000

# Kill processo anterior
pkill -f "node server.js"

# Tentar novamente
npm start
```

### Dados não carregan?

```bash
# Verificar se JSON está válido
node -e "console.log(JSON.parse(require('fs').readFileSync('./data/network_manager.json')))"
```

### Console com erros?

```bash
# Debug mode
DEBUG_MODE=true node server.js

# Ver logs
tail -f matrix/logs/error.log
```

### Browser cache?

```
CTRL+Shift+Delete (limpar cache)
ou
CTRL+F5 (hard refresh)
```

---

## 📊 Próximas Ações

1. ✅ **[ ] Servidor rodando** → Verifique com `curl`
2. ✅ **[ ] Login funcionando** → Teste credenciais
3. ✅ **[ ] Adicionar dispositivo** → Veja em Dispositivi
4. ✅ **[ ] Ver no Topology** → Visualizar SVG
5. 👉 **[ ] Ler [03-ARCHITECTURE.md](03-ARCHITECTURE.md)** → Entender sistema

---

## 💬 Ajuda Rápida

| Problema | Solução |
|----------|---------|
| Porta 3000 em uso | `lsof -i :3000` depois `kill -9 <PID>` |
| Não consigo logar | Resetar .env com valores padrão |
| Dados desaparecem | Verificar `data/network_manager.json` |
| Browser congela | Hard refresh CTRL+F5 |
| Erro de sintaxe JS | Abrir DevTools (F12), console aba |

---

**Próximo doc**: [03-ARCHITECTURE.md](03-ARCHITECTURE.md) - Entender a arquitetura completa
