# 🎯 PHASE 6 v2.1: Matriz Rápida de Decisão

**Data**: 2026-02-13

---

## 🔥 Qual Threshold Usar? (Decisão Rápida)

### Se for CRÍTICO (não pode ficar offline)
```
├─ Core Switch? → ⚡ INSTANTÂNEO
├─ Router Principal? → ⚡ INSTANTÂNEO
├─ VPN Gateway? → ⚡ INSTANTÂNEO
└─ Banco de Dados Primário? → ⚡ INSTANTÂNEO (ou 🕐 5 min)
```

### Se for IMPORTANTE (aplicação/usuários dependem)
```
├─ Servidor de App? → 🕐 10-30 minutos
├─ Servidor DB? → 🕐 30 minutos - 1 hora
├─ API Server? → 🕐 5-10 minutos
└─ Share de Rede? → 🕐 10-30 minutos
```

### Se for SECUNDÁRIO (pode ficar offline um tempo)
```
├─ Servidor Backup? → 🔄 3 falhas (= ~30 min) ou 🕐 6 horas
├─ Switch Secundário? → 🔄 2-3 falhas (= ~20-30 min)
├─ Servidor Dev? → Desativar (não crítico)
└─ Cache Server? → 🕐 1-2 horas
```

### Se for NÃO-CRÍTICO (IoT, impressoras, etc)
```
├─ Impressora? → 🕐 24 horas (1 vez/dia)
├─ Câmera IP? → 🕐 6-24 horas
├─ Relógio de Ponto? → 🕐 8 horas
└─ Sensor de Temperatura? → Desativar (ou 🕐 24h)
```

---

## 📊 Tabela Resumida

| Type | Exemplo | Intervalo | Threshold Mode | Threshold |
|------|---------|-----------|-----------------|-----------|
| 🔴 **CRÍTICO** | SW-Core | 5 min | ⚡ Instant | Imediato |
| 🟡 **IMPORTANTE** | SRV-Database | 10 min | 🕐 Tempo | 1 hora |
| 🟢 **SECUNDÁRIO** | SRV-Backup | 10-30 min | 🔄 Falhas | 3 falhas |
| ⚪ **NÃO-CRÍTICO** | Printer | 1 dia | 🕐 Tempo | 24 horas |

---

## 🎨 Visualmente

```
┌─ INFRAESTRUTURA CRÍTICA
│  ├─ Core Switch → ⚡ Instantâneo (5 min check)
│  ├─ Main Router → ⚡ Instantâneo (5 min check)
│  └─ Primary DB → ⚡ Instantâneo (10 min check)
│
├─ SERVIDORES APLICAÇÃO
│  ├─ API Server → 🕐 10-20 min (10 min check)
│  ├─ App Server → 🕐 30 min (10 min check)
│  └─ Cache Server → 🕐 1 hora (10 min check)
│
├─ INFRAESTRUTURA SECUNDÁRIA
│  ├─ Backup Server → 🔄 3 falhas (10 min check)
│  ├─ Secondary Switch → 🔄 2 falhas (30 min check)
│  └─ Dev Server → 🕐 6 horas (30 min check) ou DESATIVAR
│
└─ PERIFÉRICOS
   ├─ Impressora → 🕐 24 horas (1 dia check)
   ├─ Camera IP → 🕐 24 horas (1 dia check)
   └─ IoT Devices → DESATIVAR ou 🕐 24 horas
```

---

## 💡 Dicas Práticas

### Dúvida 1: "Qual intervalo escolho?"
```
Regra de ouro:
├─ Crítico = Check FREQUENTE (5-10 min)
│  └─ Por quê? Detecta problema rápido
│
├─ Importante = Check MODERADO (10-30 min)
│  └─ Por quê? Equilíbrio tráfego vs rapidez
│
└─ Secundário/IoT = Check RARO (1 hora - 1 dia)
   └─ Por quê? Economiza tráfego, não é urgente
```

