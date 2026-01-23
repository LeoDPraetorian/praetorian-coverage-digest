# Audit Mode - Read-Only Compliance Validation

**Complete procedures for validating OSS readiness without modifying files.**

## Purpose

Audit mode allows you to:
- Check OSS compliance status before making changes
- Run in CI/CD pipelines for automated validation
- Generate compliance reports for stakeholders
- Identify specific gaps to address

**Key principle:** Audit mode is 100% read-only. No files are created, modified, or deleted.

## Audit Workflow

### 1. LICENSE Validation

```bash
audit_license() {
  if [ ! -f LICENSE ]; then
    echo "❌ LICENSE file missing"
    return 1
  fi

  if grep -q "Apache License" LICENSE && grep -q "Version 2.0" LICENSE; then
    echo "✓ LICENSE (Apache 2.0)"
    return 0
  else
    echo "⚠️  LICENSE exists but may not be Apache 2.0"
    return 1
  fi
}
```

### 2. Documentation Validation

```bash
audit_documentation() {
  local status=0

  # Required files
  for file in README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md; do
    if [ -f "$file" ]; then
      echo "✓ $file exists"
    else
      echo "❌ $file missing"
      status=1
    fi
  done

  # README sections
  if [ -f README.md ]; then
    for section in "Installation" "Usage" "Contributing" "License"; do
      if grep -qi "## $section" README.md; then
        echo "  ✓ README has $section section"
      else
        echo "  ⚠️  README missing $section section"
      fi
    done
  fi

  return $status
}
```

### 3. Copyright Header Coverage

```bash
audit_copyright() {
  echo "Checking copyright header coverage..."

  # Count total source files
  total=$(find . -type f \( -name "*.go" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.rs" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/vendor/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" | wc -l)

  # Count files with Praetorian copyright
  with_header=$(find . -type f \( -name "*.go" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.rs" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/vendor/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    -exec grep -l "Copyright.*Praetorian" {} \; | wc -l)

  coverage=$(( with_header * 100 / total ))

  echo "Copyright headers: $with_header/$total files ($coverage%)"

  if [ "$coverage" -eq 100 ]; then
    echo "✓ Full coverage"
    return 0
  elif [ "$coverage" -ge 80 ]; then
    echo "⚠️  Partial coverage (need 100%)"
    return 1
  else
    echo "❌ Low coverage (need 100%)"
    return 1
  fi
}
```

### 4. GitHub Metadata Validation

```bash
audit_github_metadata() {
  echo "Checking GitHub metadata..."

  # Check description
  desc=$(gh repo view --json description -q '.description')
  if [ -z "$desc" ]; then
    echo "❌ No repository description set"
    status=1
  elif [ ${#desc} -lt 80 ]; then
    echo "⚠️  Description too short (${#desc} chars, recommend 80-160)"
  elif [ ${#desc} -gt 160 ]; then
    echo "⚠️  Description too long (${#desc} chars, recommend 80-160)"
  else
    echo "✓ Description set (${#desc} chars)"
  fi

  # Check topics
  topic_count=$(gh repo view --json repositoryTopics -q '.repositoryTopics | length')
  if [ "$topic_count" -eq 0 ]; then
    echo "❌ No topics set (need 5-8)"
    status=1
  elif [ "$topic_count" -lt 5 ]; then
    echo "⚠️  Only $topic_count topics (recommend 5-8)"
  elif [ "$topic_count" -gt 8 ]; then
    echo "⚠️  Too many topics ($topic_count, recommend 5-8)"
  else
    echo "✓ Topics configured ($topic_count topics)"
  fi

  return $status
}
```

### 5. Secret Scanning

```bash
audit_secrets() {
  echo "Running noseyparker secret scan..."

  datastore="np-audit-$(date +%Y%m%d-%H%M%S)"

  # Scan
  noseyparker scan --datastore "$datastore" . >/dev/null 2>&1

  # Generate report
  noseyparker report --datastore "$datastore" --format json > noseyparker-audit.json

  # Analyze
  total_matches=$(jq '.matches | length' noseyparker-audit.json)

  if [ "$total_matches" -eq 0 ]; then
    echo "✓ No secrets detected"
    rm -rf "$datastore" noseyparker-audit.json
    return 0
  fi

  # Count by severity
  critical_rules="AWS|GitHub|Stripe|Generic Secret|Private Key"
  critical_count=$(jq "[.matches[] | select(.rule_name | test(\"$critical_rules\"))] | length" noseyparker-audit.json)

  if [ "$critical_count" -gt 0 ]; then
    echo "❌ Found $critical_count high-risk secrets"
    return 1
  else
    echo "⚠️  Found $total_matches potential secrets (may be false positives)"
    return 1
  fi
}
```

### 6. Internal Reference Detection

```bash
audit_internal_refs() {
  echo "Scanning for internal references..."

  count=$(grep -r -i "praetorian\.internal\|\.internal\.praetorian\|do-not-share" . \
    --exclude-dir={node_modules,.git,vendor,dist,build} \
    --include="*.go" --include="*.py" --include="*.ts" --include="*.js" \
    2>/dev/null | wc -l)

  if [ "$count" -eq 0 ]; then
    echo "✓ No internal references found"
    return 0
  else
    echo "⚠️  Found $count internal references"
    return 1
  fi
}
```

