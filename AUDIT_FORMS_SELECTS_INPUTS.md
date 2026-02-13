# 📋 AUDIT COMPLETO: Inconsistências de Forms, Selects, Inputs

**Data:** 2026-02-12 | **Versão:** v4.1.003 | **Status:** ⚠️ NÃO PADRONIZADO

---

## 🔴 INCONSISTÊNCIAS ENCONTRADAS

### 1️⃣ PADDING VERTICAL (py-?)
```
┌─────────────────────────────┬─────────────┬──────────────┐
│ ELEMENTO                    │ CURRENT     │ EXPECTED     │
├─────────────────────────────┼─────────────┼──────────────┤
│ Device Location select      │ py-1.5  ✗   │              │
│ Device Group select         │ py-1.5  ✗   │              │
│ Device Type select          │ py-1.5  ✗   │              │
│ Connection fromLocation     │ py-1.5  ✗   │              │
│ Connection fromDevice       │ py-1.5  ✗   │              │
│ Matrix Location Filter      │ py-1   ✗   │              │
│ Topology Layout select      │ py-1   ✗   │              │
│ Topology Print button       │ py-1   ✗   │              │
│ Activity Log Filter         │ py-1.5  ✗   │              │
│ Connection Type select      │ py-1.5  ✗   │              │
│ Button Clear/Cancel         │ py-1.5  ✗   │              │
└─────────────────────────────┴─────────────┴──────────────┘
```
**PROBLEMA:** 3 variações! `py-1`, `py-1.5`, e botões com variações

---

### 2️⃣ TAMANHO DE TEXTO (text-?)
```
┌─────────────────────────────┬─────────────┬──────────────┐
│ ELEMENTO                    │ CURRENT     │ EXPECTED     │
├─────────────────────────────┼─────────────┼──────────────┤
│ Device Location select      │ text-xs ✗   │              │
│ Device Group select         │ text-xs ✗   │              │
│ Device Type select          │ text-xs ✗   │              │
│ Connection selects          │ text-xs ✗   │              │
│ Matrix Location Filter      │ text-sm ✗   │              │
│ Topology buttons            │ text-sm ✗   │              │
│ Activity Log Filter         │ text-sm ✗   │              │
│ Connection details          │ text-xs ✗   │              │
└─────────────────────────────┴─────────────┴──────────────┘
```
**PROBLEMA:** 2 variações! `text-xs` (forms) vs `text-sm` (matrix, topology, logs)

---

### 3️⃣ LARGURA E ESTILO DA BORDA (border-?)
```
┌─────────────────────────────┬──────────────────────────────┐
│ ELEMENTO                    │ CURRENT                      │
├─────────────────────────────┼──────────────────────────────┤
│ Device Location             │ border-2 border-slate-400 ✗  │
│ Device Group                │ border-2 border-blue-400  ✗  │
│ Device Type                 │ border border-slate-300  ✗   │
│ Connection fromLocation     │ border-2 border-slate-400 ✗  │
│ Connection fromGroup        │ border border-orange-300  ✗  │
│ Connection fromDevice       │ border-2 border-orange-400✗  │
│ Connection Type             │ border border-slate-300  ✗   │
│ Matrix Location Filter      │ border-2 border-slate-400 ✗  │
│ Topology Layout select      │ border border-slate-300  ✗   │
│ Activity Log Filter         │ border border-slate-300  ✗   │
└─────────────────────────────┴──────────────────────────────┘
```
**PROBLEMA:** 4 combinações diferentes!
- `border-2 border-slate-400` (device, matrix, connection)
- `border-2 border-blue-400` (device group only)
- `border-2 border-orange-400` (connection device/port)
- `border border-slate-300` (type, topology, activity)
- `border border-orange-300` (connection group only)

---

### 4️⃣ COR DE FUNDO (bg-?)
```
┌─────────────────────────────┬──────────────────────────────┐
│ ELEMENTO                    │ CURRENT                      │
├─────────────────────────────┼──────────────────────────────┤
│ Device Location             │ bg-slate-50  ✗               │
│ Device Group                │ (nenhum bg)  ✗               │
│ Device Type                 │ (nenhum bg)  ✗               │
│ Connection fromLocation     │ bg-slate-50  ✗               │
│ Connection fromGroup        │ bg-white (dentro bg-orange)  │
│ Connection fromDevice       │ bg-white (dentro bg-orange)  │
│ Connection Type             │ (nenhum bg)  ✗               │
│ Matrix Location Filter      │ bg-slate-50  ✗               │
│ Topology Layout select      │ (nenhum bg)  ✗               │
│ Activity Log Filter         │ (nenhum bg)  ✗               │
└─────────────────────────────┴──────────────────────────────┘
```
**PROBLEMA:** Alguns têm `bg-slate-50`, outros `bg-white`, outros nenhum

