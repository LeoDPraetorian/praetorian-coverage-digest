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
# When a subagent is spawned via Task tool, it gets its own transcript file
# named agent-{agentId}.jsonl. The subagent_type parameter is in the PARENT
# orchestrator's transcript, not the subagent's transcript.
#
# Detection: If transcript_path basename starts with "agent-", we're in a
# subagent context. Allow edits that match any developer agent's domain.

if [[ -n "$transcript_path" ]]; then
    transcript_basename=$(basename "$transcript_path")

    # Check if we're in a subagent context (transcript is agent-{id}.jsonl)
    if [[ "$transcript_basename" == agent-*.jsonl ]]; then
        # We're in a subagent - allow edits that match developer agent domains
        # Trust that orchestrator spawned the correct agent type

        # Frontend files (.ts, .tsx, .js, .jsx in ui/components/frontend)
        if [[ "$extension" =~ ^(ts|tsx|js|jsx)$ ]] && echo "$lower_path" | grep -qE '(ui|components|frontend)'; then
            exit 0
        fi

        # Backend Go files
        if [[ "$extension" == "go" ]] && echo "$lower_path" | grep -qE '(backend|pkg|cmd|modules|integrations|janus|fingerprintx|/capabilities/|/scanners/|/aegis/)'; then
            exit 0
        fi

        # Tool wrapper files
        if [[ "$extension" == "ts" ]] && echo "$lower_path" | grep -q '\.claude/tools'; then
            exit 0
        fi

        # VQL and Nuclei templates
        if [[ "$extension" == "vql" ]]; then
            exit 0
        fi
        if [[ "$extension" =~ ^(yaml|yml)$ ]] && echo "$lower_path" | grep -qE '(nuclei|templates|capabilities)'; then
            exit 0
        fi
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
