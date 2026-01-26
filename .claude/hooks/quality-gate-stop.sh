#!/bin/bash
# Quality Gate Stop Hook
# Enforces review/test cycle for ad-hoc code changes
# Uses exit code 2 + stderr to make Claude continue working

set -uo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (approve if missing to not block on setup issues)
if ! require_jq; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Read hook input from stdin
input=$(cat)

# Extract transcript path and session ID
transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')
session_id=$(echo "$input" | jq -r '.session_id // "default"')

# =============================================================================
# Step 0a: Check for untracked agent output files outside .claude/.output/
# =============================================================================
# Defense-in-depth: catch files that leaked to wrong locations

get_wrong_location_files() {
    local git_dir="$1"
    git -C "$git_dir" ls-files --others --exclude-standard 2>/dev/null | \
        grep -E '\.md$' | \
        grep -vE '^\.claude/\.output/' | \
        grep -vE '^\.claude/docs/' | \
        grep -vE '^\.feature-development/' | \
        grep -vE '^\.worktrees/' | \
        grep -vE '^modules/' | \
        grep -vE '^docs/' | \
        grep -vE '^(README|CLAUDE|CHANGELOG|CONTRIBUTING|LICENSE)' || true
}

current_git_root=$(git -C "${CLAUDE_PROJECT_DIR}" rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR}")
wrong_files=$(get_wrong_location_files "$current_git_root")

# Also check main repo if we're in a worktree
git_common_dir=$(git -C "$current_git_root" rev-parse --git-common-dir 2>/dev/null || echo "")
if [[ -n "$git_common_dir" ]]; then
    main_worktree=$(cd "$current_git_root" && cd "$(dirname "$git_common_dir")" 2>/dev/null && pwd || echo "")
    if [[ -n "$main_worktree" && "$main_worktree" != "$current_git_root" && -d "$main_worktree" ]]; then
        main_wrong=$(get_wrong_location_files "$main_worktree")
        if [[ -n "$main_wrong" ]]; then
            wrong_files="${wrong_files}
MAIN: ${main_wrong}"
        fi
    fi
fi

if [[ -n "$wrong_files" ]]; then
    file_list=$(echo "$wrong_files" | head -5 | tr '\n' ', ' | sed 's/,$//')
    block_with_reason "UNTRACKED AGENT OUTPUT: Found .md files outside .claude/.output/: [$file_list]. Move them to .claude/.output/agents/{timestamp}-{slug}/ before completing."
fi

# State file for tracked modifications (session-specific to avoid cross-terminal conflicts)
STATE_FILE="${CLAUDE_PROJECT_DIR}/.claude/hooks/modification-state-${session_id}.json"

# Feedback loop state file (primary enforcement)
FEEDBACK_STATE="${CLAUDE_PROJECT_DIR}/.claude/hooks/feedback-loop-state-${session_id}.json"

# --- Step 0: Defer to feedback-loop-stop.sh if active ---
# feedback-loop-stop.sh is the primary enforcement mechanism with richer state
# (phase tracking, PASS/FAIL status, iterations, consecutive failures).
# This hook only acts as a safety net when state tracking fails.

if [[ -f "$FEEDBACK_STATE" ]]; then
  active=$(jq -r '.active // false' "$FEEDBACK_STATE" 2>/dev/null)
  if [[ "$active" == "true" ]]; then
    # Read state and return same block as feedback-loop-stop.sh
    # Get worst status across all domains (NOT_RUN > FAIL > PASS)
    review_status=$(jq -r '
      [.domain_phases | to_entries[].value.review.status // "NOT_RUN"] |
      if any(. == "NOT_RUN") then "NOT_RUN"
      elif any(. == "FAIL") then "FAIL"
      else "PASS" end
    ' "$FEEDBACK_STATE" 2>/dev/null || echo "NOT_RUN")
    if [[ "$review_status" == "NOT_RUN" ]]; then
      modified_domains=$(jq -r '.modified_domains | join(", ")' "$FEEDBACK_STATE" 2>/dev/null)
      # Determine reviewer based on domain (python has no agent - Claude handles directly)
      # Priority order matters: more specific domains first
      reviewer_agent=""
      case "$modified_domains" in
        *integrations*) reviewer_agent="integration-reviewer" ;;  # Integrations use integration-reviewer
        *capabilities*) reviewer_agent="capability-reviewer" ;;
        *backend*) reviewer_agent="backend-reviewer" ;;
        *frontend*) reviewer_agent="frontend-reviewer" ;;
        *mcp_tools*) reviewer_agent="tool-reviewer" ;;
        *python*) ;;  # No python agent exists - Claude handles directly
      esac
      # Only block if there's an agent to spawn
      if [[ -n "$reviewer_agent" ]]; then
        cat << EOF
{
  "decision": "block",
  "reason": "QUALITY GATE: Code modified in $modified_domains. Spawn $reviewer_agent before stopping."
}
EOF
        exit 0
      fi
    fi
    # Otherwise exit silently (let feedback-loop-stop.sh handle)
    exit 0
  fi
