# Phase 1: Setup

**Create isolated workspace and initialize orchestration metadata for integration development.**

**This file provides:** Complete setup protocol for integration development workflows.

---

## Overview

Phase 1 establishes the foundation for all subsequent phases:

- Isolated git worktree (prevents conflicts in parallel execution)
- Output directory for agent artifacts
- MANIFEST.yaml for cross-session persistence
- TodoWrite items for phase tracking

**Exit Criteria:** Worktree created, MANIFEST.yaml initialized, tests passing in worktree.

---

## Step 0: Parent Workflow Detection

Check for parent orchestration before creating workspace. See [workflow-handoff.md](workflow-handoff.md) for protocol.

---

## Step 1: Create Isolated Worktree

**REQUIRED SUB-SKILL:** `Read(".claude/skill-library/workflow/using-git-worktrees/SKILL.md")`

Integration development is a 16-phase orchestration (exceeds 5-phase threshold).

```bash
# Generate workspace name from vendor
VENDOR='{vendor}'
WORKSPACE_NAME="integration-${VENDOR}"

# Create worktree with feature branch
git worktree add .worktrees/$WORKSPACE_NAME -b feature/integration-$VENDOR
cd .worktrees/$WORKSPACE_NAME

# Verify clean baseline
go test ./... # or appropriate test command
```

---

## Step 2: Create Output Directory

**REQUIRED SUB-SKILL:** `Skill("persisting-agent-outputs")`

```bash
WORKFLOW_ID="$(date -u +%Y-%m-%d-%H%M%S)-integration-$VENDOR"
OUTPUT_DIR=".claude/.output/integrations/$WORKFLOW_ID"
mkdir -p $OUTPUT_DIR
```

**Output files by phase:**

| Phase                     | Output File                |
| ------------------------- | -------------------------- |
| 2: Triage                 | `triage.md`                |
| 3: Codebase Discovery     | `discovery.md`             |
| 4: Skill Discovery        | `skill-manifest.yaml`      |
| 5: Complexity             | `complexity.md`            |
| 6: Brainstorming          | `brainstorming.md`         |
| 7: Architecture Plan      | `architecture-plan.md`     |
| 8: Implementation         | `implementation.md`        |
| 9: Design Verification    | `design-verification.md`   |
| 10: Domain Compliance     | `p0-compliance-review.md`  |
| 11: Code Quality          | `code-quality.md`          |
| 12: Test Planning         | `test-plan.md`             |
| 13: Testing               | `testing.md`               |
| 14: Coverage Verification | `coverage-verification.md` |
| 15: Test Quality          | `test-quality.md`          |
| 16: Completion            | `completion.md`            |

---

## Step 3: Record Starting Point

```bash
cd .worktrees/$WORKSPACE_NAME
PRE_WORKFLOW_COMMIT=$(git rev-parse HEAD)
```

Store in MANIFEST.yaml for potential rollback during abort.

---

## Step 4: Initialize MANIFEST.yaml

```yaml
# Integration-specific fields
vendor: "{vendor}"
integration_type: "asset_discovery" # or vuln_sync, bidirectional_sync
needs_ui: false # Determined in Phase 7

# Workflow tracking
workflow_name: "orchestrating-integration-development2"
workflow_slug: "{workflow-id}"
created_at: "{ISO-8601 timestamp}"
description: |
  {User's request description}

status: "in-progress"
current_phase: 1
current_phase_name: "setup"

# Standard 16 phases
phases:
  1_setup:
    status: "complete"
    completed_at: "{timestamp}"
  2_triage:
    status: "pending"
  3_codebase_discovery:
    status: "pending"
  4_skill_discovery:
    status: "pending"
  5_complexity:
    status: "pending"
  6_brainstorming:
    status: "pending"
    conditional: true # LARGE only
  7_architecture_plan:
    status: "pending"
    conditional: true # MEDIUM+ only
  8_implementation:
    status: "pending"
  9_design_verification:
    status: "pending"
    conditional: true # MEDIUM+ only
  10_domain_compliance:
    status: "pending"
  11_code_quality:
    status: "pending"
    retry_count: 0
  12_test_planning:
    status: "pending"
    conditional: true # MEDIUM+ only
  13_testing:
    status: "pending"
  14_coverage_verification:
    status: "pending"
  15_test_quality:
    status: "pending"
    retry_count: 0
  16_completion:
    status: "pending"

# Integration-specific sub-phases (optional)
sub_phases: {}

# Tracking
agents_contributed: []
artifacts: []
feedback_iterations: 0

# Worktree info
worktree:
  path: ".worktrees/integration-{vendor}"
  pre_workflow_commit: "{commit-sha}"
```