## Complete Audit Script

```bash
#!/bin/bash
# oss-audit.sh - Complete OSS readiness audit

set -e

echo "======================================="
echo "OSS Readiness Audit"
echo "======================================="
echo ""

# Track overall status
overall_status=0

# Run all checks
echo "[1/6] Checking LICENSE..."
audit_license || overall_status=1
echo ""

echo "[2/6] Checking documentation..."
audit_documentation || overall_status=1
echo ""

echo "[3/6] Checking copyright headers..."
audit_copyright || overall_status=1
echo ""

echo "[4/6] Checking GitHub metadata..."
audit_github_metadata || overall_status=1
echo ""

echo "[5/6] Scanning for secrets..."
audit_secrets || overall_status=1
echo ""

echo "[6/6] Scanning for internal references..."
audit_internal_refs || overall_status=1
echo ""

# Summary
echo "======================================="
if [ "$overall_status" -eq 0 ]; then
  echo "✓ READY FOR OSS RELEASE"
  echo "======================================="
  exit 0
else
  echo "❌ NOT READY - Issues found"
  echo "======================================="
  echo ""
  echo "Next step: Run 'oss-releaser prepare' to fix issues"
  exit 1
fi
```

## Audit Report Format

```markdown
# OSS Readiness Audit Report

**Repository:** praetorian-inc/brutus
**Date:** 2026-01-22
**Audited By:** oss-releaser v1.1.0
**Overall Status:** ⚠️ Needs Work

## Compliance Status

| Category           | Status | Details                               |
| ------------------ | ------ | ------------------------------------- |
| LICENSE            | ✓      | Apache 2.0 present                    |
| README.md          | ⚠️      | Missing "Contributing" section        |
| CONTRIBUTING.md    | ❌      | File missing                          |
| CODE_OF_CONDUCT.md | ✓      | Contributor Covenant v2.1             |
| SECURITY.md        | ✓      | Vulnerability reporting present       |
| Copyright Headers  | ⚠️      | 321/712 files (45%) - need 100%       |
| GitHub Description | ✓      | Set (142 chars)                       |
| GitHub Topics      | ⚠️      | Only 2 topics (need 5-8)              |
| Secret Scan        | ❌      | 3 findings require review             |
| Internal Refs      | ⚠️      | 12 references found                   |

## Detailed Findings

### Critical Issues (Must Fix)

1. **CONTRIBUTING.md Missing**
   - Impact: Contributors don't know how to contribute
   - Action: Run `prepare` to generate customized version

2. **Secret Scan Findings**
   - 3 potential secrets detected
   - Files: config/aws.yml:12, scripts/deploy.sh:45, tests/data.json:8
   - Action: Manual review required

### Warnings (Should Fix)

3. **Copyright Headers**
   - Only 45% coverage (321/712 files)
   - Missing in: TypeScript files (235), Python files (156)
   - Action: Run `prepare` to add headers

4. **GitHub Topics**
   - Only 2 topics set: golang, security
   - Recommend adding: authentication, password-audit, red-team, cli-tool
   - Action: Run `prepare` or manually add via `gh repo edit`

5. **Internal References**
   - 12 references to internal domains/services
   - Files requiring review: Listed in audit output
   - Action: Manual review and removal

### Info (Nice to Have)

6. **README.md Sections**
   - Missing "Contributing" section
   - Has: Installation, Usage, License
   - Action: Add contributing section with link to CONTRIBUTING.md

## Recommended Actions

**Priority 1 (Critical):**
```bash
# Generate CONTRIBUTING.md
oss-releaser prepare  # Will create customized version

# Review secrets
cat noseyparker-audit.json | jq '.matches[]'
```

**Priority 2 (High):**
```bash
# Add copyright headers
oss-releaser prepare  # Adds headers idempotently

# Add GitHub topics
gh repo edit --add-topic authentication,password-audit,red-team,cli-tool
```

**Priority 3 (Medium):**
```bash
# Review internal references
grep -r "praetorian\.internal" . --exclude-dir=node_modules
# Manually remove/replace as needed
```

## Exit Code

- `0` - Ready for OSS release
- `1` - Issues found (see report above)

## Next Steps

1. Address Critical issues
2. Run `oss-releaser prepare` to auto-fix
3. Re-run `oss-releaser audit` to verify
4. Manual review of secrets and internal refs
5. When audit passes, run `oss-releaser release`
```

## CI/CD Integration

**Use audit mode in GitHub Actions:**

```yaml
name: OSS Readiness Check

on: [pull_request]

jobs:
  oss-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install noseyparker
        run: |
          cargo install noseyparker

      - name: Run OSS audit
        run: |
          # Invoke oss-releaser audit mode
          # Exit code 0 = ready, 1 = issues
          ./scripts/oss-audit.sh

      - name: Upload audit report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: oss-audit-report
          path: oss-audit-report.md
```
