# Phase 2: Triage

**Classify work type and determine which phases to execute.**

**This file provides:** Complete triage protocol for integration development workflows.

---

## Overview

Triage analyzes the user's request to determine:

1. What TYPE of work is this? (SMALL, MEDIUM, LARGE)
2. Which PHASES should execute?
3. What CHECKPOINTS are needed?
4. What integration type is this?

**Entry Criteria:** Phase 1 (Setup) complete, worktree ready, MANIFEST initialized.

**Exit Criteria:** Work type classified, phases_to_execute determined, MANIFEST updated.

---

## Step 1: Parse User Request (Integration-Specific)

Analyze the user's request for integration signals:

| Signal                                      | Indicates |
| ------------------------------------------- | --------- |
| "single endpoint", "basic API"              | SMALL     |
| "asset discovery", "vuln sync"              | MEDIUM    |
| "bidirectional sync", "webhooks", "complex" | LARGE     |

**If ambiguous, proceed to Step 2.**

---

## Step 2: Ask Clarifying Questions (If Needed)

Use AskUserQuestion with maximum 2 questions:

**Question 1: Integration Scope**

```
AskUserQuestion({
  questions: [{
    question: "How complex is this integration?",
    header: "Scope",
    options: [
      { label: "Simple", description: "1-2 endpoints, basic auth, no pagination" },
      { label: "Standard", description: "Asset discovery OR vuln sync, pagination" },
      { label: "Complex", description: "Bidirectional sync, webhooks, multiple entity types" }
    ],
    multiSelect: false
  }]
})
```

**Question 2: Integration Type (if not clear)**

```
AskUserQuestion({
  questions: [{
    question: "What type of data will this integration handle?",
    header: "Type",
    options: [
      { label: "Asset Discovery", description: "Import new assets from external source" },
      { label: "Vulnerability Sync", description: "Import vulns for existing assets" },
      { label: "Bidirectional Sync", description: "Two-way data synchronization" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 3: Classify Work Type (Integration-Specific)

| Work Type | Definition                                 | Integration Examples                |
| --------- | ------------------------------------------ | ----------------------------------- |
| SMALL     | Single endpoint, basic auth                | API key check, single asset list    |
| MEDIUM    | Standard asset discovery or vuln sync      | Shodan, Qualys, ServiceNow          |
| LARGE     | Bidirectional sync, webhooks, multi-entity | Wiz, CrowdStrike, complex platforms |

**Note:** Integration development does NOT have a BUGFIX work type. Bug fixes to existing integrations use a different workflow.

---

## Step 4: Determine Phases to Execute

Map work type to phases:

### SMALL

```
Phases: 1 → 2 → 3 → 4 → 8 → 10 → 11 → 12 → 13 → 14 → 15 → 16
Skip: 5 (Complexity), 6 (Brainstorming), 7 (Architecture Plan), 9 (Design Verification)
```

### MEDIUM

```
Phases: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
Skip: None (all phases execute)
```

### LARGE

```
Phases: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
Skip: None (all phases execute)
```

---

## Step 5: Determine Checkpoints (Integration-Specific)

| Work Type | Checkpoints                                                                 |
| --------- | --------------------------------------------------------------------------- |
| SMALL     | Phase 4 (if skill missing), Phase 10 (P0), Phase 16 (final)                 |
| MEDIUM    | Phase 4 (if skill missing), Phase 7 (architecture), Phase 10 (P0), Phase 16 |
| LARGE     | Phase 4, Phase 6 (design), Phase 7 (architecture), Phase 10 (P0), Phase 16  |

**P0 compliance checkpoint (Phase 10) is ALWAYS required** for integration development regardless of work type.

---

## Step 6: Update MANIFEST.yaml

Record triage decisions with integration-specific fields:

```yaml
triage:
  work_type: "MEDIUM"
  classified_at: "{timestamp}"
  classification_method: "user_clarification"

  # Integration-specific
  integration_type: "asset_discovery" # or vuln_sync, bidirectional_sync
  vendor: "{vendor}"
  estimated_endpoints: 4
  estimated_entity_types: 2

  phases_to_execute: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  phases_to_skip: []

  checkpoints:
    - phase: 7
      type: "human_approval"
      description: "Architecture review"
    - phase: 10
      type: "human_approval"
      description: "P0 compliance review (if violations)"
    - phase: 16
      type: "human_approval"
      description: "Final verification"

  user_answers:
    scope: "Standard"
    integration_type: "Asset Discovery"
```

---

## Step 7: Update TodoWrite

Mark skipped phases and update status. See foundational reference for template.

---

## Step 8: Report Triage Results

Output to user:

```markdown
## Triage Complete

**Work Type:** MEDIUM (Standard integration)
**Integration Type:** Asset Discovery
**Vendor:** {vendor}
**Phases:** 15 of 16 (skipping Brainstorming)
**Checkpoints:** Architecture Plan (Phase 7), P0 Compliance (Phase 10), Final (Phase 16)

→ Proceeding to Phase 3: Codebase Discovery
```

---

## Integration-Specific Edge Cases

### Unknown Vendor API Complexity

If vendor API is unfamiliar:

- Default to MEDIUM
- Add Phase 4 checkpoint for skill creation
- Note: May upgrade to LARGE in Phase 5 (Complexity)

### Existing Integration Enhancement

If enhancing existing integration (not new):

- Consider using bugfix workflow instead
- If substantial new functionality, treat as LARGE

### Multi-Vendor Integration

If integration touches multiple vendor APIs:

- Always LARGE
- Consider splitting into separate integrations

---

## Universal Edge Cases

### User Requests Full Workflow

If user explicitly says "use all phases" or "full workflow":

- Set work_type to LARGE
- Execute all 16 phases
- Note: `classification_method: "user_explicit"`

### Ambiguous After Questions

If still unclear after 2 questions:

- Default to MEDIUM (balanced coverage)
- Note: `classification_method: "default_medium"`
- Add checkpoint at Phase 5 (Complexity) for reassessment

### Upgrade During Execution

If later phases reveal more complexity than expected:

- Triage can be revisited in Phase 5 (Complexity)
- Update MANIFEST with `triage_revised: true`
- Add skipped phases back to TodoWrite

---

## Related References

- [checkpoint-configuration.md](checkpoint-configuration.md) - Integration checkpoints
- [phase-5-complexity.md](phase-5-complexity.md) - May revise triage
- [effort-scaling.md](effort-scaling.md) - Work type definitions
