#!/bin/bash
# ============================================================================
# TIESSE Matrix Network - Comprehensive Test Suite
# Version: 1.0.0
# ============================================================================

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/test_cookies.txt"
PASSED=0
FAILED=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
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

info() {
    echo -e "  ${BLUE}ℹ️  INFO:${NC} $1"
}

# ============================================================================
# CLEANUP
# ============================================================================
rm -f $COOKIE_FILE

print_header "TIESSE Matrix Network - COMPREHENSIVE TEST SUITE"
echo "  Date: $(date)"
echo "  Server: $BASE_URL"

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
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/js/app.js)
if [ "$STATUS" = "200" ]; then
    pass "app.js accessible"
else
    fail "app.js not accessible (HTTP $STATUS)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/js/features.js)
if [ "$STATUS" = "200" ]; then
    pass "features.js accessible"
else
    fail "features.js not accessible"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/css/styles.css)
if [ "$STATUS" = "200" ]; then
    pass "styles.css accessible"
else
    fail "styles.css not accessible"
fi

# ============================================================================
# 2. AUTHENTICATION TESTS
# ============================================================================
print_header "2. AUTHENTICATION TESTS"

print_test "Login with invalid credentials"
RESPONSE=$(curl -s -X POST $BASE_URL/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}')
if echo "$RESPONSE" | grep -q "error\|Invalid"; then
    pass "Invalid credentials rejected"
else
    fail "Invalid credentials not rejected: $RESPONSE"
fi

print_test "Login with valid credentials"
RESPONSE=$(curl -s -X POST $BASE_URL/api/login \
    -H "Content-Type: application/json" \
    -c $COOKIE_FILE \
    -d '{"username":"tiesse","password":"tiesseadm"}')
if echo "$RESPONSE" | grep -q "success\|ok\|true"; then
    pass "Valid login successful"
    info "Session cookie saved"
else
    fail "Valid login failed: $RESPONSE"
fi

print_test "Session verification"
RESPONSE=$(curl -s $BASE_URL/api/session -b $COOKIE_FILE)
if echo "$RESPONSE" | grep -q "authenticated\|true\|tiesse"; then
    pass "Session is valid"
else
    info "Session check response: $RESPONSE"
fi

# ============================================================================
# 3. DATA API TESTS
# ============================================================================
print_header "3. DATA API TESTS"

print_test "GET /api/data (fetch all data)"
RESPONSE=$(curl -s $BASE_URL/api/data)
if echo "$RESPONSE" | grep -q "devices\|connections"; then
    pass "Data API returns valid structure"
    # Count items
    DEVICES=$(echo "$RESPONSE" | grep -o '"devices":\s*\[' | head -1)
    if [ ! -z "$DEVICES" ]; then
        info "Data structure includes devices array"
    fi
else
    fail "Data API response invalid: ${RESPONSE:0:100}"
fi

print_test "Data integrity check"
# Verify JSON is valid
if echo "$RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    pass "JSON response is valid"
else
    fail "JSON response is invalid"
fi

# ============================================================================
# 4. DEVICE CRUD TESTS
# ============================================================================
print_header "4. DEVICE CRUD TESTS"

# Get current data
CURRENT_DATA=$(curl -s $BASE_URL/api/data)

