#!/usr/bin/env bash
# SessionStart hook for Chariot
# Injects using-skills content so Claude uses skill-search CLI + Read tool pattern

set -euo pipefail

# Use CLAUDE_PROJECT_DIR if available (set by Claude Code), fallback to script-relative path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
CORE_SKILLS="${PROJECT_ROOT}/.claude/skills"

# Read using-skills content from core skills (not library)
using_skills_content=$(cat "${CORE_SKILLS}/using-skills/SKILL.md" 2>&1 || echo "Error reading using-skills skill")

# Escape outputs for JSON
using_skills_escaped=$(echo "$using_skills_content" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

# Output context injection as JSON
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\nYou have superpowers (via Chariot).\n\n**Below is your 'using-skills' skill - READ THIS CAREFULLY. It explains the HYBRID skill system:**\n- Core skills (~25) in .claude/skills/ -> Use Skill tool\n- Library skills (~120) in .claude/skill-library/ -> Use skill-search CLI + Read tool\n\n${using_skills_escaped}\n\n\n</EXTREMELY_IMPORTANT>"
  }
}
EOF

exit 0
