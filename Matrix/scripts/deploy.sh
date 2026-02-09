#!/bin/bash
# =================================================================
# TIESSE Matrix Network - Deploy Script for Ubuntu/Apache
# Version: 3.6.030
# =================================================================
# This script deploys the application to /var/www/html/matrix
# Run with sudo: sudo bash deploy.sh
# =================================================================

set -e

# Get version from package.json
if [ -f "$(dirname "$(readlink -f "$0")")/../Matrix/package.json" ]; then
    VERSION=$(grep -oP '(?<="version": ")[^"]*' "$(dirname "$(readlink -f "$0")")/../Matrix/package.json" | head -1)
else
    VERSION=$(grep -oP '(?<="version": ")[^"]*' "$(dirname "$(readlink -f "$0")")package.json" | head -1)
fi
VERSION=${VERSION:-"3.5.046"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  TIESSE Matrix Network - Deploy${NC}"
echo -e "${GREEN}  Version: ${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}ERROR: Please run as root (sudo bash deploy.sh)${NC}"
    exit 1
fi

# Configuration
DEPLOY_DIR="/var/www/html/matrix"
SOURCE_DIR="$(dirname "$(readlink -f "$0")")"

echo -e "${YELLOW}Source directory: ${SOURCE_DIR}${NC}"
echo -e "${YELLOW}Deploy directory: ${DEPLOY_DIR}${NC}"

# Check if Apache is installed
if ! command -v apache2 &> /dev/null; then
    echo -e "${RED}ERROR: Apache2 is not installed. Install with: sudo apt install apache2${NC}"
    exit 1
fi

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "${RED}ERROR: PHP is not installed. Install with: sudo apt install php php-json${NC}"
    exit 1
fi

# Create deploy directory
echo -e "${YELLOW}Creating deploy directory...${NC}"
mkdir -p "${DEPLOY_DIR}"

# Copy files
echo -e "${YELLOW}Copying files (v${VERSION})...${NC}"
cp -r "${SOURCE_DIR}/index.html" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/data.php" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/package.json" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/js" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/api" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/config" "${DEPLOY_DIR}/"
cp -r "${SOURCE_DIR}/data" "${DEPLOY_DIR}/"

# Copy logo if exists
if [ -f "${SOURCE_DIR}/logoTiesse.png" ]; then
    cp "${SOURCE_DIR}/logoTiesse.png" "${DEPLOY_DIR}/"
fi

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R www-data:www-data "${DEPLOY_DIR}"
chmod -R 755 "${DEPLOY_DIR}"

# Data directory needs write permissions
chmod -R 775 "${DEPLOY_DIR}/data"

# Config directory should be readable by Apache only
chmod 644 "${DEPLOY_DIR}/config/config.php"

# Verify PHP session directory
SESSION_DIR=$(php -i | grep "session.save_path" | head -1 | awk -F' => ' '{print $2}')
if [ -n "$SESSION_DIR" ] && [ -d "$SESSION_DIR" ]; then
    echo -e "${GREEN}PHP session directory exists: ${SESSION_DIR}${NC}"
else
    echo -e "${YELLOW}Creating PHP session directory...${NC}"
    mkdir -p /var/lib/php/sessions
    chown www-data:www-data /var/lib/php/sessions
    chmod 700 /var/lib/php/sessions
fi

# Restart Apache to ensure changes take effect
echo -e "${YELLOW}Restarting Apache...${NC}"
systemctl restart apache2

# Create deployment record
echo -e "${YELLOW}Creating deployment record...${NC}"
echo "Deployed: $(date)" > "${DEPLOY_DIR}/.deployment"
echo "Version: ${VERSION}" >> "${DEPLOY_DIR}/.deployment"
echo "Source: ${SOURCE_DIR}" >> "${DEPLOY_DIR}/.deployment"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete! (v${VERSION})${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Access the application at:"
echo -e "${GREEN}  http://${SERVER_IP}/matrix${NC}"
echo -e "${GREEN}  http://localhost/matrix${NC}"
echo ""
echo -e "Deployed version: ${GREEN}${VERSION}${NC}"
echo ""
echo -e "Credentials for editing:"
echo -e "  Username: ${YELLOW}tiesse${NC}"
echo -e "  Password: ${YELLOW}(configured in config.php)${NC}"
echo ""
echo -e "${GREEN}Files deployed to: ${DEPLOY_DIR}${NC}"
echo ""
