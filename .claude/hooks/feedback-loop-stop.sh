#!/bin/bash
# Feedback Loop Stop Hook
# Enforces inter-phase feedback loop: Implementation → Review → Test
# Replaces quality-gate-stop.sh and iteration-limit-stop.sh with unified enforcement
#
# Uses state from:
# - feedback-loop-state.json (phases, iterations, pass/fail status)
# - orchestration-limits.yaml (max_feedback_iterations, consecutive failure limits)

set -uo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (fatal if missing - emit approve to not block on setup issues)
if ! require_jq; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Read hook input
input=$(cat)
transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')
session_id=$(echo "$input" | jq -r '.session_id // "default"')

# File locations (session-specific to avoid cross-terminal conflicts)
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/hooks/feedback-loop-state-${session_id}.json"
CONFIG_FILE="${CLAUDE_PROJECT_DIR}/.claude/config/orchestration-limits.yaml"

# =============================================================================
# SUBAGENT DETECTION: Developer subagents should exit freely
# =============================================================================
# When a developer subagent (frontend-developer, backend-developer, etc.) tries
# to stop, we allow it immediately. The feedback loop enforcement is the
# ORCHESTRATOR's responsibility, not the subagent's.
#
# This prevents subagents from getting stuck in review/test loops when they
# should just complete their task and return to the orchestrator.

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  # Extract subagent_type from transcript
  subagent_type=$(head -20 "$transcript_path" 2>/dev/null | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"subagent_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

  if [[ -n "$subagent_type" ]]; then
    case "$subagent_type" in
      frontend-developer|backend-developer|integration-developer|capability-developer|tool-developer)
        # Developer subagent - allow exit immediately
        echo '{"decision": "approve"}'
        exit 0
        ;;
    esac
  fi
fi
# =============================================================================

# --- Helper: Read config value ---
read_config_value() {
  local key="$1"
  local default="$2"

  if [[ -f "$CONFIG_FILE" ]]; then
    # Try yq first
    if command -v yq &> /dev/null; then
      value=$(yq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null)
      if [[ -n "$value" && "$value" != "null" ]]; then
        echo "$value"
        return
      fi
    fi

    # Fallback: grep-based extraction
    local simple_key="${key##*.}"
    value=$(grep -E "^\s*${simple_key}:" "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/.*:\s*//' | sed 's/#.*//' | tr -d ' ')
    if [[ -n "$value" ]]; then
      echo "$value"
      return
    fi
  fi

  echo "$default"
}

# --- Step 1: Check if feedback loop is active ---

if [[ ! -f "$STATE_FILE" ]]; then
  # No feedback loop active, allow exit
  echo '{"decision": "approve"}'
  exit 0
fi

is_active=$(jq -r '.active // false' "$STATE_FILE" 2>/dev/null)
if [[ "$is_active" != "true" ]]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# --- Step 2: Check for orchestration workflow bypass ---

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  if grep -qE '(/feature|/capability|/fingerprintx|/integration|orchestrating-feature|orchestrating-capability|orchestrating-fingerprintx|orchestrating-integration)' "$transcript_path" 2>/dev/null; then
    # Orchestration workflow handles loop internally
    echo '{"decision": "approve"}'
    exit 0
  fi
fi

# --- Step 3: Read current state ---

iteration=$(jq -r '.iteration // 1' "$STATE_FILE")
modified_domains_json=$(jq -c '.modified_domains // []' "$STATE_FILE")
modified_domains_display=$(jq -r '.modified_domains // [] | join(", ")' "$STATE_FILE")

consecutive_review_failures=$(jq -r '.consecutive_review_failures // 0' "$STATE_FILE")
consecutive_test_failures=$(jq -r '.consecutive_test_failures // 0' "$STATE_FILE")

# --- Step 4: Read config limits ---

max_iterations=$(read_config_value '.inter_phase.max_feedback_iterations' '5')
max_review_failures=$(read_config_value '.inter_phase.max_consecutive_review_failures' '3')
max_test_failures=$(read_config_value '.inter_phase.max_consecutive_test_failures' '3')

# --- Step 5: Agent selection helpers ---

get_reviewer_agent() {
  local domain="$1"
  case "$domain" in
    backend) echo "backend-reviewer" ;;
    frontend) echo "frontend-reviewer" ;;
    mcp_tools) echo "tool-reviewer" ;;
    capabilities) echo "capability-reviewer" ;;
    integrations) echo "integration-reviewer" ;;  # Integrations use integration-reviewer
    python) echo "" ;;  # No python agent - Claude handles directly
    *) echo "" ;;  # Unknown domains have no agent
  esac
}

