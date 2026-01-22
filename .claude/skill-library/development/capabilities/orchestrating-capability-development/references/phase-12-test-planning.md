# Phase 12: Test Planning

**Create comprehensive test plan with capability-specific coverage targets and quality metrics.**

---

## Overview

Test Planning designs test strategy with capability-specific coverage targets and detection-focused test design.

**Entry Criteria:** Phase 11 (Code Quality) complete.

**Exit Criteria:** Test plan saved with all required sections.

---

## Capability Quality Targets

Each capability type has specific quality targets that drive test design:

| Capability   | Detection Accuracy | False Positive Rate | Coverage | Additional                |
| ------------ | ------------------ | ------------------- | -------- | ------------------------- |
| VQL          | ≥95%               | ≤5%                 | ≥80%     | Query performance ≤60s    |
| Nuclei       | ≥95%               | ≤2%                 | ≥80%     | ≤3 HTTP requests          |
| Janus        | N/A                | N/A                 | ≥80%     | Pipeline success ≥98%     |
| Fingerprintx | ≥98%               | ≤1%                 | ≥80%     | Protocol correctness 100% |
| Scanner      | N/A                | N/A                 | ≥80%     | API integration 100%      |

---

## Spawn Test Lead for Planning

```markdown
Task(
subagent_type: "test-lead",
description: "Create test plan for {capability-name}",
prompt: "
Task: Create comprehensive test plan for capability

INPUTS (Read and synthesize):

1. Architecture: .capability-development/architecture.md
2. Implementation: .capability-development/implementation-summary.md
3. Quality Review: .capability-development/code-quality-review.md (from Phase 11)

CAPABILITY TYPE: {vql|nuclei|janus|fingerprintx|scanner}

ANALYZE and create test plan specifying:

1. QUALITY TARGETS (from capability type)

   For VQL:
   - Detection Accuracy: ≥95% (CRITICAL - must detect real vulnerabilities)
   - False Positive Rate: ≤5% (HIGH - reduce noise)
   - Query Performance: ≤60s on typical system
   - Coverage: ≥80%

   For Nuclei:
   - Detection Accuracy: ≥95% (CRITICAL - must detect vulnerabilities)
   - False Positive Rate: ≤2% (CRITICAL - stricter for web scanning)
   - Request Count: ≤3 per target
   - CVE Coverage: 100% of known variants
   - Coverage: ≥80%

   For Janus:
   - Pipeline Success Rate: ≥98%
   - Error Handling: 100% graceful failure
   - Result Accuracy: ≥99% aggregation correctness
   - Coverage: ≥80%

   For Fingerprintx:
   - Service Detection Accuracy: ≥98%
   - Version Accuracy: ≥90%
   - False Positive Rate: ≤1%
   - Protocol Correctness: 100%
   - Coverage: ≥80%

   For Scanner:
   - API Integration: 100% endpoints working
   - Result Accuracy: ≥99% normalization correctness
   - Rate Limit Handling: 100% graceful
   - Data Completeness: ≥95% field mapping
   - Coverage: ≥80%

2. REQUIRED TESTS (Priority Order)

   For VQL/Nuclei (Detection Capabilities):
   - Unit: Detection logic, query/template parsing
   - Detection: True positive validation against known vulnerabilities
   - False Positive: Validation against benign samples
   - Edge Case: Malformed input, edge conditions

   For Go Capabilities (Janus/Fingerprintx/Scanner):
   - Unit: Core logic, data transformation
   - Integration: External service/API interaction
   - Error Handling: Failure scenarios
   - Performance: Throughput, resource usage

3. TEST DATA REQUIREMENTS

   For Detection Capabilities:
   - Positive samples: Known vulnerable instances (20+)
   - Negative samples: Known benign instances (50+)
   - Edge cases: Malformed, partial, unusual configurations

   For Integration Capabilities:
   - Mock services: API responses, rate limits, errors
   - Live services: Docker containers for integration testing
   - Error scenarios: Timeouts, auth failures, malformed responses

4. ACCEPTANCE CRITERIA
   - All quality targets met
   - Zero anti-patterns detected
   - All tests pass consistently (3 runs)
   - No flaky tests

DELIVERABLE:
Save test plan to: .capability-development/test-plan.md

Return:
{
'status': 'complete',
'coverage_analysis': {
'detection_accuracy': { 'target': '95%', 'priority': 'CRITICAL' },
'false_positive_rate': { 'target': '5%', 'priority': 'HIGH' }
},
'tests_required': {
'unit': {count},
'detection': {count},
'integration': {count},
'total': {count}
}
}
"
)
```

---

