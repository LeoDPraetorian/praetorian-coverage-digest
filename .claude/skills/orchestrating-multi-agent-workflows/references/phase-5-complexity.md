# Phase 5: Complexity

**Assess technical complexity and determine execution strategy.**

---

## Overview

Complexity assessment uses Discovery findings to determine:

1. HOW complex is this work technically?
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

**Grouping Rules:**

1. Files in same directory → same batch
2. Files with shared dependencies → same batch
3. Test file with source file → same batch
4. Independent files → can parallelize

**Example:**

```yaml
batches:
  batch_1:
    name: "User hooks"
    files: ["src/hooks/useUser.ts", "src/hooks/__tests__/useUser.test.ts"]
    reason: "Source and test together"

  batch_2:
    name: "Profile component"
    files: ["src/components/UserProfile.tsx", "src/components/__tests__/UserProfile.test.tsx"]
    reason: "Source and test together"
    depends_on: ["batch_1"] # Uses useUser hook

  batch_3:
    name: "Independent utilities"
    files: ["src/utils/format.ts"]
    reason: "No dependencies"
    parallel_with: ["batch_1", "batch_2"]
```

---

## Step 6: Write Complexity Report

Create `{OUTPUT_DIR}/complexity.md`:

```markdown
# Complexity Assessment

**Work:** {feature/bug description}
**Assessed:** {timestamp}

## Complexity Score

| Factor          | Value | Score            |
| --------------- | ----- | ---------------- |
| Files to modify | 5     | 4 (Medium × 2)   |
| Files to create | 2     | 2 (Medium × 1)   |
| Dependencies    | 4     | 3 (Medium × 1.5) |
| Constraints     | 1     | 2 (Medium × 2)   |
| Cross-cutting   | No    | 1 (Low × 3)      |
| **Total**       |       | **12**           |

## Complexity Tier: MODERATE

## Execution Strategy

- **Batch size:** 3-5 tasks per batch
- **Parallelization:** Where independent
- **Checkpoints:** Standard (after major phases)

## Batch Plan

| Batch | Files                                 | Reason        | Dependencies    |
| ----- | ------------------------------------- | ------------- | --------------- |
| 1     | useUser.ts, useUser.test.ts           | Source + test | None            |
| 2     | UserProfile.tsx, UserProfile.test.tsx | Source + test | Batch 1         |
| 3     | format.ts                             | Independent   | None (parallel) |

## Triage Revision: None Required

Work type MEDIUM matches MODERATE complexity.
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  5_complexity:
    status: "complete"
    completed_at: "{timestamp}"

complexity:
  score: 12
  tier: "MODERATE"
  factors:
    files_modify: { value: 5, score: 4 }
    files_create: { value: 2, score: 2 }
    dependencies: { value: 4, score: 3 }
    constraints: { value: 1, score: 2 }
    cross_cutting: { value: false, score: 1 }

  execution_strategy:
    batch_size: "3-5"
    parallelization: "where_independent"
    checkpoints: "standard"
    skills_to_invoke: []

  batches:
    - name: "User hooks"
      files: ["src/hooks/useUser.ts"]
      depends_on: []
    - name: "Profile component"
      files: ["src/components/UserProfile.tsx"]
      depends_on: ["User hooks"]

  triage_revised: false
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Complexity Assessment Complete

**Tier:** MODERATE (score: 12)
**Strategy:** 3-5 tasks per batch, parallelize where independent

**Batch Plan:**

1. User hooks (no dependencies)
2. Profile component (depends on batch 1)
3. Utilities (can parallelize with 1 & 2)

→ Proceeding to Phase 6: Brainstorming (or Phase 7: Architecture Plan if skipped)
```

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides affected_files
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skill manifest
- [Phase 2: Triage](phase-2-triage.md) - May be revised
- [developing-with-subagents](../../developing-with-subagents/SKILL.md) - For COMPLEX+
- [persisting-progress-across-sessions](../../persisting-progress-across-sessions/SKILL.md) - For VERY_COMPLEX
