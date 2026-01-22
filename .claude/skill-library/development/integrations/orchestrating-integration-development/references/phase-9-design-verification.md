# Phase 9: Design Verification

**Verify implementation matches approved architecture plan.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Design Verification ensures implementation followed approved design:

1. Compare implementation against Phase 7 Architecture Plan
2. Check all tasks from Architecture Plan were completed
3. Verify P0 requirement locations match planned locations
4. Document deviations with rationale

**Conditional:** Skipped for SMALL work_types (they have no architecture plan to verify against).

**Entry Criteria:**

- Phase 8 (Implementation) complete, code written to files
- **COMPACTION GATE 2:** Must complete [compaction-gates.md](compaction-gates.md) protocol before proceeding

**Exit Criteria:** Implementation verified against design OR deviations approved by human.

---

## Step 1: Spawn Integration-Reviewer Agent

```markdown
Task(
subagent_type: "integration-reviewer",
description: "Verify {vendor} implementation matches architecture plan",
prompt: "
Task: Verify implementation matches approved architecture plan

INPUT FILES (read ALL before verifying):

- architecture-plan.md: Approved design with P0 requirements
- implementation.md: What was actually implemented
- {vendor}.go: Handler implementation
- {vendor}\_types.go: Type definitions (if exists)

VERIFICATION TASKS:

1. PLAN TASK COMPLETION
   - Were all tasks from architecture-plan.md completed?
   - Are any planned tasks missing?
   - Were extra tasks added? (document if yes)

2. P0 LOCATION VERIFICATION
   - VMFilter: Verify location matches plan
   - CheckAffiliation: Verify location matches plan
   - ValidateCredentials: Verify location matches plan
   - errgroup: Verify location matches plan
   - maxPages: Verify location matches plan

3. ARCHITECTURE COMPLIANCE
   - File structure matches plan?
   - Components match design?
   - Any structural deviations?

MANDATORY SKILLS:

- integrating-with-{vendor}: Vendor API patterns
- developing-integrations: P0 requirements and patterns
- gateway-integrations: Integration patterns
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT: design-verification.md

Return:
{
'verdict': 'VERIFIED | DEVIATIONS_FOUND',
'tasks_verified': {count},
'tasks_total': {count},
'p0_locations_match': true/false,
'deviations': []
}
"
)
```

---

## Step 2: Load Design Artifacts (for orchestrator context)

Read design documents from earlier phases:

```bash
Read("{OUTPUT_DIR}/architecture-plan.md")   # Phase 7
Read("{OUTPUT_DIR}/implementation.md")      # Phase 8
```

Extract:

- **Plan tasks** with acceptance criteria
- **P0 implementation locations** (planned vs actual)
- **Architecture components** and patterns
- **File structure** expected vs actual

---

## Step 3: Verify Plan Task Completion

For each task in architecture-plan.md:

```yaml
verification_checklist:
  - task_id: "T001"
    title: "Implement {vendor} handler"
    file: "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go"
    acceptance_criteria:
      - "Match() returns true for job.Type = '{vendor}'" → VERIFY
      - "Invoke() calls ValidateCredentials first" → VERIFY
      - "CheckAffiliation queries external API" → VERIFY
      - "VMFilter initialized and used" → VERIFY
    status: "pending"
```

**Verification methods:**

- **Code inspection:** `grep` for expected patterns
- **Build verification:** `go build ./...`
- **File existence:** Check files were created per plan

---

## Step 3: Verify P0 Implementation Locations

Compare planned P0 locations against actual:

| P0 Requirement      | Planned Location | Actual Location | Match? |
| ------------------- | ---------------- | --------------- | ------ |
| VMFilter            | {vendor}.go:25   | {vendor}.go:25  | ✅     |
| CheckAffiliation    | {vendor}.go:65   | {vendor}.go:68  | ⚠️     |
| ValidateCredentials | {vendor}.go:45   | {vendor}.go:45  | ✅     |
| errgroup            | {vendor}.go:85   | {vendor}.go:90  | ⚠️     |
| maxPages            | {vendor}.go:15   | {vendor}.go:15  | ✅     |

**Line number drift is acceptable** if:

- Function is still in correct file
- Implementation follows P0 pattern
- No structural deviation