---

## Step 5: Initialize TodoWrite

```
TodoWrite([
  { content: "Phase 1: Setup", status: "completed", activeForm: "Setting up workspace" },
  { content: "Phase 2: Triage", status: "pending", activeForm: "Classifying work type" },
  { content: "Phase 3: Codebase Discovery", status: "pending", activeForm: "Discovering integration patterns" },
  { content: "Phase 4: Skill Discovery", status: "pending", activeForm: "Checking vendor skill" },
  { content: "Phase 5: Complexity", status: "pending", activeForm: "Assessing technical complexity" },
  { content: "Phase 6: Brainstorming", status: "pending", activeForm: "Brainstorming design" },
  { content: "Phase 7: Architecture Plan", status: "pending", activeForm: "Creating architecture plan" },
  { content: "Phase 8: Implementation", status: "pending", activeForm: "Implementing integration" },
  { content: "Phase 9: Design Verification", status: "pending", activeForm: "Verifying design requirements" },
  { content: "Phase 10: Domain Compliance", status: "pending", activeForm: "Validating P0 requirements" },
  { content: "Phase 11: Code Quality", status: "pending", activeForm: "Reviewing code quality" },
  { content: "Phase 12: Test Planning", status: "pending", activeForm: "Planning tests" },
  { content: "Phase 13: Testing", status: "pending", activeForm: "Running tests" },
  { content: "Phase 14: Coverage Verification", status: "pending", activeForm: "Verifying test coverage" },
  { content: "Phase 15: Test Quality", status: "pending", activeForm: "Validating test quality" },
  { content: "Phase 16: Completion", status: "pending", activeForm: "Completing workflow" }
])
```

---

## Integration Type Classification

| Type                   | Description                           | Examples                   |
| ---------------------- | ------------------------------------- | -------------------------- |
| **asset_discovery**    | Discovers and imports external assets | Shodan, Censys, SSC        |
| **vuln_sync**          | Imports vulns for existing assets     | Qualys, Tenable, InsightVM |
| **bidirectional_sync** | Two-way data sync                     | Wiz, Orca, Prisma Cloud    |

Determined in Phase 2 (Triage), recorded in MANIFEST.yaml.

---

## User Opt-Out (Rare)

If user explicitly requests no worktree:

1. Document in MANIFEST.yaml: `worktree: { opted_out: true, reason: "user request" }`
2. Proceed in main workspace
3. Note increased conflict risk for parallel phases
4. Disable parallel execution in later phases

---

## Gate Checklist

Phase 1 is complete when:

- [ ] Git worktree created at `.worktrees/integration-{vendor}`
- [ ] Working in worktree (not main branch)
- [ ] MANIFEST.yaml includes worktree section
- [ ] Output directory created at `.claude/.output/integrations/{workflow-id}/`
- [ ] MANIFEST.yaml initialized with vendor, integration_type, phases structure
- [ ] `persisting-agent-outputs` skill invoked
- [ ] TodoWrite items created for all 16 phases
- [ ] Tests passing in worktree

---

## Related References

- [emergency-abort.md](emergency-abort.md) - Rollback procedures
- [workflow-handoff.md](workflow-handoff.md) - Cross-session resume
- [progress-persistence.md](progress-persistence.md) - State preservation
