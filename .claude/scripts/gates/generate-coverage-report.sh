#!/bin/bash

# generate-coverage-report.sh
# Mechanical script to run coverage tools and generate comprehensive reports
# Used by test-coverage-auditor agent for intelligent coverage analysis

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "${FEATURE_ID}" ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUTPUT_DIR=".claude/features/${FEATURE_ID}/testing/coverage-reports"
COVERAGE_LOG="${OUTPUT_DIR}/coverage-execution-${TIMESTAMP}.log"
COVERAGE_JSON="${OUTPUT_DIR}/coverage-report-${TIMESTAMP}.json"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize coverage JSON
cat > "${COVERAGE_JSON}" << 'EOF'
{
  "generation_timestamp": "",
  "feature_id": "",
  "coverage_analysis": {
    "go_backend": {
      "status": "not_run",
      "overall_coverage": 0.0,
      "line_coverage": 0.0,
      "function_coverage": 0.0,
      "branch_coverage": 0.0,
      "package_coverage": {},
      "uncovered_files": [],
      "critical_paths_coverage": 0.0,
      "output_file": "",
      "error_message": ""
    },
    "frontend": {
      "status": "not_run",
      "overall_coverage": 0.0,
      "line_coverage": 0.0,
      "function_coverage": 0.0,
      "branch_coverage": 0.0,
      "statement_coverage": 0.0,
      "component_coverage": {},
      "uncovered_components": [],
      "output_file": "",
      "error_message": ""
    },
    "e2e_coverage": {
      "status": "not_run",
      "user_journey_coverage": 0.0,
      "workflow_coverage": 0.0,
      "critical_path_coverage": 0.0,
      "covered_workflows": [],
      "missing_workflows": [],
      "output_file": "",
      "error_message": ""
    }
  },
  "quality_metrics": {
    "overall_quality_score": 0.0,
    "coverage_gaps": [],
    "critical_missing": [],
    "recommendations": []
  },
  "thresholds": {
    "business_logic_target": 80,
    "security_functions_target": 95,
    "critical_paths_target": 90,
    "overall_target": 75
  }
}
EOF

# Update initial metadata
jq --arg timestamp "${TIMESTAMP}" \
   --arg feature_id "${FEATURE_ID}" \
   '.generation_timestamp = $timestamp | .feature_id = $feature_id' \
   "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"

echo "📊 Starting coverage report generation for feature: ${FEATURE_ID}" | tee -a "${COVERAGE_LOG}"
echo "📈 Report will be saved to: ${COVERAGE_JSON}" | tee -a "${COVERAGE_LOG}"
echo "📝 Execution log: ${COVERAGE_LOG}" | tee -a "${COVERAGE_LOG}"
echo "" | tee -a "${COVERAGE_LOG}"

# Function to update coverage results
update_coverage_results() {
    local suite_name="$1"
    local status="$2"
    local overall_cov="$3"
    local output_file="$4"
    local error_msg="${5:-}"

    jq --arg suite "${suite_name}" \
       --arg status "${status}" \
       --argjson overall "${overall_cov}" \
       --arg output_file "${output_file}" \
       --arg error_msg "${error_msg}" \
       '.coverage_analysis[$suite].status = $status |
        .coverage_analysis[$suite].overall_coverage = $overall |
        .coverage_analysis[$suite].output_file = $output_file |
        .coverage_analysis[$suite].error_message = $error_msg' \
       "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"
}

# 1. Generate Go Backend Coverage
echo "🔧 Generating Go backend coverage..." | tee -a "${COVERAGE_LOG}"
GO_COVERAGE_OUT="${OUTPUT_DIR}/go-coverage-${TIMESTAMP}.out"
GO_COVERAGE_HTML="${OUTPUT_DIR}/go-coverage-${TIMESTAMP}.html"
GO_COVERAGE_JSON="${OUTPUT_DIR}/go-coverage-${TIMESTAMP}.json"

