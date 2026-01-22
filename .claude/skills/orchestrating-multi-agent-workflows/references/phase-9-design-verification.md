# Phase 9: Design Verification

**Verify implementation matches approved architecture plan.**

---

## Overview

Design Verification ensures implementation followed approved design:

1. Compare implementation against Phase 7 Architecture Plan
2. Check all tasks from Architecture Plan were completed
3. Verify pattern choices were followed
4. Document deviations with rationale

**Conditional:** Skipped for BUGFIX and SMALL work_types (they have no architecture plan to verify against).

**Entry Criteria:**

- Phase 8 (Implementation) complete, code written to files
- **COMPACTION GATE:** Must complete [compaction-gates.md](compaction-gates.md) protocol before proceeding (Gate 2: after Phase 8)

**Exit Criteria:** Implementation verified against design OR deviations approved by human.

---

## Step 1: Load Design Artifacts

Read design documents from earlier phases:

```bash
Read("{OUTPUT_DIR}/architecture-plan.md")   # Phase 7
```

Extract:

- **Plan tasks** with acceptance criteria
- **Architecture components** and patterns
- **Design decisions** with rationale

---

## Step 2: Verify Plan Task Completion

For each task in plan.md:

```yaml
verification_checklist:
  - task_id: "T001"
    title: "Update useUser hook"
    file: "src/hooks/useUser.ts"
    acceptance_criteria:
      - "Hook fetches metrics on mount" → VERIFY
      - "Loading state handled" → VERIFY
      - "Error state handled" → VERIFY
      - "Unit test added" → VERIFY
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

# Criterion 1: "Hook fetches metrics on mount"
grep -A10 "useEffect" src/hooks/useUser.ts | grep "fetchMetrics"
→ PASS: Found fetchMetrics call in useEffect

# Criterion 2: "Loading state handled"
grep "isLoading" src/hooks/useUser.ts
→ PASS: Found isLoading state

# Criterion 3: "Error state handled"
grep "error" src/hooks/useUser.ts
→ PASS: Found error handling

# Criterion 4: "Unit test added"
test -f "src/hooks/__tests__/useUser.test.ts"
→ PASS: Test file exists

# Run the test
npm test -- useUser.test.ts
→ PASS: 3/3 tests passing
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

| Architecture Decision        | Verification Method               | Status |
| ---------------------------- | --------------------------------- | ------ |
| "Use TanStack Query"         | grep "useQuery" in relevant files | PASS   |
| "Zustand for global state"   | Check store usage                 | PASS   |
| "Compound component pattern" | Verify component composition      | PASS   |
| "API: GET /metrics/{userId}" | Check endpoint matches            | PASS   |

**Document deviations:**

If implementation doesn't match architecture:

- List each deviation
- Check if agent documented rationale
- Flag for human review

---

## Step 5: Create Verification Report

Write `{OUTPUT_DIR}/design-verification.md`:

````markdown
# Design Verification Report

**Verified:** {timestamp}
**Implementation Phase:** Phase 8
**Verification Method:** Automated checks + manual inspection

## Plan Task Verification

| Task ID | Title               | Criteria | Passed | Status   |
| ------- | ------------------- | -------- | ------ | -------- |
| T001    | Update useUser hook | 4        | 4      | Verified |
| T002    | Add format utils    | 3        | 3      | Verified |
| T003    | Update UserProfile  | 5        | 5      | Verified |
| T004    | Integration test    | 2        | 2      | Verified |

**Summary:** 4 of 4 tasks verified (100%)

## Architecture Compliance

| Decision          | Expected              | Actual                | Status | Notes |
| ----------------- | --------------------- | --------------------- | ------ | ----- |
| Data fetching     | TanStack Query        | TanStack Query        | ✓      | -     |
| State management  | Zustand               | Zustand               | ✓      | -     |
| Component pattern | Compound              | Compound              | ✓      | -     |
| API endpoint      | GET /metrics/{userId} | GET /metrics/{userId} | ✓      | -     |

**Summary:** 4 of 4 decisions followed (100%)

## Deviations

None. Implementation matches approved architecture.

## Verification Commands

```bash
# All tests passing
npm test
→ 12 tests, 12 passing

# Code builds successfully
npm run build
→ Build successful, 0 errors
```
````

## Verdict: VERIFIED

Implementation matches approved design. Ready for code quality review (Phase 11).

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
    checkpoint_required: false # or true if deviations

design_verification:
  tasks_verified: 4
  tasks_total: 4
  architecture_compliance: 100 # percentage

  deviations: []
  # OR if deviations:
  # deviations:
  #   - decision: "Use Zustand"
  #     actual: "Used Redux"
  #     rationale: "Team preferred Redux"
  #     approved: true

  verification_methods:
    - code_inspection
    - test_execution
    - build_validation
````

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 9: Design Verification", status: "completed", activeForm: "Verifying design requirements" },
  { content: "Phase 10: Domain Compliance", status: "in_progress", activeForm: "Validating mandatory patterns" },
  // ... rest
])
```

Output to user:

```markdown
## Design Verification Complete

**Plan Tasks:** 4 of 4 verified (100%)
**Architecture Compliance:** 4 of 4 decisions followed (100%)
**Deviations:** None
**Tests:** 12 passing
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
- Or escalate to user

### Partial Completion

If some tasks verified but others fail:

- Mark verified tasks as complete
- Return failed tasks to Phase 8
- Document mixed status in MANIFEST

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
- [gated-verification.md](gated-verification.md) - Two-stage verification pattern
