# Phase 8: Implementation

**Code development for Brutus plugin.**

---

## Agent

Spawn `capability-developer` with:
- Architecture from Phase 7
- Brutus plugin patterns
- P0 requirements checklist

---

## Implementation Checklist

1. [ ] Create `internal/plugins/{protocol}/{protocol}.go`
2. [ ] Implement `Plugin` struct
3. [ ] Implement `init()` with `brutus.Register()`
4. [ ] Implement `Name()` method
5. [ ] Implement `Test()` method
6. [ ] Implement `classifyError()` helper
7. [ ] Implement `parseTarget()` helper
8. [ ] Add import to `internal/plugins/init.go`
9. [ ] Create `{protocol}_test.go`

---

## Key Patterns

### Result Semantics

```go
// Valid credentials
result.Success = true
result.Error = nil

// Invalid credentials (auth failure)
result.Success = false
result.Error = nil

// Connection error
result.Success = false
result.Error = fmt.Errorf("connection error: %w", err)
```

---

## ⛔ COMPACTION GATE 2

Before proceeding to Phase 9, check token usage and run compaction if needed.

---

## Related

- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Previous phase
- [Phase 9: Design Verification](phase-9-design-verification.md) - Next phase
- [Delegation Templates](delegation-templates.md) - Developer prompt
