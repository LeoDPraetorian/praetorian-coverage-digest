# Phase 14: Coverage Verification

**Verify test coverage meets capability-specific quality targets.**

---

## Overview

Coverage Verification validates that test implementation meets capability-specific coverage targets and detection metrics.

**Entry Criteria:**

- Phase 13 (Testing) complete with all tests passing
- **COMPACTION GATE 3 complete:** Must complete [compaction-gates.md](compaction-gates.md) protocol

**Exit Criteria:** All coverage targets met (or user approves proceeding with gaps).

---

## Capability Coverage Targets

### Detection Capabilities (VQL/Nuclei)

| Metric                  | VQL Target | Nuclei Target | Priority |
| ----------------------- | ---------- | ------------- | -------- |
| Detection Accuracy      | ≥95%       | ≥95%          | CRITICAL |
| False Positive Rate     | ≤5%        | ≤2%           | CRITICAL |
| Query/Template Coverage | ≥80%       | ≥80%          | HIGH     |
| Edge Case Coverage      | 100%       | 100%          | HIGH     |

### Go Capabilities (Janus/Fingerprintx/Scanner)

| Metric             | Janus Target | Fingerprintx Target | Scanner Target | Priority |
| ------------------ | ------------ | ------------------- | -------------- | -------- |
| Code Coverage      | ≥80%         | ≥80%                | ≥80%           | HIGH     |
| Detection Accuracy | N/A          | ≥98%                | N/A            | CRITICAL |
| Pipeline Success   | ≥98%         | N/A                 | N/A            | CRITICAL |
| API Integration    | N/A          | N/A                 | 100%           | CRITICAL |
| Error Handling     | 100%         | 100%                | 100%           | HIGH     |

---

## Coverage Commands

### VQL Capabilities

```bash
# Detection accuracy from test results
grep "detection_rate" .capability-development/test-summary-detection.md

# False positive rate from test results
grep "fp_rate" .capability-development/test-summary-fp.md

# Edge case coverage
grep "handled" .capability-development/test-summary-edge.md
```

### Nuclei Templates

```bash
# Detection accuracy from test results
grep "detection_rate" .capability-development/test-summary-detection.md

# False positive rate (stricter ≤2%)
grep "fp_rate" .capability-development/test-summary-fp.md

# CVE variant coverage
grep "variants_tested" .capability-development/test-summary-detection.md
```

### Go Capabilities

```bash
# Code coverage
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total

# Generate HTML report
go tool cover -html=coverage.out -o coverage.html
```

---

## Coverage Analysis by Type

### VQL Analysis

```markdown
| Metric              | Target | Actual | Status |
| ------------------- | ------ | ------ | ------ |
| Detection Accuracy  | ≥95%   | 97%    | PASS   |
| False Positive Rate | ≤5%    | 3%     | PASS   |
| Query Coverage      | ≥80%   | 85%    | PASS   |
| Edge Cases          | 100%   | 100%   | PASS   |
```

### Nuclei Analysis

```markdown
| Metric               | Target | Actual | Status |
| -------------------- | ------ | ------ | ------ |
| Detection Accuracy   | ≥95%   | 96%    | PASS   |
| False Positive Rate  | ≤2%    | 1%     | PASS   |
| CVE Variant Coverage | 100%   | 100%   | PASS   |
| Template Coverage    | ≥80%   | 82%    | PASS   |
```

### Go Capability Analysis

```markdown
| Metric             | Target   | Actual   | Status              |
| ------------------ | -------- | -------- | ------------------- |
| Code Coverage      | ≥80%     | 83%      | PASS                |
| Detection Accuracy | ≥98%     | 99%      | PASS (Fingerprintx) |
| Error Handling     | 100%     | 100%     | PASS                |
| Integration Tests  | All pass | All pass | PASS                |
```

---

## Handling Coverage Gaps

### Detection Gap (<5% from target)

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Detection accuracy is 93% (target: 95%). Proceed or improve?",
      header: "Coverage",
      multiSelect: false,
      options: [
        {
          label: "Improve detection (Recommended)",
          description: "Add samples or refine detection logic",
        },
        { label: "Proceed anyway", description: "Accept 93% with documented gap" },
      ],
    },
  ],
});
```

### Major Gap (≥5% from target)

1. Identify detection gaps
2. Re-spawn capability-tester:

```markdown
Task(
subagent_type: "capability-tester",
description: "Improve detection coverage",
prompt: "
Detection gap: 93% (target: 95%)

MISSING DETECTIONS:

- Pattern variant X not detected
- Edge case Y not covered

Add tests to improve detection.
Consider refining detection logic if needed.
"
)
```

3. Re-run coverage analysis
4. If still failing → escalate to user

---

## Coverage Report Format

Create `.capability-development/coverage-report.md`:

```markdown
## Coverage Report

**Capability Type:** VQL
**Analysis Date:** {timestamp}
**Test Plan:** .capability-development/test-plan.md

### Quality Metrics

| Metric              | Target | Actual | Status |
| ------------------- | ------ | ------ | ------ |
| Detection Accuracy  | ≥95%   | 97%    | PASS   |
| False Positive Rate | ≤5%    | 3%     | PASS   |
| Query Coverage      | ≥80%   | 85%    | PASS   |

### Test Coverage by Category

| Category       | Tests | Passed | Coverage     |
| -------------- | ----- | ------ | ------------ |
| Detection      | 8     | 8      | 97% accuracy |
| False Positive | 5     | 5      | 3% FP rate   |
| Edge Cases     | 4     | 4      | 100%         |

### Summary

**All Targets Met:** Yes
**Overall Quality:** PASS
```

---

## Update MANIFEST.yaml

```yaml
phases:
  14_coverage_verification:
    status: "complete"
    completed_at: "{timestamp}"

coverage:
  capability_type: "vql"

  quality_metrics:
    detection_accuracy:
      target: "95%"
      actual: "97%"
      met: true
    false_positive_rate:
      target: "5%"
      actual: "3%"
      met: true
    query_coverage:
      target: "80%"
      actual: "85%"
      met: true

  all_targets_met: true
  report: ".capability-development/coverage-report.md"
```

---

## User Report

```markdown
## Coverage Verification Complete

**Capability Type:** VQL

**Coverage Results:**
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Detection Accuracy | ≥95% | 97% | PASS |
| False Positive Rate | ≤5% | 3% | PASS |
| Query Coverage | ≥80% | 85% | PASS |

**All targets met.**

**Coverage Report:** .capability-development/coverage-report.md

→ Proceeding to Phase 15: Test Quality
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
- [Quality Standards](quality-standards.md) - Capability-specific quality targets
