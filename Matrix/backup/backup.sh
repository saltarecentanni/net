#!/bin/bash
# ============================================================
# TIESSE Matrix Network - Automated Backup Script v3.4.3
# ============================================================
# 
# This script creates automated backups of matrix-network-data.json
# 
# Retention Policy:
# - Weekly backups: 4 (one per week, last 4 weeks)
# - Monthly backups: 12 (one per month, last 12 months)
#
# Directory Structure:
# /var/www/html/matrix/backup/
# ├── weekly/
# │   ├── backup_week_01.json
# │   ├── backup_week_02.json
# │   ├── backup_week_03.json
# │   └── backup_week_04.json
# └── monthly/
#     ├── backup_2025_01.json
#     ├── backup_2025_02.json
#     └── ... (12 months)
#
# Usage:
# ./backup.sh weekly    - Creates weekly backup
# ./backup.sh monthly   - Creates monthly backup
# ./backup.sh           - Creates both (default)
#
# Crontab examples:
# Weekly (every Sunday at 2:00 AM):
# 0 2 * * 0 /var/www/html/matrix/backup/backup.sh weekly
#
# Monthly (1st day of month at 3:00 AM):
# 0 3 1 * * /var/www/html/matrix/backup/backup.sh monthly
# ============================================================

# Configuration
MATRIX_DIR="/var/www/html/matrix"
BACKUP_DIR="${MATRIX_DIR}/backup"
DATA_FILE="${MATRIX_DIR}/data/matrix-network-data.json"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Retention settings
MAX_WEEKLY=4
MAX_MONTHLY=12

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories if they don't exist
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} - ${message}" >> "${LOG_FILE}"
    echo -e "${message}"
}

# Check if source file exists
check_source() {
    if [ ! -f "${DATA_FILE}" ]; then
        log "${RED}❌ ERROR: Source file not found: ${DATA_FILE}${NC}"
        exit 1
    fi
}

# Get current week number (1-4, cycling)
get_week_number() {
    local week_of_month=$((($(date +%-d) - 1) / 7 + 1))
    if [ $week_of_month -gt 4 ]; then
        week_of_month=4
    fi
    echo $week_of_month
}

# Weekly backup function
backup_weekly() {
    log "${BLUE}📅 Starting weekly backup...${NC}"
    
    local week_num=$(get_week_number)
    local week_str=$(printf "%02d" $week_num)
    local backup_file="${BACKUP_DIR}/weekly/backup_week_${week_str}.json"
    local timestamp=$(date '+%Y-%m-%d_%H%M%S')
    
    # Copy the file
    if cp "${DATA_FILE}" "${backup_file}"; then
        local size=$(du -h "${backup_file}" | cut -f1)
        log "${GREEN}✅ Weekly backup created: backup_week_${week_str}.json (${size})${NC}"
        
        # Update metadata
        echo "{\"type\":\"weekly\",\"week\":${week_num},\"created\":\"${timestamp}\",\"size\":\"${size}\"}" > "${backup_file}.meta"
        
        return 0
    else
        log "${RED}❌ Failed to create weekly backup${NC}"
        return 1
    fi
}

# Monthly backup function
backup_monthly() {
    log "${BLUE}📆 Starting monthly backup...${NC}"
    
    local year=$(date '+%Y')
    local month=$(date '+%m')
    local month_name=$(date '+%B')
    local backup_file="${BACKUP_DIR}/monthly/backup_${year}_${month}.json"
    local timestamp=$(date '+%Y-%m-%d_%H%M%S')
    
    # Copy the file
    if cp "${DATA_FILE}" "${backup_file}"; then
        local size=$(du -h "${backup_file}" | cut -f1)
        log "${GREEN}✅ Monthly backup created: backup_${year}_${month}.json - ${month_name} (${size})${NC}"
        
        # Update metadata
        echo "{\"type\":\"monthly\",\"year\":${year},\"month\":${month},\"monthName\":\"${month_name}\",\"created\":\"${timestamp}\",\"size\":\"${size}\"}" > "${backup_file}.meta"
        
        # Clean old monthly backups (keep only last 12)
        cleanup_monthly_backups
        
        return 0
    else
        log "${RED}❌ Failed to create monthly backup${NC}"
        return 1
    fi
}

