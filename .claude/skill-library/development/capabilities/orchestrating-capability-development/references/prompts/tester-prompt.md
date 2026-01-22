# Tester Prompt Templates

**Phase 13 prompts for capability-tester.**

---

## Capability Tester - Detection Tests

```markdown
Task(
subagent_type: "capability-tester",
description: "Detection tests for {capability}",
prompt: "

## Task: Write Detection Tests

### Test Mode: Detection

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Test Plan Location

.capability-development/test-plan.md

### Capability Files to Test

{From implementation summary}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Framework by Type

**VQL:** Go test harness or VQL test framework
**Nuclei:** nuclei -validate + known-vulnerable targets
**Janus:** Go testing package
**Fingerprintx:** Go testing package
**Scanner:** Go testing package with mock server

### Requirements

1. Follow test plan requirements for detection tests
2. Test against known-positive samples
3. Minimum 20 positive samples (VQL, Nuclei, Fingerprintx)
4. Verify detection accuracy meets threshold (>=95% or >=98%)

### Test Cases to Cover

- Basic detection scenario
- Complex/nested detection scenario
- Edge case: minimal indicators
- Edge case: obfuscated/encoded data
- Multi-platform (if applicable)

### Accuracy Target

{See quality-standards.md for type-specific target}

### Verification

{Type-specific verification command}

### Output Location

.capability-development/test-summary-detection.md

### Output Format

{
'status': 'complete',
'test_mode': 'detection',
'tests_created': {count},
'tests_passed': {count},
'total_samples': {count},
'true_positives': {count},
'detection_accuracy': {percentage},
'plan_adherence': true
}
"
)
```

---

## Capability Tester - False Positive Tests

```markdown
Task(
subagent_type: "capability-tester",
description: "False positive tests for {capability}",
prompt: "

## Task: Write False Positive Tests

### Test Mode: False Positive

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Test Plan Location

.capability-development/test-plan.md

### Capability Files to Test

{From implementation summary}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Requirements

1. Follow test plan requirements for FP tests
2. Test against known-negative (clean) samples
3. Minimum sample counts:
   - VQL: 20 clean samples
   - Nuclei: 50 clean targets
   - Fingerprintx: 100 clean services
4. Verify FP rate meets threshold

### Test Cases to Cover

- Clean sample with similar structure
- Clean sample with partial indicators
- Clean sample with decoy patterns
- Edge case: boundary conditions

### False Positive Threshold

**VQL:** <=5%
**Nuclei:** <=2%
**Fingerprintx:** <=1%

### Verification

{Type-specific verification command}

### Output Location

.capability-development/test-summary-fp.md

### Output Format

{
'status': 'complete',
'test_mode': 'false_positive',
'tests_created': {count},
'tests_passed': {count},
'total_clean_samples': {count},
'false_positives': {count},
'fp_rate': {percentage},
'plan_adherence': true
}
"
)
```

---

## Capability Tester - Edge Case Tests

```markdown
Task(
subagent_type: "capability-tester",
description: "Edge case tests for {capability}",
prompt: "

## Task: Write Edge Case Tests

### Test Mode: Edge Cases

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Test Plan Location

.capability-development/test-plan.md

### Capability Files to Test

{From implementation summary}

### MANDATORY SKILLS TO READ FIRST

- developing-with-tdd
  {skills_by_domain.testing.library_skills from skill-manifest.yaml}

### Requirements

1. Follow test plan requirements for edge case tests
2. Test error handling and recovery
3. Test timeout scenarios
4. Test resource exhaustion handling
5. Test malformed input handling

### Edge Cases by Type

**VQL:**

- Empty result sets
- Very large result sets
- Malformed artifacts
- Missing required fields
- Timeout scenarios
- Platform-specific edge cases

**Nuclei:**

- Timeout responses
- Malformed HTTP responses
- Redirect chains
- Connection failures
- Rate limit responses

**Janus:**

- Tool chain failures (partial)
- Timeout in middle of chain
- Invalid input propagation
- Concurrent execution edge cases

**Fingerprintx:**

- Connection refused
- Connection timeout
- Malformed responses
- Protocol negotiation failures
- Multi-service port scenarios

**Scanner:**

- API authentication failures
- Rate limit responses (429)
- Server errors (500)
- Pagination edge cases
- Timeout scenarios

### Verification

{Type-specific verification command}

### Output Location

.capability-development/test-summary-edge.md

### Output Format

{
'status': 'complete',
'test_mode': 'edge_cases',
'tests_created': {count},
'tests_passed': {count},
'edge_cases_covered': [...],
'error_handling_verified': true,
'plan_adherence': true
}
"
)
```

---

## Parallel Spawn Pattern

Spawn ALL capability testers in a SINGLE message:

```markdown
# Capability Tests (all 3 in parallel)

Task("capability-tester", "Detection tests...", {detection_prompt})
Task("capability-tester", "False positive tests...", {fp_prompt})
Task("capability-tester", "Edge case tests...", {edge_prompt})
```

---

## Test Coverage Summary

After all testers complete, aggregate results:

| Test Mode      | VQL            | Nuclei         | Janus         | Fingerprintx   | Scanner           |
| -------------- | -------------- | -------------- | ------------- | -------------- | ----------------- |
| Detection      | >=95% accuracy | >=95% accuracy | N/A           | >=98% accuracy | N/A               |
| False Positive | <=5% FP        | <=2% FP        | N/A           | <=1% FP        | N/A               |
| Edge Cases     | All pass       | All pass       | All pass      | All pass       | All pass          |
| Pipeline       | N/A            | N/A            | >=98% success | N/A            | N/A               |
| Integration    | N/A            | N/A            | N/A           | N/A            | 100% API coverage |

---

## Related References

- [Phase 13: Testing](../phase-13-testing.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection by capability type
- [Quality Standards](../quality-standards.md) - Test thresholds
