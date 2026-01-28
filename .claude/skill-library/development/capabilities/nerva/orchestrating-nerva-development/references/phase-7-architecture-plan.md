# Phase 7: Architecture Plan

**Design technical architecture AND decompose into implementation tasks for fingerprintx plugins.**

---

## Overview

Architecture Plan combines technical design with task decomposition:

1. Define plugin structure and responsibilities
2. Choose detection implementation patterns
3. Design version extraction approach
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

**User Request:** {original plugin request}

**Protocol:** {protocol name from Phase 3}
**Default Ports:** {ports from protocol research}

**Protocol Research:** {from Phase 3}

- Detection strategy: {approach}
- Banner patterns: {key markers}
- Version markers: {if open-source}

**Affected Files:** {from Phase 3 Codebase Discovery}

- Modify: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go, {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go
- Create: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go

**Skills Available:** {from Phase 4 Skill Discovery manifest}

- writing-nerva-tcp-udp-modules
- go-best-practices

**Complexity Tier:** {from Phase 5 Complexity}

- SIMPLE | MODERATE | COMPLEX | VERY_COMPLEX

**Batch Plan:** {from Phase 5 Complexity}

- Batch 1: [type registration]
- Batch 2: [plugin implementation]
- Batch 3: [tests]

**Selected Approach:** {from Phase 6 Brainstorming, if executed}
```

---

## Step 2: Spawn Architecture Agent(s)

**PRE-SPAWN CHECK:** Before spawning architect agent(s), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

| Agents to Spawn                    | Parallel |
| ---------------------------------- | -------- |
| `capability-lead`, `security-lead` | Yes      |

**Agent prompt template:**

```markdown
Task: Create architecture plan for {protocol} fingerprintx plugin

**Protocol:** {protocol name}
**Default Ports:** {ports}
**Detection Strategy:** {from Phase 3 research}
**Banner Patterns:** {from Phase 3}
**Version Markers:** {from Phase 3, if applicable}
**Skills to use:** [from Phase 4 manifest - inject domain-specific skills]
**Complexity:** {from Phase 5}
**Selected Approach:** {from Phase 6, if executed}

Your architecture plan must include:

## Part 1: Technical Architecture

1. Define plugin structure (files, packages, exports)
2. Choose detection implementation pattern
3. Design banner parsing approach
4. Design version extraction (if applicable)
5. Define error handling strategy
6. Document decisions with rationale

## Part 2: Task Decomposition

7. Break implementation into specific tasks
8. Assign files to tasks
9. Define dependencies between tasks
10. Group into batches (from complexity assessment)
11. Set acceptance criteria per task

**Output:** Write architecture.md and plan.md to .fingerprintx-development/ directory.
```

**Critical:** Inject skills from Phase 4 manifest into agent prompts.

---

## Step 3: Validate Architecture Plan Output

When agent(s) return, verify:

1. **Files exist:**

   ```bash
   [ -f ".fingerprintx-development/architecture.md" ] && echo "FOUND" || echo "MISSING"
   [ -f ".fingerprintx-development/plan.md" ] && echo "FOUND" || echo "MISSING"
   ```

2. **Architecture sections present:**
   - Plugin structure
   - Detection pattern with rationale
   - Banner parsing approach
   - Version extraction design (if applicable)
   - Error handling strategy

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
  grep -q "$file" .fingerprintx-development/plan.md || echo "MISSING: $file"
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
      { label: "Architecture needs work", description: "Detection design issues" },
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

Architecture file structure (`.fingerprintx-development/architecture.md`):

```markdown
# Architecture

**Protocol:** {protocol name}
**Designed:** {timestamp}
**Architect(s):** capability-lead, security-lead

---

## Plugin Structure

### Main Plugin: {protocol}Plugin

**Package:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}
**File:** plugin.go
**Exports:**

- Plugin struct implementing fingerprintx.Plugin
- New() constructor

### Detection Logic

**Approach:** {banner match / binary parse / multi-stage}
**Entry Point:** Match() or Detect() method
**Returns:** ServiceMatch with name, version (if available)

