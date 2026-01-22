# File Locking (Capability Development)

Explicit file locks prevent parallel agents from modifying the same files.

## Lock Location

Locks are stored in the workflow output directory:

```
{OUTPUT_DIRECTORY}/locks/
├── capability-developer.lock
├── capability-reviewer.lock
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
  "agent": "capability-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": [
    "modules/chariot-aegis-capabilities/artifacts/definitions/Custom.S3BucketScanner/artifact.yaml"
  ],
  "directories": [
    "modules/chariot-aegis-capabilities/artifacts/definitions/Custom.S3BucketScanner/"
  ],
  "task_description": "Implement S3 bucket exposure VQL capability",
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

## Capability-Specific File Patterns

| Capability Type | Typical Lock Scope                                                           |
| --------------- | ---------------------------------------------------------------------------- |
| VQL             | `modules/chariot-aegis-capabilities/artifacts/definitions/{CapabilityName}/` |
| Nuclei          | `modules/nuclei-templates/{category}/{template-name}.yaml`                   |
| fingerprintx    | `modules/fingerprintx/pkg/plugins/services/{service}/`                       |
| Janus           | `modules/janus/internal/tools/{tool}/`                                       |

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
// {OUTPUT_DIRECTORY}/locks/capability-developer.lock
{
  "agent": "capability-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": [
    "modules/chariot-aegis-capabilities/artifacts/definitions/Custom.S3Scanner/artifact.yaml"
  ],
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

**Example conflict in capability development:**

```
capability-developer.lock: ["modules/chariot-aegis-capabilities/artifacts/shared/utils.vql"]
capability-reviewer.lock: ["modules/chariot-aegis-capabilities/artifacts/shared/utils.vql"]

Resolution options:
1. Run reviewer after developer completes (RECOMMENDED)
2. Reviewer doesn't modify shared utils, only reviews
3. Developer owns shared files, reviewer suggests changes only
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

## When to Use Locking in Capability Development

**Use file locking when:**

- Multiple capability agents running in parallel
- Shared utility files exist (e.g., common VQL includes)
- Long-running capability tests (>30 minutes)
- Complex capability with cross-file dependencies

**Skip file locking when:**

- Sequential agent execution (capability-developer then capability-reviewer)
- Single capability per workflow (most common case)
- Independent capabilities with no shared files
- Quick capability tasks (<5 minutes)

**Note:** Most capability development is single-file focused, making conflicts rare. Locking is primarily useful when developing shared utilities or test fixtures.

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
