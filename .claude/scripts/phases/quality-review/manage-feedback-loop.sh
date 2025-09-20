#!/bin/bash

# manage-feedback-loop.sh  
# Intelligent feedback loop management for quality review remediation
# Usage: manage-feedback-loop.sh <FEATURE_ID> <ACTION>
# Actions: analyze_quality_results, create_remediation_plan, validate_fixes, check_completion

set -e  # Exit on error

# Validate input
if [ $# -ne 2 ]; then
    echo "Usage: $0 <FEATURE_ID> <ACTION>"
    echo "Actions: analyze_quality_results, create_remediation_plan, validate_fixes, check_completion"
    exit 1
fi

FEATURE_ID="$1"
ACTION="$2"

# Validate feature and quality review exists
QUALITY_DIR=".claude/features/${FEATURE_ID}/quality-review"
FEEDBACK_LOOP_DIR="${QUALITY_DIR}/feedback-loop"
ITERATION_TRACKER="${FEEDBACK_LOOP_DIR}/iteration-tracker.json"

if [ ! -d "${QUALITY_DIR}" ]; then
    echo "❌ Quality review directory not found: ${QUALITY_DIR}"
    exit 1
fi

if [ ! -f "${ITERATION_TRACKER}" ]; then
    echo "❌ Iteration tracker not found: ${ITERATION_TRACKER}"
    exit 1
fi

# Get current iteration and status
CURRENT_ITERATION=$(cat "${ITERATION_TRACKER}" | jq -r '.current_iteration')
MAX_ITERATIONS=$(cat "${ITERATION_TRACKER}" | jq -r '.max_iterations')
QUALITY_STATUS=$(cat "${ITERATION_TRACKER}" | jq -r '.quality_status')

echo "🔄 Feedback Loop Management - Action: ${ACTION}"
echo "📊 Current Iteration: ${CURRENT_ITERATION}/${MAX_ITERATIONS}"
echo "📋 Quality Status: ${QUALITY_STATUS}"

case "${ACTION}" in
    "analyze_quality_results")
        echo "=== Analyzing Quality Agent Results ==="
        
        # Find quality agent outputs  
        QUALITY_OUTPUTS_DIR="${QUALITY_DIR}/analysis"
        ISSUES_FOUND=0
        CRITICAL_ISSUES=0
        MAJOR_ISSUES=0
        MINOR_ISSUES=0
        
        # Create issues summary file
        ISSUES_SUMMARY="${FEEDBACK_LOOP_DIR}/iteration-${CURRENT_ITERATION}/issues-found.json"
        mkdir -p "$(dirname "${ISSUES_SUMMARY}")"
        
        # Initialize issues summary
        cat > "${ISSUES_SUMMARY}" << EOF
{
  "analysis_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "iteration": ${CURRENT_ITERATION},
  "total_issues": 0,
  "critical_issues": 0,
  "major_issues": 0, 
  "minor_issues": 0,
  "issues_by_category": {
    "security": [],
    "performance": [],
    "code_quality": [],
    "integration": [],
    "compliance": []
  },
  "quality_gates_status": {
    "critical_gates": "unknown",
    "major_gates": "unknown", 
    "minor_gates": "unknown"
  }
}
EOF
        
        # Analyze each quality domain
        for domain in "code-quality" "security" "performance" "integration"; do
            DOMAIN_DIR="${QUALITY_OUTPUTS_DIR}/${domain}"
            if [ -d "${DOMAIN_DIR}" ]; then
                DOMAIN_ISSUES=$(find "${DOMAIN_DIR}" -name "*.md" -o -name "*.json" -type f 2>/dev/null | wc -l | xargs)
                if [ "${DOMAIN_ISSUES}" -gt 0 ]; then
                    echo "📂 ${domain}: ${DOMAIN_ISSUES} analysis files found"
                    
                    # Simple issue detection based on keywords in files
                    DOMAIN_CRITICAL=$(find "${DOMAIN_DIR}" -type f -exec grep -l -i "critical\|blocker\|security.*vulnerability" {} \; 2>/dev/null | wc -l | xargs)
                    DOMAIN_MAJOR=$(find "${DOMAIN_DIR}" -type f -exec grep -l -i "major\|error\|fail\|violation" {} \; 2>/dev/null | wc -l | xargs)
                    DOMAIN_MINOR=$(find "${DOMAIN_DIR}" -type f -exec grep -l -i "minor\|warning\|improvement" {} \; 2>/dev/null | wc -l | xargs)
                    
                    CRITICAL_ISSUES=$((CRITICAL_ISSUES + DOMAIN_CRITICAL))
                    MAJOR_ISSUES=$((MAJOR_ISSUES + DOMAIN_MAJOR))  
                    MINOR_ISSUES=$((MINOR_ISSUES + DOMAIN_MINOR))
                    
                    echo "  └── Critical: ${DOMAIN_CRITICAL}, Major: ${DOMAIN_MAJOR}, Minor: ${DOMAIN_MINOR}"
                fi
            fi
        done
        
        TOTAL_ISSUES=$((CRITICAL_ISSUES + MAJOR_ISSUES + MINOR_ISSUES))
        
        # Update issues summary
        jq --argjson total "${TOTAL_ISSUES}" \
           --argjson critical "${CRITICAL_ISSUES}" \
           --argjson major "${MAJOR_ISSUES}" \
           --argjson minor "${MINOR_ISSUES}" \
           '.total_issues = $total | .critical_issues = $critical | .major_issues = $major | .minor_issues = $minor' \
           "${ISSUES_SUMMARY}" > "${ISSUES_SUMMARY}.tmp" && mv "${ISSUES_SUMMARY}.tmp" "${ISSUES_SUMMARY}"
        
        # Determine quality gates status
        if [ "${CRITICAL_ISSUES}" -gt 0 ]; then
            CRITICAL_GATES="FAIL"
            OVERALL_STATUS="quality_issues_found"
        else
            CRITICAL_GATES="PASS"
        fi
        
        if [ "${MAJOR_ISSUES}" -gt 0 ]; then
            MAJOR_GATES="FAIL"
            OVERALL_STATUS="quality_issues_found"
        else
            MAJOR_GATES="PASS"
        fi
        
        if [ "${MINOR_ISSUES}" -gt 0 ]; then
            MINOR_GATES="FAIL"
        else
            MINOR_GATES="PASS"
        fi
        
        # If no critical or major issues, quality passes
        if [ "${CRITICAL_ISSUES}" -eq 0 ] && [ "${MAJOR_ISSUES}" -eq 0 ]; then
            OVERALL_STATUS="quality_gates_passed"
        fi
        
        # Update iteration tracker
        jq --arg status "${OVERALL_STATUS}" '.quality_status = $status' \
           "${ITERATION_TRACKER}" > "${ITERATION_TRACKER}.tmp" && mv "${ITERATION_TRACKER}.tmp" "${ITERATION_TRACKER}"
        
        echo "✅ Quality analysis complete"
        echo ""
        echo "📊 Results Summary:"
        echo "TOTAL_ISSUES=${TOTAL_ISSUES}"
        echo "CRITICAL_ISSUES=${CRITICAL_ISSUES}"
        echo "MAJOR_ISSUES=${MAJOR_ISSUES}"
        echo "MINOR_ISSUES=${MINOR_ISSUES}"
        echo "CRITICAL_GATES=${CRITICAL_GATES}"
        echo "MAJOR_GATES=${MAJOR_GATES}" 
        echo "MINOR_GATES=${MINOR_GATES}"
        echo "QUALITY_STATUS=${OVERALL_STATUS}"
        echo "ISSUES_SUMMARY=${ISSUES_SUMMARY}"
        ;;
        
    "create_remediation_plan")
        echo "=== Creating Remediation Plan ==="
        
        # Check if we need remediation
        if [ "${QUALITY_STATUS}" != "quality_issues_found" ]; then
            echo "ℹ️ No remediation needed - quality status: ${QUALITY_STATUS}"
            echo "REMEDIATION_NEEDED=false"
            exit 0
        fi
        
        # Check iteration limit
        if [ "${CURRENT_ITERATION}" -ge "${MAX_ITERATIONS}" ]; then
            echo "⚠️ Maximum iterations reached (${CURRENT_ITERATION}/${MAX_ITERATIONS})"
            echo "🚨 Escalation required - updating tracker"
            
            jq '.escalation_required = true | .quality_status = "escalation_required"' \
               "${ITERATION_TRACKER}" > "${ITERATION_TRACKER}.tmp" && mv "${ITERATION_TRACKER}.tmp" "${ITERATION_TRACKER}"
            
            echo "REMEDIATION_NEEDED=false"  
            echo "ESCALATION_REQUIRED=true"
            exit 0
        fi
        
        # Create remediation plan
        NEXT_ITERATION=$((CURRENT_ITERATION + 1))
        REMEDIATION_PLAN="${FEEDBACK_LOOP_DIR}/iteration-${NEXT_ITERATION}/remediation-plan.json"
        mkdir -p "$(dirname "${REMEDIATION_PLAN}")"
        
        # Read quality coordination plan to get remediation agents
        QUALITY_COORDINATION_PLAN="${QUALITY_DIR}/coordination/quality-coordination-plan.json"
        
        cat > "${REMEDIATION_PLAN}" << EOF
{
  "iteration": ${NEXT_ITERATION},
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "remediation_required": true,
  "remediation_agents": [
    {
      "agent": "golang-api-developer",
      "reason": "Fix backend security and performance issues",
      "focus_areas": ["Security vulnerabilities", "Performance bottlenecks", "Code quality"],
      "thinking_budget": "think",
      "priority": "high"
    },
    {
      "agent": "react-developer", 
      "reason": "Fix frontend code quality and security issues",
      "focus_areas": ["UI security", "Component quality", "Performance optimization"],
      "thinking_budget": "basic",
      "priority": "medium"  
    }
  ],
  "remediation_instructions": {
    "context_files": [
      "${QUALITY_DIR}/analysis/",
      "${FEEDBACK_LOOP_DIR}/iteration-${CURRENT_ITERATION}/issues-found.json"
    ],
    "focus": "Address critical and major issues identified in quality review",
    "success_criteria": "All critical issues resolved, major issues addressed"
  }
}
EOF
        
        # Update iteration tracker
        jq --argjson iteration "${NEXT_ITERATION}" \
           '.current_iteration = $iteration | .quality_status = "remediation_in_progress"' \
           "${ITERATION_TRACKER}" > "${ITERATION_TRACKER}.tmp" && mv "${ITERATION_TRACKER}.tmp" "${ITERATION_TRACKER}"
        
        echo "✅ Remediation plan created for iteration ${NEXT_ITERATION}"
        echo ""
        echo "📋 Remediation Details:"
        echo "REMEDIATION_NEEDED=true"
        echo "NEXT_ITERATION=${NEXT_ITERATION}"
        echo "REMEDIATION_PLAN=${REMEDIATION_PLAN}"
        echo "ESCALATION_REQUIRED=false"
        ;;
        
    "validate_fixes")
        echo "=== Validating Fixes from Remediation ==="
        
        # Simple validation - check if new iteration outputs exist
        VALIDATION_DIR="${FEEDBACK_LOOP_DIR}/iteration-${CURRENT_ITERATION}/fix-validation"
        mkdir -p "${VALIDATION_DIR}"
        
        # Create validation results
        VALIDATION_RESULTS="${VALIDATION_DIR}/validation-results.json"
        cat > "${VALIDATION_RESULTS}" << EOF
{
  "iteration": ${CURRENT_ITERATION},
  "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "fixes_applied": true,
  "validation_status": "pending_quality_recheck",
  "next_action": "re_run_quality_agents"
}
EOF
        
        # Update iteration tracker
        jq '.quality_status = "fixes_applied_pending_validation"' \
           "${ITERATION_TRACKER}" > "${ITERATION_TRACKER}.tmp" && mv "${ITERATION_TRACKER}.tmp" "${ITERATION_TRACKER}"
        
        echo "✅ Fix validation initiated"
        echo ""
        echo "📊 Validation Status:"
        echo "FIXES_APPLIED=true"
        echo "NEXT_ACTION=re_run_quality_agents"
        echo "VALIDATION_RESULTS=${VALIDATION_RESULTS}"
        ;;
        
    "check_completion")
        echo "=== Checking Quality Review Completion Status ==="
        
        # Read current status from tracker
        ESCALATION_REQUIRED=$(cat "${ITERATION_TRACKER}" | jq -r '.escalation_required')
        
        if [ "${QUALITY_STATUS}" = "quality_gates_passed" ]; then
            echo "✅ Quality gates passed - review complete"
            echo "QUALITY_COMPLETE=true"
            echo "ESCALATION_REQUIRED=false"
            echo "NEXT_PHASE=deployment"
            
        elif [ "${ESCALATION_REQUIRED}" = "true" ]; then
            echo "🚨 Escalation required - maximum iterations exceeded"
            echo "QUALITY_COMPLETE=false"
            echo "ESCALATION_REQUIRED=true"
            echo "NEXT_PHASE=manual_review"
            
        elif [ "${QUALITY_STATUS}" = "quality_issues_found" ]; then
            echo "🔄 Quality issues found - remediation needed"
            echo "QUALITY_COMPLETE=false"
            echo "ESCALATION_REQUIRED=false"
            echo "NEXT_PHASE=remediation"
            
        elif [ "${QUALITY_STATUS}" = "fixes_applied_pending_validation" ]; then
            echo "⏳ Fixes applied - re-validation needed"
            echo "QUALITY_COMPLETE=false"
            echo "ESCALATION_REQUIRED=false" 
            echo "NEXT_PHASE=re_validate"
            
        else
            echo "❓ Unknown quality status: ${QUALITY_STATUS}"
            echo "QUALITY_COMPLETE=false"
            echo "ESCALATION_REQUIRED=false"
            echo "NEXT_PHASE=continue_review"
        fi
        
        echo ""
        echo "📊 Completion Check Results:"
        echo "CURRENT_ITERATION=${CURRENT_ITERATION}"
        echo "MAX_ITERATIONS=${MAX_ITERATIONS}"  
        echo "QUALITY_STATUS=${QUALITY_STATUS}"
        echo "ITERATION_TRACKER=${ITERATION_TRACKER}"
        ;;
        
    *)
        echo "❌ Unknown action: ${ACTION}"
        echo "Valid actions: analyze_quality_results, create_remediation_plan, validate_fixes, check_completion"
        exit 1
        ;;
esac