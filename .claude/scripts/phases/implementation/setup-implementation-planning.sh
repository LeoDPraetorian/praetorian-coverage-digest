#!/bin/bash

# create-planning-context.sh - Simple mechanical context creation
# Usage: create-planning-context.sh <FEATURE_ID>

set -e

FEATURE_ID="$1"

if [ -z "${FEATURE_ID}" ]; then
    echo "❌ FEATURE_ID required"
    exit 1
fi

# Set up file paths
PLANNING_CONTEXT=".claude/features/${FEATURE_ID}/context/planning-context.md"
FINAL_PLAN=".claude/features/${FEATURE_ID}/output/implementation-plan.md"
AGENT_ASSIGNMENTS=".claude/features/${FEATURE_ID}/output/agent-assignments.json"

# Extract basic information
FEATURE_DESC=$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "Unknown")
COMPLEXITY=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.level' 2>/dev/null || echo "Unknown")
EFFORT=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.estimated_effort' 2>/dev/null || echo "Unknown")
RISK=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.risk_level' 2>/dev/null || echo "Unknown")
AFFECTED_DOMAINS=$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.affected_domains[]' 2>/dev/null | tr '\n' ' ')

# Create planning context file
cat > "${PLANNING_CONTEXT}" << EOFP
# Implementation Planning Context

## Feature Information
- ID: ${FEATURE_ID}
- Description: ${FEATURE_DESC}
- Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Requirements
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]' 2>/dev/null | sed 's/^/- /')

## Technical Context
$(grep -A 50 "## Similar Patterns Found" .claude/features/${FEATURE_ID}/context/knowledge-base.md 2>/dev/null || echo "No patterns found")

## Complexity Assessment
- Level: ${COMPLEXITY}
- Effort: ${EFFORT}
- Risk: ${RISK}
- Affected Domains: ${AFFECTED_DOMAINS}

## Architecture Decisions
$(if [ -d .claude/features/${FEATURE_ID}/architecture ]; then
    echo "### Architecture Recommendations Summary"
    for file in .claude/features/${FEATURE_ID}/architecture/*.md; do
        if [ -f "$file" ]; then
            basename_no_ext=$(basename "$file" .md)
            title=$(echo "$basename_no_ext" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
            echo "#### $title"
            head -20 "$file" | grep -v "^#" | grep -v "^$" | head -5
            echo "... [See full recommendations in architecture/$basename_no_ext.md]"
            echo ""
        fi
    done
else
    echo "N/A - Not a complex feature"
fi)
EOFP

# Output paths for Einstein
echo "PLANNING_CONTEXT=${PLANNING_CONTEXT}"
echo "FINAL_PLAN=${FINAL_PLAN}"
echo "AGENT_ASSIGNMENTS=${AGENT_ASSIGNMENTS}"
echo ""
echo "Planning context created for ${FEATURE_ID}"