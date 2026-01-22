# File Scope Boundaries

**Parallel agent conflict prevention for feature development.**

---

## Overview

When spawning parallel agents, define non-overlapping file scopes to prevent conflicts. Feature development involves multiple agent types that may operate in parallel. This file provides both the generic conflict detection protocol and feature-specific scope boundaries.

---

## Feature File Scope Matrix

Based on `feature_type` from Phase 3:

### Frontend Features

| Agent Type         | File Scope                                         | Access Mode | Phase |
| ------------------ | -------------------------------------------------- | ----------- | ----- |
| Explore            | `modules/chariot/ui/src/`                          | READ-ONLY   | 3     |
| frontend-lead      | Output directory only                              | WRITE       | 7     |
| frontend-developer | `modules/chariot/ui/src/{feature}/`                | READ-WRITE  | 8     |
| frontend-reviewer  | `modules/chariot/ui/src/{feature}/`                | READ-ONLY   | 11    |
| frontend-tester    | `modules/chariot/ui/src/{feature}/*.test.{ts,tsx}` | READ-WRITE  | 13    |

### Backend Features

| Agent Type        | File Scope                                        | Access Mode | Phase |
| ----------------- | ------------------------------------------------- | ----------- | ----- |
| Explore           | `modules/chariot/backend/`                        | READ-ONLY   | 3     |
| backend-lead      | Output directory only                             | WRITE       | 7     |
| backend-developer | `modules/chariot/backend/pkg/{feature}/`          | READ-WRITE  | 8     |
| backend-reviewer  | `modules/chariot/backend/pkg/{feature}/`          | READ-ONLY   | 11    |
| backend-tester    | `modules/chariot/backend/pkg/{feature}/*_test.go` | READ-WRITE  | 13    |

### Full-Stack Features

| Agent Type         | File Scope                                         | Access Mode | Phase |
| ------------------ | -------------------------------------------------- | ----------- | ----- |
| Explore            | `modules/chariot/`                                 | READ-ONLY   | 3     |
| frontend-lead      | Output directory only                              | WRITE       | 7     |
| backend-lead       | Output directory only                              | WRITE       | 7     |
| frontend-developer | `modules/chariot/ui/src/{feature}/`                | READ-WRITE  | 8     |
| backend-developer  | `modules/chariot/backend/pkg/{feature}/`           | READ-WRITE  | 8     |
| frontend-reviewer  | `modules/chariot/ui/src/{feature}/`                | READ-ONLY   | 11    |
| backend-reviewer   | `modules/chariot/backend/pkg/{feature}/`           | READ-ONLY   | 11    |
| frontend-tester    | `modules/chariot/ui/src/{feature}/*.test.{ts,tsx}` | READ-WRITE  | 13    |
| backend-tester     | `modules/chariot/backend/pkg/{feature}/*_test.go`  | READ-WRITE  | 13    |

### Tabularium Features (Data Schema)

| Agent Type        | File Scope                                      | Access Mode | Phase |
| ----------------- | ----------------------------------------------- | ----------- | ----- |
| Explore           | `modules/tabularium/`                           | READ-ONLY   | 3     |
| backend-lead      | Output directory only                           | WRITE       | 7     |
| backend-developer | `modules/tabularium/pkg/{feature}/`             | READ-WRITE  | 8     |
| backend-developer | `modules/tabularium/client/{feature}/`          | READ-WRITE  | 8     |
| backend-reviewer  | `modules/tabularium/pkg/{feature}/`             | READ-ONLY   | 11    |
| backend-reviewer  | `modules/tabularium/client/{feature}/`          | READ-ONLY   | 11    |
| backend-tester    | `modules/tabularium/pkg/{feature}/*_test.go`    | READ-WRITE  | 13    |
| backend-tester    | `modules/tabularium/client/{feature}/*_test.go` | READ-WRITE  | 13    |

### Janus Framework Features (Security Tool Chain Library)

| Agent Type        | File Scope                                        | Access Mode | Phase |
| ----------------- | ------------------------------------------------- | ----------- | ----- |
| Explore           | `modules/janus-framework/`                        | READ-ONLY   | 3     |
| backend-lead      | Output directory only                             | WRITE       | 7     |
| backend-developer | `modules/janus-framework/pkg/{feature}/`          | READ-WRITE  | 8     |
| backend-reviewer  | `modules/janus-framework/pkg/{feature}/`          | READ-ONLY   | 11    |
| backend-tester    | `modules/janus-framework/pkg/{feature}/*_test.go` | READ-WRITE  | 13    |

