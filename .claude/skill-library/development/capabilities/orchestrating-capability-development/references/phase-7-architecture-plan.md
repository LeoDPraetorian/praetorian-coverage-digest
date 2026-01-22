# Phase 7: Architecture Plan

**Design technical architecture AND decompose into implementation tasks for capability development.**

---

## Overview

Architecture Plan combines technical design with task decomposition:

1. Define detection logic structure and boundaries
2. Choose implementation patterns for capability type
3. Design data flows and output normalization
4. Decompose work into specific tasks with dependencies
5. Get human approval before implementation

**Rationale for merged phase:** Technical decisions inform task decomposition. You can't know "this is one task or three" without understanding HOW to implement. Having the architect do both eliminates handoff overhead.

**Conditional:** Skipped for BUGFIX and SMALL work_types (they go straight to implementation).

**Entry Criteria:** Phase 6 (Brainstorming) complete or skipped, Phase 5 (Complexity) complete.

**Exit Criteria:** Architecture approved, tasks defined with acceptance criteria, ready for implementation.

---

## Step 1: Gather Inputs

Collect from previous phases:

```markdown
## Architecture Plan Inputs

**User Request:** {original capability request}

**Capability Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner from Phase 3}

**Technologies Detected:** {from Phase 3 Codebase Discovery}

- Capability: [VQL syntax, Nuclei YAML, Go modules, etc.]

**Affected Files:** {from Phase 3 Codebase Discovery}

- Modify: [list]
- Create: [list]

**Skills Available:** {from Phase 4 Skill Discovery manifest}

- [Relevant library skills for this capability type]

**Complexity Tier:** {from Phase 5 Complexity}

- SIMPLE | MODERATE | COMPLEX | VERY_COMPLEX

**Batch Plan:** {from Phase 5 Complexity}

- Batch 1: [files]
- Batch 2: [files]

**Selected Approach:** {from Phase 6 Brainstorming, if executed}

**Constraints:** {from Phase 3}

- [Performance targets, accuracy requirements, etc.]
```

---

## Step 2: Spawn Architecture Agent(s)

**PRE-SPAWN CHECK:** Before spawning architect agent(s), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

Based on capability_type from Phase 3:

| Capability Type | Agents to Spawn                                    | Parallel |
| --------------- | -------------------------------------------------- | -------- |
| VQL             | `capability-lead`, `security-lead`                 | Yes      |
| Nuclei          | `capability-lead`, `security-lead`                 | Yes      |
| Janus           | `capability-lead`, `backend-lead`                  | Yes      |
| Fingerprintx    | `capability-lead`, `backend-lead`                  | Yes      |
| Scanner         | `capability-lead`, `backend-lead`, `security-lead` | Yes      |

**Agent prompt template:**

```markdown
Task: Create architecture plan for {capability description}

**Capability Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner}
**Technologies:** [from Phase 3]
**Affected Files:** [from Phase 3]
**Skills to use:** [from Phase 4 manifest - inject capability-specific skills]
**Constraints:** [from Phase 3]
**Complexity:** [from Phase 5]
**Selected Approach:** [from Phase 6, if executed]

Your architecture plan must include:

## Part 1: Technical Architecture

1. Define detection logic structure and boundaries
2. Choose appropriate patterns for detected capability type
3. Design data flows and output normalization
4. Consider identified constraints (accuracy, performance)
5. Document decisions with rationale

## Part 2: Task Decomposition

6. Break implementation into specific tasks
7. Assign files to tasks
8. Define dependencies between tasks
9. Group into batches (from complexity assessment)
10. Set acceptance criteria per task

**Output:** Write architecture.md and plan.md to .capability-development/ directory.
```

**Critical:** Inject skills from Phase 4 manifest into agent prompts. Agents MUST use the capability-specific library skills identified.

---

## Step 3: Validate Architecture Plan Output

When agent(s) return, verify:

1. **Files exist:**

   ```bash
   [ -f ".capability-development/architecture.md" ] && echo "FOUND" || echo "MISSING"
   [ -f ".capability-development/plan.md" ] && echo "FOUND" || echo "MISSING"
   ```

2. **Architecture sections present:**
   - Detection logic design
   - Pattern choices with rationale
   - Data flow description
   - Quality targets (accuracy, false positive rate)
   - Trade-offs documented

3. **Plan sections present:**
   - Task list with IDs (T001, T002, etc.)
   - File assignments per task
   - Dependencies defined
   - Batches assigned
   - Acceptance criteria per task

4. **Skills were used** (check agent output metadata for `skills_invoked`)

---

## Step 4: Validate Task Coverage

Ensure all affected files from Discovery have tasks:

```bash
# Cross-reference
for file in {discovery.affected_files}; do
  grep -q "$file" .capability-development/plan.md || echo "MISSING: $file"
done
```

**If gaps found:** Add tasks or document why file doesn't need explicit task.

---

## Step 5: Human Checkpoint

**REQUIRED:** Present architecture plan for approval.

Use AskUserQuestion:

