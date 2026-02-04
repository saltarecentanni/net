# 📘 Guia de Uso - External/ISP e Wall Jack v3.5.051

## 🌐 External/ISP - Conexões de Internet

### O que é?
External/ISP representa conexões que saem da sua rede local para destinos externos:
- Internet
- ISPs (TIM, Vodafone, Eolo, Fastweb)
- Links WAN
- VPN endpoints

### Como funciona?
External/ISP é um **dispositivo virtual** criado automaticamente na topologia. Diferente de devices reais, ele:
- ✅ Não precisa ser cadastrado em "Devices"
- ✅ Aparece como caixa amarela com ícone 🌐
- ✅ Pode ter múltiplas conexões
- ❌ NÃO pode conectar a outro device (é sempre ponto final)

### Cadastrar Conexão External/ISP

**Passo 1:** Clique em "➕ Add Connection"

**Passo 2:** Preencha:
- **From Device:** Router, Modem ou Firewall
- **From Port:** WAN01, eth0, etc
- **To Device:** Selecione **"External/ISP"**
- **🌐 External Destination:** Digite o nome do destino
  - Exemplos: "Internet/ISP", "TIM Fiber", "Vodafone 4G"
- **Type:** wan
- **Cable Marker:** (opcional) identificador do cabo

**Passo 3:** Salvar

### Resultado na Topologia

```
┌─────────────┐         ┌──────────────────┐
│   Router    │────────▶│  Internet/ISP   │
│  (Device)   │   WAN   │    (Virtual)    │
└─────────────┘         └──────────────────┘
```

