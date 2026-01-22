#!/bin/bash
# Session Reminder Hook
#
# UserPromptSubmit hook that injects minimal skill reminder.
# Enforcement happens via PreToolUse (agent-first) and Stop (quality gates) hooks.

set -euo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (exit silently if missing - reminder is non-critical)
if ! require_jq; then
  exit 0
fi

# Read input to get session_id for state file lookup
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')

STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/feedback-loop-state-${session_id}.json"

# Build output - focused on skills since that's not enforced elsewhere
read -r -d '' reminder << 'EOF' || true
<session-reminder>
<EXTREMELY-IMPORTANT>
- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Gateway Skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "gateway-name"`

**ALWAYS read your gateway skills to locate task relevant skills. You MUST follow the gateway's instructions.** It tells you which library skills to load.

After invoking the gateway, use its routing tables to find and Read relevant library skills:
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

# Using Skills

## The Rule

**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.
IF YOU ARE THINKING/RATIONALIZING SKIPPING THE INCORPORATION OF ALL RELEVANTSKILLS, YOU ARE ABOUT TO FAIL.
NEVER RATIONALIZE SKIPPING SKILLS. I WILL CHECK AND REQUIRE YOU TO REDO YOUR WORK. YOU WILL BE WASTING BOTH OF OUR TIME!
</EXTREMELY-IMPORTANT>
</session-reminder>
EOF

# Add dynamic state if feedback loop is active
if [[ -f "$STATE_FILE" ]]; then
    iteration=$(jq -r '.iteration // 0' "$STATE_FILE" 2>/dev/null || echo "0")
    max_iter=$(jq -r '.max_iterations // 5' "$STATE_FILE" 2>/dev/null || echo "5")
    next_phase=$(jq -r '
        .phases | to_entries |
        map(select(.value.status == "NOT_RUN" or .value.status == null)) |
        .[0].key // "all-complete"
    ' "$STATE_FILE" 2>/dev/null || echo "unknown")

    reminder="$reminder
<active-feedback-loop>Iteration: $iteration/$max_iter | Next: $next_phase</active-feedback-loop>"
fi

# Escape for JSON
escaped=$(echo "$reminder" | jq -Rs '.')

cat << EOF
{
  "continue": true,
  "suppressOutput": false,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $escaped
  }
}
EOF

exit 0
