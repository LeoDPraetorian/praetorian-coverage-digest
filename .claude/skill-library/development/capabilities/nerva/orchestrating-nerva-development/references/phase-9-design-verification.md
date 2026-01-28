# Phase 9: Design Verification

**Verify implementation matches approved architecture plan for fingerprintx plugins.**

---

## Overview

Design Verification ensures implementation followed approved design:

1. Compare implementation against Phase 7 Architecture Plan
2. Check all tasks from plan were completed
3. Verify detection pattern choices were followed
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
Read(".fingerprintx-development/architecture.md")   # Phase 7
Read(".fingerprintx-development/plan.md")           # Phase 7
```

Extract:

- **Plan tasks** with acceptance criteria
- **Architecture components** (plugin structure, detection pattern)
- **Design decisions** with rationale (banner parsing, version extraction)

---

## Step 2: Verify Plan Task Completion

For each task in plan.md:

```yaml
verification_checklist:
  - task_id: "T001"
    title: "Add type constant"
    file: "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go"
    acceptance_criteria:
      - "Constant added in alphabetical position" -> VERIFY
      - "Format matches existing constants" -> VERIFY
      - "No duplicate names" -> VERIFY
    status: "pending"

  - task_id: "T002"
    title: "Add plugin import"
    file: "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"
    acceptance_criteria:
      - "Import added in alphabetical position" -> VERIFY
      - "Plugin registered in init()" -> VERIFY
    status: "pending"

  - task_id: "T003"
    title: "Create plugin"
    file: "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go"
    acceptance_criteria:
      - "Plugin detects service correctly" -> VERIFY
      - "Version extracted (if applicable)" -> VERIFY
      - "Error handling complete" -> VERIFY
      - "Package comment documents detection strategy" -> VERIFY
    status: "pending"
```

**Verification methods:**

- **Code inspection:** `grep` for expected patterns
- **Build verification:** `go build ./...` passes
- **Alphabetical check:** Sort validation on constants/imports

---

## Step 3: Execute Verification Checks

For each task:

```bash
# Example: Verify T001 acceptance criteria

# Criterion 1: "Constant added in alphabetical position"
grep "Service" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go | sort -c
-> PASS: Constants are sorted alphabetically

# Criterion 2: "Format matches existing constants"
grep "Service{Protocol}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go
-> PASS: Found Service{Protocol} = "service-{protocol}"

# Criterion 3: "No duplicate names"
grep "Service{Protocol}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go | wc -l
-> PASS: Exactly 1 occurrence

# Example: Verify T003 acceptance criteria

# Criterion 1: "Plugin detects service correctly"
grep -A10 "func.*Match\|func.*Detect" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Detection method implemented

# Criterion 2: "Version extracted (if applicable)"
grep "version\|Version" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Version extraction implemented

# Criterion 3: "Error handling complete"
grep "err != nil\|return nil" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Error returns present

# Criterion 4: "Package comment documents detection strategy"
head -20 {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
-> PASS: Package comment explains detection
```

**Record result:**

```yaml
- task_id: "T001"
  status: "verified"
  criteria_passed: 3
  criteria_total: 3

- task_id: "T003"
  status: "verified"
  criteria_passed: 4
  criteria_total: 4
```

---

## Step 4: Verify Architecture Compliance

Check implementation followed architecture decisions:

| Architecture Decision        | Verification Method               | Status |
| ---------------------------- | --------------------------------- | ------ |
| "Banner match detection"     | Check Match() uses banner parsing | PASS   |
| "Regex version extraction"   | Check regexp usage for version    | PASS   |
| "Alphabetical type constant" | sort -c on types.go               | PASS   |
| "Alphabetical plugin import" | sort -c on plugins.go             | PASS   |
| "Error handling returns nil" | grep for nil returns              | PASS   |

**Document deviations:**

If implementation doesn't match architecture:

- List each deviation
- Check if agent documented rationale
- Flag for human review

---

## Step 5: Create Verification Report

Write `.fingerprintx-development/design-verification.md`:

````markdown
# Design Verification Report

**Protocol:** {protocol}
**Verified:** {timestamp}
**Implementation Phase:** Phase 8
**Verification Method:** Automated checks + code inspection

## Plan Task Verification

| Task ID | Title             | Criteria | Passed | Status   |
| ------- | ----------------- | -------- | ------ | -------- |
| T001    | Add type constant | 3        | 3      | Verified |
| T002    | Add plugin import | 2        | 2      | Verified |
| T003    | Create plugin     | 4        | 4      | Verified |
| T004    | Add tests         | 3        | 3      | Verified |

**Summary:** 4 of 4 tasks verified (100%)

## Architecture Compliance

| Decision            | Expected     | Actual       | Status | Notes |
| ------------------- | ------------ | ------------ | ------ | ----- |
| Detection pattern   | Banner match | Banner match | ✓      | -     |
| Version extraction  | Regex        | Regex        | ✓      | -     |
| Type constant order | Alphabetical | Alphabetical | ✓      | -     |
| Plugin import order | Alphabetical | Alphabetical | ✓      | -     |

**Summary:** 4 of 4 decisions followed (100%)

## Deviations

None. Implementation matches approved architecture.

## Verification Commands

```bash
# Build passes
go build ./...
-> Build successful, 0 errors

# Type constant alphabetical
grep "Service" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go | sort -c
-> Sorted correctly

# Plugin import alphabetical
grep "plugins/services" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go | sort -c
-> Sorted correctly
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
    - build_validation
    - sort_validation
````

---

## Step 8: Update TodoWrite & Report

```markdown
## Design Verification Complete

**Protocol:** {protocol}
**Plan Tasks:** 4 of 4 verified (100%)
**Architecture Compliance:** 4 of 4 decisions followed (100%)
**Deviations:** None
**Build:** Successful

-> Proceeding to Phase 10: Domain Compliance
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
- Re-spawn capability-developer agent with clearer requirements

### Build Passes But Criteria Don't Match

If `go build ./...` passes but acceptance criteria aren't met:

- Criteria are source of truth, not build
- Flag as verification failure
- Review and fix criteria OR fix implementation

### Type Constant Not Alphabetical

If type constant not in alphabetical order:

- Specific failure: P0 requirement violation
- MUST fix before proceeding
- Return to Phase 8 or fix directly

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Provides implementation
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Design and tasks to verify against
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 2 precedes this phase
