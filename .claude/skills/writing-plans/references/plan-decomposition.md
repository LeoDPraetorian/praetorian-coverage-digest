# Plan Decomposition

**Progressive disclosure for plan OUTPUT - breaking massive plans into digestible phases.**

## Problem

Monolithic plan files create execution problems:
- 5,000-10,000 line plans overwhelm executing agents
- Context windows can't hold entire plan
- Agents lose track of progress
- No clear completion milestones
- Hard to resume after interruption

## Solution

**Decompose large plans into phases** - discrete units of completion that agents can load, execute, and verify independently.

---

## When to Decompose

Apply decomposition when plans meet ANY threshold:

| Threshold | Indicates |
|-----------|-----------|
| **>30 tasks** | Too many steps for single execution flow |
| **>5 major components** | Multiple independent concerns |
| **>2500 lines** | Context overflow risk |
| **>3 days estimated** | Multi-session work |

**When in doubt:** Decompose. Better to have 3 small phases than 1 overwhelming document.

---

## Phased Plan Structure

### Directory Layout

```
docs/plans/YYYY-MM-DD-feature-name/
├── PLAN.md                      # Manifest (index of phases)
├── phase-0-foundation.md        # First phase (prerequisites)
├── phase-1-component-a.md       # Self-contained unit
├── phase-2-component-b.md       # Self-contained unit
├── phase-3-integration.md       # Final phase (brings together)
└── phase-4-cleanup.md           # Optional (tech debt, docs)
```

### Naming Convention

**Pattern:** `phase-N-descriptive-name.md`

- **N:** Zero-indexed phase number (0, 1, 2, 3...)
- **descriptive-name:** Lowercase, hyphenated, describes phase focus

**Examples:**
- `phase-0-foundation.md` - Setup, infrastructure, shared utilities
- `phase-1-router-migration.md` - TanStack Router migration
- `phase-2-table-migration.md` - TanStack Table adoption
- `phase-3-state-refactor.md` - State management cleanup
- `phase-4-cleanup.md` - Remove deprecated code, update docs

---

## Phase File Structure

Each phase file is **self-contained** and follows this template:

````markdown
# Phase N: [Component/Focus Name]

> **Phase Status:** Not Started | In Progress | Complete
> **Estimated Tasks:** 10-20
> **Estimated Lines:** ~800

---

## Entry Criteria

**Prerequisites from previous phases:**

- ✅ Phase 0: Foundation infrastructure in place
- ✅ Phase 0: Shared utilities available
- ✅ Tests passing before starting this phase

**If entry criteria not met:** Complete prerequisite phases first.

---

## Exit Criteria (Definition of Done)

This phase is complete when:

- [ ] All N tasks implemented with passing tests
- [ ] No TypeScript/Go compilation errors
- [ ] All new tests passing
- [ ] Code reviewed (if applicable)
- [ ] Committed to version control

---

## Phase Goal

**What this phase accomplishes:**

[2-3 sentences describing the discrete deliverable this phase produces]

**What this phase does NOT include:**

[Explicitly state out-of-scope items to prevent scope creep]

---

## Tasks

### Task 1: [Component Name]

**Files:**
- Create: `exact/path/to/file.tsx`
- Modify: `exact/path/to/existing.tsx:123-145`
- Test: `tests/exact/path/to/test.tsx`

**Step 1: Write the failing test**

```typescript
describe('ComponentName', () => {
  it('should handle specific behavior', () => {
    // Test implementation
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test path/to/test.tsx`
Expected: FAIL with "component not defined"

**Step 3: Write minimal implementation**

```typescript
export const ComponentName = () => {
  // Minimal implementation
}
```

**Step 4: Run test to verify it passes**

Run: `npm test path/to/test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.tsx src/path/file.tsx
git commit -m "feat(phase-N): add component name"
```

---

[Repeat Task structure for all tasks in this phase]

---

## Handoff to Next Phase

**When this phase is complete:**

- Phase N provides: [specific artifacts, components, or infrastructure]
- Next phase (Phase N+1) will: [high-level description of next phase]

**To resume work:**

1. Verify exit criteria all checked
2. Read `phase-N+1-next-phase.md`
3. Verify entry criteria for next phase
4. Begin execution

---

## Phase-Specific Notes

**Technical decisions made in this phase:**

- [Document any architecture decisions]
- [Document any deviations from original plan]
- [Document any blockers encountered and resolutions]

