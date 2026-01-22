# File Conflict Protocol (Capability Development)

**Proactive conflict detection before spawning parallel agents.**

## Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

## Capability-Specific File Patterns

| Capability Type | File Locations                                  |
| --------------- | ----------------------------------------------- |
| VQL             | `modules/chariot-aegis-capabilities/artifacts/` |
| Nuclei          | `modules/nuclei-templates/`                     |
| fingerprintx    | `modules/fingerprintx/pkg/plugins/`             |
| Janus           | `modules/janus/`                                |

## Protocol Steps

### 1. Identify File Sets

For each agent, list files it will likely modify:

```bash
# VQL capability scope
Glob("modules/chariot-aegis-capabilities/artifacts/**/*.yaml")

# Nuclei template scope
Glob("modules/nuclei-templates/**/*.yaml")

# fingerprintx module scope
Glob("modules/fingerprintx/pkg/plugins/{protocol}/**/*.go")
```

### 2. Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: modules/chariot-aegis-capabilities/artifacts/s3-exposure.yaml
Agent B: modules/nuclei-templates/cves/CVE-2024-1234.yaml
Overlap: NONE → Parallelize
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: modules/fingerprintx/pkg/plugins/mysql/mysql.go
Agent B: modules/fingerprintx/pkg/plugins/mysql/mysql_test.go, registry.go
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
      "capability-developer": ["modules/fingerprintx/pkg/plugins/mysql/"],
      "capability-tester": ["modules/fingerprintx/pkg/plugins/mysql/*_test.go"]
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

- Only modify files in: modules/fingerprintx/pkg/plugins/mysql/
- Do NOT modify: modules/fingerprintx/pkg/plugins/ registry files (other agent's scope)
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
3. **YAML templates** (VQL, Nuclei) rarely conflict due to separate namespaces
4. **Go modules** may share common interfaces - check import graphs
