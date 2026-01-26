#!/bin/bash
# Output Location Enforcement Hook (SubagentStop)
#
# Comprehensive enforcement for agent output compliance:
# 1. Detects files written to wrong locations
# 2. Checks if agent invoked required skills (persisting-agent-outputs)
# 3. Identifies code changes made by non-compliant agent
# 4. Determines if safe to revert (no prior uncommitted changes)
# 5. Deletes invalid output and provides remediation instructions
#
# Handles: main repo, worktrees, orchestration, ad-hoc agents

set -euo pipefail

# Debug logging (disable in production by commenting out)
DEBUG_LOG="/tmp/subagent-stop-debug.log"
debug_log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$DEBUG_LOG"
}

debug_log "=== SubagentStop hook called ==="

# Source shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/hook-utils.sh" ]]; then
    source "${SCRIPT_DIR}/hook-utils.sh"
fi

CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
debug_log "CLAUDE_PROJECT_DIR: $CLAUDE_PROJECT_DIR"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

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

is_linked_worktree() {
    local git_dir="$1"
    local git_common_dir git_toplevel
    git_common_dir=$(git -C "$git_dir" rev-parse --git-common-dir 2>/dev/null || echo "")
    git_toplevel=$(git -C "$git_dir" rev-parse --show-toplevel 2>/dev/null || echo "")
    [[ -n "$git_common_dir" && -n "$git_toplevel" ]] || return 1
    git_common_dir=$(cd "$git_dir" && cd "$(dirname "$git_common_dir")" && pwd)
    [[ "$git_common_dir" != "$git_toplevel" ]]
}

get_main_worktree() {
    local git_dir="$1"
    local git_common_dir
    git_common_dir=$(git -C "$git_dir" rev-parse --git-common-dir 2>/dev/null || echo "")
    [[ -n "$git_common_dir" ]] && (cd "$git_dir" && cd "$(dirname "$git_common_dir")" && pwd)
}

# Check if a file contains skill compliance metadata
check_skill_compliance() {
    local file_path="$1"
    local has_persisting_skill=false
    local has_metadata=false

    if [[ -f "$file_path" ]]; then
        # Check for persisting-agent-outputs in skills_invoked
        if grep -q "persisting-agent-outputs" "$file_path" 2>/dev/null; then
            has_persisting_skill=true
        fi
        # Check for any metadata block
        if grep -q "skills_invoked" "$file_path" 2>/dev/null; then
            has_metadata=true
        fi
    fi

    echo "$has_persisting_skill:$has_metadata"
}

# Get files modified by agent from transcript
get_agent_modified_files() {
    local transcript_path="$1"
    local modified_files=""

    if [[ -f "$transcript_path" ]]; then
        # Extract file_path from Edit and Write tool uses
        modified_files=$(grep -oE '"file_path":\s*"[^"]+"' "$transcript_path" 2>/dev/null | \
            sed 's/"file_path":\s*"//' | sed 's/"$//' | sort -u || true)
    fi

    echo "$modified_files"
}

# Check if files have prior uncommitted changes (before this agent ran)
get_prior_uncommitted_changes() {
    local git_dir="$1"
    git -C "$git_dir" diff --name-only 2>/dev/null || true
}

# =============================================================================
# MAIN LOGIC
# =============================================================================

input=$(cat)
debug_log "INPUT: $input"

# Extract fields from input
session_id=$(echo "$input" | jq -r '.session_id // ""' 2>/dev/null || echo "")
agent_id=$(echo "$input" | jq -r '.agent_id // ""' 2>/dev/null || echo "")
agent_transcript=$(echo "$input" | jq -r '.agent_transcript_path // ""' 2>/dev/null || echo "")
subagent_type=$(echo "$input" | jq -r '.subagent_type // ""' 2>/dev/null || echo "")

debug_log "Session: $session_id, Agent: $agent_id, Type: $subagent_type"

# Skip agents that don't produce file output
case "$subagent_type" in
    Explore|Bash|general-purpose|claude-code-guide)
        debug_log "Skipping non-output agent type: $subagent_type"
        echo '{}'
        exit 0
        ;;
esac

current_git_root=$(git -C "${CLAUDE_PROJECT_DIR}" rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR}")
debug_log "Git root: $current_git_root"

# =============================================================================
# DETECT WRONG LOCATION FILES
# =============================================================================

wrong_files=$(get_wrong_location_files "$current_git_root")
debug_log "Wrong files: '$wrong_files'"

# Check main repo if in worktree
main_repo_leaks=""
if is_linked_worktree "$current_git_root"; then
    main_worktree=$(get_main_worktree "$current_git_root")
    if [[ -n "$main_worktree" && -d "$main_worktree" ]]; then
        main_repo_leaks=$(get_wrong_location_files "$main_worktree")
        debug_log "Main repo leaks: '$main_repo_leaks'"
    fi
fi

# Combine all wrong files
all_wrong_files="$wrong_files"
[[ -n "$main_repo_leaks" ]] && all_wrong_files="$all_wrong_files"$'\n'"$main_repo_leaks"
all_wrong_files=$(echo "$all_wrong_files" | grep -v '^$' | sort -u || true)

