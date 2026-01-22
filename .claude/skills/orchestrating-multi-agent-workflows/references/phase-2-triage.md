# Phase 2: Triage

**Classify work type and determine which phases to execute.**

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

| Signal                                        | Indicates |
| --------------------------------------------- | --------- |
| "fix", "bug", "broken", "not working"         | BUGFIX    |
| "add field", "small change", "tweak"          | SMALL     |
| "add feature to", "extend", "enhance"         | MEDIUM    |
| "new feature", "build", "create", "implement" | LARGE     |

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
      { label: "Single file", description: "Change isolated to one file" },
      { label: "2-3 files", description: "Small set of related files" },
      { label: "Multiple components", description: "Changes span several areas" },
      { label: "System-wide", description: "Touches many parts of codebase" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 3: Classify Work Type

Based on signals and answers, classify:

| Work Type | Definition                    | Typical Scope              |
| --------- | ----------------------------- | -------------------------- |
| BUGFIX    | Fix broken existing behavior  | 1-3 files                  |
| SMALL     | Minor modification, add field | 1-5 files                  |
| MEDIUM    | Add to existing functionality | 6-15 files                 |
| LARGE     | New feature/capability        | 15+ files or new subsystem |

---

## Step 4: Determine Phases to Execute

Map work type to phases:

### BUGFIX

```
Phases: 1 → 2 → 3 → 4 → 8 → 10 → 11 → 13 → 14 → 15 → 16
Skip: 5 (Complexity), 6 (Brainstorming), 7 (Architecture Plan),
      9 (Design Verification), 12 (Test Planning)
```

### SMALL

```
Phases: 1 → 2 → 3 → 4 → 8 → 10 → 11 → 12 → 13 → 14 → 15 → 16
Skip: 5 (Complexity), 6 (Brainstorming), 7 (Architecture Plan),
      9 (Design Verification)
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

| Work Type | Checkpoints                                                                        |
| --------- | ---------------------------------------------------------------------------------- |
| BUGFIX    | None (fast path)                                                                   |
| SMALL     | Phase 10 (domain compliance, before code review)                                   |
| MEDIUM    | Phase 7 (architecture plan), Phase 10 (domain compliance)                          |
| LARGE     | Phase 6 (brainstorming), Phase 7 (architecture plan), Phase 10 (domain compliance) |

---

## Step 6: Update MANIFEST.yaml

Record triage decisions:

```yaml
triage:
  work_type: "MEDIUM"
  classified_at: "{timestamp}"
  classification_method: "user_clarification" # or "signal_parsing"

  phases_to_execute: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  phases_to_skip: [5]

  checkpoints:
    - phase: 7
      type: "human_approval"
      description: "Architecture review"
    - phase: 11
      type: "human_approval"
      description: "Code quality review"

  user_answers:
    work_type: "Feature addition"
    scope: "Multiple components"
```

---

## Step 7: Update TodoWrite

Mark skipped phases and update status:

```javascript
// Get current todos, filter to only phases_to_execute
const phases_to_execute = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const all_phases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const skipped = all_phases.filter((p) => !phases_to_execute.includes(p));

// Update TodoWrite - mark skipped as completed with note
TodoWrite([
  { content: "Phase 1: Setup", status: "completed", activeForm: "Setting up workspace" },
  { content: "Phase 2: Triage", status: "completed", activeForm: "Classifying work type" },
  {
    content: "Phase 3: Codebase Discovery",
    status: "in_progress",
    activeForm: "Discovering codebase patterns",
  },
  // ... remaining phases based on phases_to_execute
  // Skipped phases get status: "completed" with "(skipped)" in content
  {
    content: "Phase 5: Brainstorming (skipped)",
    status: "completed",
    activeForm: "Skipped per triage",
  },
]);
```

---

## Step 8: Report Triage Results

Output to user:

```markdown
## Triage Complete

**Work Type:** MEDIUM (Feature addition)
**Phases:** 15 of 16 (skipping Brainstorming)
**Checkpoints:** Architecture Plan (Phase 7), Domain Compliance (Phase 10)

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

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Entry point
- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Next phase
- [Phase 5: Complexity](phase-5-complexity.md) - May revise triage
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
