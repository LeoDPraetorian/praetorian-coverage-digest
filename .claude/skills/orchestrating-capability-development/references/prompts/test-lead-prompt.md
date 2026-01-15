# Test Lead Subagent Prompt Template

Use this template when dispatching test-lead subagent in Phase 8 (Steps 1 and 3).

## Usage

### Step 1: Test Planning

```typescript
Task({
  subagent_type: "test-lead",
  description: "Create test plan for [capability]",
  prompt: `[Use Step 1 template below]`,
});
```

### Step 3: Test Validation

```typescript
Task({
  subagent_type: "test-lead",
  description: "Validate test implementation for [capability]",
  prompt: `[Use Step 3 template below]`,
});
```

## Step 1 Template: Test Planning

````markdown
You are creating a test plan for capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

## Architecture

[PASTE architecture.md - detection logic, quality targets, edge cases]

## Implementation

[PASTE implementation-log.md summary - what was implemented, verification results]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write your output to: [CAPABILITY_DIR]/test-plan.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata

## Your Job

Create a comprehensive test plan covering:

1. **Unit Tests**: Individual components (queries, matchers, parsers)
2. **Integration Tests**: End-to-end detection flow
3. **Acceptance Tests**: Real targets with known positive/negative cases

## Capability Test Coverage Pattern

### Required Test Categories

**1. Detection Accuracy (MUST HAVE)**
- True positive: Known vulnerable targets detected
- True negative: Patched/non-vulnerable targets NOT detected
- Boundary cases: Edge versions, partial patches

**2. False Positive Prevention (MUST HAVE)**
- Similar but non-vulnerable configurations
- Common false positive triggers
- Version edge cases

**3. Evasion Resistance (MUST HAVE)**
- Common evasion techniques
- Encoding variations
- Protocol edge cases

**4. Performance (MUST HAVE)**
- Single target timing
- Batch processing efficiency
- Resource usage

**5. Integration (IF APPLICABLE)**
- Scanner pipeline integration
- Output format compliance
- Error propagation

---

### Coverage Checklist

| Category | Test Case | Covered? | File |
|----------|-----------|----------|------|
| True Positive | [vulnerable target] | □ | |
| True Negative | [patched target] | □ | |
| False Positive | [similar config] | □ | |
| Evasion | [technique 1] | □ | |
| Performance | [timing test] | □ | |

**Minimum quality_score: 70**
- True/False positive coverage: 40 points
- Evasion resistance coverage: 20 points
- Performance tests: 20 points
- Integration tests: 20 points

## Test Plan Structure

Your test-plan.md MUST include:

```markdown
# [Capability] Test Plan

## Summary

[2-3 sentences describing test strategy]

## Quality Targets

- **Detection Accuracy**: [Target %]
- **False Positive Rate**: [Max acceptable %]
- **Coverage**: [Target %]

## Test Categories

### Unit Tests

| Test ID | Test Case     | Input        | Expected Output   |
| ------- | ------------- | ------------ | ----------------- |
| U1      | [Description] | [Input data] | [Expected result] |
| U2      | ...           | ...          | ...               |

### Integration Tests

| Test ID | Test Case     | Scenario | Expected Behavior |
| ------- | ------------- | -------- | ----------------- |
| I1      | [Description] | [Setup]  | [Expected result] |
| I2      | ...           | ...      | ...               |

### Acceptance Tests

| Test ID | Test Case                | Target  | Expected Detection  |
| ------- | ------------------------ | ------- | ------------------- |
| A1      | Known positive: [Target] | [Setup] | Detect successfully |
| A2      | Known negative: [Target] | [Setup] | No false positive   |
| A3      | Edge case: [Scenario]    | [Setup] | [Expected]          |

## Test Data Requirements

[What test data is needed - test servers, sample files, mock responses]

## Success Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All acceptance tests pass
- [ ] Detection accuracy >= [target]%
- [ ] False positive rate <= [target]%
- [ ] Coverage >= [target]%
```
````

## Output Format

Create structured JSON metadata at the end of test-plan.md:

```json
{
  "agent": "test-lead",
  "output_type": "test_plan",
  "capability_type": "[type]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "total_tests": 0,
  "handoff": {
    "next_agent": "capability-tester",
    "context": "Test plan created with [N] tests to implement"
  }
}
```

````

## Step 3 Template: Test Validation

```markdown
You are validating test implementation for capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

## Test Plan

[PASTE test-plan.md - test categories, success criteria]

## Test Implementation

[PASTE test summary from capability-tester - tests implemented, results]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write your output to: [CAPABILITY_DIR]/test-validation.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata

## Your Job

Validate test implementation against test plan:

1. Check all planned tests were implemented
2. Verify tests actually test what they claim to test
3. Validate detection accuracy meets targets
4. Confirm false positive rate is acceptable
5. Calculate quality score

## Quality Scoring

````

quality_score = (
(tests_implemented / tests_planned) _ 30 +
(tests_passing / tests_implemented) _ 30 +
(detection_accuracy / 100) _ 30 +
((100 - false_positive_rate) / 100) _ 10
)

````

**Threshold**: quality_score >= 70 to pass

## Validation Report Structure

Your test-validation.md MUST include:

```markdown
# [Capability] Test Validation

## Verdict

**Status**: APPROVED | CHANGES_REQUESTED

**Quality Score**: [Score] / 100

## Validation Results

### Test Plan Adherence

| Category | Planned | Implemented | Passing | Coverage |
|----------|---------|-------------|---------|----------|
| Unit | [N] | [N] | [N] | [%] |
| Integration | [N] | [N] | [N] | [%] |
| Acceptance | [N] | [N] | [N] | [%] |
| **Total** | **[N]** | **[N]** | **[N]** | **[%]** |

### Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Detection Accuracy | [%] | [%] | ✓/✗ |
| False Positive Rate | [%] | [%] | ✓/✗ |
| Test Coverage | [%] | [%] | ✓/✗ |

### Missing Tests (if any)

[List any planned tests that weren't implemented]

### Test Quality Issues (if any)

[List any tests that don't properly validate their claims]

## Required Changes (if CHANGES_REQUESTED)

1. [Issue]: [What's missing/wrong] → [How to fix]

## Quality Score Calculation

````

quality_score = (
([tests_impl] / [tests_plan]) _ 30 +
([tests_pass] / [tests_impl]) _ 30 +
([accuracy] / 100) _ 30 +
((100 - [fp_rate]) / 100) _ 10
) = [score]

```

## Next Steps

[If APPROVED]: Testing complete, capability validated
[If CHANGES_REQUESTED]: Tester must address issues
```

## Output Format

Create structured JSON metadata at the end of test-validation.md:

```json
{
  "agent": "test-lead",
  "output_type": "test_validation",
  "verdict": "APPROVED|CHANGES_REQUESTED",
  "quality_score": 0,
  "capability_type": "[type]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "handoff": {
    "next_agent": null,
    "context": "[If APPROVED] Testing validated | [If CHANGES_REQUESTED] N issues to fix"
  }
}
```

```

```
