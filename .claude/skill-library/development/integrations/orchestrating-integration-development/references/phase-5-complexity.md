# Phase 5: Complexity

**Assess technical complexity and determine execution strategy for integration development.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Complexity assessment uses Discovery findings to determine:

1. HOW complex is this integration technically?
2. What EXECUTION STRATEGY should we use?
3. Should we REVISE the triage classification?

**Entry Criteria:** Phase 3 and Phase 4 complete, patterns documented.

**Exit Criteria:** Complexity tier determined, execution strategy set, MANIFEST updated.

---

## Step 1: Calculate Complexity Score (Integration-Specific)

| Factor              | Weight | Scoring                                         |
| ------------------- | ------ | ----------------------------------------------- |
| API endpoints       | 2x     | 1-2: Low, 3-5: Medium, 6+: High                 |
| Entity types        | 2x     | 1: Low, 2-3: Medium, 4+: High                   |
| Auth complexity     | 1.5x   | API Key: Low, OAuth: Medium, Multi-tenant: High |
| Pagination type     | 1x     | None: Low, Simple: Medium, Multi-cursor: High   |
| Rate limit handling | 1x     | None: Low, Simple: Medium, Complex: High        |
| Frontend needed     | 1.5x   | No: Low, Enum only: Medium, Config UI: High     |

**Scoring values:** Low=1, Medium=2, High=3

**Formula:**

```
score = (endpoints * 2) + (entities * 2) +
        (auth * 1.5) + (pagination * 1) +
        (rate_limits * 1) + (frontend * 1.5)
```

---

## Step 2: Determine Complexity Tier

| Score | Tier         | Example Integrations          |
| ----- | ------------ | ----------------------------- |
| 0-10  | SIMPLE       | Single endpoint, API key auth |
| 11-18 | MODERATE     | Standard asset discovery      |
| 19-28 | COMPLEX      | Bidirectional sync, webhooks  |
| 29+   | VERY_COMPLEX | Multi-tenant, full platform   |

---

## Step 3: Set Execution Strategy

### SIMPLE

```yaml
execution_strategy:
  implementation_mode: "batch" # All code at once
  parallelization: none
  checkpoints: "minimal" # Only Phase 10 (P0), Phase 16
```

### MODERATE

```yaml
execution_strategy:
  implementation_mode: "batch"
  parallelization: "where_independent"
  checkpoints: "standard" # Phase 7, 10, 16
```

### COMPLEX

```yaml
execution_strategy:
  implementation_mode: "per_task" # Review between tasks
  parallelization: "aggressive"
  checkpoints: "after_each_batch"
  skills_to_invoke:
    - developing-with-subagents
```

### VERY_COMPLEX

```yaml
execution_strategy:
  implementation_mode: "per_task"
  parallelization: "aggressive"
  checkpoints: "after_each_task"
  skills_to_invoke:
    - developing-with-subagents
    - persisting-progress-across-sessions
```

---

## Step 4: Integration-Specific Batching

Group implementation tasks:

**Batch 1: Core Infrastructure**

- Client setup (auth, HTTP client)
- Type definitions

**Batch 2: Collector Implementation**

- Asset enumeration
- VMFilter integration
- Pagination handling

**Batch 3: P0 Requirements**

- CheckAffiliation
- ValidateCredentials
- errgroup safety

**Batch 4: Frontend (if needed)**

- Enum additions
- Logo assets
- Configuration UI

---

## Step 5: Check for Triage Revision

| work_type | Expected Tier   | If Actual Higher              |
| --------- | --------------- | ----------------------------- |
| SMALL     | SIMPLE          | Revise to MEDIUM if MODERATE+ |
| MEDIUM    | SIMPLE/MODERATE | Revise to LARGE if COMPLEX+   |
| LARGE     | Any             | No revision needed            |

---

## Step 6: Write Complexity Report

Create `{OUTPUT_DIR}/complexity.md`:

```markdown
# Complexity Assessment: {vendor} Integration

**Assessed:** {timestamp}

## Complexity Score

| Factor          | Value         | Score            |
| --------------- | ------------- | ---------------- |
| API endpoints   | 4             | 4 (Medium × 2)   |
| Entity types    | 2             | 4 (Medium × 2)   |
| Auth complexity | OAuth2        | 3 (Medium × 1.5) |
| Pagination      | Cursor        | 2 (Medium × 1)   |
| Rate limits     | Simple        | 2 (Medium × 1)   |
| Frontend        | Enum + Config | 3 (Medium × 1.5) |
| **Total**       |               | **18**           |

## Complexity Tier: MODERATE

## Execution Strategy

- **Mode:** Batch implementation
- **Parallelization:** Where independent
- **Checkpoints:** Standard (Phase 7, 10, 16)

## Batch Plan

| Batch | Tasks                      | Depends On      |
| ----- | -------------------------- | --------------- |
| 1     | Client, types              | None            |
| 2     | Collector, VMFilter        | Batch 1         |
| 3     | CheckAffiliation, errgroup | Batch 2         |
| 4     | Frontend enum, logos       | None (parallel) |

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
  score: 18
  tier: "MODERATE"
  factors:
    endpoints: { value: 4, score: 4 }
    entities: { value: 2, score: 4 }
    auth: { value: "oauth2", score: 3 }
    pagination: { value: "cursor", score: 2 }
    rate_limits: { value: "simple", score: 2 }
    frontend: { value: "enum_config", score: 3 }

  execution_strategy:
    mode: "batch"
    parallelization: "where_independent"
    checkpoints: "standard"
    skills_to_invoke: []

  batches:
    - name: "Core infrastructure"
      tasks: ["client", "types"]
      depends_on: []
    - name: "Collector"
      tasks: ["collector", "vmfilter"]
      depends_on: ["Core infrastructure"]

  triage_revised: false
```

---

## Step 8: Update TodoWrite

```
TodoWrite([
  { content: "Phase 5: Complexity", status: "completed", activeForm: "Assessing technical complexity" },
  { content: "Phase 6: Brainstorming", status: "in_progress", activeForm: "Brainstorming design" },
  // ... rest (or skip Phase 6 if not LARGE)
])
```

---

## Step 9: Report Results

```markdown
## Complexity Assessment Complete

**Tier:** MODERATE (score: 18)
**Strategy:** Batch implementation, parallelize where independent

**Batch Plan:**

1. Core infrastructure (client, types)
2. Collector (VMFilter, pagination)
3. P0 requirements (CheckAffiliation, errgroup)
4. Frontend (parallel with batches 1-3)

→ Proceeding to Phase 6: Brainstorming (if LARGE) or Phase 7: Architecture Plan
```

---

## Gate Checklist

Phase 5 is complete when:

- [ ] Complexity score calculated using integration factors
- [ ] Complexity tier determined (SIMPLE/MODERATE/COMPLEX/VERY_COMPLEX)
- [ ] Execution strategy set
- [ ] Batch plan created
- [ ] Triage revision checked
- [ ] `complexity.md` written to output directory
- [ ] MANIFEST.yaml updated
- [ ] Phase 5 status updated to 'complete'

---

## Related References

- [checkpoint-configuration.md](checkpoint-configuration.md) - Checkpoint strategy by tier
- [phase-6-brainstorming.md](phase-6-brainstorming.md) - LARGE only
- [phase-7-architecture-plan.md](phase-7-architecture-plan.md) - MEDIUM+ proceed here
