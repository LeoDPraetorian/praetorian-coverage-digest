# File Locking (Fingerprintx Development)

Explicit file locks prevent parallel agents from modifying the same files.

## Lock Location

Locks are stored in the workflow output directory:

```
{OUTPUT_DIRECTORY}/locks/
├── capability-developer.lock
├── capability-reviewer.lock
└── ...
```

## Lock File Schema

```json
{
  "agent": "capability-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql.go", "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql_test.go"],
  "directories": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/"],
  "task_description": "Implement MySQL fingerprintx plugin",
  "expires_at": "2026-01-17T16:30:00Z"
}
```

### Field Definitions

| Field            | Type     | Required | Description                                           |
| ---------------- | -------- | -------- | ----------------------------------------------------- |
| agent            | string   | Yes      | Agent name that owns the lock                         |
| locked_at        | ISO 8601 | Yes      | When lock was acquired                                |
| files            | string[] | Yes      | Specific files this agent will modify                 |
| directories      | string[] | No       | Directory prefixes (agent owns all files under these) |
| task_description | string   | No       | Human-readable task for debugging                     |
| expires_at       | ISO 8601 | Yes      | Auto-expiration time (default: 1 hour)                |

## Fingerprintx Lock Patterns

| Lock Scope       | Files Included                                   | Use When                         |
| ---------------- | ------------------------------------------------ | -------------------------------- |
| Plugin directory | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/`               | Implementation phase             |
| Test files only  | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/*_test.go`      | Testing phase                    |
| Registry         | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`, `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go` | Registration (orchestrator only) |

## Lock Acquisition Protocol

### Step 1: Create Lock Directory

```bash
mkdir -p "{OUTPUT_DIRECTORY}/locks"
```

### Step 2: Check for Conflicts

Before writing a new lock, check existing locks for file overlap.

### Step 3: Write Lock File

```json
{
  "agent": "capability-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql.go"],
  "expires_at": "2026-01-17T16:30:00Z"
}
```

### Step 4: Spawn Agent

Only after lock is written, spawn the agent with scope boundaries in prompt.

## Conflict Resolution

When overlap is detected:

| Resolution           | When to Use                                 |
| -------------------- | ------------------------------------------- |
| Sequential execution | One agent must complete before other starts |
| File reassignment    | Move overlapping file to one agent's scope  |
| Directory split      | Divide shared directory between agents      |
| Merge tasks          | Combine into single agent task              |

**Example conflict:**

```
capability-developer.lock: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"]
capability-tester.lock: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"]

Resolution: Run capability-tester after capability-developer completes
```

## Lock Release Protocol

### On Agent Completion

Orchestrator deletes the lock file:

```bash
rm "{OUTPUT_DIRECTORY}/locks/{agent-name}.lock"
```

### On Workflow Completion

Delete entire locks directory:

```bash
rm -rf "{OUTPUT_DIRECTORY}/locks"
```

### On Expired Lock

If lock's expires_at is in the past:

- Lock can be overwritten by new agent
- Log warning: 'Overwriting expired lock for {agent}'
- Consider: original agent may have failed/timed out

## When to Use Locking

**Use file locking when:**

- 3+ agents running in parallel
- Agents modify files in overlapping directories
- Long-running parallel tasks (>30 minutes)
- Complex plugin with shared dependencies

**Skip file locking when:**

- Sequential agent execution (no parallel conflict possible)
- Clearly disjoint scopes (different protocol directories)
- Single agent tasks
- Quick tasks (<5 minutes)

**Note:** Most fingerprintx development is single-plugin focused, making conflicts rare. Locking is primarily useful when developing shared utilities.
