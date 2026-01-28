# Phase 2: Triage

**Classify work type and determine which phases to execute for fingerprintx plugin development.**

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

| Signal                                       | Indicates |
| -------------------------------------------- | --------- |
| "fix", "bug", "broken", "not detecting"      | BUGFIX    |
| "add port", "add banner", "tweak", "update"  | SMALL     |
| "add version detection", "extend", "enhance" | MEDIUM    |
| "new plugin", "create", "implement", "build" | LARGE     |

**Fingerprintx-specific signals:**

| Signal                                         | Indicates |
| ---------------------------------------------- | --------- |
| "fix false positive", "fix detection"          | BUGFIX    |
| "add default port", "add error case"           | SMALL     |
| "add version extraction", "improve detection"  | MEDIUM    |
| "create {protocol} plugin", "new fingerprintx" | LARGE     |

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
      { label: "Bug fix", description: "Fix broken detection or false positive" },
      { label: "Small change", description: "Add port, banner pattern, error case" },
      { label: "Enhancement", description: "Add version detection, improve accuracy" },
      { label: "New plugin", description: "Create plugin for new protocol" }
    ],
    multiSelect: false
  }]
})
```

**Question 2: Scope (if still unclear)**

```
AskUserQuestion({
  questions: [{
    question: "How much protocol research is needed?",
    header: "Research Scope",
    options: [
      { label: "Known issue", description: "Specific bug with clear cause" },
      { label: "Minor research", description: "Add a few banner patterns" },
      { label: "Moderate research", description: "Version fingerprinting research" },
      { label: "Full research", description: "Protocol detection strategy needed" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 3: Classify Work Type

Based on signals and answers, classify:

| Work Type | Definition                     | Typical Scope           |
| --------- | ------------------------------ | ----------------------- |
| BUGFIX    | Fix broken detection/parsing   | 1-2 files               |
| SMALL     | Add port, banner, error case   | 1-3 files               |
| MEDIUM    | Add version detection, enhance | 3-6 files               |
| LARGE     | New plugin from scratch        | 5+ files, full research |

**Fingerprintx-specific examples:**

| Example Request                          | Work Type |
| ---------------------------------------- | --------- |
| "Fix MySQL not detecting version 8.0"    | BUGFIX    |
| "Add port 3307 to MySQL plugin"          | SMALL     |
| "Add MariaDB version detection to MySQL" | MEDIUM    |
| "Create Redis fingerprintx plugin"       | LARGE     |

---

## Step 4: Determine Phases to Execute

Map work type to phases:

### BUGFIX

```
Phases: 1 -> 2 -> 3 -> 4 -> 5 -> 8 -> 10 -> 11 -> 13 -> 14 -> 15 -> 16
Skip: 6 (Brainstorming), 7 (Architecture Plan), 9 (Design Verification), 12 (Test Planning)
```

### SMALL

```
Phases: 1 -> 2 -> 3 -> 4 -> 5 -> 8 -> 10 -> 11 -> 13 -> 14 -> 15 -> 16
Skip: 6 (Brainstorming), 7 (Architecture Plan), 9 (Design Verification)
```

### MEDIUM

```
Phases: 1 -> 2 -> 3 -> 4 -> 5 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16
Skip: 6 (Brainstorming)
```

### LARGE

```
Phases: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16
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
work_type: "LARGE"

triage:
  work_type: "LARGE"
  classified_at: "{timestamp}"
  classification_method: "signal_parsing" # or "user_clarification"

  phases_to_execute: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
  phases_to_skip: []

  checkpoints:
    - phase: 6
      type: "human_approval"
      description: "Protocol design review"
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
    work_type: "New plugin"
    research_scope: "Full research"

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
    content: "Phase 6: Brainstorming",
    status: "pending",
    activeForm: "Brainstorming protocol design",
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

**Work Type:** LARGE (New plugin)
**Phases:** 16 of 16 (full workflow)
**Checkpoints:** Design (Phase 6), Plan (Phase 7), Implementation (Phase 8), Completion (Phase 16)

-> Proceeding to Phase 3: Codebase Discovery
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

### Protocol Already Partially Exists

If enhancing existing plugin vs creating new:

- BUGFIX: Fix specific issue
- SMALL: Add port or minor pattern
- MEDIUM: Add version detection
- LARGE only if rewriting detection logic

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Entry point
- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Next phase
- [Phase 5: Complexity](phase-5-complexity.md) - May revise triage
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