# Cleanup old monthly backups
cleanup_monthly_backups() {
    local backup_count=$(ls -1 "${BACKUP_DIR}/monthly/"backup_*.json 2>/dev/null | wc -l)
    
    if [ $backup_count -gt $MAX_MONTHLY ]; then
        local files_to_delete=$((backup_count - MAX_MONTHLY))
        log "${YELLOW}🧹 Cleaning up old monthly backups (removing ${files_to_delete} old files)...${NC}"
        
        # Delete oldest files (keep only MAX_MONTHLY most recent)
        ls -1t "${BACKUP_DIR}/monthly/"backup_*.json | tail -n ${files_to_delete} | while read file; do
            rm -f "${file}" "${file}.meta"
            log "${YELLOW}   Deleted: $(basename ${file})${NC}"
        done
    fi
}

# Show backup status
show_status() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}       TIESSE Matrix Network - Backup Status           ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Weekly backups
    echo -e "${GREEN}📅 Weekly Backups (max ${MAX_WEEKLY}):${NC}"
    if ls "${BACKUP_DIR}/weekly/"backup_week_*.json 1> /dev/null 2>&1; then
        for file in "${BACKUP_DIR}/weekly/"backup_week_*.json; do
            if [ -f "${file}.meta" ]; then
                local created=$(cat "${file}.meta" | grep -o '"created":"[^"]*"' | cut -d'"' -f4)
                local size=$(cat "${file}.meta" | grep -o '"size":"[^"]*"' | cut -d'"' -f4)
                echo -e "   ${GREEN}✓${NC} $(basename ${file}) - Created: ${created} (${size})"
            else
                local mod_date=$(stat -c %y "${file}" 2>/dev/null | cut -d'.' -f1)
                local size=$(du -h "${file}" | cut -f1)
                echo -e "   ${GREEN}✓${NC} $(basename ${file}) - Modified: ${mod_date} (${size})"
            fi
        done
    else
        echo -e "   ${YELLOW}No weekly backups found${NC}"
    fi
    
    echo ""
    
    # Monthly backups
    echo -e "${GREEN}📆 Monthly Backups (max ${MAX_MONTHLY}):${NC}"
    if ls "${BACKUP_DIR}/monthly/"backup_*.json 1> /dev/null 2>&1; then
        for file in $(ls -1t "${BACKUP_DIR}/monthly/"backup_*.json); do
            if [ -f "${file}.meta" ]; then
                local month_name=$(cat "${file}.meta" | grep -o '"monthName":"[^"]*"' | cut -d'"' -f4)
                local year=$(cat "${file}.meta" | grep -o '"year":[0-9]*' | cut -d':' -f2)
                local size=$(cat "${file}.meta" | grep -o '"size":"[^"]*"' | cut -d'"' -f4)
                echo -e "   ${GREEN}✓${NC} $(basename ${file}) - ${month_name} ${year} (${size})"
            else
                local mod_date=$(stat -c %y "${file}" 2>/dev/null | cut -d'.' -f1)
                local size=$(du -h "${file}" | cut -f1)
                echo -e "   ${GREEN}✓${NC} $(basename ${file}) - Modified: ${mod_date} (${size})"
            fi
        done
    else
        echo -e "   ${YELLOW}No monthly backups found${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

# Main script
main() {
    local mode="${1:-both}"
    
    log ""
    log "${BLUE}═══════════════════════════════════════════════════════${NC}"
    log "${BLUE}   TIESSE Matrix Network Backup - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    log "${BLUE}═══════════════════════════════════════════════════════${NC}"
    
    # Check source file
    check_source
    
    case "$mode" in
        weekly)
            backup_weekly
            ;;
        monthly)
            backup_monthly
            ;;
        status)
            show_status
            ;;
        both|*)
            backup_weekly
            backup_monthly
            ;;
    esac
    
    log ""
    log "${GREEN}✅ Backup process completed${NC}"
    log ""
}

# Run main function
main "$@"
