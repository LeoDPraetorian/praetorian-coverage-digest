#!/bin/bash
# Capture Agent Result Hook
# PostToolUse hook for Task tool - captures agent results and updates feedback loop state
#
# Parses agent type and result markers from Task output to track:
# - Which agents have run (reviewer, test-lead, tester)
# - Whether they passed or failed (via result markers)
# - Issues/failures for feedback to next iteration

set -uo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (fatal if missing)
if ! require_jq; then
  echo "Hook error: jq required but not installed" >&2
  exit 0
fi

# Read hook input from stdin
input=$(cat)

# Extract tool info and session ID
tool_name=$(echo "$input" | jq -r '.tool_name // ""')
session_id=$(echo "$input" | jq -r '.session_id // "default"')

# Only process Task tool calls
if [[ "$tool_name" != "Task" ]]; then
  exit 0
fi

# State file location (session-specific to avoid cross-terminal conflicts)
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/hooks/feedback-loop-state-${session_id}.json"

# If no feedback loop is active, nothing to track
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Check if feedback loop is active
is_active=$(jq -r '.active // false' "$STATE_FILE" 2>/dev/null)
if [[ "$is_active" != "true" ]]; then
  exit 0
fi

# Extract agent type from task input
subagent_type=$(echo "$input" | jq -r '.tool_input.subagent_type // ""')

# Extract task output from the correct path
# Claude Code stores agent text output in .tool_response.content[].text
# Concatenate all text content blocks into a single output string
task_output=$(echo "$input" | jq -r '
  .tool_response.content // []
  | map(select(.type == "text") | .text)
  | join("\n")
')

# Fallback to legacy paths if tool_response doesn't exist (for backwards compatibility)
if [[ -z "$task_output" || "$task_output" == "null" ]]; then
  task_output=$(echo "$input" | jq -r '.tool_output // .tool_result // ""')
fi

# Skip if no agent type
[[ -z "$subagent_type" ]] && exit 0

# --- Determine phase, domain, and parse result ---

phase=""
domain=""
status="UNKNOWN"
issues_json="[]"

# Extract domain from agent type (e.g., backend-reviewer -> backend)
get_domain_from_agent() {
  local agent="$1"
  case "$agent" in
    backend-*) echo "backend" ;;
    python-*) echo "python" ;;  # If python agents exist in future, map to python domain
    frontend-*) echo "frontend" ;;
    tool-*) echo "mcp_tools" ;;
    capability-*) echo "capabilities" ;;
    test-lead)
      # test-lead is shared across domains, get first incomplete domain
      jq -r '.modified_domains[0] // "backend"' "$STATE_FILE"
      ;;
    *) echo "backend" ;;  # default fallback
  esac
}

case "$subagent_type" in
  *-reviewer)
    phase="review"
    domain=$(get_domain_from_agent "$subagent_type")
    # Check for result markers
    if echo "$task_output" | grep -q "REVIEW_APPROVED"; then
      status="PASS"
    elif echo "$task_output" | grep -q "REVIEW_REJECTED"; then
      status="FAIL"
      # Try to extract issues (lines after "Issues:" or "### Issues")
      issues=$(echo "$task_output" | sed -n '/[Ii]ssues/,/^##/p' | grep -E '^\s*-' | sed 's/^\s*-\s*//' | head -10)
      if [[ -n "$issues" ]]; then
        issues_json=$(echo "$issues" | jq -R -s 'split("\n") | map(select(length > 0))')
      fi
    else
      # Fail-closed: no markers means we can't verify success
      status="FAIL"
      issues_json='["Agent did not output REVIEW_APPROVED or REVIEW_REJECTED marker"]'
    fi
    ;;

  test-lead)
    phase="test_planning"
    domain=$(get_domain_from_agent "$subagent_type")
    if echo "$task_output" | grep -q "TEST_PLAN_READY"; then
      status="PASS"
    elif echo "$task_output" | grep -q "TEST_PLAN_BLOCKED"; then
      status="FAIL"
    else
      # Fail-closed: no markers means we can't verify success
      status="FAIL"
      issues_json='["Agent did not output TEST_PLAN_READY or TEST_PLAN_BLOCKED marker"]'
    fi
    ;;

  *-tester)
    phase="testing"
    domain=$(get_domain_from_agent "$subagent_type")
    if echo "$task_output" | grep -q "TESTS_PASSED"; then
      status="PASS"
    elif echo "$task_output" | grep -q "TESTS_FAILED"; then
      status="FAIL"
      # Try to extract failures
      failures=$(echo "$task_output" | sed -n '/[Ff]ailures\|[Ff]ailed/,/^##/p' | grep -E '^\s*-' | sed 's/^\s*-\s*//' | head -10)
      if [[ -n "$failures" ]]; then
        issues_json=$(echo "$failures" | jq -R -s 'split("\n") | map(select(length > 0))')
      fi
    else
      # Check for common test failure patterns first
      if echo "$task_output" | grep -qE '(FAIL|FAILED|failing|failed).*test'; then
        status="FAIL"
        issues_json='["Test failure detected in output (no explicit marker)"]'
      else
        # Fail-closed: no markers means we can't verify success
        status="FAIL"
        issues_json='["Agent did not output TESTS_PASSED or TESTS_FAILED marker"]'
      fi
    fi
    ;;

  *)
    # Not a phase we track (developer, lead, etc.)
    exit 0
    ;;
esac

# --- Update state file ---

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Update the appropriate phase for this domain
# Uses domain_phases structure for multi-domain tracking
jq --arg domain "$domain" \
   --arg phase "$phase" \
   --arg status "$status" \
   --arg agent "$subagent_type" \
   --arg timestamp "$timestamp" \
   --argjson issues "$issues_json" \
   '.domain_phases[$domain][$phase] = {
      "status": $status,
      "agent": $agent,
      "ran_at": $timestamp,
      "issues": $issues
    }' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null

if [[ $? -eq 0 ]]; then
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

# --- Update consecutive failure counters (global, not per-domain) ---

if [[ "$phase" == "review" && "$status" == "FAIL" ]]; then
  jq '.consecutive_review_failures = (.consecutive_review_failures // 0) + 1' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
elif [[ "$phase" == "review" && "$status" == "PASS" ]]; then
  jq '.consecutive_review_failures = 0' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

if [[ "$phase" == "testing" && "$status" == "FAIL" ]]; then
  jq '.consecutive_test_failures = (.consecutive_test_failures // 0) + 1' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
elif [[ "$phase" == "testing" && "$status" == "PASS" ]]; then
  jq '.consecutive_test_failures = 0' "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"
fi

exit 0
