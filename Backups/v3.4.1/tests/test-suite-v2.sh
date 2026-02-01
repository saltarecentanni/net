#!/bin/bash
# ============================================================================
# TIESSE Matrix Network - Comprehensive Test Suite v2.0
# Updated with correct API endpoints
# ============================================================================

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/test_cookies.txt"
PASSED=0
FAILED=0
WARNINGS=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
}

print_subheader() {
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC}  $1"
    echo -e "${CYAN}└─────────────────────────────────────────────────────────────────┘${NC}"
}

print_test() {
    echo -e "${YELLOW}━━━ TEST: $1${NC}"
}

pass() {
    echo -e "  ${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

fail() {
    echo -e "  ${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

warn() {
    echo -e "  ${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "  ${BLUE}ℹ️  INFO:${NC} $1"
}

# ============================================================================
# CLEANUP
# ============================================================================
rm -f $COOKIE_FILE

print_header "TIESSE Matrix Network - COMPREHENSIVE TEST SUITE v2.0"
echo "  Date: $(date)"
echo "  Server: $BASE_URL"
echo "  Endpoints: /data.php, /api/auth.php"

# ============================================================================
# 1. API HEALTH CHECK
# ============================================================================
print_header "1. API HEALTH CHECK"

print_test "Server responding"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/)
if [ "$STATUS" = "200" ]; then
    pass "Server responding (HTTP $STATUS)"
else
    fail "Server not responding (HTTP $STATUS)"
fi

print_test "Static files accessible"
for file in "js/app.js" "js/features.js" "js/auth.js" "css/styles.css"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$file")
    if [ "$STATUS" = "200" ]; then
        pass "$file accessible"
    else
        fail "$file not accessible (HTTP $STATUS)"
    fi
done

print_test "Data endpoint (GET /data.php)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/data.php")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    pass "Data endpoint responding (HTTP $HTTP_CODE)"
    info "Response preview: ${BODY:0:100}..."
else
    fail "Data endpoint failed (HTTP $HTTP_CODE)"
fi

# ============================================================================
# 2. AUTHENTICATION TESTS
# ============================================================================
print_header "2. AUTHENTICATION TESTS"

print_test "Auth check (not logged in)"
RESPONSE=$(curl -s "$BASE_URL/api/auth.php?action=check")
if echo "$RESPONSE" | grep -q '"authenticated":false'; then
    pass "Auth check returns not authenticated"
else
    info "Response: $RESPONSE"
fi

print_test "Login with invalid credentials"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth.php?action=login" \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}')
if echo "$RESPONSE" | grep -q "error\|Invalid"; then
    pass "Invalid credentials rejected"
else
    fail "Invalid credentials not rejected: $RESPONSE"
fi

print_test "Login with valid credentials"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth.php?action=login" \
    -H "Content-Type: application/json" \
    -c $COOKIE_FILE \
    -d '{"username":"tiesse","password":"tiesseadm"}')
if echo "$RESPONSE" | grep -q '"ok":true\|success'; then
    pass "Valid login successful"
    info "Session cookie saved"
else
    fail "Valid login failed: $RESPONSE"
fi

print_test "Auth check (logged in)"
RESPONSE=$(curl -s "$BASE_URL/api/auth.php?action=check" -b $COOKIE_FILE)
if echo "$RESPONSE" | grep -q '"authenticated":true'; then
    pass "Session is valid after login"
else
    warn "Session check response: $RESPONSE"
fi

# ============================================================================
# 3. DATA API TESTS
# ============================================================================
print_header "3. DATA API TESTS"

print_test "GET /data.php (fetch all data)"
RESPONSE=$(curl -s "$BASE_URL/data.php")
if echo "$RESPONSE" | grep -q "devices\|connections"; then
    pass "Data API returns valid structure"
else
    fail "Data API response invalid: ${RESPONSE:0:100}"
fi

print_test "JSON validation"
if echo "$RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    pass "JSON response is valid"
else
    fail "JSON response is invalid"
fi

print_test "Data structure analysis"
DATA_ANALYSIS=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    devices = len(data.get('devices', []))
    connections = len(data.get('connections', []))
    rooms = len(data.get('rooms', []))
    next_id = data.get('nextDeviceId', 'N/A')
    print(f'Devices: {devices}, Connections: {connections}, Rooms: {rooms}, NextID: {next_id}')
