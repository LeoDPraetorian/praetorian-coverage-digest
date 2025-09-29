#!/bin/bash

# initialize-pipeline.sh
# Enhanced Einstein pipeline initialization with Jira integration
# Usage: initialize-pipeline.sh <EXECUTION_MODE> <ARGUMENTS>

set -e  # Exit on error

# Validate input
if [ $# -ne 2 ]; then
    echo "Usage: $0 <EXECUTION_MODE> <ARGUMENTS>"
    echo ""
    echo "EXECUTION_MODE: 'new' or 'resume'"
    echo "ARGUMENTS: Feature description or feature ID"
    exit 1
fi

EXECUTION_MODE="$1"
ARGUMENTS="$2"

echo "🚀 Einstein Pipeline Initialization"
echo "Mode: ${EXECUTION_MODE}, Arguments: ${ARGUMENTS}"

# Function to extract Jira ticket key from arguments
extract_jira_key() {
    local input="$1"
    echo "${input}" | grep -oE '\b[A-Z]{2,10}-[0-9]+\b' | head -1
}

# Function to generate short name from description
generate_short_name() {
    local input="$1"
    echo "${input}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30
}

# Function to check if input contains Jira references
contains_jira_references() {
    local input="$1"
    [[ "${input}" =~ [A-Z]{2,10}-[0-9]+ ]]
}

# Initialize pipeline tracking will be done after feature directory creation
# Pipeline directory will be created inside the feature directory for better organization

# Critical tool validation
echo "🔍 Validating required system tools..."

if ! command -v jq >/dev/null 2>&1; then
    ERROR_MSG="❌ Error: jq is required but not installed"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi

if ! command -v date >/dev/null 2>&1; then
    ERROR_MSG="❌ Error: date command is required but not available"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi

# Additional tool validation for Einstein pipeline
if ! command -v grep >/dev/null 2>&1; then
    ERROR_MSG="❌ Error: grep command is required but not available"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi

if ! command -v find >/dev/null 2>&1; then
    ERROR_MSG="❌ Error: find command is required but not available"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi

echo "✅ All required tools validated successfully"

# Validate workspace permissions
echo "🔐 Validating workspace permissions..."

# Test write permissions to .claude directory
if ! touch ".claude/.test_write_permissions" 2>/dev/null; then
    ERROR_MSG="❌ Error: No write permissions to .claude directory"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi
rm -f ".claude/.test_write_permissions"

# Pipeline directory permissions will be validated when feature directory is created

echo "✅ Workspace permissions validated successfully"

# Generate timestamp for new features
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Handle feature workspace creation for new features
if [ "${EXECUTION_MODE}" = "new" ]; then
    echo "🆕 Creating unified feature workspace for new feature..."
    
    # Step 1: Extract feature name from input (Jira or description)
    if contains_jira_references "${ARGUMENTS}"; then
        JIRA_KEY=$(extract_jira_key "${ARGUMENTS}")
        # Generate descriptive name from the rest of the content
        DESCRIPTION_PART=$(echo "${ARGUMENTS}" | sed "s/${JIRA_KEY}//g" | xargs)
        if [ -n "${DESCRIPTION_PART}" ]; then
            SHORT_DESC=$(generate_short_name "${DESCRIPTION_PART}")
            FEATURE_NAME="${JIRA_KEY}-${SHORT_DESC}"
        else
            FEATURE_NAME="${JIRA_KEY}"
        fi
        echo "📋 Jira ticket detected: ${JIRA_KEY}"
    else
        FEATURE_NAME=$(generate_short_name "${ARGUMENTS}")
        echo "📝 Direct description provided"
    fi
    
    FEATURE_ID="${FEATURE_NAME}_${TIMESTAMP}"
    echo "📁 Feature ID: ${FEATURE_ID}"
    
    # Step 2: Create main directory structure with pipeline subdirectory
    FEATURE_DIR=".claude/features/${FEATURE_ID}"
    echo "📁 Creating unified directory structure: ${FEATURE_ID}"
    if ! mkdir -p "${FEATURE_DIR}"/{pipeline,context,research,output,logs,architecture,implementation,quality-review,security-review,testing,deployment}; then
        ERROR_MSG="❌ Error: Failed to create feature workspace: ${FEATURE_DIR}"
        echo "${ERROR_MSG}"
        # Cannot log to PIPELINE_LOG yet as it doesn't exist
        exit 1
    fi
    
    # Step 3: Create pipeline directory and log inside feature directory
    PIPELINE_DIR="${FEATURE_DIR}/pipeline"
    PIPELINE_LOG="${PIPELINE_DIR}/einstein-pipeline-$(date +%Y%m%d_%H%M%S).log"
    echo "📝 Creating pipeline log: ${PIPELINE_LOG}"
    
    # Initialize pipeline log with metadata
    cat > "${PIPELINE_LOG}" << EOF
=== Einstein Pipeline Started ===
Mode: ${EXECUTION_MODE}
Arguments: ${ARGUMENTS}
Feature ID: ${FEATURE_ID}
Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)
===============================
EOF

    if [ ! -f "${PIPELINE_LOG}" ]; then
        echo "❌ Error: Failed to create pipeline log: ${PIPELINE_LOG}"
        exit 1
    fi
    
    # Create feature metadata with enhanced information
    cat > "${FEATURE_DIR}/metadata.json" << EOF
{
  "id": "${FEATURE_ID}",
  "description": "${ARGUMENTS}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "design_in_progress",
  "phase": "design",
  "pipeline": "einstein",
  "execution_mode": "new",
  "has_jira_reference": $(contains_jira_references "${ARGUMENTS}" && echo "true" || echo "false")
}
EOF

    # Create current feature environment file with ALL required paths
    cat > ".claude/features/current_feature.env" << EOF
