# Phase 10: Domain Compliance

**Validate Brutus plugin implementation against mandatory patterns and P0 requirements.**

---

## Overview

Domain Compliance ensures the plugin implementation follows Brutus conventions and meets all P0 requirements before proceeding to code review.

**Entry Criteria:** Phase 8 (Implementation) complete, plugin code written.

**Exit Criteria:** All P0 checks pass, P1 checks documented, MANIFEST updated.

---

## P0 Requirements Checklist

### 1. Plugin Interface Implementation

**Check:** Plugin implements `brutus.Plugin` interface

```go
type Plugin interface {
    Name() string
    Test(ctx context.Context, target, username, password string,
         timeout time.Duration) *Result
}
```

**Validation:**
```bash
# Check plugin struct exists
grep -n "type Plugin struct" internal/plugins/{protocol}/{protocol}.go

# Check Name() method exists
grep -n "func.*Plugin.*Name\(\)" internal/plugins/{protocol}/{protocol}.go

# Check Test() method exists
grep -n "func.*Plugin.*Test\(" internal/plugins/{protocol}/{protocol}.go
```

**Pass Criteria:** All three elements found in plugin file.

---

### 2. Error Classification

**Check:** `classifyError()` helper distinguishes auth failure from connection error

**Required Pattern:**
```go
func classifyError(err error) error {
    if err == nil {
        return nil
    }

    errStr := err.Error()

    // Protocol-specific auth failure indicators
    authFailures := []string{
        "Access denied",
        "authentication failed",
        // ... protocol-specific patterns
    }

    for _, indicator := range authFailures {
        if strings.Contains(errStr, indicator) {
            return nil  // Auth failure, not connection error
        }
    }

    return fmt.Errorf("connection error: %w", err)
}
```

**Validation:**
```bash
# Check classifyError exists
grep -n "func classifyError" internal/plugins/{protocol}/{protocol}.go

# Check it returns nil for auth failures
grep -A 20 "func classifyError" internal/plugins/{protocol}/{protocol}.go | grep "return nil"
```

**Pass Criteria:** Function exists and returns nil for auth failure patterns.

---

### 3. Self-Registration

**Check:** Plugin registers via `init()` with `brutus.Register()`

**Required Pattern:**
```go
func init() {
    brutus.Register("{protocol}", func() brutus.Plugin {
        return &Plugin{}
    })
}
```

**Validation:**
```bash
# Check init() with brutus.Register
grep -n "func init()" internal/plugins/{protocol}/{protocol}.go
grep -n "brutus.Register" internal/plugins/{protocol}/{protocol}.go
```

**Pass Criteria:** Both init() and brutus.Register() found.

---

### 4. Import Registration

**Check:** Plugin imported in `internal/plugins/init.go`

**Required Pattern:**
```go
import (
    // ... other imports
    _ "github.com/praetorian-inc/brutus/internal/plugins/{protocol}"
)
```

**Validation:**
```bash
# Check import exists in init.go
grep "{protocol}" internal/plugins/init.go
```

**Pass Criteria:** Import statement found in init.go.

---

### 5. Default Port Handling

**Check:** `parseTarget()` handles default port for protocol

**Required Pattern:**
```go
func parseTarget(target string) string {
    if !strings.Contains(target, ":") {
        return target + ":{DEFAULT_PORT}"
    }
    return target
}
```

**Validation:**
```bash
# Check parseTarget exists
grep -n "func parseTarget" internal/plugins/{protocol}/{protocol}.go

# Check default port is set
grep -A 5 "func parseTarget" internal/plugins/{protocol}/{protocol}.go | grep ":"
```

**Pass Criteria:** Function exists and adds default port.

---

### 6. Unit Tests

**Check:** Required test cases exist

| Test | Description |
|------|-------------|
| `TestPlugin_Name` | Verifies Name() returns correct protocol name |
| `TestClassifyError` | Table-driven tests for error classification |
| `TestPlugin_Test_ContextCancellation` | Verifies cancelled context handling |
| `TestPlugin_Test_ConnectionError` | Verifies connection errors are reported |

