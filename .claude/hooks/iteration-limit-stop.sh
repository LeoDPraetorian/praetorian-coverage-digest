#!/bin/bash
# Iteration Limit Stop Hook
# Enforces max_iterations from orchestration-limits.yaml
# Uses state file to track iteration count across turns
#
# Activation: Create iteration-state-{session_id}.json to enable iteration mode
# Deactivation: Hook removes state file when limit reached
# Note: State files are session-specific to avoid cross-terminal conflicts
#
# Based on: Ralph Wiggum technique, community research on autonomous loops

set -uo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (approve if missing to not block on setup issues)
if ! require_jq; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Read hook input to get session_id
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')

# State and config file locations (session-specific to avoid cross-terminal conflicts)
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/hooks/iteration-state-${session_id}.json"
CONFIG_FILE="${CLAUDE_PROJECT_DIR}/.claude/config/orchestration-limits.yaml"

# Default values (fallback if config unavailable)
DEFAULT_MAX_ITERATIONS=10

# --- Helper: Read config value ---
read_config_value() {
  local key="$1"
  local default="$2"

  if [[ -f "$CONFIG_FILE" ]]; then
    # Try yq first (more robust YAML parsing)
    if command -v yq &> /dev/null; then
      value=$(yq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null)
      if [[ -n "$value" && "$value" != "null" ]]; then
        echo "$value"
        return
      fi
    fi

    # Fallback: grep-based extraction for simple cases
    # Handles: "  max_iterations: 10  # comment"
    local simple_key="${key##*.}"  # Extract last part of key path
    value=$(grep -E "^\s*${simple_key}:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/.*:\s*//' | sed 's/#.*//' | tr -d ' ')
    if [[ -n "$value" ]]; then
      echo "$value"
      return
    fi
  fi

  echo "$default"
}

# --- Step 1: Check if iteration mode is active ---

if [[ ! -f "$STATE_FILE" ]]; then
  # No state file = not in iteration mode, allow exit
  echo '{"decision": "approve"}'
  exit 0
fi

# --- Step 2: Read current state ---

iteration=$(jq -r '.iteration // 0' "$STATE_FILE" 2>/dev/null || echo "0")
task_signature=$(jq -r '.task // "unknown"' "$STATE_FILE" 2>/dev/null || echo "unknown")

# Read max_iterations from state file first (allows per-task override)
# Fall back to config file, then default
state_max=$(jq -r '.max_iterations // ""' "$STATE_FILE" 2>/dev/null)
if [[ -n "$state_max" && "$state_max" != "null" ]]; then
  max_iterations="$state_max"
else
  max_iterations=$(read_config_value '.intra_task.max_iterations' "$DEFAULT_MAX_ITERATIONS")
fi

# --- Step 3: Check if limit reached ---

if [[ "$iteration" -ge "$max_iterations" ]]; then
  # Limit reached - clean up state file and allow exit
  rm -f "$STATE_FILE"

  # Output success (allow stop)
  cat << EOF
{
  "decision": "approve"
}
EOF
  exit 0
fi

# --- Step 4: Increment iteration and block exit ---

new_iteration=$((iteration + 1))

# Update state file with new iteration count
jq --argjson iter "$new_iteration" '.iteration = $iter' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null
if [[ $? -eq 0 ]]; then
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
else
  # jq failed, manually update
  echo "{\"iteration\": $new_iteration, \"max_iterations\": $max_iterations, \"task\": \"$task_signature\"}" > "$STATE_FILE"
fi

# --- Step 5: Block exit with continuation reason ---

cat << EOF
{
  "decision": "block",
  "reason": "Iteration $new_iteration of $max_iterations for task '$task_signature'. Continue working toward completion. If stuck, update scratchpad with what you've tried."
}
EOF

exit 0
