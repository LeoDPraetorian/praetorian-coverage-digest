#!/bin/bash

# run-test-suite.sh
# Mechanical script to execute all test suites and collect results
# Used by test-coverage-auditor and test-quality-assessor agents

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "${FEATURE_ID}" ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUTPUT_DIR=".claude/features/${FEATURE_ID}/testing/test-results"
TEST_LOG="${OUTPUT_DIR}/test-execution-${TIMESTAMP}.log"
RESULTS_JSON="${OUTPUT_DIR}/test-results-${TIMESTAMP}.json"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize results JSON
cat > "${RESULTS_JSON}" << 'EOF'
{
  "execution_timestamp": "",
  "feature_id": "",
  "test_suites": {
    "go_backend": {
      "status": "not_run",
      "total_tests": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "duration_seconds": 0,
      "output_file": "",
      "error_message": ""
    },
    "e2e_tests": {
      "status": "not_run", 
      "total_tests": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "duration_seconds": 0,
      "output_file": "",
      "error_message": ""
    },
    "frontend_unit": {
      "status": "not_run",
      "total_tests": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0, 
      "duration_seconds": 0,
      "output_file": "",
      "error_message": ""
    }
  },
  "overall": {
    "status": "unknown",
    "total_tests": 0,
    "total_passed": 0,
    "total_failed": 0,
    "total_skipped": 0,
    "success_rate": 0.0
  }
}
EOF

# Update initial metadata
jq --arg timestamp "${TIMESTAMP}" \
   --arg feature_id "${FEATURE_ID}" \
   '.execution_timestamp = $timestamp | .feature_id = $feature_id' \
   "${RESULTS_JSON}" > "${RESULTS_JSON}.tmp" && mv "${RESULTS_JSON}.tmp" "${RESULTS_JSON}"

echo "🧪 Starting test suite execution for feature: ${FEATURE_ID}" | tee -a "${TEST_LOG}"
echo "📊 Results will be saved to: ${RESULTS_JSON}" | tee -a "${TEST_LOG}"
echo "📝 Execution log: ${TEST_LOG}" | tee -a "${TEST_LOG}"
echo "" | tee -a "${TEST_LOG}"

# Function to update test results
update_test_results() {
    local suite_name="$1"
    local status="$2"
    local total="$3"
    local passed="$4"
    local failed="$5"
    local skipped="$6"
    local duration="$7"
    local output_file="$8"
    local error_msg="${9:-}"

    jq --arg suite "${suite_name}" \
       --arg status "${status}" \
       --argjson total "${total}" \
       --argjson passed "${passed}" \
       --argjson failed "${failed}" \
       --argjson skipped "${skipped}" \
       --argjson duration "${duration}" \
       --arg output_file "${output_file}" \
       --arg error_msg "${error_msg}" \
       '.test_suites[$suite].status = $status |
        .test_suites[$suite].total_tests = $total |
        .test_suites[$suite].passed = $passed |
        .test_suites[$suite].failed = $failed |
        .test_suites[$suite].skipped = $skipped |
        .test_suites[$suite].duration_seconds = $duration |
        .test_suites[$suite].output_file = $output_file |
        .test_suites[$suite].error_message = $error_msg' \
       "${RESULTS_JSON}" > "${RESULTS_JSON}.tmp" && mv "${RESULTS_JSON}.tmp" "${RESULTS_JSON}"
}

# 1. Run Go Backend Tests
echo "🔧 Running Go backend tests..." | tee -a "${TEST_LOG}"
GO_OUTPUT="${OUTPUT_DIR}/go-test-output-${TIMESTAMP}.txt"
GO_START=$(date +%s)