fi

# --- Step 1: Check for significant code modifications ---

has_modifications=false
modified_domains=""

if [[ -f "$STATE_FILE" ]]; then
  # Check each domain for modifications
  for domain in backend frontend python mcp_tools capabilities; do
    count=$(jq -r ".${domain} | length" "$STATE_FILE" 2>/dev/null || echo "0")
    if [[ "$count" -gt 0 ]]; then
      has_modifications=true
      if [[ -n "$modified_domains" ]]; then
        modified_domains="${modified_domains}, ${domain}"
      else
        modified_domains="$domain"
      fi
    fi
  done
fi

# If no modifications tracked, allow stop
if [[ "$has_modifications" == "false" ]]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# --- Step 2: Check for orchestration workflow ---

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  # Check for orchestration skill invocations
  if grep -qE '(/feature|/capability|/fingerprintx|/integration|/bugfix|orchestrating-feature|orchestrating-capability|orchestrating-fingerprintx|orchestrating-integration)' "$transcript_path" 2>/dev/null; then
    # Orchestration workflow handles review/test internally
    echo '{"decision": "approve"}'
    exit 0
  fi
fi

# --- Step 3: Check if reviewer and tester agents ran ---

missing_agents=""

# Function to check and add missing agent
check_agent() {
  local agent_type="$1"
  if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
    if ! grep -q "subagent_type.*${agent_type}" "$transcript_path" 2>/dev/null; then
      if [[ -n "$missing_agents" ]]; then
        missing_agents="${missing_agents}, ${agent_type}"
      else
        missing_agents="$agent_type"
      fi
    fi
  else
    # No transcript, assume agents missing
    if [[ -n "$missing_agents" ]]; then
      missing_agents="${missing_agents}, ${agent_type}"
    else
      missing_agents="$agent_type"
    fi
  fi
}

# Check for required agents based on modified domains
if [[ "$modified_domains" == *"backend"* ]]; then
  check_agent "backend-reviewer"
  check_agent "backend-tester"
fi

if [[ "$modified_domains" == *"frontend"* ]]; then
  check_agent "frontend-reviewer"
  check_agent "frontend-tester"
fi

# Python has no dedicated agent - Claude handles directly
# if [[ "$modified_domains" == *"python"* ]]; then
#   No python-developer/reviewer/tester agents exist
# fi

if [[ "$modified_domains" == *"mcp_tools"* ]]; then
  check_agent "tool-reviewer"
  check_agent "tool-tester"
fi

if [[ "$modified_domains" == *"capabilities"* ]]; then
  check_agent "capability-reviewer"
  check_agent "capability-tester"
fi

if [[ "$modified_domains" == *"integrations"* ]]; then
  # Integrations use integration-reviewer (P0 compliance) / backend-tester (Go code)
  check_agent "integration-reviewer"
  check_agent "backend-tester"
fi

# --- Step 4: Decision ---

if [[ -z "$missing_agents" ]]; then
  # All required agents ran
  exit 0
fi

# Output to stderr and exit 2 to make Claude continue (documented approach)
cat >&2 << EOF
AGENTS REQUIRED: Code was modified in domains: ${modified_domains}.

You MUST spawn these agents before completing:
${missing_agents}

Workflow:
1. First spawn the reviewer agent(s) to review the changes
2. Then spawn the tester agent(s) to run tests
3. Only after both complete can you finish

Do NOT just run commands like 'go test' or 'npm run lint'.
You must use the specialized reviewer and tester agents.

Continue working now - spawn the required agents.
EOF

exit 2
