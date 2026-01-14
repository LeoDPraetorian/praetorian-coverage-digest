#!/bin/bash

# Apply auto-fixes to all Linear wrappers

TOOLS=(
  "create-bug"
  "create-comment"
  "create-issue"
  "create-jira-bug"
  "create-project"
  "find-issue"
  "find-user"
  "get-issue"
  "get-project"
  "get-team"
  "list-comments"
  "list-cycles"
  "list-issues"
  "list-projects"
  "list-teams"
  "list-users"
  "update-cycle"
  "update-issue"
  "update-project"
)

echo "🔧 Applying auto-fixes to all Linear wrappers..."
echo ""

for tool in "${TOOLS[@]}"; do
  echo "━━━ Processing: linear/$tool ━━━"
  npm run --silent fix -- "linear/$tool" 2>&1 | tail -5
  echo ""
done

echo "✅ Auto-fixes applied to all Linear wrappers"
echo "📝 Manual fixes still required for 8 phases per wrapper"
