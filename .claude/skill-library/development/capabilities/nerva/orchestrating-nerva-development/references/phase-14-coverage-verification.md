# Phase 14: Coverage Verification

**Verify test coverage meets fingerprintx-specific targets.**

---

## Overview

Coverage Verification validates that test implementation meets fingerprintx-specific coverage targets.

**Entry Criteria:**

- Phase 13 (Testing) complete with all tests passing
- **COMPACTION GATE 3 complete:** Must complete [compaction-gates.md](compaction-gates.md) protocol

**Exit Criteria:** All coverage targets met (or user approves proceeding with gaps).

---

## Fingerprintx Coverage Targets

| Category           | Target | Functions Pattern                       |
| ------------------ | ------ | --------------------------------------- |
| Detection Logic    | 95%    | `Match`, `Detect`, detection functions  |
| Banner Parsing     | 90%    | `parse*`, `extract*`, parsing functions |
| Version Extraction | 85%    | `*Version*`, `extractVersion`           |
| Error Paths        | 90%    | Error handling branches                 |

---

## Coverage Commands

### Generate Coverage Profile

```bash
# Run tests with coverage
go test -coverprofile=coverage.out ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# View coverage summary
go tool cover -func=coverage.out

# Generate HTML report
go tool cover -html=coverage.out -o coverage.html

# Check specific function coverage
go tool cover -func=coverage.out | grep -E "Match|Detect|parse|extract"
```

**Coverage output location:** `coverage.out`, `coverage.html`

### Check Function-Level Coverage

```bash
# Extract detection logic coverage
go tool cover -func=coverage.out | grep -E "Match|Detect"
-> {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go:45: Match 96.0%

# Extract parsing coverage
go tool cover -func=coverage.out | grep -i "parse"
-> {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go:78: parseBanner 92.0%

# Extract version extraction coverage
go tool cover -func=coverage.out | grep -i "version"
-> {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go:102: extractVersion 88.0%
```

---

## Coverage Analysis

Compare actual vs target for each category:

### Fingerprintx Coverage Analysis

```markdown
| Category                 | Target | Actual | Status |
| ------------------------ | ------ | ------ | ------ |
| Detection Logic (Match)  | 95%    | 96%    | PASS   |
| Banner Parsing (parse\*) | 90%    | 92%    | PASS   |
| Version Extraction       | 85%    | 88%    | PASS   |
| Error Paths              | 90%    | 91%    | PASS   |
```

### Shodan Validation Check

```bash
# Verify Shodan tests exist and pass
go test -tags=shodan -v ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/... | grep -E "PASS|FAIL"

# Count Shodan test cases
grep -c "shodanBanners\|Shodan" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/*_shodan_test.go
-> PASS: 3+ Shodan banners validated
```

---

## Handling Coverage Gaps

### Minor Gap (<5%)

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Version extraction coverage is 82% (target: 85%). Proceed or improve?",
      header: "Coverage",
      multiSelect: false,
      options: [
        { label: "Improve coverage (Recommended)", description: "Add tests to reach 85%" },
        { label: "Proceed anyway", description: "Accept 82% with documented gap" },
      ],
    },
  ],
});
```

### Major Gap (>=5%)

1. Identify untested code paths:

```bash
# Find uncovered lines
go tool cover -func=coverage.out | grep -v "100.0%"
```

2. Re-spawn capability-tester agent:

```markdown
Task(
subagent_type: "capability-tester",
description: "Improve detection test coverage",
prompt: "
Coverage gap detected in detection logic.

CURRENT: 89%
TARGET: 95%

UNTESTED PATHS:

- plugin.go:55-60 (malformed banner handling)
- plugin.go:72-78 (truncated response path)

Add tests to cover these specific error paths.
Focus on edge cases and error handling.
"
)
```

3. Re-run coverage analysis
4. If still failing after 1 retry -> escalate

---

## Coverage Report Format

Create `.fingerprintx-development/coverage-report.md`:

```markdown
## Coverage Report

**Protocol:** {protocol}
**Analysis Date:** {timestamp}
**Test Plan:** .fingerprintx-development/test-plan.md

### Coverage by Category

| Category           | Target | Actual | Status |
| ------------------ | ------ | ------ | ------ |
| Detection Logic    | 95%    | 96%    | PASS   |
| Banner Parsing     | 90%    | 92%    | PASS   |
| Version Extraction | 85%    | 88%    | PASS   |
| Error Paths        | 90%    | 91%    | PASS   |

### Coverage by Function

| Function       | Coverage | Category  |
| -------------- | -------- | --------- |
| Match          | 96%      | Detection |
| parseBanner    | 92%      | Parsing   |
| extractVersion | 88%      | Version   |
| handleError    | 91%      | Error     |

### Uncovered Lines

| File      | Lines   | Reason                                |
| --------- | ------- | ------------------------------------- |
| plugin.go | 112-114 | Unreachable fallback (defensive code) |

### Shodan Validation

| Banner        | Query                          | Detection | Version |
| ------------- | ------------------------------ | --------- | ------- |
| Production US | product:{protocol} country:US  | PASS      | 1.2.3   |
| Production EU | product:{protocol} country:DE  | PASS      | 2.0.0   |
| Legacy        | product:{protocol} version:1.x | PASS      | 1.0.0   |

**Shodan Banners Validated:** 3 of 3 PASS

### Summary

**All Targets Met:** Yes
**Total Coverage:** 91%
**Shodan Validation:** PASS
```

---

## Update MANIFEST.yaml

```yaml
phases:
  14_coverage_verification:
    status: "complete"
    completed_at: "{timestamp}"

coverage:
  plugin_type: "fingerprintx"

  commands:
    profile: "go test -coverprofile=coverage.out ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/..."
    report: "go tool cover -func=coverage.out"

  targets:
    detection_logic:
      target: "95%"
      actual: "96%"
      met: true
    banner_parsing:
      target: "90%"
      actual: "92%"
      met: true
    version_extraction:
      target: "85%"
      actual: "88%"
      met: true
    error_paths:
      target: "90%"
      actual: "91%"
      met: true

  shodan_validation:
    banners_tested: 3
    banners_passed: 3
    status: "pass"

  all_targets_met: true
  total_coverage: "91%"

  report: ".fingerprintx-development/coverage-report.md"
```

---

## User Report

```markdown
## Coverage Verification Complete

**Protocol:** {protocol}

**Coverage Results:**
| Category | Target | Actual | Status |
|----------|--------|--------|--------|
| Detection Logic | 95% | 96% | PASS |
| Banner Parsing | 90% | 92% | PASS |
| Version Extraction | 85% | 88% | PASS |
| Error Paths | 90% | 91% | PASS |

**All targets met.**

**Shodan Validation:** 3 of 3 banners validated

**Total Coverage:** 91%

**Coverage Report:** .fingerprintx-development/coverage-report.md

Proceeding to Phase 15: Test Quality
```

---

## Skip Conditions

| Work Type | Coverage Verification         |
| --------- | ----------------------------- |
| BUGFIX    | Run (verify bug area covered) |
| SMALL     | Run (minimal scope)           |
| MODERATE  | Run                           |
| COMPLEX   | Run                           |

Coverage verification always runs but scope varies.

---

## Related References

- [Phase 13: Testing](phase-13-testing.md) - Previous phase
- [Phase 15: Test Quality](phase-15-test-quality.md) - Next phase
