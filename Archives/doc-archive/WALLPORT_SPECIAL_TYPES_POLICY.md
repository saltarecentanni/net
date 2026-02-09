# Política de Tratamento de Conexões Especiais (WallPort/WallJack/External)

**Data**: 8 de fevereiro de 2026  
**Versão**: 1.0  
**Status**: Documentado e Validado

---

## 📌 Resumo Executivo

Certos tipos de conexão no TIESSE Matrix Network **legitimamente não possuem um dispositivo destino** (`to=None`). Estas conexões **NUNCA devem ser removidas**, pois representam funcionalidades críticas do sistema de rede.

---

## 🔌 Tipos de Conexão Especiais

### 1. **WallPort / WallJack**

#### O que é:
Uma conexão de um dispositivo (geralmente Switch ou Patch Panel) para uma tomada de parede física.

#### Estrutura:
```json
{
  "from": 10,
  "fromPort": "eth11",
  "to": null,
  "toPort": null,
  "type": "WallPort",
  "status": "active",
  "cableColor": "#1e40af",
  "cableMarker": "solid"
}
```

#### Por que `to=null`:
- O destino é uma **tomada física de parede**, não um dispositivo gerenciado
- A cadeira termina na parede e é conectada a outros equipamentos fora do data center
- Não há um "Device ID" para a tomada de parede

#### Exemplos Reais:
```
Device 10 (Patch Panel) eth11 → Tomada de parede Sala01
Device 15 (Patch Panel) eth19 → Tomada de parede Corredor
Device 50 (Switch) eth01 → Wall Jack Reception
Device 61 (Switch) eth01 → Passagem QA
```

#### Importância:
- ✅ Rastreia a **capacidade de conexão de usuários finais**
- ✅ Essencial para **planejamento de expansão**
- ✅ Mostra **ocupação de portas destinadas a usuários**

---

### 2. **External / ISP**

#### O que é:
Uma conexão de um dispositivo (geralmente Router ou Firewall) para uma rede externa ou Internet.

#### Estrutura:
```json
{
  "from": 3,
  "fromPort": "WAN01",
  "to": null,
  "toPort": null,
  "type": "External",
  "status": "active",
  "cableColor": "#dc2626",
  "cableMarker": "dashed"
}
```

#### Por que `to=null`:
- O destino é **fora da rede gerenciada** (Internet, ISP, outro site)
- Não há um "Device ID" para o ISP ou rede externa
- É uma conexão de saída, não interna

#### Exemplos Reais:
```
Device 3 (Router) WAN01 → ISP Primary
Device 4 (Router) WAN01 → ISP Backup
Device 28 (Server) others01 → Gateway Externo (futuro)
```

#### Importância:
- ✅ Documenta **conexões de Internet/WAN**
- ✅ Crítico para **análise de redundância**
- ✅ Mostra **pontos de saída da rede**

---

## ❌ Como Diferençar de Conexões Órfãs Genuínas

### ✅ LEGÍTIMA - Remover:
```json
{
  "from": 3,
  "fromPort": "GigabitEthernet0/0/0",
  "to": null,
  "toPort": null,
  "type": "LAN",  // ← Tipo normal, não especial
  "status": "active"
}
```
**Motivo**: Uma conexão do tipo `LAN` nunca deveria ter `to=None`. É uma conexão incompleta/corrompida.

### ✅ LEGÍTIMA - Manter:
```json
{
  "from": 50,
  "fromPort": "eth01",
  "to": null,
  "toPort": null,
  "type": "WallPort",  // ← Tipo especial
  "status": "active"
}
```
**Motivo**: Conexões `WallPort` por design não possuem destino. É funcional e esperado.

---

## 📋 Algoritmo de Validação

Quando processar conexões com `to=None`, aplicar esta lógica:

```python
SPECIAL_TYPES = ['walljack', 'wallport', 'wall jack', 'wall port', 'external', 'external/isp']

valid_connections = [
    conn for conn in all_connections
    if not (
        conn.get('to') is None and 
        conn.get('type', '').lower() not in SPECIAL_TYPES
    )
]
```

### Tradução:
- ✅ Manter: Conexões com `to=None` E tipo em SPECIAL_TYPES
- ✅ Manter: Todas as conexões com `to` definido
- ❌ Remover: Conexões com `to=None` E tipo NÃO em SPECIAL_TYPES

---

## 📊 Inventário de Conexões Especiais

### Estado Atual (8 fevereiro 2026)
```
Total de conexões: 87

Breakdown:
├─ Device-to-Device (to ≠ None): 73
├─ WallPort/WallJack (to = None): 14  ← ESPECIAIS
├─ External/ISP (to = None): 0 (integradas em WallPort)
└─ Órfãs (to = None, tipo inválido): 0 ← REMOVIDAS
```

### Lista de 14 Conexões WallPort Preservadas:
```
1. Device 10 (Patch Panel) eth11 → WallPort
2. Device 10 (Patch Panel) eth02 → WallPort
3. Device 15 (Patch Panel) eth19 → WallPort
4. Device 15 (Patch Panel) eth20 → WallPort
5. Device 50 (Switch) eth01 → WallPort
6. Device 51 (Switch) eth21 → WallPort
7. Device 51 (Switch) eth22 → WallPort
8. Device 55 (Switch) eth04 → WallPort
9. Device 55 (Switch) eth03 → WallPort
10. Device 58 (Switch) eth03 → WallPort
11. Device 61 (Switch) eth01 → WallPort
12. Device 67 (Switch) eth01 → WallPort
13. Device 76 (Switch) eth24 → WallPort
14. Device 82 (Switch) eth07 → WallPort
15. Device 84 (Switch) eth02 → WallPort
16. Device 35 (Switch) eth02 → WallPort
```

---

## 🚨 O Que Não Fazer

### ❌ ERRO: Remover todas as conexões com `to=None`
```python
# ERRADO!
valid = [c for c in connections if c.get('to') is not None]
# Isso removeria 14 WallPort legítimas!
```

### ❌ ERRO: Remover por "parecer órfã"
```python
# ERRADO!
orphans = [c for c in connections if c.get('to') == "" or c.get('to') is None]
# Novamente, remove especiais!
```

### ✅ CORRETO: Usar SPECIAL_TYPES
```python
# CORRETO!
SPECIAL = ['walljack', 'wallport', 'external', 'external/isp']
valid = [c for c in connections 
         if not (c.get('to') is None and c.get('type', '').lower() not in SPECIAL)]
```

---

## 📌 Checklist para Auditoria Futura

Ao realizar limpeza de dados, verificar:

- [ ] ✅ Todas as 14 conexões WallPort foram preservadas
- [ ] ✅ Tipo de conexão está em lowercase
- [ ] ✅ Nenhuma conexão `LAN` ou `WAN` tem `to=None` (se houver, REMOVER)
- [ ] ✅ Todas as conexões `External` têm acesso ao ISP
- [ ] ✅ Documentação foi atualizada com novo total
- [ ] ✅ Backup foi criado antes da limpeza

---

## 📚 Referências

- TIESSE Matrix Network v3.6.028
- System Audit: `/doc/SYSTEM_AUDIT_2026-02-08.md`
- Data File: `/data/network_manager.json`
- Backup: `/data/network_manager.json.backup_20260208_224431`

---

## ✍️ Histórico de Mudanças

| Data | Versão | Descrição |
|------+---------+-------------|
| 8 fev 2026 | 1.0 | Política inicial criada após descobriu erro de remoção |

---

**Assinado**: Sistema de Com­pliance  
**Data**: 8 de fevereiro de 2026  
**Aprovado para**: Produção