## Test Plan Structure by Capability Type

### VQL Capability Test Plan

**Targets:** Detection ≥95%, FP ≤5%, Performance ≤60s, Coverage ≥80%

**Test Categories:**

- Detection Tests: True positive validation, variant detection
- False Positive Tests: Benign file validation
- Edge Cases: Empty files, permission denied, malformed content

**Test Data:** 20+ positive samples, 50+ negative samples, 10+ edge cases

### Nuclei Template Test Plan

**Targets:** Detection ≥95%, FP ≤2%, CVE Coverage 100%, Coverage ≥80%

**Test Categories:**

- Detection Tests: CVE detection, version coverage, matcher accuracy
- False Positive Tests: Patched version validation
- Edge Cases: WAF scenarios, timeouts, custom configs

**Test Data:** 10+ vulnerable containers, 20+ patched containers, all CVE variants

### Go Capability Test Plan (Janus/Fingerprintx/Scanner)

**Targets:** Detection ≥98% (Fingerprintx), Pipeline ≥98% (Janus), API 100% (Scanner), Coverage ≥80%

**Test Categories:**

- Unit Tests: Core logic, data transformation, interface methods
- Integration Tests: API interaction, service detection, tool chain execution
- Edge Cases: Malformed responses, timeouts, large datasets

**Test Data:** Mock API fixtures, Docker test services, error scenario mocks

---

## Anti-Patterns to Avoid

| Anti-Pattern                          | Detection                           | Remedy                                       |
| ------------------------------------- | ----------------------------------- | -------------------------------------------- |
| Testing detection with mock data only | No real vulnerability samples       | Use real CVE samples or vulnerable instances |
| Optimistic coverage claims            | Counting lines, not detection paths | Test actual detection scenarios              |
| Skipping false positive validation    | No negative sample tests            | Add benign sample test suite                 |
| Mock returns asserted value           | `mockFn.mockReturn(x); expect(x)`   | Test real detection behavior                 |
| Testing implementation details        | Testing internal query structure    | Test detection outcomes                      |

---

## Update MANIFEST.yaml

```yaml
phases:
  12_test_planning:
    status: "complete"
    completed_at: "{timestamp}"
    agent: "test-lead"
    capability_type: "{vql|nuclei|janus|fingerprintx|scanner}"

test_plan:
  location: ".capability-development/test-plan.md"

  quality_targets:
    detection_accuracy: "95%" # capability-specific
    false_positive_rate: "5%" # capability-specific
    coverage: "80%"

  tests_required:
    unit: 8
    detection: 5
    integration: 4
    edge_case: 3
    total: 20

  test_data:
    positive_samples: 20
    negative_samples: 50
    edge_cases: 10

  anti_patterns:
    - "No mock-only detection tests"
    - "No skipping false positive validation"
    - "No implementation-detail testing"
```

---

## User Report

```markdown
## Test Planning Complete

**Capability Type:** {type}

**Quality Targets:**
| Metric | Target | Priority |
|--------|--------|----------|
| Detection Accuracy | 95% | CRITICAL |
| False Positive Rate | 5% | HIGH |
| Test Coverage | 80% | HIGH |

**Tests Required:**

- Unit: 8
- Detection: 5
- Integration: 4
- Edge Case: 3
- **Total: 20**

**Test Data Required:**

- Positive samples: 20
- Negative samples: 50
- Edge cases: 10

**Anti-Patterns to Avoid:**

- No mock-only detection tests
- No skipping false positive validation
- Test outcomes, not implementation

**Test Plan:** .capability-development/test-plan.md

→ Proceeding to Phase 13: Testing
```

---

## Skip Conditions

| Work Type | Test Planning                    |
| --------- | -------------------------------- |
| BUGFIX    | Skip (test at bug location only) |
| SMALL     | Skip (minimal test scope)        |
| MEDIUM    | Run                              |
| LARGE     | Run                              |

---

## Edge Cases

### Capability Requires External Test Data

For CVE-specific capabilities:

1. Document required test data in plan
2. Provide guidance for obtaining samples
3. If samples unavailable, escalate to user

### Multiple Capability Types

If implementation spans multiple types:

1. Create unified test plan covering all types
2. Apply strictest quality target from any type
3. Document type-specific test sections

---

## Related References

- [Phase 11: Code Quality](phase-11-code-quality.md) - Previous phase
- [Phase 13: Testing](phase-13-testing.md) - Next phase (testers implement plan)
- [Quality Standards](quality-standards.md) - Capability-specific quality metrics
- [prompts/test-lead-prompt.md](prompts/test-lead-prompt.md) - Test lead prompt template
