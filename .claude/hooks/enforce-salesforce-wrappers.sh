#!/bin/bash
# Salesforce Wrapper Enforcement Hook
#
# PreToolUse hook that intercepts mcp__salesforce__* tool calls
# and blocks them, requiring use of TypeScript wrappers instead.
#
# Why this exists:
# - Direct MCP calls waste 5,000-10,000 tokens per call
# - Direct MCP calls bypass knowledge layer (glossary, patterns, schema)
# - Direct MCP calls don't learn from successful queries
#
# Escape hatch: touch .claude/.salesforce-direct-mcp-allowed

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract tool name from JSON input
tool_name=$(echo "$input" | jq -r '.tool_name // ""' 2>/dev/null || echo "")

# Check for escape hatch flag
ESCAPE_FLAG="${CLAUDE_PROJECT_DIR:-.}/.claude/.salesforce-direct-mcp-allowed"
if [ -f "$ESCAPE_FLAG" ]; then
    # Escape hatch active - allow direct MCP calls
    exit 0
fi

# Only intercept mcp__salesforce__* tools
if [[ ! "$tool_name" =~ ^mcp__salesforce__ ]]; then
    # Not a Salesforce MCP call, allow passthrough
    exit 0
fi

# Extract the specific tool name (after mcp__salesforce__ prefix)
mcp_tool_suffix="${tool_name#mcp__salesforce__}"

# Map MCP tool names to wrapper filenames
# MCP uses underscores, wrappers use hyphens
wrapper_filename=$(echo "$mcp_tool_suffix" | tr '_' '-')

# Special case: run_soql_query should suggest enhanced version
if [[ "$mcp_tool_suffix" == "run_soql_query" ]]; then
    wrapper_filename="run-soql-query-enhanced"
    wrapper_import="runSoqlQueryEnhanced"
    example_params='{ naturalLanguage: "total bookings year to date", useKnowledge: true, learnPattern: true }'
else
    # Convert snake_case to camelCase for import name
    wrapper_import=$(echo "$mcp_tool_suffix" | sed -r 's/_([a-z])/\U\1/g')
    example_params='{ /* params */ }'
fi

# Log the interception for observability
echo "[Salesforce Enforcement] Blocked direct MCP call: $tool_name" >&2
echo "[Salesforce Enforcement] Use wrapper: $wrapper_filename.ts" >&2

# Build the denial reason with guidance
denial_reason="Direct Salesforce MCP calls are FORBIDDEN. Use TypeScript wrappers instead.

WHY this is forbidden:
1. Bypasses knowledge layer - No pattern caching, glossary, or schema resolution
2. Wastes tokens - 5,000-10,000 tokens per call vs 150 tokens with wrappers
3. No learning - Patterns never persist for future queries

USE THIS INSTEAD:

\`\`\`bash
npx tsx -e \"(async () => {
  const { $wrapper_import } = await import('./.claude/tools/salesforce/$wrapper_filename.ts');
  const result = await $wrapper_import.execute($example_params);
  console.log(JSON.stringify(result, null, 2));
})();\" 2>/dev/null
\`\`\`

SKILL REFERENCE: Read mcp-tools-salesforce for full wrapper documentation.

ESCAPE HATCH (for wrapper development only):
touch .claude/.salesforce-direct-mcp-allowed"

# Escape the denial reason for JSON
escaped_reason=$(echo "$denial_reason" | jq -Rs '.')

# Output JSON response - BLOCK the MCP call
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $escaped_reason
  },
  "systemMessage": "[Salesforce Enforcement] Blocked $tool_name. Use wrapper .claude/tools/salesforce/$wrapper_filename.ts instead."
}
EOF

exit 0
