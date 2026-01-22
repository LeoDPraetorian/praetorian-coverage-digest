#!/usr/bin/env bash
# SessionStart hook for Chariot
# Injects using-skills content so Claude uses skill-search CLI + Read tool pattern
# Resets state files for fresh session
# Starts Serena in SSE mode for persistent session-long connection

set -euo pipefail

# Set SERENA_HOME to project-local config (version-controlled, shared between developers)
SCRIPT_DIR_EARLY="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export SERENA_HOME="${SCRIPT_DIR_EARLY}/../.serena"

# =============================================================================
# STATE FILE CLEANUP (fresh session = fresh state)
# =============================================================================
# Reset iteration and modification state for new sessions
# This ensures limits are enforced per-session, not accumulated across sessions
#
# Files reset (session-specific patterns to avoid cross-terminal conflicts):
#   - iteration-state-*.json: Iteration counter for iterating-to-completion
#   - modification-state-*.json: File modification tracking for quality gates
#   - feedback-loop-state-*.json: Inter-phase feedback loop state
#   - escalation-context-*.json: Escalation context for external LLM analysis
#
# Note: Using wildcards to clean ALL session state files since each session
# gets a unique ID. Old session files are always stale.
# =============================================================================

HOOKS_DIR="${SCRIPT_DIR_EARLY}"
rm -f "${HOOKS_DIR}"/iteration-state-*.json 2>/dev/null || true
rm -f "${HOOKS_DIR}"/modification-state-*.json 2>/dev/null || true
rm -f "${HOOKS_DIR}"/feedback-loop-state-*.json 2>/dev/null || true
rm -f "${HOOKS_DIR}"/escalation-context-*.json 2>/dev/null || true
# Also clean legacy non-session-specific files
rm -f "${HOOKS_DIR}/iteration-state.json" 2>/dev/null || true
rm -f "${HOOKS_DIR}/modification-state.json" 2>/dev/null || true
rm -f "${HOOKS_DIR}/feedback-loop-state.json" 2>/dev/null || true
rm -f "${HOOKS_DIR}/escalation-context.json" 2>/dev/null || true

# =============================================================================
# SERENA DISABLED (2026-01-04)
# Reason: Performance issues in super-repo (Go queries timeout, added complexity)
# To re-enable: Uncomment the section below
# =============================================================================

# # Serena SSE configuration
# SERENA_SSE_PORT=9121
# export SERENA_SSE_PORT
#
# # Determine default project path (use chariot UI for TypeScript-only)
# PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "${SCRIPT_DIR_EARLY}/../.." && pwd)}"
# SERENA_DEFAULT_PROJECT="${PROJECT_ROOT}/modules/chariot/ui"
#
# # Cross-platform port check function (works on macOS and Linux)
# check_port() {
#     local port=$1
#     nc -z -w1 localhost "$port" 2>/dev/null
#     return $?
# }
#
# # Check if Serena is already running on port 9121
# if ! check_port "${SERENA_SSE_PORT}"; then
#     SERENA_LOG="${SERENA_HOME}/serena-sse.log"
#     mkdir -p "$(dirname "${SERENA_LOG}")"
#
#     # Start Serena with Streamable HTTP transport
#     nohup uvx --from git+https://github.com/oraios/serena \
#         serena start-mcp-server \
#         --context claude-code \
#         --project "${SERENA_DEFAULT_PROJECT}" \
#         --transport streamable-http \
#         --port "${SERENA_SSE_PORT}" \
#         >> "${SERENA_LOG}" 2>&1 &
#
#     # Wait for server to start
#     for i in {1..30}; do
#         if check_port "${SERENA_SSE_PORT}"; then
#             break
#         fi
#         sleep 0.1
#     done
# fi

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
    "additionalContext": "<EXTREMELY_IMPORTANT>\nYou have superpowers (via Chariot).\n\n**Below is your 'using-skills' skill - READ THIS CAREFULLY. It explains the HYBRID skill system:**\n- Core skills (~25) in .claude/skills/ -> Use Skill tool\n- Library skills (~120) in .claude/skill-library/ -> Use Read tool\n\n${using_skills_escaped}\n\n\n</EXTREMELY_IMPORTANT>"
  }
}
EOF

exit 0
