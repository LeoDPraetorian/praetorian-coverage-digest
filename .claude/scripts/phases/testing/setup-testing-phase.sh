#!/bin/bash

# setup-testing-phase.sh
# Mechanical setup operations for testing phase
# Usage: setup-testing-phase.sh <FEATURE_ID>

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

# Validate quality review is complete (testing comes after quality review)
CURRENT_STATUS=$(cat ".claude/features/${FEATURE_ID}/metadata.json" | jq -r '.status' 2>/dev/null || echo "unknown")
if [ "${CURRENT_STATUS}" != "quality_review_completed" ] && [ "${CURRENT_STATUS}" != "security_review_completed" ]; then
    echo "⚠️ Testing phase typically follows quality/security review - current status: ${CURRENT_STATUS}"
fi

# Initialize testing workspace
TESTING_DIR=".claude/features/${FEATURE_ID}/testing"
echo "📁 Creating testing workspace: ${TESTING_DIR}"
mkdir -p "${TESTING_DIR}"/{context,coordination,unit,integration,e2e,reports,feedback-loop,remediation}

# Create sub-directories for testing coordination
mkdir -p "${TESTING_DIR}/coordination"/{testing-agents,test-results,execution-logs}
mkdir -p "${TESTING_DIR}/feedback-loop"/{iteration-{1,2,3},remediation-plans,test-improvements}
mkdir -p "${TESTING_DIR}/unit"/{created,executed,results}
mkdir -p "${TESTING_DIR}/integration"/{created,executed,results}
mkdir -p "${TESTING_DIR}/e2e"/{created,executed,results}

# Update metadata with testing start
TESTING_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Testing phase started: ${TESTING_START}"

jq '.status = "testing_in_progress" | .phase = "testing" | .testing_started = "'${TESTING_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
TESTING_CONTEXT_FILE=".claude/features/${FEATURE_ID}/testing/context/testing-context.md"
TESTING_COORDINATION_PLAN=".claude/features/${FEATURE_ID}/testing/coordination/testing-coordination-plan.json"
TESTING_STRATEGY=".claude/features/${FEATURE_ID}/testing/coordination/testing-strategy.md"
FEEDBACK_LOOP_DIR=".claude/features/${FEATURE_ID}/testing/feedback-loop"

# Analyze implementation outputs for testing context
echo "📊 Analyzing implementation outputs for testing context"

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

# Analyze affected domains from implementation
AFFECTED_DOMAINS=""
if find "${IMPL_DIR}/code-changes" -name "*.go" -type f 2>/dev/null | head -1 | grep -q .; then
    AFFECTED_DOMAINS="${AFFECTED_DOMAINS}backend, "
fi
if find "${IMPL_DIR}/code-changes" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | head -1 | grep -q .; then
    AFFECTED_DOMAINS="${AFFECTED_DOMAINS}frontend, "
fi
if find "${IMPL_DIR}/code-changes" -name "*test*" -o -name "*spec*" -type f 2>/dev/null | head -1 | grep -q .; then
    AFFECTED_DOMAINS="${AFFECTED_DOMAINS}testing, "
fi
if grep -r "integration\|api\|endpoint" "${IMPL_DIR}/code-changes" 2>/dev/null | head -1 | grep -q .; then
    AFFECTED_DOMAINS="${AFFECTED_DOMAINS}integration, "
fi
AFFECTED_DOMAINS=$(echo "${AFFECTED_DOMAINS}" | sed 's/, $//')

# Determine risk level and complexity based on implementation scope
RISK_LEVEL="Medium"
COMPLEXITY_LEVEL="Medium"

if [ "${IMPL_AGENTS}" -ge 4 ] || [ "${IMPL_CODE_CHANGES}" -ge 10 ]; then
    RISK_LEVEL="High"
    COMPLEXITY_LEVEL="Complex"
elif [ "${IMPL_AGENTS}" -le 1 ] && [ "${IMPL_CODE_CHANGES}" -le 3 ]; then
    RISK_LEVEL="Low"
    COMPLEXITY_LEVEL="Simple"
fi

# Check for high-risk testing areas
if echo "${TECH_STACK}" | grep -q "Go"; then
    if grep -r "auth\|security\|jwt\|oauth" "${IMPL_DIR}/code-changes" 2>/dev/null | head -1 | grep -q .; then
        RISK_LEVEL="High"
        echo "🔒 High-risk detected: Authentication/Security changes in Go backend"
    fi
fi

if echo "${AFFECTED_DOMAINS}" | grep -q "integration"; then
    RISK_LEVEL="High"
    echo "🔗 High-risk detected: Integration changes require comprehensive testing"
fi

# Generate testing context file
echo "📄 Generating testing context: ${TESTING_CONTEXT_FILE}"

cat > "${TESTING_CONTEXT_FILE}" << EOF
# Testing Context

## Feature
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "No description found")

