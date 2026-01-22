# Phase 9: Design Verification

**Verify implementation matches approved architecture plan.**

---

## Overview

Design Verification ensures capability implementation followed approved design:

1. Compare implementation against Phase 7 Architecture Plan
2. Check all tasks from plan were completed
3. Verify capability-type patterns were followed
4. Document deviations with rationale

**Conditional:** Skipped for BUGFIX and SMALL work_types (they have no architecture plan to verify against).

**Entry Criteria:**

- Phase 8 (Implementation) complete, capability artifacts written to files
- **COMPACTION GATE 2:** Must complete [compaction-gates.md](compaction-gates.md) protocol before this phase

**Exit Criteria:** Implementation verified against design OR deviations approved by human.

---

## Step 1: Load Design Artifacts

Read design documents from earlier phases:

```bash
Read(".capability-development/architecture.md")   # Phase 7
Read(".capability-development/plan.md")           # Phase 7
```

Extract:

- **Plan tasks** with acceptance criteria
- **Architecture components** and capability-type patterns
- **Design decisions** with rationale
- **Quality targets** (detection accuracy, false positive rate)

---

## Step 2: Verify Plan Task Completion

For each task in plan.md:

```yaml
verification_checklist:
  - task_id: "T001"
    title: "Implement detection query"
    file: "modules/chariot-aegis-capabilities/vql/exposed_creds.vql"
    acceptance_criteria:
      - "Query parses without syntax errors" → VERIFY
      - "Detection logic matches architecture spec" → VERIFY
      - "Output schema matches expected format" → VERIFY
      - "Unit test validates detection" → VERIFY
    status: "pending"
```

**Verification methods by capability type:**

| Capability Type | Verification Commands                              |
| --------------- | -------------------------------------------------- |
| VQL             | Query parse validation, artifact schema check      |
| Nuclei          | YAML syntax validation, matcher logic verification |
| Janus           | Go compilation, interface contract check           |
| Fingerprintx    | Go compilation, 5-method interface check           |
| Scanner         | Go/Python compilation, API endpoint coverage       |

---

## Step 3: Execute Verification Checks

### VQL Capabilities

```bash
# Criterion 1: "Query parses without syntax errors"
# Run VQL linter or parser validation
→ PASS: Query syntax valid

# Criterion 2: "Detection logic matches architecture spec"
grep "LET.*SELECT\|WHERE" {vql_file}
# Compare query structure against architecture.md
→ PASS: Query structure matches design

# Criterion 3: "Output schema matches expected format"
# Check artifact column definitions
→ PASS: Output columns match spec

# Criterion 4: "Unit test validates detection"
test -f "{vql_file%.vql}_test.vql"
→ PASS: Test file exists
```

### Nuclei Templates

```bash
# Criterion 1: "Template validates without errors"
nuclei -validate -t {template_file}
→ PASS: Template valid

# Criterion 2: "Matchers match architecture spec"
grep -A10 "matchers:" {template_file}
# Compare against architecture.md matcher design
→ PASS: Matchers match design

# Criterion 3: "CVE metadata complete" (if CVE-specific)
grep "cve-id\|cwe-id\|cvss" {template_file}
→ PASS: Metadata present
```

### Go Capabilities (Janus/Fingerprintx/Scanner)

