#!/bin/bash

# initialize-pipeline.sh
# Mechanical pipeline initialization operations
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

echo "🔧 Initializing Einstein pipeline infrastructure"
echo "Mode: ${EXECUTION_MODE}, Arguments: ${ARGUMENTS}"

# Initialize pipeline tracking
PIPELINE_DIR=".claude/pipeline"
echo "📁 Creating pipeline directory: ${PIPELINE_DIR}"
if ! mkdir -p "${PIPELINE_DIR}"; then
    echo "❌ Error: Failed to create pipeline directory: ${PIPELINE_DIR}"
    exit 1
fi

# Create timestamped pipeline log
PIPELINE_LOG="${PIPELINE_DIR}/einstein-pipeline-$(date +%Y%m%d_%H%M%S).log"
echo "📝 Creating pipeline log: ${PIPELINE_LOG}"

# Initialize pipeline log with metadata
cat > "${PIPELINE_LOG}" << EOF
=== Einstein Pipeline Started ===
Mode: ${EXECUTION_MODE}
Arguments: ${ARGUMENTS}
Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)
===============================
EOF

if [ ! -f "${PIPELINE_LOG}" ]; then
    echo "❌ Error: Failed to create pipeline log: ${PIPELINE_LOG}"
    exit 1
fi

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

# Test pipeline directory permissions
if ! touch "${PIPELINE_DIR}/.test_write_permissions" 2>/dev/null; then
    ERROR_MSG="❌ Error: No write permissions to pipeline directory"
    echo "${ERROR_MSG}"
    echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
    exit 1
fi
rm -f "${PIPELINE_DIR}/.test_write_permissions"

echo "✅ Workspace permissions validated successfully"

# Handle feature workspace creation for new features
if [ "${EXECUTION_MODE}" = "new" ]; then
    echo "🚀 Creating feature workspace for new feature..."
    
    # Generate feature ID from arguments
    FEATURE_NAME=$(echo "${ARGUMENTS}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    FEATURE_ID="${FEATURE_NAME}_${TIMESTAMP}"
    
    echo "📁 Feature ID: ${FEATURE_ID}"
    
    # Create feature workspace directory structure
    FEATURE_DIR=".claude/features/${FEATURE_ID}"
    if ! mkdir -p "${FEATURE_DIR}"/{context,research,output,logs,architecture,implementation,quality-review,security-review,testing,deployment}; then
        ERROR_MSG="❌ Error: Failed to create feature workspace: ${FEATURE_DIR}"
        echo "${ERROR_MSG}"
        echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
        exit 1
    fi
    
    # Create feature metadata
    cat > "${FEATURE_DIR}/metadata.json" << EOF
{
  "id": "${FEATURE_ID}",
  "description": "${ARGUMENTS}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "design_in_progress",
  "phase": "design",
  "pipeline": "einstein"
}
EOF

    # Create current feature environment file
    echo "FEATURE_ID=${FEATURE_ID}" > ".claude/features/current_feature.env"
    
    if [ ! -f "${FEATURE_DIR}/metadata.json" ]; then
        ERROR_MSG="❌ Error: Failed to create feature metadata"
        echo "${ERROR_MSG}"
        echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
        exit 1
    fi
    
    echo "✅ Feature workspace created: ${FEATURE_ID}"
    
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
            echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
            exit 1
        fi
        
        if [ ! -f "${FEATURE_DIR}/metadata.json" ]; then
            ERROR_MSG="❌ Error: Feature metadata not found: ${FEATURE_DIR}/metadata.json"
            echo "${ERROR_MSG}"
            echo "${ERROR_MSG}" >> "${PIPELINE_LOG}"
            exit 1
        fi
        
        # Update current feature environment
        echo "FEATURE_ID=${FEATURE_ID}" > ".claude/features/current_feature.env"
        
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
echo "TOOLS_VALIDATED=true"
echo "PERMISSIONS_VALIDATED=true"
echo "INITIALIZATION_STATUS=success"
echo ""
echo "🎯 Ready for Einstein orchestration"