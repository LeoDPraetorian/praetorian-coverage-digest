# File Conflict Protocol (Fingerprintx Development)

Proactive conflict detection before spawning parallel agents.

## Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

## Fingerprintx File Patterns

| Component      | File Pattern                                         |
| -------------- | ---------------------------------------------------- |
| Plugin source  | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}.go`      |
| Plugin tests   | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go` |
| Plugin types   | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/types.go`           |
| Registry       | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`                             |
| Type constants | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`                               |

## Protocol Steps

### 1. Identify File Sets

For each agent, list files it will likely modify:

```bash
# Plugin implementation scope
Glob("{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/**/*.go")

# Registry scope (shared - conflict risk)
Glob("{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go")
Glob("{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go")
```

### 2. Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql.go
Agent B: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql_test.go
Overlap: NONE → Safe if one writes, one reads
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go (adding import)
Agent B: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go (adding import)
Overlap: BOTH modify registry → CONFLICT
```

### 3. Resolve Conflicts

When overlap is detected, choose a resolution strategy:

**Option A: Sequential Execution**

- Agent A completes first, then Agent B
- Safest but slowest
- Use when overlap is significant

**Option B: Split File Ownership**

- Assign overlapping file to one agent
- Other agent explicitly skips it
- Requires clear scope boundaries in prompts

**Option C: Coordinate Changes**

- Both agents modify different parts
- Requires detailed scope boundaries
- Higher risk of merge conflicts

### 4. Document in Progress Tracking

```json
{
  "parallel_execution": {
    "agents": ["capability-developer", "capability-tester"],
    "file_scopes": {
      "capability-developer": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/"],
      "capability-tester": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/*_test.go"]
    },
    "overlap_check": "passed",
    "overlap_files": []
  }
}
```

## Scope Boundaries in Prompts

Explicitly define what each agent should and should NOT modify:

```markdown
SCOPE BOUNDARIES:

- Only modify files in: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/
- Do NOT modify: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go (orchestrator handles registration)
- Do NOT modify: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go (orchestrator handles type constant)
```

## Fingerprintx Shared Files (Conflict Risk)

| File                     | Touched By                      | Mitigation                       |
| ------------------------ | ------------------------------- | -------------------------------- |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go` | All new plugins (registration)  | Orchestrator handles, sequential |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`   | All new plugins (type constant) | Orchestrator handles, sequential |
| `go.mod` / `go.sum`      | Dependency changes              | Single agent per workflow        |

## When to Skip Conflict Checking

**Skip conflict checking when:**

- Agents work in completely different protocol directories
- Agents create entirely new files with no overlap potential
- Only one agent will modify files (others are read-only analysis)

**Always check when:**

- Multiple agents will modify code in the fingerprintx module
- Shared registry or type files are in scope
- Agents might refactor common dependencies
