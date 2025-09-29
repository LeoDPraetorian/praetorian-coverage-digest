#!/bin/bash
# Path utility functions for Einstein pipeline

# Get the directory of this script to find the config
# Handle both direct execution and sourcing from different directories
if [[ "${BASH_SOURCE[0]}" = "${0}" ]]; then
    # Being executed directly
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    # Being sourced - need to find the actual script path
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# Find the config directory - it should be in .claude/scripts/config/
CONFIG_DIR=""
if [[ -f "${SCRIPT_DIR}/../config/file-paths.sh" ]]; then
    CONFIG_DIR="${SCRIPT_DIR}/../config"
elif [[ -f ".claude/scripts/config/file-paths.sh" ]]; then
    CONFIG_DIR=".claude/scripts/config"
elif [[ -f "${PWD}/.claude/scripts/config/file-paths.sh" ]]; then
    CONFIG_DIR="${PWD}/.claude/scripts/config"
else
    echo "ERROR: Cannot find file-paths.sh configuration" >&2
    echo "Searched in:" >&2
    echo "  - ${SCRIPT_DIR}/../config/file-paths.sh" >&2
    echo "  - .claude/scripts/config/file-paths.sh" >&2
    echo "  - ${PWD}/.claude/scripts/config/file-paths.sh" >&2
    exit 1
fi

# Source the configuration files
source "${CONFIG_DIR}/file-paths.sh"
source "${CONFIG_DIR}/environments.sh"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging function
log_error() {
    echo -e "${RED}ERROR:${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}SUCCESS:${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}WARNING:${NC} $*" >&2
}

# Get feature-specific file path
get_feature_path() {
    local feature_id="$1"
    local path_key="$2"
    
    if [[ -z "${feature_id}" ]] || [[ -z "${path_key}" ]]; then
        log_error "Missing feature_id or path_key"
        log_error "Usage: get_feature_path <feature_id> <path_key>"
        return 1
    fi
    
    local template
    template=$(get_feature_path_template "${path_key}")
    
    if [[ $? -ne 0 ]]; then
        log_error "Unknown path key: ${path_key}"
        log_error "Available keys: $(list_feature_path_keys)"
        return 1
    fi
    
    echo "${FEATURES_BASE_DIR}/${feature_id}/${template}"
}

# Get script path
get_script_path() {
    local script_key="$1"
    
    if [[ -z "${script_key}" ]]; then
        log_error "Missing script_key"
        log_error "Usage: get_script_path <script_key>"
        return 1
    fi
    
    local template
    template=$(get_script_path_template "${script_key}")
    
    if [[ $? -ne 0 ]]; then
        log_error "Unknown script key: ${script_key}"
        log_error "Available keys: $(list_script_path_keys)"
        return 1
    fi
    
    echo "${SCRIPTS_BASE_DIR}/${template}"
}

# Get Jira-specific path
get_jira_path() {
    local feature_id="$1"
    local jira_key="$2"
    
    if [[ -z "${feature_id}" ]] || [[ -z "${jira_key}" ]]; then
        log_error "Missing feature_id or jira_key"
        log_error "Usage: get_jira_path <feature_id> <jira_key>"
        return 1
    fi
    
    local template
    template=$(get_jira_path_template "${jira_key}")
    
    if [[ $? -ne 0 ]]; then
        log_error "Unknown Jira path key: ${jira_key}"
        log_error "Available keys: $(list_jira_path_keys)"
        return 1
    fi
    
    echo "${FEATURES_BASE_DIR}/${feature_id}/${template}"
}

# Validate and create directory if needed
ensure_feature_dir() {
    local feature_id="$1"
    local path_key="$2"
    local create_parent="${3:-false}"
    
    local full_path
    full_path=$(get_feature_path "${feature_id}" "${path_key}")
    
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    if [[ "${create_parent}" == "true" ]]; then
        local parent_dir
        parent_dir=$(dirname "${full_path}")
        if ! mkdir -p "${parent_dir}"; then
            log_error "Failed to create parent directory: ${parent_dir}"
            return 1
        fi
    fi
    
    # If path_key ends with "_dir", create the directory
    if [[ "${path_key}" == *"_dir" ]]; then
        if ! mkdir -p "${full_path}"; then
            log_error "Failed to create directory: ${full_path}"
            return 1
        fi
        log_success "Created directory: ${full_path}" >&2
    fi
    
    echo "${full_path}"
}

