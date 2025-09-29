#!/bin/bash
# Test script for central file path system

# Source the path utilities
source "$(dirname "${BASH_SOURCE[0]}")/lib/path-utils.sh"

echo "=== Testing Central File Path System ==="
echo ""

# Test 1: Environment validation
echo "1. Testing environment validation..."
if validate_environment "setup"; then
    echo "✓ Environment validation passed"
else
    echo "✗ Environment validation failed"
    exit 1
fi
echo ""

# Test 2: Path construction
echo "2. Testing path construction..."
TEST_FEATURE_ID="test-feature-$(date +%s)"

# Test feature path construction
echo "Testing feature paths:"
echo "  Requirements: $(get_feature_path "${TEST_FEATURE_ID}" "requirements")"
echo "  Knowledge base: $(get_feature_path "${TEST_FEATURE_ID}" "knowledge_base")"
echo "  Implementation plan: $(get_feature_path "${TEST_FEATURE_ID}" "implementation_plan")"

# Test script path construction  
echo "Testing script paths:"
echo "  Initialize pipeline: $(get_script_path "initialize_pipeline")"
echo "  Complete phase: $(get_script_path "complete_phase")"

# Test Jira path construction
echo "Testing Jira paths:"
echo "  Enhanced content: $(get_jira_path "${TEST_FEATURE_ID}" "jira_enhanced_content")"
echo ""

# Test 3: List available path keys
echo "3. Available path keys:"
list_path_keys "feature" | head -10
echo ""

# Test 4: Create test workspace
echo "4. Creating test workspace..."
if create_feature_workspace "${TEST_FEATURE_ID}"; then
    echo "✓ Test workspace created successfully"
else
    echo "✗ Failed to create test workspace"
    exit 1
fi
echo ""

# Test 5: Directory creation
echo "5. Testing directory creation..."
RESEARCH_DIR=$(ensure_feature_dir "${TEST_FEATURE_ID}" "research_dir" true)
if [[ -d "${RESEARCH_DIR}" ]]; then
    echo "✓ Research directory created: ${RESEARCH_DIR}"
else
    echo "✗ Failed to create research directory"
    exit 1
fi
echo ""

# Test 6: Path validation (should fail for non-existent files)
echo "6. Testing path validation..."
echo "Testing with non-existent files (should fail):"
if validate_required_paths "${TEST_FEATURE_ID}" "requirements" "knowledge_base" 2>/dev/null; then
    echo "✗ Validation should have failed for non-existent files"
else
    echo "✓ Correctly detected missing files"
fi

# Create a test file and try again
TEST_REQ_FILE=$(get_feature_path "${TEST_FEATURE_ID}" "requirements")
mkdir -p "$(dirname "${TEST_REQ_FILE}")"
echo '{"test": true}' > "${TEST_REQ_FILE}"

echo "Testing with existing file:"
if validate_required_paths "${TEST_FEATURE_ID}" "requirements"; then
    echo "✓ Validation passed for existing file"
else
    echo "✗ Validation failed for existing file"
    exit 1
fi
echo ""

# Test 7: Pipeline log path
echo "7. Testing pipeline log path..."
LOG_PATH=$(get_pipeline_log "${TEST_FEATURE_ID}")
echo "Pipeline log path: ${LOG_PATH}"
echo ""

# Test 8: Error handling
echo "8. Testing error handling..."
echo "Testing invalid path key (should fail):"
if get_feature_path "${TEST_FEATURE_ID}" "invalid_key" 2>/dev/null; then
    echo "✗ Should have failed for invalid key"
else
    echo "✓ Correctly handled invalid path key"
fi

echo "Testing missing feature ID (should fail):"
if get_feature_path "" "requirements" 2>/dev/null; then
    echo "✗ Should have failed for missing feature ID"  
else
    echo "✓ Correctly handled missing feature ID"
fi
echo ""

# Cleanup
echo "9. Cleaning up test workspace..."
rm -rf ".claude/features/${TEST_FEATURE_ID}"
if [[ ! -d ".claude/features/${TEST_FEATURE_ID}" ]]; then
    echo "✓ Test workspace cleaned up"
else
    echo "✗ Failed to clean up test workspace"
fi
echo ""

echo "=== All tests completed successfully! ==="
print_environment_info