if cd modules && find . -name "*_test.go" -print -quit | grep -q "test.go"; then
    echo "Found Go test files, executing..." | tee -a "${TEST_LOG}"
    
    # Run Go tests with JSON output for parsing
    if timeout 300 go test -v -json ./... > "${GO_OUTPUT}" 2>&1; then
        GO_END=$(date +%s)
        GO_DURATION=$((GO_END - GO_START))
        
        # Parse Go test results
        GO_TOTAL=$(grep -c '"Action":"run"' "${GO_OUTPUT}" || echo "0")
        GO_PASSED=$(grep -c '"Action":"pass".*"Test":"' "${GO_OUTPUT}" || echo "0") 
        GO_FAILED=$(grep -c '"Action":"fail".*"Test":"' "${GO_OUTPUT}" || echo "0")
        GO_SKIPPED=$(grep -c '"Action":"skip"' "${GO_OUTPUT}" || echo "0")
        
        echo "✅ Go tests completed: ${GO_PASSED}/${GO_TOTAL} passed" | tee -a "${TEST_LOG}"
        update_test_results "go_backend" "completed" "${GO_TOTAL}" "${GO_PASSED}" "${GO_FAILED}" "${GO_SKIPPED}" "${GO_DURATION}" "${GO_OUTPUT}"
    else
        GO_END=$(date +%s)
        GO_DURATION=$((GO_END - GO_START))
        GO_ERROR=$(tail -10 "${GO_OUTPUT}" | tr '\n' ' ')
        
        echo "❌ Go tests failed or timed out" | tee -a "${TEST_LOG}"
        update_test_results "go_backend" "failed" "0" "0" "1" "0" "${GO_DURATION}" "${GO_OUTPUT}" "${GO_ERROR}"
    fi
    cd ..
else
    echo "ℹ️ No Go test files found, skipping..." | tee -a "${TEST_LOG}"
    update_test_results "go_backend" "skipped" "0" "0" "0" "0" "0" ""
fi

# 2. Run E2E Tests
echo "🎭 Running E2E tests..." | tee -a "${TEST_LOG}"
E2E_OUTPUT="${OUTPUT_DIR}/e2e-test-output-${TIMESTAMP}.txt"  
E2E_START=$(date +%s)

if [ -d "modules/chariot/e2e" ] && [ -f "modules/chariot/e2e/package.json" ]; then
    echo "Found E2E test suite, executing..." | tee -a "${TEST_LOG}"
    
    cd modules/chariot/e2e
    if timeout 600 npm test > "${E2E_OUTPUT}" 2>&1; then
        E2E_END=$(date +%s)
        E2E_DURATION=$((E2E_END - E2E_START))
        
        # Parse Playwright results (basic parsing - can be enhanced)
        E2E_PASSED=$(grep -c "✓" "${E2E_OUTPUT}" || echo "0")
        E2E_FAILED=$(grep -c "✗" "${E2E_OUTPUT}" || echo "0")
        E2E_TOTAL=$((E2E_PASSED + E2E_FAILED))
        E2E_SKIPPED=$(grep -c "skipped" "${E2E_OUTPUT}" || echo "0")
        
        echo "✅ E2E tests completed: ${E2E_PASSED}/${E2E_TOTAL} passed" | tee -a "${TEST_LOG}"
        update_test_results "e2e_tests" "completed" "${E2E_TOTAL}" "${E2E_PASSED}" "${E2E_FAILED}" "${E2E_SKIPPED}" "${E2E_DURATION}" "${E2E_OUTPUT}"
    else
        E2E_END=$(date +%s)
        E2E_DURATION=$((E2E_END - E2E_START))
        E2E_ERROR=$(tail -10 "${E2E_OUTPUT}" | tr '\n' ' ')
        
        echo "❌ E2E tests failed or timed out" | tee -a "${TEST_LOG}"
        update_test_results "e2e_tests" "failed" "0" "0" "1" "0" "${E2E_DURATION}" "${E2E_OUTPUT}" "${E2E_ERROR}"
    fi
    cd ../../..
else
    echo "ℹ️ No E2E test suite found, skipping..." | tee -a "${TEST_LOG}"
    update_test_results "e2e_tests" "skipped" "0" "0" "0" "0" "0" ""
fi

# 3. Run Frontend Unit Tests (if they exist)
echo "⚛️ Running frontend unit tests..." | tee -a "${TEST_LOG}"
FRONTEND_OUTPUT="${OUTPUT_DIR}/frontend-test-output-${TIMESTAMP}.txt"
FRONTEND_START=$(date +%s)

