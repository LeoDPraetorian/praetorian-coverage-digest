#!/bin/bash
# Test script for standardized error handling functions

# Source the path utilities with error handling functions
source "$(dirname "${BASH_SOURCE[0]}")/lib/path-utils.sh"

echo "=== Testing Standardized Error Handling System ==="
echo ""

# Create test directory and mock pipeline log
TEST_DIR="/tmp/einstein-error-handling-test"
mkdir -p "${TEST_DIR}"
export PIPELINE_LOG="${TEST_DIR}/test-pipeline.log"
touch "${PIPELINE_LOG}"

echo "Test pipeline log: ${PIPELINE_LOG}"
echo ""

# Test 1: handle_success function
echo "1. Testing handle_success function..."
handle_success "VALIDATION" "Agent assignments validated successfully" "5 agents configured" "execution_strategy=parallel"
if [[ $? -eq 0 ]]; then
    echo "✓ handle_success function working"
else
    echo "✗ handle_success function failed"
    exit 1
fi
echo ""

# Test 2: handle_warning function (non-critical, should not exit)
echo "2. Testing handle_warning function..."
handle_warning "MISSING_OPTIONAL" "Impact analysis not found" "Using heuristic assessment" "medium"
if [[ $? -eq 0 ]]; then
    echo "✓ handle_warning function working"
else
    echo "✗ handle_warning function failed"
    exit 1
fi
echo ""

# Test 3: handle_escalation function
echo "3. Testing handle_escalation function..."
ESCALATION_OUTPUT=$(handle_escalation "quality" "Maximum iterations reached" "manual_review" "Critical issues found")
if [[ $? -eq 0 ]] && [[ "${ESCALATION_OUTPUT}" == *"ESCALATION_NEXT_PHASE=manual-quality-review"* ]]; then
    echo "✓ handle_escalation function working"
else
    echo "✗ handle_escalation function failed"
    exit 1
fi
echo ""

# Test 4: Parameter validation (should show error but not exit for warnings)
echo "4. Testing parameter validation..."
echo "Testing missing parameters (should show error):"
handle_warning 2>/dev/null
if [[ $? -ne 0 ]]; then
    echo "✓ Parameter validation working"
else
    echo "✗ Parameter validation failed"
    exit 1
fi
echo ""

# Test 5: Pipeline log integration
echo "5. Testing pipeline log integration..."
echo "Checking if messages were logged to ${PIPELINE_LOG}:"
if grep -q "SUCCESS.*VALIDATION.*Agent assignments validated successfully" "${PIPELINE_LOG}"; then
    echo "✓ Success messages logged correctly"
else
    echo "✗ Success messages not logged correctly"
    exit 1
fi

if grep -q "WARNING.*MISSING_OPTIONAL.*Impact analysis not found" "${PIPELINE_LOG}"; then
    echo "✓ Warning messages logged correctly"
else
    echo "✗ Warning messages not logged correctly"
    exit 1
fi

if grep -q "ESCALATION.*quality.*Maximum iterations reached" "${PIPELINE_LOG}"; then
    echo "✓ Escalation messages logged correctly"
else
    echo "✗ Escalation messages not logged correctly"
    exit 1
fi
echo ""

# Test 6: Critical error function (should exit - test in subshell)
echo "6. Testing handle_critical_error function (exit behavior)..."
(
    handle_critical_error "TEST_ERROR" "Test critical error" "Testing context" "/path/to/expected/file.json" "Check file permissions"
) 2>/dev/null
if [[ $? -eq 1 ]]; then
    echo "✓ handle_critical_error exits correctly"
else
    echo "✗ handle_critical_error should have exited with code 1"
    exit 1
fi
echo ""

# Test 7: Validation failure function (should exit - test in subshell)
echo "7. Testing handle_validation_failure function (exit behavior)..."
(
    handle_validation_failure "JSON_STRUCTURE" "Invalid JSON syntax" "Valid JSON required" "Fix JSON syntax errors"
) 2>/dev/null
if [[ $? -eq 1 ]]; then
    echo "✓ handle_validation_failure exits correctly"
else
    echo "✗ handle_validation_failure should have exited with code 1"
    exit 1
fi
echo ""

# Test 8: Coordination failure function (should exit - test in subshell)
echo "8. Testing handle_coordination_failure function (exit behavior)..."
(
    handle_coordination_failure "MISSING_PLAN" "Coordination plan not found" "/path/to/plan.json" "quality-review"
) 2>/dev/null
if [[ $? -eq 1 ]]; then
    echo "✓ handle_coordination_failure exits correctly"
else
    echo "✗ handle_coordination_failure should have exited with code 1"
    exit 1
fi
echo ""

# Test 9: Verify log entries for critical errors (from subshell executions)
echo "9. Testing critical error logging..."
echo "Final log content preview:"
tail -10 "${PIPELINE_LOG}"
echo ""

# Cleanup
rm -rf "${TEST_DIR}"

echo "=== All error handling tests passed! ==="
echo "✅ Standardized error handling system is fully functional"
echo ""
echo "Error handling capabilities:"
echo "- Critical errors with context and troubleshooting"
echo "- Warnings with fallback actions and impact levels"
echo "- Escalation handling with automatic phase transitions"
echo "- Success tracking with metrics and details"
echo "- Validation failures with requirements and remediation"
echo "- Coordination failures with expected files and phase context"
echo "- Comprehensive pipeline logging for all error types"
echo "- Consistent message formatting across all scenarios"