---

### 5️⃣ FONT-WEIGHT (font-?)
```
┌─────────────────────────────┬──────────────────────────────┐
│ ELEMENTO                    │ CURRENT                      │
├─────────────────────────────┼──────────────────────────────┤
│ Device Location             │ font-semibold ✗              │
│ Device Group                │ font-semibold ✗              │
│ Device Type                 │ font-semibold ✗              │
│ Connection fromDevice       │ font-medium   ✗              │
│ Connection fromGroup        │ (sem font)    ✗              │
│ Connection Type             │ (sem font)    ✗              │
│ Matrix Location Filter      │ font-semibold ✗              │
│ Topology Layout select      │ (sem font)    ✗              │
│ Activity Log Filter         │ (sem font)    ✗              │
└─────────────────────────────┴──────────────────────────────┘
```
**PROBLEMA:** `font-semibold`, `font-medium`, ou nenhum

---

### 6️⃣ ROUNDED (rounded-?)
```
┌─────────────────────────────┬──────────────────────────────┐
│ ELEMENTO                    │ CURRENT                      │
├─────────────────────────────┼──────────────────────────────┤
│ Todos os selects/inputs     │ rounded-lg ✓ (CONSISTENTE)   │
│ Botões action               │ rounded-lg, rounded (MISTO)  │
└─────────────────────────────┴──────────────────────────────┘
```
**✓ OK:** Rounded está OK (rounded-lg em tudo)

---

## 📊 RESUMO DAS INCONSISTÊNCIAS

| Propriedade | Variações | Atual |
|---|---|---|
| **Padding Vertical** | 3 | `py-1`, `py-1.5`, variações em botões |
| **Tamanho Texto** | 2 | `text-xs` (forms), `text-sm` (matrix/topology/logs) |
| **Borda** | 4 | `border-2 border-slate-400`, `border-2 border-blue-400`, `border-2 border-orange-400`, `border border-slate-300`, `border border-orange-300` |
| **Fundo** | 3 | `bg-slate-50`, `bg-white`, nenhum |
| **Font-Weight** | 3 | `font-semibold`, `font-medium`, nenhum |
| **Rounded** | 1 | `rounded-lg` ✓ (OK) |

---

## 🎯 RECOMENDAÇÕES PARA PADRONIZAÇÃO

### Opção A: MINIMALISTA (Simples e Consistente)
```html
<select class="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
<!-- Aplica em TODOS os selects/inputs de todos os tabs -->
```
**Vantagem:** Consistência máxima, visual limpo
**Desvantagem:** Perde diferenciação visual por tipo

### Opção B: HYBRID (Mantém Core Diferenciação)
```html
<!-- Device Forms (Devices tab) -->
<select class="px-2 py-1.5 border-2 border-slate-400 rounded-lg text-xs bg-slate-50 font-semibold">

<!-- Connection Forms (Connections tab) -->
<select class="px-2 py-1.5 border-2 border-orange-400 rounded-lg text-xs bg-white font-medium">

<!-- Matrix/Topology Filters (não são forms, são controles) -->
<select class="px-2 py-1.5 border-2 border-slate-400 rounded-lg text-sm bg-slate-50 font-semibold">

<!-- Activity Logs Filter (controle global) -->
<select class="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
```
**Vantagem:** Mantém diferenciação + padronização básica
**Desvantagem:** Ainda há variação (border-2 vs border)

### Opção C: RADICAL (Tudo Igual)
Aplicar EXATAMENTE EM TUDO:
- `px-2 py-1.5` (padding)
- `border border-slate-300` (borda simples, cinza neutro)
- `rounded-lg` (rounded)
- `text-sm` (texto)
- `bg-white` (fundo branco simples)
- `font-normal` (sem destaque)

**Vantagem:** Consistência máxima, fácil de manter
**Desvantagem:** Perde visual diferenciação entre tabs

---

## ⚠️ PRÓXIMOS PASSOS

1. **User aprova qual opção:** A, B, ou C?
2. **Agent faz find-replace** em toda linha de index.html
3. **Testa visualmente** no navegador
4. **Cria backup antes** (já existe `matrix-v4.1.003-padrao-visual-antes.tar.gz`)

**Aguardando input...**