## Implementation Summary
- **Implementation Agents Used**: ${IMPL_AGENTS}
- **Code Changes Made**: ${IMPL_CODE_CHANGES} files
- **Technology Stack**: ${TECH_STACK:-"Not detected"}
- **Testing Risk Assessment**: ${RISK_LEVEL}
- **Implementation Complexity**: ${COMPLEXITY_LEVEL}
- **Affected Domains**: ${AFFECTED_DOMAINS:-"Not detected"}
- **Implementation Status**: $(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.status' 2>/dev/null || echo "Unknown")

## Requirements Summary (For Test Validation)
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]?' 2>/dev/null || echo "No user stories found")

## Acceptance Criteria (Testing Gates)
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.acceptance_criteria[]?' 2>/dev/null || echo "No acceptance criteria found")

## Implementation Plan Testing Requirements
$(grep -A 20 "## Testing Strategy\|## Success Criteria" .claude/features/${FEATURE_ID}/output/implementation-plan.md 2>/dev/null || echo "No testing requirements found in implementation plan")

## Quality Review Results (For Test Context)
$(if [ -d ".claude/features/${FEATURE_ID}/quality-review" ]; then
    echo "### Quality Review Status"
    echo "- Quality review completed: $(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.quality_review_completed // "Not completed"')"
    echo "- Quality issues found: $(find .claude/features/${FEATURE_ID}/quality-review/feedback-loop -name "*remediation*" -type f 2>/dev/null | wc -l | xargs) remediation cycles"
else
    echo "Quality review not found - testing will proceed without quality context"
fi)

## Security Review Results (For Test Context)
$(if [ -d ".claude/features/${FEATURE_ID}/security-review" ]; then
    echo "### Security Review Status"
    echo "- Security review completed: $(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.security_review_completed // "Not completed"')"
    echo "- Security fixes applied: $(find .claude/features/${FEATURE_ID}/security-review/feedback-loop -name "*remediation*" -type f 2>/dev/null | wc -l | xargs) remediation cycles"
else
    echo "Security review not found - testing will proceed without security context"
fi)

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
$(echo "#### Go Backend Changes (Unit & Integration Testing Required)"
find "${IMPL_DIR}/code-changes" -name "*.go" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||"): Requires Go unit tests and API integration tests"
done || echo "- No Go files found"

echo "#### React/TypeScript Frontend Changes (E2E Testing Required)"
find "${IMPL_DIR}/code-changes" -name "*.tsx" -o -name "*.ts" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||"): Requires React component tests and E2E workflow tests"
done || echo "- No React/TypeScript files found"

echo "#### Python Changes (CLI Testing Required)"
find "${IMPL_DIR}/code-changes" -name "*.py" -type f 2>/dev/null | head -5 | while read -r file; do
    echo "- $(echo "$file" | sed "s|${IMPL_DIR}/code-changes/||"): Requires Python unit tests and CLI integration tests"
done || echo "- No Python files found")

## Testing Requirements by Domain
### Unit Testing Requirements
$(if echo "${TECH_STACK}" | grep -q "Go"; then
    echo "- **Go Backend**: Business logic testing, handler testing, service layer validation"
fi
if echo "${TECH_STACK}" | grep -q "React"; then
    echo "- **React Components**: Component behavior, hook testing, UI state management"
fi
if echo "${TECH_STACK}" | grep -q "Python"; then
    echo "- **Python CLI**: Command validation, argument parsing, error handling"
fi)

### Integration Testing Requirements
$(echo "- **API Endpoints**: Request/response validation, error handling, authentication flows"
if echo "${AFFECTED_DOMAINS}" | grep -q "backend"; then
    echo "- **Database Operations**: CRUD operations, query validation, transaction integrity"
fi
if echo "${AFFECTED_DOMAINS}" | grep -q "integration"; then
    echo "- **Service Integration**: Third-party API calls, webhook handling, external service mocking"
fi)

