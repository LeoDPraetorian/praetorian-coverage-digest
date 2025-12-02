#!/bin/bash
#
# validate-integration.sh - Validates Chariot integration implementation completeness
#
# Usage: ./validate-integration.sh <integration-name>
#
# Checks:
# 1. Frontend enum registration
# 2. Backend struct existence
# 3. Name() function presence
# 4. Test file existence
# 5. Invoke() method signature
# 6. Error handling patterns
# 7. Tabularium usage
# 8. Logging statements
#
# Exit codes:
#   0 - All checks passed
#   1 - Some checks failed
#   2 - Invalid usage

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

usage() {
  cat <<EOF
Usage: $0 <integration-name>

Validates Chariot integration implementation completeness.

Example:
  $0 github        # Validates GitHub integration
  $0 crowdstrike   # Validates CrowdStrike integration

Checks performed:
  1. Frontend enum registration
  2. Backend capability struct
  3. Name() function
  4. Test coverage
  5. Invoke() implementation
  6. Error handling
  7. Tabularium mapping
  8. Logging

Exit codes:
  0 - All checks passed (PASS)
  1 - Some checks failed (FAIL)
  2 - Invalid usage
EOF
}

check() {
  local name="$1"
  local command="$2"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗${NC} $name ${RED}(FAILED)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

check_with_output() {
  local name="$1"
  local command="$2"
  local hint="$3"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗${NC} $name ${RED}(FAILED)${NC}"
    if [ -n "$hint" ]; then
      echo -e "  ${YELLOW}Hint:${NC} $hint"
    fi
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

validate_integration() {
  local integration_name="$1"
  local integration_pascal=$(echo "$integration_name" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g' | sed 's/ //g')
  local integration_snake=$(echo "$integration_name" | tr '-' '_')

  echo -e "${BLUE}Validating integration:${NC} $integration_name"
  echo ""

  # === FRONTEND CHECKS ===
  echo -e "${YELLOW}Frontend Checks${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  check_with_output "Frontend enum defined" \
    "grep -q \"${integration_name^^}\" modules/chariot/ui/src/types/integrations.ts 2>/dev/null || \
     grep -q \"${integration_pascal}\" modules/chariot/ui/src/types/integrations.ts 2>/dev/null" \
    "Add enum to ui/src/types/integrations.ts"

  check_with_output "Integration card component exists" \
    "find modules/chariot/ui/src/sections/settings/integrations -name \"*${integration_pascal}*.tsx\" | grep -q ." \
    "Create ui/src/sections/settings/integrations/${integration_pascal}Card.tsx"

  check_with_output "Card imported in index" \
    "grep -q \"${integration_pascal}\" modules/chariot/ui/src/sections/settings/integrations/index.tsx 2>/dev/null" \
    "Import card in ui/src/sections/settings/integrations/index.tsx"

  echo ""

  # === BACKEND CHECKS ===
  echo -e "${YELLOW}Backend Checks${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Find capability file
  CAPABILITY_FILE=$(find modules/chariot/backend/pkg/capabilities -name "*${integration_snake}*.go" 2>/dev/null | head -1)

  if [ -z "$CAPABILITY_FILE" ]; then
    CAPABILITY_FILE=$(find modules/janus/pkg/capabilities -name "*${integration_snake}*.go" 2>/dev/null | head -1)
  fi

  if [ -z "$CAPABILITY_FILE" ]; then
    echo -e "${RED}✗${NC} Backend capability file ${RED}(NOT FOUND)${NC}"
    echo -e "  ${YELLOW}Hint:${NC} Create backend/pkg/capabilities/${integration_snake}.go"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 7))
    FAILED_CHECKS=$((FAILED_CHECKS + 7))
  else
    echo -e "${GREEN}Found:${NC} $CAPABILITY_FILE"
    echo ""

    check_with_output "Struct implements interface" \
      "grep -q \"type ${integration_pascal} struct\" \"$CAPABILITY_FILE\"" \
      "Define type ${integration_pascal} struct { ... }"

    check_with_output "Name() function exists" \
      "grep -q \"func.*Name.*string\" \"$CAPABILITY_FILE\"" \
      "Implement Name() string method"

    check_with_output "Constructor function exists" \
      "grep -q \"func New${integration_pascal}\" \"$CAPABILITY_FILE\"" \
      "Create constructor func New${integration_pascal}(...) (*${integration_pascal}, error)"

    check_with_output "Credential validation" \
      "grep -q \"validate:\" \"$CAPABILITY_FILE\" || grep -q \"APIKey.*SecretKey\" \"$CAPABILITY_FILE\"" \
      "Add credential validation with struct tags or validation logic"

    check_with_output "Invoke() method exists" \
      "grep -q \"func.*Invoke.*context.Context\" \"$CAPABILITY_FILE\"" \
      "Implement Invoke(ctx context.Context) error method"

    check_with_output "Error wrapping used" \
      "grep -q \"fmt.Errorf.*%w\" \"$CAPABILITY_FILE\"" \
      "Wrap errors with fmt.Errorf(\"context: %w\", err)"

    check_with_output "Tabularium usage" \
      "grep -qE \"(Asset|Attribute|Risk)\" \"$CAPABILITY_FILE\"" \
      "Create tabularium entities (Asset, Attribute, or Risk)"
  fi

  echo ""

  # === TEST CHECKS ===
  echo -e "${YELLOW}Test Checks${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  TEST_FILE=$(find modules/chariot/backend/pkg/capabilities -name "*${integration_snake}*_test.go" 2>/dev/null | head -1)

  if [ -z "$TEST_FILE" ]; then
    TEST_FILE=$(find modules/janus/pkg/capabilities -name "*${integration_snake}*_test.go" 2>/dev/null | head -1)
  fi

  if [ -z "$TEST_FILE" ]; then
    echo -e "${RED}✗${NC} Test file ${RED}(NOT FOUND)${NC}"
    echo -e "  ${YELLOW}Hint:${NC} Create ${CAPABILITY_FILE/_test.go/.go}_test.go"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
    FAILED_CHECKS=$((FAILED_CHECKS + 2))
  else
    echo -e "${GREEN}Found:${NC} $TEST_FILE"
    echo ""

    check_with_output "Unit tests exist" \
      "grep -q \"func Test\" \"$TEST_FILE\"" \
      "Add test functions: func TestYourIntegration_MethodName(t *testing.T)"

    check_with_output "Table-driven tests" \
      "grep -q \"tests := \\[\\]struct\" \"$TEST_FILE\" || grep -q \"testCases :=\" \"$TEST_FILE\"" \
      "Use table-driven tests for multiple scenarios"
  fi

  echo ""

  # === OBSERVABILITY CHECKS ===
  echo -e "${YELLOW}Observability Checks${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -n "$CAPABILITY_FILE" ]; then
    check_with_output "Logging implemented" \
      "grep -qE \"(log\\.Info|log\\.Error|log\\.Debug|log\\.Warn)\" \"$CAPABILITY_FILE\" || \
       grep -qE \"(logger\\.Info|logger\\.Error|logger\\.Debug|logger\\.Warn)\" \"$CAPABILITY_FILE\"" \
      "Add logging: log.Info/Error/Debug for observability"

    check_with_output "Context propagation" \
      "grep -q \"ctx context.Context\" \"$CAPABILITY_FILE\"" \
      "Pass context.Context for cancellation and timeouts"
  else
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
    FAILED_CHECKS=$((FAILED_CHECKS + 2))
    echo -e "${RED}✗${NC} Logging ${RED}(SKIPPED - no capability file)${NC}"
    echo -e "${RED}✗${NC} Context propagation ${RED}(SKIPPED - no capability file)${NC}"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # === SUMMARY ===
  if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} - All checks passed ($PASSED_CHECKS/$TOTAL_CHECKS)"
    echo ""
    echo -e "${GREEN}Integration is complete and ready for deployment!${NC}"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} - $FAILED_CHECKS check(s) failed ($PASSED_CHECKS/$TOTAL_CHECKS passed)"
    echo ""
    echo "Fix the failed checks above before deployment."
    echo ""
    echo "Common issues:"
    echo "  - Frontend enum not registered"
    echo "  - Backend struct missing methods"
    echo "  - No test coverage"
    echo "  - Missing error handling"
    echo "  - No tabularium entity creation"
    echo ""
    echo "See .claude/skills/integration-step-validator/SKILL.md for details."
    return 1
  fi
}

# Main
main() {
  if [ $# -ne 1 ]; then
    usage
    exit 2
  fi

  if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
  fi

  validate_integration "$1"
}

main "$@"