**Dependencies introduced:**

- [List any new npm packages, APIs, or external dependencies]

**Refactoring opportunities (future work):**

- [List tech debt or improvements deferred to later]
````

---

## PLAN.md Manifest Format

The manifest provides the index and coordination for all phases.

````markdown
# [Feature Name] Implementation Plan

> **For Claude:** Use `executing-plans` to implement this plan phase-by-phase.

**Created:** YYYY-MM-DD
**Status:** Not Started | In Progress | Complete
**Current Phase:** 0 | 1 | 2 | 3 | 4

---

## Goal

[One sentence describing what this feature accomplishes]

---

## Architecture Overview

[2-3 sentences about the technical approach]

**Tech Stack:**
- [Key technologies/libraries]

**Key Principles:**
- DRY, YAGNI, TDD
- Frequent commits
- Test-first development

---

## Phase Index

### Phase 0: Foundation
**File:** `phase-0-foundation.md`
**Focus:** Setup, infrastructure, shared utilities
**Tasks:** ~10
**Dependencies:** None
**Status:** ⬜ Not Started

### Phase 1: Component A Migration
**File:** `phase-1-component-a.md`
**Focus:** [Description]
**Tasks:** ~15
**Dependencies:** Phase 0 complete
**Status:** ⬜ Not Started

### Phase 2: Component B Migration
**File:** `phase-2-component-b.md`
**Focus:** [Description]
**Tasks:** ~15
**Dependencies:** Phase 0 complete
**Status:** ⬜ Not Started

### Phase 3: Integration
**File:** `phase-3-integration.md`
**Focus:** Bring components together
**Tasks:** ~12
**Dependencies:** Phase 1, Phase 2 complete
**Status:** ⬜ Not Started

### Phase 4: Cleanup
**File:** `phase-4-cleanup.md`
**Focus:** Remove deprecated code, update docs
**Tasks:** ~8
**Dependencies:** Phase 3 complete
**Status:** ⬜ Not Started

---

## Execution Strategy

### Suggested Order

**Sequential phases:**
1. Phase 0 (Foundation) → MUST complete first
2. Phase 1 (Component A) → Can start after Phase 0
3. Phase 2 (Component B) → Can start after Phase 0
4. Phase 3 (Integration) → MUST complete Phase 1, 2 first
5. Phase 4 (Cleanup) → MUST complete Phase 3 first

**Parallel opportunities:**
- Phase 1 and Phase 2 can be executed in parallel (independent)

### Cross-Phase Dependencies

```
Phase 0 (Foundation)
   ├── Phase 1 (Component A) ──┐
   └── Phase 2 (Component B) ──┼── Phase 3 (Integration) ── Phase 4 (Cleanup)
```

---

## Progress Tracking

**Update this section as phases complete:**

- [x] Phase 0: Foundation - Complete (YYYY-MM-DD)
- [ ] Phase 1: Component A - In Progress
- [ ] Phase 2: Component B - Not Started
- [ ] Phase 3: Integration - Not Started
- [ ] Phase 4: Cleanup - Not Started

---

## How to Execute

### For executing-plans Skill

```
1. Load PLAN.md (this file)
2. Read current phase file
3. Verify entry criteria
4. Execute tasks using TDD
5. Verify exit criteria
6. Update progress in PLAN.md
7. Move to next phase
```

### For Manual Execution

```
1. Read PLAN.md to understand phases
2. Navigate to phase-0-foundation.md
3. Follow task-by-task execution
4. Check off exit criteria
5. Update PLAN.md status
6. Proceed to next phase
```

---

## Verification Checklist

**Before claiming plan is complete:**

- [ ] All phases have exit criteria met
- [ ] All tests passing
- [ ] No compilation errors
- [ ] All commits made
- [ ] Documentation updated
- [ ] Code reviewed (if applicable)

---
````

---

## Decomposition Strategy

### By Component (Recommended)

**Best for:** Features with clear component boundaries

**Structure:**
- Phase 0: Foundation (shared code, utilities, types)
- Phase 1-N: One phase per major component
- Phase N+1: Integration (bring components together)
- Phase N+2: Cleanup (remove old code, docs)

**Example:** TanStack Migration
```
Phase 0: Foundation (shared types, utilities)
Phase 1: Router migration
Phase 2: Table migration
Phase 3: Query migration
Phase 4: Integration testing
Phase 5: Cleanup deprecated code
```