### Janus Features (Tool Orchestration)

| Agent Type           | File Scope                                 | Access Mode | Phase |
| -------------------- | ------------------------------------------ | ----------- | ----- |
| Explore              | `modules/janus/`                           | READ-ONLY   | 3     |
| backend-lead         | Output directory only                      | WRITE       | 7     |
| capability-lead      | Output directory only                      | WRITE       | 7     |
| backend-developer    | `modules/janus/janus/{feature}/`           | READ-WRITE  | 8     |
| backend-developer    | `modules/janus/pkg/{feature}/`             | READ-WRITE  | 8     |
| backend-developer    | `modules/janus/tools/{feature}/`           | READ-WRITE  | 8     |
| capability-developer | `modules/janus/templates/{feature}/`       | READ-WRITE  | 8     |
| backend-reviewer     | `modules/janus/janus/{feature}/`           | READ-ONLY   | 11    |
| backend-reviewer     | `modules/janus/pkg/{feature}/`             | READ-ONLY   | 11    |
| capability-reviewer  | `modules/janus/templates/{feature}/`       | READ-ONLY   | 11    |
| backend-tester       | `modules/janus/janus/{feature}/*_test.go`  | READ-WRITE  | 13    |
| backend-tester       | `modules/janus/pkg/{feature}/*_test.go`    | READ-WRITE  | 13    |
| capability-tester    | `modules/janus/templates/{feature}/*.yaml` | READ-WRITE  | 13    |

---

## Conflict Detection Protocol

**Proactive conflict detection before spawning parallel agents.**

### Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

### Protocol Steps

#### Step 1: Identify File Sets

For each agent, list files it will likely modify:

```bash
# Frontend agent scope
Glob("modules/chariot/ui/src/components/Asset/**/*.tsx")  # Returns: 15 files

# Backend agent scope
Glob("modules/chariot/backend/pkg/asset/**/*.go")         # Returns: 12 files
```

