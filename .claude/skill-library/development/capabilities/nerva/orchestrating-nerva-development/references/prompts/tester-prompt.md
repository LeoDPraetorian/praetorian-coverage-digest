# Capability Tester Prompt Template (Fingerprintx)

Use this template when spawning capability-tester agent in Phase 13.

## Usage

```typescript
Task({
  subagent_type: "capability-tester",
  description: "Test [protocol] fingerprintx plugin",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are testing fingerprintx plugin: [PROTOCOL_NAME]

## Plugin Context

**Service**: [PROTOCOL_NAME]
**Plugin Location**: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/plugin.go`
**Test Location**: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol]_test.go`

## Test Plan (from Phase 12)

[PASTE test strategy from test-plan.md]

## Protocol Patterns

[PASTE response patterns and edge cases from protocol-research.md]

## Output Directory

OUTPUT_DIRECTORY: .fingerprintx-development

Write test results to agents/capability-tester.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Follow TDD discipline
2. **Read(".claude/skill-library/development/capabilities/validating-live-with-shodan/SKILL.md")** - Shodan validation
3. **verifying-before-completion** - Verify results before claiming done

## Your Job

### Phase A: Unit Test Execution

1. Run existing unit tests:
   ```bash
   go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/... -v
   ```
2. Verify all tests pass
3. Check coverage:
   ```bash
   go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/... -cover
   ```

### Phase B: Additional Tests (if needed)

Add tests for any uncovered scenarios:

- [ ] Empty response handling
- [ ] Truncated response handling
- [ ] Wrong protocol type response
- [ ] Missing required fields
- [ ] Connection timeout
- [ ] Version detection edge cases

### Phase C: Docker Container Testing

Test against real service containers:

```bash
# Start container
docker run -d --name [protocol]-test -p [PORT]:[PORT] [IMAGE]:[VERSION]

# Run fingerprintx
./fingerprintx -t localhost:[PORT]

# Verify detection
# Expected: [PROTOCOL_NAME] detected with version [VERSION]

# Stop container
docker stop [protocol]-test && docker rm [protocol]-test
```

Docker images to test:
[LIST Docker images with versions from test-plan.md]

### Phase D: Shodan Validation (if API key available)

```bash
# Check if API key exists
echo $SHODAN_API_KEY

# If available, run validation
[Shodan validation commands from test-plan.md]
```

**If SHODAN_API_KEY not set:**

1. DO NOT silently skip
2. Report limitation in output
3. Document that live validation was not performed

## Test Checklist

- [ ] Unit tests executed (all pass)
- [ ] Coverage verified (≥80% target)
- [ ] Docker container tests (per version)
- [ ] Shodan validation (if API available)
- [ ] Edge cases covered
- [ ] Results documented

## Test Results Structure

```markdown
# Test Results: [Protocol] Fingerprintx Plugin

## Unit Tests

- **Total**: X tests
- **Passing**: X tests
- **Failing**: 0 tests
- **Coverage**: XX%

## Docker Container Tests

| Container | Version | Detection | Version Detected | Result |
| --------- | ------- | --------- | ---------------- | ------ |
| [image]   | 5.7     | ✓         | 5.7.x            | PASS   |
| [image]   | 8.0     | ✓         | 8.0.x            | PASS   |

## Shodan Validation

- **Status**: Performed / Skipped (no API key)
- **Targets tested**: X
- **Detection rate**: XX%
- **Version accuracy**: XX%

## Limitations

[Any skipped tests or known limitations]
```

## Output Format

```json
{
  "agent": "capability-tester",
  "output_type": "test_results",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": [
    "developing-with-tdd",
    "validating-live-with-shodan",
    "verifying-before-completion"
  ],
  "status": "complete",
  "unit_tests": {
    "total": 15,
    "passing": 15,
    "failing": 0,
    "coverage": "85%"
  },
  "docker_tests": {
    "performed": true,
    "versions_tested": 3,
    "all_passed": true
  },
  "shodan_validation": {
    "performed": true,
    "detection_rate": "95%"
  },
  "verdict": "PASS|FAIL",
  "handoff": {
    "next_agent": "orchestrator",
    "context": "Testing complete, [verdict]"
  }
}
```

### If Tests Fail

```json
{
  "status": "complete",
  "verdict": "FAIL",
  "failures": [
    {
      "test": "test_name",
      "error": "error message",
      "file": "file_test.go:line"
    }
  ],
  "handoff": {
    "next_agent": "orchestrator",
    "context": "Tests failed, returning to implementation"
  }
}
```

### If Docker Unavailable

Report via output, do NOT silently skip:

```json
{
  "docker_tests": {
    "performed": false,
    "reason": "Docker unavailable",
    "user_acknowledged": true
  }
}
```
````
