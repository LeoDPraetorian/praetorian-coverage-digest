#!/bin/bash

# setup-deployment-phase.sh
# Mechanical setup and deployment operations for deployment phase
# Usage: setup-deployment-phase.sh <FEATURE_ID>

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

echo "🚀 Starting deployment phase setup for feature: ${FEATURE_ID}"

# Initialize deployment workspace
DEPLOY_WORKSPACE=".claude/features/${FEATURE_ID}/deployment"
echo "📁 Creating deployment workspace: ${DEPLOY_WORKSPACE}"
mkdir -p "${DEPLOY_WORKSPACE}"/{context,coordination,staging,production,validation,rollback,logs}

# Update metadata with deployment start
DEPLOY_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Deployment started: ${DEPLOY_START}"

jq '.status = "deployment_in_progress" | .phase = "deployment" | .deployment_started = "'${DEPLOY_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
DEPLOY_CONTEXT_FILE=".claude/features/${FEATURE_ID}/deployment/context/deployment-context.md"
DEPLOY_COORDINATION_PLAN=".claude/features/${FEATURE_ID}/deployment/coordination/deployment-coordination-plan.json"
DEPLOY_STRATEGY=".claude/features/${FEATURE_ID}/deployment/coordination/deployment-strategy.md"

# Analyze implementation outputs for deployment context
IMPL_DIR=".claude/features/${FEATURE_ID}/implementation"
QUALITY_DIR=".claude/features/${FEATURE_ID}/quality-review" 
SECURITY_DIR=".claude/features/${FEATURE_ID}/security-review"
COMPLEXITY_LEVEL=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.level' 2>/dev/null || echo "Unknown")
AFFECTED_DOMAINS=$(cat ".claude/features/${FEATURE_ID}/context/complexity-assessment.json" | jq -r '.affected_domains[]?' 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "Unknown")

# Determine deployment risk level based on validation results and feature analysis
DEPLOYMENT_RISK="Medium"  # Default
SECURITY_RISK="Low"  # Default
QUALITY_RISK="Low"   # Default

# Analyze security review results if available
if [ -d "${SECURITY_DIR}" ]; then
    SECURITY_ISSUES=$(find "${SECURITY_DIR}" -name "*.json" -exec jq -r '.issue_summary.critical_count // 0' {} \; 2>/dev/null | head -1)
    if [ "${SECURITY_ISSUES:-0}" -gt 0 ]; then
        SECURITY_RISK="High"
        DEPLOYMENT_RISK="High"
    fi
fi

# Analyze quality review results if available  
if [ -d "${QUALITY_DIR}" ]; then
    QUALITY_ISSUES=$(find "${QUALITY_DIR}" -name "*.json" -exec jq -r '.issue_summary.critical_count // 0' {} \; 2>/dev/null | head -1)
    if [ "${QUALITY_ISSUES:-0}" -gt 0 ]; then
        QUALITY_RISK="High"
        DEPLOYMENT_RISK="High"
    fi
fi

# Analyze feature complexity impact on deployment risk
if echo "${AFFECTED_DOMAINS}" | grep -qi "authentication\|authorization\|security"; then
    DEPLOYMENT_RISK="High"
elif echo "${AFFECTED_DOMAINS}" | grep -qi "backend\|api\|database"; then
    DEPLOYMENT_RISK="Medium"
elif [ "${COMPLEXITY_LEVEL}" = "Complex" ]; then
    DEPLOYMENT_RISK="High"
elif [ "${COMPLEXITY_LEVEL}" = "Simple" ]; then
    DEPLOYMENT_RISK="Low"
fi

echo "📊 Deployment risk assessment: ${DEPLOYMENT_RISK} (Complexity: ${COMPLEXITY_LEVEL}, Security: ${SECURITY_RISK}, Quality: ${QUALITY_RISK})"

# Ensure we're in the correct directory for build and deployment
cd /Users/nathansportsman/chariot-development-platform

# Create logs directory for build and deployment
mkdir -p ".claude/features/${FEATURE_ID}/deployment/logs"

# Build the implemented code
echo "🔨 Building implementation..."
BUILD_LOG=".claude/features/${FEATURE_ID}/deployment/logs/build.log"
if make build 2>&1 | tee "${BUILD_LOG}"; then
    BUILD_STATUS="success"
    echo "✅ Build completed successfully"
else
    BUILD_STATUS="failed"
    echo "❌ Build failed - see ${BUILD_LOG} for details"
    echo "BUILD_STATUS=${BUILD_STATUS}"
    echo "BUILD_LOG=${BUILD_LOG}"
    exit 1
fi

# Deploy the complete Chariot platform
echo "🚀 Deploying Chariot platform with new feature..."
DEPLOY_LOG=".claude/features/${FEATURE_ID}/deployment/logs/deploy.log"
if make guard 2>&1 | tee "${DEPLOY_LOG}"; then
    DEPLOY_STATUS="success"
    echo "✅ Deployment completed successfully"
else
    DEPLOY_STATUS="failed"
    echo "❌ Deployment failed - see ${DEPLOY_LOG} for details"
    echo "BUILD_STATUS=${BUILD_STATUS}"
    echo "BUILD_LOG=${BUILD_LOG}"
    echo "DEPLOY_STATUS=${DEPLOY_STATUS}"
    echo "DEPLOY_LOG=${DEPLOY_LOG}"
    exit 1
fi

# Wait for system to be ready (health check polling)
echo "⏳ Waiting for Chariot platform to be ready..."
PLATFORM_READY=false
for i in {1..30}; do
    if curl -k -s https://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Chariot platform is ready on https://localhost:3000"
        PLATFORM_READY=true
        break
    fi
    echo "Waiting for platform... (attempt $i/30)"
    sleep 10
done

if [ "${PLATFORM_READY}" = false ]; then
    echo "❌ Platform failed to start within 5 minutes"
    echo "BUILD_STATUS=${BUILD_STATUS}"
    echo "BUILD_LOG=${BUILD_LOG}"
    echo "DEPLOY_STATUS=${DEPLOY_STATUS}"
    echo "DEPLOY_LOG=${DEPLOY_LOG}"
    echo "PLATFORM_READY=${PLATFORM_READY}"
    exit 1
fi

# Perform API health checks
echo "🔍 Performing API health checks..."
API_HEALTH_LOG=".claude/features/${FEATURE_ID}/deployment/logs/api-health.log"
if curl -k -s https://localhost:3000/api/health > "${API_HEALTH_LOG}" 2>&1; then
    API_HEALTH_STATUS="healthy"
    echo "✅ API health check completed successfully"
else
    API_HEALTH_STATUS="unhealthy"
    echo "⚠️ API health check failed - see ${API_HEALTH_LOG} for details"
fi

# Generate deployment context file
echo "📄 Generating deployment context: ${DEPLOY_CONTEXT_FILE}"
mkdir -p "$(dirname "${DEPLOY_CONTEXT_FILE}")"

cat > "${DEPLOY_CONTEXT_FILE}" << EOF
# Deployment Context

## Feature Overview
$(cat .claude/features/${FEATURE_ID}/metadata.json | jq -r '.description' 2>/dev/null || echo "No description found")

## Deployment Risk Assessment
- **Deployment Risk**: ${DEPLOYMENT_RISK}
- **Security Risk**: ${SECURITY_RISK}
- **Quality Risk**: ${QUALITY_RISK}
- **Complexity**: ${COMPLEXITY_LEVEL}
- **Affected Domains**: ${AFFECTED_DOMAINS}

## Build and Deployment Results
- **Build Status**: ${BUILD_STATUS}
- **Deploy Status**: ${DEPLOY_STATUS}
- **Platform Ready**: ${PLATFORM_READY}
- **API Health**: ${API_HEALTH_STATUS}
- **Deployment Time**: ${DEPLOY_START}

## Implementation Summary
$(cat .claude/features/${FEATURE_ID}/context/requirements.json | jq -r '.user_stories[]?' 2>/dev/null | head -3 || echo "No user stories found")

## Quality and Security Status
$(if [ -d ".claude/features/${FEATURE_ID}/quality-review" ]; then
    echo "### Quality Review Status"
    find ".claude/features/${FEATURE_ID}/quality-review" -name "*coordination*" -type f | head -1 | xargs cat 2>/dev/null | jq -r '.recommendation // "Quality review completed"' || echo "Quality validation completed"
else
    echo "No quality review artifacts found"
fi)

$(if [ -d ".claude/features/${FEATURE_ID}/security-review" ]; then
    echo "### Security Review Status"  
    find ".claude/features/${FEATURE_ID}/security-review" -name "*coordination*" -type f | head -1 | xargs cat 2>/dev/null | jq -r '.recommendation // "Security review completed"' || echo "Security validation completed"
else
    echo "No security review artifacts found"
fi)

## Deployment Logs and Evidence
- **Build Log**: ${BUILD_LOG}
- **Deploy Log**: ${DEPLOY_LOG}
- **API Health Log**: ${API_HEALTH_LOG}
- **Platform URL**: https://localhost:3000

## Validation Requirements
Based on deployment risk (${DEPLOYMENT_RISK}):

$(case "${DEPLOYMENT_RISK}" in
    "High")
        echo "- Comprehensive production validation required"
        echo "- Full end-to-end testing with live system"
        echo "- Performance validation under load"
        echo "- Security validation in production environment"
        echo "- Integration testing with all services"
        ;;
    "Medium") 
        echo "- Focused validation on affected domains"
        echo "- End-to-end testing of implemented features"
        echo "- Basic performance validation"
        echo "- Integration testing of modified services"
        ;;
    "Low")
        echo "- Basic functionality validation"
        echo "- Smoke testing of new features"
        echo "- Minimal integration validation"
        ;;
