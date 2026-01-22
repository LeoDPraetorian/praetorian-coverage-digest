#!/bin/bash
# Agent-First Enforcement Hook
#
# PreToolUse hook that blocks Edit/Write on code files when a developer agent exists.
# Claude is the fallback only when no specialized agent is available.
#
# Supported agents (Go routing uses priority - most specific first):
# - integration-developer → .go files in /integrations/ paths
# - capability-developer → .go files in janus, fingerprintx, capabilities, scanners, aegis
# - backend-developer → .go files in other backend/, pkg/, cmd/, modules/ paths
# - frontend-developer → .tsx, .ts, .jsx, .js files in ui/, components/
# - tool-developer → .ts files in .claude/tools/
# - capability-developer → .vql, .yaml (nuclei templates)

# Note: Using set -eu without pipefail to avoid jq exit code issues
# jq returns non-zero on invalid JSON which causes pipefail to fail the whole script
set -eu

# Read input from stdin
input=$(cat)

# Validate we have input before proceeding
if [[ -z "$input" ]]; then
    exit 0
fi

# Extract tool name and file path using heredoc (avoids pipeline issues with jq)
# Use || to provide default empty string on jq failure
tool_name=$(jq -r '.tool_name // ""' <<< "$input" 2>/dev/null) || tool_name=""
file_path=$(jq -r '.tool_input.file_path // ""' <<< "$input" 2>/dev/null) || file_path=""
transcript_path=$(jq -r '.transcript_path // ""' <<< "$input" 2>/dev/null) || transcript_path=""

# Only check Edit and Write tools
if [[ "$tool_name" != "Edit" && "$tool_name" != "Write" ]]; then
    exit 0
fi

# Skip if no file path
if [[ -z "$file_path" ]]; then
    exit 0
fi

# Get file extension and path components
extension="${file_path##*.}"
lower_path=$(echo "$file_path" | tr '[:upper:]' '[:lower:]')

# =============================================================================
# SUBAGENT DETECTION: Allow developer agents to edit their own domain
# =============================================================================
# When a subagent is spawned via Task tool, its transcript contains the
# subagent_type. If we ARE the correct agent for this file type, allow the edit.
# This prevents the hook from blocking the very agent it told the orchestrator
# to spawn.

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
    # Extract subagent_type from first few lines of transcript (where Task params live)
    # The transcript is JSONL, so we check the first message for subagent_type
    subagent_type=$(head -20 "$transcript_path" 2>/dev/null | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"subagent_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    if [[ -n "$subagent_type" ]]; then
        # Check if this subagent is allowed to edit this file type
        case "$subagent_type" in
            frontend-developer)
                # Frontend devs can edit .ts, .tsx, .js, .jsx in ui/components/frontend
                if [[ "$extension" =~ ^(ts|tsx|js|jsx)$ ]] && echo "$lower_path" | grep -qE '(ui|components|frontend)'; then
                    exit 0
                fi
                ;;
            backend-developer)
                # Backend devs can edit .go files in backend paths
                if [[ "$extension" == "go" ]] && echo "$lower_path" | grep -qE '(backend|pkg|cmd|modules)'; then
                    exit 0
                fi
                ;;
            integration-developer)
                # Integration devs can edit .go files in integrations paths
                if [[ "$extension" == "go" ]] && echo "$lower_path" | grep -qE '/integrations/'; then
                    exit 0
                fi
                ;;
            capability-developer)
                # Capability devs can edit .go in capability paths, .vql, nuclei .yaml
                if [[ "$extension" == "go" ]] && echo "$lower_path" | grep -qE '(janus|fingerprintx|/capabilities/|/scanners/|/aegis/)'; then
                    exit 0
                fi
                if [[ "$extension" == "vql" ]]; then
                    exit 0
                fi
                if [[ "$extension" =~ ^(yaml|yml)$ ]] && echo "$lower_path" | grep -qE '(nuclei|templates|capabilities)'; then
                    exit 0
                fi
                ;;
            tool-developer)
                # Tool devs can edit .ts files in .claude/tools/
                if [[ "$extension" == "ts" ]] && echo "$lower_path" | grep -q '\.claude/tools'; then
                    exit 0
                fi
                ;;
        esac
    fi
fi
# =============================================================================
basename=$(basename "$file_path")

# Allow test files to be edited (by tester agents or orchestrator)
if [[ "$basename" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Determine if we have an agent for this file type
agent=""
reason=""

# Go files - priority-based routing (most specific paths first)
if [[ "$extension" == "go" ]]; then
    # 1. Integrations (third-party API integrations)
    if echo "$lower_path" | grep -qE '/integrations/'; then
        agent="integration-developer"
        reason="Chariot integration"
    # 2. Capabilities (security scanning, janus, fingerprintx, etc.)
    elif echo "$lower_path" | grep -qE '(janus|fingerprintx|/capabilities/|/scanners/|/aegis/|chariot-aegis|nebula)'; then
        agent="capability-developer"
        reason="Security capability"
    # 3. General backend (fallback for other Go backend code)
    elif echo "$lower_path" | grep -qE '(backend|pkg|cmd|modules)'; then
        agent="backend-developer"
        reason="Go backend code"
    fi
fi

# Frontend React/TypeScript files
if [[ "$extension" == "tsx" || "$extension" == "jsx" ]]; then
    if echo "$lower_path" | grep -qE '(ui|components|frontend)'; then
        agent="frontend-developer"
        reason="React component"
    fi
fi

# Frontend TypeScript (but not in .claude/tools/)
if [[ "$extension" == "ts" || "$extension" == "js" ]]; then
    if echo "$lower_path" | grep -qE '(ui|components|frontend)' && ! echo "$lower_path" | grep -q '\.claude/tools'; then
        agent="frontend-developer"
        reason="Frontend TypeScript"
    fi
fi

# MCP tool files
if [[ "$extension" == "ts" ]]; then
    if echo "$lower_path" | grep -q '\.claude/tools'; then
        agent="tool-developer"
        reason="MCP tool wrapper"
    fi
fi

# Capability files (VQL, Nuclei templates)
if [[ "$extension" == "vql" ]]; then
    agent="capability-developer"
    reason="VQL capability"
fi

if [[ "$extension" == "yaml" || "$extension" == "yml" ]]; then
    if echo "$lower_path" | grep -qE '(nuclei|templates|capabilities)'; then
        agent="capability-developer"
        reason="Nuclei template"
    fi
fi

# If no matching agent, allow the edit (Claude is fallback)
if [[ -z "$agent" ]]; then
    exit 0
fi

# Block and instruct to spawn agent
cat << EOF
{
  "decision": "block",
  "reason": "AGENT-FIRST: This is $reason. Spawn $agent instead of editing directly. You coordinate, agents implement."
}
EOF

exit 0
