# Phase 13: Testing

**Execute tests by spawning capability-specific test agents in parallel.**

---

## Overview

Testing executes the test plan by spawning test agents with capability-specific agent configurations and test frameworks.

**Entry Criteria:** Phase 12 (Test Planning) complete with test plan.

**Exit Criteria:** All tests passing, quality targets met.

**COMPACTION GATE 3 FOLLOWS:** Before proceeding to Phase 14, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Capability Test Configuration

| Capability Type | Test Agents            | Frameworks                            |
| --------------- | ---------------------- | ------------------------------------- |
| VQL             | `capability-tester` x3 | VQL parser, Velociraptor test harness |
| Nuclei          | `capability-tester` x3 | nuclei -validate, Docker targets      |
| Janus           | `capability-tester` x3 | Go testing, testify                   |
| Fingerprintx    | `capability-tester` x3 | Go testing, testify, Docker services  |
| Scanner         | `capability-tester` x3 | Go testing, httptest, mock APIs       |

---

## Detection Capability Testing Pattern (VQL/Nuclei)

**Spawn ALL 3 testers in a SINGLE message:**

```markdown
# Detection tests

Task(
subagent_type: "capability-tester",
description: "Detection tests for {capability}",
prompt: "
TEST MODE: detection

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {vql|nuclei}

REQUIREMENTS:

1. Follow test plan for detection tests
2. Test against positive samples (known vulnerabilities)
3. Validate detection accuracy ≥95%
4. Save results with evidence

Verify tests pass. Save summary to: .capability-development/test-summary-detection.md

Return: { 'status', 'tests_created', 'tests_passed', 'detection_rate', 'plan_adherence' }
"
)

# False positive tests (PARALLEL)

Task(
subagent_type: "capability-tester",
description: "False positive tests for {capability}",
prompt: "
TEST MODE: false_positive

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {vql|nuclei}

REQUIREMENTS:

1. Follow test plan for FP validation
2. Test against negative samples (benign instances)
3. Validate FP rate ≤5% (VQL) or ≤2% (Nuclei)
4. Document any false positives found

Save summary to: .capability-development/test-summary-fp.md

Return: { 'status', 'tests_created', 'tests_passed', 'fp_rate', 'plan_adherence' }
"
)

# Edge case tests (PARALLEL)

Task(
subagent_type: "capability-tester",
description: "Edge case tests for {capability}",
prompt: "
TEST MODE: edge_case

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {vql|nuclei}

REQUIREMENTS:

1. Follow test plan for edge cases
2. Test malformed input, timeouts, unusual configs
3. Verify graceful handling
4. No crashes or hangs

Save summary to: .capability-development/test-summary-edge.md

Return: { 'status', 'tests_created', 'tests_passed', 'plan_adherence' }
"
)
```

---

## Go Capability Testing Pattern (Janus/Fingerprintx/Scanner)

**Spawn ALL 3 testers in a SINGLE message:**

```markdown
# Unit tests

Task(
subagent_type: "capability-tester",
description: "Unit tests for {capability}",
prompt: "
TEST MODE: unit

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {janus|fingerprintx|scanner}

REQUIREMENTS:

1. Follow test plan for unit tests
2. Use Go testing + testify
3. Test core logic, data transformation
4. Achieve ≥80% coverage
5. Verify with: go test ./... -cover

Save summary to: .capability-development/test-summary-unit.md

Return: { 'status', 'tests_created', 'tests_passed', 'coverage_percent', 'plan_adherence' }
"
)

# Integration tests (PARALLEL)

Task(
subagent_type: "capability-tester",
description: "Integration tests for {capability}",
prompt: "
TEST MODE: integration

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {janus|fingerprintx|scanner}

REQUIREMENTS:

1. Follow test plan for integration tests
2. Test external interaction (API, services)
3. Use mock services or Docker containers
4. Test error handling for external failures
5. Verify with: go test -tags=integration ./...

Save summary to: .capability-development/test-summary-integration.md

Return: { 'status', 'tests_created', 'tests_passed', 'plan_adherence' }
"
)

# Error handling tests (PARALLEL)

Task(
subagent_type: "capability-tester",
description: "Error handling tests for {capability}",
prompt: "
TEST MODE: error_handling

PLAN LOCATION: .capability-development/test-plan.md
CAPABILITY TYPE: {janus|fingerprintx|scanner}

REQUIREMENTS:

1. Follow test plan for error scenarios
2. Test timeouts, auth failures, malformed responses
3. Verify graceful failure (no panic)
4. Test rate limit handling (Scanner)
5. Verify error propagation

Save summary to: .capability-development/test-summary-errors.md

Return: { 'status', 'tests_created', 'tests_passed', 'plan_adherence' }
"
)
```

---

## Verification Commands

### VQL Capabilities

```bash
# Run VQL against test harness (if available)
# Manual verification against Velociraptor instance
```

### Nuclei Templates

```bash
# Validate template syntax
nuclei -validate -t {template_file}

# Test against vulnerable target
nuclei -t {template_file} -target {test_target}

# Test against patched target (should not match)
nuclei -t {template_file} -target {patched_target}
```

### Go Capabilities

```bash
# Unit tests with coverage
go test -coverprofile=coverage.out ./...

# Integration tests
go test -tags=integration ./...

# View coverage
go tool cover -func=coverage.out
```

---

## Update MANIFEST.yaml

```yaml
phases:
  13_testing:
    status: "complete"
    completed_at: "{timestamp}"

testing:
  capability_type: "{vql|nuclei|janus|fingerprintx|scanner}"

  agents_used:
    - capability-tester (detection)
    - capability-tester (false_positive)
    - capability-tester (edge_case)

  results:
    detection:
      tests_created: 8
      tests_passed: 8
      detection_rate: 97
      summary: ".capability-development/test-summary-detection.md"
    false_positive:
      tests_created: 5
      tests_passed: 5
      fp_rate: 3
      summary: ".capability-development/test-summary-fp.md"
    edge_case:
      tests_created: 4
      tests_passed: 4
      summary: ".capability-development/test-summary-edge.md"

  verification:
    all_tests_passed: true
    quality_targets_met: true
```

---

## User Report

```markdown
## Testing Complete

**Capability Type:** VQL

**Test Results:**
| Mode | Created | Passed | Metric |
|------|---------|--------|--------|
| Detection | 8 | 8 | 97% accuracy |
| False Positive | 5 | 5 | 3% FP rate |
| Edge Case | 4 | 4 | All handled |

**Plan Adherence:** All testers followed test plan

**Test Summaries:**

- test-summary-detection.md
- test-summary-fp.md
- test-summary-edge.md

→ Proceeding to Compaction Gate 3, then Phase 14: Coverage Verification
```

---

## Test Type Matrix by Capability

| Capability   | Detection | FP Validation | Unit     | Integration | Error    |
| ------------ | --------- | ------------- | -------- | ----------- | -------- |
| VQL          | Required  | Required      | -        | -           | Required |
| Nuclei       | Required  | Required      | -        | -           | Required |
| Janus        | -         | -             | Required | Required    | Required |
| Fingerprintx | Required  | Required      | Required | Required    | Required |
| Scanner      | -         | -             | Required | Required    | Required |

---

## Skip Conditions

| Work Type | Testing                   |
| --------- | ------------------------- |
| BUGFIX    | Run (focused on bug area) |
| SMALL     | Run (minimal scope)       |
| MEDIUM    | Run                       |
| LARGE     | Run                       |

Testing always runs, but scope varies by work type.

---

## Related References

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase (test plan creation)
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 3 follows this phase
- [Quality Standards](quality-standards.md) - Quality targets by capability type
