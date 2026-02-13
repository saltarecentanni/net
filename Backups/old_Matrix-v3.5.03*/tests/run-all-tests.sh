#!/bin/bash
# ============================================================================
# TIESSE Matrix Network - Master Test Runner
# Runs all test suites and generates summary report
# ============================================================================

echo "
╔══════════════════════════════════════════════════════════════════════╗
║     TIESSE Matrix Network - MASTER TEST RUNNER                       ║
║     Running all test suites...                                        ║
╚══════════════════════════════════════════════════════════════════════╝
"

cd /workspaces/net/Matrix

# Check if server is running
echo "🔍 Checking server status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo "✅ Server is running"
else
    echo "⚠️  Starting server..."
    nohup node server.js > /tmp/server.log 2>&1 &
    sleep 2
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Running JSON Data Audit..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node ./scripts/audit-json.js
JSON_RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Running Code Audit..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node ./scripts/audit-code.js
CODE_RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Running API Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
API_RESULT=0
# Test GET /data
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/data)
if [ "$STATUS" = "200" ]; then
    echo "  ✅ GET /data → 200 OK"
else
    echo "  ❌ GET /data → $STATUS"
    API_RESULT=1
fi
# Test GET /data?action=online
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/data?action=online)
if [ "$STATUS" = "200" ]; then
    echo "  ✅ GET /data?action=online → 200 OK"
else
    echo "  ❌ GET /data?action=online → $STATUS"
    API_RESULT=1
fi
# Test static files
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$STATUS" = "200" ]; then
    echo "  ✅ GET / (index.html) → 200 OK"
else
    echo "  ❌ GET / → $STATUS"
    API_RESULT=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 FINAL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_FAIL=$((JSON_RESULT + CODE_RESULT + API_RESULT))
if [ $TOTAL_FAIL -eq 0 ]; then
    echo "🎉 ALL TEST SUITES PASSED!"
    exit 0
else
    echo "⚠️  SOME TESTS HAD ISSUES (see above)"
    exit 1
fi