### By Dependency Order

**Best for:** Refactors with strict ordering requirements

**Structure:**
- Phase 0: Low-level primitives
- Phase 1: Mid-level components depending on Phase 0
- Phase 2: High-level features depending on Phase 1
- Phase 3: Integration and cleanup

**Example:** Authentication Refactor
```
Phase 0: Auth primitives (token storage, validation)
Phase 1: Auth context (React context using primitives)
Phase 2: Protected routes (using context)
Phase 3: Update all pages (using protected routes)
Phase 4: Remove old auth system
```

### By Risk Level

**Best for:** High-risk refactors requiring careful rollout

**Structure:**
- Phase 0: Low-risk, isolated changes
- Phase 1: Medium-risk, limited blast radius
- Phase 2: High-risk, critical path changes
- Phase 3: Verification and rollback preparation

**Example:** Database Migration
```
Phase 0: Add new schema alongside old
Phase 1: Dual-write to both schemas
Phase 2: Migrate read queries
Phase 3: Verify data consistency
Phase 4: Remove old schema
```

---

## Phase Granularity Guidelines

### Ideal Phase Size

| Metric | Target |
|--------|--------|
| **Tasks** | 10-20 per phase |
| **Lines** | 800-1200 per phase file |
| **Execution Time** | 2-4 hours per phase |
| **Commits** | 10-20 per phase |

### Too Small (Anti-Pattern)

❌ **5 phases with 3 tasks each** = Overhead of phase management exceeds benefit

**When this happens:** Consolidate related phases

### Too Large (Anti-Pattern)

❌ **2 phases with 40 tasks each** = Still monolithic, defeats purpose

**When this happens:** Further decompose by sub-component or concern

---

## Execution Integration

### How executing-plans Uses Phases

```typescript
// executing-plans skill workflow:

1. Load PLAN.md
   - Parse phase index
   - Check current phase status
   - Identify next phase to execute

2. Load current phase file
   - Verify entry criteria
   - Load task list

3. Execute phase
   - Task-by-task TDD workflow
   - Track progress with TodoWrite
   - Commit frequently

4. Verify exit criteria
   - Run all tests
   - Check compilation
   - Review code if needed

5. Update PLAN.md
   - Mark phase complete
   - Update progress tracking
   - Identify next phase

6. Repeat for next phase
```

### How developing-with-subagents Uses Phases

```typescript
// developing-with-subagents workflow:

1. Orchestrator reads PLAN.md
2. For each phase:
   - Spawn fresh subagent
   - Pass phase file path
   - Subagent executes phase
   - Subagent returns completion status
   - Orchestrator reviews output
   - Orchestrator updates PLAN.md
3. Move to next phase
```

---

## Cross-Phase Considerations

### Shared Code

**Problem:** Multiple phases need same utility function

**Solution:** Create it in Phase 0 (Foundation)

```
Phase 0: Create shared/utils/formatDate.ts
Phase 1: Import and use formatDate
Phase 2: Import and use formatDate
```

### Breaking Changes

**Problem:** Phase 2 changes API that Phase 1 depends on

**Solution:** Document breaking changes in phase file

````markdown
## Breaking Changes in This Phase

**Function signature changed:**
- Old: `createUser(name: string)`
- New: `createUser(data: UserInput)`

**Impact:**
- Phase 1 code needs update if re-executed
- Documented in phase-1-component-a.md under "Post-Phase-2 Notes"
````

### Rollback Strategy

**Problem:** Phase 3 reveals Phase 1 needs changes

**Solution:** Document rollback in phase file

````markdown
## Rollback Procedure

If this phase fails:

1. Revert commits from this phase
2. Return to Phase 1
3. Apply fix to Phase 1
4. Re-execute Phase 2
5. Re-attempt Phase 3
````

---

## Migration from Monolithic Plans

### Detect Monolithic Plan

Signs you have a monolithic plan:
- Single file >2500 lines
- >30 tasks in sequence
- Multiple major components mixed together
- Hard to find specific tasks

### Decomposition Process

**Step 1: Identify natural boundaries**

Read through plan, mark component transitions:
```
Tasks 1-12: Router migration  ← Phase 1
Tasks 13-25: Table migration  ← Phase 2
Tasks 26-35: State cleanup    ← Phase 3
Tasks 36-40: Documentation    ← Phase 4
```

**Step 2: Extract phases**

