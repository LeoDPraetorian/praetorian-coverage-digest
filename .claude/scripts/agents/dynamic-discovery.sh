#!/bin/bash

# Dynamic Agent Discovery Script
# Extracts agent selection logic from Einstein to reduce token consumption
# Usage: ./dynamic-discovery.sh <FEATURE_ID>
# Output: STATUS:COUNT:AGENT1,AGENT2,AGENT3:REASON1|REASON2|REASON3

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "$FEATURE_ID" ]; then
    echo "ERROR:0::Missing FEATURE_ID parameter"
    exit 1
fi

# Check if feature exists
if [ ! -d ".claude/features/${FEATURE_ID}" ]; then
    echo "ERROR:0::Feature directory not found: .claude/features/${FEATURE_ID}"
    exit 1
fi

# Initialize output variables
SELECTED_AGENTS=()
SELECTION_REASONS=()
STATUS="SUCCESS"

# Read implementation context
IMPL_CONTEXT=".claude/features/${FEATURE_ID}/implementation/context/implementation-context.json"
if [ ! -f "${IMPL_CONTEXT}" ]; then
    echo "ERROR:0::Implementation context not found: ${IMPL_CONTEXT}"
    exit 1
fi

# Get development agents directory
DEV_AGENTS_DIR=".claude/features/${FEATURE_ID}/agents/development"
if [ ! -d "${DEV_AGENTS_DIR}" ]; then
    echo "ERROR:0::Development agents directory not found: ${DEV_AGENTS_DIR}"
    exit 1
fi

# Get available development agents
AVAILABLE_DEV_AGENTS=""
if [ -d "${DEV_AGENTS_DIR}" ]; then
    AVAILABLE_DEV_AGENTS=$(find "${DEV_AGENTS_DIR}" -name "*.md" -type f -exec basename {} .md \; | tr '\n' ' ')
fi

# Parse implementation context
AFFECTED_DOMAINS_JSON=$(cat "${IMPL_CONTEXT}" | jq -r '.affected_domains[]' 2>/dev/null || echo "")
COMPLEXITY_LEVEL=$(cat "${IMPL_CONTEXT}" | jq -r '.complexity_level' 2>/dev/null || echo "Simple")
RECOMMENDED_AGENTS=$(cat "${IMPL_CONTEXT}" | jq -r '.recommended_agents[]?.agent_type' 2>/dev/null || echo "")

# Backend Development Domain Mapping
if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "backend\|api\|server\|microservice"; then
    # Search for golang-api-developer if available
    if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "golang-api-developer"; then
        SELECTED_AGENTS+=("golang-api-developer")
        SELECTION_REASONS+=("golang-api-developer: domains backend-development,go-apis,microservices-implementation match backend requirements")
    # Fallback to general golang-developer
    elif echo "${AVAILABLE_DEV_AGENTS}" | grep -q "golang-developer"; then
        SELECTED_AGENTS+=("golang-developer")
        SELECTION_REASONS+=("golang-developer: fallback for backend development needs")
    fi

    # Add Python support if Python domain detected or CLI development needed
    if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "python\|cli" || echo "${AVAILABLE_DEV_AGENTS}" | grep -q "python-developer"; then
        SELECTED_AGENTS+=("python-developer")
        SELECTION_REASONS+=("python-developer: domains python-development,cli-development support backend services")
    fi
fi

# Frontend Development Domain Mapping
if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "frontend\|ui\|react\|component\|dashboard"; then
    # Search for react-developer if available
    if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "react-developer"; then
        SELECTED_AGENTS+=("react-developer")
        SELECTION_REASONS+=("react-developer: domains frontend-development,react-components,ui-implementation match frontend requirements")
    fi
fi

# Integration Development Domain Mapping
if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "integration\|webhook\|api.*integration\|third.*party" || echo "${RECOMMENDED_AGENTS}" | grep -qi "integration"; then
    if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "integration-developer"; then
        SELECTED_AGENTS+=("integration-developer")
        SELECTION_REASONS+=("integration-developer: domains service-integration,api-integration,third-party-integration match integration requirements")
    fi
fi

# Security/VQL Development Domain Mapping
if echo "${AFFECTED_DOMAINS_JSON}" | grep -qi "security\|vql\|threat\|detection\|forensic" || echo "${RECOMMENDED_AGENTS}" | grep -qi "vql"; then
    if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "vql-developer"; then
        SELECTED_AGENTS+=("vql-developer")
        SELECTION_REASONS+=("vql-developer: domains vql-development,security-automation,threat-hunting match security requirements")
    fi
fi

# Complexity-Aware Agent Count Adjustment
AGENT_COUNT=${#SELECTED_AGENTS[@]}
MAX_AGENTS=3  # Default for Simple

case "${COMPLEXITY_LEVEL}" in
    "Simple")
        MAX_AGENTS=3
        ;;
    "Medium")
        MAX_AGENTS=5
        ;;
    "Complex")
        MAX_AGENTS=8
        # Add testing agents for complex features
        if echo "${AVAILABLE_DEV_AGENTS}" | grep -q "integration-test-engineer" && [ $AGENT_COUNT -lt $MAX_AGENTS ]; then
            SELECTED_AGENTS+=("integration-test-engineer")
            SELECTION_REASONS+=("integration-test-engineer: complex features require comprehensive testing")
        fi
        ;;
    *)
        MAX_AGENTS=3
        ;;
esac

# Trim agent list if exceeding max for complexity level
if [ $AGENT_COUNT -gt $MAX_AGENTS ]; then
    SELECTED_AGENTS=("${SELECTED_AGENTS[@]:0:$MAX_AGENTS}")
    SELECTION_REASONS=("${SELECTION_REASONS[@]:0:$MAX_AGENTS}")
fi

# Fallback if no agents selected
if [ ${#SELECTED_AGENTS[@]} -eq 0 ]; then
    SELECTED_AGENTS=("golang-api-developer" "react-developer")
    SELECTION_REASONS=("fallback: minimal agent set" "fallback: minimal agent set")
fi

# Format output: STATUS:COUNT:AGENTS:REASONS
AGENTS_CSV=$(IFS=','; echo "${SELECTED_AGENTS[*]}")
REASONS_PIPE=$(IFS='|'; echo "${SELECTION_REASONS[*]}")
FINAL_COUNT=${#SELECTED_AGENTS[@]}

echo "${STATUS}:${FINAL_COUNT}:${AGENTS_CSV}:${REASONS_PIPE}"
exit 0