# If no wrong files, allow
if [[ -z "$all_wrong_files" ]]; then
    debug_log "No wrong files found, allowing"
    echo '{}'
    exit 0
fi

# =============================================================================
# ANALYZE COMPLIANCE FAILURE
# =============================================================================

compliance_failures=""
files_to_delete=""
skill_compliant_count=0
skill_noncompliant_count=0

while IFS= read -r wrong_file; do
    [[ -z "$wrong_file" ]] && continue

    full_path="${current_git_root}/${wrong_file}"
    if [[ -f "$full_path" ]]; then
        compliance=$(check_skill_compliance "$full_path")
        has_persisting=$(echo "$compliance" | cut -d: -f1)
        has_metadata=$(echo "$compliance" | cut -d: -f2)

        debug_log "File $wrong_file: persisting=$has_persisting, metadata=$has_metadata"

        if [[ "$has_persisting" == "false" ]]; then
            skill_noncompliant_count=$((skill_noncompliant_count + 1))
            compliance_failures="${compliance_failures}
- $wrong_file: Missing persisting-agent-outputs in skills_invoked"
            files_to_delete="${files_to_delete} ${full_path}"
        else
            skill_compliant_count=$((skill_compliant_count + 1))
            # Has the skill but still wrong location - just needs moving
            compliance_failures="${compliance_failures}
- $wrong_file: Invoked persisting-agent-outputs but didn't follow discovery protocol"
        fi
    fi
done <<< "$all_wrong_files"

# =============================================================================
# ANALYZE CODE CHANGES (if non-compliant)
# =============================================================================

agent_code_changes=""
safe_to_revert=""
revert_warning=""

if [[ $skill_noncompliant_count -gt 0 && -n "$agent_transcript" ]]; then
    # Get files this agent modified
    agent_modified=$(get_agent_modified_files "$agent_transcript")
    debug_log "Agent modified files: $agent_modified"

    if [[ -n "$agent_modified" ]]; then
        # Get all uncommitted changes in repo
        prior_changes=$(get_prior_uncommitted_changes "$current_git_root")
        debug_log "Prior uncommitted changes: $prior_changes"

        # Determine which agent changes are safe to revert
        while IFS= read -r mod_file; do
            [[ -z "$mod_file" ]] && continue
            # Skip the wrong-location output files themselves
            [[ "$mod_file" == *.md ]] && continue

            agent_code_changes="${agent_code_changes} ${mod_file}"

            # Normalize path for comparison (convert absolute to relative)
            # Agent transcript has absolute paths, git diff has relative paths
            rel_mod_file="${mod_file#${current_git_root}/}"
            debug_log "Checking file: $rel_mod_file"

            # Check if this file had prior uncommitted changes
            if echo "$prior_changes" | grep -qF "$rel_mod_file"; then
                debug_log "  -> HAS prior changes (manual review)"
                # File has prior changes - NOT safe to auto-revert
                revert_warning="${revert_warning}
- $mod_file: HAS PRIOR UNCOMMITTED CHANGES - manual review required"
            else
                debug_log "  -> NO prior changes (safe to revert)"
                # No prior changes - safe to revert
                safe_to_revert="${safe_to_revert} ${mod_file}"
            fi
        done <<< "$agent_modified"
    fi
fi

debug_log "Safe to revert: $safe_to_revert"
debug_log "Needs manual review: $revert_warning"

# =============================================================================
# BUILD COMPREHENSIVE ERROR MESSAGE
# =============================================================================

error_msg="SKILL COMPLIANCE FAILURE DETECTED

The agent wrote output to wrong location(s) AND failed skill compliance checks.
This indicates the agent skipped Step 1 mandatory skills.
$compliance_failures

=== REQUIRED ACTIONS ===

1. DELETE INVALID OUTPUT FILES:
$(for f in $files_to_delete; do echo "   rm \"$f\""; done)
"

if [[ -n "$safe_to_revert" ]]; then
    error_msg="${error_msg}
2. REVERT NON-COMPLIANT CODE CHANGES (safe - no prior changes):
$(for f in $safe_to_revert; do echo "   git checkout -- \"$f\""; done)
"
fi

if [[ -n "$revert_warning" ]]; then
    error_msg="${error_msg}
3. MANUAL REVIEW REQUIRED (has prior uncommitted changes):
$revert_warning
   These files were modified by a prior agent. Review changes carefully.
"
fi

error_msg="${error_msg}
4. RE-DO WITH PROPER COMPLIANCE:
   - Invoke ALL Step 1 mandatory skills (especially persisting-agent-outputs)
   - Follow the discovery protocol to find/create output directory
   - Write output to .claude/.output/agents/{timestamp}-{slug}/
   - Include skills_invoked metadata in output

The invalid output has been identified. Delete it and try again properly."

# Escape for JSON
error_msg_escaped=$(echo "$error_msg" | sed 's/"/\\"/g' | sed 's/$/\\n/' | tr -d '\n')

debug_log "DECISION: BLOCK"

cat << EOF
{
  "decision": "block",
  "reason": "${error_msg_escaped}"
}
EOF
exit 0
