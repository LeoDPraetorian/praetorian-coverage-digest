#!/bin/bash

# analyze-test-patterns.sh  
# Mechanical script to extract test metrics and patterns from codebase
# Used by test-quality-assessor agent for intelligent pattern analysis

set -euo pipefail

FEATURE_ID="${1:-}"
if [ -z "${FEATURE_ID}" ]; then
    echo "Usage: $0 <FEATURE_ID>"
    exit 1
fi

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUTPUT_DIR=".claude/features/${FEATURE_ID}/testing/pattern-analysis"
ANALYSIS_LOG="${OUTPUT_DIR}/pattern-analysis-${TIMESTAMP}.log"
PATTERNS_JSON="${OUTPUT_DIR}/test-patterns-${TIMESTAMP}.json"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize patterns JSON
cat > "${PATTERNS_JSON}" << 'EOF'
{
  "analysis_timestamp": "",
  "feature_id": "",
  "test_patterns": {
    "go_backend_patterns": {
      "status": "not_analyzed",
      "total_test_files": 0,
      "table_driven_tests": 0,
      "benchmark_tests": 0,
      "example_tests": 0,
      "mock_usage": 0,
      "testify_usage": 0,
      "error_handling_tests": 0,
      "concurrent_tests": 0,
      "integration_test_markers": 0,
      "test_helper_functions": 0,
      "anti_patterns": [],
      "quality_score": 0.0
    },
    "frontend_patterns": {
      "status": "not_analyzed", 
      "total_test_files": 0,
      "component_tests": 0,
      "hook_tests": 0,
      "integration_tests": 0,
      "snapshot_tests": 0,
      "mock_usage": 0,
      "accessibility_tests": 0,
      "async_test_patterns": 0,
      "test_utilities": 0,
      "anti_patterns": [],
      "quality_score": 0.0
    },
    "e2e_patterns": {
      "status": "not_analyzed",
      "total_spec_files": 0,
      "page_object_usage": 0,
      "fixture_usage": 0,
      "data_testid_usage": 0,
      "wait_strategies": 0,
      "proper_assertions": 0,
      "test_organization": 0,
      "flaky_test_indicators": 0,
      "anti_patterns": [],
      "quality_score": 0.0
    }
  },
  "maintainability_metrics": {
    "code_duplication": 0.0,
    "test_complexity": 0.0,
    "assertion_quality": 0.0,
    "setup_teardown_patterns": 0.0,
    "naming_conventions": 0.0,
    "overall_maintainability": 0.0
  },
  "recommendations": {
    "pattern_improvements": [],
    "anti_pattern_fixes": [],
    "best_practice_adoption": [],
    "maintainability_improvements": []
  }
}
EOF

# Update initial metadata
jq --arg timestamp "${TIMESTAMP}" \
   --arg feature_id "${FEATURE_ID}" \
   '.analysis_timestamp = $timestamp | .feature_id = $feature_id' \
   "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"

echo "🔍 Starting test pattern analysis for feature: ${FEATURE_ID}" | tee -a "${ANALYSIS_LOG}"
echo "📊 Analysis will be saved to: ${PATTERNS_JSON}" | tee -a "${ANALYSIS_LOG}"
echo "📝 Execution log: ${ANALYSIS_LOG}" | tee -a "${ANALYSIS_LOG}"
echo "" | tee -a "${ANALYSIS_LOG}"

# Function to update pattern results
update_pattern_results() {
    local category="$1"
    local status="$2" 
    local quality_score="$3"
    
    jq --arg category "${category}" \
       --arg status "${status}" \
       --argjson quality "${quality_score}" \
       '.test_patterns[$category].status = $status |
        .test_patterns[$category].quality_score = $quality' \
       "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"
}

# 1. Analyze Go Backend Test Patterns
echo "🔧 Analyzing Go backend test patterns..." | tee -a "${ANALYSIS_LOG}"

