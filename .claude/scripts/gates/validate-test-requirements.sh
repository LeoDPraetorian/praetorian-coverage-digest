#!/bin/bash

# validate-test-requirements.sh
# Mechanical script to check basic test requirements and infrastructure
# Used by test-coverage-auditor and test-quality-assessor for foundational validation

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "${FEATURE_ID}" ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUTPUT_DIR=".claude/features/${FEATURE_ID}/testing/requirements-validation"
VALIDATION_LOG="${OUTPUT_DIR}/requirements-validation-${TIMESTAMP}.log"
VALIDATION_JSON="${OUTPUT_DIR}/test-requirements-${TIMESTAMP}.json"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize validation JSON
cat > "${VALIDATION_JSON}" << 'EOF'
{
  "validation_timestamp": "",
  "feature_id": "",
  "infrastructure_requirements": {
    "go_testing_setup": {
      "status": "not_checked",
      "go_version": "",
      "test_command_available": false,
      "coverage_tools_available": false,
      "testify_dependency": false,
      "benchmark_support": false,
      "issues": []
    },
    "frontend_testing_setup": {
      "status": "not_checked",
      "node_version": "", 
      "npm_available": false,
      "test_framework": "",
      "test_command_available": false,
      "coverage_configured": false,
      "testing_library_available": false,
      "issues": []
    },
    "e2e_testing_setup": {
      "status": "not_checked",
      "playwright_version": "",
      "e2e_directory_exists": false,
      "test_configuration": false,
      "test_data_available": false,
      "browser_support": [],
      "issues": []
    }
  },
  "project_structure_requirements": {
    "test_directories": {
      "go_tests_location": "",
      "frontend_tests_location": "",
      "e2e_tests_location": "",
      "test_utilities_location": "",
      "fixtures_location": ""
    },
    "configuration_files": {
      "go_mod_exists": false,
      "package_json_exists": false,
      "playwright_config_exists": false,
      "jest_config_exists": false,
      "tsconfig_exists": false
    },
    "naming_conventions": {
      "go_test_files_follow_convention": false,
      "frontend_test_files_follow_convention": false,
      "e2e_spec_files_follow_convention": false
    }
  },
  "quality_requirements": {
    "minimum_test_coverage": 75,
    "security_functions_coverage": 95,
    "critical_path_coverage": 90,
    "test_isolation": true,
    "parallel_execution_support": true,
    "ci_integration_ready": false
  },
  "validation_summary": {
    "overall_status": "unknown",
    "total_requirements": 0,
    "requirements_met": 0,
    "requirements_failed": 0,
    "critical_blockers": [],
    "warnings": [],
    "recommendations": []
  }
}
EOF

# Update initial metadata
jq --arg timestamp "${TIMESTAMP}" \
   --arg feature_id "${FEATURE_ID}" \
   '.validation_timestamp = $timestamp | .feature_id = $feature_id' \
   "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"

echo "✅ Starting test requirements validation for feature: ${FEATURE_ID}" | tee -a "${VALIDATION_LOG}"
echo "📋 Validation will be saved to: ${VALIDATION_JSON}" | tee -a "${VALIDATION_LOG}"
echo "📝 Execution log: ${VALIDATION_LOG}" | tee -a "${VALIDATION_LOG}"
echo "" | tee -a "${VALIDATION_LOG}"

# Track validation results
TOTAL_REQUIREMENTS=0
REQUIREMENTS_MET=0
REQUIREMENTS_FAILED=0
CRITICAL_BLOCKERS=()
WARNINGS=()
RECOMMENDATIONS=()

# Helper function to check requirement
check_requirement() {
    local requirement_name="$1"
    local check_result="$2"
    local is_critical="${3:-false}"
    
    TOTAL_REQUIREMENTS=$((TOTAL_REQUIREMENTS + 1))
    
    if [ "${check_result}" = "true" ] || [ "${check_result}" = "pass" ]; then
        REQUIREMENTS_MET=$((REQUIREMENTS_MET + 1))
        echo "✅ ${requirement_name}" | tee -a "${VALIDATION_LOG}"
    else
        REQUIREMENTS_FAILED=$((REQUIREMENTS_FAILED + 1))
        echo "❌ ${requirement_name}" | tee -a "${VALIDATION_LOG}"
        
        if [ "${is_critical}" = "true" ]; then
            CRITICAL_BLOCKERS+=("${requirement_name}")
        else
            WARNINGS+=("${requirement_name}")
        fi
    fi
}