Create phase files, copy relevant tasks:
```
phase-1-router.md: Tasks 1-12
phase-2-table.md: Tasks 13-25
phase-3-state.md: Tasks 26-35
phase-4-docs.md: Tasks 36-40
```

**Step 3: Add phase structure**

For each phase file:
- Add entry criteria
- Add exit criteria
- Add phase goal
- Add handoff section

**Step 4: Create PLAN.md**

Build manifest:
- Phase index
- Dependencies
- Execution order

**Step 5: Verify**

- Each phase self-contained?
- Dependencies clear?
- No cross-phase task references?

---

## Best Practices

### DO

✅ **Create Phase 0 for foundation** - Shared code, types, utilities
✅ **Keep phases independent** - Minimize cross-phase dependencies
✅ **Document assumptions** - What each phase expects from previous
✅ **Update PLAN.md status** - Track progress at phase level
✅ **Test phase boundaries** - Verify exit criteria before moving on

### DON'T

❌ **Reference tasks across phases** - "See Task 15 in Phase 2"
❌ **Create circular dependencies** - Phase 2 needs Phase 3 needs Phase 2
❌ **Make phases too small** - 3 tasks is not worth a phase
❌ **Forget entry criteria** - Each phase must state prerequisites
❌ **Skip PLAN.md updates** - Progress tracking critical for resume

---

## Examples

### Example 1: TanStack Ecosystem Migration

**Complexity:** 65 tasks, 4 major components, ~8000 lines

**Decomposition:**
```
PLAN.md (manifest)
phase-0-foundation.md (15 tasks - types, utilities)
phase-1-router.md (18 tasks - TanStack Router)
phase-2-table.md (16 tasks - TanStack Table)
phase-3-query.md (12 tasks - TanStack Query)
phase-4-cleanup.md (4 tasks - remove old code)
```

**Execution:** Phases 1-3 can run in parallel after Phase 0

### Example 2: Authentication Refactor

**Complexity:** 42 tasks, 3 layers, ~5200 lines

**Decomposition:**
```
PLAN.md (manifest)
phase-0-primitives.md (10 tasks - token, validation)
phase-1-context.md (12 tasks - React context)
phase-2-routes.md (15 tasks - protected routes)
phase-3-migration.md (5 tasks - update pages)
```

**Execution:** Strictly sequential (each depends on previous)

### Example 3: Database Schema Migration

**Complexity:** 38 tasks, 5 risk stages, ~4500 lines

**Decomposition:**
```
PLAN.md (manifest)
phase-0-new-schema.md (8 tasks - add new tables)
phase-1-dual-write.md (10 tasks - write to both)
phase-2-migrate-reads.md (12 tasks - switch reads)
phase-3-verification.md (6 tasks - data consistency)
phase-4-cleanup.md (2 tasks - remove old schema)
```

**Execution:** Strictly sequential with verification gates

---

## Troubleshooting

### "I can't find the right phase breakdown"

**Solution:** Start with component boundaries, then adjust

1. List all major components
2. One phase per component
3. Add Phase 0 for shared code
4. Add final phase for integration

### "Phases have circular dependencies"

**Solution:** Introduce intermediate phase

```
❌ Phase 1 needs Phase 2, Phase 2 needs Phase 1

✅ Phase 0: Shared interface
   Phase 1: Implementation A (uses interface)
   Phase 2: Implementation B (uses interface)
```

### "Phase is too big (>30 tasks)"

**Solution:** Split by sub-component or layer

```
❌ Phase 1: Full authentication (40 tasks)

✅ Phase 1a: Auth primitives (15 tasks)
   Phase 1b: Auth UI components (15 tasks)
   Phase 1c: Auth integration (10 tasks)
```

### "Phase is too small (<5 tasks)"

**Solution:** Merge with related phase

```
❌ Phase 3: Update docs (2 tasks)
   Phase 4: Update changelog (1 task)

✅ Phase 3: Documentation updates (3 tasks total)
```

---

## Summary

**Progressive disclosure for plans:**

1. **Detect:** >30 tasks OR >5 components OR >2500 lines → decompose
2. **Structure:** PLAN.md + phase-N-name.md files
3. **Phases:** Self-contained, 10-20 tasks, <1000 lines each
4. **Manifest:** PLAN.md tracks phases, dependencies, progress
5. **Execution:** Load one phase at a time, verify exit criteria

**Result:** Digestible phases instead of overwhelming monolithic plans.
