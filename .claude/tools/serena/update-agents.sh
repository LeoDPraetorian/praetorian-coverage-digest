#!/bin/bash
# Update all code-focused agents with semantic-code-operations

AGENTS=(
  "development/capability-developer.md"
  "development/python-developer.md"
  "development/integration-developer.md"
  "analysis/backend-security.md"
  "analysis/frontend-security.md"
  "analysis/frontend-reviewer.md"
  "testing/backend-tester.md"
  "testing/frontend-tester.md"
  "testing/test-lead.md"
  # "research/code-pattern-analyzer.md"  # ARCHIVED: Replaced by native Explore agent
  "analysis/codebase-mapper.md"
  "analysis/security-controls-mapper.md"
  "analysis/codebase-sizer.md"
  "analysis/security-test-planner.md"
  "orchestrator/backend-orchestrator.md"
  "orchestrator/frontend-orchestrator.md"
)

ROOT="/Users/nathansportsman/chariot-development-platform2"

for agent in "${AGENTS[@]}"; do
  file="$ROOT/.claude/agents/$agent"
  if [ -f "$file" ]; then
    echo "Updating $agent..."
    # Add to skills line if not already present
    sed -i.bak 's/\(skills:.*\)\(adhering-to-dry.*verifying-before-completion\)/\1\2, semantic-code-operations/' "$file" 2>/dev/null || \
    sed -i.bak 's/\(skills:.*persisting-agent-outputs\)/\1, semantic-code-operations/' "$file"
    rm -f "${file}.bak"
    echo "  ✅ Skills updated"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

echo ""
echo "✅ All agents updated with semantic-code-operations in skills frontmatter"
echo ""
echo "Note: 'First actions' sections need manual updates to add semantic-code-operations to the mandatory table"