# 1. Validate Go Testing Infrastructure
echo "🔧 Validating Go testing infrastructure..." | tee -a "${VALIDATION_LOG}"

GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' || echo "")
if [ -n "${GO_VERSION}" ]; then
    check_requirement "Go runtime available (${GO_VERSION})" "true" "true"
    
    # Update JSON with Go version
    jq --arg go_version "${GO_VERSION}" \
       '.infrastructure_requirements.go_testing_setup.go_version = $go_version' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Go runtime available" "false" "true"
fi

# Check if go test command works
if cd modules && go test -h > /dev/null 2>&1; then
    check_requirement "Go test command functional" "true" "true"
    
    jq '.infrastructure_requirements.go_testing_setup.test_command_available = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
    cd ..
else
    check_requirement "Go test command functional" "false" "true"
    cd .. 2>/dev/null || true
fi

# Check coverage tools
if go tool cover -h > /dev/null 2>&1; then
    check_requirement "Go coverage tools available" "true" "false"
    jq '.infrastructure_requirements.go_testing_setup.coverage_tools_available = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Go coverage tools available" "false" "false"
fi

# Check testify dependency
if find modules -name "go.mod" -exec grep -l "github.com/stretchr/testify" {} \; | head -1 | grep -q "."; then
    check_requirement "Testify dependency available" "true" "false"
    jq '.infrastructure_requirements.go_testing_setup.testify_dependency = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Testify dependency available" "false" "false"
    RECOMMENDATIONS+=("Consider adding github.com/stretchr/testify for better Go test assertions")
fi

# Check benchmark support
if find modules -name "*_test.go" -exec grep -l "func.*Benchmark" {} \; | head -1 | grep -q "."; then
    check_requirement "Benchmark tests support" "true" "false"
    jq '.infrastructure_requirements.go_testing_setup.benchmark_support = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Benchmark tests support" "false" "false"
    RECOMMENDATIONS+=("Consider adding benchmark tests for performance-critical Go functions")
fi

# Update Go testing setup status
jq '.infrastructure_requirements.go_testing_setup.status = "checked"' \
   "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"

# 2. Validate Frontend Testing Infrastructure
echo "⚛️ Validating frontend testing infrastructure..." | tee -a "${VALIDATION_LOG}"

NODE_VERSION=$(node --version 2>/dev/null || echo "")
if [ -n "${NODE_VERSION}" ]; then
    check_requirement "Node.js runtime available (${NODE_VERSION})" "true" "false"
    jq --arg node_version "${NODE_VERSION}" \
       '.infrastructure_requirements.frontend_testing_setup.node_version = $node_version' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Node.js runtime available" "false" "false"
fi

# Check npm availability
if npm --version > /dev/null 2>&1; then
    check_requirement "NPM package manager available" "true" "false"
    jq '.infrastructure_requirements.frontend_testing_setup.npm_available = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "NPM package manager available" "false" "false"
fi

# Check for test framework in frontend
FRONTEND_TEST_FRAMEWORK=""
if [ -f "modules/chariot/ui/package.json" ]; then
    if grep -q '"jest"' modules/chariot/ui/package.json; then
        FRONTEND_TEST_FRAMEWORK="jest"
    elif grep -q '"vitest"' modules/chariot/ui/package.json; then
        FRONTEND_TEST_FRAMEWORK="vitest"  
    elif grep -q '"@testing-library"' modules/chariot/ui/package.json; then
        FRONTEND_TEST_FRAMEWORK="react-testing-library"
    fi
    
    if [ -n "${FRONTEND_TEST_FRAMEWORK}" ]; then
        check_requirement "Frontend test framework available (${FRONTEND_TEST_FRAMEWORK})" "true" "false"
        jq --arg framework "${FRONTEND_TEST_FRAMEWORK}" \
           '.infrastructure_requirements.frontend_testing_setup.test_framework = $framework' \
           "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
    else
        check_requirement "Frontend test framework available" "false" "false"
        RECOMMENDATIONS+=("Consider adding Jest or Vitest for frontend unit testing")
    fi
    
    # Check test command
    if cd modules/chariot/ui && npm run test --if-present > /dev/null 2>&1; then
        check_requirement "Frontend test command available" "true" "false"
        jq '.infrastructure_requirements.frontend_testing_setup.test_command_available = true' \
           "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
        cd ../../..
    else
        check_requirement "Frontend test command available" "false" "false"
        cd ../../.. 2>/dev/null || true
    fi
    
    # Check React Testing Library
    if grep -q "@testing-library/react" modules/chariot/ui/package.json; then
        check_requirement "React Testing Library available" "true" "false"
        jq '.infrastructure_requirements.frontend_testing_setup.testing_library_available = true' \
           "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
    else
        check_requirement "React Testing Library available" "false" "false"
        RECOMMENDATIONS+=("Consider adding @testing-library/react for component testing")
    fi
