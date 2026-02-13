#!/bin/bash
#
# TIESSE Matrix Network - Guacamole Installation Script
# Version: 3.6.003-fixed
# Date: February 6, 2026
#
# This script installs Apache Guacamole using Docker
# Access: http://<SERVER_IP>:8080/guacamole
#
# CREDENTIALS:
#   Guacamole Web Login: tiesse / tiesseadm
#   Database: tiesse / tiesseadm
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TIESSE Matrix Network - Guacamole Installer            ║"
echo "║                  Version 3.6.003-fixed                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION - All credentials use tiesse/tiesseadm
# ═══════════════════════════════════════════════════════════════════
GUACAMOLE_DIR="$HOME/guacamole"
DB_NAME="guacamole_db"
DB_USER="tiesse"
DB_PASS="tiesseadm"

echo -e "${YELLOW}[1/8] Checking system requirements...${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please do not run as root. Run as regular user with sudo privileges.${NC}"
    exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}This script is designed for Ubuntu. Detected different OS.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ System check passed${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/8] Configuring firewall...${NC}"

# Open port 8080 for Guacamole
if command -v ufw &> /dev/null; then
    sudo ufw allow 8080/tcp > /dev/null 2>&1 || true
    echo -e "${GREEN}✓ Firewall: Port 8080 opened${NC}"
else
    echo -e "${YELLOW}⚠ UFW not found - manually open port 8080 if needed${NC}"
fi

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/8] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker already installed${NC}"
else
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}✓ Docker installed${NC}"
fi

# Add user to docker group (will need logout/login to take effect)
if ! groups | grep -q docker; then
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}⚠ User added to docker group - using sudo for this session${NC}"
fi

# Ensure docker is running
sudo systemctl start docker 2>/dev/null || true

echo -e "${GREEN}✓ Docker ready${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/8] Creating Guacamole directory...${NC}"

# Clean previous installation if exists
if [ -d "$GUACAMOLE_DIR" ]; then
    echo -e "${YELLOW}Removing previous installation...${NC}"
    cd "$GUACAMOLE_DIR"
    sudo docker-compose down -v 2>/dev/null || true
    cd ~
    sudo rm -rf "$GUACAMOLE_DIR"
fi

mkdir -p "$GUACAMOLE_DIR"
cd "$GUACAMOLE_DIR"

echo -e "${GREEN}✓ Directory created: $GUACAMOLE_DIR${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[5/8] Creating docker-compose.yml...${NC}"

cat > docker-compose.yml << EOF
version: '3.8'

networks:
  guacamole-net:
    driver: bridge

services:
  # Guacamole daemon (guacd)
  guacd:
    image: guacamole/guacd:latest
    container_name: guacd
    restart: always
    networks:
      - guacamole-net
    volumes:
      - ./drive:/drive:rw
      - ./record:/record:rw

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    container_name: guacamole-db
    restart: always
    networks:
      - guacamole-net
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
      - ./initdb:/docker-entrypoint-initdb.d:ro

  # Guacamole web application
  guacamole:
    image: guacamole/guacamole:latest
    container_name: guacamole
    restart: always
    networks:
      - guacamole-net
    depends_on:
      - guacd
      - postgres
    environment:
      GUACD_HOSTNAME: guacd
      GUACD_PORT: 4822
      POSTGRES_HOSTNAME: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DATABASE: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    ports:
      - "8080:8080"
    volumes:
      - ./guacamole-home:/etc/guacamole:rw
EOF

echo -e "${GREEN}✓ docker-compose.yml created${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[6/8] Generating database initialization script...${NC}"

mkdir -p initdb
mkdir -p drive
mkdir -p record
mkdir -p guacamole-home

# Generate the PostgreSQL initialization script
# IMPORTANT: Use --postgresql (NOT --postgres)
sudo docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > initdb/01-schema.sql

# Verify schema was generated correctly
if ! head -5 initdb/01-schema.sql | grep -q "Apache"; then
    echo -e "${RED}✗ Error generating database schema${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database schema generated${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[7/8] Creating Guacamole configuration...${NC}"

