# 🎯 PROMPT PARA OUTRA IA - RECRIAÇÃO EXATA DA MAPPATURA RETI

---

## ⚠️ INSTRUÇÕES CRÍTICAS

**LEIA TUDO ANTES DE COMEÇAR!**

Este prompt deve ser usado para pedir a OUTRA IA (Claude, GPT-4, etc) para recriar a aplicação React da Mappatura Reti TIESSE 2026 exatamente como especificado, SEM ERROS.

Abaixo estão 3 arquivos que você já tem. Copie EXATAMENTE como estão.

---

## 🚀 PROMPT PARA A OUTRA IA

```
Você receberá 3 arquivos JSON e JSX que definem uma aplicação React completa.
Sua tarefa é recriá-los exatamente como fornecido, sem modificações, erros ou omissões.

NÃO MUDE NADA. Use os arquivos abaixo como fonte de verdade absoluta.

### ARQUIVO 1: mappatura_reti_data.json
[COLE AQUI O CONTEÚDO COMPLETO DO JSON]

### ARQUIVO 2: MappaaturaReti.jsx
[COLE AQUI O CONTEÚDO COMPLETO DO JSX]

### ARQUIVO 3: MappaaturaReti_Advanced.jsx
[COLE AQUI O CONTEÚDO COMPLETO DO ADVANCED JSX]

---

## REQUISITOS CRÍTICOS

1. **ESTRUTURA EXATA**
   - Manter exatamente a mesma estrutura de componentes
   - Mesmos nomes de funções
   - Mesmas variáveis de estado (useState)
   - Mesmas props

2. **FUNCIONALIDADES OBRIGATÓRIAS**
   - Versão BASE: Visualizar + Hover + Click + Zoom/Pan + Detalhes
   - Versão ADVANCED: BASE + API + Undo/Redo + Busca + Edit + Export/Import

3. **DADOS EXATOS**
   - Todos os 20 ambientes (0-19)
   - Todas as coordenadas X,Y precisas
   - Todas as cores em formato HEX
   - Todos os pontos de parede

4. **RENDERIZAÇÃO SVG**
   - Grid com linhas verdes e amarelas
   - Bordas coloridas (vermelho/verde)
   - Paredes azuis com curvas suaves
   - Números em azul, centralizados
   - Escadas com padrão de linhas magenta
   - Marcadores quadrados nos cantos

5. **INTERATIVIDADE**
   - Hover muda opacidade
   - Click seleciona ambiente
   - Scroll para zoom (0.5x a 3x)
   - Painel lateral com detalhes
   - Botão de reset view

6. **ESTILOS INLINE**
   - Use a mesma estrutura de estilos
   - Mesmas cores
   - Mesma responsividade
   - Mesmos tamanhos de fonte

7. **NÃO ADICIONE**
   - Bibliotecas extras (além do React)
   - Comentários adicionais
   - Funcionalidades não pedidas
   - Mudanças estéticas
   - Modificações estruturais

8. **SE ALGO NÃO ESTIVER CLARO**
   - Peça esclarecimentos ANTES de começar
   - NÃO adivinhe ou improvise
   - AVISO: Qualquer modificação será rejeitada

---

## VALIDAÇÃO FINAL

Depois de recriar, verifique:

✅ Todos os 20 ambientes aparecem na mapa
✅ Os números estão centrados em cada sala
✅ As paredes são azuis e conectadas
✅ As escadas têm padrão de linhas magenta
✅ As bordas são vermelhas (top/left) e verdes (bottom/right)
✅ O zoom funciona com scroll
✅ Click em ambiente mostra painel lateral
✅ Hover muda a cor/opacidade
✅ Nenhum erro no console
✅ Código formatado e comentado

Se algo não funcionar ou estiver diferente do original, REJEITE e peça para refazer.

---

## PRÓXIMAS AÇÕES

Após receber os arquivos recriados:

1. Crie projeto React com Vite
2. Cole os arquivos nas pastas corretas
3. Execute `npm run dev`
4. Verifique se tudo funciona identicamente ao esperado
5. Se houver diferenças, envie screenshot + erro para IA refazer

---

## ARQUIVO DE SETUP (opcional)

Se a IA não sabe como estruturar o projeto, forneça também:

```
Estrutura de pastas:
src/
├── components/
│   ├── MappaaturaReti.jsx
│   └── MappaaturaReti_Advanced.jsx
├── data/
│   └── mappatura_reti_data.json
├── App.jsx
└── main.jsx
```

---

## ⚠️ AVISOS

- Não aceite sugestões de "melhorias" que mudem a estrutura
- Não aceite componentes customizados adicionais desnecessários
- Rejeite se a IA adicionar dependências extras
- Rejeite se os números não estiverem EXATAMENTE nos mesmos lugares
- Rejeite se as cores não forem EXATAMENTE as mesmas

---

**VOCÊ ENTENDEU? Sim/Não - Confirme antes de prosseguir.**
```

