# Phase 5: Complexity

**Assess technical complexity and determine execution strategy for feature development.**

---

## Overview

Complexity assessment uses Discovery findings to determine:

1. HOW complex is this feature technically?
2. What EXECUTION STRATEGY should we use?
3. Should we REVISE the triage classification?

**Entry Criteria:** Phase 3 (Codebase Discovery) and Phase 4 (Skill Discovery) complete, affected_files identified.

**Exit Criteria:** Complexity tier determined, execution strategy set, MANIFEST updated.

---

## Step 1: Calculate Complexity Score

Use Discovery findings to score:

| Factor          | Weight | Scoring                             |
| --------------- | ------ | ----------------------------------- |
| Files to modify | 2x     | 1-3: Low, 4-10: Medium, 11+: High   |
| Files to create | 1x     | 0-1: Low, 2-5: Medium, 6+: High     |
| Dependencies    | 1.5x   | 0-2: Low, 3-6: Medium, 7+: High     |
| Constraints     | 2x     | 0: Low, 1-2: Medium, 3+: High       |
| Cross-cutting   | 3x     | No: Low, Partial: Medium, Yes: High |

**Scoring values:** Low=1, Medium=2, High=3

**Formula:**

```
score = (files_modify * 2) + (files_create * 1) +
        (dependencies * 1.5) + (constraints * 2) +
        (cross_cutting * 3)
```

---

## Step 2: Determine Complexity Tier

Map score to tier:

| Score | Tier         | Description                               |
| ----- | ------------ | ----------------------------------------- |
| 0-8   | SIMPLE       | Single focus, few files, no cross-cutting |
| 9-15  | MODERATE     | Multiple files, some dependencies         |
| 16-25 | COMPLEX      | Many files, cross-cutting concerns        |
| 26+   | VERY_COMPLEX | System-wide impact, many constraints      |

**Feature-specific examples:**

| Example                                  | Tier         |
| ---------------------------------------- | ------------ |
| Add tooltip to button                    | SIMPLE       |
| Add column to existing table             | MODERATE     |
| New filter system for assets table       | COMPLEX      |
| New dashboard with multiple data sources | VERY_COMPLEX |

---

## Step 3: Set Execution Strategy

Based on complexity tier:

### SIMPLE

```yaml
execution_strategy:
  batch_size: 1 # All tasks in one batch
  parallelization: none
  checkpoints: minimal
  skills_to_invoke: []
```

### MODERATE

```yaml
execution_strategy:
  batch_size: 3-5 # Group related tasks
  parallelization: where_independent
  checkpoints: standard
  skills_to_invoke: []
```

### COMPLEX

```yaml
execution_strategy:
  batch_size: 2-3 # Smaller batches for control
  parallelization: aggressive
  checkpoints: after_each_batch
  skills_to_invoke:
    - developing-with-subagents
```

### VERY_COMPLEX

```yaml
execution_strategy:
  batch_size: 1-2 # Careful progression
  parallelization: aggressive
  checkpoints: after_each_task
  skills_to_invoke:
    - developing-with-subagents
    - persisting-progress-across-sessions
```

---

## Step 4: Check for Triage Revision

Compare complexity tier with work_type from Triage:

| work_type | Expected Tier    | If Actual Higher                |
| --------- | ---------------- | ------------------------------- |
| BUGFIX    | SIMPLE           | Revise to SMALL or flag         |
| SMALL     | SIMPLE/MODERATE  | Revise to MEDIUM if COMPLEX+    |
| MEDIUM    | MODERATE/COMPLEX | Revise to LARGE if VERY_COMPLEX |
| LARGE     | Any              | No revision needed              |

**If revision needed:**

1. Update MANIFEST: `triage_revised: true`
2. Update phases_to_execute based on new work_type
3. Update TodoWrite to add previously skipped phases
4. Notify user of scope change

---

## Step 5: Determine Batch Groupings

Group tasks for implementation batches:

**Feature-specific grouping rules:**

1. Component + its hooks → same batch
2. Component + its tests → same batch
3. Shared utilities → separate batch (can parallelize)
4. Independent components → can parallelize

**Example:**

```yaml
batches:
  batch_1:
    name: "Asset hooks"
    files:
      - "src/hooks/useAssets.ts"
      - "src/hooks/__tests__/useAssets.test.ts"
    reason: "Source and test together"

  batch_2:
    name: "Asset table"
    files:
      - "src/sections/assets/AssetTable.tsx"
      - "src/sections/assets/__tests__/AssetTable.test.tsx"
    reason: "Source and test together"
    depends_on: ["batch_1"] # Uses useAssets hook

  batch_3:
    name: "Shared utilities"
    files:
      - "src/utils/assetUtils.ts"
    reason: "Independent utility"
    parallel_with: ["batch_1"]
```

---

## Step 6: Write Complexity Report

Create `.feature-development/complexity.md`:

```markdown
# Complexity Assessment

**Feature:** {feature description}
**Assessed:** {timestamp}

## Complexity Score

| Factor          | Value | Score           |
| --------------- | ----- | --------------- |
| Files to modify | 3     | 2 (Low × 2)     |
| Files to create | 1     | 1 (Low × 1)     |
| Dependencies    | 2     | 1.5 (Low × 1.5) |
| Constraints     | 1     | 2 (Medium × 2)  |
| Cross-cutting   | No    | 1 (Low × 3)     |
| **Total**       |       | **7.5**         |

## Complexity Tier: SIMPLE

## Execution Strategy

- **Batch size:** All in one batch
- **Parallelization:** None
- **Checkpoints:** Minimal

## Batch Plan

| Batch | Files              | Reason      | Dependencies |
| ----- | ------------------ | ----------- | ------------ |
| 1     | All affected files | SIMPLE tier | None         |

## Triage Revision: None Required

Work type SMALL matches SIMPLE complexity.
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  5_complexity:
    status: "complete"
    completed_at: "{timestamp}"

complexity:
  score: 7.5
  tier: "SIMPLE"
  factors:
    files_modify: { value: 3, score: 2 }
    files_create: { value: 1, score: 1 }
    dependencies: { value: 2, score: 1.5 }
    constraints: { value: 1, score: 2 }
    cross_cutting: { value: false, score: 1 }

  execution_strategy:
    batch_size: "all"
    parallelization: "none"
    checkpoints: "minimal"
    skills_to_invoke: []

  batches:
    - name: "All tasks"
      files: ["src/hooks/useAssets.ts", "src/sections/assets/AssetTable.tsx"]
      depends_on: []

  triage_revised: false
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Complexity Assessment Complete

**Tier:** SIMPLE (score: 7.5)
**Strategy:** All tasks in one batch

**Batch Plan:**

1. All affected files (single batch)

→ Proceeding to Phase 6: Brainstorming (or Phase 7: Architecture Plan if skipped)
```

---

## Edge Cases

### Complexity Higher Than Triage Suggested

If SMALL work is COMPLEX:

1. Present upgrade option to user via AskUserQuestion
2. If approved, add skipped phases back to workflow
3. Update TodoWrite accordingly

### Very Complex Feature

If tier is VERY_COMPLEX:

1. Recommend breaking into multiple features
2. Present options to user
3. If proceeding, add extra checkpoints

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides affected_files
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skill manifest
- [Phase 2: Triage](phase-2-triage.md) - May be revised
- [developing-with-subagents](.claude/skills/developing-with-subagents/SKILL.md) - For COMPLEX+
- [persisting-progress-across-sessions](.claude/skills/persisting-progress-across-sessions/SKILL.md) - For VERY_COMPLEX
