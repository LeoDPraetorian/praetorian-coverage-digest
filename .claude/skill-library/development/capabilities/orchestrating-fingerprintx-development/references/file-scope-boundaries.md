# File Scope Boundaries

**Parallel agent conflict prevention for fingerprintx plugin development.**

## Overview

When spawning parallel agents, define non-overlapping file scopes to prevent conflicts.

**Note:** Fingerprintx development is primarily sequential (single plugin = single agent at a time), but parallel execution may occur in specific scenarios.

---

## Fingerprintx Repository Location

Fingerprintx has been migrated to the external capabilities repository:

```
{CAPABILITIES_ROOT}/modules/fingerprintx/
```

Where `{CAPABILITIES_ROOT}` is resolved via:
1. `CAPABILITIES_ROOT` environment variable
2. `.claude/config.local.json` (`external_repos.capabilities`)
3. Common locations (`../capabilities`, `~/dev/capabilities`)

---

## Fingerprintx File Scope Matrix

| Agent Type           | File Scope                                                                  | Access Mode | Phase |
| -------------------- | --------------------------------------------------------------------------- | ----------- | ----- |
| Explore              | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/`            | READ-ONLY   | 3     |
| capability-lead      | Output directory only                                                       | WRITE       | 7     |
| capability-developer | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/` | READ-WRITE  | 8     |
| capability-reviewer  | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/` | READ-ONLY   | 11    |
| capability-tester    | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/*_test.go` | READ-WRITE  | 13    |

---

## Files Modified During Implementation

### Exclusive Files (Single Agent Only)

These files are modified exclusively by capability-developer:

| File                                                                         | Purpose              | Phase |
| ---------------------------------------------------------------------------- | -------------------- | ----- |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go` | Main detection logic | 8     |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`              | Type constant        | 8     |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`            | Plugin import        | 8     |

### Test Files (Tester Only)

| File                                                                                  | Purpose    | Phase |
| ------------------------------------------------------------------------------------- | ---------- | ----- |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go` | Unit tests | 13    |

---

## Parallel Execution Scenarios

### Scenario 1: Review and Test Prep (Safe)

While capability-reviewer reads plugin.go, test planning can happen in parallel:

```
capability-reviewer → READ {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
orchestrator → WRITE .fingerprintx-development/test-plan.md
```

**No conflict** - different files.

### Scenario 2: Multiple Protocols (Safe)

If developing multiple plugins in separate worktrees:

```
Worktree A: capability-developer → {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/
Worktree B: capability-developer → {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/redis/
```

**No conflict** - different directories in different worktrees.

### Scenario 3: Implementation and Testing (CONFLICT)

```
capability-developer → WRITE {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
capability-tester → RUN go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...
```

**CONFLICT** - developer may change files tester is using.

**Resolution:** Never run developer and tester in parallel on same plugin.

---

## Conflict Prevention Rules

### Rule 1: Sequential Plugin Development

Implementation and testing MUST be sequential:

```
Phase 8 (Implementation) → COMPLETE
Phase 9 (Design Verification) → COMPLETE
Phase 10 (Domain Compliance) → COMPLETE
Phase 11 (Code Quality) → COMPLETE
Phase 12 (Test Planning) → COMPLETE
Phase 13 (Testing) → START
```

### Rule 2: Types.go and Plugins.go

These shared files are only modified once per plugin:

- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go` - Add type constant (Phase 8)
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go` - Add import (Phase 8)

**Rule:** Complete these modifications before any parallel activity.

### Rule 3: Output Directory

The `.fingerprintx-development/` directory can be written to by:

- Orchestrator (any phase)
- Agents via their output files (designated paths)

Use designated agent output paths:

- `.fingerprintx-development/agents/capability-developer.md`
- `.fingerprintx-development/agents/capability-reviewer.md`
- `.fingerprintx-development/agents/capability-tester.md`

---

## Lock-Free Design

Fingerprintx development doesn't require file locking because:

1. Single plugin per workflow
2. Sequential phase execution
3. Isolated git worktree
4. Agent output files are uniquely named

---

## When Conflicts Occur

If VCS shows merge conflicts:

1. **Stop both agents immediately**
2. **Check which agent has correct version**
3. **Resolve conflict manually**
4. **Resume from last verified checkpoint**

---

## Related References

- [file-conflict-protocol.md](file-conflict-protocol.md) - Conflict detection protocol
- [file-locking.md](file-locking.md) - Lock mechanism
- [Agent Matrix](agent-matrix.md) - Agent roles and phases
- [Directory Structure](directory-structure.md) - File locations
- [Phase 8: Implementation](phase-8-implementation.md) - Developer scope
- [Phase 13: Testing](phase-13-testing.md) - Tester scope
