#!/bin/bash

# Script to update Linear wrappers with estimateTokens utility
# Task 2: Add estimateTokens import and usage

set -e

TOOL_DIR="/Users/nathansportsman/chariot-development-platform2/.claude/tools/linear"

# List of files to update (excluding already updated ones)
FILES=(
  "update-issue.ts"
  "create-bug.ts"
  "create-comment.ts"
  "create-jira-bug.ts"
  "create-project.ts"
  "find-issue.ts"
  "find-user.ts"
  "get-project.ts"
  "get-team.ts"
  "list-comments.ts"
  "list-teams.ts"
  "list-users.ts"
  "update-cycle.ts"
  "update-project.ts"
  "list-projects.ts"
  "list-cycles.ts"
)

echo "Updating ${#FILES[@]} Linear wrapper files..."

for file in "${FILES[@]}"; do
  filepath="$TOOL_DIR/$file"

  if [ ! -f "$filepath" ]; then
    echo "⚠️  Skipping $file (not found)"
    continue
  fi

  echo "Processing $file..."

  # Step 1: Add estimateTokens to imports if not already present
  if ! grep -q "estimateTokens" "$filepath"; then
    # Find the line with response-utils import and add estimateTokens
    if grep -q "from '../config/lib/response-utils'" "$filepath"; then
      # Import already exists, add estimateTokens to it
      sed -i.bak "s/} from '\.\.\/config\/lib\/response-utils'/,\n  estimateTokens,\n} from '..\/config\/lib\/response-utils'/" "$filepath"
    else
      # No response-utils import, add new one after sanitize import
      sed -i.bak "/from '\.\.\/config\/lib\/sanitize'/a\\
import { estimateTokens } from '../config/lib/response-utils';
" "$filepath"
    fi
  fi

  echo "  ✓ Added import"
done

echo ""
echo "✅ Import updates complete!"
echo "⚠️  Manual steps still needed:"
echo "  1. Add 'estimatedTokens: z.number()' to each output schema"
echo "  2. Add token calculation in execute() functions"
echo "  3. Run TypeScript compiler to verify"
echo "  4. Run tests"