get_tester_agent() {
  local domain="$1"
  case "$domain" in
    backend) echo "backend-tester" ;;
    frontend) echo "frontend-tester" ;;
    mcp_tools) echo "tool-tester" ;;
    capabilities) echo "capability-tester" ;;
    integrations) echo "backend-tester" ;;  # Integrations use backend-tester
    python) echo "" ;;  # No python agent - Claude handles directly
    *) echo "" ;;  # Unknown domains have no agent
  esac
}

# Get domain phase status
get_domain_phase_status() {
  local domain="$1"
  local phase="$2"
  jq -r ".domain_phases[\"$domain\"][\"$phase\"].status // \"NOT_RUN\"" "$STATE_FILE"
}

get_domain_phase_issues() {
  local domain="$1"
  local phase="$2"
  jq -r ".domain_phases[\"$domain\"][\"$phase\"].issues // [] | join(\"; \")" "$STATE_FILE"
}

# --- Step 6: Check consecutive failure limits ---

# Helper: Write escalation context for escalation-advisor.sh
write_escalation_context() {
  local reason="$1"
  cat > "${CLAUDE_PROJECT_DIR}/.claude/hooks/escalation-context-${session_id}.json" << CONTEXT_EOF
{
  "reason": "$reason",
  "iteration": $iteration,
  "max_iterations": $max_iterations,
  "consecutive_review_failures": $consecutive_review_failures,
  "consecutive_test_failures": $consecutive_test_failures,
  "modified_domains": $(jq -c '.modified_domains // []' "$STATE_FILE"),
  "domain_phases": $(jq -c '.domain_phases // {}' "$STATE_FILE")
}
CONTEXT_EOF
}

if [[ "$consecutive_review_failures" -ge "$max_review_failures" ]]; then
  write_escalation_context "consecutive_review_failures"
  echo "ESCALATION REQUIRED: Review has failed $consecutive_review_failures consecutive times on the same issues. The reviewer keeps finding the same problems. Options: 1) Get user guidance on approach, 2) Accept current state with known issues, 3) Try a different implementation strategy." >&2
  exit 2
fi

if [[ "$consecutive_test_failures" -ge "$max_test_failures" ]]; then
  write_escalation_context "consecutive_test_failures"
  echo "ESCALATION REQUIRED: Tests have failed $consecutive_test_failures consecutive times. The same tests keep failing. Options: 1) Get user guidance, 2) Skip failing tests with justification, 3) Refactor the approach." >&2
  exit 2
fi

# --- Step 7: Check iteration limit ---

if [[ "$iteration" -gt "$max_iterations" ]]; then
  write_escalation_context "max_iterations_exceeded"
  echo "ESCALATION REQUIRED: Feedback loop has run $iteration iterations (max: $max_iterations). Unable to achieve passing review AND tests. Ask user how to proceed: 1) Continue with more iterations, 2) Accept current state, 3) Abandon changes." >&2
  exit 2
fi

# --- Step 8: Multi-domain phase checking ---
# Loop through ALL modified domains and check each one's phases
# Block and request the first incomplete domain/phase found

all_domains_passed=true
blocking_reason=""

# Get list of modified domains
modified_domains_array=$(jq -r '.modified_domains[]' "$STATE_FILE" 2>/dev/null)