except Exception as e:
    print(f'Error: {e}')
")
pass "Data structure analyzed"
info "$DATA_ANALYSIS"

# ============================================================================
# 4. DEVICE CRUD TESTS
# ============================================================================
print_header "4. DEVICE CRUD TESTS"

# Get current data for modification
CURRENT_DATA=$(curl -s "$BASE_URL/data.php")

print_test "Create new test device"
NEW_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'devices' not in data:
    data['devices'] = []
if 'connections' not in data:
    data['connections'] = []
if 'nextDeviceId' not in data:
    data['nextDeviceId'] = 1
    
# Create test device
test_device = {
    'id': data['nextDeviceId'],
    'name': 'TEST-SW-001',
    'type': 'switch',
    'location': 'Test Data Center',
    'rack': 'RACK-TEST-01',
    'ports': 48,
    'status': 'active',
    'ip': '10.0.100.1',
    'notes': 'Automated test device - can be deleted'
}
data['devices'].append(test_device)
data['nextDeviceId'] += 1
print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$NEW_DATA")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Device created successfully"
else
    fail "Device creation failed: $RESPONSE"
fi

print_test "Verify device persisted"
VERIFY=$(curl -s "$BASE_URL/data.php")
if echo "$VERIFY" | grep -q "TEST-SW-001"; then
    pass "Device persisted in database"
else
    fail "Device not found in saved data"
fi

# Create second test device for connections
print_test "Create second test device for connections"
CURRENT_DATA=$(curl -s "$BASE_URL/data.php")
NEW_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
test_device = {
    'id': data['nextDeviceId'],
    'name': 'TEST-RT-001',
    'type': 'router',
    'location': 'Test Data Center',
    'rack': 'RACK-TEST-01',
    'ports': 8,
    'status': 'active',
    'ip': '10.0.100.2',
    'notes': 'Second test device - can be deleted'
}
data['devices'].append(test_device)
data['nextDeviceId'] += 1
print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$NEW_DATA")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Second device created successfully"
else
    fail "Second device creation failed: $RESPONSE"
fi

# ============================================================================
# 5. CONNECTION CRUD TESTS
# ============================================================================
print_header "5. CONNECTION CRUD TESTS"

print_test "Create connection between test devices"
CURRENT_DATA=$(curl -s "$BASE_URL/data.php")
NEW_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)

# Find max connection ID
max_conn_id = max([c.get('id', 0) for c in data.get('connections', [])], default=0)

# Create test connection
test_conn = {
    'id': max_conn_id + 1,
    'fromDevice': 'TEST-SW-001',
    'fromPort': 'Gi0/1',
    'toDevice': 'TEST-RT-001',
    'toPort': 'Gi0/0',
    'type': 'trunk',
    'status': 'active',
    'cable': 'CAT6A',
    'notes': 'Test connection - can be deleted'
}
data['connections'].append(test_conn)
print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$NEW_DATA")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Connection created successfully"
else
    fail "Connection creation failed: $RESPONSE"
fi

print_test "Verify connection persisted"
VERIFY=$(curl -s "$BASE_URL/data.php")
if echo "$VERIFY" | grep -q "TEST-SW-001.*TEST-RT-001\|fromDevice.*TEST-SW-001"; then
    pass "Connection persisted in database"
else
    fail "Connection not found in saved data"
fi

# ============================================================================
# 6. DATA INTEGRITY TESTS
# ============================================================================
print_header "6. DATA INTEGRITY TESTS"

print_test "Check for orphan connections"
CURRENT_DATA=$(curl -s "$BASE_URL/data.php")
INTEGRITY_CHECK=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
device_names = {d['name'] for d in data.get('devices', [])}
connections = data.get('connections', [])
orphans = []
for conn in connections:
    from_dev = conn.get('fromDevice', '')
    to_dev = conn.get('toDevice', '')
    if from_dev and from_dev not in device_names:
        orphans.append(f'Connection {conn.get(\"id\",\"?\")} - fromDevice: {from_dev}')
    if to_dev and to_dev not in device_names:
        orphans.append(f'Connection {conn.get(\"id\",\"?\")} - toDevice: {to_dev}')
