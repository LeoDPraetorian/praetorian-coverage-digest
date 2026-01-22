# Phase 1: Setup

**Create isolated workspace and initialize orchestration metadata for fingerprintx plugin development.**

---

## Overview

Phase 1 establishes the foundation for all subsequent phases:

- Isolated git worktree (prevents conflicts in parallel execution)
- Output directory for agent artifacts
- MANIFEST.yaml for cross-session persistence
- TodoWrite items for phase tracking

**Exit Criteria:** Worktree created, MANIFEST.yaml initialized, `go build` passing in worktree.

---

## Step 0: Parent Workflow Detection

Before creating workspace, check for parent orchestration:

1. **Check TodoWrite** for parent workflow items
2. **Check invocation** for `parent_workflow_id` parameter
3. **Check filesystem** for MANIFEST.yaml in parent directory

**If parent detected:**

```
Log: "Nested orchestration detected. Parent: {parent_workflow_id}"
-> Skip worktree creation (use parent's)
-> Skip TodoWrite creation (update parent's)
-> Proceed to Phase 2
```

**If no parent:**

```
Log: "Top-level orchestration. Creating fingerprintx workspace."
-> Proceed with standard Phase 1 setup
```

---

## Step 1: Create Isolated Worktree

**REQUIRED SUB-SKILL:** `Read(".claude/skill-library/workflow/using-git-worktrees/SKILL.md")`

1. **Generate plugin name** from protocol:

   ```bash
   PROTOCOL_NAME=$(echo "{protocol name}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
   ```

2. **Determine worktree directory** (skill auto-detects from .worktrees/, worktrees/, or CLAUDE.md)

3. **Create worktree with feature branch:**

   ```bash
   git worktree add {worktree-dir}/$PROTOCOL_NAME-fingerprintx -b feature/$PROTOCOL_NAME-fingerprintx
   cd {worktree-dir}/$PROTOCOL_NAME-fingerprintx
   ```

4. **Run project setup** (fingerprintx is Go):

   ```bash
   go mod download
   ```

5. **Verify clean baseline:**

   ```bash
   go build ./...
   go test ./pkg/plugins/...
   ```

6. **Report ready:**

   ```
   Worktree ready at {worktree-dir}/{protocol}-fingerprintx
   Build passing
   Ready for Phase 2: Triage
   ```

---

## Step 2: Create Output Directory

**REQUIRED SUB-SKILL:** `Skill("persisting-agent-outputs")`

Within the worktree, create the fingerprintx output directory:

```bash
PROTOCOL_ID="$(date -u +%Y-%m-%d-%H%M%S)-$PROTOCOL_NAME"
OUTPUT_DIR=".fingerprintx-development"
mkdir -p $OUTPUT_DIR/agents
```

All phase outputs go here with standardized names:

| Phase                     | Output File                                                 |
| ------------------------- | ----------------------------------------------------------- |
| 2: Triage                 | `triage.md`                                                 |
| 3: Codebase Discovery     | `discovery.md`, `protocol-research.md`, `version-matrix.md` |
| 4: Skill Discovery        | `skill-manifest.yaml`                                       |
| 5: Complexity             | `complexity.md`                                             |
| 6: Brainstorming          | `brainstorming.md`                                          |
| 7: Architecture Plan      | `architecture.md`, `plan.md`                                |
| 8: Implementation         | `agents/capability-developer.md`                            |
| 9: Design Verification    | `design-verification.md`                                    |
| 10: Domain Compliance     | `domain-compliance.md`                                      |
| 11: Code Quality          | `agents/capability-reviewer.md`                             |
| 12: Test Planning         | `test-plan.md`                                              |
| 13: Testing               | `agents/capability-tester.md`                               |
| 14: Coverage Verification | `coverage-verification.md`                                  |
| 15: Test Quality          | `test-quality.md`                                           |
| 16: Completion            | `completion.md`, `pr-description.md`                        |

---

## Step 3: Record Starting Point

Record current commit for potential rollback during abort:

```bash
cd {worktree-dir}/{protocol}-fingerprintx
PRE_PLUGIN_COMMIT=$(git rev-parse HEAD)
```

This commit SHA is stored in MANIFEST.yaml to enable "Rollback changes" if workflow is aborted. See [emergency-abort.md](emergency-abort.md).

