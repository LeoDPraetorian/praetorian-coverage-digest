# Phase 3: Codebase Discovery

**Explore codebase to identify existing patterns, affected components, and technologies in use.**

---

## Overview

Codebase Discovery systematically explores the codebase to find:

1. Existing patterns to reuse (don't reinvent)
2. Components/files that will be affected
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

**Feature-specific exploration areas:**

| Feature Type | Explore Focus                                           |
| ------------ | ------------------------------------------------------- |
| Frontend     | src/sections/, src/components/, src/hooks/, UI patterns |
| Backend      | modules/\*/backend/, pkg/, handlers, API patterns       |
| Full-stack   | All of above + integration points                       |

**Agent prompt template:**

```markdown
Task: Explore codebase for {feature description}

Find:

1. Existing patterns similar to this feature
2. Components that will likely be modified
3. **Technologies and libraries used** (React hooks, TanStack Query, Zustand, etc.)
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
      "pattern": "Table component with filters",
      "location": "src/sections/assets/",
      "reuse_recommendation": "Extend existing table pattern"
    }
  ],
  "affected_files": [
    {
      "path": "src/sections/assets/AssetTable.tsx",
      "change_type": "modify",
      "reason": "Add new column",
      "technologies": ["React", "TanStack Table", "Tailwind CSS"]
    },
    {
      "path": "src/hooks/useAssets.ts",
      "change_type": "modify",
      "reason": "Add new query parameter",
      "technologies": ["TanStack Query", "TypeScript"]
    }
  ],
  "technologies_detected": {
    "frontend": [
      "React 19",
      "TypeScript",
      "TanStack Query",
      "TanStack Table",
      "Tailwind CSS",
      "Zustand"
    ],
    "testing": ["Vitest", "Playwright", "MSW"]
  },
  "dependencies": [
    {
      "file": "src/hooks/useAssets.ts",
      "dependency_type": "imports",
      "impact": "Hook update needed"
    }
  ],
  "test_files": ["src/sections/assets/__tests__/AssetTable.test.tsx"],
  "constraints": ["Table is used in 3 pages - changes must be backward compatible"]
}
```

**Critical:** The `technologies_detected` field is consumed by Phase 4 (Skill Discovery) to identify relevant skills.

---

## Step 4: Determine Feature Type

Based on discovery findings, classify the feature type:

| Feature Type   | Indicators                                  |
| -------------- | ------------------------------------------- |
| **Frontend**   | Only UI components, hooks, styles affected  |
| **Backend**    | Only Go handlers, packages, Lambda affected |
| **Full-stack** | Both frontend and backend affected          |

Update MANIFEST with `feature_type`:

```yaml
feature_type: "frontend" # or "backend" or "full-stack"
```

This determines which agents spawn in later phases.

---

## Step 5: Validate Findings

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
   - Check package.json for frontend deps
   - Check imports in affected files

---

## Step 6: Write Discovery Report

Create `.feature-development/discovery.md`:

```markdown
# Discovery Report

**Feature:** {feature description}
**Work Type:** {from triage}
**Feature Type:** {frontend/backend/full-stack}
**Discovered:** {timestamp}

## Technologies Detected

### Frontend

- React 19 with TypeScript
- TanStack Query (data fetching)
- TanStack Table (tables)
- Zustand (state management)
- Tailwind CSS (styling)

### Testing

- Vitest (unit)
- Playwright (E2E)
- MSW (API mocking)

## Existing Patterns to Reuse

| Pattern            | Location             | How to Reuse            |
| ------------------ | -------------------- | ----------------------- |
| Table with filters | src/sections/assets/ | Extend existing pattern |
| Custom hooks       | src/hooks/           | Follow hook conventions |
| ...                | ...                  | ...                     |

## Files to Modify

| File                               | Change Type | Technologies          | Reason        |
| ---------------------------------- | ----------- | --------------------- | ------------- |
| src/sections/assets/AssetTable.tsx | modify      | React, TanStack Table | Add column    |
| src/hooks/useAssets.ts             | modify      | TanStack Query        | Add parameter |
| ...                                | ...         | ...                   | ...           |

## New Files to Create

| File                       | Purpose     | Technologies          |
| -------------------------- | ----------- | --------------------- |
| src/hooks/useNewFeature.ts | Custom hook | React, TanStack Query |
| ...                        | ...         | ...                   |

## Dependencies

| Dependency     | Type    | Impact          |
| -------------- | ------- | --------------- |
| useAssets hook | imports | May need update |
| ...            | ...     | ...             |

## Test Coverage

| Source File      | Test File           | Status         |
| ---------------- | ------------------- | -------------- |
| AssetTable.tsx   | AssetTable.test.tsx | Exists         |
| useNewFeature.ts | (none)              | Needs creation |

## Constraints & Risks

- Table used in 3 pages - backward compatibility required
- ...

## Estimated Scope

- Files to modify: {N}
- Files to create: {N}
- Test files affected: {N}
```

---

## Step 7: Update MANIFEST.yaml

Record discovery findings:

```yaml
phases:
  3_codebase_discovery:
    status: "complete"
    completed_at: "{timestamp}"

feature_type: "frontend"

codebase_discovery:
  completed_at: "{timestamp}"

  technologies_detected:
    frontend: ["React 19", "TypeScript", "TanStack Query", "TanStack Table", "Tailwind CSS"]
    testing: ["Vitest", "Playwright", "MSW"]

  affected_files:
    modify: ["src/sections/assets/AssetTable.tsx", "src/hooks/useAssets.ts"]
    create: ["src/hooks/useNewFeature.ts"]

  test_files:
    existing: ["src/sections/assets/__tests__/AssetTable.test.tsx"]
    needed: ["src/hooks/__tests__/useNewFeature.test.ts"]

  patterns_identified: 2
  constraints_identified: 1

  estimated_scope:
    files_modify: 3
    files_create: 1
    tests_affected: 2
```

---

## Step 8: Update TodoWrite

```
TodoWrite([
  { content: "Phase 3: Codebase Discovery", status: "completed", activeForm: "Discovering codebase patterns" },
  { content: "Phase 4: Skill Discovery", status: "in_progress", activeForm: "Mapping skills to technologies" },
  // ... rest
])
```

---

## Step 9: Report Discovery Results

Output to user:

```markdown
## Codebase Discovery Complete

**Feature Type:** Frontend

**Scope Identified:**

- 3 files to modify
- 1 file to create
- 2 test files affected

**Technologies Detected:**

- React 19, TypeScript, TanStack Query, TanStack Table, Tailwind CSS
- Testing: Vitest, Playwright, MSW

**Key Patterns Found:**

- Table with filters pattern (src/sections/assets/)
- Custom hooks pattern (src/hooks/)

**Constraints:**

- Table used in 3 pages - backward compatibility required

→ Proceeding to Compaction Gate 1, then Phase 4: Skill Discovery
```

---

## Edge Cases

### No Existing Patterns Found

If codebase has no similar patterns:

- Document as greenfield area
- Flag for extra attention in Architecture phase
- Consider if this indicates a new pattern needed

### Too Many Affected Files

If affected_files > 15:

- May indicate scope creep
- Return to Phase 2 (Triage) to reassess work_type
- Consider breaking into multiple features

### Mixed Feature Type Uncertainty

If unclear whether frontend or full-stack:

- Default to full-stack (more comprehensive)
- Document uncertainty for Phase 5 (Complexity)

---

## Related References

- [Phase 2: Triage](phase-2-triage.md) - Provides work_type
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Uses technology findings
- [Compaction Gates](compaction-gates.md) - Required before Phase 4
- [discovering-codebases-for-planning](.claude/skills/discovering-codebases-for-planning/SKILL.md) - Required sub-skill
