#!/bin/bash
# =============================================================================
# TIESSE Matrix Network - Version Update Script
# Updates version in ALL files that need it
# Usage: ./update-version.sh <new_version>
# =============================================================================

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <new_version>"
    echo "   Example: $0 3.6.036"
    exit 1
fi

NEW_VERSION="$1"
OLD_VERSION=$(grep -oP "CURRENT_VERSION = '\K[^']+" js/app.js)

echo "=============================================="
echo "TIESSE Matrix Network - Version Update"
echo "=============================================="
echo "Old version: $OLD_VERSION"
echo "New version: $NEW_VERSION"
echo ""

# All files to update
FILES=(
    "js/app.js"
    "js/auth.js"
    "js/dashboard.js"
    "js/editlock.js"
    "js/features.js"
    "js/floorplan.js"
    "js/ui-updates.js"
    "js/json-validator.js"
    "js/device-detail.js"
    "js/icons.js"
    "css/styles.css"
    "server.js"
    "data.php"
    "index.html"
    "package.json"
    ".env.example"
    "README.md"
)

echo "Updating files..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        sed -i "s/$OLD_VERSION/$NEW_VERSION/g" "$file"
        count=$(grep -c "$NEW_VERSION" "$file" 2>/dev/null || echo "0")
        echo "  ✅ $file ($count)"
    else
        echo "  ⚠️  $file not found"
    fi
done

echo ""
echo "=== VERIFICATION ==="
echo "CURRENT_VERSION:" && grep "CURRENT_VERSION" js/app.js | head -1
echo ""
echo "Version comments:" && grep -rn "Version: $NEW_VERSION" --include="*.js" --include="*.php" --include="*.css" . 2>/dev/null | wc -l
echo "Cache-busting:" && grep -c "?v=$NEW_VERSION" index.html
echo ""
echo "✅ Done! Now: git add -A && git commit && git push"
