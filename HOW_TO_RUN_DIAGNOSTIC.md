# 🔍 Script de Diagnóstico do Sistema

**Objetivo**: Entender melhor seu setup antes de implementar LibreNMS

---

## 📥 Como Usar

### Opção 1: Download e Execute (Recomendado)

```bash
# Baixar script
curl -o diagnostic.sh https://raw.githubusercontent.com/saltarecentanni/net/main/diagnostic-script.sh

# Tornar executável
chmod +x diagnostic.sh

# Executar
./diagnostic.sh > diagnostic-report.txt 2>&1

# Ver resultado
cat diagnostic-report.txt
```

### Opção 2: Cópia Local (Se não tem internet)

```bash
# Copiar todo o conteúdo de diagnostic-script.sh
# Colar em um arquivo novo no servidor:

nano diagnostic.sh

# Colar conteúdo (Ctrl+Shift+V)
# Salvar (Ctrl+X, Y, Enter)

# Executar
chmod +x diagnostic.sh
./diagnostic.sh > report.txt 2>&1
```

### Opção 3: Executar Diretamente (Uma linha só)

```bash
bash < <(curl -s https://raw.githubusercontent.com/saltarecentanni/net/main/diagnostic-script.sh)
```

---

## 📋 O Que o Script Verifica

✅ Sistema operacional e recursos  
✅ Docker e containers rodando  
✅ Node.js e NPM  
✅ Portas abertas (80, 443, 3000, 8000, etc)  
✅ Configuração de rede  
✅ SNMP instalado e configurado  
✅ Apache / Guacamole  
✅ LibreNMS (se já existe)  
✅ Dispositivos na rede (ARP)  
✅ Logs recentes  
✅ Status geral do sistema  

---

## 🚀 Como Me Enviar o Resultado

Após executar, você terá um arquivo `diagnostic-report.txt` ou saída no console.

**Copie Todo o Resultado e Cole Aqui** ↓

Eu vou analisar e:
1. ✅ Verificar compatibilidade com LibreNMS
2. ✅ Identificar o que já existe
3. ✅ Planejar a implementação exata
4. ✅ Avisar se precisa instalar algo antes

---

## 💡 Se Receber Erro

### "Permission denied"
```bash
sudo chmod +x diagnostic.sh
sudo ./diagnostic.sh
```

### "Command not found"
```bash
# Usar bash explicitamente
bash diagnostic.sh
```

### "Can't download"
```bash
# Copiar manualmente o conteúdo do arquivo
# Para dentro de um novo arquivo .sh
```

---

## ⏱️ Tempo de Execução

O script leva **30-60 segundos** para executar (por causa do ARP scan).

---

**Próximo Passo**: Execute o script e cole o resultado aqui! 🚀
