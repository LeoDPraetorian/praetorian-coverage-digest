# Phase 2: Triage

**Classify work type and determine which phases to execute for capability development.**

---

## Overview

Triage analyzes the user's request to determine:

1. What TYPE of work is this? (BUGFIX, SMALL, MEDIUM, LARGE)
2. Which PHASES should execute?
3. What CHECKPOINTS are needed?

**Entry Criteria:** Phase 1 (Setup) complete, worktree ready, MANIFEST initialized.

**Exit Criteria:** Work type classified, phases_to_execute determined, MANIFEST updated.

---

## Step 1: Parse User Request

Analyze the user's original request for signals:

| Signal                                | Indicates |
| ------------------------------------- | --------- |
| "fix", "bug", "broken", "not working" | BUGFIX    |
| "update", "tweak", "adjust", "modify" | SMALL     |
| "add", "extend", "enhance", "improve" | MEDIUM    |
| "new", "create", "build", "implement" | LARGE     |

**Capability-specific signals:**

| Signal                                              | Indicates |
| --------------------------------------------------- | --------- |
| "fix VQL syntax", "fix matcher", "update template"  | BUGFIX    |
| "adjust detection", "change threshold"              | SMALL     |
| "add CVE detection", "new matcher", "new collector" | MEDIUM    |
| "new capability", "new scanner", "new integration"  | LARGE     |

**Capability Type Signals (for Phase 3):**

| Signal                                             | Capability Type |
| -------------------------------------------------- | --------------- |
| "VQL", "Velociraptor", "artifact", "collector"     | VQL             |
| "Nuclei", "template", "CVE-", "HTTP scan"          | Nuclei          |
| "Janus", "pipeline", "tool chain", "orchestrate"   | Janus           |
| "fingerprintx", "fingerprint", "service detection" | Fingerprintx    |
| "scanner", "integration", "import", "API"          | Scanner         |

**If ambiguous, proceed to Step 2.**

---

## Step 2: Ask Clarifying Questions (If Needed)

Use AskUserQuestion with maximum 2 questions:

**Question 1: Work Type**

```
AskUserQuestion({
  questions: [{
    question: "What type of change is this?",
    header: "Work Type",
    options: [
      { label: "Bug fix", description: "Fix broken detection or syntax error" },
      { label: "Small change", description: "Adjust threshold, update metadata" },
      { label: "Add detection", description: "New matcher, collector, or CVE" },
      { label: "New capability", description: "Build new VQL/Nuclei/scanner" }
    ],
    multiSelect: false
  }]
})
```

**Question 2: Capability Type (if unclear)**

```
AskUserQuestion({
  questions: [{
    question: "What type of capability is this?",
    header: "Capability",
    options: [
      { label: "VQL", description: "Velociraptor artifact collection" },
      { label: "Nuclei", description: "HTTP vulnerability template" },
      { label: "Janus/Fingerprintx", description: "Go-based scanner module" },
      { label: "Scanner Integration", description: "External API integration" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 3: Classify Work Type

Based on signals and answers, classify:

| Work Type | Definition                      | Typical Scope                   |
| --------- | ------------------------------- | ------------------------------- |
| BUGFIX    | Fix broken detection or syntax  | 1-2 files                       |
| SMALL     | Threshold/metadata modification | 1-3 files, minor logic change   |
| MEDIUM    | Add matcher, collector, or CVE  | 3-10 files, new detection logic |
| LARGE     | New capability or integration   | 10+ files or new capability     |

**Capability-specific examples:**

| Example Request                        | Work Type |
| -------------------------------------- | --------- |
| "Fix VQL syntax error"                 | BUGFIX    |
| "Update Nuclei template severity"      | SMALL     |
| "Add detection for CVE-2024-1234"      | MEDIUM    |
| "Build new Shodan scanner integration" | LARGE     |

---

## Step 4: Determine Phases to Execute

Map work type to phases:

### BUGFIX

```
Phases: 1 → 2 → 3 → 4 → 8 → 10 → 11 → 13 → 14 → 15 → 16
Skip: 5 (Complexity), 6 (Brainstorming), 7 (Architecture Plan), 9 (Design Verification), 12 (Test Planning)
```

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

## Step 5: Determine Checkpoints

Human approval points based on work type:

| Work Type | Checkpoints                                         |
| --------- | --------------------------------------------------- |
| BUGFIX    | Phase 8 (implementation), Phase 16 (completion)     |
| SMALL     | Phase 8 (implementation), Phase 16 (completion)     |
| MEDIUM    | Phase 7 (plan), Phase 8, Phase 16                   |
| LARGE     | Phase 6 (design), Phase 7 (plan), Phase 8, Phase 16 |

See [checkpoint-configuration.md](checkpoint-configuration.md) for detailed checkpoint protocol.

---

## Step 6: Update MANIFEST.yaml

Record triage decisions:

```yaml
current_phase: 2
current_phase_name: "triage"
work_type: "MEDIUM"