export FEATURE_ID="${FEATURE_ID}"
export PIPELINE_DIR="${PIPELINE_DIR}"
export PIPELINE_LOG="${PIPELINE_LOG}"
export FEATURE_DIR="${FEATURE_DIR}"

# Phase 2: Intent Analysis
export REQUIREMENTS_FILE="${FEATURE_DIR}/context/requirements.json"

# Phase 3: Existing Implementation Discovery
export INPUT_REQUIREMENTS="${FEATURE_DIR}/context/requirements.json"
export OUTPUT_KNOWLEDGE="${FEATURE_DIR}/context/knowledge-base.md"
export SYNTHESIS_PLAN="${FEATURE_DIR}/context/synthesis-plan.json"
export COMPLIANCE_TRACKER="${FEATURE_DIR}/compliance/compliance-tracker.json"
export EXISTING_IMPL_DISCOVERY="${FEATURE_DIR}/context/existing-implementation-discovery.md"
export IMPLEMENTATION_GAP_ANALYSIS="${FEATURE_DIR}/context/implementation-gap-analysis.json"

# Phase 4: Research
export RESEARCH_DIR="${FEATURE_DIR}/research"

# Phase 5: Architectural Impact
export TRIAGE_CONTEXT="${FEATURE_DIR}/context/impact-triage-context.md"
export IMPACT_ANALYSIS="${FEATURE_DIR}/context/impact-analysis.json"

# Phase 6: Complexity Assessment
export ASSESSMENT_OUTPUT="${FEATURE_DIR}/context/complexity-assessment.json"

# Phase 7: Thinking Budget
export ARCH_THINKING_ALLOCATION="${FEATURE_DIR}/context/architecture-thinking-allocation.json"

# Phase 8: Architecture Planning
export ARCHITECTURE_DIR="${FEATURE_DIR}/architecture"
export ARCHITECTURE_CONTEXT_FILE="${ARCHITECTURE_DIR}/architect-context.md"
export ARCHITECTURE_COORDINATION_PLAN="${ARCHITECTURE_DIR}/coordination-plan.json"

# Phase 9: Implementation Planning
export PLANNING_CONTEXT="${FEATURE_DIR}/context/planning-context.md"
export AGENT_ASSIGNMENTS="${FEATURE_DIR}/output/agent-assignments.json"
export FINAL_PLAN="${FEATURE_DIR}/output/implementation-plan.md"

