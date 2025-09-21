#!/bin/bash

# setup-security-review-phase.sh
# Mechanical setup operations for security review phase
# Usage: setup-security-review-phase.sh <FEATURE_ID>

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

# Initialize security review workspace
SECURITY_DIR=".claude/features/${FEATURE_ID}/security-review"
echo "🔒 Creating security review workspace: ${SECURITY_DIR}"
mkdir -p "${SECURITY_DIR}"/{context,coordination,analysis,reports,threat-model,remediation}

# Update metadata with security review start
SECURITY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Security review started: ${SECURITY_START}"

jq '.status = "security_review_in_progress" | .phase = "security-review" | .security_review_started = "'${SECURITY_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
SECURITY_CONTEXT_FILE=".claude/features/${FEATURE_ID}/security-review/context/security-context.md"
SECURITY_COORDINATION_PLAN=".claude/features/${FEATURE_ID}/security-review/coordination/security-coordination-plan.json"
SECURITY_STRATEGY=".claude/features/${FEATURE_ID}/security-review/coordination/security-strategy.md"

# Analyze implementation outputs for security context
IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"

# Enhanced complexity data extraction for security planning
COMPLEXITY_ASSESSMENT=".claude/features/${FEATURE_ID}/context/complexity-assessment.json"
COMPLEXITY_LEVEL=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.level' 2>/dev/null || echo "Unknown")
COMPLEXITY_SCORE=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.score // 50' 2>/dev/null || echo "50")
ASSESSMENT_RISK_LEVEL=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.risk_level' 2>/dev/null || echo "Medium")
AFFECTED_DOMAINS=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.affected_domains[]?' 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "Unknown")
ESTIMATED_EFFORT=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.estimated_effort // "medium"' 2>/dev/null || echo "medium")

# Extract detailed risk factors for intelligent security strategy
RISK_FACTOR_SCORE=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.breakdown.risk_factors // 10' 2>/dev/null || echo "10")
ARCHITECTURAL_IMPACT=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.breakdown.architectural_impact // 10' 2>/dev/null || echo "10")
COMPLEXITY_FACTORS=$(cat "${COMPLEXITY_ASSESSMENT}" | jq -r '.factors[]?' 2>/dev/null | grep -i "security\|auth\|data\|external" | wc -l)

TECH_STACK=$(cat ".claude/features/${FEATURE_ID}/context/implementation-context.json" | jq -r '.technology_requirements | to_entries[] | "\(.key): \(.value)"' 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "Unknown")

# Enhanced risk level determination using quantitative scoring
SECURITY_STRATEGY="basic"
if [ ${COMPLEXITY_SCORE} -ge 75 ] || [ ${RISK_FACTOR_SCORE} -ge 15 ] || [ ${COMPLEXITY_FACTORS} -ge 2 ]; then
    RISK_LEVEL="High" 
    SECURITY_STRATEGY="comprehensive"
elif [ ${COMPLEXITY_SCORE} -ge 40 ] || [ ${RISK_FACTOR_SCORE} -ge 10 ] || echo "${AFFECTED_DOMAINS}" | grep -qi "backend\|api\|integration"; then
    RISK_LEVEL="Medium"
    SECURITY_STRATEGY="focused"
else
    RISK_LEVEL="Low"
    SECURITY_STRATEGY="basic"
fi

# Override based on domain-specific security risks
if echo "${AFFECTED_DOMAINS}" | grep -qi "security\|authentication\|authorization"; then
    RISK_LEVEL="High"
    SECURITY_STRATEGY="comprehensive"
fi

echo "🔒 Enhanced Security Analysis:"
echo "  - Risk Level: ${RISK_LEVEL} (Strategy: ${SECURITY_STRATEGY})"
echo "  - Complexity Score: ${COMPLEXITY_SCORE}/100 (Level: ${COMPLEXITY_LEVEL})"  
echo "  - Risk Factor Score: ${RISK_FACTOR_SCORE}/30"
echo "  - Security-Related Factors: ${COMPLEXITY_FACTORS}"
echo "  - Estimated Effort: ${ESTIMATED_EFFORT}"
echo "  - Affected Domains: ${AFFECTED_DOMAINS}"

# Generate security context file
echo "📄 Generating security context: ${SECURITY_CONTEXT_FILE}"

cat > "${SECURITY_CONTEXT_FILE}" << EOF
# Security Review Context

## Feature Overview
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "No description found")

