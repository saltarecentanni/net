# TIESSE Intranet Web App

Aplicação web de gerenciamento de rede para deploy em intranet corporativa.

**Versão:** 2.5.0

## 🚀 Deploy Rápido

### Opção 1: PHP no Windows (Recomendado)

1. Baixe PHP: https://windows.php.net/download/ (VS16 x64 Non Thread Safe)
2. Extraia para `C:\php`
3. Execute na pasta do projeto:
   ```cmd
   cd C:\caminho\para\intranet
   C:\php\php.exe -S 0.0.0.0:8080
   ```
4. Acesse: http://localhost:8080/ ou http://SEU-IP:8080/

### Opção 2: Node.js

```bash
cd intranet
node server.js
```

Acesse: http://localhost:3000/

## 📁 Estrutura de Arquivos

```
intranet/
├── index.html              # Página principal
├── data.php                # API PHP para persistência
├── server.js               # Servidor Node.js (alternativo)
├── README.md               # Este arquivo
├── js/
│   ├── app.js              # Lógica principal
│   └── ui-updates.js       # Renderização da interface
└── data/
    └── network_manager.json  # Dados (criado automaticamente)
```

## 🔧 Requisitos

### Com PHP
- PHP 7+ (baixar ZIP, não precisa instalar)

### Com Node.js
- Node.js 14+

### Sem servidor
- Basta abrir `index.html` no navegador
- Dados salvos apenas no localStorage

## 📡 API REST

### GET /data.php
Retorna os dados:
```json
{"devices": [], "connections": [], "nextDeviceId": 1}
```

### POST /data.php
Salva os dados. Retorna:
```json
{"ok": true}
```

## 💾 Persistência

- Tenta salvar no servidor (PHP ou Node.js)
- Se falhar, salva no localStorage
- Carrega do servidor ou do arquivo JSON estático

## 🖥️ Compatibilidade

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13+

## 📌 Versão

**v2.5.0** - Dezembro 2025
