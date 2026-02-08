#!/bin/bash
# ============================================================================
# TIESSE Matrix Network - Ubuntu Server Diagnostic Script
# Run this on your Ubuntu server and share the output
# ============================================================================

echo "=============================================="
echo "TIESSE Matrix Network - Server Diagnostic"
echo "Date: $(date)"
echo "=============================================="
echo ""

# 1. System Info
echo "=== 1. SYSTEM INFO ==="
echo "Hostname: $(hostname)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

# 2. User Info
echo "=== 2. USER INFO ==="
echo "Current User: $(whoami)"
echo "User Groups: $(groups)"
echo "Home Dir: $HOME"
echo "Sudo Access: $(sudo -n true 2>/dev/null && echo 'YES' || echo 'NO (may need password)')"
echo ""

# 3. Network Info
echo "=== 3. NETWORK INFO ==="
echo "IP Addresses:"
ip -4 addr show | grep inet | awk '{print "  " $2 " on " $NF}'
echo ""
echo "Default Gateway: $(ip route | grep default | awk '{print $3}')"
echo ""

# 4. Disk Space
echo "=== 4. DISK SPACE ==="
df -h / /var /home 2>/dev/null | head -10
echo ""

# 5. Web Server Check
echo "=== 5. WEB SERVER CHECK ==="
echo "Apache2 installed: $(which apache2 >/dev/null 2>&1 && echo 'YES' || echo 'NO')"
echo "Apache2 running: $(systemctl is-active apache2 2>/dev/null || echo 'not running')"
echo "Nginx installed: $(which nginx >/dev/null 2>&1 && echo 'YES' || echo 'NO')"
echo "Nginx running: $(systemctl is-active nginx 2>/dev/null || echo 'not running')"
echo ""

# 6. PHP Check
echo "=== 6. PHP CHECK ==="
if which php >/dev/null 2>&1; then
    echo "PHP installed: YES"
    echo "PHP version: $(php -v | head -1)"
    echo "PHP modules:"
    php -m 2>/dev/null | grep -E "^(json|curl|mbstring|openssl|session|fileinfo)$" | while read m; do echo "  ✓ $m"; done
else
    echo "PHP installed: NO"
fi
echo ""

# 7. Node.js Check
echo "=== 7. NODE.JS CHECK ==="
if which node >/dev/null 2>&1; then
    echo "Node.js installed: YES"
    echo "Node version: $(node -v)"
    echo "NPM version: $(npm -v 2>/dev/null || echo 'not found')"
else
    echo "Node.js installed: NO"
fi
echo ""

# 8. Ports in use
echo "=== 8. PORTS IN USE ==="
echo "Common web ports:"
ss -tlnp 2>/dev/null | grep -E ":(80|443|3000|8080|8443) " || echo "  No common web ports in use"
echo ""

# 9. Firewall Status
echo "=== 9. FIREWALL STATUS ==="
if which ufw >/dev/null 2>&1; then
    echo "UFW status: $(sudo ufw status 2>/dev/null | head -1 || echo 'unknown')"
fi
if which firewall-cmd >/dev/null 2>&1; then
    echo "Firewalld: $(systemctl is-active firewalld 2>/dev/null)"
fi
echo ""

# 10. Suggested install directory
echo "=== 10. SUGGESTED DIRECTORIES ==="
echo "Web root candidates:"
for dir in /var/www/html /var/www /srv/www /home/$(whoami)/www; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir (exists, writable: $(test -w "$dir" && echo 'yes' || echo 'no'))"
    else
        echo "  - $dir (does not exist)"
    fi
done
echo ""

# 11. Git Check
echo "=== 11. GIT CHECK ==="
if which git >/dev/null 2>&1; then
    echo "Git installed: YES ($(git --version))"
else
    echo "Git installed: NO"
fi
echo ""

# 12. Summary
echo "=============================================="
echo "SUMMARY - What we need to decide:"
echo "=============================================="
echo "1. Deploy method: PHP (Apache/Nginx) or Node.js?"
echo "2. Install directory: /var/www/html/matrix or other?"
echo "3. Domain/subdomain or IP access only?"
echo "4. HTTPS needed? (Let's Encrypt available)"
echo "5. Authentication: keep current or integrate with LDAP/AD?"
echo ""
echo "Copy this entire output and share it!"
echo "=============================================="
