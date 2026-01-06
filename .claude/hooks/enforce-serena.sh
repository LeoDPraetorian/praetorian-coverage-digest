#!/bin/bash
# Serena Enforcement Hook
#
# PreToolUse hook that intercepts Grep/Search calls on code files
# and blocks them, suggesting Serena wrappers instead.
#
# Why this works:
# - 100% deterministic interception (not prompt-based)
# - Automatically generates semanticContext for module routing
# - Provides visible feedback via stderr logs

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract fields from JSON input
tool_name=$(echo "$input" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
tool_input=$(echo "$input" | jq -c '.tool_input // {}' 2>/dev/null || echo "{}")

# Only process Grep and Search tools
if [[ "$tool_name" != "Grep" && "$tool_name" != "Search" ]]; then
    # Not a Grep/Search call, allow passthrough
    exit 0
fi

# Extract search parameters
pattern=$(echo "$tool_input" | jq -r '.pattern // ""' 2>/dev/null || echo "")
path=$(echo "$tool_input" | jq -r '.path // ""' 2>/dev/null || echo "")
glob=$(echo "$tool_input" | jq -r '.glob // ""' 2>/dev/null || echo "")

# Check if this is a code search
is_code_search=false

# Check glob pattern for code extensions
if [[ -n "$glob" ]]; then
    if echo "$glob" | grep -qE '\.(ts|tsx|js|jsx|go|py|java|rs|c|cpp|h|hpp)'; then
        is_code_search=true
    fi
fi

# Check path for source directories
if [[ "$is_code_search" == "false" && -n "$path" ]]; then
    if echo "$path" | grep -qE '(/src/|/lib/|/pkg/|/cmd/|/components/|/hooks/|/utils/)'; then
        is_code_search=true
    fi
fi

# Check pattern for code-like patterns (JS/TS/Go/Python/Rust)
if [[ "$is_code_search" == "false" && -n "$pattern" ]]; then
    if echo "$pattern" | grep -qiE '(class |interface |function |const |export |import |type |async |=>|struct |func |def |impl |trait |enum |mod )'; then
        is_code_search=true
    fi
fi

# Check if searching in modules/ directory (super-repo pattern)
if [[ "$is_code_search" == "false" && -n "$path" ]]; then
    if echo "$path" | grep -qE '(^modules/|/modules/)'; then
        is_code_search=true
    fi
fi

# If not a code search, allow passthrough
if [[ "$is_code_search" == "false" ]]; then
    exit 0
fi

# Generate semantic context from search parameters
context="Find $pattern"

if [[ -n "$path" && "$path" != "." ]]; then
    # Extract module name from path if it starts with modules/ or contains /modules/
    if echo "$path" | grep -qE '(^modules/|/modules/)'; then
        # Handle both "modules/chariot/..." and ".../modules/chariot/..."
        module_name=$(echo "$path" | sed -n 's|.*modules/\([^/]*\).*|\1|p')
        if [[ -n "$module_name" ]]; then
            context="$context in $module_name module"
        else
            context="$context in $path"
        fi
    else
        context="$context in $path"
    fi
fi

# Add file type context from glob
if [[ -n "$glob" ]]; then
    if echo "$glob" | grep -qE '\.(tsx|jsx)'; then
        context="$context (React components)"
    elif echo "$glob" | grep -qE '\.(ts|js)'; then
        context="$context (TypeScript/JavaScript)"
    elif echo "$glob" | grep -q '\.go'; then
        context="$context (Go code)"
    elif echo "$glob" | grep -q '\.py'; then
        context="$context (Python code)"
    fi
fi

# Log the interception for observability
echo "[Serena Enforcement] Blocked $tool_name on code files" >&2
echo "[Serena Enforcement] Pattern: \"$pattern\"" >&2
echo "[Serena Enforcement] Suggested context: \"$context\"" >&2

# Build relative_path - strip modules/<module>/ prefix if present
# When Serena routes to modules/chariot, relative_path should be within that module
relative_path="${path:-.}"
if [[ -n "$path" ]] && echo "$path" | grep -q '^modules/[^/]*/'; then
    # Extract path after modules/<module>/ prefix
    # e.g., "modules/chariot/backend" -> "backend"
    relative_path=$(echo "$path" | sed 's|^modules/[^/]*/||')
    # If nothing left after stripping, use "." for project root
    if [[ -z "$relative_path" ]]; then
        relative_path="."
    fi
fi

# Build Serena params for suggestion
serena_params=$(cat << EOF
{
  "name_path_pattern": "$pattern",
  "relative_path": "$relative_path",
  "substring_matching": true,
  "include_body": false,
  "depth": 0,
  "semanticContext": "$context"
}
EOF
)

# Build the denial reason with guidance
denial_reason="Code searches must use Serena MCP for semantic search and token efficiency.

Use the Serena find_symbol wrapper instead:

serena.find_symbol($serena_params)

This will:
- Route to correct module via semanticContext (5-10s vs 60s timeout)
- Use LSP-based semantic search (not text matching)
- Save ~70% tokens vs Read+Grep

The semantic context has been auto-generated from your search parameters."

# Escape the denial reason for JSON
escaped_reason=$(echo "$denial_reason" | jq -Rs '.')

# Output JSON response - BLOCK the Grep/Search call
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $escaped_reason
  },
  "systemMessage": "[Serena Enforcement] Blocked $tool_name on code files. Use Serena find_symbol with semanticContext: \"$context\""
}
EOF

exit 0
