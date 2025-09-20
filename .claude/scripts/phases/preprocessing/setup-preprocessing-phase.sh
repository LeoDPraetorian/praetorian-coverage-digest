#!/bin/bash

# setup-preprocessing-phase.sh
# Mechanical setup operations for preprocessing phase
# Usage: setup-preprocessing-phase.sh <FEATURE_ID> <USER_ARGUMENTS>

set -e  # Exit on error

# Validate input
if [ $# -ne 2 ]; then
    echo "Usage: $0 <FEATURE_ID> <USER_ARGUMENTS>"
    exit 1
fi

FEATURE_ID="$1"
USER_ARGUMENTS="$2"

# Validate feature exists
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "❌ Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

echo "🔄 Starting preprocessing phase setup for feature: ${FEATURE_ID}"

# Initialize preprocessing workspace
PREPROCESSING_DIR=".claude/features/${FEATURE_ID}/preprocessing"
echo "📁 Creating preprocessing workspace: ${PREPROCESSING_DIR}"
mkdir -p "${PREPROCESSING_DIR}"/{context,coordination,resolution,logs}

# Update metadata with preprocessing start
PREPROCESSING_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "⏱️  Preprocessing started: ${PREPROCESSING_START}"

jq '.status = "preprocessing_in_progress" | .phase = "preprocessing" | .preprocessing_started = "'${PREPROCESSING_START}'"' \
   ".claude/features/${FEATURE_ID}/metadata.json" > ".claude/features/${FEATURE_ID}/metadata.json.tmp" && \
   mv ".claude/features/${FEATURE_ID}/metadata.json.tmp" ".claude/features/${FEATURE_ID}/metadata.json"

# Define output file paths
PREPROCESSING_CONTEXT_FILE=".claude/features/${FEATURE_ID}/preprocessing/context/preprocessing-context.md"
PREPROCESSING_PLAN=".claude/features/${FEATURE_ID}/preprocessing/coordination/preprocessing-plan.json"
JIRA_RESOLVED_FILE=".claude/features/${FEATURE_ID}/preprocessing/resolution/jira-resolved.md"

# Analyze user input for Jira references
echo "🔍 Analyzing user input for external references..."
JIRA_DETECTED=false
JIRA_REFERENCES=""

# Check for Jira ticket patterns (e.g., CHA-1232, PROJ-123)
if echo "${USER_ARGUMENTS}" | grep -qE '\b[A-Z]{2,10}-[0-9]+\b'; then
    JIRA_DETECTED=true
    JIRA_REFERENCES=$(echo "${USER_ARGUMENTS}" | grep -oE '\b[A-Z]{2,10}-[0-9]+\b' | tr '\n' ',' | sed 's/,$//')
    echo "🎫 Jira references detected: ${JIRA_REFERENCES}"
else
    echo "ℹ️  No Jira references detected in user input"
fi

# Check for Jira URLs
if echo "${USER_ARGUMENTS}" | grep -qE 'atlassian\.net.*\/browse\/'; then
    JIRA_DETECTED=true
    JIRA_URLS=$(echo "${USER_ARGUMENTS}" | grep -oE 'https://[^/]+\.atlassian\.net/[^[:space:]]*' | tr '\n' ',' | sed 's/,$//')
    echo "🔗 Jira URLs detected: ${JIRA_URLS}"
fi

# Determine preprocessing requirements
PREPROCESSING_REQUIRED="false"
if [ "${JIRA_DETECTED}" = true ]; then
    PREPROCESSING_REQUIRED="true"
    echo "📋 Preprocessing required for Jira reference resolution"
else
    echo "📋 No preprocessing required - proceeding with original input"
fi

# Generate preprocessing context file
echo "📄 Generating preprocessing context: ${PREPROCESSING_CONTEXT_FILE}"
mkdir -p "$(dirname "${PREPROCESSING_CONTEXT_FILE}")"

cat > "${PREPROCESSING_CONTEXT_FILE}" << EOF
# Preprocessing Context

## User Input Analysis
**Original Input**: ${USER_ARGUMENTS}

**Input Length**: $(echo "${USER_ARGUMENTS}" | wc -c) characters

## Reference Detection Results
- **Jira References Detected**: ${JIRA_DETECTED}
- **Preprocessing Required**: ${PREPROCESSING_REQUIRED}
- **Detected References**: ${JIRA_REFERENCES}
$(if [ -n "${JIRA_URLS:-}" ]; then echo "- **Detected URLs**: ${JIRA_URLS}"; fi)

## Preprocessing Requirements
$(if [ "${PREPROCESSING_REQUIRED}" = "true" ]; then
    echo "### Reference Resolution Needed"
    echo "- Resolve Jira ticket references to full content"
    echo "- Analyze resolved content for appropriate next agent"
    echo "- Create enriched feature description"
    echo "- Handle resolution failures gracefully"
else
    echo "### No Preprocessing Required"
    echo "- No external references detected"
    echo "- Proceed directly to intent analysis"
    echo "- Use original user input as-is"
fi)

## Output Locations
- **Preprocessing Plan**: ${PREPROCESSING_PLAN}
- **Resolved Content**: ${JIRA_RESOLVED_FILE} (if resolution required)
- **Processing Logs**: .claude/features/${FEATURE_ID}/preprocessing/logs/

## Feature Context
- **Feature ID**: ${FEATURE_ID}
- **Preprocessing Started**: ${PREPROCESSING_START}
- **Context Directory**: .claude/features/${FEATURE_ID}/context/
EOF

# Validate context file was created successfully
if [ ! -f "${PREPROCESSING_CONTEXT_FILE}" ]; then
    echo "❌ Failed to create preprocessing context file"
    exit 1
fi

# Output key file paths and analysis results for Einstein to use
echo "✅ Preprocessing phase setup complete"
echo ""
echo "📋 Setup Results:"
echo "PREPROCESSING_CONTEXT_FILE=${PREPROCESSING_CONTEXT_FILE}"
echo "PREPROCESSING_PLAN=${PREPROCESSING_PLAN}"
echo "JIRA_RESOLVED_FILE=${JIRA_RESOLVED_FILE}"
echo "PREPROCESSING_DIR=${PREPROCESSING_DIR}"
echo ""
echo "📊 Preprocessing Analysis:"
echo "PREPROCESSING_REQUIRED=${PREPROCESSING_REQUIRED}"
echo "JIRA_DETECTED=${JIRA_DETECTED}"
echo "JIRA_REFERENCES=${JIRA_REFERENCES}"
echo "USER_ARGUMENTS_LENGTH=$(echo "${USER_ARGUMENTS}" | wc -c)"
echo ""
echo "🔄 Ready for preprocessing coordinator analysis"