GO_TEST_FILES=$(find modules -name "*_test.go" 2>/dev/null | wc -l || echo "0")
if [ "${GO_TEST_FILES}" -gt 0 ]; then
    echo "Found ${GO_TEST_FILES} Go test files, analyzing patterns..." | tee -a "${ANALYSIS_LOG}"
    
    # Count table-driven tests (look for []struct pattern)
    TABLE_DRIVEN=$(find modules -name "*_test.go" -exec grep -l "struct\s*{" {} \; | wc -l || echo "0")
    
    # Count benchmark tests
    BENCHMARK_TESTS=$(find modules -name "*_test.go" -exec grep -l "func.*Benchmark" {} \; | wc -l || echo "0")
    
    # Count example tests
    EXAMPLE_TESTS=$(find modules -name "*_test.go" -exec grep -l "func.*Example" {} \; | wc -l || echo "0")
    
    # Count mock usage (various mock patterns)
    MOCK_USAGE=$(find modules -name "*_test.go" -exec grep -l -E "(mock\.|Mock|testify/mock)" {} \; | wc -l || echo "0")
    
    # Count testify usage
    TESTIFY_USAGE=$(find modules -name "*_test.go" -exec grep -l -E "(assert\.|require\.|github.com/stretchr/testify)" {} \; | wc -l || echo "0")
    
    # Count error handling tests
    ERROR_HANDLING=$(find modules -name "*_test.go" -exec grep -l -E "(t\.Error|t\.Fatal|error.*!=.*nil)" {} \; | wc -l || echo "0")
    
    # Count concurrent tests (t.Parallel usage)
    CONCURRENT_TESTS=$(find modules -name "*_test.go" -exec grep -l "t\.Parallel" {} \; | wc -l || echo "0")
    
    # Count integration test markers
    INTEGRATION_MARKERS=$(find modules -name "*_test.go" -exec grep -l -E "(\+build.*integration|//.*integration)" {} \; | wc -l || echo "0")
    
    # Count helper functions (functions that call t.Helper())
    TEST_HELPERS=$(find modules -name "*_test.go" -exec grep -l "t\.Helper" {} \; | wc -l || echo "0")
    
    # Identify anti-patterns
    GO_ANTI_PATTERNS=()
    
    # Check for sleep usage in tests (anti-pattern)
    SLEEP_USAGE=$(find modules -name "*_test.go" -exec grep -l "time\.Sleep" {} \; | wc -l || echo "0")
    if [ "${SLEEP_USAGE}" -gt 0 ]; then
        GO_ANTI_PATTERNS+=("Found ${SLEEP_USAGE} test files using time.Sleep (flaky test risk)")
    fi
    
    # Check for hardcoded values (potential anti-pattern)
    HARDCODED_URLS=$(find modules -name "*_test.go" -exec grep -l "http://\|https://" {} \; | wc -l || echo "0")
    if [ "${HARDCODED_URLS}" -gt 3 ]; then
        GO_ANTI_PATTERNS+=("Found ${HARDCODED_URLS} test files with hardcoded URLs")
    fi
    
    # Check for missing error checks
    MISSING_ERROR_CHECKS=$(find modules -name "*_test.go" -exec grep -L -E "(err.*!=.*nil|assert.*Error|require.*Error)" {} \; 2>/dev/null | wc -l || echo "0")
    if [ "${MISSING_ERROR_CHECKS}" -gt $((GO_TEST_FILES / 2)) ]; then
        GO_ANTI_PATTERNS+=("${MISSING_ERROR_CHECKS} test files may have insufficient error handling")
    fi
    
    # Calculate Go quality score (0-100)
    GO_QUALITY_FACTORS=(
        "TABLE_DRIVEN:${TABLE_DRIVEN}:10"
        "TESTIFY_USAGE:${TESTIFY_USAGE}:15"  
        "ERROR_HANDLING:${ERROR_HANDLING}:20"
        "MOCK_USAGE:${MOCK_USAGE}:15"
        "CONCURRENT_TESTS:${CONCURRENT_TESTS}:10"
        "TEST_HELPERS:${TEST_HELPERS}:10"
        "BENCHMARK_TESTS:${BENCHMARK_TESTS}:5"
        "INTEGRATION_MARKERS:${INTEGRATION_MARKERS}:10"
        "EXAMPLE_TESTS:${EXAMPLE_TESTS}:5"
    )
    
    GO_QUALITY_SCORE=0
    for factor in "${GO_QUALITY_FACTORS[@]}"; do
        IFS=':' read -r name count weight <<< "${factor}"
        if [ "${count}" -gt 0 ]; then
            if [ "${count}" -ge $((GO_TEST_FILES / 4)) ]; then
                GO_QUALITY_SCORE=$((GO_QUALITY_SCORE + weight))
            else
                GO_QUALITY_SCORE=$((GO_QUALITY_SCORE + weight / 2))
            fi
        fi
    done
    
    # Deduct points for anti-patterns
    ANTI_PATTERN_DEDUCTION=$((${#GO_ANTI_PATTERNS[@]} * 5))
    GO_QUALITY_SCORE=$((GO_QUALITY_SCORE - ANTI_PATTERN_DEDUCTION))
    if [ "${GO_QUALITY_SCORE}" -lt 0 ]; then
        GO_QUALITY_SCORE=0
    fi
    
    echo "✅ Go pattern analysis complete - Quality Score: ${GO_QUALITY_SCORE}/100" | tee -a "${ANALYSIS_LOG}"
    
    # Update JSON with Go patterns
    GO_ANTI_PATTERNS_JSON=$(printf '%s\n' "${GO_ANTI_PATTERNS[@]}" | jq -R . | jq -s .)
    jq --argjson total "${GO_TEST_FILES}" \
       --argjson table_driven "${TABLE_DRIVEN}" \
       --argjson benchmark "${BENCHMARK_TESTS}" \
       --argjson example "${EXAMPLE_TESTS}" \
       --argjson mock "${MOCK_USAGE}" \
       --argjson testify "${TESTIFY_USAGE}" \
       --argjson error_handling "${ERROR_HANDLING}" \
       --argjson concurrent "${CONCURRENT_TESTS}" \
       --argjson integration "${INTEGRATION_MARKERS}" \
       --argjson helpers "${TEST_HELPERS}" \
       --argjson quality "${GO_QUALITY_SCORE}" \
       --argjson anti_patterns "${GO_ANTI_PATTERNS_JSON}" \
       '.test_patterns.go_backend_patterns.status = "analyzed" |
        .test_patterns.go_backend_patterns.total_test_files = $total |
        .test_patterns.go_backend_patterns.table_driven_tests = $table_driven |
        .test_patterns.go_backend_patterns.benchmark_tests = $benchmark |
        .test_patterns.go_backend_patterns.example_tests = $example |
        .test_patterns.go_backend_patterns.mock_usage = $mock |
        .test_patterns.go_backend_patterns.testify_usage = $testify |
        .test_patterns.go_backend_patterns.error_handling_tests = $error_handling |
        .test_patterns.go_backend_patterns.concurrent_tests = $concurrent |
        .test_patterns.go_backend_patterns.integration_test_markers = $integration |
        .test_patterns.go_backend_patterns.test_helper_functions = $helpers |
        .test_patterns.go_backend_patterns.quality_score = $quality |
        .test_patterns.go_backend_patterns.anti_patterns = $anti_patterns' \
       "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"
else
    echo "ℹ️ No Go test files found, skipping pattern analysis..." | tee -a "${ANALYSIS_LOG}"
    update_pattern_results "go_backend_patterns" "skipped" "0"
fi

# 2. Analyze Frontend Test Patterns
echo "⚛️ Analyzing frontend test patterns..." | tee -a "${ANALYSIS_LOG}"

FRONTEND_TEST_FILES=$(find modules -path "*/node_modules" -prune -o -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | grep -v node_modules | wc -l || echo "0")
if [ "${FRONTEND_TEST_FILES}" -gt 0 ]; then
    echo "Found ${FRONTEND_TEST_FILES} frontend test files, analyzing patterns..." | tee -a "${ANALYSIS_LOG}"
    
    # Count component tests (React Testing Library patterns)
    COMPONENT_TESTS=$(find modules -path "*/node_modules" -prune -o -name "*.test.tsx" -exec grep -l -E "(render|screen\.|fireEvent)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count hook tests
    HOOK_TESTS=$(find modules -path "*/node_modules" -prune -o -name "*.test.ts" -name "*.test.tsx" -exec grep -l -E "(renderHook|act\()" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count integration tests
    INTEGRATION_TESTS=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(integration|MSW|Mock)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count snapshot tests  
    SNAPSHOT_TESTS=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l "toMatchSnapshot" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count mock usage
    FRONTEND_MOCK_USAGE=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(jest\.mock|vi\.mock|mockFn)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count accessibility tests
    ACCESSIBILITY_TESTS=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(toBeAccessible|axe|a11y)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count async test patterns
    ASYNC_PATTERNS=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(waitFor|findBy|async.*test)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Count test utilities
    TEST_UTILITIES=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(test.*util|helper.*test|setup.*test)" {} \; | grep -v node_modules | wc -l || echo "0")
    
    # Identify frontend anti-patterns
    FRONTEND_ANTI_PATTERNS=()
    
    # Check for setTimeout in tests
    FRONTEND_TIMEOUT=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l "setTimeout" {} \; | grep -v node_modules | wc -l || echo "0")
    if [ "${FRONTEND_TIMEOUT}" -gt 0 ]; then
        FRONTEND_ANTI_PATTERNS+=("Found ${FRONTEND_TIMEOUT} test files using setTimeout (flaky test risk)")
    fi
    
    # Check for direct DOM queries instead of Testing Library
    DIRECT_DOM=$(find modules -path "*/node_modules" -prune -o -name "*.test.*" -exec grep -l -E "(document\.querySelector|getElementById)" {} \; | grep -v node_modules | wc -l || echo "0")
    if [ "${DIRECT_DOM}" -gt 0 ]; then
        FRONTEND_ANTI_PATTERNS+=("Found ${DIRECT_DOM} test files using direct DOM queries (prefer Testing Library)")
    fi
    
    # Calculate frontend quality score
    FRONTEND_QUALITY_FACTORS=(
        "COMPONENT_TESTS:${COMPONENT_TESTS}:25"
        "ASYNC_PATTERNS:${ASYNC_PATTERNS}:20"
        "HOOK_TESTS:${HOOK_TESTS}:15"
        "FRONTEND_MOCK_USAGE:${FRONTEND_MOCK_USAGE}:15"
        "INTEGRATION_TESTS:${INTEGRATION_TESTS}:10"
        "ACCESSIBILITY_TESTS:${ACCESSIBILITY_TESTS}:10"
        "TEST_UTILITIES:${TEST_UTILITIES}:5"
    )
    
    FRONTEND_QUALITY_SCORE=0
    for factor in "${FRONTEND_QUALITY_FACTORS[@]}"; do
        IFS=':' read -r name count weight <<< "${factor}"
        if [ "${count}" -gt 0 ]; then
            if [ "${count}" -ge $((FRONTEND_TEST_FILES / 3)) ]; then
                FRONTEND_QUALITY_SCORE=$((FRONTEND_QUALITY_SCORE + weight))
            else
                FRONTEND_QUALITY_SCORE=$((FRONTEND_QUALITY_SCORE + weight / 2))
            fi
        fi
    done
    
    # Deduct for anti-patterns
    FRONTEND_ANTI_DEDUCTION=$((${#FRONTEND_ANTI_PATTERNS[@]} * 10))
    FRONTEND_QUALITY_SCORE=$((FRONTEND_QUALITY_SCORE - FRONTEND_ANTI_DEDUCTION))
    if [ "${FRONTEND_QUALITY_SCORE}" -lt 0 ]; then
        FRONTEND_QUALITY_SCORE=0
    fi
    
    echo "✅ Frontend pattern analysis complete - Quality Score: ${FRONTEND_QUALITY_SCORE}/100" | tee -a "${ANALYSIS_LOG}"
    
    # Update JSON with frontend patterns
    FRONTEND_ANTI_PATTERNS_JSON=$(printf '%s\n' "${FRONTEND_ANTI_PATTERNS[@]}" | jq -R . | jq -s .)
    jq --argjson total "${FRONTEND_TEST_FILES}" \
       --argjson component "${COMPONENT_TESTS}" \
       --argjson hook "${HOOK_TESTS}" \
       --argjson integration "${INTEGRATION_TESTS}" \
       --argjson snapshot "${SNAPSHOT_TESTS}" \
       --argjson mock "${FRONTEND_MOCK_USAGE}" \
       --argjson accessibility "${ACCESSIBILITY_TESTS}" \
       --argjson async "${ASYNC_PATTERNS}" \
       --argjson utilities "${TEST_UTILITIES}" \
       --argjson quality "${FRONTEND_QUALITY_SCORE}" \
       --argjson anti_patterns "${FRONTEND_ANTI_PATTERNS_JSON}" \
       '.test_patterns.frontend_patterns.status = "analyzed" |
        .test_patterns.frontend_patterns.total_test_files = $total |
        .test_patterns.frontend_patterns.component_tests = $component |
        .test_patterns.frontend_patterns.hook_tests = $hook |
        .test_patterns.frontend_patterns.integration_tests = $integration |
        .test_patterns.frontend_patterns.snapshot_tests = $snapshot |
        .test_patterns.frontend_patterns.mock_usage = $mock |
        .test_patterns.frontend_patterns.accessibility_tests = $accessibility |
        .test_patterns.frontend_patterns.async_test_patterns = $async |
        .test_patterns.frontend_patterns.test_utilities = $utilities |
        .test_patterns.frontend_patterns.quality_score = $quality |
        .test_patterns.frontend_patterns.anti_patterns = $anti_patterns' \
       "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"
else
    echo "ℹ️ No frontend test files found, skipping pattern analysis..." | tee -a "${ANALYSIS_LOG}"
    update_pattern_results "frontend_patterns" "skipped" "0"
fi

# 3. Analyze E2E Test Patterns
echo "🎭 Analyzing E2E test patterns..." | tee -a "${ANALYSIS_LOG}"

E2E_SPEC_FILES=$(find modules -path "*/e2e/src/tests" -name "*.spec.ts" 2>/dev/null | wc -l || echo "0")
if [ "${E2E_SPEC_FILES}" -gt 0 ]; then
    echo "Found ${E2E_SPEC_FILES} E2E spec files, analyzing patterns..." | tee -a "${ANALYSIS_LOG}"
    
    # Count page object usage
    PAGE_OBJECT_USAGE=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l -E "(new.*Page|Page\.|\.page\.)" {} \; | wc -l || echo "0")
    
    # Count fixture usage  
    FIXTURE_USAGE=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l -E "(fixtures\.|user_tests\.)" {} \; | wc -l || echo "0")
    
    # Count data-testid usage (good practice)
    DATA_TESTID_USAGE=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l "data-testid" {} \; | wc -l || echo "0")
    
    # Count proper wait strategies
    WAIT_STRATEGIES=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l -E "(waitFor|toBeVisible|waitForAllLoader)" {} \; | wc -l || echo "0")
    
    # Count proper assertions
    PROPER_ASSERTIONS=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l -E "(expect.*toBe|expect.*toHave|expect.*toContain)" {} \; | wc -l || echo "0")
    
    # Check test organization (describe blocks)
    TEST_ORGANIZATION=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l "describe\|test\|it" {} \; | wc -l || echo "0")
    
    # Identify flaky test indicators
    FLAKY_INDICATORS=0
    TIMEOUT_USAGE=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l "setTimeout\|page\.waitForTimeout" {} \; | wc -l || echo "0")
    FLAKY_INDICATORS=$((FLAKY_INDICATORS + TIMEOUT_USAGE))
    
    # E2E anti-patterns
    E2E_ANTI_PATTERNS=()
    
    if [ "${TIMEOUT_USAGE}" -gt 0 ]; then
        E2E_ANTI_PATTERNS+=("Found ${TIMEOUT_USAGE} spec files using timeouts (potential flakiness)")
    fi
    
    # Check for CSS selectors instead of data-testid
    CSS_SELECTORS=$(find modules -path "*/e2e/src" -name "*.spec.ts" -exec grep -l -E "querySelector.*\[.*\]|\\.css-|\\#[a-zA-Z]" {} \; | wc -l || echo "0")
    if [ "${CSS_SELECTORS}" -gt $((E2E_SPEC_FILES / 2)) ]; then
        E2E_ANTI_PATTERNS+=("Many tests use CSS selectors instead of data-testid (${CSS_SELECTORS} files)")
    fi
    
    # Calculate E2E quality score
    E2E_QUALITY_FACTORS=(
        "PAGE_OBJECT_USAGE:${PAGE_OBJECT_USAGE}:20"
        "FIXTURE_USAGE:${FIXTURE_USAGE}:15"
        "DATA_TESTID_USAGE:${DATA_TESTID_USAGE}:20"
        "WAIT_STRATEGIES:${WAIT_STRATEGIES}:20"
        "PROPER_ASSERTIONS:${PROPER_ASSERTIONS}:15"
        "TEST_ORGANIZATION:${TEST_ORGANIZATION}:10"
    )
    
    E2E_QUALITY_SCORE=0
    for factor in "${E2E_QUALITY_FACTORS[@]}"; do
        IFS=':' read -r name count weight <<< "${factor}"
        if [ "${count}" -gt 0 ]; then
            if [ "${count}" -ge $((E2E_SPEC_FILES / 2)) ]; then
                E2E_QUALITY_SCORE=$((E2E_QUALITY_SCORE + weight))
            else
                E2E_QUALITY_SCORE=$((E2E_QUALITY_SCORE + weight / 2))
            fi
        fi
    done
    
    # Deduct for anti-patterns and flaky indicators
    E2E_ANTI_DEDUCTION=$((${#E2E_ANTI_PATTERNS[@]} * 15 + FLAKY_INDICATORS * 5))
    E2E_QUALITY_SCORE=$((E2E_QUALITY_SCORE - E2E_ANTI_DEDUCTION))
    if [ "${E2E_QUALITY_SCORE}" -lt 0 ]; then
        E2E_QUALITY_SCORE=0
    fi
    
    echo "✅ E2E pattern analysis complete - Quality Score: ${E2E_QUALITY_SCORE}/100" | tee -a "${ANALYSIS_LOG}"
    
    # Update JSON with E2E patterns
    E2E_ANTI_PATTERNS_JSON=$(printf '%s\n' "${E2E_ANTI_PATTERNS[@]}" | jq -R . | jq -s .)
    jq --argjson total "${E2E_SPEC_FILES}" \
       --argjson page_object "${PAGE_OBJECT_USAGE}" \
       --argjson fixture "${FIXTURE_USAGE}" \
       --argjson data_testid "${DATA_TESTID_USAGE}" \
       --argjson wait_strategies "${WAIT_STRATEGIES}" \
       --argjson assertions "${PROPER_ASSERTIONS}" \
       --argjson organization "${TEST_ORGANIZATION}" \
       --argjson flaky "${FLAKY_INDICATORS}" \
       --argjson quality "${E2E_QUALITY_SCORE}" \
       --argjson anti_patterns "${E2E_ANTI_PATTERNS_JSON}" \
       '.test_patterns.e2e_patterns.status = "analyzed" |
        .test_patterns.e2e_patterns.total_spec_files = $total |
        .test_patterns.e2e_patterns.page_object_usage = $page_object |
        .test_patterns.e2e_patterns.fixture_usage = $fixture |
        .test_patterns.e2e_patterns.data_testid_usage = $data_testid |
        .test_patterns.e2e_patterns.wait_strategies = $wait_strategies |
        .test_patterns.e2e_patterns.proper_assertions = $assertions |
        .test_patterns.e2e_patterns.test_organization = $organization |
        .test_patterns.e2e_patterns.flaky_test_indicators = $flaky |
        .test_patterns.e2e_patterns.quality_score = $quality |
        .test_patterns.e2e_patterns.anti_patterns = $anti_patterns' \
       "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"
else
    echo "ℹ️ No E2E spec files found, skipping pattern analysis..." | tee -a "${ANALYSIS_LOG}"
    update_pattern_results "e2e_patterns" "skipped" "0"
fi

# 4. Calculate Overall Maintainability Metrics
echo "🔧 Calculating maintainability metrics..." | tee -a "${ANALYSIS_LOG}"

# Extract quality scores for weighted average
GO_QUAL=$(jq -r '.test_patterns.go_backend_patterns.quality_score // 0' "${PATTERNS_JSON}")
FRONTEND_QUAL=$(jq -r '.test_patterns.frontend_patterns.quality_score // 0' "${PATTERNS_JSON}")
E2E_QUAL=$(jq -r '.test_patterns.e2e_patterns.quality_score // 0' "${PATTERNS_JSON}")

# Calculate overall maintainability (weighted by importance and existence)
OVERALL_MAINTAINABILITY=0
WEIGHT_COUNT=0

if [ "${GO_QUAL}" -gt 0 ]; then
    OVERALL_MAINTAINABILITY=$(echo "scale=2; ${OVERALL_MAINTAINABILITY} + ${GO_QUAL} * 0.4" | bc)
    WEIGHT_COUNT=$(echo "scale=2; ${WEIGHT_COUNT} + 0.4" | bc)
fi

if [ "${FRONTEND_QUAL}" -gt 0 ]; then
    OVERALL_MAINTAINABILITY=$(echo "scale=2; ${OVERALL_MAINTAINABILITY} + ${FRONTEND_QUAL} * 0.3" | bc)
    WEIGHT_COUNT=$(echo "scale=2; ${WEIGHT_COUNT} + 0.3" | bc)
fi

if [ "${E2E_QUAL}" -gt 0 ]; then
    OVERALL_MAINTAINABILITY=$(echo "scale=2; ${OVERALL_MAINTAINABILITY} + ${E2E_QUAL} * 0.3" | bc)
    WEIGHT_COUNT=$(echo "scale=2; ${WEIGHT_COUNT} + 0.3" | bc)
fi

if (( $(echo "${WEIGHT_COUNT} > 0" | bc -l) )); then
    OVERALL_MAINTAINABILITY=$(echo "scale=2; ${OVERALL_MAINTAINABILITY} / ${WEIGHT_COUNT}" | bc)
else
    OVERALL_MAINTAINABILITY="0.0"
fi

# Generate recommendations
RECOMMENDATIONS=()
ANTI_PATTERN_FIXES=()
BEST_PRACTICES=()
MAINTAINABILITY_IMPROVEMENTS=()

# Go recommendations
if [ "${GO_QUAL}" -lt 70 ]; then
    RECOMMENDATIONS+=("Go test quality (${GO_QUAL}/100) needs improvement")
    BEST_PRACTICES+=("Adopt more table-driven tests in Go")
    BEST_PRACTICES+=("Increase testify/assert usage for better assertions")
fi

# Frontend recommendations  
if [ "${FRONTEND_QUAL}" -lt 70 ]; then
    RECOMMENDATIONS+=("Frontend test quality (${FRONTEND_QUAL}/100) needs improvement")
    BEST_PRACTICES+=("Add more component tests with React Testing Library")
    BEST_PRACTICES+=("Implement proper async testing patterns")
fi

# E2E recommendations
if [ "${E2E_QUAL}" -lt 70 ]; then
    RECOMMENDATIONS+=("E2E test quality (${E2E_QUAL}/100) needs improvement")  
    BEST_PRACTICES+=("Use data-testid selectors instead of CSS selectors")
    BEST_PRACTICES+=("Implement page object pattern consistently")
fi

# Update final metrics
RECOMMENDATIONS_JSON=$(printf '%s\n' "${RECOMMENDATIONS[@]}" | jq -R . | jq -s .)
ANTI_PATTERN_JSON=$(printf '%s\n' "${ANTI_PATTERN_FIXES[@]}" | jq -R . | jq -s .)
BEST_PRACTICES_JSON=$(printf '%s\n' "${BEST_PRACTICES[@]}" | jq -R . | jq -s .)
MAINTAINABILITY_JSON=$(printf '%s\n' "${MAINTAINABILITY_IMPROVEMENTS[@]}" | jq -R . | jq -s .)

jq --argjson overall_maint "${OVERALL_MAINTAINABILITY}" \
   --argjson recommendations "${RECOMMENDATIONS_JSON}" \
   --argjson anti_fixes "${ANTI_PATTERN_JSON}" \
   --argjson best_practices "${BEST_PRACTICES_JSON}" \
   --argjson maint_improvements "${MAINTAINABILITY_JSON}" \
   '.maintainability_metrics.overall_maintainability = $overall_maint |
    .recommendations.pattern_improvements = $recommendations |
    .recommendations.anti_pattern_fixes = $anti_fixes |
    .recommendations.best_practice_adoption = $best_practices |
    .recommendations.maintainability_improvements = $maint_improvements' \
   "${PATTERNS_JSON}" > "${PATTERNS_JSON}.tmp" && mv "${PATTERNS_JSON}.tmp" "${PATTERNS_JSON}"

# Final summary
echo "" | tee -a "${ANALYSIS_LOG}"
echo "🎯 Test Pattern Analysis Complete" | tee -a "${ANALYSIS_LOG}"
echo "📊 Quality Scores:" | tee -a "${ANALYSIS_LOG}"
echo "   - Go Backend: ${GO_QUAL}/100" | tee -a "${ANALYSIS_LOG}"
echo "   - Frontend: ${FRONTEND_QUAL}/100" | tee -a "${ANALYSIS_LOG}"
echo "   - E2E Tests: ${E2E_QUAL}/100" | tee -a "${ANALYSIS_LOG}"
echo "   - Overall Maintainability: ${OVERALL_MAINTAINABILITY}/100" | tee -a "${ANALYSIS_LOG}"
echo "" | tee -a "${ANALYSIS_LOG}"

# Output file locations for agents
echo "PATTERNS_ANALYSIS_JSON=${PATTERNS_JSON}"
echo "ANALYSIS_LOG=${ANALYSIS_LOG}"
echo "GO_QUALITY_SCORE=${GO_QUAL}"
echo "FRONTEND_QUALITY_SCORE=${FRONTEND_QUAL}"
echo "E2E_QUALITY_SCORE=${E2E_QUAL}"
echo "OVERALL_MAINTAINABILITY=${OVERALL_MAINTAINABILITY}"
echo "OUTPUT_DIR=${OUTPUT_DIR}"

exit 0