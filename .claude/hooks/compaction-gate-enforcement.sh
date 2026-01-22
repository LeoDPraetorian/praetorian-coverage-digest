#!/bin/bash
# Compaction Gate Enforcement Hook
#
# PreToolUse hook for Task that blocks agent spawning when context exceeds
# 85% threshold during orchestrated workflows. This is the enforcement layer;
# skill guidance recommends compacting at 75% (SHOULD) and 80% (MUST).
#
# Only applies when:
# - MANIFEST.yaml exists with current_phase (orchestration active)
# - Context exceeds 170k tokens (85% of 200k)
#
# Reference: .claude/skill-library/claude/skill-management/orchestrating-multi-agent-workflows/references/context-monitoring.md

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract tool name
tool_name=$(echo "$input" | jq -r '.tool_name // ""' 2>/dev/null)

# Only check Task tool
if [[ "$tool_name" != "Task" ]]; then
  exit 0
fi

# Extract session ID and subagent type
session_id=$(echo "$input" | jq -r '.session_id // "default"')
subagent_type=$(echo "$input" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)

# --- Step 1: Check if orchestration is active ---

# Find MANIFEST.yaml in output directories
MANIFEST=""
for type_dir in features capabilities integrations research mcp-wrappers fingerprintx; do
  if [[ -d "${CLAUDE_PROJECT_DIR}/.claude/.output/${type_dir}" ]]; then
    # Find most recently modified MANIFEST.yaml
    found=$(find "${CLAUDE_PROJECT_DIR}/.claude/.output/${type_dir}" -name 'MANIFEST.yaml' -mmin -1440 2>/dev/null | head -1)
    if [[ -n "$found" ]]; then
      MANIFEST="$found"
      break
    fi
  fi
done

# No MANIFEST.yaml = not orchestration, allow
if [[ -z "$MANIFEST" ]]; then
  exit 0
fi

# Check if MANIFEST has current_phase (orchestrated workflow)
current_phase=$(yq -r '.current_phase // ""' "$MANIFEST" 2>/dev/null || echo "")
if [[ -z "$current_phase" ]]; then
  # No current_phase = ad-hoc agent work, not orchestrated
  exit 0
fi

# --- Step 2: Get context size from session JSONL ---

# Convert current directory to Claude's project path format
PROJECT_PATH=$(pwd | tr '/' '-')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_PATH"

# Find most recently modified JSONL
JSONL=$(ls -t "$JSONL_DIR"/*.jsonl 2>/dev/null | head -1)

if [[ -z "$JSONL" || ! -f "$JSONL" ]]; then
  # Can't measure context, allow (don't block on missing data)
  exit 0
fi

# Get the latest entry that HAS usage data (assistant responses only)
LATEST=$(grep '"cache_read_input_tokens"' "$JSONL" 2>/dev/null | tail -1)

if [[ -z "$LATEST" ]]; then
  # No usage data yet, allow
  exit 0
fi

# Extract cache and input tokens from latest entry
CACHE_READ=$(echo "$LATEST" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d: -f2)
CACHE_CREATE=$(echo "$LATEST" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d: -f2)
INPUT_TOKENS=$(echo "$LATEST" | grep -o '"input_tokens":[0-9]*' | head -1 | cut -d: -f2)

# Handle missing values
CACHE_READ=${CACHE_READ:-0}
CACHE_CREATE=${CACHE_CREATE:-0}
INPUT_TOKENS=${INPUT_TOKENS:-0}

# Current context = what's cached + what's new
CURRENT_CONTEXT=$((CACHE_READ + CACHE_CREATE + INPUT_TOKENS))

# --- Step 3: Check threshold ---

# 85% of 200k = 170k (enforcement layer - skill guidance at 75%/80% should prevent reaching this)
THRESHOLD=170000
CONTEXT_WINDOW=200000

if [[ "$CURRENT_CONTEXT" -gt "$THRESHOLD" ]]; then
  PERCENT=$((CURRENT_CONTEXT * 100 / CONTEXT_WINDOW))

  cat << EOF
{
  "decision": "block",
  "reason": "COMPACTION REQUIRED: Context at ${PERCENT}% (${CURRENT_CONTEXT} tokens). Run /compact before spawning ${subagent_type}. Current orchestration phase: ${current_phase}. Threshold: 85% (170k tokens). Note: Skill guidance recommends compacting at 75-80% to avoid hitting this enforcement block."
}
EOF
  exit 0
fi

# Under threshold, allow
exit 0
