#!/bin/bash
# PreCompact Context Preservation Hook
#
# Preserves critical workflow state before context compaction.
# Two-layer strategy:
# 1. MANIFEST.yaml (orchestration state) - highest priority
# 2. feedback-loop-state-{session}.json (enforcement state) - fallback
#
# Prevents loss of workflow context during compaction.

set -euo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (exit silently if missing - don't break compaction)
if ! require_jq; then
  exit 0
fi

# Read input from stdin
input=$(cat)

# Extract session_id
session_id=$(echo "$input" | jq -r '.session_id // ""')

# Output variable for additional context
additional_context=""

# ============================================================================
# LAYER 1: Check for Orchestration State (MANIFEST.yaml)
# ============================================================================

# Find recent MANIFEST.yaml files (modified in last 4 hours)
manifest_files=$(find .claude/.output -name "MANIFEST.yaml" -mmin -240 2>/dev/null || true)

if [[ -n "$manifest_files" ]]; then
    # Check each MANIFEST.yaml for current_phase field
    for manifest in $manifest_files; do
        if command -v yq &> /dev/null; then
            current_phase=$(yq -r '.current_phase // ""' "$manifest" 2>/dev/null || echo "")
        else
            # Fallback: grep-based extraction
            current_phase=$(grep -E '^\s*current_phase:' "$manifest" 2>/dev/null | sed 's/.*:\s*//' | sed 's/#.*//' | tr -d '"' || echo "")
        fi

        if [[ -n "$current_phase" && "$current_phase" != "null" ]]; then
            # Found orchestration state - extract phase status
            if command -v yq &> /dev/null; then
                phase_status=$(yq -r ".phases.\"$current_phase\".status // \"unknown\"" "$manifest" 2>/dev/null || echo "unknown")
                feature_name=$(yq -r '.feature_name // "Unknown Feature"' "$manifest" 2>/dev/null || echo "Unknown Feature")
            else
                # Fallback: simple extraction
                phase_status="in_progress"
                feature_name=$(grep -E '^\s*feature_name:' "$manifest" | head -1 | sed 's/.*:\s*//' | sed 's/#.*//' | tr -d '"' || echo "Unknown Feature")
            fi

            # Build orchestration summary
            additional_context="<orchestration-state>
You are in an orchestrated workflow:
- Feature: $feature_name
- Current Phase: $current_phase
- Phase Status: $phase_status

The workflow is coordinated via MANIFEST.yaml at: $manifest

Continue executing the current phase. Check MANIFEST.yaml for phase details and agent coordination.
</orchestration-state>"

            # Found orchestration state, no need to check feedback loop
            break
        fi
    done
fi

# ============================================================================
# LAYER 2: Check for Enforcement State (feedback-loop-state.json)
# ============================================================================

# Only check if no orchestration state found
if [[ -z "$additional_context" && -n "$session_id" ]]; then
    STATE_FILE=".claude/hooks/feedback-loop-state-${session_id}.json"

    if [[ -f "$STATE_FILE" ]]; then
        # Extract feedback loop state
        active=$(jq -r '.active // false' "$STATE_FILE" 2>/dev/null || echo "false")

        if [[ "$active" == "true" ]]; then
            iteration=$(jq -r '.iteration // 0' "$STATE_FILE")
            max_iterations=$(jq -r '.max_iterations // 5' "$STATE_FILE")

            # Get worst status across all domains for each phase
            # Priority: NOT_RUN > FAIL > PASS (worst case aggregation)
            review_status=$(jq -r '
              [.domain_phases | to_entries[].value.review.status // "NOT_RUN"] |
              if any(. == "NOT_RUN") then "NOT_RUN"
              elif any(. == "FAIL") then "FAIL"
              else "PASS" end
            ' "$STATE_FILE" 2>/dev/null || echo "NOT_RUN")

            test_planning_status=$(jq -r '
              [.domain_phases | to_entries[].value.test_planning.status // "NOT_RUN"] |
              if any(. == "NOT_RUN") then "NOT_RUN"
              elif any(. == "FAIL") then "FAIL"
              else "PASS" end
            ' "$STATE_FILE" 2>/dev/null || echo "NOT_RUN")

            testing_status=$(jq -r '
              [.domain_phases | to_entries[].value.testing.status // "NOT_RUN"] |
              if any(. == "NOT_RUN") then "NOT_RUN"
              elif any(. == "FAIL") then "FAIL"
              else "PASS" end
            ' "$STATE_FILE" 2>/dev/null || echo "NOT_RUN")

            modified_domains=$(jq -r '.modified_domains | join(", ")' "$STATE_FILE" 2>/dev/null || echo "")

            # Build feedback loop summary
            additional_context="<feedback-loop-state>
You are in a feedback loop enforcing quality gates:
- Iteration: $iteration/$max_iterations
- Modified Domains: $modified_domains
- Review: $review_status
- Test Planning: $test_planning_status
- Testing: $testing_status

Continue the Implementation→Review→Test cycle. The feedback-loop-stop hook will block exit until all phases pass.
</feedback-loop-state>"
        fi
    fi
fi

# ============================================================================
# Output
# ============================================================================

if [[ -n "$additional_context" ]]; then
    # State found - inject context
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreCompact",
    "additionalContext": $(echo "$additional_context" | jq -Rs .)
  }
}
EOF
else
    # No active workflow state - nothing to preserve
    echo '{}'
fi

exit 0
