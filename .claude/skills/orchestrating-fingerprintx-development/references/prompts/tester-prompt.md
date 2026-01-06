# Capability Tester Prompt Template (Fingerprintx)

Use this template when spawning capability-tester agent in Phase 6.

## Usage

```typescript
Task({
  subagent_type: "capability-tester",
  description: "Write tests for [protocol] fingerprintx plugin",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are writing unit tests for fingerprintx plugin: [PROTOCOL_NAME]

## Plugin Context

**Service**: [PROTOCOL_NAME]
**Plugin Location**: `modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol].go`

## Implementation Summary (from Phase 5)

[PASTE key implementation details from implementation-log.md]

## Protocol Patterns

[PASTE response patterns and edge cases from protocol-research.md]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write test-summary.md to this directory.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **writing-fingerprintx-tests** - Test patterns (table-driven, mocks, edge cases)
2. **developing-with-tdd** - Follow TDD discipline
3. **persisting-agent-outputs** - Output file format and metadata

## Your Job

1. Create test file: `modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol]_test.go`
2. Write table-driven tests for parsing functions
3. Write response validation tests
4. Write message building tests (if applicable)
5. Cover edge cases: empty, truncated, wrong type, missing field
6. Run tests and verify: `go test ./pkg/plugins/services/[protocol]/... -v`

## Test Checklist

- [ ] Test file created in correct location
- [ ] Table-driven tests for parsing functions
- [ ] Response validation tests
- [ ] Message building tests (if applicable)
- [ ] Edge cases covered:
  - [ ] Empty response
  - [ ] Truncated response
  - [ ] Wrong protocol type
  - [ ] Missing required fields
- [ ] All tests pass
- [ ] Coverage ≥80%

## Test Patterns

Use these fingerprintx testing patterns:

```go
func TestParse[Protocol](t *testing.T) {
    tests := []struct {
        name     string
        input    []byte
        expected *Result
        wantErr  bool
    }{
        {
            name:     "valid response",
            input:    []byte{...},
            expected: &Result{...},
            wantErr:  false,
        },
        {
            name:     "empty response",
            input:    []byte{},
            expected: nil,
            wantErr:  true,
        },
        // ... more cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Parse[Protocol](tt.input)
            // assertions
        })
    }
}
```
````

## Output Format

Create test-summary.md with structured JSON metadata:

```json
{
  "agent": "capability-tester",
  "output_type": "test_summary",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": [
    "writing-fingerprintx-tests",
    "developing-with-tdd",
    "persisting-agent-outputs"
  ],
  "status": "complete",
  "total_tests": 0,
  "passing_tests": 0,
  "coverage": "0%",
  "files_created": ["modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol]_test.go"],
  "handoff": {
    "next_agent": null,
    "context": "Tests implemented, ready for validation phase"
  }
}
```

### If Blocked

If you cannot complete testing:

```json
{
  "status": "blocked",
  "blocked_reason": "test_failures|missing_plugin|unclear_patterns",
  "attempted": ["what you tried"],
  "failing_tests": ["list of test names"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