# Phase 10: Implementation Execution
export IMPL_DIR="${FEATURE_DIR}/implementation"
export IMPL_CONTEXT_FILE="${IMPL_DIR}/implementation-context.md"
export COORDINATION_DIR="${IMPL_DIR}/coordination"

# Phase 11: Quality Review
export QUALITY_DIR="${FEATURE_DIR}/quality-review"
export QUALITY_CONTEXT_FILE="${QUALITY_DIR}/quality-context.md"
export QUALITY_COORDINATION_PLAN="${QUALITY_DIR}/coordination-plan.json"
export QUALITY_STRATEGY="${QUALITY_DIR}/quality-strategy.md"

# Phase 12: Security Review
export SECURITY_DIR="${FEATURE_DIR}/security-review"
export SECURITY_CONTEXT_FILE="${SECURITY_DIR}/security-context.md"
export SECURITY_COORDINATION_PLAN="${SECURITY_DIR}/coordination-plan.json"
export SECURITY_STRATEGY="${SECURITY_DIR}/security-strategy.md"

# Phase 13: Testing
export TESTING_DIR="${FEATURE_DIR}/testing"
export TESTING_CONTEXT_FILE="${TESTING_DIR}/testing-context.md"
export TESTING_COORDINATION_PLAN="${TESTING_DIR}/coordination-plan.json"
export TESTING_STRATEGY="${TESTING_DIR}/testing-strategy.md"

# Phase 14: Deployment
export DEPLOY_DIR="${FEATURE_DIR}/deployment"
export DEPLOY_CONTEXT_FILE="${DEPLOY_DIR}/deployment-context.md"
export DEPLOY_COORDINATION_PLAN="${DEPLOY_DIR}/coordination-plan.json"
export DEPLOY_STRATEGY="${DEPLOY_DIR}/deployment-strategy.md"

# Feedback Loop Directories
export FEEDBACK_LOOP_DIR="${FEATURE_DIR}/feedback-loops"
export FEEDBACK_ITERATION_TRACKER="${FEEDBACK_LOOP_DIR}/iteration-tracker.json"
EOF
    
    if [ ! -f "${FEATURE_DIR}/metadata.json" ]; then
        ERROR_MSG="❌ Error: Failed to create feature metadata"
        echo "${ERROR_MSG}"
        echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
        exit 1
    fi
    
    echo "✅ Feature workspace created: ${FEATURE_ID}"
    
    # Step 3: Determine content source for downstream phases
    if contains_jira_references "${ARGUMENTS}"; then
        JIRA_TARGET_FILE="${FEATURE_DIR}/context/jira-resolved.md"
        CONTENT_SOURCE="file:${JIRA_TARGET_FILE}"
        echo "📋 Content source: Jira resolution → ${JIRA_TARGET_FILE}"
    else
        CONTENT_SOURCE="direct:${ARGUMENTS}"
        echo "📝 Content source: Direct arguments"
    fi
    
    # Log feature creation
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): Feature workspace created: ${FEATURE_ID}" >> "${PIPELINE_LOG}"
    
    # Output feature information
    FEATURE_WORKSPACE_CREATED=true
    FEATURE_WORKSPACE_PATH="${FEATURE_DIR}"
    
elif [ "${EXECUTION_MODE}" = "resume" ]; then
    echo "🔄 Resume mode - validating existing feature workspace..."
    
    # Extract feature ID from arguments (should be in format: feature-name_timestamp)
    if [[ "${ARGUMENTS}" =~ ^[a-z0-9-]+_[0-9]{8}_[0-9]{6}$ ]]; then
        FEATURE_ID="${ARGUMENTS}"
        FEATURE_DIR=".claude/features/${FEATURE_ID}"
        
        if [ ! -d "${FEATURE_DIR}" ]; then
            ERROR_MSG="❌ Error: Feature workspace not found: ${FEATURE_DIR}"
            echo "${ERROR_MSG}"
            exit 1
        fi
        
        if [ ! -f "${FEATURE_DIR}/metadata.json" ]; then
            ERROR_MSG="❌ Error: Feature metadata not found: ${FEATURE_DIR}/metadata.json"
            echo "${ERROR_MSG}"
            exit 1
        fi
        
        # Create pipeline directory inside feature directory (if it doesn't exist)
        PIPELINE_DIR="${FEATURE_DIR}/pipeline"
        if ! mkdir -p "${PIPELINE_DIR}"; then
            ERROR_MSG="❌ Error: Failed to create pipeline directory: ${PIPELINE_DIR}"
            echo "${ERROR_MSG}"
            exit 1
        fi
        
        # Create new pipeline log for this resume session
        PIPELINE_LOG="${PIPELINE_DIR}/einstein-pipeline-$(date +%Y%m%d_%H%M%S).log"
        echo "📝 Creating resume pipeline log: ${PIPELINE_LOG}"
        
        # Initialize pipeline log with metadata
        cat > "${PIPELINE_LOG}" << EOF
