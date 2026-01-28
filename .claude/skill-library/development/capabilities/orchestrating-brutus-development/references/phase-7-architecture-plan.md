# Phase 7: Architecture Plan

**Technical design and task decomposition for Brutus plugin.**

---

## Agents

Spawn in parallel:
- `capability-lead` - Plugin architecture design
- `security-lead` - Security assessment

---

## Architecture Components

1. **Plugin Structure**
   - File: `internal/plugins/{protocol}/{protocol}.go`
   - Struct: `Plugin{}`
   - Methods: `Name()`, `Test()`

2. **Error Classification**
   - Auth failure patterns
   - Connection error patterns

3. **Configuration**
   - Default port
   - Timeout handling

---

## Output

1. `architecture.md` - Technical design
2. `plan.md` - Implementation tasks

---

## Human Checkpoint

Get approval before Phase 8.

---

## Related

- [Phase 5/6](phase-5-complexity.md) - Previous phase
- [Phase 8: Implementation](phase-8-implementation.md) - Next phase
- [Delegation Templates](delegation-templates.md) - Agent prompts