esac)

## Available Context Files
- Requirements: .claude/features/${FEATURE_ID}/context/requirements.json
- Complexity: .claude/features/${FEATURE_ID}/context/complexity-assessment.json
- Implementation: .claude/features/${FEATURE_ID}/implementation/
- Quality Review: .claude/features/${FEATURE_ID}/quality-review/ (if available)
- Security Review: .claude/features/${FEATURE_ID}/security-review/ (if available)
EOF

# Validate context file was created successfully
if [ ! -f "${DEPLOY_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create deployment context file"
    exit 1
fi

# Output key file paths and deployment results for Einstein to use
echo "✅ Deployment phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "DEPLOY_CONTEXT_FILE=${DEPLOY_CONTEXT_FILE}"
echo "DEPLOY_COORDINATION_PLAN=${DEPLOY_COORDINATION_PLAN}"
echo "DEPLOY_STRATEGY=${DEPLOY_STRATEGY}"
echo "DEPLOY_WORKSPACE=${DEPLOY_WORKSPACE}"
echo ""
echo "📊 Deployment Status:"
echo "DEPLOYMENT_RISK=${DEPLOYMENT_RISK}"
echo "BUILD_STATUS=${BUILD_STATUS}"
echo "DEPLOY_STATUS=${DEPLOY_STATUS}"
echo "PLATFORM_READY=${PLATFORM_READY}"
echo "API_HEALTH_STATUS=${API_HEALTH_STATUS}"
echo "COMPLEXITY_LEVEL=${COMPLEXITY_LEVEL}"
echo "AFFECTED_DOMAINS=${AFFECTED_DOMAINS}"
echo ""
echo "📝 Logs Available:"
echo "BUILD_LOG=${BUILD_LOG}"
echo "DEPLOY_LOG=${DEPLOY_LOG}"
echo "API_HEALTH_LOG=${API_HEALTH_LOG}"
echo ""
echo "🎯 Ready for deployment coordinator analysis"