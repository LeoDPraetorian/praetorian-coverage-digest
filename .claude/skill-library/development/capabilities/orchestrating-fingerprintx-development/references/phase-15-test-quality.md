# Phase 15: Test Quality

**Validate test suite quality with fingerprintx-specific anti-pattern detection.**

---

## Overview

Test Quality validates that tests are well-written, not just that they exist, with fingerprintx-specific anti-patterns and quality checks.

**Entry Criteria:** Phase 14 (Coverage Verification) complete.

**Exit Criteria:** Test quality validation passes (or user approves).

---

## Fingerprintx-Specific Anti-Patterns

| Anti-Pattern         | Detection                        | Example                         | Remedy                   |
| -------------------- | -------------------------------- | ------------------------------- | ------------------------ |
| Happy path only      | No tests for invalid/error cases | Only tests valid banners        | Add invalid banner tests |
| No boundary tests    | No empty/truncated input tests   | Missing `len(banner)==0` test   | Add edge case tests      |
| Testing internals    | Testing unexported functions     | `plugin.parseBanner()` directly | Test via Match()         |
| Mocking service      | Mocking Match() method itself    | `mockMatch.Return(expected)`    | Use real detection logic |
| No Shodan validation | 0 real-world banners             | Missing Shodan tests            | Add 3+ Shodan banners    |
| Weak assertions      | Only checking != nil             | `assert.NotNil(match)`          | Check specific fields    |
| No timeout tests     | Missing timeout scenarios        | No slow server test             | Add timeout test         |
| No version tests     | Missing version extraction tests | Only tests detection            | Add version tests        |

---

## Spawn Test Lead for Quality Validation

```markdown
Task(
subagent_type: "test-lead",
description: "Validate test quality for {protocol} plugin",
prompt: "
Task: Validate test quality against test plan

PLUGIN TYPE: fingerprintx

TEST PLAN LOCATION: .fingerprintx-development/test-plan.md

TEST IMPLEMENTATION:

- Unit: .fingerprintx-development/test-summary-unit.md
- Integration: .fingerprintx-development/test-summary-integration.md
- Shodan: .fingerprintx-development/test-summary-shodan.md

VALIDATION TASKS:

1. PLAN ADHERENCE
   - Were all required tests from plan implemented?
   - Are any planned tests missing?
   - Were extra tests added? (document if yes)

2. ANTI-PATTERNS (Fingerprintx-Specific)

   Check for:
   - Happy path only tests (CRITICAL)
   - No boundary tests for empty/truncated input (HIGH)
   - Testing unexported functions directly (HIGH)
   - Mocking Match() method (CRITICAL)
   - No Shodan validation (HIGH)
   - Weak assertions (only != nil) (MEDIUM)
   - No timeout/error scenario tests (HIGH)

3. QUALITY CHECKS
   - Table-driven tests used for variations?
   - Error paths covered?
   - Shodan banners documented with query?
   - Integration tests use mock server pattern?

4. SHODAN VALIDATION CHECK
   - At least 3 real-world banners?
   - Queries documented for reproducibility?
   - Version extraction tested against real versions?

DELIVERABLE:
Save validation to: .fingerprintx-development/test-validation.md

Return:
{
'status': 'complete',
'plan_adherence': {
'tests_required': {count},
'tests_implemented': {count},
'missing': [],
'extra': []
},
'anti_patterns': {
'avoided_from_plan': true,
'detected': []
},
'shodan_validation': {
'banners_required': 3,
'banners_found': {count},
'queries_documented': true
},
'quality_score': {0-100},
'issues': [],
'verdict': 'PASS | NEEDS_IMPROVEMENT | FAIL'
}
"
)
```

---

## Quality Score Calculation for Fingerprintx

| Factor             | Weight | Focus                        |
| ------------------ | ------ | ---------------------------- |
| Coverage           | 35%    | Detection + parsing coverage |
| Anti-patterns      | 30%    | Fingerprintx-specific issues |
| Shodan validation  | 20%    | Real-world accuracy          |
| Assertions quality | 15%    | Meaningful checks            |

### Score Interpretation

| Score  | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 90-100 | Excellent - comprehensive detection tests, Shodan validated |
| 70-89  | Good - minor issues, acceptable coverage                    |
| 50-69  | Needs work - anti-patterns present, weak Shodan validation  |
| <50    | Significant issues - missing core test scenarios            |

**Minimum passing score:** 70

---

## Feedback Loop (MAX 1 RETRY)

If `verdict: "FAIL"` or critical quality issues:

```markdown
Task(
subagent_type: "capability-tester",
description: "Fix test quality issues",
prompt: "
Fix the following test quality issues:

TEST PLAN: .fingerprintx-development/test-plan.md

VALIDATION FEEDBACK:
{from test-validation.md}

ANTI-PATTERNS DETECTED:

- {protocol}\_test.go: Happy path only - no invalid banner tests
- {protocol}\_test.go: Weak assertions - only assert.NotNil()
- Missing Shodan validation tests

Fix by:

1. Add tests for invalid/malformed banners
2. Add specific assertions for ServiceMatch fields
3. Add 3+ Shodan banner validation tests

Return updated tests that satisfy the test plan.
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
  plugin_type: "fingerprintx"
  agent: "test-lead"

  plan_adherence:
    tests_required: 13
    tests_implemented: 13
    all_met: true

  anti_patterns:
    fingerprintx:
      happy_path_only: 0
      no_boundary_tests: 0
      testing_internals: 0
      mocking_service: 0
      no_shodan: 0
      weak_assertions: 0
    avoided_from_plan: true
    detected: []

  shodan_validation:
    banners_required: 3
    banners_found: 3
    queries_documented: true
    status: "pass"

  quality_score: 88
  verdict: "PASS"

  validation_report: ".fingerprintx-development/test-validation.md"
```

---

## User Report

```markdown
## Test Quality Validation Complete

**Protocol:** {protocol}

**Plan Adherence:**

- Tests Required: 13
- Tests Implemented: 13
- Missing: None

**Anti-Patterns:**
| Pattern | Count |
|---------|-------|
| Happy path only | 0 |
| No boundary tests | 0 |
| Testing internals | 0 |
| Mocking service | 0 |
| No Shodan validation | 0 |
| Weak assertions | 0 |

**Shodan Validation:**

- Banners Required: 3
- Banners Found: 3
- Queries Documented: Yes

**Quality Score:** 88/100

**Verdict:** PASS

**Validation Report:** .fingerprintx-development/test-validation.md

Proceeding to Phase 16: Completion
```

---

## Common Fingerprintx Test Quality Issues

| Issue                   | Detection                                      | Fix                             |
| ----------------------- | ---------------------------------------------- | ------------------------------- |
| No invalid banner tests | grep for "invalid\|malformed\|empty" returns 0 | Add table tests with bad inputs |
| Mocking Match()         | Mock setup for Match function                  | Remove mock, test real function |
| Missing Shodan tests    | No \*\_shodan_test.go file                     | Create Shodan validation file   |
| Weak assertions         | Only `NotNil` checks                           | Add field-level assertions      |
| No timeout test         | No timeout/context in tests                    | Add slow server test            |

---

## Skip Conditions

| Work Type | Test Quality                |
| --------- | --------------------------- |
| BUGFIX    | Skip (focused scope)        |
| SMALL     | Skip (minimal test changes) |
| MODERATE  | Run                         |
| COMPLEX   | Run                         |

---

## Related References

- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Previous phase
- [Phase 16: Completion](phase-16-completion.md) - Next phase