if cd modules && find . -name "*_test.go" -print -quit | grep -q "test.go"; then
    echo "Found Go test files, generating coverage..." | tee -a "${COVERAGE_LOG}"
    
    # Generate Go coverage with profile
    if timeout 300 go test -coverprofile="${GO_COVERAGE_OUT}" -covermode=atomic -coverpkg=./... ./... > /dev/null 2>&1; then
        # Generate HTML coverage report
        go tool cover -html="${GO_COVERAGE_OUT}" -o "${GO_COVERAGE_HTML}"
        
        # Extract coverage percentage
        GO_OVERALL_COV=$(go tool cover -func="${GO_COVERAGE_OUT}" | grep "total:" | awk '{print $3}' | sed 's/%//' || echo "0.0")
        
        # Generate detailed JSON analysis
        cat > "${GO_COVERAGE_JSON}" << EOF
{
  "overall_coverage": ${GO_OVERALL_COV},
  "package_details": {},
  "uncovered_functions": [],
  "critical_paths": []
}
EOF
        
        # Extract package-level coverage
        go tool cover -func="${GO_COVERAGE_OUT}" | grep -v "total:" | while IFS= read -r line; do
            if [[ "${line}" =~ ^([^[:space:]]+)[[:space:]]+([^[:space:]]+)[[:space:]]+([0-9.]+)% ]]; then
                FILE="${BASH_REMATCH[1]}"
                FUNC="${BASH_REMATCH[2]}"
                COV="${BASH_REMATCH[3]}"
                
                # Add to JSON (simplified - would need more complex JSON manipulation in practice)
                echo "Package: ${FILE}, Function: ${FUNC}, Coverage: ${COV}%" >> "${GO_COVERAGE_JSON}.details"
            fi
        done
        
        echo "✅ Go coverage generated: ${GO_OVERALL_COV}%" | tee -a "${COVERAGE_LOG}"
        
        # Update JSON with detailed Go coverage
        jq --argjson overall_cov "${GO_OVERALL_COV}" \
           --argjson line_cov "${GO_OVERALL_COV}" \
           --argjson func_cov "${GO_OVERALL_COV}" \
           '.coverage_analysis.go_backend.overall_coverage = $overall_cov |
            .coverage_analysis.go_backend.line_coverage = $line_cov |
            .coverage_analysis.go_backend.function_coverage = $func_cov |
            .coverage_analysis.go_backend.status = "completed"' \
           "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"
           
    else
        GO_ERROR="Go coverage generation failed or timed out"
        echo "❌ ${GO_ERROR}" | tee -a "${COVERAGE_LOG}"
        update_coverage_results "go_backend" "failed" "0.0" "" "${GO_ERROR}"
    fi
    cd ..
else
    echo "ℹ️ No Go test files found, skipping coverage..." | tee -a "${COVERAGE_LOG}"
    update_coverage_results "go_backend" "skipped" "0.0" ""
fi

# 2. Generate Frontend Coverage (if Jest is configured)
echo "⚛️ Generating frontend coverage..." | tee -a "${COVERAGE_LOG}"
FRONTEND_COVERAGE_DIR="${OUTPUT_DIR}/frontend-coverage-${TIMESTAMP}"

