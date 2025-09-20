#!/bin/bash

# Foundation Gate Rollback Procedures
# Purpose: Handle foundation gate failures with workspace cleanup and context preservation
# Usage: rollback-procedures.sh <FEATURE_ID> <FAILURE_REASON> [--dry-run]

set -euo pipefail

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FEATURE_ID="${1:-}"
FAILURE_REASON="${2:-unknown}"
DRY_RUN="${3:-}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[ROLLBACK-INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[ROLLBACK-SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[ROLLBACK-WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ROLLBACK-ERROR]${NC} $1" >&2
}

usage() {
    echo "Usage: $0 <FEATURE_ID> <FAILURE_REASON> [--dry-run]"
    echo "  FEATURE_ID:     Feature identifier (e.g., auth-system_20250117)"
    echo "  FAILURE_REASON: Reason for rollback (e.g., compilation_errors)"
    echo "  --dry-run:      Show what would be done without executing"
    exit 1
}

# Validate inputs
validate_inputs() {
    if [[ -z "$FEATURE_ID" ]]; then
        log_error "Feature ID is required"
        usage
    fi
    
    if [[ ! -d ".claude/features/$FEATURE_ID" ]]; then
        log_error "Feature workspace not found: .claude/features/$FEATURE_ID"
        exit 1
    fi
    
    log_info "Validated feature workspace: $FEATURE_ID"
}

# Create rollback timestamp and directory
setup_rollback_tracking() {
    local rollback_timestamp=$(date +%s)
    local rollback_dir=".claude/features/$FEATURE_ID/rollback-history/$rollback_timestamp"
    
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        mkdir -p "$rollback_dir"
    fi
    
    echo "$rollback_dir"
}

