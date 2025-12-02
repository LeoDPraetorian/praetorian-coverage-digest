#!/bin/bash
#
# validate-api-spec.sh - Validates API integration specifications for completeness
#
# Usage: ./validate-api-spec.sh <spec-file.md>
#
# Checks for required sections:
# - Authentication
# - Endpoints
# - Error Handling
# - Security Requirements
# - Rate Limits
#
# Exit codes:
#   0 - All required sections present
#   1 - Missing required sections
#   2 - Invalid usage

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required sections in API specification
REQUIRED_SECTIONS=(
  "Authentication"
  "Endpoints"
  "Error Handling"
  "Security Requirements"
  "Rate Limits"
)

# Optional but recommended sections
RECOMMENDED_SECTIONS=(
  "Summary"
  "Implementation Checklist"
  "Open Questions"
)

usage() {
  cat <<EOF
Usage: $0 <spec-file.md>

Validates API integration specifications for completeness.

Required sections:
  - Authentication (auth method, token refresh, scopes)
  - Endpoints (create, read, update, delete, list, bulk)
  - Error Handling (status codes, retry strategies)
  - Security Requirements (webhook verification, PII handling)
  - Rate Limits (requests/min, backoff strategy)

Example:
  $0 /path/to/api-spec.md

Exit codes:
  0 - All required sections present (PASS)
  1 - Missing required sections (FAIL)
  2 - Invalid usage
EOF
}

validate_spec() {
  local spec_file="$1"
  local missing_sections=()
  local missing_recommended=()
  local total_checks=0
  local passed_checks=0

  echo -e "${YELLOW}Validating API specification:${NC} $spec_file"
  echo ""

  # Check if file exists
  if [ ! -f "$spec_file" ]; then
    echo -e "${RED}✗ Error: File not found${NC}"
    return 1
  fi

  # Check required sections
  echo "Checking required sections..."
  for section in "${REQUIRED_SECTIONS[@]}"; do
    total_checks=$((total_checks + 1))
    if grep -q "^## $section" "$spec_file"; then
      echo -e "${GREEN}✓${NC} $section"
      passed_checks=$((passed_checks + 1))
    else
      echo -e "${RED}✗${NC} $section ${RED}(MISSING)${NC}"
      missing_sections+=("$section")
    fi
  done

  echo ""

  # Check recommended sections
  echo "Checking recommended sections..."
  for section in "${RECOMMENDED_SECTIONS[@]}"; do
    if grep -q "^## $section" "$spec_file"; then
      echo -e "${GREEN}✓${NC} $section"
    else
      echo -e "${YELLOW}○${NC} $section (optional, but recommended)"
      missing_recommended+=("$section")
    fi
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Summary
  if [ ${#missing_sections[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} - All required sections present ($passed_checks/$total_checks)"

    if [ ${#missing_recommended[@]} -gt 0 ]; then
      echo ""
      echo -e "${YELLOW}Note:${NC} Missing ${#missing_recommended[@]} recommended section(s):"
      for section in "${missing_recommended[@]}"; do
        echo "  - $section"
      done
    fi

    return 0
  else
    echo -e "${RED}✗ FAIL${NC} - Missing ${#missing_sections[@]} required section(s) ($passed_checks/$total_checks passed)"
    echo ""
    echo "Missing required sections:"
    for section in "${missing_sections[@]}"; do
      echo -e "  ${RED}✗${NC} $section"
    done

    echo ""
    echo "To fix, add these sections to your specification:"
    for section in "${missing_sections[@]}"; do
      case "$section" in
        "Authentication")
          echo ""
          echo "## Authentication"
          echo "- Method: [OAuth2 / API Key / JWT]"
          echo "- Token refresh: [frequency, endpoint]"
          echo "- Scope requirements: [list]"
          ;;
        "Endpoints")
          echo ""
          echo "## Endpoints"
          echo "- **Create**: \`POST /resource\` - [idempotency key]"
          echo "- **Read**: \`GET /resource/{id}\` - [rate limit]"
          echo "- **Update**: \`PUT /resource/{id}\` - [partial updates]"
          echo "- **Delete**: \`DELETE /resource/{id}\` - [soft/hard]"
          echo "- **List**: \`GET /resources\` - [pagination]"
          ;;
        "Error Handling")
          echo ""
          echo "## Error Handling"
          echo "| Status | Meaning | Retry Strategy |"
          echo "|--------|---------|----------------|"
          echo "| 400 | Bad Request | Don't retry |"
          echo "| 401 | Auth expired | Refresh token |"
          echo "| 429 | Rate limited | Exponential backoff |"
          ;;
        "Security Requirements")
          echo ""
          echo "## Security Requirements"
          echo "- Webhook signature verification: [algorithm]"
          echo "- Request signing: [method]"
          echo "- PII handling: [encryption, retention]"
          ;;
        "Rate Limits")
          echo ""
          echo "## Rate Limits"
          echo "- Standard: [X requests/minute]"
          echo "- Burst: [Y requests/minute]"
          echo "- Backoff strategy: [exponential with jitter]"
          ;;
      esac
    done

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

  validate_spec "$1"
}

main "$@"