**Validation:**
```bash
# Check test file exists
ls internal/plugins/{protocol}/{protocol}_test.go

# Check required tests exist
grep -c "func Test" internal/plugins/{protocol}/{protocol}_test.go

# Check specific tests
grep "TestPlugin_Name\|TestClassifyError\|ContextCancellation\|ConnectionError" \
    internal/plugins/{protocol}/{protocol}_test.go
```

**Pass Criteria:** Test file exists with at least 4 test functions.

---

### 7. Test Coverage

**Check:** Minimum 80% coverage for new plugin code

**Validation:**
```bash
cd {BRUTUS_ROOT}
go test -coverprofile=coverage.out ./internal/plugins/{protocol}/...
go tool cover -func=coverage.out | grep total
```

**Pass Criteria:** Total coverage >= 80.0%

---

### 8. Linting

**Check:** Plugin passes golangci-lint

**Validation:**
```bash
cd {BRUTUS_ROOT}
golangci-lint run ./internal/plugins/{protocol}/...
```

**Pass Criteria:** No errors or warnings.

---

## P1 Requirements (Optional but Recommended)

### KeyPlugin Interface

For key-based auth protocols (SSH, etc.):

```go
type KeyPlugin interface {
    Plugin
    TestKey(ctx context.Context, target, username string,
            key []byte, timeout time.Duration) *Result
}
```

### Integration Tests

Docker-based tests against real service:

```go
func TestPlugin_Test_Integration(t *testing.T) {
    t.Skip("Integration test requires real server")
    // Test against docker-compose service
}
```

### Default Credentials

If protocol has common defaults:
- Create `wordlists/{protocol}_defaults.txt`
- Format: `username:password` per line

### Protocol Documentation

Update `docs/PROTOCOLS.md` with:
- Protocol name and description
- Default port(s)
- Authentication type
- Library used
- Configuration example
- Default credentials (if applicable)
- Known error patterns

---

## Compliance Report Template

Create `.brutus-development/domain-compliance.md`:

```markdown
# Domain Compliance Report

**Plugin:** {protocol}
**Validated:** {timestamp}

## P0 Requirements

| Check | Status | Evidence |
|-------|--------|----------|
| Plugin Interface | ✅ PASS | Name(), Test() methods found |
| Error Classification | ✅ PASS | classifyError() with auth patterns |
| Self-Registration | ✅ PASS | init() + brutus.Register() |
| Import Registration | ✅ PASS | Added to init.go |
| Default Port | ✅ PASS | parseTarget() adds :{port} |
| Unit Tests | ✅ PASS | 5 tests found |
| Test Coverage | ✅ PASS | 85.2% coverage |
| golangci-lint | ✅ PASS | No issues |

## P1 Requirements

| Check | Status | Notes |
|-------|--------|-------|
| KeyPlugin | ⏭️ SKIP | Not applicable |
| Integration Tests | ✅ DONE | Docker test added |
| Default Credentials | ✅ DONE | wordlists/{protocol}_defaults.txt |
| Protocol Docs | ✅ DONE | docs/PROTOCOLS.md updated |

## Violations

None.

## Proceeding to Phase 11: Code Quality
```

---

## MANIFEST Update

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"

domain_compliance:
  p0_checks:
    plugin_interface: "pass"
    error_classification: "pass"
    self_registration: "pass"
    import_registration: "pass"
    default_port: "pass"
    unit_tests: "pass"
    test_coverage: "85.2%"
    golangci_lint: "pass"
  p1_checks:
    key_plugin: "skip"
    integration_tests: "pass"
    default_credentials: "pass"
    protocol_docs: "pass"
  violations: 0
```

---

## Violation Handling

If P0 check fails:

1. **STOP** - Do not proceed to Phase 11
2. **Document** violation in compliance report
3. **Return** to Phase 8 for remediation
4. **Re-run** compliance checks after fix

If P1 check fails:

1. **Document** as optional incomplete
2. **Proceed** to Phase 11
3. **Track** for future enhancement

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Returns here for fixes
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [P0 Compliance](p0-compliance.md) - Validation commands
