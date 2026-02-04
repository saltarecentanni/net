#!/bin/bash
# =============================================================================
# TIESSE Matrix Network - Version Update Script
# Updates version in ALL files that need cache-busting
# Usage: ./update-version.sh 3.5.041
# =============================================================================

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <new_version>"
    echo "   Example: $0 3.5.041"
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

# Files to update
FILES=(
    "js/app.js"
    "index.html"
    "doc/README.md"
    "doc/BLUEPRINT.md"
    "UPDATE_NOTES.txt"
)

echo "Updating files..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        sed -i "s/$OLD_VERSION/$NEW_VERSION/g" "$file"
        count=$(grep -c "$NEW_VERSION" "$file" 2>/dev/null || echo "0")
        echo "  ✅ $file ($count occurrences)"
    else
        echo "  ⚠️  $file not found"
    fi
done

echo ""
echo "=============================================="
echo "Verification:"
echo "=============================================="
echo "app.js CURRENT_VERSION:"
grep "CURRENT_VERSION" js/app.js | head -1
echo ""
echo "index.html cache-busting (should be $((7)) refs):"
grep -c "?v=$NEW_VERSION" index.html
echo ""
echo "✅ Version update complete!"
echo ""
echo "Next steps:"
echo "  1. git add -A"
echo "  2. git commit -m 'v$NEW_VERSION: <description>'"
echo "  3. git push origin main"