---

## Detection Pattern

**Pattern Choice:** {chosen pattern}
**Rationale:** {why this pattern}

**Flow:**

1. Connect to service on port
2. Read initial banner/response
3. Parse for detection markers
4. Extract version (if applicable)
5. Return ServiceMatch or nil

---

## Banner Parsing

**Marker 1:** {bytes/string at position X}
**Marker 2:** {secondary identifier}
**Confidence:** High/Medium based on marker specificity

---

## Version Extraction (if applicable)

**Method:** {regex / struct / offset}
**Pattern:** {extraction pattern}
**Fallback:** "unknown" if extraction fails

---

## Error Handling

| Error              | Response                     |
| ------------------ | ---------------------------- |
| Connection refused | Return nil                   |
| Timeout            | Return nil                   |
| Malformed response | Log warning, return nil      |
| Parse error        | Return match without version |
```

Plan file structure (`.fingerprintx-development/plan.md`):

```markdown
# Implementation Plan

**Protocol:** {protocol name}
**Created:** {timestamp}

---

## Task Summary

| ID   | Task              | File                                                | Batch | Dependencies |
| ---- | ----------------- | --------------------------------------------------- | ----- | ------------ |
| T001 | Add type constant | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go                                | 1     | None         |
| T002 | Add plugin import | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go                              | 1     | T001         |
| T003 | Create plugin     | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go           | 2     | T001         |
| T004 | Add tests         | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}\_test.go | 3     | T003         |

---

## Batch Execution Order

**Batch 1 (Registration):**

- T001: Add type constant
- T002: Add plugin import

**Batch 2 (Implementation):**

- T003: Create plugin

**Batch 3 (Tests):**

- T004: Add tests

---

## Detailed Tasks

### T001: Add type constant

**File:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go
**Change Type:** Modify
**Dependencies:** None
**Batch:** 1

**Implementation Notes:**
Add constant in alphabetical order: Service{Protocol} = "service-{protocol}"

**Acceptance Criteria:**

- [ ] Constant added in alphabetical position
- [ ] Format matches existing constants
- [ ] No duplicate names

### T003: Create plugin

**File:** {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
**Change Type:** Create
**Dependencies:** T001
**Batch:** 2

**Implementation Notes:**
Follow pattern from similar plugin ({similar_plugin}).
Implement Match/Detect method per architecture.

**Acceptance Criteria:**

- [ ] Plugin detects service correctly
- [ ] Version extracted (if applicable)
- [ ] Error handling complete
- [ ] Package comment documents detection strategy
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
  detection_pattern: "banner_match"
  version_extraction: "regex"
  total_tasks: 4
  total_batches: 3

  key_decisions:
    - decision: "Banner string match detection"
      rationale: "Protocol has clear text banner"

  tasks:
    - id: "T001"
      title: "Add type constant"
      batch: 1
      dependencies: []
      status: "pending"

    - id: "T003"
      title: "Create plugin"
      batch: 2
      dependencies: ["T001"]
      status: "pending"
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Architecture Plan Complete

**Detection Pattern:** Banner string match
**Version Extraction:** Regex from greeting
**Tasks Created:** 4
**Batches:** 3

**Execution Order:**

1. T001 + T002 (registration)
2. T003 (plugin implementation)
3. T004 (tests)

**Key Decisions:**

- Banner match detection (clear text protocol)
- Regex for version extraction

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

## Edge Cases

### No Similar Plugin Reference

If no similar plugin exists:

- Document as novel implementation
- Base on generic plugin pattern
- Add extra review attention in Phase 11

### Complex Multi-Stage Detection

If detection requires multiple approaches:

- Document each stage in architecture
- Create separate tasks per stage
- Consider version-specific detection paths

---

## Related References

- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Provides approach
- [Phase 8: Implementation](phase-8-implementation.md) - Uses architecture plan
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skills to inject
- [writing-plans](.claude/skills/writing-plans/SKILL.md) - Task decomposition patterns
- [Compaction Gates](compaction-gates.md) - Pre-spawn token check