**Aparência:**
- Caixa amarela retangular
- Ícone 🌐 (globo/nuvem)
- Texto: nome do destino
- Cor: Azul claro (#e0f2fe)

### Múltiplas Conexões

Você pode ter várias conexões para o mesmo destino:

```
Router A ─────┐
              ├──▶ Internet/ISP
Router B ─────┘
```

Ou múltiplos destinos diferentes:

```
Router A ─────▶ TIM Fiber
Router B ─────▶ Vodafone 4G
Router C ─────▶ VPN Office
```

---

## 🔳 Wall Jack - Tomadas de Parede

### O que é?
Wall Jack representa presas de rede (RJ45) instaladas nas paredes das salas. Exemplo: Z1, Z2, Z3... Z15.

### Como funciona?
Wall Jack tem **2 modos** de operação:

#### **Modo 1: Ponto Final** (mais comum)
Device conecta direto na tomada, sem especificar o que vem depois.

```
┌─────────────┐         ┌──────────┐
│  Impressora │────────▶│   Z5     │
│  (Device)   │   eth0  │  (Virtual)│
└─────────────┘         └──────────┘
```

**Quando usar:**
- Dispositivo final conecta na tomada
- Não precisa mapear toda a infraestrutura
- Útil para simplificar a topologia

#### **Modo 2: Passthrough** (intermediário)
Device → Wall Jack → Outro Device

```
┌──────────┐         ┌────────────────┐         ┌──────────┐
│  Switch  │────────▶│ Wall Jack Z14  │────────▶│  Router  │
│ (Sala 10)│   eth0  │  (Metadado)    │   eth1  │ (Sala 14)│
└──────────┘         └────────────────┘         └──────────┘
```

**Quando usar:**
- Cabo passa pela parede entre salas
- Quer documentar o wall jack usado
- Topologia mostra conexão completa

### Cadastrar Wall Jack - Ponto Final

**Passo 1:** Clique em "➕ Add Connection"

**Passo 2:** Preencha:
- **From Device:** Impressora, PC, etc
- **From Port:** eth0, eth1, etc
- **To Device:** Selecione **"Wall Jack"**
- **🔌 Wall Jack:** Digite o identificador
  - Exemplos: "Z1", "Z5 - Sala Server", "Z14 - Recepção"
- **Type:** wallport
- **🏠 Room:** (opcional, se usar FloorPlan)

**Passo 3:** Salvar

### Cadastrar Wall Jack - Passthrough

**Passo 1:** Clique em "➕ Add Connection"

**Passo 2:** Preencha:
- **From Device:** Switch (sala origem)
- **From Port:** eth0
- **To Device:** Selecione **Router** (sala destino)
- **To Port:** eth1
- **Type:** Selecione **"Wall Jack"** no dropdown
- **🔌 Wall Jack:** Digite "Z14"

**Passo 3:** Salvar

**Resultado:**
- Topologia mostra: Switch ──→ Router
- Campo `externalDest` guarda "Z14" (metadado)
- Não cria caixa visual Z14
- Label na linha pode mostrar "Z14" se configurado

### Alternativa: Patch Panel

Para mostrar o wall jack visualmente na topologia:

**Conexão 1:**
- From: Switch eth0
- To: Patch Panel porta 5 (RETRO)
- Notes: "via Z14"

**Conexão 2:**
- From: Patch Panel porta 5 (FRONTE)
- To: Router eth1

**Resultado:**
```
Switch ──→ Patch Panel ──→ Router
           (porta 5: 2/2)
```

---

## 🎨 Diferenças Visuais

| Tipo | Ícone | Cor Caixa | Uso |
|------|-------|-----------|-----|
| **Wall Jack** | 🔳 | Cinza (#ecf0f1) | Presas RJ45 na parede |
| **External/ISP** | 🌐 | Azul claro (#e0f2fe) | Internet, ISPs, WAN |
| **Device Real** | Varia | Varia | Switches, Routers, etc |

---

## ❓ FAQ

### P: Posso ter Z1, Z2... Z100?
**R:** Sim! Quantos quiser. Cada nome diferente cria uma caixa virtual separada.

### P: Múltiplas conexões para o mesmo Wall Jack?
**R:** Sim! Vários devices podem conectar em Z1 ao mesmo tempo.

### P: Wall Jack pode conectar a outro device?
**R:** Sim! Use o modo "Passthrough" descrito acima.

### P: Qual a diferença entre External/ISP e Wall Jack?
**R:**
- **External/ISP:** Destinos fora da rede (Internet, ISP)
- **Wall Jack:** Presas físicas dentro do prédio

### P: Campo "🏠 Room" serve para quê?
**R:** Associa o wall jack a uma sala no FloorPlan. Opcional e pode não estar funcionando na versão atual.

### P: Posso renomear destinos depois?
**R:** Sim, mas afeta TODAS as conexões que usam esse nome. Se renomear "Z1" para "Z1-New", todas as 5 conexões para "Z1" serão atualizadas.

### P: Como deletar um External/ISP virtual?
**R:** Delete todas as conexões que apontam para ele. A caixa virtual desaparece automaticamente.

---

## 🔧 Troubleshooting

### External não aparece na topologia?
**Verificar:**
1. ✅ Campo "To Device" = "External/ISP"
2. ✅ Campo "External Destination" preenchido
3. ✅ Device "From" tem posição no rack/location
4. ✅ Conexão não tem campo "to" preenchido

### Wall Jack não aparece?
**Verificar:**
1. ✅ Campo "To Device" = "Wall Jack"
2. ✅ Campo "Wall Jack" preenchido
3. ✅ isWallJack = true nos dados
4. ✅ Conexão não tem campo "to" (se quiser caixa virtual)

### Ícone 🌐 não aparece?
**Verificar:**
1. ✅ Versão v3.5.051 ou superior
2. ✅ Cache do navegador limpo (Ctrl+F5)
3. ✅ Console do navegador sem erros JavaScript

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Consulte o CHANGELOG_v3.5.051.md
2. Execute `node run-30-tests.js` para verificar integridade
3. Verifique console do navegador (F12)
4. Restaure backup se necessário

**Versão:** v3.5.051  
**Última Atualização:** 04/02/2026