=== Einstein Pipeline Resumed ===
Mode: ${EXECUTION_MODE}
Feature ID: ${FEATURE_ID}
Resumed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
===============================
EOF

        if [ ! -f "${PIPELINE_LOG}" ]; then
            echo "❌ Error: Failed to create pipeline log: ${PIPELINE_LOG}"
            exit 1
        fi
        
        # Update current feature environment with ALL required paths
        cat > ".claude/features/current_feature.env" << EOF
export FEATURE_ID="${FEATURE_ID}"
export PIPELINE_DIR="${PIPELINE_DIR}"
export PIPELINE_LOG="${PIPELINE_LOG}"
export FEATURE_DIR="${FEATURE_DIR}"

# Phase 2: Intent Analysis
export REQUIREMENTS_FILE="${FEATURE_DIR}/context/requirements.json"

# Phase 3: Existing Implementation Discovery
export INPUT_REQUIREMENTS="${FEATURE_DIR}/context/requirements.json"
export OUTPUT_KNOWLEDGE="${FEATURE_DIR}/context/knowledge-base.md"
export SYNTHESIS_PLAN="${FEATURE_DIR}/context/synthesis-plan.json"
export COMPLIANCE_TRACKER="${FEATURE_DIR}/compliance/compliance-tracker.json"
export EXISTING_IMPL_DISCOVERY="${FEATURE_DIR}/context/existing-implementation-discovery.md"
export IMPLEMENTATION_GAP_ANALYSIS="${FEATURE_DIR}/context/implementation-gap-analysis.json"

# Phase 4: Research
export RESEARCH_DIR="${FEATURE_DIR}/research"

# Phase 5: Architectural Impact
export TRIAGE_CONTEXT="${FEATURE_DIR}/context/impact-triage-context.md"
export IMPACT_ANALYSIS="${FEATURE_DIR}/context/impact-analysis.json"

# Phase 6: Complexity Assessment
export ASSESSMENT_OUTPUT="${FEATURE_DIR}/context/complexity-assessment.json"

# Phase 7: Thinking Budget
export ARCH_THINKING_ALLOCATION="${FEATURE_DIR}/context/architecture-thinking-allocation.json"

# Phase 8: Architecture Planning
export ARCHITECTURE_DIR="${FEATURE_DIR}/architecture"
export ARCHITECTURE_CONTEXT_FILE="${ARCHITECTURE_DIR}/architect-context.md"
export ARCHITECTURE_COORDINATION_PLAN="${ARCHITECTURE_DIR}/coordination-plan.json"

# Phase 9: Implementation Planning
export PLANNING_CONTEXT="${FEATURE_DIR}/context/planning-context.md"
export AGENT_ASSIGNMENTS="${FEATURE_DIR}/output/agent-assignments.json"
export FINAL_PLAN="${FEATURE_DIR}/output/implementation-plan.md"

# Phase 10: Implementation Execution
export IMPL_DIR="${FEATURE_DIR}/implementation"
export IMPL_CONTEXT_FILE="${IMPL_DIR}/implementation-context.md"
export COORDINATION_DIR="${IMPL_DIR}/coordination"

# Phase 11: Quality Review
export QUALITY_DIR="${FEATURE_DIR}/quality-review"
export QUALITY_CONTEXT_FILE="${QUALITY_DIR}/quality-context.md"
export QUALITY_COORDINATION_PLAN="${QUALITY_DIR}/coordination-plan.json"
export QUALITY_STRATEGY="${QUALITY_DIR}/quality-strategy.md"