```
AskUserQuestion({
  questions: [{
    question: "Does this architecture and task plan look correct?",
    header: "Plan Review",
    options: [
      { label: "Approve plan", description: "Proceed with implementation" },
      { label: "Architecture needs work", description: "Detection logic or design issues" },
      { label: "Tasks need adjustment", description: "Refine task breakdown" },
      { label: "Wrong approach", description: "Return to brainstorming" }
    ],
    multiSelect: false
  }]
})
```

**If rejected:**

- Capture user feedback
- Update Phase 6 brainstorming if approach is wrong
- Re-spawn architecture agent with feedback
- Loop until approved (with retry limits from orchestration-guards)

---

## Step 6: Document Architecture Plan

Architecture file structure (`.capability-development/architecture.md`):

**Architecture file sections (capability-type agnostic):**

```markdown
# Architecture

**Capability:** {capability description}
**Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner}
**Designed:** {timestamp}
**Architect(s):** {agents}

## Detection Logic Design

- Purpose: {what this detects}
- Method: {detection approach}
- Flow: {step-by-step detection process}

## Pattern Choices

| Decision   | Choice   | Rationale   | Trade-offs   |
| ---------- | -------- | ----------- | ------------ |
| {decision} | {choice} | {rationale} | {trade-offs} |

## Quality Targets

- **Detection Accuracy:** {target from quality-standards.md}
- **False Positive Rate:** {target from quality-standards.md}
- **Performance:** {type-specific metric}

## Data Flow

{input} -> {processing steps} -> {output}
```

**Plan file sections** (`.capability-development/plan.md`):

```markdown
# Implementation Plan

## Task Summary

| ID   | Task                   | File        | Batch | Dependencies |
| ---- | ---------------------- | ----------- | ----- | ------------ |
| T001 | Create detection logic | {file}      | 1     | None         |
| T002 | Add tests              | {test_file} | 2     | T001         |

## Batch Execution Order

**Batch 1:** T001 (foundation) -> **Batch 2:** T002 (tests)

## Detailed Tasks

### T001: {task}

**File:** {file} | **Batch:** 1 | **Dependencies:** None
**Acceptance Criteria:** {checklist}
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  7_architecture_plan:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true
    architect_agents: ["capability-lead", "security-lead"]

architecture_plan:
  components_designed: 2
  patterns_chosen: 3
  total_tasks: 4
  total_batches: 2

  key_decisions:
    - decision: "Use regex matcher for detection"
      rationale: "Accurate, performant, maintainable"

  quality_targets:
    detection_accuracy: ">=95%"
    false_positive_rate: "<=2%"

  tasks:
    - id: "T001"
      title: "Create detection logic"
      batch: 1
      dependencies: []
      status: "pending"

    - id: "T002"
      title: "Add output normalization"
      batch: 1
      dependencies: ["T001"]
      status: "pending"
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Architecture Plan Complete

**Components Designed:** 2 (detection logic, output normalization)
**Tasks Created:** 4
**Batches:** 2

**Execution Order:**

1. T001 + T002 (foundation, sequential)
2. T003 + T004 (tests, can parallelize)

**Quality Targets:**

- Detection Accuracy: >= 95%
- False Positive Rate: <= 2%

**Key Decisions:**

- Regex matcher for detection
- Single request approach

-> Proceeding to Phase 8: Implementation
```

---

## Skip Conditions

Phase 7 is skipped when:

- work_type is BUGFIX or SMALL
- Single file change with obvious pattern
- No architectural decisions needed

**When skipped:**

- Implementation proceeds directly using files from Phase 3 Discovery
- MANIFEST shows `7_architecture_plan: { status: "skipped", reason: "work_type" }`

---

## Capability Type Architecture Patterns

| Capability Type | Key Architecture Decisions                          |
| --------------- | --------------------------------------------------- |
| VQL             | Query structure, artifact selection, output schema  |
| Nuclei          | Template structure, matchers, request flow          |
| Janus           | Pipeline design, tool ordering, error handling      |
| Fingerprintx    | Probe design, protocol handling, version extraction |
| Scanner         | API structure, auth flow, result normalization      |

---

## Edge Cases

### Multiple Conflicting Patterns

If codebase has inconsistent patterns:

- Document both patterns
- Recommend one with rationale
- Flag for broader refactor (out of scope)
- Get user approval on which to follow

### Architecture Too Complex

If architecture seems over-engineered:

- Revisit complexity assessment (Phase 5)
- Consider downgrading work_type
- Simplify design
- Re-submit for approval

### Capability Porting

If porting Python capability to Go:

- Document both Python and Go approaches
- Identify Go-idiomatic patterns
- Reference `porting-python-capabilities-to-go` skill
- Architecture must include porting-specific decisions

---

## Related References

- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Provides approach
- [Phase 8: Implementation](phase-8-implementation.md) - Uses architecture plan
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skills to inject
- [Capability Types](capability-types.md) - Type-specific patterns
- [Quality Standards](quality-standards.md) - Type-specific quality targets
- [writing-plans](../../writing-plans/SKILL.md) - Task decomposition patterns
- [Compaction Gates](compaction-gates.md) - Pre-spawn token check
