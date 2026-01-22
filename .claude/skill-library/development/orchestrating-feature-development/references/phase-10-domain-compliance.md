# Phase 10: Domain Compliance

**Validate feature-specific P0 requirements before code review.**

---

## Overview

Domain Compliance validates that implementation meets mandatory patterns specific to feature development. This is a **blocking gate** between Implementation and Code Quality.

**Entry Criteria:** Phase 9 (Design Verification) complete.

**Exit Criteria:** All P0 requirements pass (or user explicitly approves proceeding with documented violations).

---

## Step 1: Identify Feature Type

Determine which P0 table applies based on `feature_type` from Phase 3:

| Feature Type | P0 Table                |
| ------------ | ----------------------- |
| Frontend     | Frontend Development P0 |
| Backend      | Backend Development P0  |
| Full-stack   | Both tables             |

---

## Step 2: Run Frontend P0 Checks

**Frontend Development P0 Table:**

| Check              | Description                                        | Severity | Validation                                |
| ------------------ | -------------------------------------------------- | -------- | ----------------------------------------- |
| Type Safety        | All new functions have TypeScript types            | P0       | `grep "any" {files}` returns 0 matches    |
| Component Patterns | React components follow project patterns           | P0       | Manual inspection                         |
| State Management   | Uses approved state (TanStack Query, Zustand)      | P0       | Check imports                             |
| Error Boundaries   | Components have error boundaries where appropriate | P1       | Check for ErrorBoundary                   |
| Accessibility      | Interactive elements are keyboard accessible       | P1       | Check for onClick handlers have onKeyDown |
| Test Coverage      | New code has corresponding tests                   | P0       | Test files exist                          |

**Validation commands:**

```bash
# Type Safety: No 'any' types
grep -r ":\s*any" src/hooks/useAssetFilters.ts src/sections/assets/components/
→ PASS: 0 matches (no 'any' types)

# State Management: Approved libraries only
grep -E "import.*from.*(zustand|@tanstack)" {new_files}
→ PASS: Only approved state management

# Test Coverage: Test files exist
for file in {new_source_files}; do
  test -f "${file%.ts}.test.ts" || test -f "${file%.tsx}.test.tsx"
done
→ PASS: All source files have tests
```

---

## Step 3: Run Backend P0 Checks (if applicable)

**Backend Development P0 Table:**

| Check            | Description                                | Severity | Validation                        |
| ---------------- | ------------------------------------------ | -------- | --------------------------------- |
| Error Handling   | All errors are properly wrapped and logged | P0       | Check for error handling patterns |
| Input Validation | All inputs validated at handler boundaries | P0       | Check for validation calls        |
| Test Coverage    | Handler tests exist with edge cases        | P0       | Test files exist                  |

---

## Step 4: Classify Results

For each P0 check:

| Status     | Meaning                | Action                            |
| ---------- | ---------------------- | --------------------------------- |
| ✅ PASS    | Requirement met        | Document evidence                 |
| ❌ FAIL    | Requirement violated   | Document violation + fix guidance |
| ⚠️ WARNING | P1 soft limit exceeded | Document, proceed with note       |

---

## Step 5: Proceed or Escalate

**Decision matrix:**

| Result              | Action                                | Human Checkpoint? |
| ------------------- | ------------------------------------- | ----------------- |
| ✅ All P0 PASS      | Proceed to Phase 11                   | No                |
| ❌ Any P0 FAIL      | Generate compliance report + escalate | **YES**           |
| ⚠️ P1 warnings only | Document + ask user preference        | Optional          |

**If P0 violations found:**

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
          description: "Return to Phase 8 to fix issues",
        },
        {
          label: "Proceed anyway",
          description: "Document violations, likely rejected in code review",
        },
        { label: "Review violations", description: "Show me details of each violation" },
      ],
    },
  ],
});
```

---

## Step 6: Write Compliance Report

Create `.feature-development/domain-compliance.md`:

```markdown
# Domain Compliance Report

**Feature Type:** Frontend
**Checked:** {timestamp}

## P0 Checks

| Check              | Status  | Evidence                      |
| ------------------ | ------- | ----------------------------- |
| Type Safety        | ✅ PASS | No 'any' types in new files   |
| Component Patterns | ✅ PASS | Follows existing patterns     |
| State Management   | ✅ PASS | Uses Zustand + TanStack Query |
| Test Coverage      | ✅ PASS | All files have tests          |

## P1 Checks (Warnings)

| Check            | Status  | Evidence                    |
| ---------------- | ------- | --------------------------- |
| Error Boundaries | ⚠️ N/A  | No new top-level components |
| Accessibility    | ✅ PASS | Keyboard handlers present   |

## Summary

**P0 Violations:** 0
**P1 Warnings:** 0

**Verdict:** COMPLIANT - Ready for Code Quality review
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"
    feature_type: "frontend"

compliance:
  p0_checks:
    - requirement: "Type Safety"
      status: "pass"
      evidence: "No 'any' types found"
    - requirement: "Component Patterns"
      status: "pass"
      evidence: "Follows AssetTable pattern"
    - requirement: "State Management"
      status: "pass"
      evidence: "Uses Zustand for filters"
    - requirement: "Test Coverage"
      status: "pass"
      evidence: "4 test files created"

  p0_violations: 0
  p1_warnings: 0
```

---

## Step 8: Update TodoWrite & Report

```markdown
## Domain Compliance Complete

**Feature Type:** Frontend
**P0 Checks:** 4 executed, 4 passed

| Check              | Status |
| ------------------ | ------ |
| Type Safety        | ✅     |
| Component Patterns | ✅     |
| State Management   | ✅     |
| Test Coverage      | ✅     |

**Violations:** 0
**Warnings:** 0

→ Proceeding to Phase 11: Code Quality
```

---

## Common Frontend Violations

| Violation                | Fix Guidance                                   |
| ------------------------ | ---------------------------------------------- |
| `any` type used          | Replace with specific type or `unknown`        |
| Missing test file        | Create test file with at least 3 test cases    |
| Direct state mutation    | Use Zustand actions or useState setter         |
| Missing TypeScript types | Add interface/type for props and return values |

---

## Edge Cases

### Full-Stack Feature

For full-stack features:

1. Run Frontend P0 checks
2. Run Backend P0 checks
3. ALL checks must pass (or be overridden)
4. Document both domains in MANIFEST

### User Overrides P0 Gate

If user chooses "Proceed anyway":

1. **Document ALL violations** in MANIFEST with `gate_override`
2. **Warn** that code review will likely flag these
3. **Proceed** to Phase 11

---

## Related References

- [Phase 9: Design Verification](phase-9-design-verification.md) - Previous phase
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