# Phase 12: Security Review
export SECURITY_DIR="${FEATURE_DIR}/security-review"
export SECURITY_CONTEXT_FILE="${SECURITY_DIR}/security-context.md"
export SECURITY_COORDINATION_PLAN="${SECURITY_DIR}/coordination-plan.json"
export SECURITY_STRATEGY="${SECURITY_DIR}/security-strategy.md"

# Phase 13: Testing
export TESTING_DIR="${FEATURE_DIR}/testing"
export TESTING_CONTEXT_FILE="${TESTING_DIR}/testing-context.md"
export TESTING_COORDINATION_PLAN="${TESTING_DIR}/coordination-plan.json"
export TESTING_STRATEGY="${TESTING_DIR}/testing-strategy.md"

# Phase 14: Deployment
export DEPLOY_DIR="${FEATURE_DIR}/deployment"
export DEPLOY_CONTEXT_FILE="${DEPLOY_DIR}/deployment-context.md"
export DEPLOY_COORDINATION_PLAN="${DEPLOY_DIR}/deployment-plan.json"
export DEPLOY_STRATEGY="${DEPLOY_DIR}/deployment-strategy.md"

# Feedback Loop Directories
export FEEDBACK_LOOP_DIR="${FEATURE_DIR}/feedback-loops"
export FEEDBACK_ITERATION_TRACKER="${FEEDBACK_LOOP_DIR}/iteration-tracker.json"
EOF
        
        # Determine content source for resumed features
        POTENTIAL_JIRA_FILE="${FEATURE_DIR}/context/jira-resolved.md"
        if [ -f "${POTENTIAL_JIRA_FILE}" ]; then
            JIRA_TARGET_FILE="${POTENTIAL_JIRA_FILE}"
            CONTENT_SOURCE="file:${JIRA_TARGET_FILE}"
            echo "📋 Resume content source: Existing Jira resolution"
        else
            # Check metadata for original description
            ORIGINAL_DESC=$(cat "${FEATURE_DIR}/metadata.json" | jq -r '.description // ""')
            CONTENT_SOURCE="direct:${ORIGINAL_DESC}"
            echo "📝 Resume content source: Original description from metadata"
        fi
        
        echo "✅ Existing feature workspace validated: ${FEATURE_ID}"
        
        # Output feature information
        FEATURE_WORKSPACE_CREATED=false
        FEATURE_WORKSPACE_PATH="${FEATURE_DIR}"
    else
        ERROR_MSG="❌ Error: Invalid feature ID format: ${ARGUMENTS} (expected: name_YYYYMMDD_HHMMSS)"
        echo "${ERROR_MSG}"
        echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
        exit 1
    fi
    
else
    ERROR_MSG="❌ Error: Unknown execution mode: ${EXECUTION_MODE}"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi

# Log initialization success
INIT_SUCCESS_MSG="✅ Pipeline infrastructure initialized successfully"
echo "${INIT_SUCCESS_MSG}"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): ${INIT_SUCCESS_MSG}" >> "${PIPELINE_LOG}"

# Output key paths and status for Einstein to use
echo ""
echo "📋 Pipeline Initialization Results:"
echo "PIPELINE_DIR=${PIPELINE_DIR}"
echo "PIPELINE_LOG=${PIPELINE_LOG}"
echo "EXECUTION_MODE=${EXECUTION_MODE}"
echo "FEATURE_ID=${FEATURE_ID}"
echo "FEATURE_WORKSPACE_PATH=${FEATURE_WORKSPACE_PATH}"
echo "FEATURE_WORKSPACE_CREATED=${FEATURE_WORKSPACE_CREATED}"
echo "CONTENT_SOURCE=${CONTENT_SOURCE:-}"
echo "JIRA_TARGET_FILE=${JIRA_TARGET_FILE:-}"
echo "TOOLS_VALIDATED=true"
echo "PERMISSIONS_VALIDATED=true"
echo "INITIALIZATION_STATUS=success"
echo ""
echo "🎯 Ready for Einstein orchestration with unified directory structure"