---

## Step 4: Initialize MANIFEST.yaml

Create MANIFEST.yaml for cross-session persistence:

```yaml
protocol_name: "{Protocol Name}"
protocol_slug: "{protocol-id}"
orchestration_skill: "orchestrating-fingerprintx-development"
created_at: "{ISO-8601 timestamp}"
description: |
  {User's plugin description}

status: "in-progress"
current_phase: 1
current_phase_name: "setup"
work_type: "pending" # Set in Phase 2: BUGFIX, SMALL, MEDIUM, LARGE

# Standard phases (ALL orchestrations follow this structure)
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

# Fingerprintx-specific tracking
plugin_type: "pending" # open-source, closed-source (set in Phase 3)
default_ports: []
technologies_detected: []
skills_mapped: []

# Protocol research artifacts
protocol_research:
  detection_strategy: "pending"
  banner_patterns: []
  version_markers: []
  shodan_queries: []

# Tracking
agents_contributed: []
artifacts: []
feedback_iterations: 0

# Worktree info
worktree:
  path: "{worktree-dir}/{protocol}-fingerprintx"
  pre_plugin_commit: "{commit-sha}"
```

---

## Step 5: Initialize TodoWrite

Create TodoWrite items for all phases:

```
TodoWrite([
  { content: "Phase 1: Setup", status: "completed", activeForm: "Setting up workspace" },
  { content: "Phase 2: Triage", status: "pending", activeForm: "Classifying work type" },
  { content: "Phase 3: Codebase Discovery", status: "pending", activeForm: "Discovering codebase patterns" },
  { content: "Phase 4: Skill Discovery", status: "pending", activeForm: "Mapping skills to technologies" },
  { content: "Phase 5: Complexity", status: "pending", activeForm: "Assessing technical complexity" },
  { content: "Phase 6: Brainstorming", status: "pending", activeForm: "Brainstorming design" },
  { content: "Phase 7: Architecture Plan", status: "pending", activeForm: "Creating architecture plan" },
  { content: "Phase 8: Implementation", status: "pending", activeForm: "Implementing plugin" },
  { content: "Phase 9: Design Verification", status: "pending", activeForm: "Verifying design requirements" },
  { content: "Phase 10: Domain Compliance", status: "pending", activeForm: "Validating mandatory patterns" },
  { content: "Phase 11: Code Quality", status: "pending", activeForm: "Reviewing code quality" },
  { content: "Phase 12: Test Planning", status: "pending", activeForm: "Planning tests" },
  { content: "Phase 13: Testing", status: "pending", activeForm: "Running tests" },
  { content: "Phase 14: Coverage Verification", status: "pending", activeForm: "Verifying test coverage" },
  { content: "Phase 15: Test Quality", status: "pending", activeForm: "Validating test quality" },
  { content: "Phase 16: Completion", status: "pending", activeForm: "Completing workflow" }
])
```

---

## User Opt-Out (Rare)

If user explicitly requests no worktree:

1. Document in MANIFEST.yaml: `worktree: { opted_out: true, reason: "user request" }`
2. Proceed in main workspace
3. Note increased conflict risk for parallel phases
4. Disable parallel execution in Phases 7, 11, 13

---

## MANIFEST.yaml Update

After Phase 1 completion:

```yaml
phases:
  1_setup:
    status: "complete"
    completed_at: "{timestamp}"
    worktree_path: "{worktree-dir}/{protocol}-fingerprintx"
    output_dir: ".fingerprintx-development"
```

---

## TodoWrite Update

```
Phase 1: Setup -> completed
Phase 2: Triage -> in_progress
```

---

## User Report

```
Phase 1: Setup COMPLETE

Created:
- Worktree: {worktree-dir}/{protocol}-fingerprintx
- Branch: feature/{protocol}-fingerprintx
- Output: .fingerprintx-development/

Baseline verification:
- Build: Passing
- Tests: {N} passing

Proceeding to Phase 2: Triage
```

---

## Related References

- [Directory Structure](directory-structure.md) - Plugin workspace organization
- [Progress Persistence](progress-persistence.md) - Cross-session resume
- [Emergency Abort](emergency-abort.md) - Rollback procedures
- [Workflow Handoff](workflow-handoff.md) - Parent workflow integration