triage:
  work_type: "MEDIUM"
  classified_at: "{timestamp}"
  classification_method: "user_clarification" # or "signal_parsing"

  # Preliminary capability type (confirmed in Phase 3)
  preliminary_capability_type: "VQL"

  phases_to_execute: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  phases_to_skip: [6]

  checkpoints:
    - phase: 7
      type: "human_approval"
      description: "Architecture plan review"
    - phase: 8
      type: "human_approval"
      description: "Implementation review"
    - phase: 16
      type: "human_approval"
      description: "Completion review"

  user_answers:
    work_type: "Add detection"
    capability_type: "VQL"

phases:
  2_triage:
    status: "complete"
    completed_at: "{timestamp}"
```

---

## Step 7: Update TodoWrite

Mark skipped phases and update status:

```javascript
// Update TodoWrite - mark skipped as completed with note
TodoWrite([
  { content: "Phase 1: Setup", status: "completed", activeForm: "Setting up workspace" },
  { content: "Phase 2: Triage", status: "completed", activeForm: "Classifying work type" },
  {
    content: "Phase 3: Codebase Discovery",
    status: "in_progress",
    activeForm: "Discovering codebase patterns",
  },
  {
    content: "Phase 4: Skill Discovery",
    status: "pending",
    activeForm: "Mapping skills to technologies",
  },
  {
    content: "Phase 5: Complexity",
    status: "pending",
    activeForm: "Assessing technical complexity",
  },
  {
    content: "Phase 6: Brainstorming (skipped)",
    status: "completed",
    activeForm: "Skipped per triage",
  },
  {
    content: "Phase 7: Architecture Plan",
    status: "pending",
    activeForm: "Creating architecture plan",
  },
  // ... remaining phases
]);
```

---

## Step 8: Report Triage Results

Output to user:

```markdown
## Triage Complete

**Work Type:** MEDIUM (Add detection)
**Capability Type (preliminary):** VQL
**Phases:** 15 of 16 (skipping Brainstorming)
**Checkpoints:** Plan (Phase 7), Implementation (Phase 8), Completion (Phase 16)

→ Proceeding to Phase 3: Codebase Discovery
```

---

## Edge Cases

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

### Downgrade During Execution

If discovery reveals simpler than expected:

- Note in MANIFEST but DO NOT skip phases retroactively
- Simpler work completes faster through planned phases

### Porting Python to Go

If request involves porting existing Python capability to Go:

- Set work_type to MEDIUM or LARGE
- Note: `porting: true` in MANIFEST
- **REQUIRED SUB-SKILL:** `porting-python-capabilities-to-go`

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Entry point
- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Next phase
- [Phase 5: Complexity](phase-5-complexity.md) - May revise triage
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
- [Capability Types](capability-types.md) - VQL, Nuclei, Janus, Fingerprintx, Scanner details