# Create guacamole.properties
# IMPORTANT: Use = (equals sign) NOT : (colon)
cat > guacamole-home/guacamole.properties << EOF
# Guacamole server configuration
guacd-hostname=guacd
guacd-port=4822

# PostgreSQL authentication
postgresql-hostname=postgres
postgresql-port=5432
postgresql-database=${DB_NAME}
postgresql-username=${DB_USER}
postgresql-password=${DB_PASS}

# API settings
api-session-timeout=60
EOF

echo -e "${GREEN}✓ Configuration created${NC}"

# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[8/8] Starting Guacamole containers...${NC}"

# Always use sudo for reliability
sudo docker-compose up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize (90 seconds)...${NC}"
echo -e "${YELLOW}This is necessary for the database to be fully configured.${NC}"
sleep 90

# Check if containers are running
if sudo docker ps | grep -q guacamole; then
    echo -e "${GREEN}✓ Guacamole containers started successfully${NC}"
else
    echo -e "${RED}✗ Error starting containers. Check logs with: sudo docker-compose logs${NC}"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════
# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Save credentials and configuration info
cat > credentials.txt << EOF
╔════════════════════════════════════════════════════════════════════╗
║              GUACAMOLE INSTALLATION COMPLETE                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ACCESS URL: http://${SERVER_IP}:8080/guacamole                    ║
║                                                                    ║
║  LOGIN CREDENTIALS:                                                ║
║    Username: guacadmin                                             ║
║    Password: guacadmin                                             ║
║                                                                    ║
║  ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!                        ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  HOW TO CHANGE WEB LOGIN PASSWORD:                                 ║
║                                                                    ║
║  1. Login with guacadmin/guacadmin                                 ║
║  2. Click your username (top-right corner)                         ║
║  3. Select "Settings"                                              ║
║  4. Go to "Preferences" tab                                        ║
║  5. In "Change Password" section, enter new password               ║
║  6. Click "Update Password"                                        ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  PASSWORD FILES LOCATION:                                          ║
║                                                                    ║
║  FILE 1: ~/guacamole/docker-compose.yml                            ║
║    Contains database password in these lines:                      ║
║      POSTGRES_PASSWORD: tiesseadm                                  ║
║    (appears 2 times in the file)                                   ║
║                                                                    ║
║  FILE 2: ~/guacamole/guacamole-home/guacamole.properties           ║
║    Contains database connection password:                          ║
║      postgresql-password=tiesseadm                                 ║
║                                                                    ║
║  ⚠️  If you change database password, you must update BOTH files   ║
║     with the SAME password, then restart:                          ║
║       cd ~/guacamole && sudo docker-compose restart                ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  DATABASE CREDENTIALS (for Matrix integration):                    ║
║    Host: localhost                                                 ║
║    Port: 5432                                                      ║
║    Database: ${DB_NAME}                                            ║
║    Username: ${DB_USER}                                            ║
║    Password: ${DB_PASS}                                            ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  USEFUL COMMANDS:                                                  ║
║    Start:   cd ~/guacamole && sudo docker-compose up -d            ║
║    Stop:    cd ~/guacamole && sudo docker-compose down             ║
║    Restart: cd ~/guacamole && sudo docker-compose restart          ║
║    Logs:    cd ~/guacamole && sudo docker-compose logs -f          ║
║    Status:  sudo docker ps                                         ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  COMPLETE RESET (if problems occur):                               ║
║    cd ~/guacamole                                                  ║
║    sudo docker-compose down -v                                     ║
║    sudo rm -rf postgres-data                                       ║
║    sudo docker-compose up -d                                       ║
║    # Wait 90 seconds, then login with guacadmin/guacadmin          ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  Installation Directory: ${GUACAMOLE_DIR}                          ║
║  Date: $(date)                                                     ║
╚════════════════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${GREEN}"
cat credentials.txt
echo -e "${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Access: ${YELLOW}http://${SERVER_IP}:8080/guacamole${NC}"
echo -e "Login:  ${YELLOW}guacadmin / guacadmin${NC}"
echo ""
echo -e "${RED}⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY!${NC}"
