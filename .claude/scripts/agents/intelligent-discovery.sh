#!/bin/bash

# Intelligent Agent Discovery with Contextual Escalation
# Usage: ./intelligent-discovery.sh <FEATURE_ID>
# Output: STATUS:COUNT:AGENTS:REASONS (or ESCALATE for complex scenarios)

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "$FEATURE_ID" ]; then
    echo "ERROR:0::Missing FEATURE_ID parameter"
    exit 1
fi

# Read requirements for complexity analysis
REQUIREMENTS_FILE=".claude/features/${FEATURE_ID}/context/requirements.json"
if [ -f "$REQUIREMENTS_FILE" ]; then
    REQUIREMENTS_TEXT=$(cat "$REQUIREMENTS_FILE" | jq -r '.feature_description // .description // ""' 2>/dev/null)
else
    REQUIREMENTS_TEXT=""
fi

# Complex scenario detection patterns
COMPLEXITY_INDICATORS=(
    "custom.*protocol"
    "real.*time.*encryption"
    "novel.*integration"
    "specialized.*[^\\s]*requirements"
    "headless.*browser.*auth"
    "WebSocket.*[^\\s]*validation"
    "unique.*architecture"
    "custom.*encryption.*protocol"
    "multi.*stage.*authentication"
    "complex.*state.*synchronization"
    "distributed.*consensus"
    "custom.*security.*implementation"
)

# Check if this requires agent-level reasoning
requires_agent_reasoning() {
    local text="$1"
    local indicator_count=0
    
    for pattern in "${COMPLEXITY_INDICATORS[@]}"; do
        if echo "$text" | grep -qiE "$pattern"; then
            indicator_count=$((indicator_count + 1))
        fi
    done
    
    # Multiple complexity indicators = needs agent reasoning
    if [ $indicator_count -ge 2 ]; then
        return 0
    fi
    
    # Check for novel/unknown patterns
    if echo "$text" | grep -qiE "(never.*seen|unprecedented|novel.*approach|custom.*solution|specialized.*implementation)"; then
        return 0  
    fi
    
    return 1
}

# Check if we need contextual reasoning
if requires_agent_reasoning "$REQUIREMENTS_TEXT"; then
    echo "ESCALATE:contextual_reasoning_required:Complex scenario detected requiring agent-level intelligence"
    exit 2
fi

# Standard pattern detection - call existing script
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
exec "${SCRIPT_DIR}/dynamic-discovery.sh" "$FEATURE_ID"