else
    check_requirement "Frontend package.json exists" "false" "false"
fi

# Update frontend testing setup status
jq '.infrastructure_requirements.frontend_testing_setup.status = "checked"' \
   "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"

# 3. Validate E2E Testing Infrastructure
echo "🎭 Validating E2E testing infrastructure..." | tee -a "${VALIDATION_LOG}"

# Check Playwright version
PLAYWRIGHT_VERSION=""
if [ -f "modules/chariot/e2e/package.json" ]; then
    PLAYWRIGHT_VERSION=$(cd modules/chariot/e2e && npm list @playwright/test --depth=0 2>/dev/null | grep "@playwright/test" | awk '{print $2}' || echo "")
    if [ -n "${PLAYWRIGHT_VERSION}" ]; then
        check_requirement "Playwright available (${PLAYWRIGHT_VERSION})" "true" "false"
        jq --arg pw_version "${PLAYWRIGHT_VERSION}" \
           '.infrastructure_requirements.e2e_testing_setup.playwright_version = $pw_version' \
           "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
    else
        check_requirement "Playwright available" "false" "false"
    fi
fi

# Check E2E directory structure
if [ -d "modules/chariot/e2e/src/tests" ]; then
    check_requirement "E2E directory structure exists" "true" "false"
    jq '.infrastructure_requirements.e2e_testing_setup.e2e_directory_exists = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "E2E directory structure exists" "false" "false"
fi

# Check E2E configuration
if [ -f "modules/chariot/e2e/playwright.config.ts" ]; then
    check_requirement "Playwright configuration exists" "true" "false"
    jq '.infrastructure_requirements.e2e_testing_setup.test_configuration = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Playwright configuration exists" "false" "false"
fi

# Check test data/fixtures
if [ -d "modules/chariot/e2e/src/fixtures" ] || find modules/chariot/e2e -name "*fixture*" | head -1 | grep -q "."; then
    check_requirement "E2E test data/fixtures available" "true" "false"
    jq '.infrastructure_requirements.e2e_testing_setup.test_data_available = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "E2E test data/fixtures available" "false" "false"
    RECOMMENDATIONS+=("Consider creating test fixtures for consistent E2E testing")
fi

