# Phase 9: Design Verification

**Verify implementation matches approved architecture plan.**

---

## Overview

Design Verification ensures implementation followed approved design:

1. Compare implementation against Phase 7 Architecture Plan
2. Check all tasks from plan were completed
3. Verify pattern choices were followed
4. Document deviations with rationale

**Conditional:** Skipped for BUGFIX and SMALL work_types (they have no architecture plan to verify against).

**Entry Criteria:**

- Phase 8 (Implementation) complete, code written to files
- **COMPACTION GATE 2:** Must complete [compaction-gates.md](compaction-gates.md) protocol before this phase

**Exit Criteria:** Implementation verified against design OR deviations approved by human.

---

## Step 1: Load Design Artifacts

Read design documents from earlier phases:

```bash
Read(".feature-development/architecture-plan.md")   # Phase 7 (Part 1: Architecture, Part 2: Tasks)
```

Extract:

- **Plan tasks** with acceptance criteria
- **Architecture components** and patterns
- **Design decisions** with rationale

---

## Step 2: Verify Plan Task Completion

For each task in architecture-plan.md Part 2:

```yaml
verification_checklist:
  - task_id: "T001"
    title: "Create filter hook"
    file: "src/hooks/useAssetFilters.ts"
    acceptance_criteria:
      - "Hook manages filter state" → VERIFY
      - "URL params persist on change" → VERIFY
      - "Type-safe filter definitions" → VERIFY
      - "Unit test covers state changes" → VERIFY
    status: "pending"
```

**Verification methods:**

- **Code inspection:** `grep` for expected patterns
- **Test execution:** Run tests to verify behavior
- **File existence:** Check files were created

---

## Step 3: Execute Verification Checks

For each task:

```bash
# Example: Verify T001 acceptance criteria

# Criterion 1: "Hook manages filter state"
grep -A10 "useState\|useReducer\|create(" src/hooks/useAssetFilters.ts
→ PASS: Found Zustand store creation

# Criterion 2: "URL params persist on change"
grep "useSearchParams\|setSearchParams" src/hooks/useAssetFilters.ts
→ PASS: Found URL param handling

# Criterion 3: "Type-safe filter definitions"
grep "interface\|type.*Filter" src/hooks/useAssetFilters.ts
→ PASS: Found TypeScript types

# Criterion 4: "Unit test covers state changes"
test -f "src/hooks/__tests__/useAssetFilters.test.ts"
→ PASS: Test file exists

# Run the test
npm test -- useAssetFilters.test.ts
→ PASS: 5/5 tests passing
```

**Record result:**

```yaml
- task_id: "T001"
  status: "verified"
  criteria_passed: 4
  criteria_total: 4
```

---

## Step 4: Verify Architecture Compliance

Check implementation followed architecture decisions:

| Architecture Decision        | Verification Method    | Status |
| ---------------------------- | ---------------------- | ------ |
| "Use Zustand for state"      | grep "create(" in hook | PASS   |
| "URL params for persistence" | Check useSearchParams  | PASS   |
| "TanStack Table integration" | Check table props      | PASS   |

**Document deviations:**

If implementation doesn't match architecture:

- List each deviation
- Check if agent documented rationale
- Flag for human review

---

## Step 5: Create Verification Report

Write `.feature-development/design-verification.md`:

````markdown
# Design Verification Report

**Verified:** {timestamp}
**Implementation Phase:** Phase 8
**Verification Method:** Automated checks + manual inspection

## Plan Task Verification

| Task ID | Title               | Criteria | Passed | Status   |
| ------- | ------------------- | -------- | ------ | -------- |
| T001    | Create filter hook  | 4        | 4      | Verified |
| T002    | Create filter panel | 3        | 3      | Verified |
| T003    | Update asset table  | 2        | 2      | Verified |
| T004    | Add tests           | 2        | 2      | Verified |

**Summary:** 4 of 4 tasks verified (100%)

## Architecture Compliance

| Decision          | Expected        | Actual          | Status | Notes |
| ----------------- | --------------- | --------------- | ------ | ----- |
| State management  | Zustand         | Zustand         | ✓      | -     |
| URL persistence   | useSearchParams | useSearchParams | ✓      | -     |
| Table integration | TanStack Table  | TanStack Table  | ✓      | -     |

**Summary:** 3 of 3 decisions followed (100%)

## Deviations

None. Implementation matches approved architecture.

## Verification Commands

```bash
# All tests passing
npm test
→ 18 tests, 18 passing

# Code builds successfully
npm run build
→ Build successful, 0 errors
```
````

## Verdict: VERIFIED

Implementation matches approved design. Ready for Domain Compliance (Phase 10).

```

---

## Step 6: Human Checkpoint (If Deviations)

**ONLY if deviations found:**

Use AskUserQuestion:

```

AskUserQuestion({
questions: [{
question: "Implementation deviates from architecture. {List deviations}. How should we proceed?",
header: "Design Deviation",
options: [
{ label: "Accept deviations", description: "Rationale is sound, proceed" },
{ label: "Fix deviations", description: "Return to Phase 8" },
{ label: "Revise architecture", description: "Update Phase 7 to match implementation" }
],
multiSelect: false
}]
})

````

**If no deviations:** Skip checkpoint, proceed automatically.

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  9_design_verification:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_required: false  # or true if deviations

design_verification:
  tasks_verified: 4
  tasks_total: 4
  architecture_compliance: 100  # percentage

  deviations: []

  verification_methods:
    - code_inspection
    - test_execution
    - build_validation
````

---

## Step 8: Update TodoWrite & Report

```markdown
## Design Verification Complete

**Plan Tasks:** 4 of 4 verified (100%)
**Architecture Compliance:** 3 of 3 decisions followed (100%)
**Deviations:** None
**Tests:** 18 passing
**Build:** Successful

→ Proceeding to Phase 10: Domain Compliance
```

---

## Skip Conditions

Phase 9 is skipped when:

- work_type is BUGFIX or SMALL (no architecture plan to verify against)
- Implementation is trivial (single file, obvious change)

**When skipped:**

- Create minimal verification: "No architecture to verify against"
- MANIFEST shows `9_design_verification: { status: "skipped", reason: "work_type" }`

---

## Edge Cases

### All Criteria Fail

If most acceptance criteria fail:

- DO NOT proceed
- Return to Phase 8 (Implementation)
- Re-spawn developer agents with clearer requirements

### Tests Pass But Criteria Don't Match

If tests pass but acceptance criteria aren't met:

- Criteria are source of truth, not tests
- Flag as verification failure
- Review and fix criteria OR fix implementation

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Provides implementation
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Design and tasks to verify against
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 2 precedes this phase
