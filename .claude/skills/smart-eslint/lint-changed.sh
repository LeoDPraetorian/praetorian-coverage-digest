#!/bin/bash
set -euo pipefail

# smart-eslint: Lint only modified TypeScript/JavaScript files
# This script is significantly faster than linting the entire codebase

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Smart ESLint Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
UI_DIR="$REPO_ROOT/modules/chariot/ui"

# Check if UI directory exists
if [ ! -d "$UI_DIR" ]; then
    echo -e "${RED}❌ Error: UI directory not found at $UI_DIR${NC}"
    exit 1
fi

# Navigate to UI directory
cd "$UI_DIR"

# Get modified files (unstaged + staged)
echo "Detecting modified files..."

# Get unstaged modified files
MODIFIED_FILES=$(git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)

# Combine and deduplicate
ALL_FILES=$(echo -e "$MODIFIED_FILES\n$STAGED_FILES" | sort -u | grep -v '^$' || true)

# Filter to only files that exist in UI directory and convert to relative paths
FILTERED_FILES=""
while IFS= read -r file; do
    # Check if file path contains ui/ or is in current directory
    if [[ "$file" == *"modules/chariot/ui/"* ]] || [[ ! "$file" == *"/"* ]]; then
        # Convert to relative path from UI directory
        RELATIVE_FILE=$(echo "$file" | sed "s|.*modules/chariot/ui/||")
        if [ -f "$RELATIVE_FILE" ]; then
            FILTERED_FILES="$FILTERED_FILES $RELATIVE_FILE"
        fi
    fi
done <<< "$ALL_FILES"

# Trim whitespace
FILTERED_FILES=$(echo "$FILTERED_FILES" | xargs)

# Check if any files found
if [ -z "$FILTERED_FILES" ]; then
    echo -e "${GREEN}✅ No TypeScript/JavaScript files modified in UI${NC}"
    exit 0
fi

# Count files
FILE_COUNT=$(echo "$FILTERED_FILES" | wc -w | xargs)

echo -e "${BLUE}Modified files: $FILE_COUNT${NC}"
for file in $FILTERED_FILES; do
    echo "  - $file"
done
echo ""

# Run ESLint with --fix on modified files
echo "Running: npx eslint --fix $FILTERED_FILES"
echo ""

# Run ESLint and capture output
if npx eslint --fix $FILTERED_FILES 2>&1 | tee /tmp/eslint-output.txt; then
    echo ""
    echo -e "${GREEN}✅ All files passed linting (0 errors, 0 warnings)${NC}"
    exit 0
else
    ESLINT_EXIT_CODE=$?
    echo ""
    echo -e "${RED}❌ ESLint found issues${NC}"

    # Show summary
    ERROR_COUNT=$(grep -c "error" /tmp/eslint-output.txt || echo "0")
    WARNING_COUNT=$(grep -c "warning" /tmp/eslint-output.txt || echo "0")

    if [ "$ERROR_COUNT" != "0" ] || [ "$WARNING_COUNT" != "0" ]; then
        echo -e "${YELLOW}Summary: $ERROR_COUNT errors, $WARNING_COUNT warnings${NC}"
    fi

    echo ""
    echo -e "${YELLOW}Please fix these issues before proceeding.${NC}"
    exit $ESLINT_EXIT_CODE
fi
