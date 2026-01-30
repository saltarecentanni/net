# CHANGELOG - Version 3.3.1

**Data:** 30 Janeiro 2026  
**Status:** ✅ Completado

---

## 📋 Riepilogo delle Modifiche v3.3.1

### 🐛 Bug Fixes - Matrix Mouse Hover

#### 1. Correzione Hover Ultima Colonna e Riga
**Problema:** Le celle delle colonne speciali (Wall Jack e External) non evidenziavano i rispettivi header in giallo quando si passava il mouse sopra.

**Causa:** Le celle `<rect>` delle colonne Wall Jack e External non avevano gli attributi `data-row` e `data-col` necessari per la funzione `highlightMatrixHeaders()`.

**Soluzione:**
- ✅ Aggiunto `data-row` alle celle Wall Jack 
- ✅ Aggiunto `data-col` alle celle Wall Jack (valore: `deviceCount`)
- ✅ Aggiunto `data-row` alle celle External
- ✅ Aggiunto `data-col` alle celle External (valore: `deviceCount + 1`)

**File modificato:**
- `js/ui-updates.js` (linee ~988, ~1002)

**Risultato:**
- Mouse hover giallo ora funziona su tutte le celle della matrice
- Header di riga e colonna evidenziati correttamente per Wall Jack e External
- Comportamento consistente con le celle normali

---

### 🎨 UI/UX Improvements - Font Standardization

#### 2. Standardizzazione Font Celle Speciali
**Problema:** Le celle Wall Jack e External usavano font-size diversi (9px e 7px) rispetto alle celle normali (11px), rendendo il testo inconsistente.

**Soluzione:**
- ✅ Wall Jack: font-size aggiornato da 9px → 11px
- ✅ Wall Jack: aggiunto font-family monospace
- ✅ External: font-size aggiornato da 9px/7px → 11px
- ✅ External: aggiunto font-family monospace

**File modificato:**
- `js/ui-updates.js` (linee ~995-996, ~1009-1010)

**Risultato:**
- Font uniformi in tutte le celle della matrice
- Miglior leggibilità dei port names
- Aspetto visivo coerente

---

## 📝 Technical Details

### Codice Prima (Wall Jack)
```javascript
html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+38) + '" fill="white" font-size="9" font-weight="bold" text-anchor="middle">' + ...
html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+55) + '" fill="rgba(255,255,255,0.8)" font-size="7" text-anchor="middle">→' + ...
```

### Codice Dopo (Wall Jack)
```javascript
html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+38) + '" fill="white" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">' + ...
html += '<text x="' + (wjX+cellSize/2) + '" y="' + (y+55) + '" fill="rgba(255,255,255,0.8)" font-size="11" font-family="monospace" text-anchor="middle">→' + ...
```

---

## ✅ Quality Assurance

### Code Review Completo
- ✅ Nessun console.log/debugger lasciato nel codice
- ✅ Nessun errore di compilazione critico
- ✅ Tutti i warning sono cosmetici (CSS logical properties suggestions)
- ✅ Codice consistente con standard del progetto
- ✅ Nessuna duplicazione di codice introdotta

### Test Funzionali
- ✅ Mouse hover funziona su tutte le celle
- ✅ Headers evidenziati correttamente
- ✅ Font uniformi in tutta la matrice
- ✅ Tooltip funzionante
- ✅ Click per edit connessioni funzionante
- ✅ Export PNG mantiene qualità

---

## 📊 Impact Analysis

### Performance
- **Nessun impatto**: Le modifiche sono puramente dichiarative (attributi HTML)
- **Rendering**: Invariato, stesse operazioni DOM
- **Memory**: Nessun overhead aggiuntivo

### Compatibilità
- **Browser**: Compatibile con tutti i browser moderni
- **Offline**: Funzionalità offline preservata
- **Intranet**: Pronto per deploy in intranet aziendale

---

## 🔄 Migration Notes

Nessuna migrazione necessaria. Le modifiche sono trasparenti per gli utenti esistenti.

---

## 📦 Files Changed

```
Matrix/js/ui-updates.js (4 modifiche)
  - Linea ~988: Aggiunto data-row, data-col a Wall Jack cell
  - Linea ~995-996: Font Wall Jack standardizzato
  - Linea ~1002: Aggiunto data-row, data-col a External cell  
  - Linea ~1009-1010: Font External standardizzato
```

---

## 🎯 Next Steps

Per versioni future si consiglia:
1. Considerare refactoring per centralizzare rendering celle
2. Valutare astrazione comune per celle speciali
3. Aggiungere unit tests per hover logic

---

**Developed by:** Tiesse S.P.A.  
**Version:** 3.3.1  
**Release Date:** 30 Gennaio 2026