#### Step 2: Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: modules/chariot/ui/src/hooks/useAsset.ts, modules/chariot/ui/src/components/Asset/*
Agent B: modules/chariot/ui/src/hooks/useRisk.ts, modules/chariot/ui/src/components/Risk/*
Overlap: NONE → Parallelize
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: modules/chariot/ui/src/hooks/*, modules/chariot/ui/src/components/shared/Button.tsx
Agent B: modules/chariot/ui/src/components/shared/Button.tsx, modules/chariot/ui/src/components/Risk/*
Overlap: modules/chariot/ui/src/components/shared/Button.tsx → CONFLICT
```

#### Step 3: Resolve Conflicts

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

#### Step 4: Document in Progress Tracking

```json
{
  "parallel_execution": {
    "agents": ["frontend-developer", "backend-developer"],
    "file_scopes": {
      "frontend-developer": ["modules/chariot/ui/src/components/Asset/*"],
      "backend-developer": ["modules/chariot/backend/pkg/asset/*"]
    },
    "overlap_check": "passed",
    "overlap_files": []
  }
}
```

### Scope Boundaries in Prompts

Explicitly define what each agent should and should NOT modify:

```markdown
SCOPE BOUNDARIES:

- Only modify files in: modules/chariot/ui/src/components/Asset/
- Do NOT modify: modules/chariot/ui/src/components/shared/ (other agent's scope)
```

### When to Skip Conflict Checking

**Skip conflict checking when:**

- Agents work in completely different directories (e.g., frontend vs backend)
- Agents create entirely new files with no overlap potential
- Only one agent will modify files (others are read-only analysis)

**Always check when:**

- Multiple agents will modify code in the same directory
- Shared utility files exist in scope
- Agents might refactor common dependencies

---

## Shared Files (Conflict Risk)

These files may be touched by multiple features - require coordination:

| File                                         | Risk               | Mitigation            |
| -------------------------------------------- | ------------------ | --------------------- |
| `modules/chariot/ui/src/App.tsx`             | Route additions    | Sequential edits only |
| `modules/chariot/ui/src/index.ts`            | Export additions   | Sequential edits only |
| `modules/chariot/backend/pkg/api/routes.go`  | Endpoint additions | Sequential edits only |
| `modules/chariot/backend/pkg/types/*.go`     | Type definitions   | Lock before modifying |
| `modules/tabularium/pkg/models/*.go`         | Schema definitions | Lock before modifying |
| `modules/tabularium/client/client.go`        | Client interface   | Sequential edits only |
| `modules/janus-framework/pkg/framework/*.go` | Framework core     | Lock before modifying |
| `modules/janus/main.go`                      | Entry point        | Sequential edits only |
| `modules/janus/janus/registry.go`            | Tool registration  | Sequential edits only |

---

## Parallel Execution Safety

### Safe to Parallelize

- Frontend-developer + Backend-developer (non-overlapping paths)
- Frontend-reviewer + Backend-reviewer (READ-ONLY)
- Multiple testers on different test files

### Requires Sequential Execution

- Any agent modifying shared files (routes, exports, types)
- Same agent type on overlapping paths

---

## File Locking Mechanism

Explicit file locks prevent parallel agents from modifying the same files.

### Lock Location

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

### Lock File Schema

```json
{
  "agent": "frontend-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": [
    "modules/chariot/ui/src/components/Asset/AssetTable.tsx",
    "modules/chariot/ui/src/components/Asset/AssetRow.tsx",
    "modules/chariot/ui/src/components/Asset/index.ts"
  ],
  "directories": ["modules/chariot/ui/src/components/Asset/"],
  "task_description": "Implement asset table with virtualization",
  "expires_at": "2026-01-17T16:30:00Z"
}
```

#### Field Definitions

| Field            | Type     | Required | Description                                           |
| ---------------- | -------- | -------- | ----------------------------------------------------- |
| agent            | string   | Yes      | Agent name that owns the lock                         |
| locked_at        | ISO 8601 | Yes      | When lock was acquired                                |
| files            | string[] | Yes      | Specific files this agent will modify                 |
| directories      | string[] | No       | Directory prefixes (agent owns all files under these) |
| task_description | string   | No       | Human-readable task for debugging                     |
| expires_at       | ISO 8601 | Yes      | Auto-expiration time (default: 1 hour)                |

### Lock Acquisition Protocol

#### Step 1: Create Lock Directory

```bash
mkdir -p "{OUTPUT_DIRECTORY}/locks"
```

#### Step 2: Check for Conflicts

Before writing a new lock, check existing locks:

```
For each existing *.lock file:
  Read file list
  Compare against new agent's file list
  If overlap detected:
    CONFLICT - do not proceed with parallel execution
```

#### Step 3: Write Lock File

```json
// {OUTPUT_DIRECTORY}/locks/frontend-developer.lock
{
  "agent": "frontend-developer",
  "locked_at": "2026-01-17T15:30:00Z",
  "files": ["modules/chariot/ui/src/components/Asset/AssetTable.tsx"],
  "expires_at": "2026-01-17T16:30:00Z"
}
```

#### Step 4: Spawn Agent

Only after lock is written, spawn the agent with scope boundaries in prompt.

### Lock Conflict Resolution

When overlap is detected:

| Resolution           | When to Use                                 |
| -------------------- | ------------------------------------------- |
| Sequential execution | One agent must complete before other starts |
| File reassignment    | Move overlapping file to one agent's scope  |
| Directory split      | Divide shared directory between agents      |
| Merge tasks          | Combine into single agent task              |

**Example conflict:**

```
frontend-developer.lock: ["modules/chariot/ui/src/shared/Button.tsx"]
backend-developer.lock: ["modules/chariot/ui/src/shared/Button.tsx"]  # CONFLICT!

Resolution options:
1. Run backend-developer after frontend-developer completes
2. Assign Button.tsx to frontend-developer only
3. Create separate buttons (frontend vs backend specific)
```

### Lock Release Protocol

#### On Agent Completion

Orchestrator deletes the lock file:

```bash
rm "{OUTPUT_DIRECTORY}/locks/{agent-name}.lock"
```

#### On Workflow Completion

Delete entire locks directory:

```bash
rm -rf "{OUTPUT_DIRECTORY}/locks"
```

#### On Expired Lock

If lock's expires_at is in the past:

- Lock can be overwritten by new agent
- Log warning: 'Overwriting expired lock for {agent}'
- Consider: original agent may have failed/timed out

### Integration with Parallel Execution

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

### When to Use Locking

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

### Debugging Lock Issues

#### Stale Locks

If workflow crashed and locks remain:

```bash
# Check lock timestamps
cat {OUTPUT_DIRECTORY}/locks/*.lock | jq '.expires_at'

# Remove expired locks
find {OUTPUT_DIRECTORY}/locks -name '*.lock' -mmin +60 -delete
```

#### Lock Conflicts

If parallel agents report conflicts:

1. Read both lock files
2. Identify overlapping files
3. Decide on resolution strategy
4. Update lock files or change execution pattern
