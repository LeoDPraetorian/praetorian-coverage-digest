# File Conflict Protocol (Capability Development)

**Proactive conflict detection before spawning parallel agents.**

## Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

## Capability File Patterns

Capabilities exist in two locations during the migration period:

### External (Migrated)

```
{CAPABILITIES_ROOT}/modules/{capability}/
```

Where `{CAPABILITIES_ROOT}` is resolved via:
1. `CAPABILITIES_ROOT` environment variable
2. `.claude/config.local.json` (`external_repos.capabilities`)
3. Common locations (`../capabilities`, `~/dev/capabilities`)

### Internal (Not Yet Migrated)

```
modules/{module}/
```

Examples: `modules/chariot-aegis-capabilities/`, `modules/msp-definitions/`

## Protocol Steps

### 1. Identify File Sets

For each agent, list files it will likely modify:

```bash
# Capability scope (all types)
Glob("{CAPABILITIES_ROOT}/modules/{capability}/**/*")
```

### 2. Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: {CAPABILITIES_ROOT}/modules/nebula/scanner.go
Agent B: {CAPABILITIES_ROOT}/modules/fingerprintx/mysql/mysql.go
Overlap: NONE → Parallelize
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: {CAPABILITIES_ROOT}/modules/fingerprintx/mysql/mysql.go
Agent B: {CAPABILITIES_ROOT}/modules/fingerprintx/mysql/mysql_test.go, registry.go
Overlap: Both touch mysql plugin area → POTENTIAL CONFLICT
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
      "capability-developer": ["{CAPABILITIES_ROOT}/modules/fingerprintx/mysql/"],
      "capability-tester": ["{CAPABILITIES_ROOT}/modules/fingerprintx/mysql/*_test.go"]
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

- Only modify files in: {CAPABILITIES_ROOT}/modules/fingerprintx/mysql/
- Do NOT modify: registry files (other agent's scope)
```

## When to Skip Conflict Checking

**Skip conflict checking when:**

- Agents work in completely different capability directories
- Agents create entirely new files with no overlap potential
- Only one agent will modify files (others are read-only analysis)

**Always check when:**

- Multiple agents will modify code in the same capability directory
- Shared registry or configuration files exist in scope
- Agents might refactor common dependencies

## Capability Development Considerations

1. **Registry files** are common conflict points - assign to one agent
2. **Test files** typically belong with implementation agent
3. **Different capabilities** (`modules/A/` vs `modules/B/`) rarely conflict
4. **Go modules** may share common interfaces - check import graphs
