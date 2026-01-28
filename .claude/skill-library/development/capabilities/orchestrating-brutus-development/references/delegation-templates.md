# Delegation Templates

**Agent prompt templates for Brutus plugin development phases.**

---

## Phase 7: Architecture - capability-lead

```markdown
## Task: Design Brutus Plugin Architecture

**Protocol:** {protocol_name}
**Plugin Type:** {standard | key-based}

### Context

You are designing a Brutus credential testing plugin for the {protocol_name} protocol.

Brutus is a multi-protocol credential testing tool. Plugins implement a simple interface:
- `Name()` - Returns protocol name
- `Test()` - Tests a single credential against a target

### Required Output

1. **Plugin Architecture**
   - File structure in `internal/plugins/{protocol}/`
   - Import dependencies (prefer pure Go, no CGO)
   - Connection handling pattern
   - Error classification strategy

2. **Authentication Flow**
   - How credentials are tested
   - Success/failure indicators
   - Timeout handling
   - Connection cleanup

3. **Error Classification**
   - List protocol-specific auth failure messages
   - Connection error patterns
   - How to distinguish auth vs connection errors

4. **Default Configuration**
   - Default port(s)
   - Connection timeout recommendations
   - Any protocol-specific settings

### Mandatory Skills

Read these skills before designing:
- `adhering-to-dry` - Reuse existing patterns
- `adhering-to-yagni` - Only implement what's needed
- `implementing-go-plugin-registries` - Factory pattern

### Reference Implementation

Look at existing plugins for patterns:
- `internal/plugins/ssh/ssh.go` - Simple protocol
- `internal/plugins/mysql/mysql.go` - Database pattern
- `internal/plugins/http/http.go` - Stateful plugin

### Output Format

Provide architecture as markdown with:
1. Overview diagram (ASCII or mermaid)
2. File structure
3. Interface implementations
4. Error classification table
5. Dependencies list
```

---

## Phase 7: Architecture - security-lead

```markdown
## Task: Security Assessment for Brutus Plugin

**Protocol:** {protocol_name}

### Context

Review the proposed Brutus plugin architecture for security considerations.

### Assessment Areas

1. **Credential Handling**
   - Are credentials properly scoped?
   - No credential logging in normal operation?
   - Memory cleanup for sensitive data?

2. **Connection Security**
   - TLS/SSL handling if applicable
   - Certificate validation (note: Brutus allows insecure for testing)
   - Connection timeout to prevent hangs

3. **Error Information**
   - No credential leakage in error messages
   - Safe error classification
   - Banner capture security (no injection)

4. **Resource Management**
   - Connection cleanup on all paths
   - Context cancellation honored
   - No resource leaks

### Output Format

Provide assessment as:
1. Security concerns (if any)
2. Recommendations
3. Required mitigations before implementation
4. APPROVED / NEEDS_CHANGES verdict
```

---

## Phase 8: Implementation - capability-developer

```markdown
## Task: Implement Brutus Plugin

**Protocol:** {protocol_name}
**Architecture:** See architecture.md

### Context

Implement the Brutus plugin following the architecture plan.

### Brutus Plugin Requirements

**Required Interface:**
```go
type Plugin interface {
    Name() string
    Test(ctx context.Context, target, username, password string,
         timeout time.Duration) *Result
}
```

**Result Semantics:**
- Success=true, Error=nil → Valid credentials
- Success=false, Error=nil → Invalid credentials (auth failure)
- Success=false, Error=error → Connection/network error

### Implementation Checklist

1. [ ] Create `internal/plugins/{protocol}/{protocol}.go`
2. [ ] Implement Plugin struct
3. [ ] Implement `init()` with `brutus.Register()`
4. [ ] Implement `Name()` method
5. [ ] Implement `Test()` method
6. [ ] Implement `classifyError()` helper
7. [ ] Implement `parseTarget()` helper
8. [ ] Add import to `internal/plugins/init.go`

### Mandatory Skills

Read these skills before implementing:
- `developing-with-tdd` - Write tests alongside code
- `verifying-before-completion` - Verify all requirements
- `implementing-go-plugin-registries` - Factory pattern

### Code Template

```go
package {protocol}

import (
    "context"
    "fmt"
    "strings"
    "time"

    "github.com/praetorian-inc/brutus/pkg/brutus"
)

// Plugin implements brutus.Plugin for {protocol} authentication testing
type Plugin struct{}

func init() {
    brutus.Register("{protocol}", func() brutus.Plugin {
        return &Plugin{}
    })
}

// Name returns the protocol name
func (p *Plugin) Name() string {
    return "{protocol}"
}

