# Phase 8: Testing

Create and execute comprehensive tests for the security capability.

## Purpose

Validate capability behavior through:

- Test plan creation (test-lead)
- Test implementation (capability-tester)
- Test validation (test-lead)
- Full test suite execution

## Quick Reference

| Step | Agent             | Output             | Checkpoint                     |
| ---- | ----------------- | ------------------ | ------------------------------ |
| 1    | test-lead         | test-plan.md       | -                              |
| 2    | capability-tester | Test files         | -                              |
| 3    | test-lead         | test-validation.md | 🔄 MAX 3 RETRIES - then escalate |
| 4    | Run tests         | Test results       | -                              |

## Step 1: Test Planning

### Agent Spawning

```typescript
Task("test-lead", {
  description: "Create test plan for capability",
  prompt: `Create test plan for ${capabilityType} capability.

    INPUT_FILES:
    - ${OUTPUT_DIR}/architecture.md (detection logic, edge cases)
    - ${OUTPUT_DIR}/review.md (approved implementation)
    - ${files_created} (code to test)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    MANDATORY SKILLS (invoke ALL before completing):
    - persisting-agent-outputs: For writing output files
    - gateway-testing: For test strategy patterns

    Create test-plan.md with:
    1. Test Categories - Unit, integration, acceptance
    2. Test Cases - Specific scenarios to validate
    3. Test Data - Fixtures and mock responses
    4. Success Criteria - Coverage and quality targets

    Focus on capability-specific quality metrics.`,
  subagent_type: "test-lead",
});
```

### Test Plan Format

```markdown
# Test Plan - ${Capability Name}

## Test Strategy

### Unit Tests

[Test detection logic, parsing, data transformation]

### Integration Tests

[Test with live services, APIs, or tools]

### Acceptance Tests

[End-to-end validation matching architecture requirements]

---

## Test Cases

### TC1: Happy Path - ${scenario}

- **Input**: ${input}
- **Expected**: ${expected_output}
- **Validates**: ${what_this_proves}

### TC2: Edge Case - ${scenario}

- **Input**: ${input}
- **Expected**: ${expected_behavior}
- **Validates**: ${what_this_proves}

[Additional test cases...]

---

## Test Data

### Fixtures

[Mock responses, sample files, test containers]

### Mocks

[External dependencies to mock]

---

## Success Criteria

- **Coverage**: ≥ 80% (or capability-specific target)
- **Detection Accuracy**: ≥ 95% (capability-specific)
- **False Positive Rate**: ≤ 5% (capability-specific)
- **All Tests Pass**: 100%
```

## Step 2: Test Implementation

### Agent Spawning

```typescript
Task("capability-tester", {
  description: "Implement tests for capability",
  prompt: `Implement tests following test plan for ${capabilityType} capability.

    INPUT_FILES:
    - ${OUTPUT_DIR}/test-plan.md (test cases and strategy)
    - ${OUTPUT_DIR}/architecture.md (capability logic)
    - ${files_created} (code under test)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    MANDATORY SKILLS (invoke ALL before completing):
    - persisting-agent-outputs: For writing output files
    - gateway-testing: For test implementation patterns
    - gateway-capabilities: For capability-specific test patterns

    Create test files following test plan.
    Implement all test cases from plan.
    Create fixtures and mocks as needed.
    Run tests and capture results.

    Output test-summary.md with test execution results.`,
  subagent_type: "capability-tester",
});
```

### Test File Locations by Type

#### VQL Capabilities

```
modules/chariot-aegis-capabilities/vql/tests/
└── ${capability-name}_test.vql
```

#### Nuclei Templates

```
modules/nuclei-templates/tests/
└── ${capability-name}_test.yaml
```

#### Janus Tool Chains

```
modules/janus-framework/pkg/chains/
└── ${capability-name}_test.go
```

#### Fingerprintx Modules

```
modules/fingerprintx/pkg/plugins/services/${service}/
└── ${service}_test.go
```

#### Scanner Integrations

```
modules/chariot/backend/pkg/scanner/${scanner}/
└── ${scanner}_test.go
```

## Step 3: Test Validation

### Agent Spawning