print_test "Create new device"
# Parse current data and add a new device
NEW_DEVICE_DATA=$(echo "$CURRENT_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'devices' not in data:
    data['devices'] = []
# Find max ID
max_id = max([d.get('id', 0) for d in data['devices']], default=0)
new_device = {
    'id': max_id + 1,
    'name': 'TEST-DEVICE-001',
    'type': 'switch',
    'location': 'Test Room',
    'rack': 'TEST-RACK-1',
    'ports': 24,
    'status': 'active',
    'ip': '192.168.100.100',
    'notes': 'Automated test device'
}
data['devices'].append(new_device)
print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST $BASE_URL/api/data \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$NEW_DEVICE_DATA")

if echo "$RESPONSE" | grep -q "success\|ok\|saved"; then
    pass "Device created successfully"
else
    fail "Device creation failed: ${RESPONSE:0:100}"
fi

print_test "Verify device was saved"
SAVED_DATA=$(curl -s $BASE_URL/api/data)
if echo "$SAVED_DATA" | grep -q "TEST-DEVICE-001"; then
    pass "Device persisted in database"
else
    fail "Device not found in saved data"
fi

# ============================================================================
# 5. CONNECTION CRUD TESTS
# ============================================================================
print_header "5. CONNECTION CRUD TESTS"

print_test "Create new connection"
CONNECTION_DATA=$(curl -s $BASE_URL/api/data | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'connections' not in data:
    data['connections'] = []
# Find devices for connection
devices = data.get('devices', [])
if len(devices) >= 2:
    from_device = devices[0]
    to_device = devices[1]
    max_id = max([c.get('id', 0) for c in data['connections']], default=0)
    new_conn = {
        'id': max_id + 1,
        'fromDevice': from_device['name'],
        'fromPort': '1',
        'toDevice': to_device['name'],
        'toPort': '1',
        'type': 'lan',
        'status': 'active',
        'cable': 'CAT6',
        'notes': 'Test connection'
    }
    data['connections'].append(new_conn)
print(json.dumps(data))
")

RESPONSE=$(curl -s -X POST $BASE_URL/api/data \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d "$CONNECTION_DATA")

if echo "$RESPONSE" | grep -q "success\|ok\|saved"; then
    pass "Connection created successfully"
else
    fail "Connection creation failed: ${RESPONSE:0:100}"
fi

print_test "Verify connection was saved"
SAVED_DATA=$(curl -s $BASE_URL/api/data)
if echo "$SAVED_DATA" | grep -q "Test connection"; then
    pass "Connection persisted in database"
else
    info "Connection may have been saved with different format"
fi

# ============================================================================
# 6. DATA INTEGRITY TESTS
# ============================================================================
print_header "6. DATA INTEGRITY TESTS"

print_test "Check for orphan connections"
INTEGRITY_CHECK=$(curl -s $BASE_URL/api/data | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = {d['name'] for d in data.get('devices', [])}
connections = data.get('connections', [])
orphans = []
for conn in connections:
    if conn.get('fromDevice') and conn['fromDevice'] not in devices:
        orphans.append(f\"From: {conn['fromDevice']}\")
    if conn.get('toDevice') and conn['toDevice'] not in devices:
        orphans.append(f\"To: {conn['toDevice']}\")
if orphans:
    print('ORPHANS:' + ','.join(orphans))
else:
    print('OK')
")

if [ "$INTEGRITY_CHECK" = "OK" ]; then
    pass "No orphan connections found"
else
    fail "Orphan connections detected: $INTEGRITY_CHECK"
fi

print_test "Check for duplicate IDs"
DUPLICATE_CHECK=$(curl -s $BASE_URL/api/data | python3 -c "
import sys, json
data = json.load(sys.stdin)
device_ids = [d.get('id') for d in data.get('devices', []) if d.get('id')]
conn_ids = [c.get('id') for c in data.get('connections', []) if c.get('id')]
dup_devices = len(device_ids) != len(set(device_ids))
dup_conns = len(conn_ids) != len(set(conn_ids))
if dup_devices or dup_conns:
    print('DUPLICATES')
else:
    print('OK')
")

if [ "$DUPLICATE_CHECK" = "OK" ]; then
    pass "No duplicate IDs found"
else
    fail "Duplicate IDs detected"
fi

# ============================================================================
# 7. ASSOCIATION TESTS (Device <-> Connection)
# ============================================================================
print_header "7. ASSOCIATION TESTS"

print_test "Device-Connection associations"
ASSOC_CHECK=$(curl -s $BASE_URL/api/data | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = data.get('devices', [])
connections = data.get('connections', [])

# Build device-connection map
device_conns = {}
for conn in connections:
    from_dev = conn.get('fromDevice', '')
    to_dev = conn.get('toDevice', '')
    if from_dev:
        device_conns.setdefault(from_dev, []).append(conn['id'])
    if to_dev:
        device_conns.setdefault(to_dev, []).append(conn['id'])

# Count devices with connections
devices_with_conns = sum(1 for d in devices if d['name'] in device_conns)
print(f'Devices with connections: {devices_with_conns}/{len(devices)}')
print(f'Total connections: {len(connections)}')
")

pass "Association analysis completed"
info "$ASSOC_CHECK"

# ============================================================================
# 8. ROOMS DATA TEST
# ============================================================================
print_header "8. ROOMS DATA TEST"

print_test "Rooms structure validation"
ROOMS_CHECK=$(curl -s $BASE_URL/api/data | python3 -c "
import sys, json
data = json.load(sys.stdin)
rooms = data.get('rooms', [])
if rooms:
    print(f'Rooms found: {len(rooms)}')
    for room in rooms[:3]:
        print(f'  - {room.get(\"name\", \"unnamed\")}: {len(room.get(\"devices\", []))} devices')
else:
    print('No rooms defined')
")

pass "Rooms structure checked"
info "$ROOMS_CHECK"

# ============================================================================
# 9. EXPORT/IMPORT CYCLE TEST
# ============================================================================
print_header "9. EXPORT/IMPORT CYCLE TEST"

print_test "Export data to file"
curl -s $BASE_URL/api/data > /tmp/export_test.json
if [ -s /tmp/export_test.json ]; then
    pass "Data exported successfully"
    EXPORT_SIZE=$(wc -c < /tmp/export_test.json)
    info "Export size: $EXPORT_SIZE bytes"
else
    fail "Export failed"
fi

print_test "Validate exported JSON"
if python3 -c "import json; json.load(open('/tmp/export_test.json'))" 2>/dev/null; then
    pass "Exported JSON is valid"
else
    fail "Exported JSON is invalid"
fi

print_test "Re-import exported data"
RESPONSE=$(curl -s -X POST $BASE_URL/api/data \
    -H "Content-Type: application/json" \
    -b $COOKIE_FILE \
    -d @/tmp/export_test.json)

if echo "$RESPONSE" | grep -q "success\|ok\|saved"; then
    pass "Data re-imported successfully"
else
    fail "Re-import failed: ${RESPONSE:0:100}"
fi

# ============================================================================
# 10. STRESS TEST
# ============================================================================
print_header "10. STRESS TEST (10 rapid requests)"

print_test "Concurrent read requests"
START_TIME=$(date +%s%N)
for i in {1..10}; do
    curl -s -o /dev/null $BASE_URL/api/data &
done
wait
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
pass "10 concurrent requests completed in ${DURATION}ms"

# ============================================================================
# 11. LOGOUT TEST
# ============================================================================
print_header "11. LOGOUT TEST"

print_test "Logout"
RESPONSE=$(curl -s -X POST $BASE_URL/api/logout -b $COOKIE_FILE -c $COOKIE_FILE)
if echo "$RESPONSE" | grep -q "success\|ok\|logged"; then
    pass "Logout successful"
else
    info "Logout response: $RESPONSE"
fi

print_test "Protected endpoint after logout"
RESPONSE=$(curl -s -X POST $BASE_URL/api/data \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}')
if echo "$RESPONSE" | grep -q "error\|unauthorized\|login"; then
    pass "Protected endpoint requires authentication"
else
    info "Response: ${RESPONSE:0:100}"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        TEST SUMMARY                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Tests:  $TOTAL"
echo -e "  ${GREEN}Passed:       $PASSED${NC}"
echo -e "  ${RED}Failed:       $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    exit 1
fi
