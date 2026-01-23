# Phase 5: Complexity

**Assess technical complexity and determine execution strategy for capability development.**

---

## Overview

Complexity assessment uses Discovery findings to determine:

1. HOW complex is this capability technically?
2. What EXECUTION STRATEGY should we use?
3. Should we REVISE the triage classification?

**Entry Criteria:** Phase 3 (Codebase Discovery) and Phase 4 (Skill Discovery) complete, capability_type identified.

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

**Capability-specific examples:**

| Example                                  | Tier         |
| ---------------------------------------- | ------------ |
| VQL query syntax fix                     | SIMPLE       |
| Nuclei template matcher adjustment       | SIMPLE       |
| New VQL detection capability             | MODERATE     |
| New Nuclei template for CVE              | MODERATE     |
| Fingerprintx module for new protocol     | COMPLEX      |
| Janus tool chain with 3+ tools           | COMPLEX      |
| Full scanner integration with API client | VERY_COMPLEX |
| Multi-capability detection system        | VERY_COMPLEX |

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

**Capability-specific grouping rules:**

1. Core detection logic → first batch (foundation)
2. Output normalization → same batch as detection
3. Test files → separate batch (can follow)
4. Configuration/metadata → final batch
5. Related capabilities → can parallelize if independent

**Example (Nuclei Template):**

```yaml
batches:
  batch_1:
    name: "Core template"
    files:
      - "nuclei-templates/cves/2024/CVE-2024-XXXX.yaml"
    reason: "Detection logic first"

  batch_2:
    name: "Test fixtures"
    files:
      - "nuclei-templates/cves/2024/CVE-2024-XXXX_test.yaml"
      - "nuclei-templates/cves/2024/test-fixtures/"
    reason: "Tests depend on template"
    depends_on: ["batch_1"]
```

**Example (Fingerprintx Module):**

```yaml
batches:
  batch_1:
    name: "Plugin implementation"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql.go"
    reason: "Core plugin logic"

  batch_2:
    name: "Plugin tests"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/mysql_test.go"
    reason: "Test implementation"
    depends_on: ["batch_1"]

  batch_3:
    name: "Registration"
    files:
      - "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"
    reason: "Plugin registration"
    depends_on: ["batch_1"]
```

---

## Step 6: Write Complexity Report

Create `.capability-development/complexity.md`:

```markdown
# Complexity Assessment

**Capability:** {capability description}
**Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner}
**Assessed:** {timestamp}

## Complexity Score

| Factor          | Value | Score          |
| --------------- | ----- | -------------- |
| Files to modify | 2     | 2 (Low × 2)    |
| Files to create | 2     | 2 (Medium × 1) |
| Dependencies    | 1     | 1 (Low × 1.5)  |
| Constraints     | 1     | 2 (Medium × 2) |
| Cross-cutting   | No    | 1 (Low × 3)    |
| **Total**       |       | **8**          |

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
  score: 8
  tier: "SIMPLE"
  factors:
    files_modify: { value: 2, score: 2 }
    files_create: { value: 2, score: 2 }
    dependencies: { value: 1, score: 1 }
    constraints: { value: 1, score: 2 }
    cross_cutting: { value: false, score: 1 }

  execution_strategy:
    batch_size: "all"
    parallelization: "none"
    checkpoints: "minimal"
    skills_to_invoke: []

  batches:
    - name: "All tasks"
      files: ["nuclei-templates/cves/2024/CVE-2024-XXXX.yaml"]
      depends_on: []

  triage_revised: false
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Complexity Assessment Complete

**Tier:** SIMPLE (score: 8)
**Capability Type:** Nuclei Template
**Strategy:** All tasks in one batch

**Batch Plan:**

1. All affected files (single batch)

→ Proceeding to Phase 6: Brainstorming (or Phase 7: Architecture Plan if skipped)
```

---

## Capability Type Complexity Factors

Different capability types have different complexity baselines:

| Capability Type     | Typical Complexity   | Key Factors                                          |
| ------------------- | -------------------- | ---------------------------------------------------- |
| VQL Capability      | MODERATE             | Query complexity, artifact schema, platform coverage |
| Nuclei Template     | SIMPLE-MODERATE      | Matcher count, request chain, CVE variants           |
| Janus Tool Chain    | COMPLEX              | Tool count, data flow, error handling                |
| Fingerprintx Module | MODERATE-COMPLEX     | Protocol complexity, version detection               |
| Scanner Integration | COMPLEX-VERY_COMPLEX | API surface, auth complexity, rate limits            |

**Adjust scoring based on capability type** - a "simple" scanner integration is still MODERATE complexity due to baseline requirements.

---

## Edge Cases

### Complexity Higher Than Triage Suggested

If SMALL work is COMPLEX:

1. Present upgrade option to user via AskUserQuestion
2. If approved, add skipped phases back to workflow
3. Update TodoWrite accordingly

### Very Complex Capability

If tier is VERY_COMPLEX:

1. Recommend breaking into multiple capabilities
2. Present options to user
3. If proceeding, add extra checkpoints

### Capability Porting (Python to Go)

If porting Python capability to Go:

1. Invoke `porting-python-capabilities-to-go` skill
2. Add porting-specific complexity factors
3. Typically adds +1 tier to base complexity

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides affected_files
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skill manifest
- [Phase 2: Triage](phase-2-triage.md) - May be revised
- [Capability Types](capability-types.md) - Type-specific complexity factors
- [developing-with-subagents](../../developing-with-subagents/SKILL.md) - For COMPLEX+
- [persisting-progress-across-sessions](../../persisting-progress-across-sessions/SKILL.md) - For VERY_COMPLEX