```typescript
Task("test-lead", {
  description: "Validate test implementation",
  prompt: `Validate tests against test plan for ${capabilityType} capability.

    INPUT_FILES:
    - ${OUTPUT_DIR}/test-plan.md (original plan)
    - ${OUTPUT_DIR}/test-summary.md (test results)
    - ${test_files} (test code)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    Validate:
    1. All test cases from plan implemented
    2. Coverage targets met
    3. Quality metrics achieved
    4. All tests passing

    Output test-validation.md with APPROVED or CHANGES_REQUESTED.`,
  subagent_type: "test-lead",
});
```

### Validation Report Format

```markdown
# Test Validation - ${Capability Name}

## Status: APPROVED | CHANGES_REQUESTED

---

## PLAN COVERAGE

- [x] All test cases from plan implemented
- [x] Fixtures and mocks created
- [x] Success criteria addressed

---

## QUALITY METRICS

### Coverage: ${actual}% (target: ${target}%)

[✅ Met | ❌ Not met]

### Detection Accuracy: ${actual}% (target: ${target}%)

[✅ Met | ❌ Not met]

### False Positive Rate: ${actual}% (target: ${target}%)

[✅ Met | ❌ Not met]

### Test Pass Rate: ${actual}%

[✅ 100% | ❌ <100%]

---

## ISSUES [If CHANGES_REQUESTED]

1. **Issue**: [Description]
   - **Fix**: [Required action]

---

## VERDICT

[If APPROVED]
Tests approved. Ready for final verification.

[If CHANGES_REQUESTED]
Tests require changes. Return to capability-tester.
```

## Retry Logic (MAX 3 RETRIES)

Same pattern as Phase 7 (Review):

1. **First validation: CHANGES_REQUESTED** → Re-invoke capability-tester with fixes → Re-validate
2. **Second validation: CHANGES_REQUESTED** → Re-invoke capability-tester with fixes → Re-validate
3. **Third validation: CHANGES_REQUESTED** → Re-invoke capability-tester with fixes → Re-validate
4. **Fourth validation: CHANGES_REQUESTED** → Escalate to user via AskUserQuestion

## Step 4: Run Full Test Suite

After test-lead approves, run full test suite:

### VQL Capabilities

```bash
# No standard test runner - manual validation
# Test VQL against Velociraptor instance
```

### Nuclei Templates

```bash
cd modules/nuclei-templates
nuclei -t ${capability-name}.yaml -target ${test_target}
```

### Janus Tool Chains

```bash
cd modules/janus-framework
go test ./pkg/chains/${capability-name}_test.go -v
```

### Fingerprintx Modules

```bash
cd modules/fingerprintx
go test ./pkg/plugins/services/${service}/... -v -cover
```

### Scanner Integrations

```bash
cd modules/chariot/backend
go test ./pkg/scanner/${scanner}/... -v -cover
# OR
cd modules/praetorian-cli
pytest tests/scanner/${scanner}/ -v
```

## metadata.json Updates

After testing completes (APPROVED):

```json
{
  "phases": {
    "testing": {
      "status": "complete",
      "test_plan_file": "test-plan.md",
      "test_validation_file": "test-validation.md",
      "retry_count": 0,
      "final_verdict": "APPROVED",
      "completed_at": "2026-01-04T15:30:00Z",
      "quality_metrics": {
        "coverage_percent": 87,
        "detection_accuracy_percent": 96,
        "false_positive_rate_percent": 3,
        "tests_passed": 15,
        "tests_total": 15
      }
    }
  },
  "current_phase": "complete",
  "status": "complete"
}
```

## Exit Criteria

Testing phase is complete when:

- [ ] test-lead created test plan
- [ ] capability-tester implemented all tests
- [ ] test-lead validated tests (APPROVED)
- [ ] retry_count ≤ 1
- [ ] Full test suite passing (100%)
- [ ] Coverage targets met
- [ ] Quality metrics achieved
- [ ] metadata.json updated with test results

## Common Issues

### "Tests failing intermittently"

**Solution**: Identify flaky tests. Add retries for network-dependent tests or stabilize test environment.

### "Coverage below target"

**Solution**: This is BLOCKING. capability-tester must add more tests. Re-validate after coverage improved.

### "Quality metrics not met"

**Solution**: This may indicate implementation issues. Consider returning to Phase 5 (Implementation) or Phase 4 (Architecture) if detection logic is flawed.

## Related

- [Phase 7: Review](phase-7-review.md) - Previous phase (validates code)
- [Quality Standards](quality-standards.md) - Quality metrics by capability type
- [Agent Handoffs](agent-handoffs.md) - Handoff format and retry logic
- [Troubleshooting](troubleshooting.md) - Test failure patterns
