# Phase 7: Architecture Plan

**Design technical architecture AND decompose into implementation tasks.**

---

## Overview

Architecture Plan combines technical design with task decomposition:

1. Define component boundaries and responsibilities
2. Choose implementation patterns
3. Design data flows and state management
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

**User Request:** {original feature request}

**Technologies Detected:** {from Phase 3 Codebase Discovery}

- Frontend: [React, TanStack Query, etc.]
- Backend: [Go, Lambda, etc.]

**Affected Files:** {from Phase 3 Codebase Discovery}

- Modify: [list]
- Create: [list]

**Skills Available:** {from Phase 4 Skill Discovery manifest}

- [Relevant library skills for this domain]

**Complexity Tier:** {from Phase 5 Complexity}

- SIMPLE | MODERATE | COMPLEX | VERY_COMPLEX

**Batch Plan:** {from Phase 5 Complexity}

- Batch 1: [files]
- Batch 2: [files]

**Selected Approach:** {from Phase 6 Brainstorming, if executed}

**Constraints:** {from Phase 3}

- [Backward compatibility, performance, etc.]
```

---

## Step 2: Spawn Architecture Agent(s)

**⚡ PRE-SPAWN CHECK:** Before spawning architect agent(s), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

Based on domains touched (from Phase 3 technologies_detected):

| Domains          | Agents to Spawn                 | Parallel |
| ---------------- | ------------------------------- | -------- |
| Frontend only    | `frontend-lead`                 | No       |
| Backend only     | `backend-lead`                  | No       |
| Frontend+Backend | `frontend-lead`, `backend-lead` | Yes      |
| Integration      | `integration-lead`              | No       |
| Capability/Tool  | `capability-lead`, `tool-lead`  | No       |
| Multiple domains | Relevant leads for each domain  | Yes      |

**Agent prompt template:**

```markdown
Task: Create architecture plan for {feature description}

**Technologies:** [from Phase 3]
**Affected Files:** [from Phase 3]
**Skills to use:** [from Phase 4 manifest - inject domain-specific skills]
**Constraints:** [from Phase 3]
**Complexity:** [from Phase 5]

Your architecture plan must include:

## Part 1: Technical Architecture

1. Define component boundaries and responsibilities
2. Choose appropriate patterns for detected technologies
3. Design data flows and state management
4. Consider identified constraints
5. Document decisions with rationale

## Part 2: Task Decomposition

6. Break implementation into specific tasks
7. Assign files to tasks
8. Define dependencies between tasks
9. Group into batches (from complexity assessment)
10. Set acceptance criteria per task

**Output:** Write architecture-plan.md to feature directory following persisting-agent-outputs structure.
```

**Critical:** Inject skills from Phase 4 manifest into agent prompts. Agents MUST use the domain-specific library skills identified for the technologies being touched.

---

## Step 3: Validate Architecture Plan Output

When agent(s) return, verify:

1. **File exists:**

   ```bash
   [ -f "{OUTPUT_DIR}/architecture-plan.md" ] && echo "FOUND" || echo "MISSING"
   ```

2. **Part 1 sections present (Architecture):**
   - Component breakdown
   - Pattern choices with rationale
   - Data flow diagrams
   - State management approach
   - Integration points
   - Trade-offs documented

3. **Part 2 sections present (Tasks):**
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
  grep -q "$file" architecture-plan.md || echo "MISSING: $file"
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
      { label: "Architecture needs work", description: "Technical design issues" },
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

Architecture plan file structure (`{OUTPUT_DIR}/architecture-plan.md`):

```markdown
# Architecture Plan

**Feature:** {description}
**Designed:** {timestamp}
**Architect(s):** {agent names}

---

## Part 1: Technical Architecture

### Component Breakdown

#### Component: UserMetricsHook

**Responsibility:** Fetch and cache user metrics data
**Location:** `src/hooks/useUserMetrics.ts`
**Pattern:** React custom hook with TanStack Query
**Rationale:** Existing pattern used in useAssets

#### Component: MetricsDisplay

**Responsibility:** Render metrics visualization
**Location:** `src/components/MetricsDisplay.tsx`
**Pattern:** Controlled component with prop-driven config
**Rationale:** Reusable across multiple views

