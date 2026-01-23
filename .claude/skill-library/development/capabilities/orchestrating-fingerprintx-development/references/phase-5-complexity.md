# Phase 5: Complexity

**Assess technical complexity and determine execution strategy for fingerprintx plugin development.**

---

## Overview

Complexity assessment uses Discovery findings to determine:

1. HOW complex is this plugin technically?
2. What EXECUTION STRATEGY should we use?
3. Should we REVISE the triage classification?

**Entry Criteria:** Phase 3 (Codebase Discovery) and Phase 4 (Skill Discovery) complete, protocol research documented.

**Exit Criteria:** Complexity tier determined, execution strategy set, MANIFEST updated.

---

## Step 1: Calculate Complexity Score

Use Discovery findings to score:

| Factor              | Weight | Scoring                                    |
| ------------------- | ------ | ------------------------------------------ |
| Protocol complexity | 3x     | Simple: Low, Binary: Medium, Complex: High |
| Version detection   | 2x     | None: Low, Basic: Medium, Multi: High      |
| Files to create     | 1x     | 1-2: Low, 3-4: Medium, 5+: High            |
| Similar plugins     | 1x     | 2+: Low, 1: Medium, 0: High                |
| Error edge cases    | 1.5x   | 0-2: Low, 3-5: Medium, 6+: High            |

**Scoring values:** Low=1, Medium=2, High=3

**Formula:**

```
score = (protocol_complexity * 3) + (version_detection * 2) +
        (files_create * 1) + (similar_plugins * 1) +
        (error_edge_cases * 1.5)
```

---

## Step 2: Determine Complexity Tier

Map score to tier:

| Score | Tier         | Description                              |
| ----- | ------------ | ---------------------------------------- |
| 0-10  | SIMPLE       | Text banner, no version, similar exists  |
| 11-17 | MODERATE     | Binary protocol, basic version detection |
| 18-25 | COMPLEX      | Multi-stage handshake, version matrix    |
| 26+   | VERY_COMPLEX | Novel protocol, multiple detection paths |

**Fingerprintx-specific examples:**

| Example                             | Tier         |
| ----------------------------------- | ------------ |
| Simple text banner (like HTTP)      | SIMPLE       |
| MySQL with version extraction       | MODERATE     |
| Multi-stage SSH with version matrix | COMPLEX      |
| Novel proprietary protocol          | VERY_COMPLEX |

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

## Step 5: Determine Implementation Batches

Group tasks for implementation:

**Fingerprintx-specific grouping rules:**

1. Type constant + plugin import -> first batch
2. Main detection logic -> core batch
3. Version extraction -> dependent batch (if applicable)
4. Error handling -> can parallelize with tests
5. Tests -> final batches

**Example:**

```yaml
batches:
  batch_1:
    name: "Type registration"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go"
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"
    reason: "Must exist before plugin"

  batch_2:
    name: "Plugin implementation"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go"
    reason: "Core detection logic"
    depends_on: ["batch_1"]

  batch_3:
    name: "Tests"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go"
    reason: "Test the implementation"
    depends_on: ["batch_2"]
```

---

## Step 6: Write Complexity Report

Create `.fingerprintx-development/complexity.md`:

```markdown
# Complexity Assessment

**Protocol:** {protocol name}
**Assessed:** {timestamp}

## Complexity Score

| Factor              | Value  | Score                |
| ------------------- | ------ | -------------------- |
| Protocol complexity | Binary | 2 (Medium x 3) = 6   |
| Version detection   | Basic  | 2 (Medium x 2) = 4   |
| Files to create     | 3      | 2 (Medium x 1) = 2   |
| Similar plugins     | 2      | 1 (Low x 1) = 1      |
| Error edge cases    | 3      | 2 (Medium x 1.5) = 3 |
| **Total**           |        | **16**               |

## Complexity Tier: MODERATE

## Execution Strategy

- **Batch size:** 3-5 tasks per batch
- **Parallelization:** Where independent
- **Checkpoints:** Standard

## Batch Plan

| Batch | Files                | Reason              | Dependencies |
| ----- | -------------------- | ------------------- | ------------ |
| 1     | types.go, plugins.go | Type registration   | None         |
| 2     | plugin.go            | Core implementation | Batch 1      |
| 3     | {protocol}\_test.go  | Tests               | Batch 2      |

## Triage Revision: None Required

Work type LARGE matches MODERATE complexity.
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  5_complexity:
    status: "complete"
    completed_at: "{timestamp}"

complexity:
  score: 16
  tier: "MODERATE"
  factors:
    protocol_complexity: { value: "binary", score: 6 }
    version_detection: { value: "basic", score: 4 }
    files_create: { value: 3, score: 2 }
    similar_plugins: { value: 2, score: 1 }
    error_edge_cases: { value: 3, score: 3 }

  execution_strategy:
    batch_size: "3-5"
    parallelization: "where_independent"
    checkpoints: "standard"
    skills_to_invoke: []

  batches:
    - name: "Type registration"
      files: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go", "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"]
      depends_on: []
    - name: "Plugin implementation"
      files: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go"]
      depends_on: ["batch_1"]
    - name: "Tests"
      files: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go"]
      depends_on: ["batch_2"]

  triage_revised: false
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Complexity Assessment Complete

**Tier:** MODERATE (score: 16)
**Strategy:** 3-5 tasks per batch

**Batch Plan:**

1. Type registration (types.go, plugins.go)
2. Plugin implementation (plugin.go)
3. Tests ({protocol}\_test.go)

-> Proceeding to Phase 6: Brainstorming (or Phase 7: Architecture Plan if skipped)
```

---

## Edge Cases

### Complexity Higher Than Triage Suggested

If SMALL work is COMPLEX:

1. Present upgrade option to user via AskUserQuestion
2. If approved, add skipped phases back to workflow
3. Update TodoWrite accordingly

### Novel Protocol

If no similar plugins exist:

1. Tier is automatically COMPLEX+
2. Recommend extra architecture attention
3. Add research checkpoint before implementation

### Very Complex Protocol

If tier is VERY_COMPLEX:

1. Recommend breaking into detection-only + version-later
2. Present options to user
3. If proceeding, add extra checkpoints

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides protocol research
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skill manifest
- [Phase 2: Triage](phase-2-triage.md) - May be revised
- [developing-with-subagents](.claude/skills/developing-with-subagents/SKILL.md) - For COMPLEX+
- [persisting-progress-across-sessions](.claude/skills/persisting-progress-across-sessions/SKILL.md) - For VERY_COMPLEX
