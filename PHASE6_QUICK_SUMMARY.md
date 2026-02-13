# ⚡ PHASE 6: Port Monitor - TL;DR (Resumo Executivo)

## 🎯 O Problema
Você tem dois dispositivos conectados (fonte → destino), mas não sabe quando o cabo é desconectado. Quer detectar isso automaticamente e ser avisado.

## ✅ A Solução Proposta

### Arquitetura em 3 Palavras
**"Ping + Background Job + Alertas"**

```
┌─────────────────────────────────────────────────────┐
│ Background Job (roda a cada 10 min)                │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Para cada conexão:                                 │
│  ┌──────────────┐        ┌──────────────┐          │
│  │ Device A     │ PING  │ Device B     │          │
│  │ 192.168.1.10 │───→   │ 192.168.1.20 │          │
│  │ eth1         │        │ eth5         │          │
│  └──────────────┘        └──────────────┘          │
│       ✓ ONLINE              ✓ ONLINE                │
│                                                       │
│  Se algo muda:                                      │
│  🟢 online → VERDE no sistema                       │
│  🔴 offline → VERMELHO + ALERTA no sistema         │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 📊 FASE A: Simple (COMEÇAR AQUI)

**Tempo**: 3-4 dias  
**Complexidade**: Baixa  
**Dependências**: Nenhuma extra  

### O que faz
```
✅ Monitora portas a cada 10 minutos
✅ Detecta online/offline automaticamente
✅ Mostra ícones 🟢 verde / 🔴 vermelho
✅ Alerta quando muda de estado
✅ Histórico de 7 dias
```

### UI
```
Nova TAB: Port Monitor 🔌
├── Status de todas as portas
├── Filtro por online/offline/todos
├── Alertas recentes
└── Histórico de mudanças
```

### Não precisa de
- Configuração SNMP
- LibreNMS
- Nada complexo

---

## 🔧 FASE B: Pro (2-3 semanas depois)

```
✅ Suporte SNMP (mais preciso)
✅ Alertas por email
✅ Dashboard com gráficos
✅ Cálculo de SLA (uptime %)
✅ Webhooks
```

---

## 🚀 FASE C: Enterprise (futuro)

```
✅ Integração LibreNMS
✅ Multi-site / VPN
✅ Escalabilidade
✅ Compliance reports
```

---

## 💡 Por que é Simples

| Aspecto | Solução |
|--------|---------|
| **Detecção** | Ping (ICMP) - não precisa de config |
| **Frequência** | Background job - roda sozinho |
| **Alertas** | Toast notification - visualização imediata |
| **Custo** | ~8KB/dia de banda por porta |
| **Overhead** | ~50ms por check (rápido) |

---

## 🎬 Como Funciona na Prática

### Cenário

Você tem:
- **SW - Core-01** (192.168.1.10) com eth1
- **RT - Gateway** (192.168.1.20) com eth0
- Conectadas via cabo

### Timeline

```
14:00 - Monitor tem tudo VERDE 🟢
        └─ Cria ping: 192.168.1.10 → RESPONDE
        └─ Cria ping: 192.168.1.20 → RESPONDE
        └─ Status: ONLINE

14:05 - Você desconecta o cabo fisicamente

14:10 - Monitor roda novamente
        └─ Cria ping: 192.168.1.10 → TIMEOUT ❌
        └─ Cria ping: 192.168.1.20 → TIMEOUT ❌
        └─ Status muda para: OFFLINE 🔴
        └─ ALERTA DISPARADO! ⚠️

        🔴 PORT DOWN
        SW - Core-01 eth1 → RT - Gateway eth0
        Desconectado há: 0 min (AGORA!)

14:15 - Você reconecta o cabo

14:20 - Monitor roda novamente
        └─ Cria ping: 192.168.1.10 → RESPONDE ✓
        └─ Cria ping: 192.168.1.20 → RESPONDE ✓
        └─ Status muda para: ONLINE 🟢
        └─ ALERTA DE RECOVERY! ✅

        ✅ PORT RECOVERED
        SW - Core-01 eth1 → RT - Gateway eth0
        Tempo offline: 10 minutos
```

---

## 🎯 Decisões Necessárias

### 1. Intervalo de Scan

Opções:
- [ ] **5 minutos** - Detecção muito rápida, mais band width
- [x] **10 minutos** - Equilíbrio (RECOMENDADO)
- [ ] **15 minutos** - Mais econômico, detecção mais lenta
- [ ] **30 minutos** - Muito lento

### 2. Alertas

Opções:
- [x] **Toast notification** - Pop-up no sistema
- [ ] **Email** - Depois (FASE B)
- [ ] **Nenhum** - Só log silencioso

### 3. Histórico

Opções:
- [ ] **3 dias** - Menos storage
- [x] **7 dias** (RECOMENDADO)
- [ ] **30 dias** - Mais análise

---

## 🚀 Próximo Passo

Quer que eu **comece a implementar FASE A?**

Se sim, preciso confirmar:
1. ✓ Intervalo: **10 minutos**
2. ✓ Alertas: **Toast notifications**
3. ✓ Histórico: **7 dias**

→ Próxima: Codificar background job + UI + testes

---

**Benefícios:**
- 🟢 Detecta falhas ANTES do usuário reclamar
- 🟢 Simples de entender e usar
- 🟢 Escalável para SNMP depois
- 🟢 Zero dependências externas
- 🟢 Funciona em qualquer rede IP

**ROI:** Alto - Uma única detecção de falha já paga a implementação

