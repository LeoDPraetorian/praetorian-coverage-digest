#!/bin/bash
# Hook Utilities
#
# Shared helper functions for Claude Code hooks.
# Source this file at the top of hooks that need dependency checking.
#
# Usage:
#   source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"
#   require_jq    # Ensures jq is available, installs if needed, fails loudly if not
#   require_yq    # Ensures yq is available, installs if needed, returns 1 if not (non-fatal)
#   require_curl  # Ensures curl is available, installs if needed, returns 1 if not (non-fatal)

# =============================================================================
# DEPENDENCY MANAGEMENT
# =============================================================================

# Ensure jq is available (FATAL if missing - hooks can't function without it)
require_jq() {
  if command -v jq &>/dev/null; then
    return 0
  fi

  # Attempt to install jq automatically
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "Hook: jq not found, installing via brew..." >&2
    if brew install jq >/dev/null 2>&1; then
      echo "Hook: jq installed successfully" >&2
      return 0
    fi
  elif [[ "$(uname -s)" == "Linux" ]]; then
    echo "Hook: jq not found, installing via apt..." >&2
    if sudo apt-get update -qq && sudo apt-get install -y -qq jq >/dev/null 2>&1; then
      echo "Hook: jq installed successfully" >&2
      return 0
    fi
  fi

  # Installation failed - emit blocking JSON for Stop hooks, error for others
  cat >&2 << 'EOF'
HOOK ERROR: jq is required but not installed and auto-install failed.

To fix, run one of:
  macOS:  brew install jq
  Ubuntu: sudo apt install jq
  Or run: make setup

EOF

  # Return error - caller decides how to handle
  return 1
}

# Ensure yq is available (NON-FATAL - hooks should have grep fallbacks)
require_yq() {
  if command -v yq &>/dev/null; then
    return 0
  fi

  # Attempt to install yq automatically
  if [[ "$(uname -s)" == "Darwin" ]]; then
    brew install yq >/dev/null 2>&1 && return 0
  elif [[ "$(uname -s)" == "Linux" ]]; then
    sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 2>/dev/null \
      && sudo chmod +x /usr/local/bin/yq 2>/dev/null \
      && return 0
  fi

  # yq not available - caller should use grep fallback
  return 1
}

# Ensure curl is available (NON-FATAL - used for API calls)
require_curl() {
  if command -v curl &>/dev/null; then
    return 0
  fi

  # Attempt to install curl automatically
  if [[ "$(uname -s)" == "Darwin" ]]; then
    brew install curl >/dev/null 2>&1 && return 0
  elif [[ "$(uname -s)" == "Linux" ]]; then
    if sudo apt-get update -qq && sudo apt-get install -y -qq curl >/dev/null 2>&1; then
      return 0
    fi
  fi

  # curl not available
  return 1
}

# =============================================================================
# JSON OUTPUT HELPERS
# =============================================================================

# Output a blocking decision (for Stop hooks)
block_with_reason() {
  local reason="$1"
  cat << EOF
{
  "decision": "block",
  "reason": "$reason"
}
EOF
}

# Output an approval decision (for Stop hooks)
approve() {
  echo '{"decision": "approve"}'
}

# Output a fatal error and exit (when jq is missing)
fatal_missing_jq() {
  local hook_name="${1:-unknown}"
  cat << EOF
{
  "decision": "block",
  "reason": "HOOK ERROR ($hook_name): jq is required but not installed. Run 'make setup' or 'brew install jq' to fix."
}
EOF
  exit 0
}

# =============================================================================
# PATH HELPERS
# =============================================================================

# Get the hooks directory path
get_hooks_dir() {
  echo "${CLAUDE_PROJECT_DIR}/.claude/hooks"
}

# Get state file path with session ID
get_state_file() {
  local prefix="$1"
  local session_id="$2"
  echo "$(get_hooks_dir)/${prefix}-${session_id}.json"
}
