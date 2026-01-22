# File Conflict Protocol

**Proactive conflict detection before spawning parallel agents.**

## Why Proactive Beats Reactive

Post-execution conflict detection catches problems AFTER agents have done work. Proactive checking prevents wasted effort and merge conflicts.

## Protocol Steps

### 1. Identify File Sets

For each agent, list files it will likely modify:

```bash
# Frontend agent scope
Glob("src/components/Asset/**/*.tsx")  # Returns: 15 files

# Backend agent scope
Glob("backend/pkg/asset/**/*.go")      # Returns: 12 files
```

### 2. Check for Overlap

Compare file sets to detect conflicts:

**Example A - NO OVERLAP (safe to parallelize):**

```
Agent A: src/hooks/useAsset.ts, src/components/Asset/*
Agent B: src/hooks/useRisk.ts, src/components/Risk/*
Overlap: NONE → Parallelize
```

**Example B - OVERLAP DETECTED (conflict risk):**

```
Agent A: src/hooks/*, src/components/shared/Button.tsx
Agent B: src/components/shared/Button.tsx, src/components/Risk/*
Overlap: src/components/shared/Button.tsx → CONFLICT
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
    "agents": ["frontend-developer", "backend-developer"],
    "file_scopes": {
      "frontend-developer": ["src/components/Asset/*"],
      "backend-developer": ["backend/pkg/asset/*"]
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

- Only modify files in: src/components/Asset/
- Do NOT modify: src/components/shared/ (other agent's scope)
```

## When to Skip Conflict Checking

**Skip conflict checking when:**

- Agents work in completely different directories (e.g., frontend vs backend)
- Agents create entirely new files with no overlap potential
- Only one agent will modify files (others are read-only analysis)

**Always check when:**

- Multiple agents will modify code in the same directory
- Shared utility files exist in scope
- Agents might refactor common dependencies
