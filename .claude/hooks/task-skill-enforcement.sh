#!/bin/bash
# Task Skill Enforcement Hook (PostToolUse)
#
# Checks Task output for:
# 1. Skill compliance documentation (skills_invoked)
# 2. Output location validation (must be .claude/.output/, not repo root)
# 3. persisting-agent-outputs skill invocation for developer/reviewer/tester agents
#
# This complements capture-agent-result.sh (which tracks PASS/FAIL for
# feedback loops) by checking skill invocation and output persistence compliance.

set -euo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (exit silently if missing)
if ! require_jq; then
  exit 0
fi

input=$(cat)

# Extract task output
task_output=$(echo "$input" | jq -r '.tool_output // ""' 2>/dev/null || echo "")

# Skip if no output (shouldn't happen)
if [[ -z "$task_output" ]]; then
    exit 0
fi

# Skip simple tasks (Explore agent, quick lookups)
if echo "$task_output" | grep -qiE "(Explore agent|file search|glob result|grep result|general-purpose agent)"; then
    exit 0
fi

warnings=""

# =============================================================================
# CHECK 1: Output Location Validation
# =============================================================================
# Extract feature_directory from metadata JSON block in agent output

feature_directory=""
# Try to extract from JSON metadata block
if echo "$task_output" | grep -q '"feature_directory"'; then
    # Extract the value after "feature_directory": "
    feature_directory=$(echo "$task_output" | grep -oE '"feature_directory":\s*"[^"]+"' | head -1 | sed 's/.*"feature_directory":[[:space:]]*"//' | sed 's/"$//')
fi

if [[ -n "$feature_directory" ]]; then
    # Check if it's the repo root (WRONG) instead of .claude/.output/ (CORRECT)
    # Common wrong patterns: absolute paths to repo root, or just the repo name
    if [[ "$feature_directory" == "${CLAUDE_PROJECT_DIR}" ]] || \
       [[ "$feature_directory" == "${CLAUDE_PROJECT_DIR}/" ]] || \
       [[ "$feature_directory" =~ ^/.*chariot-development-platform ]] && [[ ! "$feature_directory" =~ \.claude/\.output ]]; then
        warnings="${warnings}
OUTPUT LOCATION ERROR: Agent wrote to repo root instead of .claude/.output/
  feature_directory: $feature_directory
  Expected: .claude/.output/agents/{timestamp}-{slug}/ or similar

  The agent claimed to invoke persisting-agent-outputs but didn't follow the discovery protocol.
  Files at repo root clutter the project and violate output persistence rules.
"
    fi

    # Also warn if it's a relative path that doesn't start with .claude/.output
    if [[ ! "$feature_directory" =~ ^\.claude/\.output ]] && [[ ! "$feature_directory" =~ ^/ ]]; then
        # It's a relative path - check if it's valid
        if [[ ! "$feature_directory" =~ ^\.claude/\.output ]]; then
            warnings="${warnings}
OUTPUT LOCATION WARNING: Agent output path may be incorrect
  feature_directory: $feature_directory
  Expected paths start with: .claude/.output/
"
        fi
    fi
fi

# =============================================================================
# CHECK 2: persisting-agent-outputs Skill Invocation
# =============================================================================
# For developer/reviewer/tester agents, persisting-agent-outputs is MANDATORY

agent_type=""
if echo "$task_output" | grep -qiE '"agent":\s*"[^"]*-developer"'; then
    agent_type="developer"
elif echo "$task_output" | grep -qiE '"agent":\s*"[^"]*-reviewer"'; then
    agent_type="reviewer"
elif echo "$task_output" | grep -qiE '"agent":\s*"[^"]*-tester"'; then
    agent_type="tester"
elif echo "$task_output" | grep -qiE '"agent":\s*"[^"]*-lead"'; then
    agent_type="lead"
fi

if [[ -n "$agent_type" ]]; then
    # Check if persisting-agent-outputs was invoked
    if ! echo "$task_output" | grep -qE 'persisting-agent-outputs'; then
        warnings="${warnings}
SKILL COMPLIANCE WARNING: $agent_type agent didn't invoke persisting-agent-outputs
  This skill is MANDATORY for all developer/reviewer/tester/lead agents.
  Without it, output files may be written to wrong locations.

  Expected in metadata.skills_invoked: \"persisting-agent-outputs\"
"
    fi
fi

# =============================================================================
# CHECK 3: General Skill Documentation
# =============================================================================

has_skills_documented=false

# Look for common skill documentation patterns
if echo "$task_output" | grep -qiE "(skills_invoked|skills invoked|skills used|invoked skills|SKILL.md)"; then
    has_skills_documented=true
fi

# Also check for explicit skill mentions
if echo "$task_output" | grep -qE "(developing-with-tdd|verifying-before-completion|brainstorming|debugging-systematically)"; then
    has_skills_documented=true
fi

if [[ "$has_skills_documented" == "false" ]]; then
    warnings="${warnings}
SKILL COMPLIANCE CHECK: Agent output doesn't document skills invoked.

If this was a development/review/test task, verify the agent used required skills.
Expected in agent output:
  metadata.skills_invoked: [array of skill names]
"
fi

# =============================================================================
# OUTPUT WARNINGS
# =============================================================================

if [[ -n "$warnings" ]]; then
    cat >&2 << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENT COMPLIANCE ISSUES DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$warnings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION REQUIRED: If files were written to repo root, move them to .claude/.output/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
    exit 2
fi

exit 0
