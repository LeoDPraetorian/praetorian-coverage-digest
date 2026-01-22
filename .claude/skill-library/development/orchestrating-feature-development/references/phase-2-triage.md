# Phase 2: Triage

**Classify work type and determine which phases to execute for feature development.**

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

| Signal                                         | Indicates |
| ---------------------------------------------- | --------- |
| "fix", "bug", "broken", "not working"          | BUGFIX    |
| "add field", "small change", "tweak", "update" | SMALL     |
| "add feature to", "extend", "enhance"          | MEDIUM    |
| "new feature", "build", "create", "implement"  | LARGE     |

**Feature-specific signals:**

| Signal                                        | Indicates |
| --------------------------------------------- | --------- |
| "add button", "add link", "change label"      | SMALL     |
| "new page", "new section", "new component"    | MEDIUM    |
| "new workflow", "new dashboard", "new system" | LARGE     |

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
      { label: "Bug fix", description: "Fix broken existing behavior" },
      { label: "Small change", description: "1-3 files, minor modification" },
      { label: "Feature addition", description: "Add to existing functionality" },
      { label: "New feature", description: "Build something that doesn't exist" }
    ],
    multiSelect: false
  }]
})
```

**Question 2: Scope (if still unclear)**

```
AskUserQuestion({
  questions: [{
    question: "How many components are affected?",
    header: "Scope",
    options: [
      { label: "Single component", description: "Change isolated to one component" },
      { label: "2-3 components", description: "Small set of related components" },
      { label: "Feature area", description: "Changes span a feature section" },
      { label: "Cross-cutting", description: "Touches many parts of the app" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 3: Classify Work Type

Based on signals and answers, classify:

| Work Type | Definition                    | Typical Scope                 |
| --------- | ----------------------------- | ----------------------------- |
| BUGFIX    | Fix broken existing behavior  | 1-3 files                     |
| SMALL     | Minor modification, add field | 1-5 files, 1-2 components     |
| MEDIUM    | Add to existing functionality | 5-15 files, feature area      |
| LARGE     | New feature/capability        | 15+ files or new feature area |

**Feature-specific examples:**

| Example Request               | Work Type |
| ----------------------------- | --------- |
| "Fix button not clicking"     | BUGFIX    |
| "Add tooltip to asset name"   | SMALL     |
| "Add filter to assets table"  | MEDIUM    |
| "Build new metrics dashboard" | LARGE     |

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
Phases: 1 → 2 → 3 → 4 → 8 → 10 → 11 → 13 → 14 → 15 → 16
Skip: 5 (Complexity), 6 (Brainstorming), 7 (Architecture Plan), 9 (Design Verification)
```

### MEDIUM

```
Phases: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
Skip: None
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
    work_type: "Feature addition"
    scope: "Feature area"

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

**Work Type:** MEDIUM (Feature addition)
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

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Entry point
- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Next phase
- [Phase 5: Complexity](phase-5-complexity.md) - May revise triage
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
