#!/bin/bash

# ============================================================
# TIESSE MATRIX + LIBRENMS - SCRIPT DE DIAGNÓSTICO
# Execute no seu servidor Ubuntu e cole o resultado
# ============================================================

echo "🔍 Iniciando diagnóstico do sistema..."
echo ""
echo "============================================================"
echo "TIESSE MATRIX - DIAGNOSTIC REPORT"
echo "Data: $(date)"
echo "============================================================"
echo ""

# ==================== SISTEMA ====================
echo "📋 SISTEMA OPERACIONAL"
echo "─────────────────────────────────"
uname -a
echo "Distro: $(lsb_release -d 2>/dev/null | cut -f2)"
echo "Kernel: $(uname -r)"
echo ""

# ==================== RECURSOS ====================
echo "💻 RECURSOS"
echo "─────────────────────────────────"
echo "CPU: $(nproc) cores"
echo "RAM Total: $(free -h | grep Mem | awk '{print $2}')"
echo "RAM Livre: $(free -h | grep Mem | awk '{print $7}')"
echo "Disco: $(df -h / | tail -1 | awk '{print $2, "total,", $4, "livre"}')"
echo ""

# ==================== DOCKER ====================
echo "🐳 DOCKER"
echo "─────────────────────────────────"
if command -v docker &> /dev/null; then
    echo "Docker versão: $(docker --version)"
    echo "Docker rodando: $(systemctl is-active docker)"
    echo ""
    echo "Containers rodando:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -20
    echo ""
    echo "Volumes Docker:"
    docker volume ls 2>/dev/null | tail -10
else
    echo "❌ Docker NÃO INSTALADO"
fi
echo ""

# ==================== NODE.JS ====================
echo "⚙️  NODE.JS / APLICAÇÃO"
echo "─────────────────────────────────"
if command -v node &> /dev/null; then
    echo "Node.js: $(node --version)"
    echo "NPM: $(npm --version)"
else
    echo "❌ Node.js NÃO ENCONTRADO"
fi
echo ""

# ==================== PORTAS ABERTAS ====================
echo "🔌 PORTAS ABERTAS"
echo "─────────────────────────────────"
echo "HTTP (80): $(netstat -tlnp 2>/dev/null | grep ':80 ' | wc -l) processos"
netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000|8000|8080|22)' | awk '{print $4, "-", $7}'
echo ""

# ==================== REDE ====================
echo "🌐 REDE"
echo "─────────────────────────────────"
echo "Gateway padrão: $(ip route | grep default | awk '{print $3}')"
echo "IP Local: $(hostname -I | awk '{print $1}')"
echo ""
echo "Interfaces de rede:"
ip addr show | grep -E '(inet |link/ether)' | head -20
echo ""

# ==================== SNMP ====================
echo "📡 SNMP"
echo "─────────────────────────────────"
if command -v snmpget &> /dev/null; then
    echo "SNMP Tools instalados: SIM"
    echo "Versão: $(snmpget --version 2>&1 | head -1)"
else
    echo "SNMP Tools instalados: NÃO"
    echo "  Para instalar: sudo apt-get install snmp snmp-mibs-downloader"
fi
echo ""

# ==================== ARQUIVO DE TIESSE ====================
echo "📁 TIESSE MATRIX - ARQUIVOS"
echo "─────────────────────────────────"
echo "Data do sistema:"
ls -lh /workspaces/net/matrix/ 2>/dev/null | head -5
echo ""
echo "Versão (network_manager.json):"
grep -o '"version": "[^"]*"' /workspaces/net/matrix/data/network_manager.json 2>/dev/null || echo "Não encontrado"
echo ""
echo "Dispositivos no sistema:"
if [ -f "/workspaces/net/matrix/data/network_manager.json" ]; then
    grep -o '"id":' /workspaces/net/matrix/data/network_manager.json | wc -l
    grep -o '"type":' /workspaces/net/matrix/data/network_manager.json | wc -l
else
    echo "❌ network_manager.json não encontrado"
fi
echo ""

# ==================== APACHE / GUACAMOLE ====================
echo "🖥️  APACHE / GUACAMOLE"
echo "─────────────────────────────────"
if command -v apache2ctl &> /dev/null; then
    echo "Apache: $(apache2ctl -v | grep 'Apache' | head -1)"
    echo "Status: $(systemctl is-active apache2)"
    echo "Módulos habilitados: $(apache2ctl -M 2>&1 | wc -l)"
else
    echo "❌ Apache NÃO ENCONTRADO (pode estar em Docker)"
fi
echo ""

if command -v guacd &> /dev/null; then
    echo "Guacamole Server: $(guacd -v)"
else
    echo "Guacamole em Docker: $(docker ps 2>/dev/null | grep -i guac | wc -l) container(s)"
fi
echo ""

# ==================== LIBRENMS (se existir) ====================
echo "📊 LIBRENMS"
echo "─────────────────────────────────"
curl -s http://localhost:8000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "LibreNMS na porta 8000: ✅ RESPONDENDO"
    curl -s http://localhost:8000/api/v0/system 2>/dev/null | head -c 200
else
    echo "LibreNMS na porta 8000: ❌ NÃO RESPONDENDO"
fi
echo ""

# ==================== SWITCHES NA REDE ====================
echo "🔍 SWITCHES / DISPOSITIVOS"
echo "─────────────────────────────────"
echo "Executando ARP scan (próximos 30 segundos)..."
echo "Dispositivos conhecidos:"
arp -a 2>/dev/null | head -20 || echo "Nenhum ARP cache disponível"
echo ""

# ==================== CONFIGURAÇÕES ====================
echo "⚙️  CONFIGURAÇÕES"
echo "─────────────────────────────────"
echo "Arquivo de hosts:"
cat /etc/hosts | grep -v '^$' | grep -v '^#' | head -10
echo ""

echo "Resolução DNS:"
cat /etc/resolv.conf | grep -v '^$' | grep -v '^#' | head -5
echo ""

# ==================== LOGS RECENTES ====================
echo "📝 LOGS RECENTES"
echo "─────────────────────────────────"
echo "Últimas 5 linhas de syslog:"
tail -5 /var/log/syslog 2>/dev/null || echo "Sem permissão"
echo ""

echo "Últimas 5 linhas de dmesg:"
dmesg | tail -5
echo ""

# ==================== VERIFICAÇÃO FINAL ====================
echo "✅ VERIFICAÇÃO FINAL"
echo "─────────────────────────────────"
echo "Sistema atualizado?"
if [ $(find /etc/apt/sources.list.d -mtime -1 2>/dev/null | wc -l) -gt 0 ]; then
    echo "Últimas atualizações: RECENTES"
else
    echo "Últimas atualizações: ANTIGAS (considere apt update)"
fi
echo ""

echo "============================================================"
echo "FIM DO RELATÓRIO"
echo "Data: $(date)"
echo "============================================================"