for domain in $modified_domains_array; do
  reviewer_agent=$(get_reviewer_agent "$domain")
  tester_agent=$(get_tester_agent "$domain")

  # Skip domains without agents (e.g., python) - Claude handles directly
  if [[ -z "$reviewer_agent" ]]; then
    continue
  fi

  review_status=$(get_domain_phase_status "$domain" "review")
  test_planning_status=$(get_domain_phase_status "$domain" "test_planning")
  testing_status=$(get_domain_phase_status "$domain" "testing")

  # Check review phase for this domain
  if [[ "$review_status" == "NOT_RUN" ]]; then
    all_domains_passed=false
    cat << EOF
{
  "decision": "block",
  "reason": "FEEDBACK LOOP - Iteration $iteration of $max_iterations. Modified domains: $modified_domains_display. DOMAIN [$domain] - PHASE 1 REQUIRED: Spawn $reviewer_agent to review the $domain changes."
}
EOF
    exit 0
  fi

  if [[ "$review_status" == "FAIL" ]]; then
    all_domains_passed=false
    review_issues=$(get_domain_phase_issues "$domain" "review")
    echo "FEEDBACK LOOP - Iteration $iteration of $max_iterations

DOMAIN [$domain] - REVIEW FAILED. Issues found:
$review_issues

Fix the issues above, then spawn $reviewer_agent again for re-review." >&2
    exit 2
  fi

  # Check test planning phase for this domain
  if [[ "$test_planning_status" == "NOT_RUN" ]]; then
    all_domains_passed=false
    echo "FEEDBACK LOOP - Iteration $iteration of $max_iterations

DOMAIN [$domain] - Review PASSED. Now proceed to testing.

PHASE 2 REQUIRED: Spawn test-lead to plan the test strategy for $domain.

After planning completes, test-lead should output:
- TEST_PLAN_READY (proceed to testing)
- TEST_PLAN_BLOCKED (if unable to plan tests)" >&2
    exit 2
  fi

  if [[ "$test_planning_status" == "FAIL" ]]; then
    all_domains_passed=false
    echo "FEEDBACK LOOP - Iteration $iteration of $max_iterations

DOMAIN [$domain] - Test planning blocked. Resolve the blocking issue, then spawn test-lead again." >&2
    exit 2
  fi

  # Check testing phase for this domain
  if [[ "$testing_status" == "NOT_RUN" ]]; then
    all_domains_passed=false
    echo "FEEDBACK LOOP - Iteration $iteration of $max_iterations

DOMAIN [$domain] - Review PASSED. Test plan READY.

PHASE 3 REQUIRED: Spawn $tester_agent to run the $domain tests.

After testing completes, tester should output:
- TESTS_PASSED (all tests pass)
- TESTS_FAILED (with list of failures)" >&2
    exit 2
  fi

  if [[ "$testing_status" == "FAIL" ]]; then
    all_domains_passed=false
    test_failures=$(get_domain_phase_issues "$domain" "testing")

    # Tests failed for this domain - increment iteration and reset ALL domain phases
    new_iteration=$((iteration + 1))

    # Reset all phases for all domains
    jq --argjson iter "$new_iteration" \
       '.iteration = $iter | .domain_phases |= with_entries(.value.review.status = "NOT_RUN" | .value.test_planning.status = "NOT_RUN" | .value.testing.status = "NOT_RUN")' \
       "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE"

    echo "FEEDBACK LOOP - Starting iteration $new_iteration of $max_iterations

DOMAIN [$domain] - TESTS FAILED. Failures:
$test_failures

Fix the failing tests, then go through the full cycle again FOR ALL DOMAINS:
$(for d in $modified_domains_array; do
    echo "  - $d: $(get_reviewer_agent "$d") → test-lead → $(get_tester_agent "$d")"
  done)" >&2
    exit 2
  fi
done

# --- Step 9: All domains passed all phases! ---

if [[ "$all_domains_passed" == "true" ]]; then
  # Clean up state file
  rm -f "$STATE_FILE"

  cat << EOF
{
  "decision": "approve"
}
EOF
  exit 0
fi

# Fallback (shouldn't reach here)
echo '{"decision": "approve"}'
exit 0
