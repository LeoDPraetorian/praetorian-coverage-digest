# File Locking Mechanism

Explicit file locks prevent parallel agents from modifying the same files.

## Lock Location

Locks are stored in the workflow output directory:

```
{OUTPUT_DIRECTORY}/locks/
├── frontend-developer.lock
├── backend-developer.lock
└── ...
```

**Why distributed (not central `.claude/locks/`):**

- Follows existing pattern (metadata.json, MANIFEST.yaml in output dir)
- Automatic cleanup when workflow directory is removed
- Scoped to specific workflow - no cross-workflow conflicts
- Clear ownership

## Lock File Schema

```json
{
  "agent": "frontend-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": [
    "src/components/Asset/AssetTable.tsx",
    "src/components/Asset/AssetRow.tsx",
    "src/components/Asset/index.ts"
  ],
  "directories": ["src/components/Asset/"],
  "task_description": "Implement asset table with virtualization",
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

## Lock Acquisition Protocol

### Step 1: Create Lock Directory

```bash
mkdir -p "{OUTPUT_DIRECTORY}/locks"
```

### Step 2: Check for Conflicts

Before writing a new lock, check existing locks:

```
For each existing *.lock file:
  Read file list
  Compare against new agent's file list
  If overlap detected:
    CONFLICT - do not proceed with parallel execution
```

### Step 3: Write Lock File

```json
// {OUTPUT_DIRECTORY}/locks/frontend-developer.lock
{
  "agent": "frontend-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": ["src/components/Asset/AssetTable.tsx"],
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
frontend-developer.lock: ["src/shared/Button.tsx"]
backend-developer.lock: ["src/shared/Button.tsx"]  # CONFLICT!

Resolution options:
1. Run backend-developer after frontend-developer completes
2. Assign Button.tsx to frontend-developer only
3. Create separate buttons (frontend vs backend specific)
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

## Integration with Parallel Execution

```
Before parallel spawn:
  1. Identify file scopes for each agent
  2. Create locks/ directory
  3. Write lock file for each agent
  4. Check for conflicts
  5. If conflict: resolve before spawning
  6. Spawn all agents in single message

After all agents complete:
  1. Delete all lock files
  2. Optionally delete locks/ directory
```

## When to Use Locking

**Use file locking when:**

- 3+ agents running in parallel
- Agents modify files in overlapping directory trees
- Long-running parallel tasks (>30 minutes)
- Complex refactoring with many file changes

**Skip file locking when:**

- Sequential agent execution (no parallel conflict possible)
- Clearly disjoint scopes (frontend components vs backend handlers)
- Single agent tasks
- Quick tasks (<5 minutes)

## Debugging Lock Issues

### Stale Locks

If workflow crashed and locks remain:

```bash
# Check lock timestamps
cat {OUTPUT_DIRECTORY}/locks/*.lock | jq '.expires_at'

# Remove expired locks
find {OUTPUT_DIRECTORY}/locks -name '*.lock' -mmin +60 -delete
```

### Lock Conflicts

If parallel agents report conflicts:

1. Read both lock files
2. Identify overlapping files
3. Decide on resolution strategy
4. Update lock files or change execution pattern
