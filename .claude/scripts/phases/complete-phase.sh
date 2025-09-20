#!/bin/bash

# complete-phase.sh
# Generic phase completion handler with metadata updates and validation
# Usage: complete-phase.sh <phase-name> <next-phase> <feature-id> [additional-metadata] [pipeline-log]

set -e  # Exit on error

# Validate input parameters
if [ $# -lt 3 ]; then
    echo "Usage: $0 <phase-name> <next-phase> <feature-id> [additional-metadata] [pipeline-log]"
    echo ""
    echo "Examples:"
    echo "  $0 implementation quality-review FEAT-123"
    echo "  $0 implementation quality-review FEAT-123 'agents_spawned=3'"
    echo "  $0 requirements analysis FEAT-123 '' /path/to/pipeline.log"
    exit 1
fi

PHASE_NAME="$1"
NEXT_PHASE="$2" 
FEATURE_ID="$3"
ADDITIONAL_META="$4"  # Optional: JSON metadata to add
PIPELINE_LOG="$5"     # Optional: Path to pipeline log file

# Validate feature exists
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "❌ Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

METADATA_FILE=".claude/features/${FEATURE_ID}/metadata.json"

# Validate metadata file exists
if [ ! -f "${METADATA_FILE}" ]; then
    echo "❌ Metadata file not found: ${METADATA_FILE}"
    exit 1
fi

# Generate completion timestamp
COMPLETION_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "🏁 Completing phase: ${PHASE_NAME}"
echo "📅 Completion time: ${COMPLETION_TIME}"
echo "➡️  Next phase: ${NEXT_PHASE}"

# Build metadata update command
METADATA_UPDATES=""

# Add standard phase completion fields
METADATA_UPDATES=".status = \"${PHASE_NAME}_completed\""
METADATA_UPDATES="${METADATA_UPDATES} | .phase = \"${PHASE_NAME}_complete\""
METADATA_UPDATES="${METADATA_UPDATES} | .${PHASE_NAME}_completed = \"${COMPLETION_TIME}\""
METADATA_UPDATES="${METADATA_UPDATES} | .next_phase = \"${NEXT_PHASE}\""

# Parse and add additional metadata if provided
if [ -n "${ADDITIONAL_META}" ]; then
    echo "📋 Additional metadata: ${ADDITIONAL_META}"
    
    # Handle key=value pairs separated by commas or semicolons
    echo "${ADDITIONAL_META}" | tr ',' '\n' | tr ';' '\n' | while IFS='=' read -r key value; do
        if [ -n "${key}" ] && [ -n "${value}" ]; then
            # Clean up key and value
            key=$(echo "${key}" | xargs)
            value=$(echo "${value}" | xargs)
            
            # Add to metadata updates
            if [[ "${value}" =~ ^[0-9]+$ ]]; then
                # Numeric value
                METADATA_UPDATES="${METADATA_UPDATES} | .${key} = ${value}"
            else
                # String value
                METADATA_UPDATES="${METADATA_UPDATES} | .${key} = \"${value}\""
            fi
        fi
    done
fi

# Apply metadata updates atomically
echo "📝 Updating metadata: ${METADATA_FILE}"

jq "${METADATA_UPDATES}" "${METADATA_FILE}" > "${METADATA_FILE}.tmp"

# Validate JSON was created successfully
if [ ! -f "${METADATA_FILE}.tmp" ]; then
    echo "❌ Failed to create metadata update"
    exit 1
fi

# Validate JSON syntax
if ! jq empty "${METADATA_FILE}.tmp" 2>/dev/null; then
    echo "❌ Generated invalid JSON in metadata update"
    rm -f "${METADATA_FILE}.tmp"
    exit 1
fi

# Atomic replacement
mv "${METADATA_FILE}.tmp" "${METADATA_FILE}"

# Validate completion status
COMPLETION_STATUS=$(cat "${METADATA_FILE}" | jq -r '.status')
EXPECTED_STATUS="${PHASE_NAME}_completed"

if [ "${COMPLETION_STATUS}" = "${EXPECTED_STATUS}" ]; then
    SUCCESS_MSG="✅ $(echo "${PHASE_NAME}" | sed 's/^./\U&/') Phase Complete"
    echo "${SUCCESS_MSG}"
    
    # Log to pipeline log if specified
    if [ -n "${PIPELINE_LOG}" ] && [ -f "$(dirname "${PIPELINE_LOG}")" ]; then
        echo "${SUCCESS_MSG}" | tee -a "${PIPELINE_LOG}"
    fi
    
    # Display summary information
    echo ""
    echo "📊 Phase Completion Summary:"
    echo "   • Feature ID: ${FEATURE_ID}"
    echo "   • Phase: ${PHASE_NAME}"
    echo "   • Status: ${COMPLETION_STATUS}"
    echo "   • Completed: ${COMPLETION_TIME}"
    echo "   • Next Phase: ${NEXT_PHASE}"
    
    # Display additional metadata if present
    if [ -n "${ADDITIONAL_META}" ]; then
        echo "   • Additional Data:"
        echo "${ADDITIONAL_META}" | tr ',' '\n' | tr ';' '\n' | while IFS='=' read -r key value; do
            if [ -n "${key}" ] && [ -n "${value}" ]; then
                key=$(echo "${key}" | xargs)
                value=$(echo "${value}" | xargs) 
                echo "     - ${key}: ${value}"
            fi
        done
    fi
    
    echo ""
    echo "🎯 Phase completion successful"
    echo "NEXT_PHASE=${NEXT_PHASE}"
    echo "STATUS=${COMPLETION_STATUS}"
    echo "COMPLETION_TIME=${COMPLETION_TIME}"
    
else
    ERROR_MSG="❌ $(echo "${PHASE_NAME}" | sed 's/^./\U&/') Phase Failed: ${COMPLETION_STATUS}"
    echo "${ERROR_MSG}"
    
    # Log error to pipeline log if specified
    if [ -n "${PIPELINE_LOG}" ] && [ -f "$(dirname "${PIPELINE_LOG}")" ]; then
        echo "${ERROR_MSG}" | tee -a "${PIPELINE_LOG}"
    fi
    
    echo ""
    echo "💥 Phase completion failed"
    echo "Expected status: ${EXPECTED_STATUS}"
    echo "Actual status: ${COMPLETION_STATUS}"
    echo "Metadata file: ${METADATA_FILE}"
    
    exit 1
fi