### E2E Testing Requirements
$(if echo "${AFFECTED_DOMAINS}" | grep -q "frontend"; then
    echo "- **User Workflows**: Complete user journeys, form submissions, navigation flows"
    echo "- **UI Components**: Interactive elements, responsive design, accessibility compliance"
fi
echo "- **Acceptance Criteria Validation**: Each acceptance criterion requires corresponding E2E test"
echo "- **Cross-Browser Testing**: Chrome, Firefox, Safari compatibility validation")

## Available Context Files for Testing
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Complexity Assessment: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Implementation Plan: .claude/features/${FEATURE_ID}/output/implementation-plan.md
- Implementation Outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code Changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Architecture Files: .claude/features/${FEATURE_ID}/architecture/*.md (if any)
- Quality Review Results: .claude/features/${FEATURE_ID}/quality-review/ (if any)
- Security Review Results: .claude/features/${FEATURE_ID}/security-review/ (if any)

## Testing Priority Matrix
Based on implementation analysis, prioritize testing in these areas:
- **Unit Testing**: $([ "${IMPL_CODE_CHANGES}" -gt 5 ] && echo "High priority - significant business logic changes" || echo "Medium priority - moderate code changes")
- **Integration Testing**: $(echo "${TECH_STACK}" | grep -q "Go" && echo "High priority - backend API testing critical" || echo "Medium priority - standard integration validation")
- **E2E Testing**: $(echo "${AFFECTED_DOMAINS}" | grep -q "frontend" && echo "High priority - UI workflow changes" || echo "Low priority - backend-only changes")
- **Performance Testing**: $([ "${RISK_LEVEL}" = "High" ] && echo "High priority - high-risk implementation" || echo "Medium priority - standard performance validation")
- **Security Testing**: $(grep -r "auth\|security\|jwt" "${IMPL_DIR}/code-changes" 2>/dev/null >/dev/null && echo "Critical priority - security-sensitive changes" || echo "Low priority - no security changes detected")

## Test Coverage Targets
- **Unit Test Coverage**: $([ "${COMPLEXITY_LEVEL}" = "Complex" ] && echo "≥90% for business logic" || echo "≥80% for business logic")
- **Integration Coverage**: All API endpoints and external integrations
- **E2E Coverage**: All user stories and acceptance criteria
- **Performance Benchmarks**: Response times <500ms, no memory leaks detected
EOF

# Validate context file was created successfully
if [ ! -f "${TESTING_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create testing context file"
    exit 1
fi

# Initialize feedback loop tracking
FEEDBACK_ITERATION_TRACKER="${FEEDBACK_LOOP_DIR}/iteration-tracker.json"
cat > "${FEEDBACK_ITERATION_TRACKER}" << EOF
{
  "current_iteration": 0,
  "max_iterations": 3,
  "testing_status": "pending_initial_test_creation",
  "feedback_cycles": [],
  "escalation_required": false,
  "test_execution_attempts": 0,
  "all_tests_passing": false,
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Output key file paths for Einstein to use
echo "✅ Testing phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "TESTING_CONTEXT_FILE=${TESTING_CONTEXT_FILE}"
echo "TESTING_COORDINATION_PLAN=${TESTING_COORDINATION_PLAN}"  
echo "TESTING_STRATEGY=${TESTING_STRATEGY}"
echo "TESTING_DIR=${TESTING_DIR}"
echo "FEEDBACK_LOOP_DIR=${FEEDBACK_LOOP_DIR}"
echo "FEEDBACK_ITERATION_TRACKER=${FEEDBACK_ITERATION_TRACKER}"
echo "IMPLEMENTATION_OUTPUTS=${IMPL_DIR}"
echo ""
echo "📊 Implementation Analysis:"
echo "RISK_LEVEL=${RISK_LEVEL}"
echo "COMPLEXITY_LEVEL=${COMPLEXITY_LEVEL}"
echo "AFFECTED_DOMAINS=${AFFECTED_DOMAINS}"
echo "TECH_STACK=${TECH_STACK}"
echo "IMPL_AGENTS=${IMPL_AGENTS}"
echo "CODE_CHANGES=${IMPL_CODE_CHANGES}"
echo ""
echo "🎯 Ready for test coordinator analysis"