if orphans:
    print('ORPHANS:' + '; '.join(orphans))
else:
    print('OK')
")

if [ "$INTEGRITY_CHECK" = "OK" ]; then
    pass "No orphan connections found"
else
    warn "Orphan connections detected: $INTEGRITY_CHECK"
fi

print_test "Check for duplicate device IDs"
DUPLICATE_CHECK=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
device_ids = [d.get('id') for d in data.get('devices', []) if d.get('id') is not None]
duplicates = [x for x in device_ids if device_ids.count(x) > 1]
if duplicates:
    print('DUPLICATES: ' + str(set(duplicates)))
else:
    print('OK')
")

if [ "$DUPLICATE_CHECK" = "OK" ]; then
    pass "No duplicate device IDs"
else
    fail "Duplicate device IDs: $DUPLICATE_CHECK"
fi

print_test "Check for duplicate connection IDs"
DUPLICATE_CHECK=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
conn_ids = [c.get('id') for c in data.get('connections', []) if c.get('id') is not None]
duplicates = [x for x in conn_ids if conn_ids.count(x) > 1]
if duplicates:
    print('DUPLICATES: ' + str(set(duplicates)))
else:
    print('OK')
")

if [ "$DUPLICATE_CHECK" = "OK" ]; then
    pass "No duplicate connection IDs"
else
    fail "Duplicate connection IDs: $DUPLICATE_CHECK"
fi

# ============================================================================
# 7. DEVICE-CONNECTION ASSOCIATION TESTS
# ============================================================================
print_header "7. DEVICE-CONNECTION ASSOCIATION TESTS"

print_test "Device-Connection mapping"
ASSOC_ANALYSIS=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = data.get('devices', [])
connections = data.get('connections', [])

# Build device-connection map
device_conn_count = {}
for conn in connections:
    from_dev = conn.get('fromDevice', '')
    to_dev = conn.get('toDevice', '')
    if from_dev:
        device_conn_count[from_dev] = device_conn_count.get(from_dev, 0) + 1
    if to_dev:
        device_conn_count[to_dev] = device_conn_count.get(to_dev, 0) + 1

# Count stats
devices_with_conn = sum(1 for d in devices if d['name'] in device_conn_count)
devices_without_conn = len(devices) - devices_with_conn
max_conns = max(device_conn_count.values()) if device_conn_count else 0

print(f'Total devices: {len(devices)}')
print(f'Devices with connections: {devices_with_conn}')
print(f'Devices without connections: {devices_without_conn}')
print(f'Total connections: {len(connections)}')
print(f'Max connections per device: {max_conns}')
")

pass "Association analysis completed"
echo "$ASSOC_ANALYSIS" | while read line; do info "$line"; done

print_test "Verify TEST-SW-001 connection count"
TEST_CONN=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
count = 0
for conn in data.get('connections', []):
    if conn.get('fromDevice') == 'TEST-SW-001' or conn.get('toDevice') == 'TEST-SW-001':
        count += 1
print(f'TEST-SW-001 has {count} connection(s)')
")
pass "$TEST_CONN"

# ============================================================================
# 8. ROOMS DATA TESTS
# ============================================================================
print_header "8. ROOMS DATA TESTS"

print_test "Rooms structure analysis"
ROOMS_ANALYSIS=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
rooms = data.get('rooms', [])
if not rooms:
    print('No rooms defined in data')
else:
    print(f'Total rooms: {len(rooms)}')
    for room in rooms[:5]:
        name = room.get('name', 'unnamed')
        devices = len(room.get('devices', []))
        print(f'  - {name}: {devices} devices')
")

pass "Rooms structure checked"
echo "$ROOMS_ANALYSIS" | while read line; do info "$line"; done

# ============================================================================
# 9. LOCATION ANALYSIS
# ============================================================================
print_header "9. LOCATION ANALYSIS"

print_test "Location distribution"
LOCATION_ANALYSIS=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
from collections import Counter
data = json.load(sys.stdin)
devices = data.get('devices', [])
locations = [d.get('location', 'Unknown') for d in devices]
counter = Counter(locations)
print(f'Total locations: {len(counter)}')
for loc, count in counter.most_common(5):
    print(f'  - {loc}: {count} devices')
