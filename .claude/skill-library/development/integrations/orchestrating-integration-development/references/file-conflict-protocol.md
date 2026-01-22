# File Conflict Protocol (Integration Development)

**Proactive conflict detection before spawning parallel agents.**

## Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

## Integration-Specific File Patterns

Integration development has predictable file patterns:

| Component | File Pattern                                               | Owner Agent           |
| --------- | ---------------------------------------------------------- | --------------------- |
| Client    | `backend/pkg/integrations/{vendor}/client.go`              | integration-developer |
| Collector | `backend/pkg/integrations/{vendor}/collector/collector.go` | integration-developer |
| Models    | `backend/pkg/integrations/{vendor}/models.go`              | integration-developer |
| Tests     | `backend/pkg/integrations/{vendor}/*_test.go`              | backend-tester        |
| Frontend  | `ui/src/sections/integrations/{vendor}/*`                  | frontend-developer    |

## Protocol Steps

### 1. Identify File Sets

For each agent, list files it will likely modify:

```bash
# Integration developer scope
Glob("backend/pkg/integrations/qualys/**/*.go")  # Returns: 5-8 files

# Backend tester scope
Glob("backend/pkg/integrations/qualys/**/*_test.go")  # Returns: 2-4 files
```

### 2. Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: backend/pkg/integrations/qualys/client.go, collector/collector.go
Agent B: backend/pkg/integrations/wiz/client.go, collector/collector.go
Overlap: NONE (different vendors) → Parallelize
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: backend/pkg/integrations/qualys/client.go
Agent B: backend/pkg/integrations/qualys/client_test.go (imports client.go)
Overlap: Logical dependency → SERIALIZE (impl before test)
```

### 3. Integration-Specific Conflict Zones

Common conflict zones in integration development:

| Conflict Zone        | Files Affected                            | Resolution           |
| -------------------- | ----------------------------------------- | -------------------- |
| Shared utilities     | `backend/pkg/integrations/common/*`       | Sequential only      |
| Integration registry | `backend/pkg/integrations/registry.go`    | Sequential only      |
| Frontend shared      | `ui/src/components/integrations/shared/*` | Assign to one agent  |
| Test fixtures        | `backend/pkg/integrations/testdata/*`     | Coordinate carefully |

### 4. Resolve Conflicts

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

### 5. Document in Progress Tracking

```yaml
parallel_execution:
  agents: ["integration-developer", "backend-tester"]
  file_scopes:
    integration-developer:
      - "backend/pkg/integrations/qualys/client.go"
      - "backend/pkg/integrations/qualys/collector/*.go"
    backend-tester:
      - "backend/pkg/integrations/qualys/*_test.go"
  overlap_check: "passed"
  overlap_files: []
  serialization_reason: null
```

## Scope Boundaries in Prompts

Explicitly define what each agent should and should NOT modify:

```markdown
SCOPE BOUNDARIES:

- Only modify files in: backend/pkg/integrations/qualys/
- Do NOT modify: backend/pkg/integrations/common/ (shared code)
- Do NOT modify: backend/pkg/integrations/registry.go (registry)
```

## Integration Development Parallelization Rules

| Agent Combination                                                   | Parallelizable? | Notes                 |
| ------------------------------------------------------------------- | --------------- | --------------------- |
| integration-developer + backend-tester                              | **NO**          | Tests need impl first |
| integration-developer (vendor A) + integration-developer (vendor B) | **YES**         | Different directories |
| integration-reviewer + backend-tester                               | **NO**          | Review before test    |
| frontend-developer + integration-developer                          | **YES**         | Different codebases   |

## When to Skip Conflict Checking

**Skip conflict checking when:**

- Agents work in completely different vendors (e.g., qualys vs wiz)
- Agents create entirely new files with no overlap potential
- Only one agent will modify files (others are read-only analysis)

**Always check when:**

- Multiple agents will modify code in the same vendor directory
- Shared utility files exist in scope
- Agents might refactor common integration patterns

---

## Related References

- [file-locking.md](file-locking.md) - Lock mechanism for sequential access
- [file-scope-boundaries.md](file-scope-boundaries.md) - Scope definition patterns
- [agent-matrix.md](agent-matrix.md) - Agent selection guide