**Critical deviation triggers human checkpoint** if:

- P0 requirement is in wrong file
- Implementation pattern doesn't match spec
- Missing P0 requirement entirely

---

## Step 4: Execute Verification Checks

For each task:

```bash
# Verify handler file exists
test -f "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go"
→ PASS: Handler file exists

# Verify Match() implementation
grep -A5 "func.*Match" {vendor}.go | grep "{vendor}"
→ PASS: Match checks for {vendor}

# Verify ValidateCredentials is first in Invoke
grep -A3 "func.*Invoke" {vendor}.go | grep "ValidateCredentials"
→ PASS: ValidateCredentials called first

# Verify CheckAffiliation is not a stub
grep -A20 "func.*CheckAffiliation" {vendor}.go | grep -E "client\.|http\.|api\."
→ PASS: Real API query found

# Verify build succeeds
go build ./pkg/tasks/integrations/{vendor}/...
→ PASS: Build successful
```

**Record result:**

```yaml
- task_id: "T001"
  status: "verified"
  criteria_passed: 4
  criteria_total: 4
```

---

## Step 5: Create Verification Report

Write `{OUTPUT_DIR}/design-verification.md`:

````markdown
# Design Verification Report: {vendor}

**Verified:** {timestamp}
**Implementation Phase:** Phase 8
**Verification Method:** Automated checks + P0 inspection

## Plan Task Verification

| Task ID | Title                | Criteria | Passed | Status   |
| ------- | -------------------- | -------- | ------ | -------- |
| T001    | Implement handler    | 4        | 4      | Verified |
| T002    | Add client library   | 3        | 3      | Verified |
| T003    | Implement transforms | 2        | 2      | Verified |

**Summary:** 3 of 3 tasks verified (100%)

## P0 Location Verification

| P0 Requirement      | Planned | Actual  | Status |
| ------------------- | ------- | ------- | ------ |
| VMFilter            | line 25 | line 25 | ✓      |
| CheckAffiliation    | line 65 | line 68 | ✓      |
| ValidateCredentials | line 45 | line 45 | ✓      |
| errgroup            | line 85 | line 90 | ✓      |
| maxPages            | line 15 | line 15 | ✓      |

**Summary:** All P0 requirements in expected locations

## Deviations

None. Implementation matches approved architecture.

## Verification Commands

```bash
# Build passes
go build ./pkg/tasks/integrations/{vendor}/...
→ Build successful, 0 errors
```
````

## Verdict: VERIFIED

Implementation matches approved design. Ready for P0 compliance (Phase 10).

```

---

## Step 6: Human Checkpoint (If Deviations)

**ONLY if critical deviations found:**

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

**If no critical deviations:** Skip checkpoint, proceed automatically.

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  9_design_verification:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_required: false  # or true if deviations

design_verification:
  tasks_verified: 3
  tasks_total: 3

  p0_location_match:
    vmfilter: true
    checkaffiliation: true
    validatecredentials: true
    errgroup: true
    pagination: true

  deviations: []

  verification_methods:
    - code_inspection
    - build_validation
    - p0_location_check
````

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 9: Design Verification", status: "completed", activeForm: "Verifying design" },
  { content: "Phase 10: Domain Compliance", status: "in_progress", activeForm: "Validating P0 compliance" },
  // ... rest
])
```

Output to user:

```markdown
## Design Verification Complete

**Plan Tasks:** 3 of 3 verified (100%)
**P0 Locations:** All match expected locations
**Deviations:** None
**Build:** Successful

→ Proceeding to Phase 10: Domain Compliance (P0 Validation)
```

---

## Skip Conditions

Phase 9 is skipped when:

- work_type is SMALL (no architecture plan to verify against)
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
- Re-spawn integration-developer with clearer requirements
- Or escalate to user

### Partial Completion

If some tasks verified but others fail:

- Mark verified tasks as complete
- Return failed tasks to Phase 8
- Document mixed status in MANIFEST

### P0 Locations Differ Significantly

If P0 requirements are in different files than planned:

- Flag as critical deviation
- Trigger human checkpoint
- May indicate architectural misunderstanding

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Provides implementation
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Design and tasks to verify against
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Next phase (P0 validation)
- [compaction-gates.md](compaction-gates.md) - Gate 2 precedes this phase
