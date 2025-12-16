# Tiesse Matrix Network

Sistema web de gerenciamento de infraestrutura de rede para ambientes corporativos.

## 📋 Visão Geral

O **Tiesse Matrix Network** é uma aplicação web completa para gerenciar dispositivos de rede, conexões e racks. Oferece visualização em matriz, exportação de dados e interface moderna com Tailwind CSS.

## 🚀 Funcionalidades

### Dispositivos
- Cadastro completo (nome, rack, tipo, status, descrição)
- Gerenciamento de portas por dispositivo
- 24 cores automáticas por rack
- Cards visuais com efeitos hover

### Conexões
- Registro de conexões entre dispositivos
- Tipos: Fibra Óptica, UTP, Coaxial, Sem Fio
- Status: Ativo, Inativo, Manutenção
- Velocidade, VLAN, observações
- Ordenação por qualquer coluna

### Matriz Visual
- Visualização em grade colorida por rack
- Expansão para ver todos dispositivos
- Clique para editar dispositivo

### Impressão & Exportação
- 📊 Exportar para Excel (XLSX)
- 📄 Exportar/Importar JSON
- 🖨️ Imprimir dispositivos individuais
- 🖨️ Imprimir tabela de conexões

## 🛠️ Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Frontend | HTML5, Tailwind CSS (CDN) |
| JavaScript | ES6, Modular (app.js + ui-updates.js) |
| Backend | PHP 7+ (opcional) |
| Persistência | LocalStorage + Servidor |
| Excel | SheetJS (XLSX 0.18.5) |

## 📁 Estrutura do Projeto

```
net/
├── README.md                 # Este arquivo
├── intranet/
│   ├── index.html            # Página principal
│   ├── data.php              # API de persistência (validação robusta)
│   ├── README.md             # Documentação de deploy
│   ├── js/
│   │   ├── app.js            # Lógica principal (~1100 linhas)
│   │   └── ui-updates.js     # Renderização UI (~450 linhas)
│   └── data/
│       └── network_manager.json  # Dados persistidos
└── backups/                  # Backups de versões anteriores
```

## 🔒 Segurança

O sistema implementa validação robusta no servidor:

### Validação PHP (data.php)
- ✅ Estrutura JSON válida
- ✅ Arrays `devices` e `connections` obrigatórios
- ✅ `nextDeviceId` como inteiro
- ✅ Cada dispositivo: `id`, `rackId`, `name`, `type`, `status`, `ports`
- ✅ Cada conexão: `from`, `type`, `status`
- ✅ Mensagens de erro detalhadas com índice

### Tratamento de Erros
- ✅ Toast notifications para feedback visual
- ✅ Fallback para LocalStorage quando servidor indisponível
- ✅ Aviso quando sincronização falha

## 📦 Instalação

Consulte [intranet/README.md](intranet/README.md) para instruções detalhadas de deploy.

### Rápido (com PHP)
```bash
# Copie a pasta intranet/ para seu servidor web
# Acesse: http://seu-servidor/intranet/
```

### Com Node.js
```bash
cd intranet
npm install
npm start
# Acesse: http://localhost:3000/
```

## 📌 Versão

**v2.4.0** - Dezembro 2025

### Changelog Recente
- ✨ Arquitetura modular (app.js + ui-updates.js)
- ✨ Sistema de Toast notifications
- ✨ Estado encapsulado (appState)
- 🔒 Validação de conteúdo no PHP
- 🔒 Tratamento de erros de rede
- 🖨️ Impressão melhorada com CSS inline
- 📊 24 cores de rack

## 📄 Licença

Projeto interno TIESSE.