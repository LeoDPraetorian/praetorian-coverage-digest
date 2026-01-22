# Phase 3: Codebase Discovery

**Explore codebase to identify existing patterns, affected areas, and technologies in use.**

---

## Overview

Codebase Discovery systematically explores the codebase to find:

1. Existing patterns to reuse (don't reinvent)
2. Files/components that will be affected
3. **Technologies and libraries in use** (feeds Phase 4: Skill Discovery)
4. Dependencies and integration points
5. Potential conflicts or constraints

**Entry Criteria:** Phase 2 (Triage) complete, work_type determined.

**Exit Criteria:** Discovery report complete, affected_files identified, technologies documented for skill selection.

**⛔ COMPACTION GATE 1 FOLLOWS:** Before proceeding to Phase 4, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Invoke Discovery Skill

**REQUIRED SUB-SKILL:** `Skill("discovering-codebases-for-planning")`

This skill provides:

- Scoping stage (determine discovery breadth)
- Parallel deep discovery (spawn Explore agents)
- Synthesis (consolidate findings)

Follow the skill's process completely.

---

## Step 2: Spawn Explore Agent(s)

Based on work_type from Triage:

| Work Type | Explore Agents | Thoroughness  |
| --------- | -------------- | ------------- |
| BUGFIX    | 1 agent        | very thorough |
| SMALL     | 1 agent        | very thorough |
| MEDIUM    | 1-2 agents     | very thorough |
| LARGE     | 2-4 agents     | very thorough |

**Agent prompt template:**

```markdown
Task: Explore codebase for {feature/bug description}

Find:

1. Existing patterns similar to this work
2. Files that will likely be modified
3. **Technologies and libraries used** (React hooks, TanStack Query, Zustand, Go handlers, etc.)
4. Dependencies and imports
5. Test files that exist for affected code
6. Configuration or constants that apply

Thoroughness: {very thorough}

Return structured findings as JSON.
```

---

## Step 3: Collect Discovery Findings

Agent(s) return structured findings:

```json
{
  "existing_patterns": [
    {
      "pattern": "Repository pattern for data access",
      "location": "src/repositories/",
      "reuse_recommendation": "Follow same structure"
    }
  ],
  "affected_files": [
    {
      "path": "src/components/UserProfile.tsx",
      "change_type": "modify",
      "reason": "Add new field display",
      "technologies": ["React", "TanStack Query", "Tailwind CSS"]
    },
    {
      "path": "backend/handlers/user.go",
      "change_type": "modify",
      "reason": "Add new endpoint",
      "technologies": ["Go", "Lambda", "DynamoDB"]
    }
  ],
  "technologies_detected": {
    "frontend": ["React", "TypeScript", "TanStack Query", "Zustand", "Tailwind CSS"],
    "backend": ["Go", "AWS Lambda", "DynamoDB", "API Gateway"],
    "testing": ["Vitest", "Playwright", "MSW"]
  },
  "dependencies": [
    {
      "file": "src/hooks/useUser.ts",
      "dependency_type": "imports",
      "impact": "May need hook update"
    }
  ],
  "test_files": ["src/components/__tests__/UserProfile.test.tsx"],
  "constraints": ["UserProfile is used in 12 places - changes must be backward compatible"]
}
```

**Critical:** The `technologies_detected` field is consumed by Phase 4 (Skill Discovery) to identify relevant skills.

---

## Step 4: Validate Findings

Before proceeding, verify:

1. **Affected files exist:**

   ```bash
   for file in {affected_files}; do
     [ -f "$file" ] && echo "✓ $file" || echo "✗ $file NOT FOUND"
   done
   ```

2. **Patterns are current** (not deprecated):
   - Check file modification dates
   - Look for deprecation comments

3. **Dependencies are complete:**
   - Run import analysis if available
   - Check package.json / go.mod for external deps

---

## Step 5: Write Discovery Report

Create `{OUTPUT_DIR}/discovery.md`:

```markdown
# Discovery Report

**Work:** {feature/bug description}
**Work Type:** {from triage}
**Discovered:** {timestamp}

## Technologies Detected

### Frontend

- React 19 with TypeScript
- TanStack Query (data fetching)
- Zustand (state management)
- Tailwind CSS (styling)

### Backend

- Go 1.24
- AWS Lambda handlers
- DynamoDB

### Testing

- Vitest (unit)
- Playwright (E2E)
- MSW (API mocking)

## Existing Patterns to Reuse

| Pattern            | Location          | How to Reuse          |
| ------------------ | ----------------- | --------------------- |
| Repository pattern | src/repositories/ | Follow same structure |
| ...                | ...               | ...                   |

## Files to Modify

| File                           | Change Type | Technologies          | Reason            |
| ------------------------------ | ----------- | --------------------- | ----------------- |
| src/components/UserProfile.tsx | modify      | React, TanStack Query | Add field display |
| backend/handlers/user.go       | modify      | Go, Lambda            | Add endpoint      |
| ...                            | ...         | ...                   | ...               |

## New Files to Create

| File                       | Purpose     | Technologies      |
| -------------------------- | ----------- | ----------------- |
| src/hooks/useNewFeature.ts | Custom hook | React, TypeScript |
| ...                        | ...         | ...               |

## Dependencies

| Dependency   | Type    | Impact          |
| ------------ | ------- | --------------- |
| useUser hook | imports | May need update |
| ...          | ...     | ...             |

## Test Coverage

| Source File     | Test File            | Status         |
| --------------- | -------------------- | -------------- |
| UserProfile.tsx | UserProfile.test.tsx | Exists         |
| NewFeature.ts   | (none)               | Needs creation |

## Constraints & Risks

- UserProfile used in 12 places - backward compatibility required
- ...

## Estimated Scope

- Files to modify: {N}
- Files to create: {N}
- Test files affected: {N}
```

---

## Step 6: Update MANIFEST.yaml

Record discovery findings:

```yaml
phases:
  3_codebase_discovery:
    status: "complete"
    completed_at: "{timestamp}"

codebase_discovery:
  completed_at: "{timestamp}"

  technologies_detected:
    frontend: ["React", "TypeScript", "TanStack Query", "Zustand", "Tailwind CSS"]
    backend: ["Go", "AWS Lambda", "DynamoDB"]
    testing: ["Vitest", "Playwright", "MSW"]

  affected_files:
    modify: ["src/components/UserProfile.tsx", "backend/handlers/user.go", "..."]
    create: ["src/hooks/useNewFeature.ts", "..."]

  test_files:
    existing: ["src/components/__tests__/UserProfile.test.tsx"]
    needed: ["src/hooks/__tests__/useNewFeature.test.ts"]

  patterns_identified: 3
  constraints_identified: 1

  estimated_scope:
    files_modify: 5
    files_create: 2
    tests_affected: 3
```

---

## Step 7: Update TodoWrite

```
TodoWrite([
  { content: "Phase 3: Codebase Discovery", status: "completed", activeForm: "Discovering codebase patterns" },
  { content: "Phase 4: Skill Discovery", status: "in_progress", activeForm: "Identifying relevant skills" },
  // ... rest
])
```

---

## Step 8: Report Discovery Results

Output to user:

```markdown
## Codebase Discovery Complete

**Scope Identified:**

- 5 files to modify
- 2 files to create
- 3 test files affected

**Technologies Detected:**

- Frontend: React, TanStack Query, Zustand, Tailwind CSS
- Backend: Go, Lambda, DynamoDB
- Testing: Vitest, Playwright, MSW

**Key Patterns Found:**

- Repository pattern (src/repositories/)
- Hook pattern (src/hooks/)

**Constraints:**

- UserProfile used in 12 places - backward compatibility required

→ Proceeding to Phase 4: Skill Discovery (will identify skills for these technologies)
```

---

## Edge Cases

### No Existing Patterns Found

If codebase has no similar patterns:

- Document as greenfield area
- Flag for extra attention in Architecture phase
- Consider if this indicates a new architectural pattern needed

### Too Many Affected Files

If affected_files > 20:

- May indicate scope creep
- Return to Phase 2 (Triage) to reassess work_type
- Consider breaking into multiple workflows

### Discovery Takes Too Long

If Explore agents exceed timeout:

- Capture partial findings
- Flag gaps for Phase 5 (Complexity) to address
- Consider splitting discovery into sub-phases

---

## Related References

- [Phase 2: Triage](phase-2-triage.md) - Provides work_type
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Uses technology findings for skill selection
- [Phase 5: Complexity](phase-5-complexity.md) - Uses discovery findings
- [discovering-codebases-for-planning](../../discovering-codebases-for-planning/SKILL.md) - Required sub-skill
