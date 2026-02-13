#!/bin/bash

# Fix UFW Firewall Rules for LibreNMS + SNMP
# Executa no servidor de produção (com sudo)

echo "🔧 Configurando firewall UFW..."

# SNMP - Porta 161 (UDP)
echo "  → Abrindo SNMP (161/udp)..."
sudo ufw allow from 10.10.0.0/16 to any port 161/udp

# SNMP Trap - Porta 162 (UDP)  
echo "  → Abrindo SNMP Trap (162/udp)..."
sudo ufw allow from 10.10.0.0/16 to any port 162/udp

# LibreNMS Web - Porta 8000 (TCP)
echo "  → Abrindo LibreNMS Web (8000/tcp)..."
sudo ufw allow 8000/tcp

# Apache/Matrix - Porta 80 (TCP)
echo "  → Confirmando Apache (80/tcp)..."
sudo ufw allow 80/tcp

# HTTPS - Porta 443 (TCP)
echo "  → Confirmando HTTPS (443/tcp)..."
sudo ufw allow 443/tcp

# Mostrar regras
echo ""
echo "✅ Regras de firewall configuradas!"
echo ""
echo "📋 Regras ativas:"
sudo ufw status | grep -E "161|162|8000|80|443"
