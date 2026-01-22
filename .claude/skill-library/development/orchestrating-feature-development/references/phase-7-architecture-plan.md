# Phase 7: Architecture Plan

**Design technical architecture AND decompose into implementation tasks for feature development.**

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

**Feature Type:** {frontend/backend/full-stack from Phase 3}

**Technologies Detected:** {from Phase 3 Codebase Discovery}

- Frontend: [React, TanStack Query, TanStack Table, etc.]

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

Based on feature_type from Phase 3:

| Feature Type | Agents to Spawn                                  | Parallel |
| ------------ | ------------------------------------------------ | -------- |
| Frontend     | `frontend-lead`, `security-lead`                 | Yes      |
| Backend      | `backend-lead`, `security-lead`                  | Yes      |
| Full-stack   | `frontend-lead`, `backend-lead`, `security-lead` | Yes      |

**Agent prompt template:**

```markdown
Task: Create architecture plan for {feature description}

**Feature Type:** {frontend/backend/full-stack}
**Technologies:** [from Phase 3]
**Affected Files:** [from Phase 3]
**Skills to use:** [from Phase 4 manifest - inject domain-specific skills]
**Constraints:** [from Phase 3]
**Complexity:** [from Phase 5]
**Selected Approach:** [from Phase 6, if executed]

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

**Output:** Write architecture-plan.md to .feature-development/ directory.
```

**Critical:** Inject skills from Phase 4 manifest into agent prompts. Agents MUST use the domain-specific library skills identified.

---

## Step 3: Validate Architecture Plan Output

When agent(s) return, verify:

1. **File exists:**

   ```bash
   [ -f ".feature-development/architecture-plan.md" ] && echo "FOUND" || echo "MISSING"
   ```

2. **Architecture sections present:**
   - Component breakdown
   - Pattern choices with rationale
   - Data flow description
   - State management approach
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
  grep -q "$file" .feature-development/architecture-plan.md || echo "MISSING: $file"
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

Architecture plan file structure (`.feature-development/architecture-plan.md`):

```markdown
# Architecture Plan

**Feature:** {description}
**Designed:** {timestamp}
**Architect(s):** {agent names}

---

## Part 1: Technical Architecture

### Component Breakdown

#### Component: AssetFilterPanel

**Responsibility:** Provide filtering controls for asset table
**Location:** `src/sections/assets/components/AssetFilterPanel.tsx`
**Pattern:** Controlled component with TanStack Table integration
**Rationale:** Follows existing filter patterns in codebase

#### Component: useAssetFilters

**Responsibility:** Manage filter state with URL persistence
**Location:** `src/hooks/useAssetFilters.ts`
**Pattern:** Custom hook with Zustand store
**Rationale:** Existing pattern for stateful hooks

### Pattern Choices

| Decision         | Choice          | Rationale        | Trade-offs      |
| ---------------- | --------------- | ---------------- | --------------- |
| State management | Zustand         | Existing pattern | None            |
| Table filtering  | TanStack Table  | Already in use   | None            |
| URL persistence  | useSearchParams | Standard pattern | More complexity |

### Data Flow

User Input → FilterPanel → useAssetFilters → URL Params → useAssets → TanStack Query → Re-render

### Integration Points

- **Existing Hook:** useAssets (add filter params)
- **Table Component:** AssetTable (add filter columns)
- **URL Params:** Search params for persistence

---

## Part 2: Task Decomposition

### Task Summary

| ID   | Task                | File                                                | Batch | Dependencies |
| ---- | ------------------- | --------------------------------------------------- | ----- | ------------ |
| T001 | Create filter hook  | src/hooks/useAssetFilters.ts                        | 1     | None         |
| T002 | Create filter panel | src/sections/assets/components/AssetFilterPanel.tsx | 2     | T001         |
| T003 | Update asset table  | src/sections/assets/AssetTable.tsx                  | 2     | T001         |
| T004 | Add tests           | src/hooks/**tests**/useAssetFilters.test.ts         | 3     | T001         |

### Batch Execution Order

**Batch 1 (Foundation):**

- T001: Create filter hook

**Batch 2 (Components - parallel):**

- T002: Create filter panel
- T003: Update asset table

**Batch 3 (Tests):**

- T004: Add tests

### Detailed Tasks

#### T001: Create filter hook

**File:** src/hooks/useAssetFilters.ts
**Change Type:** Create
**Dependencies:** None
**Batch:** 1

**Implementation Notes:**
Follow existing useAssets pattern. Use Zustand for state,
persist to URL params. Handle multiple filter types.

**Acceptance Criteria:**

- [ ] Hook manages filter state
- [ ] URL params persist on change
- [ ] Type-safe filter definitions
- [ ] Unit test covers state changes

**Estimated Lines:** ~60
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  7_architecture_plan:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true
    architect_agents: ["frontend-lead", "security-lead"]

architecture_plan:
  components_designed: 2
  patterns_chosen: 3
  total_tasks: 4
  total_batches: 3

  key_decisions:
    - decision: "Use Zustand for filter state"
      rationale: "Existing pattern, URL persistence"

  tasks:
    - id: "T001"
      title: "Create filter hook"
      batch: 1
      dependencies: []
      status: "pending"

    - id: "T002"
      title: "Create filter panel"
      batch: 2
      dependencies: ["T001"]
      status: "pending"
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Architecture Plan Complete

**Components Designed:** 2 (useAssetFilters, AssetFilterPanel)
**Tasks Created:** 4
**Batches:** 3

**Execution Order:**

1. T001 (foundation)
2. T002 + T003 (parallel)
3. T004 (tests)

**Key Decisions:**

- Zustand for filter state (existing pattern)
- URL params for persistence

→ Proceeding to Phase 8: Implementation
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

---

## Related References

- [Phase 6: Brainstorming](phase-6-brainstorming.md) - Provides approach
- [Phase 8: Implementation](phase-8-implementation.md) - Uses architecture plan
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skills to inject
- [writing-plans](.claude/skills/writing-plans/SKILL.md) - Task decomposition patterns
- [Compaction Gates](compaction-gates.md) - Pre-spawn token check
