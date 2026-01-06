# Tester Subagent Prompt Template

Use this template when dispatching capability-tester subagent in Phase 6 (Step 2).

## Usage

```typescript
Task({
  subagent_type: "capability-tester",
  description: "Implement tests for [capability]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing tests for capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

## Test Plan

[PASTE test-plan.md - all test categories, test cases, success criteria]

## Implementation

[PASTE implementation-log.md summary - what was built, where files are located]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write test files and test-summary.md to this directory.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **developing-with-tdd** - Follow TDD discipline for test implementation
3. **verifying-before-completion** - Verify all tests pass before claiming done

## Your Job

Implement ALL tests from test-plan.md:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test end-to-end detection flow
3. **Acceptance Tests**: Test with real/realistic targets

Follow the test plan EXACTLY - implement every test case specified.

## Test Implementation by Capability Type

### VQL Capabilities

- Framework: VQL test framework (if available) or manual validation
- Location: `modules/chariot-aegis-capabilities/tests/`
- Validation: Run against test targets

### Nuclei Templates

- Framework: Nuclei template testing
- Location: `modules/nuclei-templates/tests/`
- Validation: Run against test targets with nuclei CLI

### Janus Tool Chains

- Framework: Go testing (`testing` package)
- Location: `modules/janus/tests/`
- Validation: `go test ./...`

### Fingerprintx Modules

- Framework: Go testing (`testing` package)
- Location: `modules/fingerprintx/tests/`
- Validation: `go test ./...`

### Scanner Integrations

- Framework: Go testing (`testing` package)
- Location: `modules/chariot/backend/pkg/integrations/tests/`
- Validation: `go test ./...`

## Test Summary Structure

Create test-summary.md:

```markdown
# [Capability] Test Summary

## Summary

[2-3 sentences: What was tested, overall results]

## Test Implementation

| Test ID | Test Case          | Status    | Result    |
| ------- | ------------------ | --------- | --------- |
| U1      | [Unit test]        | PASS/FAIL | [Details] |
| U2      | ...                | ...       | ...       |
| I1      | [Integration test] | PASS/FAIL | [Details] |
| ...     | ...                | ...       | ...       |
| A1      | [Acceptance test]  | PASS/FAIL | [Details] |
| ...     | ...                | ...       | ...       |

## Test Files Created

| File | Type | Tests | Lines |
| ---- | ---- | ----- | ----- |
| ...  | ...  | ...   | ...   |

## Test Results Summary

- **Total Tests**: [N]
- **Passing**: [N]
- **Failing**: [N]
- **Skipped**: [N]

## Quality Metrics

### Detection Accuracy

**Formula**: (True Positives + True Negatives) / Total Test Cases

| Scenario       | TP      | TN      | FP      | FN      | Accuracy |
| -------------- | ------- | ------- | ------- | ------- | -------- |
| Positive cases | [N]     | -       | -       | [N]     | [%]      |
| Negative cases | -       | [N]     | [N]     | -       | [%]      |
| **Overall**    | **[N]** | **[N]** | **[N]** | **[N]** | **[%]**  |

### False Positive Rate

**Formula**: False Positives / (False Positives + True Negatives)

**Result**: [%]

## Test Execution Details

### Environment

[How tests were run - test targets, mock services, etc.]

### Test Data

[What test data was used]

### Issues Encountered

[Any issues during test implementation or execution]

## Verification Checklist

- [ ] All tests from test-plan.md implemented
- [ ] All tests pass
- [ ] Detection accuracy >= target
- [ ] False positive rate <= target
- [ ] Test coverage >= target
```
````

## Output Format

Create structured JSON metadata at the end of test-summary.md:

```json
{
  "agent": "capability-tester",
  "output_type": "test_summary",
  "capability_type": "[type]",
  "skills_invoked": [
    "persisting-agent-outputs",
    "developing-with-tdd",
    "verifying-before-completion"
  ],
  "status": "complete",
  "total_tests": 0,
  "passing_tests": 0,
  "failing_tests": 0,
  "detection_accuracy": 0.0,
  "false_positive_rate": 0.0,
  "handoff": {
    "next_agent": "test-lead",
    "context": "[N] tests implemented, [N] passing, [accuracy]% detection accuracy"
  }
}
```

### If Blocked

If you cannot complete test implementation:

```json
{
  "status": "blocked",
  "blocked_reason": "test_failures|missing_test_data|unclear_test_plan|technical_limitation",
  "attempted": ["what you tried"],
  "failing_tests": ["list of test IDs that fail"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
