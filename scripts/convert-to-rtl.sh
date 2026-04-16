#!/bin/bash

# RTL Support Script - Replace directional properties with logical equivalents
# This script converts marginLeft/Right and paddingLeft/Right to marginStart/End and paddingStart/End

echo "🔄 Starting RTL property conversion..."

# Find all TypeScript and TSX files in src directory
FILES=$(find /Users/1millnonstop/Downloads/pregnancy-app/app/src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*")

# Counter for replacements
TOTAL_REPLACEMENTS=0

for file in $FILES; do
    # Create backup
    cp "$file" "$file.bak"
    
    # Perform replacements
    REPLACEMENTS=0
    
    # Replace marginLeft with marginStart
    if grep -q "marginLeft" "$file"; then
        sed -i '' 's/marginLeft:/marginStart:/g' "$file"
        REPLACEMENTS=$((REPLACEMENTS + $(grep -c "marginStart" "$file")))
    fi
    
    # Replace marginRight with marginEnd
    if grep -q "marginRight" "$file"; then
        sed -i '' 's/marginRight:/marginEnd:/g' "$file"
        REPLACEMENTS=$((REPLACEMENTS + $(grep -c "marginEnd" "$file")))
    fi
    
    # Replace paddingLeft with paddingStart
    if grep -q "paddingLeft" "$file"; then
        sed -i '' 's/paddingLeft:/paddingStart:/g' "$file"
        REPLACEMENTS=$((REPLACEMENTS + $(grep -c "paddingStart" "$file")))
    fi
    
    # Replace paddingRight with paddingEnd
    if grep -q "paddingRight" "$file"; then
        sed -i '' 's/paddingRight:/paddingEnd:/g' "$file"
        REPLACEMENTS=$((REPLACEMENTS + $(grep -c "paddingEnd" "$file")))
    fi
    
    if [ $REPLACEMENTS -gt 0 ]; then
        echo "✅ $file: $REPLACEMENTS replacements"
        TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + REPLACEMENTS))
        # Remove backup if successful
        rm "$file.bak"
    else
        # No changes, remove backup
        rm "$file.bak"
    fi
done

echo ""
echo "✨ RTL conversion complete!"
echo "📊 Total replacements: $TOTAL_REPLACEMENTS"
echo ""
echo "Next steps:"
echo "1. Test the app in Arabic to verify RTL layout"
echo "2. Check for any visual issues"
echo "3. Commit changes if everything looks good"