### Pattern Choices

| Decision              | Choice         | Rationale               | Trade-offs             |
| --------------------- | -------------- | ----------------------- | ---------------------- |
| Data fetching         | TanStack Query | Already in use, caching | Learning curve         |
| State management      | Zustand        | Lightweight, existing   | Not as robust as Redux |
| Component composition | Compound       | Flexible, composable    | More initial setup     |

### Data Flow

User Action → MetricsDisplay → useUserMetrics → TanStack Query → API → Re-render

### Integration Points

- **API Endpoint:** `GET /api/metrics/{userId}`
- **Shared Hook:** useUser (provides userId)
- **Style System:** Tailwind CSS

---

## Part 2: Task Decomposition

### Task Summary

| ID   | Task                 | File                              | Batch | Dependencies |
| ---- | -------------------- | --------------------------------- | ----- | ------------ |
| T001 | Create metrics hook  | src/hooks/useUserMetrics.ts       | 1     | None         |
| T002 | Add format utilities | src/utils/format.ts               | 1     | None         |
| T003 | Build MetricsDisplay | src/components/MetricsDisplay.tsx | 2     | T001         |
| T004 | Integration tests    | src/**tests**/integration.test.ts | 3     | T001, T003   |

### Batch Execution Order

**Batch 1 (Parallel):**

- T001: Create metrics hook
- T002: Add format utilities

**Batch 2 (After Batch 1):**

- T003: Build MetricsDisplay component

**Batch 3 (After Batch 2):**

- T004: Integration tests

### Detailed Tasks

#### T001: Create metrics hook

**File:** src/hooks/useUserMetrics.ts
**Change Type:** Create
**Dependencies:** None
**Batch:** 1

**Implementation Notes:**
Follow existing useAssets pattern. Use TanStack Query with
30-second polling. Handle loading/error states.

**Acceptance Criteria:**

- [ ] Hook fetches metrics on mount
- [ ] Loading state handled correctly
- [ ] Error state handled correctly
- [ ] Unit test added with 3 test cases

**Estimated Lines:** ~50

---

#### T002: Add format utilities

...
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  7_architecture_plan:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true
    architect_agents: ["frontend-lead"]

architecture_plan:
  components_designed: 2
  patterns_chosen: 3
  total_tasks: 4
  total_batches: 3

  key_decisions:
    - decision: "Use TanStack Query for data fetching"
      rationale: "Existing pattern, handles caching"

  tasks:
    - id: "T001"
      title: "Create metrics hook"
      batch: 1
      dependencies: []
      status: "pending"

    - id: "T002"
      title: "Add format utilities"
      batch: 1
      dependencies: []
      status: "pending"
```

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 7: Architecture Plan", status: "completed", activeForm: "Creating architecture plan" },
  { content: "Phase 8: Implementation", status: "in_progress", activeForm: "Implementing code" },
  // ... rest
])
```

Output to user:

```markdown
## Architecture Plan Complete

**Components Designed:** 2 (UserMetricsHook, MetricsDisplay)
**Tasks Created:** 4
**Batches:** 3
**Execution Order:**

1. T001 + T002 (parallel)
2. T003
3. T004

**Key Decisions:**

- TanStack Query for data fetching (existing pattern)
- Compound component pattern (flexible composition)

Proceeding to Phase 8: Implementation
```

---

## Skip Conditions

Phase 7 is skipped when:

- work_type is BUGFIX or SMALL
- Single file change with obvious pattern
- No architectural decisions or task decomposition needed

**When skipped:**

- Implementation proceeds directly using files from Phase 3 Discovery
- MANIFEST shows `7_architecture_plan: { status: "skipped", reason: "work_type" }`

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

### Task Granularity Disagreement

If user thinks tasks are too granular or not granular enough:

- Adjust based on feedback
- Re-submit for approval
- Document reasoning for task boundaries

---

## Related References

- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Provides approach (if executed)
- [Phase 8: Implementation](phase-8-implementation.md) - Uses architecture plan
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skills to inject
- [writing-plans](../../writing-plans/SKILL.md) - Task decomposition patterns
- [brainstorming](../../brainstorming/SKILL.md) - For architecture alternatives