```bash
# Criterion 1: "Compiles without errors"
go build ./...
→ PASS: Build successful

# Criterion 2: "Interface contract implemented"
grep "func.*Name()\|func.*Run(" {go_file}
# Verify all required methods present
→ PASS: Interface complete

# Criterion 3: "Error handling implemented"
grep "if err != nil\|return.*error" {go_file}
→ PASS: Error handling present

# Criterion 4: "Tests exist"
test -f "{go_file%.go}_test.go"
→ PASS: Test file exists
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

### VQL Architecture Compliance

| Architecture Decision         | Verification Method    | Status |
| ----------------------------- | ---------------------- | ------ |
| "Use LET for detection logic" | grep "LET" in VQL file | PASS   |
| "Output as JSON artifact"     | Check artifact format  | PASS   |
| "Filter by file type"         | Check WHERE clause     | PASS   |

### Nuclei Architecture Compliance

| Architecture Decision            | Verification Method    | Status |
| -------------------------------- | ---------------------- | ------ |
| "Use word matchers for accuracy" | Check matcher types    | PASS   |
| "Limit to 2 HTTP requests"       | Count request blocks   | PASS   |
| "Include remediation guidance"   | Check info.remediation | PASS   |

### Go Architecture Compliance

| Architecture Decision          | Verification Method      | Status |
| ------------------------------ | ------------------------ | ------ |
| "Use errgroup for concurrency" | grep "errgroup" in code  | PASS   |
| "Implement graceful shutdown"  | Check context handling   | PASS   |
| "Follow interface contract"    | Verify method signatures | PASS   |

**Document deviations:**

If implementation doesn't match architecture:

- List each deviation
- Check if agent documented rationale
- Flag for human review

---

## Step 5: Create Verification Report

Write `.capability-development/design-verification.md`:

````markdown
# Design Verification Report

**Verified:** {timestamp}
**Capability Type:** {vql|nuclei|janus|fingerprintx|scanner}
**Implementation Phase:** Phase 8
**Verification Method:** Automated checks + manual inspection

## Plan Task Verification

| Task ID | Title                     | Criteria | Passed | Status   |
| ------- | ------------------------- | -------- | ------ | -------- |
| T001    | Implement detection query | 4        | 4      | Verified |
| T002    | Create output schema      | 2        | 2      | Verified |
| T003    | Add test coverage         | 3        | 3      | Verified |

**Summary:** 3 of 3 tasks verified (100%)

## Architecture Compliance

| Decision         | Expected         | Actual         | Status | Notes |
| ---------------- | ---------------- | -------------- | ------ | ----- |
| Detection method | LET statements   | LET statements | PASS   | -     |
| Output format    | JSON artifact    | JSON artifact  | PASS   | -     |
| Error handling   | Graceful failure | try/catch      | PASS   | -     |

**Summary:** 3 of 3 decisions followed (100%)

## Quality Target Verification

| Metric              | Target | Evidence                           | Status                       |
| ------------------- | ------ | ---------------------------------- | ---------------------------- |
| Detection Accuracy  | ≥95%   | Designed for high-entropy patterns | PENDING (tested in Phase 13) |
| False Positive Rate | ≤5%    | Strict matchers reduce FP          | PENDING (tested in Phase 13) |

## Deviations

None. Implementation matches approved architecture.

## Verification Commands

```bash
# Build verification
go build ./...
→ Build successful, 0 errors

# Syntax validation
nuclei -validate -t template.yaml
→ Template valid
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
    capability_type: "{vql|nuclei|janus|fingerprintx|scanner}"

design_verification:
  tasks_verified: 3
  tasks_total: 3
  architecture_compliance: 100  # percentage

  deviations: []

  verification_methods:
    - syntax_validation
    - interface_check
    - build_validation
````

---

## Step 8: Update TodoWrite & Report

```markdown
## Design Verification Complete

**Capability Type:** {type}
**Plan Tasks:** 3 of 3 verified (100%)
**Architecture Compliance:** 3 of 3 decisions followed (100%)
**Deviations:** None
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
- Re-spawn capability-developer with clearer requirements

### Tests Pass But Criteria Don't Match

If tests pass but acceptance criteria aren't met:

- Criteria are source of truth, not tests
- Flag as verification failure
- Review and fix criteria OR fix implementation

### Capability Type Mismatch

If implementation changed capability type from architecture:

- Flag as CRITICAL deviation
- Requires human approval to proceed
- May require return to Phase 7 (Architecture)

---

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Provides implementation
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Design and tasks to verify against
- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Next phase
- [Compaction Gates](compaction-gates.md) - Gate 2 precedes this phase
- [Quality Standards](quality-standards.md) - Capability-specific quality metrics