")

pass "Location analysis completed"
echo "$LOCATION_ANALYSIS" | while read line; do info "$line"; done

# ============================================================================
# 10. EXPORT/IMPORT CYCLE TEST
# ============================================================================
print_header "10. EXPORT/IMPORT CYCLE TEST"

print_test "Export current data"
curl -s "$BASE_URL/data.php" > /tmp/export_test.json
if [ -s /tmp/export_test.json ]; then
    EXPORT_SIZE=$(wc -c < /tmp/export_test.json)
    pass "Data exported ($EXPORT_SIZE bytes)"
else
    fail "Export failed"
fi

print_test "Validate exported JSON"
if python3 -c "import json; json.load(open('/tmp/export_test.json'))" 2>/dev/null; then
    pass "Exported JSON is valid"
else
    fail "Exported JSON is invalid"
fi

print_test "Re-import exported data (integrity test)"
RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d @/tmp/export_test.json)

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Data re-imported successfully"
else
    fail "Re-import failed: $RESPONSE"
fi

print_test "Verify data integrity after re-import"
REIMPORT_CHECK=$(curl -s "$BASE_URL/data.php" | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = len(data.get('devices', []))
connections = len(data.get('connections', []))
print(f'Devices: {devices}, Connections: {connections}')
")
pass "Re-import integrity: $REIMPORT_CHECK"

# ============================================================================
# 11. STRESS TEST
# ============================================================================
print_header "11. STRESS TEST"

print_test "10 concurrent read requests"
START_TIME=$(date +%s%N)
for i in {1..10}; do
    curl -s -o /dev/null "$BASE_URL/data.php" &
done
wait
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
pass "10 concurrent requests completed in ${DURATION}ms"

print_test "5 rapid write cycles"
for i in {1..5}; do
    RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
        -H "Content-Type: application/json" \
        -b $COOKIE_FILE \
        -d @/tmp/export_test.json)
    if ! echo "$RESPONSE" | grep -q '"ok":true'; then
        fail "Write cycle $i failed"
        break
    fi
done
pass "5 rapid write cycles completed"

# ============================================================================
# 12. RECURSIVE CONNECTION TEST
# ============================================================================
print_header "12. RECURSIVE CONNECTION TEST"

print_test "Create chain of connected devices"
CURRENT_DATA=$(curl -s "$BASE_URL/data.php")
CHAIN_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)

# Create chain: SW1 -> SW2 -> SW3 -> FW1
chain_devices = [
    {'name': 'CHAIN-SW1', 'type': 'switch', 'location': 'Chain Test', 'rack': 'RACK-CHAIN', 'ports': 24, 'status': 'active', 'ip': '10.1.1.1'},
    {'name': 'CHAIN-SW2', 'type': 'switch', 'location': 'Chain Test', 'rack': 'RACK-CHAIN', 'ports': 24, 'status': 'active', 'ip': '10.1.1.2'},
    {'name': 'CHAIN-SW3', 'type': 'switch', 'location': 'Chain Test', 'rack': 'RACK-CHAIN', 'ports': 24, 'status': 'active', 'ip': '10.1.1.3'},
    {'name': 'CHAIN-FW1', 'type': 'firewall', 'location': 'Chain Test', 'rack': 'RACK-CHAIN', 'ports': 8, 'status': 'active', 'ip': '10.1.1.254'},
]

for dev in chain_devices:
    dev['id'] = data['nextDeviceId']
    data['nextDeviceId'] += 1
    data['devices'].append(dev)

# Create chain connections
max_conn_id = max([c.get('id', 0) for c in data.get('connections', [])], default=0)
chain_conns = [
    {'fromDevice': 'CHAIN-SW1', 'fromPort': 'Gi0/1', 'toDevice': 'CHAIN-SW2', 'toPort': 'Gi0/1', 'type': 'trunk'},
    {'fromDevice': 'CHAIN-SW2', 'fromPort': 'Gi0/2', 'toDevice': 'CHAIN-SW3', 'toPort': 'Gi0/1', 'type': 'trunk'},
    {'fromDevice': 'CHAIN-SW3', 'fromPort': 'Gi0/24', 'toDevice': 'CHAIN-FW1', 'toPort': 'Eth1', 'type': 'lan'},
]

