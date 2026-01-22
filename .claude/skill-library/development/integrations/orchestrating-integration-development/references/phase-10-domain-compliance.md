# Phase 10: Domain Compliance (P0 Validation)

**Validate all 7 P0 requirements before code review - BLOCKING gate.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Domain Compliance validates that implementation meets ALL 7 mandatory P0 requirements specific to integration development. This is a **BLOCKING gate** between Implementation and Code Quality.

**Entry Criteria:** Phase 9 (Design Verification) complete.

**Exit Criteria:** All 7 P0 requirements pass (or user explicitly approves proceeding with documented violations).

**🛑 HUMAN CHECKPOINT:** If ANY P0 requirement fails, you MUST stop and use AskUserQuestion.

---

## P0 Requirements Table

| #   | Requirement         | Validation Command                         | Blocking |
| --- | ------------------- | ------------------------------------------ | -------- |
| 1   | VMFilter            | `grep "NewVMFilter\|NewCloudModuleFilter"` | Always   |
| 2   | CheckAffiliation    | Verify real API call, not stub             | Always   |
| 3   | ValidateCredentials | First statement in Invoke()                | Always   |
| 4   | errgroup Safety     | SetLimit() AND captured loop variables     | Always   |
| 5   | Pagination Safety   | maxPages constant OR API-provided limit    | Always   |
| 6   | Error Handling      | No `_, _ =` patterns, all errors wrapped   | Always   |
| 7   | File Size           | Each file ≤400 lines                       | Always   |

**All 7 requirements are BLOCKING.** Integration cannot proceed to code review with ANY violation.

---

## Step 1: Run P0 Validation Skill

Invoke the validating-integrations library skill:

```markdown
Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")
```

Execute ALL checks - do not stop at first failure.

---

## Step 2: Execute P0 Checks

### P0 #1: VMFilter

```bash
# Check initialization
grep -n "Filter:.*NewVMFilter\|Filter:.*NewCloudModuleFilter" {vendor}.go

# Check usage before Job.Send()
grep -B5 "Job.Send" {vendor}.go | grep "Filter.Asset"
```

**Pass:** VMFilter initialized AND used before every Job.Send()
**Fail:** Missing initialization OR assets sent without filter check
**N/A:** Integration doesn't discover VM assets (SCM integrations)

### P0 #2: CheckAffiliation

```bash
# Verify not a stub
grep -A30 "func.*CheckAffiliation" {vendor}.go | grep -E "client\.|http\.|api\.|graphql"
```

**Pass:** Makes external API call to verify asset
**Fail:** Returns `true, nil` without API query (MOST COMMON violation - 98% of integrations)

### P0 #3: ValidateCredentials

```bash
# First statement in Invoke()
grep -A5 "func.*Invoke" {vendor}.go | head -6 | grep "ValidateCredentials"
```

**Pass:** ValidateCredentials called as first statement in Invoke()
**Fail:** Called mid-enumeration or not at all

### P0 #4: errgroup Safety

```bash
# Check SetLimit() called
grep -A3 "errgroup.Group" {vendor}.go | grep "SetLimit"

# Check loop variable capture
grep -B2 -A10 "group.Go\|g.Go" {vendor}.go | grep ":="
```

**Pass:** SetLimit() called AND loop variables captured
**Fail:** Missing SetLimit() OR loop variable not captured

### P0 #5: Pagination Safety

```bash
# Check for maxPages constant
grep -n "const maxPages" {vendor}.go

# OR check for API-provided limit
grep -A10 "for.*page\|for.*offset" {vendor}.go | grep -E "LastPage|hasMore|NextToken.*==\"\""
```

**Pass:** maxPages constant OR API-provided termination
**Fail:** Unbounded pagination loop

### P0 #6: Error Handling

```bash
# Find ignored errors
grep -n "_, _.*=" {vendor}.go

# Check error wrapping uses %w
grep -n "fmt.Errorf" {vendor}.go | grep -v "%w"
```

**Pass:** No ignored errors, all wrapped with context
**Fail:** Any `_, _ =` patterns OR errors without %w

### P0 #7: File Size

```bash
wc -l {vendor}.go
wc -l {vendor}_*.go
```

**Pass:** All files ≤400 lines
**Fail:** Any file >400 lines

---

## Step 3: Classify Results

For each P0 check:

| Status | Meaning           | Action                      |
| ------ | ----------------- | --------------------------- |
| ✅     | Requirement met   | Document evidence           |
| ❌     | Requirement fails | Document + fix required     |
| ⚠️     | Soft limit        | Document, proceed with note |
| N/A    | Not applicable    | Document rationale          |

---

## Step 4: Generate P0 Compliance Report

Write `{OUTPUT_DIR}/p0-compliance-review.md`:

```markdown
# P0 Compliance Report: {vendor}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count}
**Checked**: {timestamp}

## Requirements Summary

| #   | Requirement         | Status | Evidence                                     |
| --- | ------------------- | ------ | -------------------------------------------- |
| 1   | VMFilter            | ✅     | {vendor}.go:25 (init), {vendor}.go:98 (use)  |
| 2   | CheckAffiliation    | ❌     | {vendor}.go:65 (stub returning true, nil)    |
| 3   | ValidateCredentials | ✅     | {vendor}.go:45 (first in Invoke())           |
| 4   | errgroup Safety     | ✅     | {vendor}.go:85 (SetLimit=10), :89 (captured) |
| 5   | Pagination Safety   | ✅     | {vendor}.go:15 (maxPages=1000)               |
| 6   | Error Handling      | ❌     | {vendor}.go:123 (json.Marshal ignored)       |
| 7   | File Size           | ⚠️     | 425 lines (exceeds 400, recommend split)     |

## Violation Details

### P0 #2: CheckAffiliation (CRITICAL)

**Location:** {vendor}.go:65-70
**Issue:** Stub implementation returns `true, nil` without API query
**Fix:** Must query {vendor} API to verify asset exists
**Reference:** [phase-8-p0-requirements-1-3.md](phase-8-p0-requirements-1-3.md#2-checkaffiliation-implementation)

### P0 #6: Error Handling

**Location:** {vendor}.go:123
**Issue:** `payload, _ := json.Marshal(reqBody)` ignores error
**Fix:** Check error and wrap with context
```

---

## Step 5: Proceed or Escalate

**Decision matrix:**

| Result           | Action                         | Human Checkpoint? |
| ---------------- | ------------------------------ | ----------------- |
| ✅ All 7 PASS    | Proceed to Phase 11            | No                |
| ❌ Any FAIL      | Generate report + escalate     | **YES**           |
| ⚠️ Warnings only | Document + ask user preference | Optional          |

**If violations found:**

```typescript
AskUserQuestion({
  questions: [
    {
      question: `P0 Compliance found ${count} violations. How to proceed?`,
      header: "P0 Gate",
      multiSelect: false,
      options: [
        {
          label: "Fix violations now (Recommended)",
          description: "Return to Phase 8 to fix P0 issues",
        },
        {
          label: "Proceed anyway",
          description: "Document violations, code review will likely reject",
        },
        { label: "Review violations", description: "Show me details of each violation" },
      ],
    },
  ],
});
```

---

## Step 6: Fix Loop (If Needed)

If user chooses "Fix violations now":

1. Spawn integration-developer with specific violation context
2. Re-run P0 validation after fixes
3. MAX 3 ATTEMPTS before escalating

```markdown
Task(
subagent_type: "integration-developer",
description: "Fix P0 violations in {vendor} integration",
prompt: "
P0 VIOLATIONS TO FIX:
{list from p0-compliance-review.md}

REFERENCE:

- CheckAffiliation pattern: Wiz integration (wiz.go:717-783)
- Error handling pattern: GitHub integration (github.go:127-144)

FIX EACH VIOLATION and verify:

1. CheckAffiliation: Must query {vendor} API for asset existence
2. Error handling: Check all errors, wrap with fmt.Errorf(..., err)

MANDATORY SKILLS:

- gateway-integrations
- developing-with-tdd
  "
  )
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"
    domain: "integration"

compliance:
  p0_checks:
    - requirement: "VMFilter"
      status: "pass"
      evidence: "{vendor}.go:25, {vendor}.go:98"
    - requirement: "CheckAffiliation"
      status: "pass"
      evidence: "{vendor}.go:65 (real API query)"
    - requirement: "ValidateCredentials"
      status: "pass"
      evidence: "{vendor}.go:45 (first in Invoke)"
    - requirement: "errgroup"
      status: "pass"
      evidence: "{vendor}.go:85 (SetLimit=10)"
    - requirement: "Pagination"
      status: "pass"
      evidence: "{vendor}.go:15 (maxPages=1000)"
    - requirement: "ErrorHandling"
      status: "pass"
      evidence: "All errors wrapped"
    - requirement: "FileSize"
      status: "pass"
      evidence: "285 lines"

  violations_count: 0
  warnings_count: 0
  fix_attempts: 0
```

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 10: Domain Compliance", status: "completed", activeForm: "Validating P0 compliance" },
  { content: "Phase 11: Code Quality", status: "in_progress", activeForm: "Reviewing code quality" },
  // ... rest
])
```

Output to user:

```markdown
## P0 Compliance Complete

**Domain:** Integration Development
**P0 Checks:** 7 executed

| #   | Requirement         | Status |
| --- | ------------------- | ------ |
| 1   | VMFilter            | ✅     |
| 2   | CheckAffiliation    | ✅     |
| 3   | ValidateCredentials | ✅     |
| 4   | errgroup Safety     | ✅     |
| 5   | Pagination Safety   | ✅     |
| 6   | Error Handling      | ✅     |
| 7   | File Size           | ✅     |

**Violations:** 0
**Warnings:** 0

→ Proceeding to Phase 11: Code Quality
```

---

## Common P0 Violations

| Violation                   | Frequency | Fix Pattern                          |
| --------------------------- | --------- | ------------------------------------ |
| CheckAffiliation stub       | 98%       | See Wiz integration (wiz.go:717-783) |
| json.Marshal error ignored  | 40%       | `if err != nil { return ... }`       |
| Missing errgroup SetLimit() | 25%       | `group.SetLimit(10)`                 |
| Loop variable not captured  | 20%       | `item := item  // capture`           |
| File size >400 lines        | 15%       | Split into \_types.go, \_client.go   |

---

## Related References

- [Phase 9: Design Verification](phase-9-design-verification.md) - Previous phase
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [validating-integrations](../../../skill-library/development/integrations/validating-integrations/SKILL.md) - P0 validation skill
- [developing-integrations](../../../skill-library/development/integrations/developing-integrations/SKILL.md) - P0 requirements definition