if [ -d "modules/chariot/ui" ] && [ -f "modules/chariot/ui/package.json" ]; then
    cd modules/chariot/ui
    
    # Check if Jest/coverage is configured
    if npm run test:coverage --if-present > /dev/null 2>&1 || npm test -- --coverage --watchAll=false --silent > /dev/null 2>&1; then
        mkdir -p "${FRONTEND_COVERAGE_DIR}"
        
        # Try running coverage (fallback to basic test if coverage not configured)
        if timeout 300 npm test -- --coverage --watchAll=false --silent --coverageDirectory="${FRONTEND_COVERAGE_DIR}" 2>/dev/null; then
            # Parse coverage JSON if available
            if [ -f "${FRONTEND_COVERAGE_DIR}/coverage-summary.json" ]; then
                FRONTEND_OVERALL_COV=$(jq -r '.total.lines.pct' "${FRONTEND_COVERAGE_DIR}/coverage-summary.json" 2>/dev/null || echo "0.0")
                FRONTEND_STMT_COV=$(jq -r '.total.statements.pct' "${FRONTEND_COVERAGE_DIR}/coverage-summary.json" 2>/dev/null || echo "0.0")
                FRONTEND_FUNC_COV=$(jq -r '.total.functions.pct' "${FRONTEND_COVERAGE_DIR}/coverage-summary.json" 2>/dev/null || echo "0.0")
                FRONTEND_BRANCH_COV=$(jq -r '.total.branches.pct' "${FRONTEND_COVERAGE_DIR}/coverage-summary.json" 2>/dev/null || echo "0.0")
                
                echo "✅ Frontend coverage generated: ${FRONTEND_OVERALL_COV}%" | tee -a "${COVERAGE_LOG}"
                
                # Update JSON with detailed frontend coverage
                jq --argjson overall_cov "${FRONTEND_OVERALL_COV}" \
                   --argjson line_cov "${FRONTEND_OVERALL_COV}" \
                   --argjson stmt_cov "${FRONTEND_STMT_COV}" \
                   --argjson func_cov "${FRONTEND_FUNC_COV}" \
                   --argjson branch_cov "${FRONTEND_BRANCH_COV}" \
                   '.coverage_analysis.frontend.overall_coverage = $overall_cov |
                    .coverage_analysis.frontend.line_coverage = $line_cov |
                    .coverage_analysis.frontend.statement_coverage = $stmt_cov |
                    .coverage_analysis.frontend.function_coverage = $func_cov |
                    .coverage_analysis.frontend.branch_coverage = $branch_cov |
                    .coverage_analysis.frontend.status = "completed"' \
                   "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"
            else
                echo "⚠️ Coverage ran but no summary found, estimating..." | tee -a "${COVERAGE_LOG}"
                update_coverage_results "frontend" "completed" "0.0" "${FRONTEND_COVERAGE_DIR}"
            fi
        else
            echo "❌ Frontend coverage generation failed" | tee -a "${COVERAGE_LOG}"
            update_coverage_results "frontend" "failed" "0.0" "" "Coverage execution failed"
        fi
    else
        echo "ℹ️ No frontend coverage configuration found" | tee -a "${COVERAGE_LOG}"
        update_coverage_results "frontend" "no_coverage_config" "0.0" ""
    fi
    cd ../../..
else
    echo "ℹ️ No frontend directory found, skipping..." | tee -a "${COVERAGE_LOG}"
    update_coverage_results "frontend" "skipped" "0.0" ""
fi

# 3. Analyze E2E Workflow Coverage
echo "🎭 Analyzing E2E workflow coverage..." | tee -a "${COVERAGE_LOG}"
E2E_ANALYSIS="${OUTPUT_DIR}/e2e-workflow-analysis-${TIMESTAMP}.json"

