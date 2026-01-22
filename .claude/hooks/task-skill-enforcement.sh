#!/bin/bash
# Task Skill Enforcement Hook (PostToolUse)
#
# Checks Task output for skill compliance documentation.
# Warns if agent didn't document which skills it invoked.
#
# This complements capture-agent-result.sh (which tracks PASS/FAIL for
# feedback loops) by checking skill invocation compliance.

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

# Check for skill documentation patterns
has_skills_documented=false

# Look for common skill documentation patterns
if echo "$task_output" | grep -qiE "(skills_invoked|skills invoked|skills used|invoked skills|SKILL.md)"; then
    has_skills_documented=true
fi

# Also check for explicit skill mentions
if echo "$task_output" | grep -qE "(developing-with-tdd|verifying-before-completion|brainstorming|debugging-systematically)"; then
    has_skills_documented=true
fi

# If no skill documentation found, provide feedback
if [[ "$has_skills_documented" == "false" ]]; then
    # Check if this was a simple task (Explore agent, quick lookup)
    # Don't warn for these
    if echo "$task_output" | grep -qiE "(Explore agent|file search|glob result|grep result)"; then
        exit 0
    fi

    # Output warning - exit 2 feeds stderr to Claude
    cat >&2 << 'EOF'
SKILL COMPLIANCE CHECK: Agent output doesn't document skills invoked.

If this was a development/review/test task, verify the agent used required skills.
Check: Did you include MANDATORY SKILLS in the Task prompt?

Expected in agent output:
  Skills invoked: [list of skills used]
  or
  metadata.skills_invoked: [array]
EOF
    exit 2
fi

exit 0