### Dúvida 2: "Qual threshold modo escolho?"
```
Regra de ouro:
├─ ⚡ INSTANTÂNEO se:
│  ├─ É crítico demais
│  ├─ Rede é estável (poucos glitches)
│  └─ Uma queda = SLA quebrado
│
├─ 🕐 TEMPO se:
│  ├─ Quer evitar alarmes rápidos
│  ├─ É importante mas não urgente
│  └─ Sabe o máximo de tempo aceitável
│
└─ 🔄 FALHAS se:
   ├─ Quer evitar FALSOS POSITIVOS
   ├─ Rede é instável (muitos glitches)
   └─ Importância: média
```

### Dúvida 3: "Preciso monitorar esse device?"
```
Pergunte:
├─ Se cair offline, alguém reclama? 
│  ├─ SIM → Tem que monitorar
│  └─ NÃO → Pode desativar
│
├─ Quanto tempo pode ficar offline?
│  ├─ Segundos → ⚡ Instantâneo
│  ├─ Horas → 🕐 Tempo
│  └─ Dias → 🔄 Falhas ou Desativar
│
└─ Qual é o impacto se cair?
   ├─ Negócio para → ⚡ Instantâneo
   ├─ Usuários irritados → 🕐 Tempo | 30 min
   └─ Ninguém liga → Desativar
```

---

## 🚀 Exemplo Prático: Minha Rede

### Seu Setup (presumido):
```
├─ 2-3 Core switches
├─ 1 Router principal / VPN gateway
├─ 2-3 Servidores de aplicação
├─ 1 Servidor backup
├─ 5-10 Switches secundários
└─ N × Impressoras/IoT
```

### Configuração Recomendada:
```
CRÍTICO (monitorar agressivamente):
├─ SW-Core-01 → 5 min × ⚡ Instantâneo
├─ SW-Core-02 → 5 min × ⚡ Instantâneo
└─ RT-Gateway-01 → 5 min × ⚡ Instantâneo

IMPORTANTE (monitorar moderadamente):
├─ SRV-App-01 → 10 min × 🕐 10 min
├─ SRV-App-02 → 10 min × 🕐 10 min
└─ SRV-Database → 10 min × 🕐 30 min

SECUNDÁRIO (monitorar ocasionalmente):
├─ SRV-Backup → 30 min × 🔄 3 falhas
├─ SW-Sec-01 → 30 min × 🔄 2 falhas
├─ SW-Sec-02 → 30 min × 🔄 2 falhas
└─ SW-Sec-03 → 30 min × 🔄 2 falhas

NÃO-CRÍTICO (monitorar raramente - OPCIONAL):
├─ Printer-01 → 1 dia × 🕐 24h (OPCIONAL)
├─ Camera-01 → 1 dia × 🕐 24h (OPCIONAL)
└─ IoT-Sensor → DESATIVAR

Tráfego Estimado: ~8-10 MB/dia (vs 259 KB v1 sem otimização)
```

---

## 📝 Checklist: Montando Sua Config

Para cada device, responda:

```
Device: ________________________

1. É crítico?
   ☐ Sim, não pode ficar offline = ⚡ Instantâneo
   ☐ Não tão crítico = 🕐 Tempo ou 🔄 Falhas
   ☐ Não é crítico = Desativar

2. Qual intervalo?
   ☐ 5 min (crítico)
   ☐ 10 min (importante)
   ☐ 30 min (secundário)
   ☐ 1 hora (baixa prioridade)
   ☐ 1 dia (muito baixa)

3. Qual threshold?
   ☐ ⚡ Instantâneo (crítico demais)
   ☐ 🕐 ______ tempo (importante)
   ☐ 🔄 ______ falhas (secundário)

4. Notas:
   ________________________________
```

---

## 🎯 Próximo Passo: Implementação

Após decidir, você vai:

1. ✅ Abrir formulário de dispositivo
2. ✅ Marcar "Monitorar este dispositivo"
3. ✅ Selecionar intervalo (preset ou custom)
4. ✅ Selecionar threshold mode
5. ✅ Preencher threshold value
6. ✅ Salvar

E pronto! System começa a monitorar automaticamente 🚀

---

**Quer fazer isso agora? Me passa a lista de devices e seus modos recomendados!** 📋