---

## 📋 PASSOS PARA USAR ESTE PROMPT

### 1️⃣ **Abra o arquivo JSON que criei**
```
Abra: mappatura_reti_data.json
Copie TODO o conteúdo
```

### 2️⃣ **Abra o componente BASE que criei**
```
Abra: MappaaturaReti.jsx
Copie TODO o conteúdo
```

### 3️⃣ **Abra o componente ADVANCED que criei**
```
Abra: MappaaturaReti_Advanced.jsx
Copie TODO o conteúdo
```

### 4️⃣ **Monte o prompt final**
```
Use o template acima e substitua:
[COLE AQUI O CONTEÚDO COMPLETO DO JSON]
[COLE AQUI O CONTEÚDO COMPLETO DO JSX]
[COLE AQUI O CONTEÚDO COMPLETO DO ADVANCED JSX]
```

### 5️⃣ **Envie para a outra IA**
- Cole o prompt completo
- Clique em "Send"
- Aguarde a resposta

---

## ✅ O QUE VOCÊ DEVE RECEBER

A IA deve responder com EXATAMENTE estes 3 arquivos:

1. `mappatura_reti_data.json` - IDÊNTICO
2. `MappaaturaReti.jsx` - IDÊNTICO
3. `MappaaturaReti_Advanced.jsx` - IDÊNTICO

Se receber algo diferente, REJEITE e peça para refazer.

---

## 🎯 DICAS PARA O SUCESSO

### ✅ FAÇA ASSIM:
- ✅ Fornecça os 3 arquivos completos
- ✅ Use o prompt exato acima
- ✅ Seja claro sobre "SEM MUDANÇAS"
- ✅ Peça confirmação antes
- ✅ Valide contra os arquivos originais

### ❌ NÃO FAÇA ASSIM:
- ❌ Não resuma os arquivos
- ❌ Não mude o prompt
- ❌ Não permita "melhorias"
- ❌ Não aceite componentes extras
- ❌ Não faça assumições sobre funcionalidades

---

## 📊 CHECKLIST FINAL

Antes de enviar para outra IA:

- [ ] Tenho os 3 arquivos originais
- [ ] Copiei o prompt completo
- [ ] Substituí os placeholders pelos conteúdos dos arquivos
- [ ] Verifiquei que não há typos no prompt
- [ ] Estou pronto para validar a resposta

---

## 💬 EXEMPLO DE COMO USAR

**Você copia e cola isto para outra IA:**

```
Você receberá 3 arquivos JSON e JSX que definem uma aplicação React completa.
Sua tarefa é recriá-los exatamente como fornecido, sem modificações.

### ARQUIVO 1: mappatura_reti_data.json
{
  "canvas": {
    "width": 1434,
    "height": 800,
    "viewBox": "0 0 1434 800"
  },
  "colors": {
    "wall_primary": "#0000FF",
    ...
  },
  ... (resto do JSON)
}

### ARQUIVO 2: MappaaturaReti.jsx
import React, { useState, useEffect } from 'react';
import mapData from './mappatura_reti_data.json';

const MappaaturaReti = () => {
  ... (resto do código)
};

export default MappaaturaReti;

### ARQUIVO 3: MappaaturaRetiAdvanced.jsx
/**
 * MappaaturaReti - Versione Avanzata...
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
... (resto do código)
```

---

## 🎓 RESUMO

| O quê | Como | Onde |
|------|------|------|
| JSON original | Copiar tudo | mappatura_reti_data.json |
| React básico | Copiar tudo | MappaaturaReti.jsx |
| React avançado | Copiar tudo | MappaaturaReti_Advanced.jsx |
| Prompt | Usar template acima | Para outra IA |
| Validação | Comparar com original | Após receber de IA |

---

**Pronto? Quer que eu crie um exemplo com conteúdo real já colado?**