if [ -d "modules/chariot/e2e/src/tests" ]; then
    # Count existing E2E test workflows
    TOTAL_SPECS=$(find modules/chariot/e2e/src/tests -name "*.spec.ts" | wc -l)
    
    # Analyze workflow coverage (basic analysis)
    WORKFLOW_AREAS=(
        "authentication"
        "asset-management" 
        "vulnerability-assessment"
        "attack-surface"
        "settings"
        "reporting"
        "integrations"
    )
    
    COVERED_WORKFLOWS=0
    MISSING_WORKFLOWS=()
    
    for workflow in "${WORKFLOW_AREAS[@]}"; do
        if find modules/chariot/e2e/src/tests -name "*.spec.ts" -exec grep -l "${workflow}" {} \; | head -1 | grep -q "."; then
            COVERED_WORKFLOWS=$((COVERED_WORKFLOWS + 1))
        else
            MISSING_WORKFLOWS+=("${workflow}")
        fi
    done
    
    WORKFLOW_COVERAGE=$(echo "scale=2; ${COVERED_WORKFLOWS} / ${#WORKFLOW_AREAS[@]} * 100" | bc)
    
    # Create E2E analysis JSON
    cat > "${E2E_ANALYSIS}" << EOF
{
  "total_spec_files": ${TOTAL_SPECS},
  "workflow_areas_total": ${#WORKFLOW_AREAS[@]},
  "covered_workflows": ${COVERED_WORKFLOWS},
  "workflow_coverage_percent": ${WORKFLOW_COVERAGE},
  "missing_workflows": $(printf '%s\n' "${MISSING_WORKFLOWS[@]}" | jq -R . | jq -s .)
}
EOF
    
    echo "✅ E2E workflow coverage: ${WORKFLOW_COVERAGE}% (${COVERED_WORKFLOWS}/${#WORKFLOW_AREAS[@]})" | tee -a "${COVERAGE_LOG}"
    
    # Update JSON with E2E coverage
    jq --argjson workflow_cov "${WORKFLOW_COVERAGE}" \
       --arg e2e_file "${E2E_ANALYSIS}" \
       '.coverage_analysis.e2e_coverage.workflow_coverage = $workflow_cov |
        .coverage_analysis.e2e_coverage.user_journey_coverage = $workflow_cov |
        .coverage_analysis.e2e_coverage.status = "completed" |
        .coverage_analysis.e2e_coverage.output_file = $e2e_file' \
       "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"
else
    echo "ℹ️ No E2E tests found, skipping workflow analysis..." | tee -a "${COVERAGE_LOG}"
    update_coverage_results "e2e_coverage" "skipped" "0.0" ""
fi

# 4. Generate Quality Metrics and Recommendations
echo "🔍 Calculating quality metrics..." | tee -a "${COVERAGE_LOG}"

# Extract coverage values for calculations
GO_COV=$(jq -r '.coverage_analysis.go_backend.overall_coverage // 0' "${COVERAGE_JSON}")
FRONTEND_COV=$(jq -r '.coverage_analysis.frontend.overall_coverage // 0' "${COVERAGE_JSON}")
E2E_COV=$(jq -r '.coverage_analysis.e2e_coverage.workflow_coverage // 0' "${COVERAGE_JSON}")

# Calculate overall quality score (weighted average)
OVERALL_QUALITY=$(echo "scale=2; (${GO_COV} * 0.5 + ${FRONTEND_COV} * 0.3 + ${E2E_COV} * 0.2)" | bc)

# Generate recommendations based on thresholds
RECOMMENDATIONS=()
CRITICAL_MISSING=()

if (( $(echo "${GO_COV} < 80" | bc -l) )); then
    RECOMMENDATIONS+=("Go backend coverage (${GO_COV}%) is below 80% threshold")
    if (( $(echo "${GO_COV} < 50" | bc -l) )); then
        CRITICAL_MISSING+=("Critical: Go backend coverage critically low")
    fi
fi

if (( $(echo "${FRONTEND_COV} < 70" | bc -l) )); then
    RECOMMENDATIONS+=("Frontend coverage (${FRONTEND_COV}%) is below 70% threshold")
fi

if (( $(echo "${E2E_COV} < 80" | bc -l) )); then
    RECOMMENDATIONS+=("E2E workflow coverage (${E2E_COV}%) is below 80% threshold")
fi

# Update final quality metrics
RECOMMENDATIONS_JSON=$(printf '%s\n' "${RECOMMENDATIONS[@]}" | jq -R . | jq -s .)
CRITICAL_JSON=$(printf '%s\n' "${CRITICAL_MISSING[@]}" | jq -R . | jq -s .)

jq --argjson quality_score "${OVERALL_QUALITY}" \
   --argjson recommendations "${RECOMMENDATIONS_JSON}" \
   --argjson critical "${CRITICAL_JSON}" \
   '.quality_metrics.overall_quality_score = $quality_score |
    .quality_metrics.recommendations = $recommendations |
    .quality_metrics.critical_missing = $critical' \
   "${COVERAGE_JSON}" > "${COVERAGE_JSON}.tmp" && mv "${COVERAGE_JSON}.tmp" "${COVERAGE_JSON}"

# Final summary
echo "" | tee -a "${COVERAGE_LOG}"
echo "📊 Coverage Report Generation Complete" | tee -a "${COVERAGE_LOG}"
echo "📈 Coverage Summary:" | tee -a "${COVERAGE_LOG}"
echo "   - Go Backend: ${GO_COV}%" | tee -a "${COVERAGE_LOG}"
echo "   - Frontend: ${FRONTEND_COV}%" | tee -a "${COVERAGE_LOG}"
echo "   - E2E Workflows: ${E2E_COV}%" | tee -a "${COVERAGE_LOG}"
echo "   - Overall Quality Score: ${OVERALL_QUALITY}" | tee -a "${COVERAGE_LOG}"
echo "" | tee -a "${COVERAGE_LOG}"

# Output file locations for agents
echo "COVERAGE_REPORT_JSON=${COVERAGE_JSON}"
echo "COVERAGE_LOG=${COVERAGE_LOG}"
echo "GO_COVERAGE=${GO_COV}"
echo "FRONTEND_COVERAGE=${FRONTEND_COV}"
echo "E2E_COVERAGE=${E2E_COV}"
echo "OVERALL_QUALITY_SCORE=${OVERALL_QUALITY}"
echo "OUTPUT_DIR=${OUTPUT_DIR}"

exit 0