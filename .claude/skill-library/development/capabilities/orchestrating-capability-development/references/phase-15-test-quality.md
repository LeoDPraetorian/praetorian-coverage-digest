# Phase 15: Test Quality

**Validate test suite quality with capability-specific anti-pattern detection.**

---

## Overview

Test Quality validates that tests are well-written, not just that they exist, with capability-specific anti-patterns and quality checks.

**Entry Criteria:** Phase 14 (Coverage Verification) complete.

**Exit Criteria:** Test quality validation passes (or user approves).

---

## Capability-Specific Anti-Patterns

### Detection Capability Anti-Patterns (VQL/Nuclei)

| Anti-Pattern           | Detection                    | Example                        | Remedy                  |
| ---------------------- | ---------------------------- | ------------------------------ | ----------------------- |
| Mock-only detection    | Testing with fake samples    | No real vulnerability samples  | Use real CVE samples    |
| Optimistic FP claims   | Not testing benign samples   | "0% FP" without negative tests | Add benign test suite   |
| Single variant testing | Only one CVE variant tested  | Missing variant coverage       | Test all known variants |
| No edge cases          | Skipping boundary conditions | No timeout/malformed tests     | Add edge case suite     |
| Hardcoded detection    | Detection pattern in test    | `expect(contains("password"))` | Test detection behavior |

### Go Capability Anti-Patterns (Janus/Fingerprintx/Scanner)

| Anti-Pattern            | Detection                      | Example                               | Remedy                    |
| ----------------------- | ------------------------------ | ------------------------------------- | ------------------------- |
| Testing private methods | Accessing unexported functions | `pkg.internalFunc()`                  | Test via public API       |
| Over-mocking            | >5 mocks per test              | Everything mocked                     | Use real dependencies     |
| No error testing        | Missing failure scenarios      | No timeout/error tests                | Add error test suite      |
| Protocol hardcoding     | Hardcoded protocol responses   | Fingerprintx test with fixed response | Use real service          |
| API response mismatch   | Mock differs from real API     | Mock returns different schema         | Validate against real API |

---

## Spawn Test Lead for Quality Validation

```markdown
Task(
subagent_type: "test-lead",
description: "Validate test quality for {capability}",
prompt: "
Task: Validate test quality against test plan

CAPABILITY TYPE: {vql|nuclei|janus|fingerprintx|scanner}

TEST PLAN LOCATION: .capability-development/test-plan.md

TEST IMPLEMENTATION:

- Detection: .capability-development/test-summary-detection.md
- False Positive: .capability-development/test-summary-fp.md
- Edge Cases: .capability-development/test-summary-edge.md

VALIDATION TASKS:

1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. ANTI-PATTERNS (Capability-Specific)

   For Detection Capabilities (VQL/Nuclei):
   - Mock-only detection (CRITICAL)
   - Optimistic FP claims (CRITICAL)
   - Single variant testing (HIGH)
   - No edge cases (HIGH)

   For Go Capabilities (Janus/Fingerprintx/Scanner):
   - Testing private methods (HIGH)
   - Over-mocking (MEDIUM)
   - No error testing (HIGH)
   - Protocol hardcoding (Fingerprintx) (HIGH)
   - API response mismatch (Scanner) (HIGH)

3. QUALITY CHECKS
   - Detection vs mock - Testing real detection?
   - Sample quality - Are samples representative?
   - Coverage completeness - All scenarios tested?

DELIVERABLE: Save to .capability-development/test-validation.md

Return: { 'plan_adherence', 'anti_patterns', 'quality_score', 'verdict' }
"
)
```

---

## Quality Score Calculation

| Factor             | Weight | Detection Focus          | Go Capability Focus    |
| ------------------ | ------ | ------------------------ | ---------------------- |
| Detection Accuracy | 40%    | Real sample testing      | Interface coverage     |
| Anti-patterns      | 25%    | Mock-only, optimistic FP | Over-mocking, private  |
| Sample Quality     | 20%    | Real CVE samples         | Real service responses |
| Edge Cases         | 15%    | Boundary conditions      | Error scenarios        |

### Score Interpretation

| Score  | Detection Meaning                       | Go Capability Meaning        |
| ------ | --------------------------------------- | ---------------------------- |
| 90-100 | Excellent - real samples, comprehensive | Excellent - proper isolation |
| 70-89  | Good - minor gaps                       | Good - acceptable patterns   |
| 50-69  | Needs work - mock-heavy                 | Needs work - over-mocked     |
| <50    | Significant issues                      | Significant issues           |

**Minimum passing score:** 70

---

## Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or critical quality issues:

### Detection Capability Fix

```markdown
Task(
subagent_type: "capability-tester",
description: "Fix test quality issues",
prompt: "
Fix test quality issues for detection capability:

VALIDATION FEEDBACK:
{from test-validation.md}

ANTI-PATTERNS DETECTED:

- Mock-only detection: Tests use fake samples
- Single variant: Only testing CVE variant 1

Fix by:

1. Add real vulnerability samples
2. Test all known CVE variants
3. Add benign sample validation

Return updated tests.
"
)
```

### Go Capability Fix

```markdown
Task(
subagent_type: "capability-tester",
description: "Fix test quality issues",
prompt: "
Fix test quality issues for Go capability:

VALIDATION FEEDBACK:
{from test-validation.md}

ANTI-PATTERNS DETECTED:

- Over-mocking: 8 mocks in integration test
- No error testing: Missing timeout scenarios

Fix by:

1. Use real dependencies where safe
2. Add timeout and error tests
3. Test with real service (Docker)

Return updated tests.
"
)
```

---

## Update MANIFEST.yaml

```yaml
phases:
  15_test_quality:
    status: "complete"
    completed_at: "{timestamp}"
    retry_count: 0

test_validation:
  capability_type: "vql"
  agent: "test-lead"

  plan_adherence:
    tests_required: 17
    tests_implemented: 17
    all_met: true

  anti_patterns:
    detection:
      mock_only: 0
      optimistic_fp: 0
      single_variant: 0
    avoided_from_plan: true
    detected: []

  quality_score: 88
  verdict: "PASS"

  validation_report: ".capability-development/test-validation.md"
```

---

## User Report

```markdown
## Test Quality Validation Complete

**Capability Type:** VQL

**Plan Adherence:**

- Tests Required: 17
- Tests Implemented: 17
- Missing: None

**Anti-Patterns:**
| Pattern | Count |
|---------|-------|
| Mock-only detection | 0 |
| Optimistic FP claims | 0 |
| Single variant testing | 0 |
| No edge cases | 0 |

**Quality Score:** 88/100

**Verdict:** PASS

**Validation Report:** .capability-development/test-validation.md

→ Proceeding to Phase 16: Completion
```

---

## Skip Conditions

| Work Type | Test Quality                |
| --------- | --------------------------- |
| BUGFIX    | Skip (focused scope)        |
| SMALL     | Skip (minimal test changes) |
| MEDIUM    | Run                         |
| LARGE     | Run                         |

---

## Related References

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
- [Quality Standards](quality-standards.md) - Capability-specific quality metrics
