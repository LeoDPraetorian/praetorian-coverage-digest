#!/bin/bash
# Track file modifications by domain for feedback loop verification
# PostToolUse hook - runs after Edit/Write operations
#
# Categorizes modified files into domains and:
# 1. Writes to modification-state.json for tracking
# 2. Initializes/updates feedback-loop-state.json for Stop hook enforcement

set -uo pipefail
# Note: Not using set -e because jq operations may fail on corrupted state files
# and we want the hook to degrade gracefully rather than error out

# Read hook input from stdin
input=$(cat)

# Extract tool info and session ID
tool_name=$(echo "$input" | jq -r '.tool_name // ""')
session_id=$(echo "$input" | jq -r '.session_id // "default"')
transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')

# Only track Edit and Write operations
if [[ "$tool_name" != "Edit" && "$tool_name" != "Write" ]]; then
  exit 0
fi

# =============================================================================
# SUBAGENT DETECTION: Developer subagents should NOT trigger feedback loop
# =============================================================================
# When a developer subagent (frontend-developer, backend-developer, etc.) edits
# files, we track the modifications for logging but do NOT create feedback loop
# state. The feedback loop enforcement is the ORCHESTRATOR's responsibility,
# not the subagent's.
#
# This prevents subagents from getting stuck in review/test loops when they
# should just complete their task and return to the orchestrator.

is_developer_subagent=false

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  # Extract subagent_type from transcript
  subagent_type=$(head -20 "$transcript_path" 2>/dev/null | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"subagent_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

  if [[ -n "$subagent_type" ]]; then
    case "$subagent_type" in
      frontend-developer|backend-developer|integration-developer|capability-developer|tool-developer)
        is_developer_subagent=true
        ;;
    esac
  fi
fi
# =============================================================================

# Get the file path that was modified
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Skip if no file path
[[ -z "$file_path" ]] && exit 0

# State file locations (session-specific to avoid cross-terminal conflicts)
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/hooks/modification-state-${session_id}.json"
FEEDBACK_STATE="${CLAUDE_PROJECT_DIR}/.claude/hooks/feedback-loop-state-${session_id}.json"

# Initialize state file if it doesn't exist
if [[ ! -f "$STATE_FILE" ]]; then
  mkdir -p "$(dirname "$STATE_FILE")"
  cat > "$STATE_FILE" << 'EOF'
{
  "frontend": [],
  "backend": [],
  "python": [],
  "capabilities": [],
  "mcp_tools": [],
  "integrations": [],
  "skills": [],
  "other": []
}
EOF
fi

# Categorize file by path patterns
# IMPORTANT: Order matters! More specific patterns must come FIRST.
domain=""

# Convert to lowercase for matching
lower_path=$(echo "$file_path" | tr '[:upper:]' '[:lower:]')

# Go files need priority-based routing (most specific first)
if [[ "$file_path" == *.go ]]; then
  # 1. Integrations (third-party API integrations)
  if echo "$lower_path" | grep -qE '/integrations/'; then
    domain="integrations"
  # 2. Capabilities (security scanning, janus, fingerprintx, etc.)
  elif echo "$lower_path" | grep -qE '(janus|fingerprintx|/capabilities/|/scanners/|/aegis/|chariot-aegis|nebula)'; then
    domain="capabilities"
  # 3. General backend (fallback for other Go backend code)
  elif echo "$lower_path" | grep -qE '(backend|pkg|cmd|internal|modules)'; then
    domain="backend"
  else
    domain="backend"  # Default for .go files
  fi
else
  # Non-Go files use case statement
  case "$file_path" in
    # Frontend patterns
    */ui/src/*|*/ui/e2e/*|*chariot-ui-components*|*.tsx|*.jsx)
      domain="frontend"
      ;;
    # Python patterns
    *.py)
      domain="python"
      ;;
    # Capability patterns (VQL, Nuclei templates)
    *.vql)
      domain="capabilities"
      ;;
    *.yaml|*.yml)
      if echo "$lower_path" | grep -qE '(nuclei|templates|capabilities)'; then
        domain="capabilities"
      fi
      ;;
    # MCP tools patterns
    */.claude/tools/*)
      domain="mcp_tools"
      ;;
    # Skill patterns
    */.claude/skills/*|*/.claude/skill-library/*)
      domain="skills"
      ;;
  esac
fi

# Default to "other" if no specific domain matched
[[ -z "$domain" ]] && domain="other"

# Add file to the appropriate domain array (avoid duplicates)
if command -v jq &> /dev/null; then
  jq --arg domain "$domain" --arg file "$file_path" \
    'if (.[$domain] | index($file)) then . else .[$domain] += [$file] end' \
    "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

# --- Initialize/Update Feedback Loop State ---
# Only for domains that require review/test cycle
# SKIP for developer subagents (they should exit freely, orchestrator enforces)

tracked_domains="backend frontend python mcp_tools capabilities integrations"

# Developer subagents should NOT trigger feedback loop - orchestrator handles that
if [[ "$is_developer_subagent" == "true" ]]; then
  exit 0
fi

if echo "$tracked_domains" | grep -qw "$domain"; then
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Initialize phase template for a domain
  domain_phase_template='{
    "review": { "status": "NOT_RUN", "agent": null, "issues": [] },
    "test_planning": { "status": "NOT_RUN", "agent": null },
    "testing": { "status": "NOT_RUN", "agent": null, "issues": [] }
  }'

  if [[ ! -f "$FEEDBACK_STATE" ]]; then
    # Initialize new feedback loop state with per-domain tracking
    cat > "$FEEDBACK_STATE" << EOF
{
  "active": true,
  "started_at": "$timestamp",
  "iteration": 1,
  "modified_domains": ["$domain"],
  "domain_phases": {
    "$domain": $domain_phase_template
  },
  "consecutive_review_failures": 0,
  "consecutive_test_failures": 0
}
EOF
  else
    # Add domain to existing state if not already present
    # Also initialize domain_phases for the new domain
    jq --arg domain "$domain" --argjson phase_template "$domain_phase_template" \
       'if (.modified_domains | index($domain)) then .
        else
          .modified_domains += [$domain] |
          .domain_phases[$domain] = $phase_template
        end' \
       "$FEEDBACK_STATE" > "${FEEDBACK_STATE}.tmp" 2>/dev/null && mv "${FEEDBACK_STATE}.tmp" "$FEEDBACK_STATE"
  fi
fi

exit 0
