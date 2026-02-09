# Release Notes - TIESSE Matrix Network v3.6.029

**Data de Release:** 9 de fevereiro de 2026  
**Versão Anterior:** v3.6.028

---

## 🎯 Resumo

Versão focada em melhorias de UI na topologia e correção de bugs antigos relacionados ao drag & drop de dispositivos.

---

## ✅ Correções de Bugs

### 🐛 Bug #1 - Container Topology com Altura Fixa
**Problema:** Container do SVG de topologia tinha altura fixa de 600px, limitando visualização.  
**Solução:** Alterado para `height: calc(100vh - 220px)` com `min-height: 500px`.  
**Arquivo:** `index.html:3058`

### 🐛 Bug #2 - Layouts com Dimensões Fixas
**Problema:** Todos os layouts (circle, grid, hierarchical) usavam 1200x600 fixos.  
**Solução:** Dimensões agora calculadas dinamicamente baseadas em `devices.length`.  
**Arquivo:** `js/features.js:1728-1734`

### 🐛 Bug #3 - Drag Boundary Visual Glitch (Bug Antigo)
**Problema:** Arrastar ícones até a borda do container causava glitches visuais (ícones "desapareciam" ou ficavam corrompidos).  
**Causa Raiz:** Quando mouse saía do container, `(clientX - svgRect.left) / svgRect.width` produzia valores extremos (NaN ou Infinity).  
**Solução:** Adicionada validação robusta em 4 funções:
- `startDrag()` - Valida coordenadas iniciais, protege contra rect zero
- `drag()` - Detecta mouse fora do container (margem 50px), valida NaN/Infinity
- `panMove()` - Protege contra rect zero, valida scale/delta
- `handleZoom()` - Limita zoom (100-50000), valida mouseX/Y  
**Arquivo:** `js/features.js:2785-2920, 3415-3455`

### 🐛 Bug #4 - Dropdown de Sala Inconsistente
**Problema:** Dropdown "Wall Jack Room" usava formato diferente dos outros filtros de localização.  
**Antes:** `(No Room)`, `Sala Server (Room 0)`  
**Depois:** `📍 Select Location`, `00 - Sala Server`  
**Arquivos:** `js/app.js:2708-2745`, `index.html:479-484`

---

## 🔧 Mudanças Técnicas

### Arquivos Modificados
| Arquivo | Linhas Alteradas | Descrição |
|---------|------------------|-----------|
| `index.html` | 3058, 479-484 | Container responsivo, label Room→Location |
| `js/features.js` | 1728-1810, 2785-2920, 3415-3455 | Layouts dinâmicos, validação de coordenadas |
| `js/app.js` | 104, 2708-2745 | SUPPORTED_VERSIONS, populateWallJackRoomSelect |

### Versões de Arquivos
Todos os arquivos `.js`, `.php`, `.css` atualizados para v3.6.029:
- `package.json` - version: "3.6.029"
- `server.js` - Version: 3.6.029
- `data.php` - Version: 3.6.029
- `config/config.php` - Version: 3.6.029
- `api/auth.php` - Version: 3.6.029
- `api/editlock.php` - Version: 3.6.029
- `css/styles.css` - Version: 3.6.029
- `scripts/deploy.sh` - Version: 3.6.029
- Todos os arquivos em `js/` - Version: 3.6.029

---

## ⬆️ Upgrade Path

De v3.6.028 para v3.6.029:
1. Faça backup do arquivo `data/network_manager.json`
2. Substitua os arquivos do projeto
3. Recarregue a página (F5)

**Não há migração de dados necessária** - formato JSON permanece 100% compatível.

---

## 📊 Métricas

- **Linhas modificadas:** ~150
- **Arquivos alterados:** 15
- **Bugs corrigidos:** 4
- **Risco:** Baixo (apenas UI, sem alteração de dados)

---

## 🧪 Testes Recomendados

1. ✅ Abrir topologia com todos os dispositivos
2. ✅ Testar layouts: Auto, Circle, Grid, Hierarchical
3. ✅ Arrastar dispositivo até borda do container (todas as 4 bordas)
4. ✅ Usar zoom (scroll) em diferentes níveis
5. ✅ Usar pan (arrastar fundo vazio)
6. ✅ Clicar "Fit" após mover dispositivos
7. ✅ Verificar dropdown Wall Jack ao editar conexões
8. ✅ Exportar PNG e verificar qualidade

---

**Autor:** GitHub Copilot  
**Aprovado:** -  
**Data:** 2026-02-09