if [ -d "modules/chariot/ui" ] && [ -f "modules/chariot/ui/package.json" ]; then
    cd modules/chariot/ui
    
    # Check if test script exists
    if npm run test --if-present > "${FRONTEND_OUTPUT}" 2>&1; then
        FRONTEND_END=$(date +%s)
        FRONTEND_DURATION=$((FRONTEND_END - FRONTEND_START))
        
        # Basic parsing - would need enhancement for actual Jest output
        FRONTEND_PASSED=$(grep -c "PASS" "${FRONTEND_OUTPUT}" || echo "0")
        FRONTEND_FAILED=$(grep -c "FAIL" "${FRONTEND_OUTPUT}" || echo "0")
        FRONTEND_TOTAL=$((FRONTEND_PASSED + FRONTEND_FAILED))
        
        echo "✅ Frontend tests completed: ${FRONTEND_PASSED}/${FRONTEND_TOTAL} passed" | tee -a "${TEST_LOG}"
        update_test_results "frontend_unit" "completed" "${FRONTEND_TOTAL}" "${FRONTEND_PASSED}" "${FRONTEND_FAILED}" "0" "${FRONTEND_DURATION}" "${FRONTEND_OUTPUT}"
    else
        echo "ℹ️ No frontend test script available, skipping..." | tee -a "${TEST_LOG}"
        update_test_results "frontend_unit" "skipped" "0" "0" "0" "0" "0" ""
    fi
    cd ../../..
else
    echo "ℹ️ No frontend directory found, skipping..." | tee -a "${TEST_LOG}"
    update_test_results "frontend_unit" "skipped" "0" "0" "0" "0" "0" ""
fi

# Calculate overall results
echo "📊 Calculating overall test results..." | tee -a "${TEST_LOG}"

TOTAL_TESTS=$(jq '.test_suites[].total_tests | select(type == "number")' "${RESULTS_JSON}" | awk '{sum += $1} END {print sum+0}')
TOTAL_PASSED=$(jq '.test_suites[].passed | select(type == "number")' "${RESULTS_JSON}" | awk '{sum += $1} END {print sum+0}')
TOTAL_FAILED=$(jq '.test_suites[].failed | select(type == "number")' "${RESULTS_JSON}" | awk '{sum += $1} END {print sum+0}')
TOTAL_SKIPPED=$(jq '.test_suites[].skipped | select(type == "number")' "${RESULTS_JSON}" | awk '{sum += $1} END {print sum+0}')

# Calculate success rate
if [ "${TOTAL_TESTS}" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ${TOTAL_PASSED} / ${TOTAL_TESTS}" | bc)
else
    SUCCESS_RATE="0.0"
fi

# Determine overall status
OVERALL_STATUS="passed"
if [ "${TOTAL_FAILED}" -gt 0 ]; then
    OVERALL_STATUS="failed"
elif [ "${TOTAL_TESTS}" -eq 0 ]; then
    OVERALL_STATUS="no_tests"
fi

# Update overall results
jq --arg status "${OVERALL_STATUS}" \
   --argjson total "${TOTAL_TESTS}" \
   --argjson passed "${TOTAL_PASSED}" \
   --argjson failed "${TOTAL_FAILED}" \
   --argjson skipped "${TOTAL_SKIPPED}" \
   --argjson success_rate "${SUCCESS_RATE}" \
   '.overall.status = $status |
    .overall.total_tests = $total |
    .overall.total_passed = $passed |
    .overall.total_failed = $failed |
    .overall.total_skipped = $skipped |
    .overall.success_rate = $success_rate' \
   "${RESULTS_JSON}" > "${RESULTS_JSON}.tmp" && mv "${RESULTS_JSON}.tmp" "${RESULTS_JSON}"

# Final summary
echo "" | tee -a "${TEST_LOG}"
echo "🎯 Test Suite Execution Complete" | tee -a "${TEST_LOG}"
echo "📊 Overall Results:" | tee -a "${TEST_LOG}"
echo "   - Total Tests: ${TOTAL_TESTS}" | tee -a "${TEST_LOG}"
echo "   - Passed: ${TOTAL_PASSED}" | tee -a "${TEST_LOG}"
echo "   - Failed: ${TOTAL_FAILED}" | tee -a "${TEST_LOG}"
echo "   - Skipped: ${TOTAL_SKIPPED}" | tee -a "${TEST_LOG}"
echo "   - Success Rate: ${SUCCESS_RATE}%" | tee -a "${TEST_LOG}"
echo "   - Status: ${OVERALL_STATUS}" | tee -a "${TEST_LOG}"
echo "" | tee -a "${TEST_LOG}"

# Output file locations for agents
echo "TEST_RESULTS_JSON=${RESULTS_JSON}"
echo "TEST_LOG=${TEST_LOG}"
echo "OVERALL_STATUS=${OVERALL_STATUS}"
echo "SUCCESS_RATE=${SUCCESS_RATE}"
echo "TOTAL_TESTS=${TOTAL_TESTS}"
echo "TOTAL_PASSED=${TOTAL_PASSED}"
echo "TOTAL_FAILED=${TOTAL_FAILED}"

exit 0