# Validate required paths exist
validate_required_paths() {
    local feature_id="$1"
    shift
    local required_paths=("$@")
    
    if [[ -z "${feature_id}" ]]; then
        log_error "Missing feature_id"
        log_error "Usage: validate_required_paths <feature_id> <path_key1> [path_key2 ...]"
        return 1
    fi
    
    if [[ ${#required_paths[@]} -eq 0 ]]; then
        log_warning "No paths specified for validation"
        return 0
    fi
    
    local missing_paths=()
    local invalid_paths=()
    
    for path_key in "${required_paths[@]}"; do
        local full_path
        full_path=$(get_feature_path "${feature_id}" "${path_key}" 2>/dev/null)
        
        if [[ $? -ne 0 ]]; then
            invalid_paths+=("${path_key}")
            continue
        fi
        
        if [[ ! -f "${full_path}" ]] && [[ ! -d "${full_path}" ]]; then
            missing_paths+=("${path_key}:${full_path}")
        fi
    done
    
    local validation_failed=false
    
    if [[ ${#invalid_paths[@]} -gt 0 ]]; then
        log_error "Invalid path keys:"
        for invalid in "${invalid_paths[@]}"; do
            log_error "  - ${invalid}"
        done
        validation_failed=true
    fi
    
    if [[ ${#missing_paths[@]} -gt 0 ]]; then
        log_error "Missing required paths:"
        for missing in "${missing_paths[@]}"; do
            log_error "  - ${missing}"
        done
        validation_failed=true
    fi
    
    if [[ "${validation_failed}" == "true" ]]; then
        return 1
    fi
    
    log_success "All required paths validated successfully"
    return 0
}

# Get pipeline log path
get_pipeline_log() {
    local feature_id="$1"
    
    if [[ -z "${feature_id}" ]]; then
        log_error "Missing feature_id"
        log_error "Usage: get_pipeline_log <feature_id>"
        return 1
    fi
    
    echo "${PIPELINE_BASE_DIR}/einstein-pipeline-${feature_id}.log"
}

# Create complete feature workspace structure
create_feature_workspace() {
    local feature_id="$1"
    
    if [[ -z "${feature_id}" ]]; then
        log_error "Missing feature_id"
        log_error "Usage: create_feature_workspace <feature_id>"
        return 1
    fi
    
    local workspace_root="${FEATURES_BASE_DIR}/${feature_id}"
    
    # Create base directories
    local directories=(
        "context"
        "architecture" 
        "implementation/context"
        "implementation/agent-outputs"
        "implementation/code-changes"
        "implementation/coordination"
        "output"
        "quality-review/context"
        "quality-review/feedback-loop"
        "security-review/context"
        "testing"
        "deployment"
        "research"
        "compliance"
        "jira-enhanced"
    )
    
    for dir in "${directories[@]}"; do
        if ! mkdir -p "${workspace_root}/${dir}"; then
            log_error "Failed to create directory: ${workspace_root}/${dir}"
            return 1
        fi
    done
    
    # Create metadata.json file
    local metadata_file="${workspace_root}/metadata.json"
    cat > "${metadata_file}" << EOF
{
  "feature_id": "${feature_id}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "initialized",
  "current_phase": "preprocessing",
  "phases_completed": [],
  "pipeline_version": "1.0"
}
EOF
    
    if [[ $? -eq 0 ]]; then
        log_success "Created feature workspace: ${workspace_root}"
        return 0
    else
        log_error "Failed to create metadata file: ${metadata_file}"
        return 1
    fi
}

# Validate script exists before execution
validate_script_exists() {
    local script_key="$1"
    
    if [[ -z "${script_key}" ]]; then
        log_error "Missing script_key"
        log_error "Usage: validate_script_exists <script_key>"
        return 1
    fi
    
    local script_path
    script_path=$(get_script_path "${script_key}")
    
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    if [[ ! -f "${script_path}" ]]; then
        log_error "Script does not exist: ${script_path}"
        log_error "Expected script for key: ${script_key}"
        return 1
    fi
    
    if [[ ! -x "${script_path}" ]]; then
        log_warning "Script is not executable: ${script_path}"
        log_warning "Run: chmod +x ${script_path}"
        return 1
    fi
    
    log_success "Script validated: ${script_path}"
    return 0
}

# List all available path keys
list_path_keys() {
    local category="${1:-all}"
    
    case "${category}" in
        "feature"|"features")
            echo "Available feature path keys:"
            echo "$(list_feature_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            ;;
        "script"|"scripts")
            echo "Available script path keys:"
            echo "$(list_script_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            ;;
        "jira")
            echo "Available Jira path keys:"
            echo "$(list_jira_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            ;;
        "all"|*)
            echo "Available path keys:"
            echo ""
            echo "Feature paths:"
            echo "$(list_feature_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            echo ""
            echo "Script paths:"
            echo "$(list_script_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            echo ""
            echo "Jira paths:"
            echo "$(list_jira_path_keys)" | tr ' ' '\n' | sort | sed 's/^/  /'
            ;;
    esac
}

# Validate JSON file syntax and structure
validate_json_file() {
    local json_file="$1"
    local context_name="${2:-JSON file}"
    
    if [[ -z "${json_file}" ]]; then
        log_error "Missing json_file parameter"
        log_error "Usage: validate_json_file <json_file> [context_name]"
        return 1
    fi
    
    # Check if file exists
    if [[ ! -f "${json_file}" ]]; then
        log_error "${context_name} not found: ${json_file}"
        return 1
    fi
    
    # Validate JSON syntax
    if ! jq '.' "${json_file}" >/dev/null 2>&1; then
        log_error "Invalid JSON format in ${context_name}: ${json_file}"
        return 1
    fi
    
    log_success "${context_name} JSON syntax validation passed"
    return 0
}

# Validate required fields exist in JSON file
validate_json_required_fields() {
    local json_file="$1"
    local context_name="${2:-JSON file}"
    shift 2
    local required_fields=("$@")
    
    if [[ -z "${json_file}" ]] || [[ ${#required_fields[@]} -eq 0 ]]; then
        log_error "Missing parameters"
        log_error "Usage: validate_json_required_fields <json_file> <context_name> <field1> [field2 ...]"
        return 1
    fi
    
    # First validate JSON syntax
    validate_json_file "${json_file}" "${context_name}" || return 1
    
    # Validate each required field
    local missing_fields=()
    for field in "${required_fields[@]}"; do
        if [[ "$(cat "${json_file}" | jq "has(\"${field}\")")" != "true" ]]; then
            missing_fields+=("${field}")
        fi
    done
    
    if [[ ${#missing_fields[@]} -gt 0 ]]; then
        log_error "Missing required fields in ${context_name}:"
        for field in "${missing_fields[@]}"; do
            log_error "  - ${field}"
        done
        return 1
    fi
    
    log_success "${context_name} required fields validation passed"
    return 0
}

# Validate JSON enum field values
validate_json_enum_field() {
    local json_file="$1"
    local field_name="$2"
    local context_name="${3:-JSON file}"
    shift 3
    local valid_values=("$@")
    
    if [[ -z "${json_file}" ]] || [[ -z "${field_name}" ]] || [[ ${#valid_values[@]} -eq 0 ]]; then
        log_error "Missing parameters"
        log_error "Usage: validate_json_enum_field <json_file> <field_name> <context_name> <value1> [value2 ...]"
        return 1
    fi
    
    # Get the field value
    local field_value
    field_value=$(cat "${json_file}" | jq -r ".${field_name}")
    
    if [[ $? -ne 0 ]] || [[ "${field_value}" == "null" ]]; then
        log_error "Field '${field_name}' not found or null in ${context_name}"
        return 1
    fi
    
    # Check if value is in valid list
    local is_valid=false
    for valid_value in "${valid_values[@]}"; do
        if [[ "${field_value}" == "${valid_value}" ]]; then
            is_valid=true
            break
        fi
    done
    
    if [[ "${is_valid}" == "false" ]]; then
        log_error "Invalid value for '${field_name}' in ${context_name}: ${field_value}"
        log_error "Valid values: $(printf '%s, ' "${valid_values[@]}" | sed 's/, $//')"
        return 1
    fi
    
    log_success "${context_name} enum validation passed for '${field_name}': ${field_value}"
    return 0
}

# Validate JSON array is not empty
validate_json_array_not_empty() {
    local json_file="$1"
    local array_field="$2"
    local context_name="${3:-JSON file}"
    
    if [[ -z "${json_file}" ]] || [[ -z "${array_field}" ]]; then
        log_error "Missing parameters"
        log_error "Usage: validate_json_array_not_empty <json_file> <array_field> [context_name]"
        return 1
    fi
    
    # Get array length
    local array_length
    array_length=$(cat "${json_file}" | jq ".${array_field} | length" 2>/dev/null)
    
    if [[ $? -ne 0 ]] || [[ -z "${array_length}" ]] || [[ "${array_length}" == "null" ]]; then
        log_error "Array field '${array_field}' not found in ${context_name}"
        return 1
    fi
    
    if [[ "${array_length}" -eq 0 ]]; then
        log_error "Array field '${array_field}' is empty in ${context_name}"
        return 1
    fi
    
    log_success "${context_name} array validation passed for '${array_field}': ${array_length} items"
    return 0
}

# Comprehensive JSON validation (combines all validation types)
validate_json_comprehensive() {
    local json_file="$1"
    local context_name="$2"
    local config_type="$3"  # coordination_plan, agent_assignments, etc.
    
    if [[ -z "${json_file}" ]] || [[ -z "${context_name}" ]] || [[ -z "${config_type}" ]]; then
        log_error "Missing parameters"
        log_error "Usage: validate_json_comprehensive <json_file> <context_name> <config_type>"
        return 1
    fi
    
    echo "🔍 Validating ${context_name} (${config_type})"
    
    # Step 1: Basic JSON syntax validation
    validate_json_file "${json_file}" "${context_name}" || return 1
    
    # Step 2: Type-specific validation
    case "${config_type}" in
        "quality_coordination_plan")
            validate_json_required_fields "${json_file}" "${context_name}" "recommendation" "rationale" "implementation_analysis" || return 1
            validate_json_enum_field "${json_file}" "recommendation" "${context_name}" \
                "comprehensive_quality" "focused_quality" "basic_validation" "skip_quality" || return 1
            ;;
        "security_coordination_plan")
            validate_json_required_fields "${json_file}" "${context_name}" "recommendation" "rationale" "security_assessment" || return 1
            validate_json_enum_field "${json_file}" "recommendation" "${context_name}" \
                "comprehensive_security" "focused_security" "basic_validation" "skip_security" || return 1
            ;;
        "testing_coordination_plan")
            validate_json_required_fields "${json_file}" "${context_name}" "recommendation" "rationale" "implementation_analysis" || return 1
            validate_json_enum_field "${json_file}" "recommendation" "${context_name}" \
                "comprehensive_testing" "focused_testing" "basic_validation" "skip_testing" || return 1
            ;;
        "deployment_coordination_plan")
            validate_json_required_fields "${json_file}" "${context_name}" "recommendation" "rationale" "deployment_assessment" || return 1
            validate_json_enum_field "${json_file}" "recommendation" "${context_name}" \
                "comprehensive_deployment" "focused_deployment" "basic_deployment" "skip_deployment" || return 1
            ;;
        "agent_assignments")
            validate_json_required_fields "${json_file}" "${context_name}" "feature_id" "assignments" "execution_strategy" || return 1
            validate_json_enum_field "${json_file}" "execution_strategy" "${context_name}" "parallel" "sequential" "phased" || return 1
            validate_json_array_not_empty "${json_file}" "assignments" "${context_name}" || return 1
            ;;
        "complexity_assessment")
            validate_json_required_fields "${json_file}" "${context_name}" "level" "factors" "affected_domains" || return 1
            validate_json_enum_field "${json_file}" "level" "${context_name}" "Simple" "Medium" "Complex" || return 1
            ;;
        "implementation_gap_analysis")
            validate_json_required_fields "${json_file}" "${context_name}" "compliance_confirmation" "exhaustive_search_performed" "files_analyzed_count" || return 1
            ;;
        "synthesis_plan")
            validate_json_required_fields "${json_file}" "${context_name}" "research_needed" "synthesis_approach" || return 1
            ;;
        *)
            # Generic validation for unknown types
            validate_json_file "${json_file}" "${context_name}" || return 1
            ;;
    esac
    
    log_success "${context_name} comprehensive validation completed successfully"
    return 0
}

# Standardized error handling functions

# Handle critical errors that terminate pipeline execution
handle_critical_error() {
    local error_category="$1"
    local primary_message="$2"
    local context_message="${3:-}"
    local expected_file="${4:-}"
    local troubleshooting="${5:-}"
    
    if [[ -z "${error_category}" ]] || [[ -z "${primary_message}" ]]; then
        log_error "Missing parameters for handle_critical_error"
        log_error "Usage: handle_critical_error <category> <message> [context] [expected_file] [troubleshooting]"
        exit 1
    fi
    
    echo "❌ CRITICAL ERROR [${error_category}]: ${primary_message}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${context_message}" ]]; then
        echo "Context: ${context_message}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    if [[ -n "${expected_file}" ]]; then
        echo "Expected file: ${expected_file}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    if [[ -n "${troubleshooting}" ]]; then
        echo "Troubleshooting: ${troubleshooting}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    echo "Pipeline execution terminated at $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    exit 1
}

# Handle warnings with optional fallback actions
handle_warning() {
    local warning_category="$1"
    local message="$2"
    local fallback_action="${3:-}"
    local impact_level="${4:-medium}"
    
    if [[ -z "${warning_category}" ]] || [[ -z "${message}" ]]; then
        log_warning "Missing parameters for handle_warning"
        log_warning "Usage: handle_warning <category> <message> [fallback_action] [impact_level]"
        return 1
    fi
    
    local warning_emoji="⚠️"
    case "${impact_level}" in
        "high"|"critical")
            warning_emoji="🚨"
            ;;
        "low")
            warning_emoji="ℹ️"
            ;;
    esac
    
    echo "${warning_emoji} WARNING [${warning_category}]: ${message}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${fallback_action}" ]]; then
        echo "Fallback: ${fallback_action}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
}

# Handle escalation scenarios in feedback loops
handle_escalation() {
    local phase="$1"
    local reason="$2"
    local escalation_type="${3:-manual_review}"
    local additional_context="${4:-}"
    
    if [[ -z "${phase}" ]] || [[ -z "${reason}" ]]; then
        log_error "Missing parameters for handle_escalation"
        log_error "Usage: handle_escalation <phase> <reason> [escalation_type] [additional_context]"
        return 1
    fi
    
    local next_phase="manual-${phase}-review"
    
    echo "🚨 ESCALATION [${phase}]: ${reason}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    echo "Manual review required - proceeding to ${next_phase}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${additional_context}" ]]; then
        echo "Additional context: ${additional_context}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    # Set NEXT_PHASE for pipeline flow (will be picked up by caller)
    echo "ESCALATION_NEXT_PHASE=${next_phase}"
    echo "ESCALATION_REASON=${reason}"
}

# Handle success scenarios with optional details
handle_success() {
    local operation_category="$1"
    local success_message="$2"
    local additional_info="${3:-}"
    local metrics="${4:-}"
    
    if [[ -z "${operation_category}" ]] || [[ -z "${success_message}" ]]; then
        log_warning "Missing parameters for handle_success"
        log_warning "Usage: handle_success <category> <message> [additional_info] [metrics]"
        return 1
    fi
    
    echo "✅ SUCCESS [${operation_category}]: ${success_message}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${additional_info}" ]]; then
        echo "Details: ${additional_info}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    if [[ -n "${metrics}" ]]; then
        echo "Metrics: ${metrics}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
}

