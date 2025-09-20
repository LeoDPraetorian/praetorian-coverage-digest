#!/bin/bash

# setup-quality-review-phase.sh
# Mechanical setup operations for quality review phase
# Usage: setup-quality-review-phase.sh <FEATURE_ID>

set -e  # Exit on error

# Validate input
if [ $# -ne 1 ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

FEATURE_ID="$1"

# Validate feature exists and implementation is complete
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "❌ Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

if [ ! -d ".claude/features/${FEATURE_ID}/implementation" ]; then
    echo "❌ Implementation directory not found - run implementation phase first"
    exit 1
fi

# Initialize quality review workspace
QUALITY_DIR=".claude/features/${FEATURE_ID}/quality-review"
echo "📁 Creating quality review workspace: ${QUALITY_DIR}"
mkdir -p "${QUALITY_DIR}"/{context,coordination,analysis,reports,feedback-loop,remediation}

# Create sub-directories for quality coordination
mkdir -p "${QUALITY_DIR}/coordination"/{quality-agents,validation-results,communication}
mkdir -p "${QUALITY_DIR}/feedback-loop"/{iteration-{1,2,3},remediation-plans,fix-validation}
mkdir -p "${QUALITY_DIR}/analysis"/{code-quality,security,performance,integration}

# Update metadata with quality review start
QUALITY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Quality review started: ${QUALITY_START}"

jq '.status = "quality_review_in_progress" | .phase = "quality-review" | .quality_review_started = "'${QUALITY_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
QUALITY_CONTEXT_FILE=".claude/features/${FEATURE_ID}/quality-review/context/quality-context.md"
QUALITY_COORDINATION_PLAN=".claude/features/${FEATURE_ID}/quality-review/coordination/quality-coordination-plan.json"
QUALITY_STRATEGY=".claude/features/${FEATURE_ID}/quality-review/coordination/quality-strategy.md"
FEEDBACK_LOOP_DIR=".claude/features/${FEATURE_ID}/quality-review/feedback-loop"

# Analyze implementation outputs for quality context
echo "📊 Analyzing implementation outputs for quality context"

# Get implementation summary
IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"
IMPL_AGENTS=$(find "${IMPL_DIR}/agent-outputs" -type d -mindepth 1 2>/dev/null | wc -l | xargs)
IMPL_CODE_CHANGES=$(find "${IMPL_DIR}/code-changes" -type f -name "*.go" -o -name "*.tsx" -o -name "*.ts" -o -name "*.py" 2>/dev/null | wc -l | xargs)

# Analyze technology stack from implementation
TECH_STACK=""
if find "${IMPL_DIR}/code-changes" -name "*.go" -type f 2>/dev/null | head -1 | grep -q .; then
    TECH_STACK="${TECH_STACK}Go, "
fi
if find "${IMPL_DIR}/code-changes" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | head -1 | grep -q .; then
    TECH_STACK="${TECH_STACK}React/TypeScript, "
fi
if find "${IMPL_DIR}/code-changes" -name "*.py" -type f 2>/dev/null | head -1 | grep -q .; then
    TECH_STACK="${TECH_STACK}Python, "
fi
if find "${IMPL_DIR}/code-changes" -name "*.vql" -type f 2>/dev/null | head -1 | grep -q .; then
    TECH_STACK="${TECH_STACK}VQL, "
fi
TECH_STACK=$(echo "${TECH_STACK}" | sed 's/, $//')

# Determine risk level based on implementation scope
RISK_LEVEL="Medium"
if [ "${IMPL_AGENTS}" -ge 4 ] || [ "${IMPL_CODE_CHANGES}" -ge 10 ]; then
    RISK_LEVEL="High"
elif [ "${IMPL_AGENTS}" -le 1 ] && [ "${IMPL_CODE_CHANGES}" -le 3 ]; then
    RISK_LEVEL="Low"
fi

# Generate quality review context file
echo "📄 Generating quality review context: ${QUALITY_CONTEXT_FILE}"

cat > "${QUALITY_CONTEXT_FILE}" << EOF
# Quality Review Context

## Feature
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "No description found")

## Implementation Summary
- **Implementation Agents Used**: ${IMPL_AGENTS}
- **Code Changes Made**: ${IMPL_CODE_CHANGES} files
- **Technology Stack**: ${TECH_STACK:-"Not detected"}
- **Risk Assessment**: ${RISK_LEVEL}
- **Implementation Status**: $(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.status' 2>/dev/null || echo "Unknown")

## Requirements Summary (For Validation)
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]?' 2>/dev/null || echo "No user stories found")

## Acceptance Criteria (Quality Gates)
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.acceptance_criteria[]?' 2>/dev/null || echo "No acceptance criteria found")

## Implementation Plan Context
$(head -30 .claude/features/${FEATURE_ID}/output/implementation-plan.md 2>/dev/null | grep -A 15 "## Success Criteria" || echo "No success criteria found in implementation plan")

## Implementation Outputs Analysis
### Agent Outputs Directory
$(ls -la "${IMPL_DIR}/agent-outputs" 2>/dev/null | tail -n +2 | while read -r line; do
    if echo "$line" | grep -q "^d"; then
        agent_name=$(echo "$line" | awk '{print $9}')
        if [ "$agent_name" != "." ] && [ "$agent_name" != ".." ]; then
            echo "- ${agent_name}: $(find "${IMPL_DIR}/agent-outputs/${agent_name}" -type f 2>/dev/null | wc -l | xargs) output files"
        fi
    fi
done || echo "No agent outputs found")

### Code Changes by Technology
$(echo "#### Go Backend Changes"
find "${IMPL_DIR}/code-changes" -name "*.go" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||")"
done || echo "- No Go files found"

echo "#### React/TypeScript Frontend Changes"
find "${IMPL_DIR}/code-changes" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||")"
done || echo "- No React/TypeScript files found"

echo "#### Python Changes"
find "${IMPL_DIR}/code-changes" -name "*.py" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||")"
done || echo "- No Python files found")

## Architecture Context (For Compliance Validation)
$(find .claude/features/${FEATURE_ID}/architecture/ -name "*.md" -type f 2>/dev/null | head -3 | while read arch_file; do
    echo "- $(basename "$arch_file"): Available for architecture compliance validation"
done || echo "No architecture files found")

## Available Context Files for Quality Review
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Complexity Assessment: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Implementation Outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code Changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Architecture Files: .claude/features/${FEATURE_ID}/architecture/*.md (if any)

## Quality Review Focus Areas
Based on implementation analysis, prioritize quality review in these areas:
- **Code Quality**: $([ "${IMPL_CODE_CHANGES}" -gt 5 ] && echo "High priority - significant code changes" || echo "Medium priority - moderate code changes")
- **Security Review**: $(echo "${TECH_STACK}" | grep -q "Go" && echo "High priority - backend security critical" || echo "Medium priority - standard security review")
- **Performance Testing**: $([ "${RISK_LEVEL}" = "High" ] && echo "High priority - high-risk implementation" || echo "Medium priority - standard performance validation")
- **Integration Testing**: $([ "${IMPL_AGENTS}" -gt 2 ] && echo "High priority - multi-agent coordination" || echo "Low priority - single agent implementation")
EOF

# Validate context file was created successfully
if [ ! -f "${QUALITY_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create quality review context file"
    exit 1
fi

# Initialize feedback loop tracking
FEEDBACK_ITERATION_TRACKER="${FEEDBACK_LOOP_DIR}/iteration-tracker.json"
cat > "${FEEDBACK_ITERATION_TRACKER}" << EOF
{
  "current_iteration": 0,
  "max_iterations": 3,
  "quality_status": "pending_initial_review",
  "feedback_cycles": [],
  "escalation_required": false,
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Output key file paths for Einstein to use
echo "✅ Quality review phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "QUALITY_CONTEXT_FILE=${QUALITY_CONTEXT_FILE}"
echo "QUALITY_COORDINATION_PLAN=${QUALITY_COORDINATION_PLAN}"  
echo "QUALITY_STRATEGY=${QUALITY_STRATEGY}"
echo "QUALITY_DIR=${QUALITY_DIR}"
echo "FEEDBACK_LOOP_DIR=${FEEDBACK_LOOP_DIR}"
echo "FEEDBACK_ITERATION_TRACKER=${FEEDBACK_ITERATION_TRACKER}"
echo "IMPLEMENTATION_OUTPUTS=${IMPL_DIR}"
echo ""
echo "📊 Implementation Analysis:"
echo "RISK_LEVEL=${RISK_LEVEL}"
echo "TECH_STACK=${TECH_STACK}"
echo "IMPL_AGENTS=${IMPL_AGENTS}"
echo "CODE_CHANGES=${IMPL_CODE_CHANGES}"
echo ""
echo "🎯 Ready for quality review coordinator analysis"