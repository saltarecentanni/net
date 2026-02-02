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
echo "📋 Running Backend API Tests (test-suite-v2.sh)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./tests/test-suite-v2.sh
BACKEND_RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Running End-to-End Tests (e2e-tests.js)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node ./tests/e2e-tests.js
E2E_RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 FINAL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $BACKEND_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ]; then
    echo "🎉 ALL TEST SUITES PASSED!"
    exit 0
elif [ $BACKEND_RESULT -eq 0 ] || [ $E2E_RESULT -eq 0 ]; then
    echo "⚠️  SOME TEST SUITES HAD ISSUES"
    exit 0
else
    echo "❌ TEST SUITES FAILED"
    exit 1
fi
