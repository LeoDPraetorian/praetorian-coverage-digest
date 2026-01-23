# Phase 13: Testing

**Execute tests by spawning capability-specific test agents in parallel.**

---

## Overview

Testing executes the test plan by spawning test agents with fingerprintx-specific agent configurations and test patterns.

**Entry Criteria:** Phase 12 (Test Planning) complete with test plan.

**Exit Criteria:** All tests passing, coverage targets met.

**COMPACTION GATE 3 FOLLOWS:** Before proceeding to Phase 14, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Fingerprintx Test Configuration

| Test Type         | Test Agent          | Framework                |
| ----------------- | ------------------- | ------------------------ |
| Unit              | `capability-tester` | Go testing + testify     |
| Integration       | `capability-tester` | Go net/httptest          |
| Shodan Validation | `capability-tester` | Go testing + Shodan data |

---

## Fingerprintx Testing Pattern

**Spawn ALL 3 testers in a SINGLE message:**

### Unit Tests

````markdown
Task(
subagent_type: "capability-tester",
description: "Unit tests for {protocol} plugin",
prompt: "
TEST MODE: unit

PLAN LOCATION: .fingerprintx-development/test-plan.md

FILES TO TEST:
{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go

REQUIREMENTS:

1. Follow test plan requirements for unit tests
2. Use Go testing package + testify
3. Test detection logic with table-driven tests
4. Test version extraction happy and failure paths
5. Test banner parsing edge cases
6. Achieve 95% coverage on detection logic
7. Avoid anti-patterns from test plan:
   - NO happy path only tests
   - NO testing implementation details
   - NO mocking Match() method itself
8. Verify tests pass with: go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

**Test file location:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}\_test.go

**Table-driven test pattern:**

```go
func TestDetection(t *testing.T) {
    tests := []struct {
        name     string
        banner   []byte
        expected *ServiceMatch
    }{
        {\"valid banner\", validBanner, expectedMatch},
        {\"invalid banner\", invalidBanner, nil},
        {\"empty response\", []byte{}, nil},
        {\"truncated banner\", truncatedBanner, nil},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test detection
        })
    }
}
```
````

Save summary to: .fingerprintx-development/test-summary-unit.md

Return:
{
'status': 'complete',
'test_mode': 'unit',
'tests_created': {count},
'tests_passed': {count},
'coverage_percent': {coverage},
'plan_adherence': true
}
"
)

````

### Integration Tests (PARALLEL)

```markdown
Task(
  subagent_type: "capability-tester",
  description: "Integration tests for {protocol} plugin",
  prompt: "
TEST MODE: integration

PLAN LOCATION: .fingerprintx-development/test-plan.md

REQUIREMENTS:
1. Follow test plan requirements for integration tests
2. Use Go net package or mock server
3. Test full plugin flow: connect -> read -> detect -> return
4. Test timeout handling (server doesn't respond)
5. Test connection failure handling (port closed)
6. Test graceful handling of slow servers
7. Avoid anti-patterns from test plan
8. Verify tests pass with: go test -tags=integration ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

**Test file location:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_integration_test.go

**Mock server pattern:**
```go
func TestIntegration_FullFlow(t *testing.T) {
    // Start mock server
    ln, err := net.Listen(\"tcp\", \"127.0.0.1:0\")
    require.NoError(t, err)
    defer ln.Close()

    go func() {
        conn, _ := ln.Accept()
        conn.Write(mockBanner)
        conn.Close()
    }()

    // Test plugin against mock server
}
````

Save summary to: .fingerprintx-development/test-summary-integration.md

Return:
{
'status': 'complete',
'test_mode': 'integration',
'tests_created': {count},
'tests_passed': {count},
'plan_adherence': true
}
"
)

````

### Shodan Validation Tests (PARALLEL)