# Handle validation failures with context
handle_validation_failure() {
    local validation_type="$1"
    local failed_item="$2"
    local requirements="${3:-}"
    local remediation="${4:-}"
    
    if [[ -z "${validation_type}" ]] || [[ -z "${failed_item}" ]]; then
        log_error "Missing parameters for handle_validation_failure"
        log_error "Usage: handle_validation_failure <type> <failed_item> [requirements] [remediation]"
        exit 1
    fi
    
    echo "❌ VALIDATION FAILURE [${validation_type}]: ${failed_item}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${requirements}" ]]; then
        echo "Requirements: ${requirements}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    if [[ -n "${remediation}" ]]; then
        echo "Remediation: ${remediation}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    exit 1
}

# Handle coordination failures (missing coordination plans, setup failures)
handle_coordination_failure() {
    local coordination_type="$1"
    local failure_reason="$2"
    local expected_file="${3:-}"
    local phase="${4:-}"
    
    if [[ -z "${coordination_type}" ]] || [[ -z "${failure_reason}" ]]; then
        log_error "Missing parameters for handle_coordination_failure"
        log_error "Usage: handle_coordination_failure <type> <reason> [expected_file] [phase]"
        exit 1
    fi
    
    echo "❌ COORDINATION FAILURE [${coordination_type}]: ${failure_reason}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    
    if [[ -n "${expected_file}" ]]; then
        echo "Expected file: ${expected_file}" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    if [[ -n "${phase}" ]]; then
        echo "Phase: ${phase} cannot proceed without coordination plan" | tee -a "${PIPELINE_LOG:-/dev/stderr}"
    fi
    
    exit 1
}

# Export functions for use by other scripts
export -f get_feature_path
export -f get_script_path
export -f get_jira_path
export -f ensure_feature_dir
export -f validate_required_paths
export -f get_pipeline_log
export -f create_feature_workspace
export -f validate_script_exists
export -f list_path_keys
export -f validate_json_file
export -f validate_json_required_fields
export -f validate_json_enum_field
export -f validate_json_array_not_empty
export -f validate_json_comprehensive
export -f handle_critical_error
export -f handle_warning
export -f handle_escalation
export -f handle_success
export -f handle_validation_failure
export -f handle_coordination_failure
export -f log_error
export -f log_success
export -f log_warning