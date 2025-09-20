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

## Complexity Assessment
$(cat .claude/features/${FEATURE_ID}/context/complexity-assessment.json | jq -r '. | "Level: \(.level), Domains: \(.affected_domains | join(", ")), Factors: \(.factors | join(", "))"' 2>/dev/null || echo "No complexity assessment found")

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

# Output key file paths for Einstein to use
echo "✅ Implementation phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "IMPL_CONTEXT_FILE=${IMPL_CONTEXT_FILE}"
echo "COORDINATION_PLAN=${COORDINATION_PLAN}"  
echo "IMPLEMENTATION_STRATEGY=${IMPLEMENTATION_STRATEGY}"
echo "IMPL_DIR=${IMPL_DIR}"
echo ""
echo "🎯 Ready for implementation coordinator analysis"