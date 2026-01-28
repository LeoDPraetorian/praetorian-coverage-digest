# Phase 13: Testing

**Test implementation and execution for Brutus plugin.**

---

## Agents

Spawn 3 `capability-tester` agents in parallel:
1. Unit tests for plugin methods
2. Error classification tests
3. Integration tests (optional)

---

## Test Implementation

### Required Test File

`internal/plugins/{protocol}/{protocol}_test.go`

### Test Functions

```go
func TestPlugin_Name(t *testing.T)
func TestClassifyError(t *testing.T)
func TestPlugin_Test_ContextCancellation(t *testing.T)
func TestPlugin_Test_ConnectionError(t *testing.T)
func TestPlugin_Test_Integration(t *testing.T) // t.Skip() by default
```

---

## Execution

```bash
# Run tests
go test -v ./internal/plugins/{protocol}/...

# With coverage
go test -coverprofile=coverage.out ./internal/plugins/{protocol}/...
```

---

## ⛔ COMPACTION GATE 3

Before proceeding to Phase 14, check token usage and run compaction if needed.

---

## Related

- [Phase 12: Test Planning](phase-12-test-planning.md) - Previous phase
- [Phase 14: Coverage Verification](phase-14-coverage-verification.md) - Next phase
- [Delegation Templates](delegation-templates.md) - Tester prompts
