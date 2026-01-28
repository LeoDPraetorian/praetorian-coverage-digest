# File Scope Boundaries

**Define file access patterns for parallel Brutus plugin development agents.**

---

## Overview

When multiple agents work in parallel, file scope boundaries prevent conflicts and ensure clean separation of concerns.

---

## Brutus Repository Structure

```
{BRUTUS_ROOT}/
├── cmd/
│   └── brutus/
│       └── main.go              # CLI entry point
├── pkg/
│   └── brutus/
│       └── brutus.go            # Core interfaces, Config, Result, Registry
├── internal/
│   └── plugins/
│       ├── init.go              # Import registrations (SHARED - careful!)
│       ├── ssh/
│       │   ├── ssh.go           # SSH plugin
│       │   └── ssh_test.go
│       ├── mysql/
│       │   ├── mysql.go         # MySQL plugin
│       │   └── mysql_test.go
│       └── {protocol}/          # NEW PLUGIN
│           ├── {protocol}.go
│           └── {protocol}_test.go
├── docs/
│   └── PROTOCOLS.md             # Protocol documentation
└── wordlists/
    └── {protocol}_defaults.txt  # Default credentials (optional)
```

---

## Agent Scope Matrix

| Agent                | Read Access                  | Write Access                            |
| -------------------- | ---------------------------- | --------------------------------------- |
| capability-lead      | Entire codebase              | None (architecture only)                |
| security-lead        | Entire codebase              | None (assessment only)                  |
| capability-developer | Entire codebase              | `internal/plugins/{protocol}/`          |
| capability-developer | `internal/plugins/init.go`   | Add import line only                    |
| capability-reviewer  | Entire codebase              | None (review only)                      |
| backend-security     | Entire codebase              | None (review only)                      |
| capability-tester    | Entire codebase              | `internal/plugins/{protocol}/*_test.go` |
| test-lead            | Entire codebase              | None (planning only)                    |

---

## Critical Shared Files

### `internal/plugins/init.go`

**Risk:** Multiple plugins adding imports simultaneously.

**Mitigation:**
- Only ONE agent modifies at a time
- Use atomic append (add import at end of block)
- Verify alphabetical ordering after

**Example addition:**
```go
import (
    // ... existing imports
    _ "github.com/praetorian-inc/brutus/internal/plugins/{protocol}"
)
```

### `pkg/brutus/brutus.go`

**Risk:** Core interface changes affect all plugins.

**Mitigation:**
- **NEVER** modify without explicit approval
- Plugin development does NOT modify core interfaces
- Only read for reference

### `docs/PROTOCOLS.md`

**Risk:** Multiple documentation updates.

**Mitigation:**
- Add new protocol section at appropriate alphabetical position
- One agent updates docs at a time (typically in Phase 16)

---

## Path Resolution

The Brutus repository location may vary. Use environment variable:

```bash
BRUTUS_ROOT="${BRUTUS_ROOT:-/path/to/brutus}"
```

**Common locations:**
- Super-repo: `/Users/engineer/github/generate-cft/praetorian-development-platform/brutus`
- Standalone: `/path/to/brutus`
- Worktree: `.worktrees/{protocol}-brutus/`

---

## Parallel Execution Safety

### Safe to Parallelize

- Multiple capability-lead + security-lead (Phase 7) - read-only
- Multiple capability-reviewer + backend-security (Phase 11) - read-only
- Multiple capability-tester (Phase 13) - each writes different test file

### NOT Safe to Parallelize

- capability-developer modifying init.go - one at a time
- docs/PROTOCOLS.md updates - one at a time

---

## Conflict Detection

Before writing, check for conflicts:

```bash
# Check if file was recently modified
git diff --name-only HEAD~1 | grep -q "{path}" && echo "CONFLICT RISK"

# Check if file is being modified by another agent
lsof +D internal/plugins/{protocol}/ 2>/dev/null
```

---

## File Lock Protocol (Optional)

For critical shared files, use simple file locking:

```bash
# Acquire lock
LOCKFILE=".locks/init.go.lock"
mkdir -p "$(dirname $LOCKFILE)"
while ! mkdir "$LOCKFILE" 2>/dev/null; do
    echo "Waiting for lock..."
    sleep 1
done

# ... modify file ...

# Release lock
rmdir "$LOCKFILE"
```

---

## Agent Prompt File Scope

Include in agent prompts:

```markdown
### File Scope

You have access to:
- READ: Entire Brutus codebase
- WRITE: `internal/plugins/{protocol}/` only
- APPEND: `internal/plugins/init.go` (import line only)

Do NOT modify:
- `pkg/brutus/brutus.go` (core interfaces)
- Other plugins in `internal/plugins/*/`
- `cmd/brutus/main.go`
```

---

## Verification

After parallel execution:

```bash
# Verify no unintended changes
git status --short

# Verify only expected files modified
git diff --name-only | sort

# Expected files:
# internal/plugins/{protocol}/{protocol}.go
# internal/plugins/{protocol}/{protocol}_test.go
# internal/plugins/init.go (import line)
```

---

## Related References

- [Agent Matrix](agent-matrix.md) - Which agents for which phases
- [Parallel Execution](../SKILL.md#parallel-execution) - How to spawn parallel agents
- [Delegation Templates](delegation-templates.md) - Agent prompts with scope
