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
COMPLEXITY_LEVEL=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.level' 2>/dev/null || echo "Unknown")
AFFECTED_DOMAINS=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.affected_domains[]?' 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "Unknown")
TECH_STACK=$(cat ".claude/features/${FEATURE_ID}/context/implementation-context.json" | jq -r '.technology_requirements | to_entries[] | "\(.key): \(.value)"' 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "Unknown")

# Determine risk level based on implementation analysis
RISK_LEVEL="Medium"  # Default
if echo "${AFFECTED_DOMAINS}" | grep -qi "authentication\|authorization\|security"; then
    RISK_LEVEL="High"
elif echo "${AFFECTED_DOMAINS}" | grep -qi "backend\|api\|integration"; then
    RISK_LEVEL="Medium"
elif [ "${COMPLEXITY_LEVEL}" = "Complex" ]; then
    RISK_LEVEL="High"
elif [ "${COMPLEXITY_LEVEL}" = "Simple" ]; then
    RISK_LEVEL="Low"
fi

echo "📊 Security risk assessment: ${RISK_LEVEL} (Complexity: ${COMPLEXITY_LEVEL}, Domains: ${AFFECTED_DOMAINS})"

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