## Implementation Summary
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]?' 2>/dev/null || echo "No user stories found")

## Security Risk Assessment
- **Risk Level**: ${RISK_LEVEL}
- **Complexity**: ${COMPLEXITY_LEVEL}
- **Affected Domains**: ${AFFECTED_DOMAINS}
- **Technology Stack**: ${TECH_STACK}

## Attack Surface Analysis
$(if [ -d ".claude/features/${FEATURE_ID}/implementation/code-changes" ]; then
    echo "### Code Changes Requiring Security Review"
    find ".claude/features/${FEATURE_ID}/implementation/code-changes" -name "*.go" -o -name "*.tsx" -o -name "*.ts" -o -name "*.py" 2>/dev/null | head -10 | while read code_file; do
        echo "- $(basename "$code_file"): $(dirname "$code_file" | sed 's|.*/||')"
    done || echo "No code changes found for review"
else
    echo "No implementation artifacts found for security review"
fi)

## Implementation Context
$(if [ -f ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" ]; then
    echo "### Implementation Details"
    cat ".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json" | jq -r '. | "Complexity: \(.complexity_level // "Unknown"), Agents: \(.recommended_agents[].agent_type // [] | join(", "))"' 2>/dev/null
else
    echo "No implementation context available"
fi)

## Architecture Context for Security
$(find .claude/features/${FEATURE_ID}/architecture/ -name "*.md" -type f 2>/dev/null | head -5 | while read arch_file; do
    echo "- $(basename "$arch_file"): Available for security architecture review"
done || echo "No architecture files found")

## Security Analysis Requirements
Based on risk level (${RISK_LEVEL}) and affected domains (${AFFECTED_DOMAINS}):

$(case "${RISK_LEVEL}" in
    "Critical")
        echo "- Comprehensive threat modeling required"
        echo "- Multi-agent security analysis (backend + frontend + architecture)"
        echo "- Penetration testing validation"
        echo "- Security architect oversight mandatory"
        ;;
    "High") 
        echo "- Focused threat analysis required"
        echo "- Technology-specific security review agents"
        echo "- Architecture security validation"
        echo "- Security risk assessment"
        ;;
    "Medium")
        echo "- Standard security validation"
        echo "- Domain-specific security analysis"
        echo "- Basic threat vector assessment" 
        ;;
    "Low")
        echo "- Basic security pattern validation"
        echo "- Minimal security agent coverage"
        ;;
esac)

## Available Context Files
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Complexity: .claude/features/${FEATURE_ID}/context/complexity-assessment.json  
- Implementation Context: .claude/features/${FEATURE_ID}/implementation/context/implementation-context.json
- Implementation Outputs: .claude/features/${FEATURE_ID}/implementation/agent-outputs/
- Code Changes: .claude/features/${FEATURE_ID}/implementation/code-changes/
- Architecture Files: .claude/features/${FEATURE_ID}/architecture/*.md (if any)
EOF

# Validate context file was created successfully
if [ ! -f "${SECURITY_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create security context file"
    exit 1
fi

# Output key file paths and analysis results for Einstein to use
echo "✅ Security review phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "SECURITY_CONTEXT_FILE=${SECURITY_CONTEXT_FILE}"
echo "SECURITY_COORDINATION_PLAN=${SECURITY_COORDINATION_PLAN}"  
echo "SECURITY_STRATEGY=${SECURITY_STRATEGY}"
echo "SECURITY_DIR=${SECURITY_DIR}"
echo ""
echo "📊 Security Analysis:"
echo "RISK_LEVEL=${RISK_LEVEL}"
echo "COMPLEXITY_LEVEL=${COMPLEXITY_LEVEL}"
echo "AFFECTED_DOMAINS=${AFFECTED_DOMAINS}"
echo "TECH_STACK=${TECH_STACK}"
echo ""
echo "🔒 Ready for security review coordinator analysis"