```markdown
Task(
  subagent_type: "capability-tester",
  description: "Shodan validation tests for {protocol} plugin",
  prompt: "
TEST MODE: shodan_validation

PLAN LOCATION: .fingerprintx-development/test-plan.md
PROTOCOL RESEARCH: .fingerprintx-development/protocol-research.md

REQUIREMENTS:
1. Follow test plan requirements for Shodan validation
2. Use at least 3 real-world banners from Shodan
3. Document the Shodan query used to find each banner
4. Test detection accuracy against real banners
5. Test version extraction against real versions
6. Verify tests pass with: go test -tags=shodan ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

**Test file location:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_shodan_test.go

**Shodan validation pattern:**
```go
// Shodan query: product:{protocol}
var shodanBanners = []struct {
    name    string
    query   string  // Shodan query used
    banner  []byte  // Actual banner from Shodan
    version string  // Expected version
}{
    {\"Production server 1\", \"product:{protocol} country:US\", []byte{...}, \"1.2.3\"},
    {\"Production server 2\", \"product:{protocol} port:1234\", []byte{...}, \"2.0.0\"},
    {\"Legacy server\", \"product:{protocol} version:1.x\", []byte{...}, \"1.0.0\"},
}

func TestShodanValidation(t *testing.T) {
    for _, sb := range shodanBanners {
        t.Run(sb.name, func(t *testing.T) {
            match := plugin.Match(sb.banner)
            require.NotNil(t, match, \"Should detect %s\", sb.name)
            assert.Equal(t, sb.version, match.Version)
        })
    }
}
````

Save summary to: .fingerprintx-development/test-summary-shodan.md

Return:
{
'status': 'complete',
'test_mode': 'shodan_validation',
'tests_created': {count},
'tests_passed': {count},
'banners_validated': {count},
'plan_adherence': true
}
"
)

````

---

## Verification Commands

```bash
# Unit tests with coverage
go test -coverprofile=coverage.out ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# View coverage by function
go tool cover -func=coverage.out

# Integration tests
go test -tags=integration ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# Shodan validation tests
go test -tags=shodan ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# All tests
go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# Generate HTML coverage report
go tool cover -html=coverage.out -o coverage.html
````

---

## Update MANIFEST.yaml

```yaml
phases:
  13_testing:
    status: "complete"
    completed_at: "{timestamp}"

testing:
  plugin_type: "fingerprintx"

  agents_used:
    - capability-tester (unit)
    - capability-tester (integration)
    - capability-tester (shodan_validation)

  results:
    unit:
      tests_created: 8
      tests_passed: 8
      coverage_percent: 96
      summary: ".fingerprintx-development/test-summary-unit.md"
    integration:
      tests_created: 3
      tests_passed: 3
      summary: ".fingerprintx-development/test-summary-integration.md"
    shodan_validation:
      tests_created: 3
      tests_passed: 3
      banners_validated: 3
      summary: ".fingerprintx-development/test-summary-shodan.md"

  verification:
    all_tests_passed: true
    coverage_targets_met: true
    shodan_validation_passed: true
```

---

## User Report

```markdown
## Testing Complete

**Protocol:** {protocol}

**Test Results:**
| Mode | Created | Passed | Coverage |
|------|---------|--------|----------|
| Unit | 8 | 8 | 96% |
| Integration | 3 | 3 | - |
| Shodan Validation | 3 | 3 | - |

**Shodan Banners Validated:** 3

**Plan Adherence:** All testers followed test plan

**Test Summaries:**

- test-summary-unit.md
- test-summary-integration.md
- test-summary-shodan.md

Proceeding to Compaction Gate 3, then Phase 14: Coverage Verification
```

---

## Test Type Decision Matrix for Fingerprintx

| Plugin Characteristic | Unit     | Integration | Shodan   |
| --------------------- | -------- | ----------- | -------- |
| Detection logic       | Required | -           | -        |
| Banner parsing        | Required | -           | Required |
| Version extraction    | Required | -           | Required |
| Timeout handling      | -        | Required    | -        |
| Connection errors     | -        | Required    | -        |
| Real-world accuracy   | -        | -           | Required |

---

## Skip Conditions

| Work Type | Testing                   |
| --------- | ------------------------- |
| BUGFIX    | Run (focused on bug area) |
| SMALL     | Run (minimal scope)       |
| MODERATE  | Run                       |
| COMPLEX   | Run                       |

Testing always runs, but scope varies by work type.

---

## Related References

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase (test plan creation)
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 3 follows this phase
