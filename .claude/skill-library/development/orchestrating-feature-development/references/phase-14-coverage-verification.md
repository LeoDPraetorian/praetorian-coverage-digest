# Phase 14: Coverage Verification

**Verify test coverage meets feature-specific targets.**

---

## Overview

Coverage Verification validates that test implementation meets feature-specific coverage thresholds.

**Entry Criteria:**

- Phase 13 (Testing) complete with all tests passing
- **COMPACTION GATE 3 complete:** Must complete [compaction-gates.md](compaction-gates.md) protocol

**Exit Criteria:** All coverage targets met (or user approves proceeding with gaps).

---

## Feature Coverage Targets

### Frontend Targets

| Category           | Target | Files Pattern                    |
| ------------------ | ------ | -------------------------------- |
| Security Functions | 95%    | `**/auth/**`, `**/validation/**` |
| Business Logic     | 80%    | `**/hooks/**`, `**/utils/**`     |
| Integration Paths  | 85%    | `**/api/**`, `**/services/**`    |
| UI Components      | 75%    | `**/components/**`               |

### Backend Targets

| Category           | Target | Files Pattern                    |
| ------------------ | ------ | -------------------------------- |
| Security Functions | 95%    | `**/auth/**`, `**/middleware/**` |
| Business Logic     | 85%    | `**/handler/**`, `**/service/**` |
| Integration Paths  | 90%    | `**/client/**`, `**/api/**`      |
| Handlers           | 80%    | `**/handler/**`                  |

---

## Coverage Commands

### Frontend Coverage

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage report
npm run test:coverage -- --reporter=json

# Check specific files
npx vitest run --coverage src/hooks/useAssetFilters.ts
```

**Coverage output location:** `coverage/lcov-report/index.html`

### Backend Coverage

```bash
# Run tests with coverage profile
go test -coverprofile=coverage.out ./...

# View coverage by function
go tool cover -func=coverage.out

# Generate HTML report
go tool cover -html=coverage.out -o coverage.html

# Check specific package
go test -coverprofile=pkg.out ./pkg/handler/...
go tool cover -func=pkg.out
```

**Coverage output location:** `coverage.html`

---

## Coverage Analysis

Compare actual vs target for each category:

### Frontend Analysis

```markdown
| Category                           | Target | Actual | Status     |
| ---------------------------------- | ------ | ------ | ---------- |
| Security Functions (auth hooks)    | 95%    | 97%    | PASS       |
| Business Logic (useAssetFilters)   | 80%    | 82%    | PASS       |
| Integration Paths (TanStack hooks) | 85%    | 78%    | FAIL (-7%) |
| UI Components                      | 75%    | 76%    | PASS       |
```

### Backend Analysis

```markdown
| Category                        | Target | Actual | Status     |
| ------------------------------- | ------ | ------ | ---------- |
| Security Functions (middleware) | 95%    | 96%    | PASS       |
| Business Logic (service)        | 85%    | 87%    | PASS       |
| Integration Paths (client)      | 90%    | 91%    | PASS       |
| Handlers                        | 80%    | 79%    | FAIL (-1%) |
```

---

## Handling Coverage Gaps

### Minor Gap (<5%)

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Integration coverage is 78% (target: 85%). Proceed or improve?",
      header: "Coverage",
      multiSelect: false,
      options: [
        { label: "Improve coverage (Recommended)", description: "Add tests to reach 85%" },
        { label: "Proceed anyway", description: "Accept 78% with documented gap" },
      ],
    },
  ],
});
```

### Major Gap (>=5%)

1. Identify untested code paths
2. Re-spawn relevant tester agent:

```markdown
Task(
subagent_type: "frontend-tester",
description: "Improve integration test coverage",
prompt: "
Coverage gap detected in integration tests.

CURRENT: 78%
TARGET: 85%

UNTESTED PATHS:

- useAssets.ts:45-60 (error handling)
- useAssets.ts:72-85 (retry logic)

Add tests to cover these specific paths.
Focus on error and edge cases.
"
)
```

3. Re-run coverage analysis
4. If still failing after 1 retry → escalate

---

## Coverage Report Format

Create `.feature-development/coverage-report.md`:

```markdown
## Coverage Report

**Feature Type:** Frontend
**Analysis Date:** {timestamp}
**Test Plan:** .feature-development/test-plan.md

### Coverage by Category

| Category           | Target | Actual | Status |
| ------------------ | ------ | ------ | ------ |
| Security Functions | 95%    | 97%    | PASS   |
| Business Logic     | 80%    | 82%    | PASS   |
| Integration Paths  | 85%    | 86%    | PASS   |

### Coverage by File

| File                         | Coverage | Category       |
| ---------------------------- | -------- | -------------- |
| src/hooks/useAuth.ts         | 97%      | Security       |
| src/hooks/useAssetFilters.ts | 82%      | Business Logic |
| src/api/useAssets.ts         | 86%      | Integration    |

### Uncovered Lines

| File                | Lines | Reason                     |
| ------------------- | ----- | -------------------------- |
| src/utils/format.ts | 45-47 | Edge case - rarely reached |

### Summary

**All Targets Met:** Yes
**Total Coverage:** 84%
```

---

## Update MANIFEST.yaml

```yaml
phases:
  14_coverage_verification:
    status: "complete"
    completed_at: "{timestamp}"

coverage:
  feature_type: "frontend"

  commands:
    unit: "npm run test:coverage"
    report: "coverage/lcov-report/index.html"

  targets:
    security_functions:
      target: "95%"
      actual: "97%"
      met: true
    business_logic:
      target: "80%"
      actual: "82%"
      met: true
    integration_paths:
      target: "85%"
      actual: "86%"
      met: true

  all_targets_met: true
  total_coverage: "84%"

  report: ".feature-development/coverage-report.md"
```

---

## User Report

```markdown
## Coverage Verification Complete

**Feature Type:** Frontend

**Coverage Results:**
| Category | Target | Actual | Status |
|----------|--------|--------|--------|
| Security Functions | 95% | 97% | PASS |
| Business Logic | 80% | 82% | PASS |
| Integration Paths | 85% | 86% | PASS |

**All targets met.**

**Total Coverage:** 84%

**Coverage Report:** .feature-development/coverage-report.md

Proceeding to Phase 15: Test Quality
```

---

## Skip Conditions

| Work Type | Coverage Verification         |
| --------- | ----------------------------- |
| BUGFIX    | Run (verify bug area covered) |
| SMALL     | Run (minimal scope)           |
| MEDIUM    | Run                           |
| LARGE     | Run                           |

Coverage verification always runs but scope varies.

---

## Related References

- [Phase 13: Testing](phase-13-testing.md) - Previous phase
- [Phase 15: Test Quality](phase-15-test-quality.md) - Next phase
