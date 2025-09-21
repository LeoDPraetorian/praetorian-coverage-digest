#!/bin/bash

# setup-implementation-phase.sh
# Mechanical setup operations for implementation phase
# Usage: setup-implementation-phase.sh <FEATURE_ID>

set -e  # Exit on error

# Validate input
if [ $# -ne 1 ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

FEATURE_ID="$1"

# Validate feature exists
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "❌ Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

# Initialize implementation workspace
IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"
echo "📁 Creating implementation workspace: ${IMPL_DIR}"
mkdir -p "${IMPL_DIR}"/{context,coordination,progress,agent-outputs}

# Update metadata with implementation start
IMPL_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Implementation started: ${IMPL_START}"

jq '.status = "implementation_in_progress" | .phase = "implementation" | .implementation_started = "'${IMPL_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
IMPL_CONTEXT_FILE=".claude/features/${FEATURE_ID}/implementation/context/implementation-context.md"
COORDINATION_PLAN=".claude/features/${FEATURE_ID}/implementation/coordination/implementation-coordination-plan.json"
IMPLEMENTATION_STRATEGY=".claude/features/${FEATURE_ID}/implementation/coordination/implementation-strategy.md"

# Generate implementation context file
echo "📄 Generating implementation context: ${IMPL_CONTEXT_FILE}"

cat > "${IMPL_CONTEXT_FILE}" << EOF
# Implementation Context

## Feature
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "No description found")

## Requirements Summary
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]?' 2>/dev/null || echo "No user stories found")

## Enhanced Complexity Assessment
$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '. | "Level: \(.level) (Score: \(.score // 50)/100), Risk: \(.risk_level // "Medium"), Effort: \(.estimated_effort // "medium"), Domains: \(.affected_domains | join(", ")), Factors: \(.factors | join(", "))"' 2>/dev/null || echo "No complexity assessment found")

## Complexity Breakdown
$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '.breakdown | if . then "File Impact: \(.file_impact // 15)/30, Code Volume: \(.code_volume // 15)/30, Architecture: \(.architectural_impact // 10)/20, Risk Factors: \(.risk_factors // 10)/20" else "No breakdown available" end' 2>/dev/null || echo "No complexity breakdown found")

## Implementation Plan Summary
$(head -50 .claude/features/${FEATURE_ID}/output/implementation-plan.md 2>/dev/null | grep -A 10 "## Implementation Overview" || echo "No implementation plan found")

## Architecture Context
$(find .claude/features/${FEATURE_ID}/architecture/ -name "*.md" -type f 2>/dev/null | head -5 | while read arch_file; do
    echo "- $(basename "$arch_file"): Available for agent distribution"
done || echo "No architecture files found")

## Available Context Files
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Complexity: .claude/features/${FEATURE_ID}/context/complexity-assessment.json  
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Knowledge Base: .claude/features/${FEATURE_ID}/context/knowledge-base.md
- Architecture Files: .claude/features/${FEATURE_ID}/architecture/*.md (if any)
EOF

# Validate context file was created successfully
if [ ! -f "${IMPL_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create implementation context file"
    exit 1
fi

# Enhanced complexity analysis for coordination strategy
COMPLEXITY_ASSESSMENT=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
COMPLEXITY_LEVEL=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.level' 2>/dev/null || echo "Unknown")
COMPLEXITY_SCORE=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.score // 50' 2>/dev/null)
ESTIMATED_EFFORT=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.estimated_effort // "medium"' 2>/dev/null)
RISK_LEVEL=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.risk_level // "Medium"' 2>/dev/null)
AFFECTED_DOMAINS=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.affected_domains | length' 2>/dev/null || echo "1")

# Determine coordination strategy based on enhanced complexity
COORDINATION_APPROACH="sequential"
COORDINATION_INTENSITY="light"
THINKING_BUDGET_RECOMMENDATION="think"

if [ ${COMPLEXITY_SCORE} -ge 75 ]; then
    COORDINATION_APPROACH="parallel-with-checkpoints"
    COORDINATION_INTENSITY="heavy"
    THINKING_BUDGET_RECOMMENDATION="think harder"
elif [ ${COMPLEXITY_SCORE} -ge 45 ] || [ ${AFFECTED_DOMAINS} -gt 2 ]; then
    COORDINATION_APPROACH="parallel"
    COORDINATION_INTENSITY="moderate" 
    THINKING_BUDGET_RECOMMENDATION="think hard"
fi

# Adjust based on risk level
if [ "${RISK_LEVEL}" = "High" ]; then
    COORDINATION_INTENSITY="heavy"
    THINKING_BUDGET_RECOMMENDATION="think harder"
fi

# Create coordination directory structure
COORDINATION_DIR=".claude/features/${FEATURE_ID}/implementation/coordination"
mkdir -p "${COORDINATION_DIR}"/{api-contracts,communication,progress-tracking}

# Output key file paths and strategic variables for Einstein to use
echo "✅ Implementation phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "IMPL_CONTEXT_FILE=${IMPL_CONTEXT_FILE}"
echo "COORDINATION_PLAN=${COORDINATION_PLAN}"  
echo "IMPLEMENTATION_STRATEGY=${IMPLEMENTATION_STRATEGY}"
echo "IMPL_DIR=${IMPL_DIR}"
echo "COORDINATION_DIR=${COORDINATION_DIR}"
echo ""
echo "🎯 Enhanced Coordination Strategy:"
echo "COMPLEXITY_SCORE=${COMPLEXITY_SCORE}"
echo "COORDINATION_APPROACH=${COORDINATION_APPROACH}"
echo "COORDINATION_INTENSITY=${COORDINATION_INTENSITY}"
echo "THINKING_BUDGET_RECOMMENDATION=${THINKING_BUDGET_RECOMMENDATION}"
echo "ESTIMATED_EFFORT=${ESTIMATED_EFFORT}"
echo "RISK_LEVEL=${RISK_LEVEL}"
echo ""
echo "🚀 Ready for implementation coordinator analysis"