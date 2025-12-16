# TIESSE Intranet Web App

Aplicação web de gerenciamento de rede para deploy em intranet corporativa.

## 🚀 Deploy Rápido

### Opção 1: Servidor Web com PHP (Recomendado)

1. Copie todos os arquivos da pasta `intranet/` para o diretório raiz do seu servidor web
2. Certifique-se que `data.php` e `index.html` estão na mesma pasta
3. A pasta `data/` deve ter permissão de escrita
4. Acesse via navegador:
   - `http://10.121.10.101:8080/`
   - `http://seu-servidor/intranet/`

### Opção 2: Node.js

```bash
cd intranet
npm install
npm start
```

Acesse: `http://localhost:3000/`

## 📁 Estrutura de Arquivos

```
intranet/
├── index.html              # Página principal (HTML + CSS)
├── data.php                # API REST para persistência
├── README.md               # Este arquivo
├── package.json            # Dependências Node.js (opcional)
├── js/
│   ├── app.js              # Lógica principal
│   │                       # - Estado (appState)
│   │                       # - CRUD dispositivos/conexões
│   │                       # - Persistência (localStorage + servidor)
│   │                       # - Toast notifications
│   │                       # - Import/Export (JSON, Excel)
│   │                       # - Impressão
│   └── ui-updates.js       # Renderização da interface
│                           # - Lista de dispositivos (cards)
│                           # - Matriz visual
│                           # - Tabela de conexões
│                           # - Export Excel
└── data/
    └── network_manager.json  # Dados persistidos (criado automaticamente)
```

## 🔧 Requisitos

### Com PHP (Recomendado)
- Apache, Nginx ou qualquer servidor com PHP 7+
- Permissão de escrita na pasta `data/`

### Com Node.js
- Node.js 14+
- npm

### Sem servidor (Modo Local)
- Basta abrir `index.html` no navegador
- Dados salvos apenas no localStorage do navegador

## 🔒 Segurança da API (data.php)

O `data.php` implementa validação robusta:

### Estrutura Obrigatória
```json
{
  "devices": [...],
  "connections": [...],
  "nextDeviceId": 1
}
```

### Validação de Dispositivos
Cada dispositivo deve ter:
- `id` (inteiro positivo)
- `rackId` (string)
- `name` (string)
- `type` (string)
- `status` (string)
- `ports` (array)

### Validação de Conexões
Cada conexão deve ter:
- `from` (inteiro)
- `type` (string)
- `status` (string)

### Respostas de Erro
```json
{"error": "Invalid device at index 2: missing required field 'name'"}
{"error": "Invalid connection at index 5: 'type' must be a string"}
```

## 📡 API REST

### GET /data ou GET /data.php
Retorna os dados atuais ou estrutura vazia:
```json
{"devices": [], "connections": [], "nextDeviceId": 1}
```

### POST /data ou POST /data.php
Salva os dados. Body deve ser JSON válido com estrutura acima.

Resposta sucesso:
```json
{"ok": true}
```

## 💾 Persistência

O cliente tenta salvar em duas URLs:
1. `/data` (Node.js server)
2. `/data.php` (PHP)

Se ambas falharem:
- Dados salvos no `localStorage`
- Toast de aviso exibido ao usuário
- Na próxima vez que o servidor estiver disponível, sincroniza

## 🖥️ Compatibilidade

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13+

## 📌 Versão

**v2.4.0** - Dezembro 2025

### Arquitetura
- JavaScript modular (app.js + ui-updates.js)
- Estado encapsulado em `appState`
- Toast notifications (substitui alert())
- Validação robusta no servidor

## 🔗 Links Úteis

- [Documentação Principal](../README.md)
- [Tailwind CSS](https://tailwindcss.com/)
- [SheetJS (XLSX)](https://sheetjs.com/)