# Check browser support
BROWSER_SUPPORT=()
if [ -f "modules/chariot/e2e/playwright.config.ts" ]; then
    if grep -q "chromium" modules/chariot/e2e/playwright.config.ts; then
        BROWSER_SUPPORT+=("chromium")
    fi
    if grep -q "firefox" modules/chariot/e2e/playwright.config.ts; then
        BROWSER_SUPPORT+=("firefox")
    fi  
    if grep -q "webkit" modules/chariot/e2e/playwright.config.ts; then
        BROWSER_SUPPORT+=("webkit")
    fi
    
    if [ ${#BROWSER_SUPPORT[@]} -gt 0 ]; then
        BROWSER_LIST=$(printf '%s,' "${BROWSER_SUPPORT[@]}")
        BROWSER_LIST=${BROWSER_LIST%,}
        check_requirement "Browser support configured (${BROWSER_LIST})" "true" "false"
        
        BROWSER_JSON=$(printf '%s\n' "${BROWSER_SUPPORT[@]}" | jq -R . | jq -s .)
        jq --argjson browsers "${BROWSER_JSON}" \
           '.infrastructure_requirements.e2e_testing_setup.browser_support = $browsers' \
           "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
    else
        check_requirement "Browser support configured" "false" "false"
    fi
fi

# Update E2E testing setup status
jq '.infrastructure_requirements.e2e_testing_setup.status = "checked"' \
   "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"

# 4. Validate Project Structure Requirements
echo "📁 Validating project structure requirements..." | tee -a "${VALIDATION_LOG}"

# Check configuration files
if [ -f "modules/go.mod" ] || find modules -name "go.mod" | head -1 | grep -q "."; then
    check_requirement "Go module configuration exists" "true" "true"
    jq '.project_structure_requirements.configuration_files.go_mod_exists = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Go module configuration exists" "false" "true"
fi

if [ -f "modules/chariot/ui/package.json" ]; then
    check_requirement "Frontend package.json exists" "true" "false"
    jq '.project_structure_requirements.configuration_files.package_json_exists = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Frontend package.json exists" "false" "false"
fi

if [ -f "modules/chariot/e2e/playwright.config.ts" ]; then
    check_requirement "Playwright configuration exists" "true" "false"
    jq '.project_structure_requirements.configuration_files.playwright_config_exists = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Playwright configuration exists" "false" "false"
fi

if [ -f "modules/chariot/ui/tsconfig.json" ]; then
    check_requirement "TypeScript configuration exists" "true" "false"
    jq '.project_structure_requirements.configuration_files.tsconfig_exists = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "TypeScript configuration exists" "false" "false"
fi

# Check naming conventions
GO_TEST_FILES_CORRECT=$(find modules -name "*_test.go" | wc -l)
GO_TEST_FILES_INCORRECT=$(find modules -name "*test.go" | grep -v "_test.go" | wc -l || echo "0")

if [ "${GO_TEST_FILES_CORRECT}" -gt 0 ] && [ "${GO_TEST_FILES_INCORRECT}" -eq 0 ]; then
    check_requirement "Go test files follow naming convention (*_test.go)" "true" "false"
    jq '.project_structure_requirements.naming_conventions.go_test_files_follow_convention = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "Go test files follow naming convention (*_test.go)" "false" "false"
    if [ "${GO_TEST_FILES_INCORRECT}" -gt 0 ]; then
        RECOMMENDATIONS+=("${GO_TEST_FILES_INCORRECT} Go test files don't follow *_test.go naming convention")
    fi
fi

# Check E2E spec naming
E2E_SPEC_FILES_CORRECT=$(find modules -path "*/e2e/src/tests" -name "*.spec.ts" | wc -l || echo "0")
E2E_SPEC_FILES_INCORRECT=$(find modules -path "*/e2e/src/tests" -name "*.test.ts" | wc -l || echo "0")

if [ "${E2E_SPEC_FILES_CORRECT}" -gt 0 ] && [ "${E2E_SPEC_FILES_INCORRECT}" -eq 0 ]; then
    check_requirement "E2E spec files follow naming convention (*.spec.ts)" "true" "false"
    jq '.project_structure_requirements.naming_conventions.e2e_spec_files_follow_convention = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
elif [ "${E2E_SPEC_FILES_CORRECT}" -eq 0 ] && [ "${E2E_SPEC_FILES_INCORRECT}" -eq 0 ]; then
    check_requirement "E2E spec files follow naming convention (*.spec.ts)" "true" "false"  # No files is not an error
else
    check_requirement "E2E spec files follow naming convention (*.spec.ts)" "false" "false"
fi

# 5. Validate CI Integration Readiness  
echo "🔄 Validating CI integration readiness..." | tee -a "${VALIDATION_LOG}"

# Check for GitHub Actions or similar CI configuration
CI_CONFIGURED=false
if [ -d ".github/workflows" ]; then
    if find .github/workflows -name "*.yml" -o -name "*.yaml" | head -1 | grep -q "."; then
        CI_CONFIGURED=true
    fi
fi

if [ "${CI_CONFIGURED}" = "true" ]; then
    check_requirement "CI/CD configuration exists" "true" "false"
    jq '.quality_requirements.ci_integration_ready = true' \
       "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"
else
    check_requirement "CI/CD configuration exists" "false" "false"
    RECOMMENDATIONS+=("Consider adding CI/CD workflow for automated test execution")
fi

# 6. Calculate Overall Validation Status
echo "" | tee -a "${VALIDATION_LOG}"
echo "📊 Calculating validation results..." | tee -a "${VALIDATION_LOG}"

# Determine overall status
OVERALL_STATUS="unknown"
if [ ${#CRITICAL_BLOCKERS[@]} -gt 0 ]; then
    OVERALL_STATUS="blocked"
elif [ "${REQUIREMENTS_FAILED}" -eq 0 ]; then
    OVERALL_STATUS="passed"
elif [ "${REQUIREMENTS_FAILED}" -lt $((TOTAL_REQUIREMENTS / 4)) ]; then
    OVERALL_STATUS="warning"
else
    OVERALL_STATUS="failed"
fi

# Calculate success rate
SUCCESS_RATE=0
if [ "${TOTAL_REQUIREMENTS}" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ${REQUIREMENTS_MET} / ${TOTAL_REQUIREMENTS} * 100" | bc)
fi

# Convert arrays to JSON
CRITICAL_BLOCKERS_JSON=$(printf '%s\n' "${CRITICAL_BLOCKERS[@]}" | jq -R . | jq -s .)
WARNINGS_JSON=$(printf '%s\n' "${WARNINGS[@]}" | jq -R . | jq -s .)
RECOMMENDATIONS_JSON=$(printf '%s\n' "${RECOMMENDATIONS[@]}" | jq -R . | jq -s .)

# Update final validation summary
jq --arg overall_status "${OVERALL_STATUS}" \
   --argjson total "${TOTAL_REQUIREMENTS}" \
   --argjson met "${REQUIREMENTS_MET}" \
   --argjson failed "${REQUIREMENTS_FAILED}" \
   --argjson critical_blockers "${CRITICAL_BLOCKERS_JSON}" \
   --argjson warnings "${WARNINGS_JSON}" \
   --argjson recommendations "${RECOMMENDATIONS_JSON}" \
   '.validation_summary.overall_status = $overall_status |
    .validation_summary.total_requirements = $total |
    .validation_summary.requirements_met = $met |
    .validation_summary.requirements_failed = $failed |
    .validation_summary.critical_blockers = $critical_blockers |
    .validation_summary.warnings = $warnings |
    .validation_summary.recommendations = $recommendations' \
   "${VALIDATION_JSON}" > "${VALIDATION_JSON}.tmp" && mv "${VALIDATION_JSON}.tmp" "${VALIDATION_JSON}"

# Final summary
echo "" | tee -a "${VALIDATION_LOG}"
echo "🎯 Test Requirements Validation Complete" | tee -a "${VALIDATION_LOG}"
echo "📊 Validation Results:" | tee -a "${VALIDATION_LOG}"
echo "   - Overall Status: ${OVERALL_STATUS}" | tee -a "${VALIDATION_LOG}"
echo "   - Total Requirements: ${TOTAL_REQUIREMENTS}" | tee -a "${VALIDATION_LOG}"
echo "   - Requirements Met: ${REQUIREMENTS_MET}" | tee -a "${VALIDATION_LOG}"
echo "   - Requirements Failed: ${REQUIREMENTS_FAILED}" | tee -a "${VALIDATION_LOG}"
echo "   - Success Rate: ${SUCCESS_RATE}%" | tee -a "${VALIDATION_LOG}"

if [ ${#CRITICAL_BLOCKERS[@]} -gt 0 ]; then
    echo "" | tee -a "${VALIDATION_LOG}"
    echo "🚨 Critical Blockers:" | tee -a "${VALIDATION_LOG}"
    for blocker in "${CRITICAL_BLOCKERS[@]}"; do
        echo "   - ${blocker}" | tee -a "${VALIDATION_LOG}"
    done
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "" | tee -a "${VALIDATION_LOG}"
    echo "⚠️ Warnings:" | tee -a "${VALIDATION_LOG}"
    for warning in "${WARNINGS[@]}"; do
        echo "   - ${warning}" | tee -a "${VALIDATION_LOG}"
    done
fi

if [ ${#RECOMMENDATIONS[@]} -gt 0 ]; then
    echo "" | tee -a "${VALIDATION_LOG}"
    echo "💡 Recommendations:" | tee -a "${VALIDATION_LOG}"
    for recommendation in "${RECOMMENDATIONS[@]}"; do
        echo "   - ${recommendation}" | tee -a "${VALIDATION_LOG}"
    done
fi

echo "" | tee -a "${VALIDATION_LOG}"

# Output file locations for agents
echo "VALIDATION_JSON=${VALIDATION_JSON}"
echo "VALIDATION_LOG=${VALIDATION_LOG}"
echo "OVERALL_STATUS=${OVERALL_STATUS}"
echo "SUCCESS_RATE=${SUCCESS_RATE}"
echo "CRITICAL_BLOCKERS_COUNT=${#CRITICAL_BLOCKERS[@]}"
echo "WARNINGS_COUNT=${#WARNINGS[@]}"
echo "RECOMMENDATIONS_COUNT=${#RECOMMENDATIONS[@]}"
echo "OUTPUT_DIR=${OUTPUT_DIR}"

# Exit with appropriate code
if [ "${OVERALL_STATUS}" = "blocked" ]; then
    exit 2
elif [ "${OVERALL_STATUS}" = "failed" ]; then
    exit 1
else
    exit 0
fi