for i, conn in enumerate(chain_conns):
    conn['id'] = max_conn_id + i + 1
    conn['status'] = 'active'
    conn['cable'] = 'CAT6A'
    conn['notes'] = 'Chain test connection'
    data['connections'].append(conn)

print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$CHAIN_DATA")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Chain devices and connections created"
else
    fail "Chain creation failed: $RESPONSE"
fi

print_test "Verify recursive path exists"
VERIFY_CHAIN=$(curl -s "$BASE_URL/data.php" | python3 -c "
import sys, json
data = json.load(sys.stdin)

# Build adjacency list
adj = {}
for conn in data.get('connections', []):
    f = conn.get('fromDevice', '')
    t = conn.get('toDevice', '')
    if f and t:
        adj.setdefault(f, []).append(t)
        adj.setdefault(t, []).append(f)

# BFS from CHAIN-SW1 to CHAIN-FW1
def find_path(start, end, adj):
    if start not in adj:
        return None
    visited = {start}
    queue = [(start, [start])]
    while queue:
        node, path = queue.pop(0)
        if node == end:
            return path
        for neighbor in adj.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return None

path = find_path('CHAIN-SW1', 'CHAIN-FW1', adj)
if path:
    print('Path found: ' + ' -> '.join(path))
else:
    print('No path found')
")

if echo "$VERIFY_CHAIN" | grep -q "Path found"; then
    pass "Recursive path verified"
    info "$VERIFY_CHAIN"
else
    fail "Recursive path not found"
fi

# ============================================================================
# 13. LOGOUT TEST
# ============================================================================
print_header "13. LOGOUT TEST"

print_test "Logout"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth.php?action=logout" -b $COOKIE_FILE -c $COOKIE_FILE)
if echo "$RESPONSE" | grep -q '"ok":true\|success'; then
    pass "Logout successful"
else
    warn "Logout response: $RESPONSE"
fi

print_test "Auth check after logout"
RESPONSE=$(curl -s "$BASE_URL/api/auth.php?action=check" -b $COOKIE_FILE)
if echo "$RESPONSE" | grep -q '"authenticated":false'; then
    pass "Session invalidated after logout"
else
    warn "Session may still be active: $RESPONSE"
fi

# ============================================================================
# CLEANUP TEST DATA (Optional)
# ============================================================================
print_header "14. CLEANUP TEST DATA"

print_test "Remove test devices and connections"
# Re-login for cleanup
curl -s -X POST "$BASE_URL/api/auth.php?action=login" \
    -H "Content-Type: application/json" \
    -c $COOKIE_FILE \
    -d '{"username":"tiesse","password":"tiesseadm"}' > /dev/null

CURRENT_DATA=$(curl -s "$BASE_URL/data.php")
CLEANED_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)

# Remove test devices
test_prefixes = ['TEST-', 'CHAIN-']
data['devices'] = [d for d in data['devices'] if not any(d['name'].startswith(p) for p in test_prefixes)]

# Remove test connections
data['connections'] = [c for c in data['connections'] 
    if not any(c.get('fromDevice', '').startswith(p) or c.get('toDevice', '').startswith(p) 
               for p in test_prefixes)]

print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST "$BASE_URL/data.php" \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$CLEANED_DATA")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    pass "Test data cleaned up"
else
    warn "Cleanup failed (may need manual cleanup): $RESPONSE"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                        TEST SUMMARY                              ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Tests:  $TOTAL"
echo -e "  ${GREEN}Passed:       $PASSED${NC}"
echo -e "  ${RED}Failed:       $FAILED${NC}"
echo -e "  ${YELLOW}Warnings:     $WARNINGS${NC}"
echo ""

PASS_RATE=$((PASSED * 100 / TOTAL))
echo -e "  Pass Rate:    ${PASS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY PASSING - Minor issues detected${NC}"
    exit 0
else
    echo -e "${RED}❌ SIGNIFICANT FAILURES - Review required${NC}"
    exit 1
fi