# Preserve critical context files
preserve_context_files() {
    local feature_id="$1"
    local preservation_dir="$2"
    
    log_info "Preserving critical context files..."
    
    # Files to preserve during rollback
    local preserve_files=(
        "context/requirements.json"
        "context/complexity-assessment.json"
        "context/knowledge-base.md"
        "output/implementation-plan.md"
        "context/architect-context.md"
        "context/planning-context.md"
    )
    
    # Architecture files if they exist
    if [[ -d ".claude/features/$feature_id/architecture" ]]; then
        while IFS= read -r -d '' arch_file; do
            local relative_path=${arch_file#.claude/features/$feature_id/}
            preserve_files+=("$relative_path")
        done < <(find ".claude/features/$feature_id/architecture" -name "*.md" -print0)
    fi
    
    local preserved_count=0
    for context_file in "${preserve_files[@]}"; do
        local source_file=".claude/features/$feature_id/$context_file"
        local dest_file="$preservation_dir/$context_file"
        
        if [[ -f "$source_file" ]]; then
            if [[ "$DRY_RUN" == "--dry-run" ]]; then
                log_info "[DRY-RUN] Would preserve: $context_file"
            else
                mkdir -p "$(dirname "$dest_file")"
                cp "$source_file" "$dest_file"
                log_success "Preserved: $context_file"
            fi
            ((preserved_count++))
        fi
    done
    
    log_info "Context preservation complete: $preserved_count files"
    echo "$preserved_count"
}

# Clean up failed implementation directories
cleanup_implementation() {
    local feature_id="$1"
    
    log_info "Cleaning up failed implementation directories..."
    
    # Directories to clean during rollback
    local cleanup_dirs=(
        "implementation/code-changes"
        "implementation/progress"
        "implementation/agent-outputs"
        "implementation/validation"
        "implementation/coordination"
    )
    
    local cleaned_count=0
    for cleanup_dir in "${cleanup_dirs[@]}"; do
        local target_dir=".claude/features/$feature_id/$cleanup_dir"
        
        if [[ -d "$target_dir" ]]; then
            if [[ "$DRY_RUN" == "--dry-run" ]]; then
                log_warning "[DRY-RUN] Would remove: $cleanup_dir"
            else
                rm -rf "$target_dir"
                log_warning "Cleaned: $cleanup_dir"
            fi
            ((cleaned_count++))
        fi
    done
    
    log_info "Implementation cleanup complete: $cleaned_count directories"
    echo "$cleaned_count"
}

# Restore from snapshot if available
restore_from_snapshot() {
    local feature_id="$1"
    local snapshot_file=".claude/features/$feature_id/implementation/snapshots/foundation-pre-gate.json"
    
    if [[ -f "$snapshot_file" ]]; then
        log_info "Foundation snapshot available for restoration"
        
        # Extract git information if available
        local git_commit=$(cat "$snapshot_file" | jq -r '.git_state.commit // "unknown"')
        local git_branch=$(cat "$snapshot_file" | jq -r '.git_state.branch // "unknown"')
        
        log_info "Snapshot git state: $git_branch @ $git_commit"
        
        if [[ "$DRY_RUN" == "--dry-run" ]]; then
            log_info "[DRY-RUN] Would restore from snapshot"
        else
            log_warning "Git state restoration requires manual intervention"
            log_info "Consider: git reset --hard $git_commit (if safe)"
        fi
        
        return 0
    else
        log_warning "No foundation snapshot found - cannot restore git state"
        return 1
    fi
}

# Generate rollback analysis
generate_rollback_analysis() {
    local feature_id="$1"
    local failure_reason="$2"
    local preserved_files="$3"
    local cleaned_dirs="$4"
    local rollback_timestamp="$5"
    
    local analysis_file=".claude/features/$feature_id/gates/detailed/foundation-rollback-analysis.json"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log_info "[DRY-RUN] Would generate rollback analysis: $analysis_file"
        return
    fi
    
    mkdir -p "$(dirname "$analysis_file")"
    
    # Get failure details from validation results if available
    local validation_dir=".claude/features/$feature_id/implementation/validation"
    local failure_components=()
    local critical_issues=()
    
    if [[ -d "$validation_dir" ]]; then
        # Analyze validation failures
        for validation_file in "$validation_dir"/*.json; do
            if [[ -f "$validation_file" ]]; then
                local component_name=$(basename "$validation_file" .json)
                local status=$(cat "$validation_file" | jq -r '.status // "UNKNOWN"')
                
                if [[ "$status" == "FAIL" ]]; then
                    failure_components+=("$component_name")
                    
                    # Extract issues if available
                    local issues=$(cat "$validation_file" | jq -r '.issues_found[]? // empty' 2>/dev/null || true)
                    if [[ -n "$issues" ]]; then
                        critical_issues+=("$component_name: $issues")
                    fi
                fi
            fi
        done
    fi
    
    # Generate comprehensive rollback analysis
    cat > "$analysis_file" << EOF
{
  "rollback_executed": true,
  "rollback_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rollback_id": "$rollback_timestamp",
  "feature_id": "$feature_id",
  "failure_analysis": {
    "primary_failure_reason": "$failure_reason",
    "failed_components": $(printf '%s\n' "${failure_components[@]}" | jq -R . | jq -s .),
    "critical_issues": $(printf '%s\n' "${critical_issues[@]}" | jq -R . | jq -s .)
  },
  "rollback_actions": {
    "context_files_preserved": $preserved_files,
    "implementation_directories_cleaned": $cleaned_dirs,
    "snapshot_restoration_attempted": $(restore_from_snapshot "$feature_id" && echo 'true' || echo 'false'),
    "git_state_preserved": true
  },
  "recovery_strategy": "$(determine_recovery_strategy "$failure_reason")",
  "recommendations": $(generate_recovery_recommendations "$failure_reason" "${failure_components[@]}" | jq -R . | jq -s .)
}
EOF
    
    log_success "Rollback analysis generated: $analysis_file"
}

# Determine recovery strategy based on failure reason
determine_recovery_strategy() {
    local failure_reason="$1"
    
    case "$failure_reason" in
        "compilation_errors"|"dependency_resolution")
            echo "re_analyze_implementation_plan"
            ;;
        "directory_structure"|"core_files")
            echo "restart_implementation_phase"
            ;;
        "timeout"|"script_failure")
            echo "investigate_infrastructure_issues"
            ;;
        *)
            echo "manual_analysis_required"
            ;;
    esac
}

# Generate recovery recommendations
generate_recovery_recommendations() {
    local failure_reason="$1"
    shift
    local failed_components=("$@")
    
    case "$failure_reason" in
        "compilation_errors")
            echo "Review implementation plan for backend/frontend setup requirements"
            echo "Verify dependency specifications and import paths"
            echo "Check agent coordination for proper file creation sequencing"
            ;;
        "dependency_resolution")
            echo "Verify network connectivity and package registry access"
            echo "Check for dependency version conflicts or missing packages"
            echo "Review go.mod and package.json generation by implementation agents"
            ;;
        "directory_structure")
            echo "Verify feature workspace initialization procedures"
            echo "Check implementation agent directory creation logic"
            echo "Ensure proper permissions on workspace directories"
            ;;
        "core_files")
            echo "Review implementation agent file creation logic"
            echo "Verify template files and code generation procedures"
            echo "Check agent coordination for proper file sequencing"
            ;;
        *)
            echo "Analyze detailed validation results for specific failure patterns"
            echo "Check implementation agent tracking reports for error details"
            echo "Consider reducing feature complexity or scope"
            ;;
    esac
}

# Update feature metadata with rollback information
update_feature_metadata() {
    local feature_id="$1"
    local rollback_timestamp="$2"
    local metadata_file=".claude/features/$feature_id/metadata.json"
    
    if [[ -f "$metadata_file" ]]; then
        if [[ "$DRY_RUN" == "--dry-run" ]]; then
            log_info "[DRY-RUN] Would update feature metadata"
        else
            # Update metadata with rollback information
            jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
               --arg reason "$FAILURE_REASON" \
               --arg rollback_id "$rollback_timestamp" \
               '.status = "foundation_gate_failed" | 
                .foundation_gate_failed = $timestamp | 
                .rollback_reason = $reason |
                .rollback_id = $rollback_id' \
               "$metadata_file" > "${metadata_file}.tmp" && mv "${metadata_file}.tmp" "$metadata_file"
            
            log_success "Feature metadata updated with rollback information"
        fi
    fi
}

# Main rollback execution
main() {
    log_info "🔄 Foundation Gate Rollback Initiated"
    log_info "Feature ID: $FEATURE_ID"
    log_info "Failure Reason: $FAILURE_REASON"
    log_info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Validate inputs
    validate_inputs
    
    # Setup rollback tracking
    local rollback_timestamp=$(date +%s)
    local preservation_dir=$(setup_rollback_tracking)
    
    # Execute rollback procedures
    log_info "Executing rollback procedures..."
    
    local preserved_files=$(preserve_context_files "$FEATURE_ID" "$preservation_dir")
    local cleaned_dirs=$(cleanup_implementation "$FEATURE_ID")
    
    # Attempt snapshot restoration
    restore_from_snapshot "$FEATURE_ID" || true
    
    # Generate comprehensive analysis
    generate_rollback_analysis "$FEATURE_ID" "$FAILURE_REASON" "$preserved_files" "$cleaned_dirs" "$rollback_timestamp"
    
    # Update feature metadata
    update_feature_metadata "$FEATURE_ID" "$rollback_timestamp"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log_success "🔄 Rollback dry run completed successfully"
    else
        log_success "🔄 Foundation gate rollback completed"
        log_info "💡 Check rollback analysis for recovery recommendations"
        log_info "📁 Preserved files available in: $preservation_dir"
    fi
    
    # Return rollback summary
    echo "ROLLBACK_COMPLETE:$preserved_files:$cleaned_dirs:$(basename "$preservation_dir")"
}

# Validate arguments and execute
if [[ $# -lt 2 ]]; then
    usage
fi

main "$@"