// Test attempts authentication with the given credentials
func (p *Plugin) Test(ctx context.Context, target, username, password string,
    timeout time.Duration) *brutus.Result {

    result := &brutus.Result{
        Protocol: p.Name(),
        Target:   target,
        Username: username,
        Password: password,
    }

    start := time.Now()
    defer func() { result.Duration = time.Since(start) }()

    // Parse target and add default port if needed
    target = parseTarget(target)

    // TODO: Implement authentication logic

    return result
}

func parseTarget(target string) string {
    if !strings.Contains(target, ":") {
        return target + ":{DEFAULT_PORT}"
    }
    return target
}

func classifyError(err error) error {
    if err == nil {
        return nil
    }

    errStr := err.Error()

    // Protocol-specific auth failure patterns
    authFailures := []string{
        // TODO: Add protocol-specific patterns
    }

    for _, pattern := range authFailures {
        if strings.Contains(errStr, pattern) {
            return nil // Auth failure, not connection error
        }
    }

    return fmt.Errorf("connection error: %w", err)
}
```

### Output Format

1. Complete plugin implementation
2. Test file with required tests
3. Update to init.go import
```

---

## Phase 11: Code Review - capability-reviewer

```markdown
## Task: Review Brutus Plugin Implementation

**Protocol:** {protocol_name}
**Files:** internal/plugins/{protocol}/

### Review Checklist

1. **Interface Compliance**
   - [ ] Implements brutus.Plugin correctly
   - [ ] Name() returns correct protocol name
   - [ ] Test() handles all result states

2. **Error Handling**
   - [ ] classifyError() covers known auth patterns
   - [ ] Connection errors properly wrapped
   - [ ] Context cancellation honored

3. **Code Quality**
   - [ ] No hardcoded credentials
   - [ ] Proper resource cleanup (defer)
   - [ ] Clear variable names
   - [ ] Appropriate comments

4. **Testing**
   - [ ] Required tests present
   - [ ] Error paths tested
   - [ ] Table-driven tests used

### Mandatory Skills

Read before reviewing:
- `adhering-to-dry` - Check for duplication

### Output Format

```markdown
## Code Review: {protocol} Plugin

### Verdict: APPROVED | NEEDS_CHANGES

### Findings

| Severity | File:Line | Issue | Recommendation |
|----------|-----------|-------|----------------|
| ...      | ...       | ...   | ...            |

### Summary

{Overall assessment}
```
```

---

## Phase 13: Testing - capability-tester

```markdown
## Task: Implement Brutus Plugin Tests

**Protocol:** {protocol_name}
**Test Type:** {unit | integration | error-classification}

### Context

Implement comprehensive tests for the Brutus plugin.

### Required Test Cases

1. **TestPlugin_Name**
   - Verify Name() returns "{protocol}"

2. **TestClassifyError**
   - Table-driven tests for all error patterns
   - Test nil input
   - Test auth failure patterns
   - Test connection error patterns

3. **TestPlugin_Test_ContextCancellation**
   - Create cancelled context
   - Verify Test() returns appropriate result

4. **TestPlugin_Test_ConnectionError**
   - Use invalid target
   - Verify Error field is set

5. **TestPlugin_Test_Integration** (optional)
   - Skip by default
   - Test against real service when available

### Mandatory Skills

Read before testing:
- `developing-with-tdd` - Test patterns
- `avoiding-low-value-tests` - Quality over quantity

### Test Template

```go
package {protocol}

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
)

func TestPlugin_Name(t *testing.T) {
    p := &Plugin{}
    assert.Equal(t, "{protocol}", p.Name())
}

func TestClassifyError(t *testing.T) {
    tests := []struct {
        name    string
        err     error
        wantNil bool
    }{
        {"nil error", nil, true},
        // TODO: Add protocol-specific cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := classifyError(tt.err)
            if tt.wantNil {
                assert.Nil(t, result)
            } else {
                assert.NotNil(t, result)
            }
        })
    }
}

func TestPlugin_Test_ContextCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())
    cancel()

    p := &Plugin{}
    result := p.Test(ctx, "localhost:1234", "user", "pass", time.Second)

    assert.False(t, result.Success)
}

func TestPlugin_Test_ConnectionError(t *testing.T) {
    p := &Plugin{}
    result := p.Test(context.Background(), "invalid-host:1234",
        "user", "pass", time.Second)

    assert.False(t, result.Success)
    assert.NotNil(t, result.Error)
}
```

### Output Format

1. Complete test file
2. Coverage report showing >= 80%
3. All tests passing
```

---

## Related References

- [Agent Matrix](agent-matrix.md) - Which agents for which phases
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Uses architect prompts
- [Phase 8: Implementation](phase-8-implementation.md) - Uses developer prompts
- [Phase 11: Code Quality](phase-11-code-quality.md) - Uses reviewer prompts
- [Phase 13: Testing](phase-13-testing.md) - Uses tester prompts
