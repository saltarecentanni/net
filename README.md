# Tiesse Matrix Network

Sistema web de gerenciamento de infraestrutura de rede para ambientes corporativos.

**Versão atual:** 2.5.0

## 📋 Visão Geral

O **Tiesse Matrix Network** é uma aplicação web para gerenciar dispositivos de rede, conexões e racks. Oferece visualização em matriz, exportação de dados e interface moderna.

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
| Backend | PHP 7+ |
| Persistência | LocalStorage + Servidor |
| Excel | SheetJS (XLSX 0.18.5) |

## 📁 Estrutura do Projeto

```
net/
├── README.md                 # Este arquivo
└── intranet/
    ├── index.html            # Página principal
    ├── data.php              # API de persistência
    ├── server.js             # Servidor Node.js (alternativo)
    ├── README.md             # Documentação de deploy
    ├── js/
    │   ├── app.js            # Lógica principal
    │   └── ui-updates.js     # Renderização UI
    └── data/
        └── network_manager.json  # Dados persistidos
```

## 📦 Instalação

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

## 🔒 Segurança

- ✅ Validação de estrutura JSON
- ✅ Validação de campos obrigatórios
- ✅ Mensagens de erro detalhadas
- ✅ Fallback para LocalStorage

## 📌 Changelog

### v2.5.0 (Dezembro 2025)
- 🧹 Limpeza de arquivos desnecessários
- 📚 Documentação atualizada
- ✅ Compatibilidade com PHP built-in server

### v2.4.0
- ✨ Arquitetura modular (app.js + ui-updates.js)
- ✨ Sistema de Toast notifications
- 🔒 Validação robusta no PHP
- 🖨️ Impressão melhorada

## 📄 Licença

Projeto interno TIESSE.